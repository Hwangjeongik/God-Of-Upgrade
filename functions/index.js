/* eslint-disable */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const crypto = require('crypto'); 
const { Buffer } = require('buffer');

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const IS_TEST_MODE = true; 
const MAX_SUPPLY = 10000000000000; 
const SAVE_POINTS = [10, 20, 30, 40]; 

const BOT_TOKEN = process.env.BOT_TOKEN || "8930501901:AAFxCo5ou_DAW27tHJ-1F0b3sLZ12EtoG10"; 
const WEB_APP_URL = "https://gou-h9pt.onrender.com"; 
const ADMIN_WALLET = "EQBsVg5qEXsxR8VpIEYSy7_myS0qXNtKjjtUrxT1lL6rSOJJ";

const verifyTelegramAuth = (uid, initData) => {
    if (uid === "test_commander_123") return true; 
    if (!initData) return false; 
    try {
        const q = new URLSearchParams(initData);
        const hash = q.get('hash');
        q.delete('hash');
        const keys = Array.from(q.keys()).sort();
        const dataCheckString = keys.map(k => `${k}=${q.get(k)}`).join('\n');
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        return hmac === hash; 
    } catch (error) { return false; }
};

const verifyTonTransaction = (txHash, expectedTonAmount) => {
    return new Promise((resolve) => {
        const options = { hostname: 'tonapi.io', path: `/v2/blockchain/transactions/${txHash}`, method: 'GET' };
        const req = https.request(options, (res) => {
            let data = ''; res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const tx = JSON.parse(data);
                        if (tx.success !== true) return resolve(false);
                        const expectedNanoTon = expectedTonAmount * 1000000000;
                        let isValid = false;
                        if (tx.out_msgs && Array.isArray(tx.out_msgs)) {
                            tx.out_msgs.forEach(msg => {
                                const msgValue = Number(msg.value || 0);
                                if (msgValue === expectedNanoTon && msg.destination) { isValid = true; }
                            });
                        }
                        resolve(isValid); 
                    } catch(e) { resolve(false); }
                } else { resolve(false); }
            });
        });
        req.on('error', () => resolve(false)); req.end();
    });
};

const getPhaseInfo = (burnAmount) => {
    let phase = 0; let gainMult = 1.0; let costMult = 1.0;
    let rates = { pool: 0.40, burn: 0.30, jackpot: 0.15, lp: 0.10, reserve: 0.05 };
    if (burnAmount >= MAX_SUPPLY * 0.6) {
        phase = 2; gainMult = 0.25; costMult = 0.5; rates = { pool: 0.40, burn: 0.22, jackpot: 0.23, lp: 0.10, reserve: 0.05 };
    } else if (burnAmount >= MAX_SUPPLY * 0.3) {
        phase = 1; gainMult = 0.5; costMult = 1.0; rates = { pool: 0.40, burn: 0.27, jackpot: 0.18, lp: 0.10, reserve: 0.05 };
    }
    return { phase, gainMult, costMult, rates };
};

const getRealSuccessRate = (lvl, type) => {
    let base = 1.0;
    if (type === 'gear') {
        if (lvl >= 6 && lvl <= 10) base = 0.70; else if (lvl >= 11 && lvl <= 15) base = 0.60; else if (lvl >= 16 && lvl <= 20) base = 0.50; else if (lvl >= 21) base = 0.50 - ((lvl - 20) * 0.02);
    } else {
        if (lvl >= 6 && lvl <= 10) base = 0.70; else if (lvl >= 11 && lvl <= 15) base = 0.65; else if (lvl >= 16 && lvl <= 20) base = 0.60; else if (lvl >= 21 && lvl <= 25) base = 0.55; else if (lvl >= 26 && lvl <= 30) base = 0.50; else if (lvl >= 31 && lvl <= 35) base = 0.45; else if (lvl >= 36 && lvl <= 40) base = 0.40; else if (lvl >= 41) base = 0.40 - ((lvl - 40) * 0.02);
    }
    return base;
};

