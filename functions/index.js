/* eslint-disable */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const { Buffer } = require('buffer');

// 🚨 에러 방지: 앱 중복 초기화 방어 로직
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const IS_TEST_MODE = true; 
const MAX_SUPPLY = 10000000000000; 

// 🚨 사령관님의 텔레그램 봇 토큰을 여기에 입력하세요!
const BOT_TOKEN = "8930501901:AAFxCo5ou_DAW27tHJ-1F0b3sLZ12EtoG10"; 
const WEB_APP_URL = "https://gou-h9pt.onrender.com"; 

// 🚀 텔레그램 푸시 알림 발송 엔진 (호환성 100% 네이티브)
const sendTelegramPush = (chatId, title, name) => {
    return new Promise((resolve) => {
        if (!BOT_TOKEN || BOT_TOKEN.indexOf("여기에_봇_토큰을") !== -1) {
            console.log("봇 토큰이 설정되지 않았습니다.");
            return resolve(false);
        }
        
        const payload = JSON.stringify({
            chat_id: chatId,
            photo: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            caption: "🎁 [" + title + "] " + name + " 님!\n\n일일 보급품이 도착했습니다!\n티켓 3장과 광고 3회가 모두 충전되었습니다.\n\n지금 바로 접속하여 영지 수확과 아케이드 게임을 시작하세요!",
            reply_markup: {
                inline_keyboard: [[{ text: "🚀 GOD OF UPGRADE 실행", web_app: { url: WEB_APP_URL } }]]
            }
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: '/bot' + BOT_TOKEN + '/sendPhoto',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            res.on('data', () => {});
            res.on('end', () => resolve(true));
        });

        req.on('error', (e) => {
            console.error("푸시 실패:", e);
            resolve(false);
        });

        req.write(payload);
        req.end();
    });
};

exports.syncUserInfo = functions.https.onCall(async (data, context) => {
    let reqData = data || {};
    if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId;
    if (!uid) return { success: false };

    const db = admin.firestore();
    await db.collection('users').doc(String(uid)).set({
        chatId: uid, 
        lastTitle: reqData.title || "훈련병",
        lastName: reqData.name || "유저"
    }, { merge: true });
    return { success: true };
});

// 🔔 수동 푸시 테스트용 API (이것으로 텔레그램 연동을 확인합니다!)
exports.testPushNotification = functions.https.onCall(async (data, context) => {
    let reqData = data || {};
    if (reqData.data) reqData = reqData.data;
    await sendTelegramPush(reqData.userId, reqData.title, reqData.name);
    return { success: true };
});

// 🚨 배포 에러의 주범이었던 daily9AMPush (자동 스케줄러) 삭제 완료! 🚨

exports.resetAccount = functions.https.onCall(async (data, context) => {
    let reqData = data || {};
    if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    const db = admin.firestore();
    const userRef = db.collection('users').doc(String(uid));
    const resetData = {
        balance: 1000000000, lastClaimTime: Date.now(), 
        gears: [{ id: 'sword', lvl: 0 }, { id: 'armor', lvl: 0 }, { id: 'helmet', lvl: 0 }, { id: 'gloves', lvl: 0 }, { id: 'boots', lvl: 0 }, { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }],
        petLevel: 0, castleLevel: 0
    };
    await userRef.set(resetData, { merge: true });
    await db.collection('system').doc('economy').set({ burn: 0, pool: 0, jackpot: 50000000, lp: 0, reserve: 0 }, { merge: true });
    return { success: true, data: resetData };
});

const getPhaseInfo = (burnAmount) => {
    let phase = 0; let gainMult = 1.0; let costMult = 1.0;
    let rates = { pool: 0.40, burn: 0.30, jackpot: 0.15, lp: 0.10, reserve: 0.05 };
    if (burnAmount >= MAX_SUPPLY * 0.6) {
        phase = 2; gainMult = 0.25; costMult = 0.5;
        rates = { pool: 0.40, burn: 0.22, jackpot: 0.23, lp: 0.10, reserve: 0.05 };
    } else if (burnAmount >= MAX_SUPPLY * 0.3) {
        phase = 1; gainMult = 0.5; costMult = 1.0;
        rates = { pool: 0.40, burn: 0.27, jackpot: 0.18, lp: 0.10, reserve: 0.05 };
    }
    return { phase, gainMult, costMult, rates };
};

