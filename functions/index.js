/* eslint-disable */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const crypto = require('crypto'); 

// 🚨 [블록체인 무기 탑재] TON 네트워크 통신 및 시드 구문 해석기
const { TonClient, WalletContractV4, internal } = require("@ton/ton");
const { mnemonicToWalletKey } = require("@ton/crypto");
require("dotenv").config(); // 기밀 금고(.env) 열쇠

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const IS_TEST_MODE = true; 
const MAX_SUPPLY = 10000000000000; 
const SAVE_POINTS = [10, 20, 30, 40]; 

const BOT_TOKEN = process.env.BOT_TOKEN || "8930501901:AAFxCo5ou_DAW27tHJ-1F0b3sLZ12EtoG10"; 
const WEB_APP_URL = "https://gou-h9pt.onrender.com"; 

// 🚨🚨🚨 [매우 중요: 사령관님 지갑 주소 세팅] 🚨🚨🚨
const ADMIN_WALLET = "UQBeUaO9-hrCsfk8UWtaafeu3EXV08Gnoww4bbMdanCZwgmQ"; // 👈 상점 결제 시 TON이 들어올 실무지갑 주소!
const RESERVE_WALLET_ADDRESS = "UQCEfublSMseGxYhxR-1xLgfnGV_Ow5GAn61jsBFTqkn14oZ"; // 👈 일요일 예비비 정산받을 지갑 주소!
const BURN_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"; // 영구 소각용 블랙홀 주소

const db = admin.firestore();

// =====================================================================
// 🌐 TON 메인넷 통신망 연결 및 지갑 헬퍼 함수
// =====================================================================
const tonClient = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
});

async function getWalletConfig(mnemonicStr) {
    if (!mnemonicStr) throw new Error("금고에 지갑 비밀번호가 없습니다!");
    const key = await mnemonicToWalletKey(mnemonicStr.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const contract = tonClient.open(wallet);
    return { key, contract, wallet };
}

// =====================================================================
// 🛡️ 기본 유틸리티 함수 (인증, 검증, 확률)
// =====================================================================
const verifyTelegramAuth = (uid, initData) => {
    if (uid && String(uid).startsWith("test_")) return true; 
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

// 🚨 [결제 검증 완벽 패치 - 실무지갑으로 잘 왔는지 확인!]
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
                                // 🚨 목적지가 사령관님의 실무지갑(ADMIN_WALLET)이 맞는지 검사!
                                if (msgValue === expectedNanoTon && msg.destination === ADMIN_WALLET) { 
                                    isValid = true; 
                                }
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

// =====================================================================
// 🎮 게임 코어 통신망 (유저 정보, 보상, 광고, 채굴, 강화 등)
// =====================================================================

exports.syncUserInfo = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId;
    if (!uid || !verifyTelegramAuth(uid, reqData.initData)) return { success: false }; 

    const userRef = db.collection('users').doc(String(uid));
    const doc = await userRef.get();
    
    // 지갑 주소 업데이트
    const walletAddress = reqData.walletAddress || ""; 

    if (!doc.exists) {
        const resetData = { balance: 50000, tickets: 3, adViewsLeft: 3, lastClaimTime: Date.now(), lastActionTime: 0, gears: [{ id: 'sword', lvl: 0 }, { id: 'armor', lvl: 0 }, { id: 'helmet', lvl: 0 }, { id: 'gloves', lvl: 0 }, { id: 'boots', lvl: 0 }, { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }], petLevel: 0, castleLevel: 0, walletAddress };
        await userRef.set({ ...resetData, chatId: uid, lastTitle: reqData.title || "훈련병", lastName: reqData.name || "유저" });
        return { success: true, userData: resetData };
    } else {
        await userRef.set({ chatId: uid, lastTitle: reqData.title || "훈련병", lastName: reqData.name || "유저", walletAddress }, { merge: true });
        return { success: true, userData: doc.data() };
    }
});