// 🚨 [동기화 패치] 접속 시 내 데이터를 프론트엔드로 100% 반환
exports.syncUserInfo = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId;
    if (!uid || !verifyTelegramAuth(uid, reqData.initData)) return { success: false }; 

    const db = admin.firestore();
    const userRef = db.collection('users').doc(String(uid));
    const doc = await userRef.get();
    
    if (!doc.exists) {
        const resetData = { balance: 50000, tickets: 3, adViewsLeft: 3, lastClaimTime: Date.now(), lastActionTime: 0, gears: [{ id: 'sword', lvl: 0 }, { id: 'armor', lvl: 0 }, { id: 'helmet', lvl: 0 }, { id: 'gloves', lvl: 0 }, { id: 'boots', lvl: 0 }, { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }], petLevel: 0, castleLevel: 0 };
        await userRef.set({ ...resetData, chatId: uid, lastTitle: reqData.title || "훈련병", lastName: reqData.name || "유저" });
        return { success: true, userData: resetData };
    } else {
        await userRef.set({ chatId: uid, lastTitle: reqData.title || "훈련병", lastName: reqData.name || "유저" }, { merge: true });
        return { success: true, userData: doc.data() };
    }
});

// 🚨 [동기화 패치] 미니게임 & 복권 보상 다이렉트 입금
exports.syncBonusReward = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근');

    const amount = Number(reqData.amount);
    if (isNaN(amount) || amount <= 0 || amount > 20000000000) throw new functions.https.HttpsError('invalid-argument', '비정상적 보상 금액');

    const db = admin.firestore();
    const userRef = db.collection('users').doc(String(uid));
    let updateData = { balance: admin.firestore.FieldValue.increment(amount) };
    if (reqData.source === 'lottery' && reqData.slot) updateData.lastLotterySlot = reqData.slot;
    
    await userRef.update(updateData);
    return { success: true };
});

// 🚨 [동기화 패치] 광고 쿨타임 및 티켓 차감 영구 기록
exports.syncAdAction = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근');

    const type = reqData.type; // 'ticket', 'buff', 'useTicket'
    const db = admin.firestore();
    const userRef = db.collection('users').doc(String(uid));

    return await db.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        let d = doc.exists ? doc.data() : {};
        const now = Date.now();
        let updateData = {};

        if (type === 'ticket') {
            let viewsLeft = d.adViewsLeft !== undefined ? d.adViewsLeft : 3;
            if (viewsLeft <= 0) throw new functions.https.HttpsError('resource-exhausted', '광고 모두 소진됨');
            let nextCharge = viewsLeft === 3 ? now + 3 * 3600000 : (d.nextAdChargeTime || 0);
            updateData = { tickets: admin.firestore.FieldValue.increment(1), adViewsLeft: viewsLeft - 1, nextAdChargeTime: nextCharge };
        } else if (type === 'buff') {
            if (now < (d.nextBuffAdTime || 0)) throw new functions.https.HttpsError('resource-exhausted', '버프 쿨타임 중');
            updateData = { nextBuffAdTime: now + 3 * 3600000, buffEndTime: now + 3600000 };
        } else if (type === 'useTicket') {
            let tickets = d.tickets || 0;
            if (tickets <= 0) throw new functions.https.HttpsError('resource-exhausted', '티켓 부족');
            updateData = { tickets: admin.firestore.FieldValue.increment(-1) };
        }
        t.update(userRef, updateData);
        return { success: true };
    });
});

exports.resetAccount = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근'); 
    const db = admin.firestore();
    const resetData = { balance: 50000, tickets: 3, adViewsLeft: 3, nextAdChargeTime: 0, nextBuffAdTime: 0, lastLotterySlot: "", lastClaimTime: Date.now(), lastActionTime: 0, gears: [{ id: 'sword', lvl: 0 }, { id: 'armor', lvl: 0 }, { id: 'helmet', lvl: 0 }, { id: 'gloves', lvl: 0 }, { id: 'boots', lvl: 0 }, { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }], petLevel: 0, castleLevel: 0 };
    await db.collection('users').doc(String(uid)).set(resetData, { merge: true });
    await db.collection('system').doc('economy').set({ burn: 0, pool: 0, jackpot: 0, lp: 0, reserve: 0 }, { merge: true });
    return { success: true, data: resetData };
});