exports.claimGOU = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; 
    if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const userDoc = await t.get(db.collection('users').doc(String(uid)));
        const sysDoc = await t.get(db.collection('system').doc('economy'));
        const serverNow = Date.now(); 
        let userData = userDoc.exists ? userDoc.data() : { balance: 1000000000, lastClaimTime: serverNow - 10000, gears: [] };
        let sysData = sysDoc.exists ? sysDoc.data() : { burn: 0 };
        const phaseInfo = getPhaseInfo(sysData.burn || 0);
        let elapsedMs = serverNow - (userData.lastClaimTime || serverNow);
        if (elapsedMs > 12 * 60 * 60 * 1000) elapsedMs = 12 * 60 * 60 * 1000;
        if (elapsedMs < 10000) return { success: false, message: '대기 중' };
        let harvestedGOU = (elapsedMs / 1000) * (300000 / 86400) * (Number(reqData.currentMultiplier) || 1.0) * phaseInfo.gainMult;
        if (isNaN(harvestedGOU) || harvestedGOU < 0) harvestedGOU = 0;
        t.update(db.collection('users').doc(String(uid)), { balance: admin.firestore.FieldValue.increment(harvestedGOU), lastClaimTime: serverNow });
        return { success: true, harvestedAmount: harvestedGOU };
    });
});

exports.upgradeItem = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; 
    if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    const type = reqData.type;
    const id = reqData.id; 
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const userRef = db.collection('users').doc(String(uid));
        const sysRef = db.collection('system').doc('economy');
        const userDoc = await t.get(userRef);
        const sysDoc = await t.get(sysRef);
        let userData = userDoc.exists ? userDoc.data() : {};
        let sysData = sysDoc.exists ? sysDoc.data() : { burn: 0 };
        const phaseInfo = getPhaseInfo(sysData.burn || 0);
        
        let balance = userData.balance !== undefined ? userData.balance : 1000000000;
        let gears = userData.gears || [];
        
        let foundSword = false;
        for(let i=0; i<gears.length; i++) { if(gears[i].id === 'sword') foundSword = true; }
        if (!foundSword) gears = [{ id: 'sword', lvl: 0 }, { id: 'armor', lvl: 0 }, { id: 'helmet', lvl: 0 }, { id: 'gloves', lvl: 0 }, { id: 'boots', lvl: 0 }, { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }];
        
        let currentLvl = 0;
        if (type === 'gear') {
            const gItem = gears.find(function(g) { return g.id === id; });
            currentLvl = gItem ? gItem.lvl : 0;
        } else if (type === 'pet') {
            currentLvl = userData.petLevel || 0;
        } else {
            currentLvl = userData.castleLevel || 0;
        }
        
        if (currentLvl >= (type === 'gear' ? 30 : 50)) throw new functions.https.HttpsError('failed-precondition', 'MAX 레벨');
        
        const necklaceItem = gears.find(function(g) { return g.id === 'necklace'; });
        const necklaceLvl = necklaceItem ? necklaceItem.lvl : 0;
        
        const finalCost = Math.floor(((currentLvl % 10) + 1) * Math.pow(10, Math.floor(currentLvl / 10)) * (type === 'castle' ? 10000 : 1000) * (1 - (necklaceLvl * 0.005)) * phaseInfo.costMult);
        if (balance < finalCost) throw new functions.https.HttpsError('resource-exhausted', 'GOU 부족');
        
        const isSuccess = IS_TEST_MODE ? (Math.random() < 0.8) : (Math.random() < 0.5);
        let nextLvl = isSuccess ? currentLvl + 1 : (currentLvl <= 5 || currentLvl === 10 || currentLvl === 20 ? currentLvl : currentLvl - 1);
        
        let ecoUpdate = {};
        if (isSuccess) {
            ecoUpdate = { pool: admin.firestore.FieldValue.increment(finalCost) };
        } else {
            ecoUpdate = { 
                pool: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.pool), 
                burn: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.burn), 
                jackpot: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.jackpot), 
                lp: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.lp), 
                reserve: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.reserve) 
            };
        }
        
        let userUpdate = { balance: balance - finalCost };
        if (type === 'gear') {
            userUpdate.gears = gears.map(function(g) { return g.id === id ? { id: g.id, lvl: nextLvl } : g; });
        } else if (type === 'pet') {
            userUpdate.petLevel = nextLvl;
        } else {
            userUpdate.castleLevel = nextLvl;
        }
        
        t.update(userRef, userUpdate);
        t.set(sysRef, ecoUpdate, { merge: true });
        return { success: isSuccess, cost: finalCost, newLevel: nextLvl };
    });
});

