const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 🚀 수확(Claim) API 서버 로직
exports.claimGOU = functions.https.onCall(async (data, context) => {
    // 1. 보안 검증: 로그인 상태 확인
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', '인증되지 않은 접근입니다.');
    }

    const uid = context.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    // 2. 동시 다발적인 클릭(매크로)을 막기 위한 트랜잭션 처리
    return db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', '유저 데이터가 존재하지 않습니다.');
        }

        const userData = userDoc.data();
        const serverNow = Date.now(); // 해커가 조작 불가능한 구글 서버의 절대 시간
        const lastClaimTime = userData.lastClaimTime || serverNow;

        // 3. 방치 시간 계산 (최대 12시간 한도)
        const maxMiningDuration = 12 * 60 * 60 * 1000; 
        let elapsedMs = serverNow - lastClaimTime;
        
        if (elapsedMs < 0) elapsedMs = 0;
        if (elapsedMs > maxMiningDuration) elapsedMs = maxMiningDuration;

        // 쿨타임 방어: 10초 이내 연속 수확 차단
        if (elapsedMs < 10000) {
            return { success: false, message: '아직 수확할 GOU가 부족합니다. (최소 10초 대기)' };
        }

        // 4. 채굴량 서버 자체 계산 (클라이언트 데이터 불신 원칙)
        const baseGOUPerSec = 300000 / 86400; // 초당 기본 채굴량
        
        // *현재는 클라이언트에서 보내준 배율을 임시로 받아쓰지만, 
        // 2단계 마이그레이션(장비 강화 서버 이관) 때 이 부분도 서버가 장비 레벨을 읽어 직접 계산하도록 잠글 예정입니다.
        const multiplier = data.currentMultiplier || 1.0; 
        
        const harvestedGOU = (elapsedMs / 1000) * baseGOUPerSec * multiplier;

        // 5. 서버에서 안전하게 DB 잔고 업데이트
        transaction.update(userRef, {
            balance: admin.firestore.FieldValue.increment(harvestedGOU),
            lastClaimTime: serverNow
        });

        return { 
            success: true, 
            harvestedAmount: harvestedGOU, 
            message: `${Math.floor(harvestedGOU).toLocaleString()} GOU를 획득했습니다!` 
        };
    });
});
// (기존 claimGOU 함수 아래에 이어서 작성합니다)

// 🚨 사령관 전용 마스터 스위치 (테스트 시 true, 정식 오픈 시 false)
const IS_TEST_MODE = false;

exports.upgradeItem = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '인증되지 않은 접근입니다.');
    
    const uid = context.auth.uid;
    const { type, id } = data; // type: 'gear' | 'pet' | 'castle', id: 'weapon' 등 (gear일 때만)
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const systemRef = db.collection('system').doc('economy'); // 글로벌 경제 지표 문서

    return db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        let systemDoc = await transaction.get(systemRef);
        
        if (!userDoc.exists) throw new functions.https.HttpsError('not-found', '유저 데이터 오류');
        
        // 시스템 문서가 없으면 초기화
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

        // 목걸이(할인)와 반지(확률업) 레벨 추출
        const necklaceLvl = gears.find(g => g.id === 'necklace')?.lvl || 0;
        const ringLvl = gears.find(g => g.id === 'ring')?.lvl || 0;

        let currentLvl = 0;
        let isMax = false;
        let baseCostMultiplier = 1; // 장비, 펫은 1. 성은 10

        // 타겟 레벨 및 상태 확인
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

        // 💰 비용 계산 로직
        const effectiveLvl = Math.max(1, currentLvl + 1);
        const tier = Math.floor((effectiveLvl - 1) / 10);
        const step = ((effectiveLvl - 1) % 10) + 1;
        let rawCost = step * Math.pow(10, tier) * 1000 * baseCostMultiplier;
        
        // 목걸이 할인 적용 (최대 15%)
        const discount = 1 - (necklaceLvl * 0.005);
        const finalCost = Math.floor(rawCost * discount);

        if (balance < finalCost) throw new functions.https.HttpsError('resource-exhausted', 'GOU가 부족합니다.');

        // 🎲 확률 계산 로직
        let rate = 0;
        if (type === 'gear') {
            if (currentLvl < 5) rate = 1.0;
            else if (currentLvl < 10) rate = 0.7;
            else if (currentLvl < 15) rate = 0.6;
            else if (currentLvl < 20) rate = 0.5;
            else rate = [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][currentLvl - 20] || 0.1;
        } else {
            // 펫 & 성 확률
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

        // 반지 보너스 (최대 3% 추가) 및 치트키 적용
        let finalRate = Math.min(0.99, rate + (ringLvl * 0.001));
        if (IS_TEST_MODE) finalRate = 0.9;

        // ⚔️ 서버단 난수 판별 (핵심)
        const isSuccess = Math.random() < finalRate;

        // ⚖️ 자원 분배 정산 (사령관님 공식 적용)
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

        // 🧬 유저 데이터 갱신
        let userUpdate = { balance: admin.firestore.FieldValue.increment(-finalCost) };
        let unlockMessage = null;

        if (type === 'gear') {
            const updatedGears = gears.map(g => 
                g.id === id ? { ...g, lvl: isSuccess ? g.lvl + 1 : Math.max(0, g.lvl - 1) } : g
            );
            userUpdate.gears = updatedGears;

            // 한계돌파: ALL 30강 시 펫 개방
            if (isSuccess && !petActive && updatedGears.every(g => g.lvl >= 30)) {
                userUpdate.petActive = true;
                unlockMessage = "🎉 장비 ALL 30강 달성! 신수(Pet)가 개방되었습니다!";
            }
        } else if (type === 'pet') {
            const nextLvl = isSuccess ? currentLvl + 1 : Math.max(0, currentLvl - 1);
            userUpdate.petLevel = nextLvl;
            
            // 최종진화: 펫 50강 시 성 개방
            if (isSuccess && !castleActive && nextLvl >= 50) {
                userUpdate.castleActive = true;
                unlockMessage = "🏰 펫 50강 달성! 위대한 군주의 성이 개방되었습니다!";
            }
        } else if (type === 'castle') {
            userUpdate.castleLevel = isSuccess ? currentLvl + 1 : Math.max(0, currentLvl - 1);
        }

        // 트랜잭션 확정 (유저 잔고 및 시스템 글로벌 경제 지표 동시 업데이트)
        transaction.update(userRef, userUpdate);
        transaction.update(systemRef, economyUpdate);

        return {
            success: isSuccess,
            cost: finalCost,
            unlockMessage: unlockMessage
        };
    });
});