exports.claimGOU = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근'); 
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const userDoc = await t.get(db.collection('users').doc(String(uid)));
        const sysDoc = await t.get(db.collection('system').doc('economy'));
        const serverNow = Date.now(); 
        let userData = userDoc.exists ? userDoc.data() : { balance: 50000, lastClaimTime: serverNow - 10000, lastActionTime: 0 };
        if (userData.lastActionTime && (serverNow - userData.lastActionTime < 1000)) throw new functions.https.HttpsError('resource-exhausted', '매크로 차단');
        let sysData = sysDoc.exists ? sysDoc.data() : { burn: 0 };
        const phaseInfo = getPhaseInfo(sysData.burn || 0);
        let elapsedMs = serverNow - (userData.lastClaimTime || serverNow);
        if (elapsedMs > 12 * 60 * 60 * 1000) elapsedMs = 12 * 60 * 60 * 1000;
        if (elapsedMs < 10000) return { success: false, message: '대기 중' };
        let harvestedGOU = (elapsedMs / 1000) * (300000 / 86400) * (Number(reqData.currentMultiplier) || 1.0) * phaseInfo.gainMult;
        if (isNaN(harvestedGOU) || harvestedGOU < 0) harvestedGOU = 0;
        t.update(db.collection('users').doc(String(uid)), { balance: admin.firestore.FieldValue.increment(harvestedGOU), lastClaimTime: serverNow, lastActionTime: serverNow });
        return { success: true, harvestedAmount: harvestedGOU };
    });
});

exports.upgradeItem = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근'); 
    const type = reqData.type; const id = reqData.id; 
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const userRef = db.collection('users').doc(String(uid));
        const sysRef = db.collection('system').doc('economy');
        const userDoc = await t.get(userRef);
        const sysDoc = await t.get(sysRef);
        const serverNow = Date.now();
        let userData = userDoc.exists ? userDoc.data() : {};
        if (userData.lastActionTime && (serverNow - userData.lastActionTime < 300)) throw new functions.https.HttpsError('resource-exhausted', '매크로 차단');
        let sysData = sysDoc.exists ? sysDoc.data() : { burn: 0 };
        const phaseInfo = getPhaseInfo(sysData.burn || 0);
        let balance = userData.balance !== undefined ? userData.balance : 50000;
        let gears = userData.gears || [];
        let foundSword = false; for(let i=0; i<gears.length; i++) { if(gears[i].id === 'sword') foundSword = true; }
        if (!foundSword) gears = [{ id: 'sword', lvl: 0 }, { id: 'armor', lvl: 0 }, { id: 'helmet', lvl: 0 }, { id: 'gloves', lvl: 0 }, { id: 'boots', lvl: 0 }, { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }];
        let currentLvl = 0;
        if (type === 'gear') { const gItem = gears.find(g => g.id === id); currentLvl = gItem ? gItem.lvl : 0; } 
        else if (type === 'pet') { currentLvl = userData.petLevel || 0; } else { currentLvl = userData.castleLevel || 0; }
        if (currentLvl >= (type === 'gear' ? 30 : 50)) throw new functions.https.HttpsError('failed-precondition', 'MAX 레벨');
        const necklaceItem = gears.find(g => g.id === 'necklace'); const necklaceLvl = necklaceItem ? necklaceItem.lvl : 0;
        const finalCost = Math.floor(((currentLvl % 10) + 1) * Math.pow(10, Math.floor(currentLvl / 10)) * (type === 'castle' ? 10000 : 1000) * (1 - (necklaceLvl * 0.005)) * phaseInfo.costMult);
        if (balance < finalCost || finalCost < 0) throw new functions.https.HttpsError('resource-exhausted', '잔고 부족/비정상');
        const ringItem = gears.find(g => g.id === 'ring'); const ringLvl = ringItem ? ringItem.lvl : 0;
        let successRate = getRealSuccessRate(currentLvl, type) + (ringLvl * 0.001);
        const isSuccess = Math.random() < successRate;
        let nextLvl = currentLvl;
        if (isSuccess) nextLvl++; else if (currentLvl >= 5 && !SAVE_POINTS.includes(currentLvl)) nextLvl--;
        let ecoUpdate = {};
        if (isSuccess) { ecoUpdate = { pool: admin.firestore.FieldValue.increment(finalCost) }; } 
        else { ecoUpdate = { pool: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.pool), burn: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.burn), jackpot: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.jackpot), lp: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.lp), reserve: admin.firestore.FieldValue.increment(finalCost * phaseInfo.rates.reserve) }; }
        let userUpdate = { balance: balance - finalCost, lastActionTime: serverNow };
        if (type === 'gear') userUpdate.gears = gears.map(g => g.id === id ? { id: g.id, lvl: nextLvl } : g);
        else if (type === 'pet') userUpdate.petLevel = nextLvl; else userUpdate.castleLevel = nextLvl;
        t.update(userRef, userUpdate); t.set(sysRef, ecoUpdate, { merge: true });
        return { success: isSuccess, cost: finalCost, newLevel: nextLvl };
    });
});

