// God of Upgrade: Core Economic Engine (React 호환 버전)
const express = require('express');
const path = require('path');
const app = express();

// ★★★ React 연동용 안내판 설정 ★★★
// 1. React 코드가 압축된 'build' 폴더를 방문자에게 화면으로 띄웁니다.
app.use(express.static(path.join(__dirname, 'build')));

// 2. 어떤 주소로 들어오든 무조건 게임 화면(index.html)을 보여주도록 강제합니다.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
// ★★★ 여기까지 ★★★


// 1. 경제 분배 엔진 (핵심)
function processFailedUpgrade(cost) {
    const data = {
        burn: cost * 0.50,          // 50% 소각
        rewardPool: cost * 0.30,    // 30% 보상풀
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

// Render 호환용 포트 설정
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`God of Upgrade Engine is running on port ${port}`));