exports.syncAutoUpgrade = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; 
    if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    const type = reqData.type;
    const id = reqData.id;
    const finalLevel = reqData.finalLevel;
    const successCost = reqData.successCost;
    const failCost = reqData.failCost;
    
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const userRef = db.collection('users').doc(String(uid));
        const sysRef = db.collection('system').doc('economy');
        const userDoc = await t.get(userRef);
        const sysDoc = await t.get(sysRef);
        let sysData = sysDoc.exists ? sysDoc.data() : { burn: 0 };
        const phaseInfo = getPhaseInfo(sysData.burn || 0);
        
        let userUpdate = { balance: admin.firestore.FieldValue.increment(-(successCost + failCost)) };
        let gears = userDoc.exists && userDoc.data().gears ? userDoc.data().gears : [];
        
        let foundSword = false;
        for(let i=0; i<gears.length; i++) { if(gears[i].id === 'sword') foundSword = true; }
        if (!foundSword) gears = [{ id: 'sword', lvl: 0 }, { id: 'armor', lvl: 0 }, { id: 'helmet', lvl: 0 }, { id: 'gloves', lvl: 0 }, { id: 'boots', lvl: 0 }, { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }];
        
        if (type === 'gear') {
            userUpdate.gears = gears.map(function(g) { return g.id === id ? { id: g.id, lvl: finalLevel } : g; });
        } else if (type === 'pet') {
            userUpdate.petLevel = finalLevel;
        } else if (type === 'castle') {
            userUpdate.castleLevel = finalLevel;
        }
        
        t.update(userRef, userUpdate);
        let ecoUpdate = { 
            pool: admin.firestore.FieldValue.increment(successCost + (failCost * phaseInfo.rates.pool)), 
            burn: admin.firestore.FieldValue.increment(failCost * phaseInfo.rates.burn), 
            jackpot: admin.firestore.FieldValue.increment(failCost * phaseInfo.rates.jackpot), 
            lp: admin.firestore.FieldValue.increment(failCost * phaseInfo.rates.lp), 
            reserve: admin.firestore.FieldValue.increment(failCost * phaseInfo.rates.reserve) 
        };
        t.set(sysRef, ecoUpdate, { merge: true });
        return { success: true };
    });
});

exports.withdrawGOU = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; 
    if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    const amount = Number(reqData.amount);
    if (isNaN(amount) || amount < 10000000) throw new functions.https.HttpsError('invalid-argument', '최소 1,000만 GOU부터 출금 가능합니다.');
    
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const userRef = db.collection('users').doc(String(uid));
        const sysRef = db.collection('system').doc('economy');
        const userDoc = await t.get(userRef);
        let userData = userDoc.exists ? userDoc.data() : {};
        let balance = userData.balance || 0;
        if (balance < amount) throw new functions.https.HttpsError('resource-exhausted', '잔고 부족');
        const fee = Math.floor(amount * 0.05); 
        t.update(userRef, { balance: admin.firestore.FieldValue.increment(-amount) });
        t.set(sysRef, { burn: admin.firestore.FieldValue.increment(fee) }, { merge: true });
        return { success: true, withdrawn: amount - fee, feeBurned: fee };
    });
});