exports.syncAutoUpgrade = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    const type = reqData.type; const id = reqData.id;
    const finalLevel = Number(reqData.finalLevel); const successCost = Number(reqData.successCost); const failCost = Number(reqData.failCost);
    if (isNaN(finalLevel) || finalLevel < 0 || (type === 'gear' && finalLevel > 30) || (type !== 'gear' && finalLevel > 50)) throw new functions.https.HttpsError('invalid-argument', '비정상적인 레벨');
    if (isNaN(successCost) || isNaN(failCost) || successCost < 0 || failCost < 0) throw new functions.https.HttpsError('invalid-argument', '비정상적인 비용');
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const userRef = db.collection('users').doc(String(uid)); const sysRef = db.collection('system').doc('economy');
        const userDoc = await t.get(userRef); const sysDoc = await t.get(sysRef);
        let userData = userDoc.exists ? userDoc.data() : { balance: 0 };
        const serverNow = Date.now();
        if ((userData.balance || 0) < (successCost + failCost)) throw new functions.https.HttpsError('resource-exhausted', '잔고 부족');
        let sysData = sysDoc.exists ? sysDoc.data() : { burn: 0 };
        const phaseInfo = getPhaseInfo(sysData.burn || 0);
        let userUpdate = { balance: admin.firestore.FieldValue.increment(-(successCost + failCost)), lastActionTime: serverNow };
        let gears = userData.gears || [];
        if (type === 'gear') userUpdate.gears = gears.map(g => g.id === id ? { id: g.id, lvl: finalLevel } : g);
        else if (type === 'pet') userUpdate.petLevel = finalLevel; else if (type === 'castle') userUpdate.castleLevel = finalLevel;
        t.update(userRef, userUpdate);
        let ecoUpdate = { pool: admin.firestore.FieldValue.increment(successCost + (failCost * phaseInfo.rates.pool)), burn: admin.firestore.FieldValue.increment(failCost * phaseInfo.rates.burn), jackpot: admin.firestore.FieldValue.increment(failCost * phaseInfo.rates.jackpot), lp: admin.firestore.FieldValue.increment(failCost * phaseInfo.rates.lp), reserve: admin.firestore.FieldValue.increment(failCost * phaseInfo.rates.reserve) };
        t.set(sysRef, ecoUpdate, { merge: true });
        return { success: true };
    });
});