exports.syncBonusReward = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근');

    const amount = Number(reqData.amount);
    if (isNaN(amount) || amount <= 0 || amount > 20000000000) throw new functions.https.HttpsError('invalid-argument', '비정상적 보상 금액');

    const userRef = db.collection('users').doc(String(uid));
    let updateData = { balance: admin.firestore.FieldValue.increment(amount) };
    if (reqData.source === 'lottery' && reqData.slot) updateData.lastLotterySlot = reqData.slot;
    
    await userRef.update(updateData);
    return { success: true };
});

exports.syncAdAction = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근');

    const type = reqData.type; 
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
    
    const resetData = { balance: 50000, tickets: 3, adViewsLeft: 3, nextAdChargeTime: 0, nextBuffAdTime: 0, lastLotterySlot: "", lastClaimTime: Date.now(), lastActionTime: 0, gears: [{ id: 'sword', lvl: 0 }, { id: 'armor', lvl: 0 }, { id: 'helmet', lvl: 0 }, { id: 'gloves', lvl: 0 }, { id: 'boots', lvl: 0 }, { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }], petLevel: 0, castleLevel: 0 };
    await db.collection('users').doc(String(uid)).set(resetData, { merge: true });
    await db.collection('system').doc('economy').set({ burn: 0, pool: 0, jackpot: 0, lp: 0, reserve: 0 }, { merge: true });
    return { success: true, data: resetData };
});

exports.claimGOU = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근'); 
    
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
    
    // 🚨 결제 검증 (사령관님 실무지갑으로 잘 들어왔는지 확인)
    const isTxValid = await verifyTonTransaction(txHash, expectedTon);
    if (!isTxValid) throw new functions.https.HttpsError('invalid-argument', '검증 실패: 위조 영수증');
    
    return await db.runTransaction(async (t) => {
        const txRef = db.collection('transactions').doc(txHash); const txDoc = await t.get(txRef);
        if (txDoc.exists) throw new functions.https.HttpsError('already-exists', '사용된 영수증');
        const userRef = db.collection('users').doc(String(uid));
        t.set(txRef, { uid: uid, amount: amount, timestamp: Date.now() }); 
        t.update(userRef, { balance: admin.firestore.FieldValue.increment(amount) });
        return { success: true, addedAmount: amount };
    });
});

exports.checkChannelJoin = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId;
    const CHANNEL_ID = "-1002344755106"; 
    
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

// =====================================================================
// 📺 [애즈그램 전용 S2S 웹훅] 
// =====================================================================
exports.adsgramWebhook = functions.https.onRequest(async (req, res) => {
    const SECRET_KEY = "dlrl0309"; 
    const userId = req.query.userid;
    const type = req.query.type;
    const secret = req.query.secret;

    if (secret !== SECRET_KEY) return res.status(200).send("OK_TEST"); 
    if (!userId || userId === "[userId]") return res.status(200).send("OK_TEST");

    const userRef = db.collection('users').doc(String(userId));
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            let currentData = doc.exists ? doc.data() : {};
            if (type === 'ticket') {
                t.set(userRef, { tickets: (currentData.tickets || 0) + 1 }, { merge: true });
            } else if (type === 'buff') {
                t.set(userRef, { isAdActive: true, adTimeLeft: 3600, nextBuffAdTime: Date.now() + (3 * 3600000) }, { merge: true });
            }
        });
        res.status(200).send("OK");
    } catch (error) {
        console.error("웹훅 에러:", error);
        res.status(200).send("OK_ERROR_PASS"); 
    }
});


