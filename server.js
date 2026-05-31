// God of Upgrade: Core Economic Engine
const express = require('express');
const app = express();

// 1. 경제 분배 엔진 (핵심)
function processFailedUpgrade(cost) {
    const data = {
        burn: cost * 0.40,          // 40% 소각
        rewardPool: cost * 0.40,    // 40% 보상풀
        lp: cost * 0.10,            // 10% 유동성 공급(LP)
        jackpot: cost * 0.05,       // 5% 잭팟
        reserve: cost * 0.05        // 5% 예비비
    };
    console.log(`[Economic Engine] 분배 완료:`, data);
    return data;
}

// 2. 강화 비용 계산 엔진 (기하급수적 상승)
function getUpgradeCost(level, type) {
    let base = (type === 'pet') ? 100 : 1000;
    
    // 구간별 Base 비용 설정
    if (level > 10) base *= 10;
    if (level > 20) base *= 10;
    if (level > 30) base *= 10;
    if (level > 40) base *= 10;

    let step = (level - 1) % 10;
    return base + (step * (base * 0.1));
}

// 3. 펫 보너스 엔진
function getPetBonus(level) {
    let base = 100; // 기본 100%
    let perLevel = level * 2;
    let breakthrough = (level >= 10 ? 10 : 0) + 
                       (level >= 20 ? 20 : 0) + 
                       (level >= 30 ? 50 : 0) + 
                       (level >= 40 ? 100 : 0) + 
                       (level >= 50 ? 300 : 0);
    return base + perLevel + breakthrough;
}

app.listen(3000, () => console.log('God of Upgrade Engine is running on port 3000'));