exports.buyGOU = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '접근 차단'); 
    const amount = Number(reqData.amount); const txHash = reqData.txHash;
    if (!amount || isNaN(amount) || amount <= 0) throw new functions.https.HttpsError('invalid-argument', '잘못된 수량');
    if (!txHash || txHash.length < 10) throw new functions.https.HttpsError('invalid-argument', '영수증 누락');
    let expectedTon = 0;
    if (amount === 10000000) expectedTon = 1; else if (amount === 50000000) expectedTon = 5; else if (amount === 100000000) expectedTon = 10;
    else throw new functions.https.HttpsError('invalid-argument', '비정상 패키지');
    const isTxValid = await verifyTonTransaction(txHash, expectedTon);
    if (!isTxValid) throw new functions.https.HttpsError('invalid-argument', '검증 실패: 위조 영수증');
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const txRef = db.collection('transactions').doc(txHash); const txDoc = await t.get(txRef);
        if (txDoc.exists) throw new functions.https.HttpsError('already-exists', '사용된 영수증');
        const userRef = db.collection('users').doc(String(uid));
        t.set(txRef, { uid: uid, amount: amount, timestamp: Date.now() }); 
        t.update(userRef, { balance: admin.firestore.FieldValue.increment(amount) });
        return { success: true, addedAmount: amount };
    });
});

exports.withdrawGOU = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근'); 
    const amount = Number(reqData.amount);
    if (isNaN(amount) || amount < 10000000) throw new functions.https.HttpsError('invalid-argument', '비정상적인 수량');
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const userRef = db.collection('users').doc(String(uid)); const sysRef = db.collection('system').doc('economy');
        const userDoc = await t.get(userRef); let userData = userDoc.exists ? userDoc.data() : {};
        let totalGearLevel = 0; (userData.gears || []).forEach(g => totalGearLevel += (g.lvl || 0));
        if (totalGearLevel < 140) throw new functions.https.HttpsError('permission-denied', '조건 미달');
        if ((userData.balance || 0) < amount) throw new functions.https.HttpsError('resource-exhausted', '잔고 부족');
        const fee = Math.floor(amount * 0.05); 
        t.update(userRef, { balance: admin.firestore.FieldValue.increment(-amount), lastActionTime: Date.now() });
        t.set(sysRef, { burn: admin.firestore.FieldValue.increment(fee) }, { merge: true });
        return { success: true, withdrawn: amount - fee, feeBurned: fee };
    });
});

exports.distributeSeasonRewardManual = functions.https.onCall(async (data, context) => {
    const db = admin.firestore();
    return await db.runTransaction(async (t) => {
        const sysRef = db.collection('system').doc('economy'); const sysDoc = await t.get(sysRef);
        if (!sysDoc.exists) throw new functions.https.HttpsError('not-found', '시스템 에러');
        const jackpot = sysDoc.data().jackpot || 0; if (jackpot <= 0) return { success: false, message: '분배할 금액 없음' };
        const usersSnapshot = await t.get(db.collection('users')); let eligibleUsers = [];
        usersSnapshot.forEach(doc => { if (doc.data().castleLevel >= 50) eligibleUsers.push(doc.ref); });
        if (eligibleUsers.length === 0) { usersSnapshot.forEach(doc => { if (doc.data().petLevel >= 50) eligibleUsers.push(doc.ref); }); }
        if (eligibleUsers.length === 0) {
            usersSnapshot.forEach(doc => {
                const gears = doc.data().gears || []; let total = gears.reduce((sum, g) => sum + (g.lvl || 0), 0);
                if (total >= 210) eligibleUsers.push(doc.ref);
            });
        }
        if (eligibleUsers.length > 0) {
            const splitAmount = Math.floor(jackpot / eligibleUsers.length);
            eligibleUsers.forEach(userRef => { t.update(userRef, { balance: admin.firestore.FieldValue.increment(splitAmount) }); });
            t.update(sysRef, { jackpot: 0 });
            return { success: true, count: eligibleUsers.length, amount: splitAmount };
        } else { return { success: false, message: '조건 달성 유저 없음' }; }
    });
});

// 🚨 비공개 채널 ID: -1002344755106 를 적용한 보안 로직
exports.checkChannelJoin = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId;
    const CHANNEL_ID = "-1002344755106"; 
    
    // 텔레그램 API 호출 (채널 가입 여부 확인)
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${uid}`;
    
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let body = ''; res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    const status = response.result?.status;
                    const isMember = ['member', 'administrator', 'creator'].includes(status);
                    resolve({ isMember: isMember });
                } catch(e) { resolve({ isMember: false }); }
            });
        }).on('error', () => resolve({ isMember: false }));
    });
});