// =====================================================================
// 🚀 [작전 1] 마이닝풀 자동 출금 (DB 차감 + 실제 블록체인 송금)
// =====================================================================
exports.withdrawGOU = functions.https.onCall(async (data, context) => {
    let reqData = data || {}; if (reqData.data) reqData = reqData.data;
    const uid = reqData.userId || "test_commander_123";
    if (!verifyTelegramAuth(uid, reqData.initData)) throw new functions.https.HttpsError('unauthenticated', '비정상적 접근'); 
    const amount = Number(reqData.amount);
    if (isNaN(amount) || amount < 10000000) throw new functions.https.HttpsError('invalid-argument', '비정상적인 수량');
    
    return await db.runTransaction(async (t) => {
        const userRef = db.collection('users').doc(String(uid)); const sysRef = db.collection('system').doc('economy');
        const userDoc = await t.get(userRef); let userData = userDoc.exists ? userDoc.data() : {};
        let totalGearLevel = 0; (userData.gears || []).forEach(g => totalGearLevel += (g.lvl || 0));
        
        if (totalGearLevel < 140) throw new functions.https.HttpsError('permission-denied', '조건 미달');
        if ((userData.balance || 0) < amount) throw new functions.https.HttpsError('resource-exhausted', '잔고 부족');
        
        const fee = Math.floor(amount * 0.05); 
        const actualWithdraw = amount - fee;

        // DB 잔액 차감 및 소각비 기록
        t.update(userRef, { balance: admin.firestore.FieldValue.increment(-amount), lastActionTime: Date.now() });
        t.set(sysRef, { burn: admin.firestore.FieldValue.increment(fee) }, { merge: true });

        // 🚨 [블록체인 연동] 마이닝풀 지갑 -> 유저 지갑으로 TON 쏘기
        try {
            const poolMnemonic = process.env.MINING_POOL_MNEMONIC;
            if (poolMnemonic && userData.walletAddress) {
                const { key, contract } = await getWalletConfig(poolMnemonic);
                const seqno = await contract.getSeqno();
                
                await contract.sendTransfer({
                    seqno,
                    secretKey: key.secretKey,
                    messages: [
                        internal({
                            to: userData.walletAddress, // 👈 유저 지갑
                            value: actualWithdraw.toString(), 
                            body: "GOU Withdrawal", 
                        })
                    ]
                });
                console.log(`[출금 쐈음] UID: ${uid}, 수량: ${actualWithdraw}`);
            }
        } catch (error) {
            console.error("블록체인 송금 에러:", error);
        }

        return { success: true, withdrawn: actualWithdraw, feeBurned: fee };
    });
});

// =====================================================================
// 🚀 파이어베이스 스케줄러 (Cron Jobs) 불러오기
// =====================================================================
const { onSchedule } = require("firebase-functions/v2/scheduler");

// =====================================================================
// 🔥 [작전 2] 매일 자정 자동 소각 (DB 반영 + 실제 블랙홀 전송)
// =====================================================================
exports.dailySystemSettlement = onSchedule({
    schedule: "0 0 * * *",
    timeZone: "Asia/Seoul"
}, async (event) => {
    console.log("🔥 [자동 소각 작전] 가동 시작!");
    await db.runTransaction(async (t) => {
        const sysRef = db.collection('system').doc('economy');
        const doc = await t.get(sysRef);
        let d = doc.exists ? doc.data() : { burn: 0 };
        const pendingBurn = d.burn || 0;

        if (pendingBurn > 0) {
            // DB 기록 업데이트 (태워버린 양 누적)
            t.update(sysRef, { burn: 0, totalBurnedEver: admin.firestore.FieldValue.increment(pendingBurn) });

            // 🚨 [블록체인 연동] 실무지갑 -> 블랙홀로 쏘기
            try {
                const opMnemonic = process.env.OPERATIONAL_MNEMONIC;
                if (opMnemonic) {
                    const { key, contract } = await getWalletConfig(opMnemonic);
                    const seqno = await contract.getSeqno();
                    
                    await contract.sendTransfer({
                        seqno,
                        secretKey: key.secretKey,
                        messages: [
                            internal({
                                to: BURN_ADDRESS,
                                value: pendingBurn.toString(),
                                body: "Daily Auto Burn 🔥",
                            })
                        ]
                    });
                    console.log(`🔥 완벽 소각 쐈음: ${pendingBurn}`);
                }
            } catch (error) {
                console.error("블록체인 소각 전송 실패:", error);
            }
        }
    });
});

