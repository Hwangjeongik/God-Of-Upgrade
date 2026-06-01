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