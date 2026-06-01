const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 🚨 사령관 전용 마스터 스위치 (테스트 시 true, 정식 오픈 시 false)
const IS_TEST_MODE = false;

// ==========================================
// 💰 1. 수확(Claim) API 서버 로직
// ==========================================
exports.claimGOU = functions.https.onCall(async (data, context) => {
    // 텔레그램 환경에 맞게 프론트엔드가 보내준 userId를 신분증으로 사용
    const uid = data.userId;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', '유저 ID(신분증)가 없습니다.');
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    return db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', '유저 데이터가 존재하지 않습니다.');
        }

        const userData = userDoc.data();
        const serverNow = Date.now(); 
        const lastClaimTime = userData.lastClaimTime || serverNow;

        const maxMiningDuration = 12 * 60 * 60 * 1000; 
        let elapsedMs = serverNow - lastClaimTime;
        
        if (elapsedMs < 0) elapsedMs = 0;
        if (elapsedMs > maxMiningDuration) elapsedMs = maxMiningDuration;

        if (elapsedMs < 10000) {
            return { success: false, message: '아직 수확할 GOU가 부족합니다. (최소 10초 대기)' };
        }

        const baseGOUPerSec = 300000 / 86400; 
        const multiplier = data.currentMultiplier || 1.0; 
        const harvestedGOU = (elapsedMs / 1000) * baseGOUPerSec * multiplier;

        transaction.update(userRef, {
            balance: admin.firestore.FieldValue.increment(harvestGOU),
            lastClaimTime: serverNow
        });

        return { 
            success: true, 
            harvestedAmount: harvestedGOU, 
            message: `${Math.floor(harvestGOU).toLocaleString()} GOU를 획득했습니다!` 
        };
    });
});

// ==========================================
// 🎲 2. 장비 강화 및 자원 분배 API 서버 로직
// ==========================================
exports.upgradeItem = functions.https.onCall(async (data, context) => {
    const uid = data.userId;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', '유저 ID가 없습니다.');
    }
    
    const { type, id } = data; 
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const systemRef = db.collection('system').doc('economy'); 

    return db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        let systemDoc = await transaction.get(systemRef);
        
        if (!userDoc.exists) throw new functions.https.HttpsError('not-found', '유저 데이터 오류');
        
        if (!systemDoc.exists) {
            transaction.set(systemRef, { pool: 0, burn: 0, jackpot: 0, lp: 0, reserve: 0 });
            systemDoc = await transaction.get(systemRef);
        }

        const userData = userDoc.data();
        let balance = userData.balance || 0;
        let gears = userData.gears || [];
        let petActive = userData.petActive || false;
        let castleActive = userData.castleActive || false;
        let petLevel = userData.petLevel || 0;
        let castleLevel = userData.castleLevel || 0;

        const necklaceLvl = gears.find(g => g.id === 'necklace')?.lvl || 0;
        const ringLvl = gears.find(g => g.id === 'ring')?.lvl || 0;

        let currentLvl = 0;
        let isMax = false;
        let baseCostMultiplier = 1; 

        if (type === 'gear') {
            const targetGear = gears.find(g => g.id === id);
            currentLvl = targetGear.lvl;
            isMax = currentLvl >= 30;
        } else if (type === 'pet') {
            if (!petActive) throw new functions.https.HttpsError('failed-precondition', '펫이 개방되지 않았습니다.');
            currentLvl = petLevel;
            isMax = currentLvl >= 50;
        } else if (type === 'castle') {
            if (!castleActive) throw new functions.https.HttpsError('failed-precondition', '성이 개방되지 않았습니다.');
            currentLvl = castleLevel;
            isMax = currentLvl >= 50;
            baseCostMultiplier = 10;
        }

        if (isMax) throw new functions.https.HttpsError('failed-precondition', '이미 MAX 레벨입니다.');

        const effectiveLvl = Math.max(1, currentLvl + 1);
        const tier = Math.floor((effectiveLvl - 1) / 10);
        const step = ((effectiveLvl - 1) % 10) + 1;
        let rawCost = step * Math.pow(10, tier) * 1000 * baseCostMultiplier;
        
        const discount = 1 - (necklaceLvl * 0.005);
        const finalCost = Math.floor(rawCost * discount);

        if (balance < finalCost) throw new functions.https.HttpsError('resource-exhausted', 'GOU가 부족합니다.');

        let rate = 0;
        if (type === 'gear') {
            if (currentLvl < 5) rate = 1.0;
            else if (currentLvl < 10) rate = 0.7;
            else if (currentLvl < 15) rate = 0.6;
            else if (currentLvl < 20) rate = 0.5;
            else rate = [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][currentLvl - 20] || 0.1;
        } else {
            if (currentLvl < 5) rate = 1.0;
            else if (currentLvl < 10) rate = 0.7;
            else if (currentLvl < 15) rate = 0.65;
            else if (currentLvl < 20) rate = 0.6;
            else if (currentLvl < 25) rate = 0.55;
            else if (currentLvl < 30) rate = 0.5;
            else if (currentLvl < 35) rate = 0.45;
            else if (currentLvl < 40) rate = 0.4;
            else rate = [0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][currentLvl - 40] || 0.1;
        }

        let finalRate = Math.min(0.99, rate + (ringLvl * 0.001));
        if (IS_TEST_MODE) finalRate = 0.9;

        const isSuccess = Math.random() < finalRate;

        let economyUpdate = {};
        if (isSuccess) {
            economyUpdate = { pool: admin.firestore.FieldValue.increment(finalCost) };
        } else {
            economyUpdate = {
                pool: admin.firestore.FieldValue.increment(finalCost * 0.40),
                burn: admin.firestore.FieldValue.increment(finalCost * 0.30),
                jackpot: admin.firestore.FieldValue.increment(finalCost * 0.15),
                lp: admin.firestore.FieldValue.increment(finalCost * 0.10),
                reserve: admin.firestore.FieldValue.increment(finalCost * 0.05)
            };
        }

        let userUpdate = { balance: admin.firestore.FieldValue.increment(-finalCost) };
        let unlockMessage = null;

        if (type === 'gear') {
            const updatedGears = gears.map(g => 
                g.id === id ? { ...g, lvl: isSuccess ? g.lvl + 1 : Math.max(0, g.lvl - 1) } : g
            );
            userUpdate.gears = updatedGears;

            if (isSuccess && !petActive && updatedGears.every(g => g.lvl >= 30)) {
                userUpdate.petActive = true;
                unlockMessage = "🎉 장비 ALL 30강 달성! 신수(Pet)가 개방되었습니다!";
            }
        } else if (type === 'pet') {
            const nextLvl = isSuccess ? currentLvl + 1 : Math.max(0, currentLvl - 1);
            userUpdate.petLevel = nextLvl;
            
            if (isSuccess && !castleActive && nextLvl >= 50) {
                userUpdate.castleActive = true;
                unlockMessage = "🏰 펫 50강 달성! 위대한 군주의 성이 개방되었습니다!";
            }
        } else if (type === 'castle') {
            userUpdate.castleLevel = isSuccess ? currentLvl + 1 : Math.max(0, currentLvl - 1);
        }

        transaction.update(userRef, userUpdate);
        transaction.update(systemRef, economyUpdate);

        return {
            success: isSuccess,
            cost: finalCost,
            unlockMessage: unlockMessage
        };
    });
});