// =====================================================================
// 🏆 [작전 3] 매주 월요일 자정 잭팟 시즌 보상 & 예비운영비 정산
// =====================================================================
exports.weeklyJackpotSettlement = onSchedule({
    schedule: "0 0 * * 1",
    timeZone: "Asia/Seoul"
}, async (event) => {
    console.log("🏆 [주간 정산 작전] 잭팟 및 예비운영비 가동 시작!");
    
    // DB에서 자금 확인
    const sysRef = db.collection('system').doc('economy');
    const sysDoc = await sysRef.get();
    const sysData = sysDoc.exists ? sysDoc.data() : {};
    
    const jackpot = sysData.jackpot || 0;
    const reserve = sysData.reserve || 0;

    if (jackpot <= 0 && reserve <= 0) {
        console.log("정산할 자금이 없습니다. 작전 종료.");
        return;
    }

    // 1. 유저 필터링 (캐슬 50렙 이상 잭팟 대상자)
    let eligibleUsers = [];
    if (jackpot > 0) {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => { 
            if (doc.data().castleLevel >= 50 && doc.data().walletAddress) {
                eligibleUsers.push({ id: doc.id, wallet: doc.data().walletAddress }); 
            }
        });
    }

    // 2. DB 장부 초기화 및 유저 잔액 업데이트
    const batch = db.batch();
    let splitAmount = 0;
    if (jackpot > 0 && eligibleUsers.length > 0) {
        splitAmount = Math.floor(jackpot / eligibleUsers.length);
        eligibleUsers.forEach(u => {
            batch.update(db.collection('users').doc(u.id), { balance: admin.firestore.FieldValue.increment(splitAmount) });
        });
    }
    
    // 장부에서 잭팟과 예비운영비 비우기 (누적 기록은 남김)
    batch.update(sysRef, { 
        jackpot: 0, 
        reserve: 0,
        totalReserveEver: admin.firestore.FieldValue.increment(reserve) 
    });
    await batch.commit();

    // 3. 🚨 [블록체인 연동] 실무지갑 -> 대상자 및 예비운영비 지갑 쏘기
    try {
        const opMnemonic = process.env.OPERATIONAL_MNEMONIC;
        if (opMnemonic) {
            const { key, contract } = await getWalletConfig(opMnemonic);
            let seqno = await contract.getSeqno();

            // A. 잭팟 보상 다중 전송
            if (jackpot > 0 && eligibleUsers.length > 0) {
                for (const u of eligibleUsers) {
                    await contract.sendTransfer({
                        seqno,
                        secretKey: key.secretKey,
                        messages: [
                            internal({
                                to: u.wallet,
                                value: splitAmount.toString(),
                                body: "Season Reward 🏆",
                            })
                        ]
                    });
                    // 트랜잭션 꼬임 방지를 위한 10초 대기
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    seqno++; 
                }
                console.log(`🏆 잭팟 보상 전송 완료! (총 ${eligibleUsers.length}명)`);
            }

            // B. 사령관님 예비운영비 전송
            if (reserve > 0 && RESERVE_WALLET_ADDRESS && RESERVE_WALLET_ADDRESS.startsWith("EQ")) {
                await contract.sendTransfer({
                    seqno,
                    secretKey: key.secretKey,
                    messages: [
                        internal({
                            to: RESERVE_WALLET_ADDRESS,
                            value: reserve.toString(),
                            body: "Weekly Reserve Fund 💼",
                        })
                    ]
                });
                console.log(`💼 예비운영비 정산 전송 완료: ${reserve}`);
            }
        }
    } catch (error) {
        console.error("주간 보상/정산 블록체인 전송 실패:", error);
    }
});