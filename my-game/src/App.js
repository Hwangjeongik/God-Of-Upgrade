import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { app } from './firebase'; // 🚨 export 된 파이어베이스 app 엔진 연동

const MAX_SUPPLY = 10000000000; 
const HALVING_BURN_THRESHOLD = MAX_SUPPLY * 0.2; 

export default function App() {
  // ==========================================
  // 1. 사냥터 데이터 (원본 100% 복구)
  // ==========================================
  const hunts = useMemo(() => [
    {name: '초원', mult: 1, req: {atk:0, hp:0, def:0, acc:0, sum:0}},
    {name: '숲', mult: 1.5, req: {atk:50, hp:500, def:25, acc:10, sum:25}},
    {name: '사막', mult: 2.5, req: {atk:100, hp:1000, def:50, acc:20, sum:55}},
    {name: '정글', mult: 5, req: {atk:170, hp:1700, def:75, acc:34, sum:90}},
    {name: '화산', mult: 12, req: {atk:230, hp:2300, def:115, acc:46, sum:125}}
  ], []);

  // ==========================================
  // 2. 사령관님의 위대한 자산 및 스탯 상태 (어제 데이터 100% 복구)
  // ==========================================
  const [state, setState] = useState({ 
    screen: 'wallet', // 지갑 연결 전 화면 보호막
    walletAddress: '',
    balance: 50000000000, // 500억 잔고 복구
    burned: 1999000000, 
    jackpot: 50000000, 
    lp: 0, 
    pool: 5000000000, 
    reserve: 0,
    mintedGOU: 2999000000, 
    currentHunt: '초원', 
    autoTimers: {},
    userName: "사령관", 
    userTitle: "견습 기사",
    isRankingOpen: false,
    showTitleInput: false,
    
    petActive: true, // 황금 드래곤 즉시 활성화
    petLevel: 49, // 49레벨 복구
    petName: "고대 황금 드래곤",
    petHuntEndTime: 0, 
    
    castleActive: false, 
    castleLevel: 0, 
    castleName: "위대한 군주의 성",
    castleHuntEndTime: 0, 

    lastJackpotDate: null 
  });

  // 🚨 장비 레벨 ALL 30강 무기고 완벽 복구
  const [gears, setGears] = useState([
    {id: 'weapon', name: '성검 엑스칼리버', lvl: 30, stat: '공격력', base: 10, unit: '', imgFile: 'weapon.png', emoji: '⚔️'},
    {id: 'helmet', name: '사자왕의 투구', lvl: 30, stat: '체력', base: 100, unit: '', imgFile: 'helmet.png', emoji: '🪖'},
    {id: 'armor', name: '성기사의 갑옷', lvl: 30, stat: '방어력', base: 5, unit: '', imgFile: 'armor.png', emoji: '👕'},
    {id: 'gloves', name: '용기사의 장갑', lvl: 30, stat: '명중률', base: 2, unit: '', imgFile: 'gloves.png', emoji: '🧤'},
    {id: 'shoes', name: '바람의 장화', lvl: 30, stat: 'GOU 획득량', base: 5, unit: '%', imgFile: 'shoes.png', emoji: '👢'},
    {id: 'necklace', name: '현자의 목걸이', lvl: 30, stat: '강화비용감소', base: 0.5, unit: '%', imgFile: 'necklace.png', emoji: '📿'},
    {id: 'ring', name: '행운의 반지', lvl: 30, stat: '강화성공확률', base: 0.1, unit: '%', imgFile: 'ring.png', emoji: '💍'}
  ]);

  const [anims, setAnims] = useState({});
  const wallet = useTonWallet();

  // ==========================================
  // 3. 전투력 및 보너스 실시간 계산 스케줄러
  // ==========================================
  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => {
      setAnims(prev => ({ ...prev, [id]: null }));
    }, 500);
  }, []);

  const minLvl = Math.min(...gears.map(g => g.lvl));
  const setBonus = minLvl >= 30 ? 1000 : minLvl >= 20 ? 300 : minLvl >= 10 ? 100 : 0;

  const currentStats = useMemo(() => ({
    atk: gears[0].lvl * gears[0].base,
    hp: gears[1].lvl * gears[1].base,
    def: gears[2].lvl * gears[2].base,
    acc: gears[3].lvl * gears[3].base,
    sum: gears.reduce((a, b) => a + b.lvl, 0)
  }), [gears]);

  const getPetBonus = useCallback((lvl) => {
    let b = 100 + (lvl * 2);
    if (lvl >= 10) b += 30; if (lvl >= 20) b += 50; if (lvl >= 30) b += 100;
    if (lvl >= 40) b += 200; if (lvl >= 50) b += 500;
    return b;
  }, []);

  const getCastleBonus = useCallback((lvl) => {
    let b = 200 + (lvl * 5);
    if (lvl >= 10) b += 50; if (lvl >= 20) b += 100; if (lvl >= 30) b += 200;
    if (lvl >= 40) b += 500; if (lvl >= 50) b += 1500;
    return b;
  }, []);

  const petBonus = state.petActive ? getPetBonus(state.petLevel) : 0;
  const castleBonus = state.castleActive ? getCastleBonus(state.castleLevel) : 0;
  const totalBonusPct = (gears[4].lvl * 5) + setBonus + petBonus + castleBonus;

  const isHalving = state.burned >= HALVING_BURN_THRESHOLD;
  const halvingMult = isHalving ? 0.5 : 1.0;
  
  const failRates = useMemo(() => ({
    pool: 0.40, burn: isHalving ? 0.27 : 0.30, jackpot: isHalving ? 0.15 : 0.10,
    lp: isHalving ? 0.13 : 0.15, reserve: 0.05
  }), [isHalving]);

  const distributeFailure = useCallback((cost) => {
    return {
      pool: cost * failRates.pool, burn: cost * failRates.burn,
      jackpot: cost * failRates.jackpot, lp: cost * failRates.lp, reserve: cost * failRates.reserve
    };
  }, [failRates]);

  const getCost = useCallback((lvl, nLvl) => {
    const baseCost = (lvl < 10 ? 1000 : lvl < 20 ? 10000 : 100000) + ((lvl % 10) * 100);
    return Math.floor(baseCost * (1 - (nLvl * 0.005)) * halvingMult);
  }, [halvingMult]);

  const getPetCost = useCallback((lvl, necklaceLvl) => {
    let cost = (lvl < 9 ? 100 + (lvl * 10) : lvl < 19 ? 1000 + ((lvl % 10) * 100) : lvl < 29 ? 10000 + ((lvl % 10) * 1000) : lvl < 39 ? 100000 + ((lvl % 10) * 10000) : 1000000 + ((lvl % 10) * 100000));
    return Math.floor(cost * (1 - (necklaceLvl * 0.005)) * halvingMult);
  }, [halvingMult]);

  const getCastleCost = useCallback((lvl, necklaceLvl) => {
    let cost = (lvl < 9 ? 1000 + (lvl * 100) : lvl < 19 ? 10000 + ((lvl % 10) * 1000) : lvl < 29 ? 100000 + ((lvl % 10) * 10000) : lvl < 39 ? 1000000 + ((lvl % 10) * 100000) : 10000000 + ((lvl % 10) * 1000000));
    return Math.floor(cost * (1 - (necklaceLvl * 0.005)) * halvingMult);
  }, [halvingMult]);

  const getRate = useCallback((lvl, rLvl) => {
    return Math.min(0.99, ((lvl < 5 ? 1.0 : lvl < 10 ? 0.7 : lvl < 15 ? 0.6 : lvl < 20 ? 0.5 : [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20]) + (rLvl * 0.001)));
  }, []);

  const getPetRate = useCallback((lvl, ringLvl) => {
    let baseRate = (lvl < 5 ? 1.0 : lvl < 10 ? 0.7 : lvl < 15 ? 0.65 : lvl < 20 ? 0.6 : lvl < 25 ? 0.55 : lvl < 30 ? 0.5 : lvl < 35 ? 0.45 : lvl < 40 ? 0.4 : [0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][lvl - 41] || 0.1);
    return Math.min(0.99, baseRate + (ringLvl * 0.001));
  }, []);

  const checkHunt = useCallback((stats, currentNow) => {
    if (state.castleHuntEndTime > currentNow) return { name: '🏰 제국의 심장', mult: 50 };
    if (state.petHuntEndTime > currentNow) return { name: '🐉 신수의 둥지', mult: 30 };
    return hunts.slice().reverse().find(h => 
      stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum
    ) || hunts[0];
  }, [hunts, state.castleHuntEndTime, state.petHuntEndTime]);

  const currentHuntData = checkHunt(currentStats, Date.now());
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * halvingMult);

  // ==========================================
  // 4. 지갑 감지 및 파이어베이스 통신 게이트웨이
  // ==========================================
  useEffect(() => {
    if (wallet) {
      const address = wallet.account.address;
      setState(s => ({
        ...s,
        walletAddress: address.substring(0, 6) + '...' + address.substring(address.length - 4),
        screen: 'game'
      }));
    } else {
      setState(s => ({ ...s, screen: 'wallet' }));
    }
  }, [wallet]);

  const getUserId = () => {
    const tg = window.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : "test_commander_123";
  };

  // 수동 수확 및 서버 동기화
  const claimGOU = async () => {
    const functions = getFunctions(app);
    const claimFunction = httpsCallable(functions, 'claimGOU');
    try {
      const result = await claimFunction({ userId: getUserId(), currentMultiplier: currentHuntData.mult });
      const data = result.data;
      if (data.success) {
        setState(s => ({ ...s, balance: s.balance + data.harvestedAmount }));
        triggerAnim('claim', 'success');
        alert(`🎉 ${data.message}`);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("수확 통신 실패:", error);
      alert(`서버 수확 실패: ${error.message}`);
    }
  };

  // 강화 액션 및 백엔드 원격 타격
  const handleUpgrade = async (type, id = null) => {
    const functions = getFunctions(app);
    const upgradeFunction = httpsCallable(functions, 'upgradeItem');
    try {
      const result = await upgradeFunction({ userId: getUserId(), type, id });
      const data = result.data;

      if (data.success) {
        triggerAnim(id || type, 'success');
        if (data.unlockMessage) alert(data.unlockMessage);
        
        setState(s => ({ ...s, balance: Math.max(0, s.balance - data.cost) }));
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: g.lvl + 1 } : g));
        else if (type === 'pet') setState(s => ({ ...s, petLevel: s.petLevel + 1 }));
        else if (type === 'castle') setState(s => ({ ...s, castleLevel: s.castleLevel + 1 }));
      } else {
        triggerAnim(id || type, 'fail');
        setState(s => ({ ...s, balance: Math.max(0, s.balance - data.cost) }));
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: Math.max(0, g.lvl - 1) } : g));
        else if (type === 'pet') setState(s => ({ ...s, petLevel: Math.max(0, s.petLevel - 1) }));
        else if (type === 'castle') setState(s => ({ ...s, castleLevel: Math.max(0, s.castleLevel - 1) }));
      }
    } catch (error) {
      console.error("강화 통신 실패:", error);
      alert(`서버 강화 실패: ${error.message}`);
    }
  };

  const toggleAuto = (type, id = null) => {
    const timerKey = id || type;
    setState(s => {
      const newAuto = { ...s.autoTimers };
      if (newAuto[timerKey]) {
        clearInterval(newAuto[timerKey]);
        delete newAuto[timerKey];
      } else {
        newAuto[timerKey] = setInterval(() => handleUpgrade(type, id), 2000);
      }
      return { ...s, autoTimers: newAuto };
    });
  };

  // ==========================================
  // 5. 1초당 영지 방치형 골드 자동 생성 루프 (완벽 복원)
  // ==========================================
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); 
      if (tg.initDataUnsafe?.user?.first_name) {
        setState(s => ({ ...s, userName: tg.initDataUnsafe.user.first_name }));
      }
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const best = checkHunt(currentStats, now);
      const gain = (300000 * best.mult * (1 + totalBonusPct / 100)) / 86400 * halvingMult;
      
      setState(s => {
        const shouldUnlockPet = minLvl >= 30 && !s.petActive;
        const shouldTriggerGod = minLvl >= 30 && s.userTitle === "초보자";
        return { 
          ...s, 
          currentHunt: best.name, 
          balance: s.balance + gain, 
          mintedGOU: s.mintedGOU + gain,
          petActive: s.petActive || shouldUnlockPet, 
          userTitle: shouldTriggerGod ? "GOD" : s.userTitle,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStats, totalBonusPct, checkHunt, minLvl, halvingMult]);

  // 기타 원본 UI 편의 로직
  const handleDEXClick = () => alert("💱 GOU/TON DEX 스왑 거래소\n\n현재 유동성 풀 구축 진행 중입니다.");
  const processJackpot = () => alert(`[시즌 보상 정산]\n현재 최소 장비 레벨: +${minLvl}강\n정식 정산 기간에 활성화됩니다.`);

  // ==========================================
  // 6. UI 렌더링 파트 (사령관님의 어제 UI 격자 100% 복원)
  // ==========================================
  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.7), rgba(26, 15, 20, 0.9)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <h1 style={{ color: '#fbbf24', fontSize: '32px', textShadow: '0 0 10px rgba(251,191,36,0.5)', fontFamily: "'Cinzel', serif" }}>GOD OF UPGRADE</h1>
        <p style={{ margin: '10px 0 30px 0', color: '#aaa', textAlign: 'center', fontSize: '13px', lineHeight: '1.6' }}>TON 지갑을 연결하여 영지를 활성화하십시오.</p>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px' }}><TonConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="main-wrap" style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.4), rgba(26, 15, 20, 0.5)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      color: '#e6d5b8', padding: '30px 20px', minHeight: '100vh', fontFamily: "'Cinzel', serif", display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes breathing { 0% { box-shadow: 0 0 5px #fbbf24; } 50% { box-shadow: 0 0 20px #fbbf24, inset 0 0 10px #fbbf24; } 100% { box-shadow: 0 0 5px #fbbf24; } }
        @keyframes flashSuccess { 0% { background: rgba(251, 191, 36, 0.4); } 100% { background: rgba(20, 20, 25, 0.4); } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.4); } 100% { background: rgba(20, 20, 25, 0.4); } }
        @keyframes pulseLvl { 0% { color: #fbbf24; } 50% { color: #fff; text-shadow: 0 0 10px #fff; } 100% { color: #fbbf24; } }
        
        .animated-entry { animation: slideUp 0.6s ease-out forwards; }
        .hunt-active { animation: breathing 2s infinite ease-in-out; border-color: #fbbf24 !important; background: rgba(251, 191, 36, 0.15) !important; }
        .anim-success { animation: flashSuccess 0.5s ease-out; }
        .anim-fail { animation: flashFail 0.4s ease-out; }
        .lvl-up { animation: pulseLvl 0.5s ease-out; display: inline-block; }
        
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
        .btn-auto-on { background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid #06b6d4; }
        .glass-panel { background: rgba(20, 20, 25, 0.4); backdrop-filter: blur(15px); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; }
        .glass-panel-unlocked { background: rgba(6, 182, 212, 0.05); backdrop-filter: blur(15px); border: 1px solid rgba(6, 182, 212, 0.4); }

        .dash-panel { padding: 30px; margin-bottom: 25px; }
        .treasury-title { font-size: 28px; margin: 20px 0 25px 0; }
        .balance-text { font-size: 52px; margin-bottom: 30px; }
        .grid-hunts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 30px; width: 100%; max-width: 850px; }
        .hunt-box { padding: 20px 15px; min-height: 160px; }

        .grid-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .grid-stats > div { padding: 18px; border-radius: 10px; text-align: center; display: flex; flex-direction: column; justify-content: center; }

        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; }
        .gear-card { padding: 15px; border-top: 4px solid #555; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .img-box-gear { width: 65px; height: 65px; background: rgba(0,0,0,0.3); border: 1px solid rgba(197,160,89,0.3); border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 30px; }
        
        .pet-card-inner { display: flex; align-items: center; gap: 30px; padding: 35px; }
        .img-box-special { width: 120px; height: 120px; font-size: 60px; }

        @media (max-width: 768px) {
          .main-wrap { padding: 10px 5px !important; }
          .dash-panel { padding: 15px 10px !important; margin-bottom: 15px !important; }
          .balance-text { font-size: 32px !important; margin-bottom: 20px !important; }
          .grid-stats { gap: 10px !important; }
          .grid-stats > div { padding: 12px !important; }
          .season-wide-panel { flex-direction: column !important; text-align: center !important; gap: 12px !important; padding: 15px 12px !important; }
          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; margin-bottom: 15px !important; }
          .hunt-box { padding: 10px !important; min-height: 100px !important; }
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .pet-card-inner { flex-direction: row !important; gap: 15px !important; padding: 15px !important; flex-wrap: wrap; }
          .img-box-special { width: 65px !important; height: 65px !important; font-size: 30px !important; }
        }
      `}</style>

      <button onClick={() => setState(s => ({...s, isRankingOpen: true}))} style={{ position: 'fixed', top: '15px', right: '15px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.5)', padding: '8px 16px', borderRadius: '8px', zIndex: 100, fontWeight: 'bold' }}>
        🏆 RANK
      </button>

      {/* 📊 메인 국고 대시보드 */}
      <div className={`animated-entry glass-panel dash-panel ${anims['claim'] ? 'anim-success' : ''}`} style={{ width: '100%', maxWidth: '850px', position: 'relative' }}>
        <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' }}>[{state.userTitle}] {state.userName}</div>
        <h2 className="treasury-title" style={{ color: '#e6d5b8', textAlign: 'center', letterSpacing: '2px' }}>TREASURY</h2>
        <div className="balance-text" style={{ textAlign: 'center', fontWeight: 'bold', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
          {Math.floor(state.balance).toLocaleString()} <span style={{color: '#c5a059', fontWeight: 'normal'}}>GOU</span>
        </div>
        
        <div className="grid-stats">
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
            <div style={{ color: '#06b6d4', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>📈 일일 획득량</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>+{dailyGainDisplay.toLocaleString()}</div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>🔥 누적 소각</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>{Math.floor(state.burned).toLocaleString()}</div>
          </div>
          <div style={{ background: 'rgba(197,160,89,0.1)', border: '1px solid rgba(197,160,89,0.3)' }}>
            <div style={{ color: '#c5a059', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>⚔️ 통합 보너스</div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>+{totalBonusPct}%</div>
          </div>
          <div onClick={handleDEXClick} style={{ background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.5)', cursor: 'pointer' }}>
            <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>💱 DEX 거래소</div>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>바로가기 ➡️</div>
          </div>
        </div>

        {/* 시즌 종료 정산 보상 바 패널 */}
        <div className="season-wide-panel" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '12px', padding: '16px 20px', marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>🏆 시즌 종료 정산 보상</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '24px', margin: '2px 0' }}>{Math.floor(state.jackpot).toLocaleString()} GOU</div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: minLvl >= 30 ? '#06b6d4' : '#ef4444' }}>
              {minLvl >= 30 ? "✅ 즉시 수령 권한 획득 완료!" : `❌ 수령 조건 미달 (ALL +30강 필요 / 현재 최소: +${minLvl}강)`}
            </div>
          </div>
          <button onClick={processJackpot} style={{ background: '#fbbf24', color: '#000', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 15px rgba(251,191,36,0.4)' }}>정산 수령 ⚡</button>
        </div>

        <button onClick={claimGOU} style={{ width: '100%', background: 'linear-gradient(to right, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 0', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', boxShadow: '0 0 10px rgba(59,130,246,0.4)' }}>
          🚀 영지 수확 실시간 서버 동기화
        </button>
      </div>

      {/* 🗺️ 사냥터 격자 시스템 */}
      <div className="animated-entry grid-hunts">
        {hunts.map(h => {
          const isActive = state.currentHunt === h.name;
          const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.req.sum;
          return (
            <div key={h.name} className={`hunt-box ${isActive ? "hunt-active" : (isUnlocked ? "glass-panel-unlocked" : "glass-panel")}`} style={{ borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <b style={{ display: 'block', color: isActive ? '#fbbf24' : (isUnlocked ? '#fff' : '#888'), textAlign: 'center', fontSize: '13px' }}>
                {isActive ? '⚔️ ' : (isUnlocked ? '🔓 ' : '🔒 ')}{h.name}
              </b>
              {h.name !== '초원' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: '#e6d5b8', background: 'rgba(0, 0, 0, 0.6)', padding: '6px', borderRadius: '6px', fontSize: '10px' }}>
                  <div>공 <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444'}}>{h.req.atk}</span></div>
                  <div>체 <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444'}}>{h.req.hp}</span></div>
                  <div>방 <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444'}}>{h.req.def}</span></div>
                  <div>명 <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444'}}>{h.req.acc}</span></div>
                </div>
              )}
              <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', fontSize: '11px' }}>
                <div style={{ color: currentStats.sum >= h.req.sum ? '#06b6d4' : '#ef4444', fontWeight: 'bold' }}>총합 {h.req.sum}</div>
                <div style={{ color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', marginTop: '2px' }}>수익 X{h.mult}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ⚔️ 장비 무기고 (그리드 바둑판) */}
      <div className="gears-grid">
        {gears.map((g, index) => {
          const isMax = g.lvl >= 30;
          return (
            <div key={g.id} className={`animated-entry glass-panel gear-card ${anims[g.id] ? `anim-${anims[g.id]}` : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="img-box-gear">
                <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt={g.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = g.emoji; }}/>
              </div>
              <div style={{ fontSize: '12px', color: '#c5a059', fontWeight: 'bold' }}>[{g.stat}: {(g.lvl * g.base).toFixed(1)}{g.unit}]</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0', color: '#e6d5b8' }}>
                {g.name} <span className={anims[g.id] === 'success' ? 'lvl-up' : ''} style={{ color: '#fbbf24' }}>+{g.lvl}</span>
              </div>
              <div style={{ color: '#aaa', fontSize: '11px' }}>
                성공: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%`}</span><br/>
                비용: {isMax ? 'MAX' : getCost(g.lvl, gears[5].lvl).toLocaleString()}
              </div>
              <div style={{ display: 'flex', width: '100%', gap: '6px', marginTop: '10px' }}>
                <button onClick={() => handleUpgrade('gear', g.id)} disabled={isMax} className="btn-neon" style={{ flex: 1, padding: '8px 0', fontSize: '12px' }}>강화</button>
                <button onClick={() => toggleAuto('gear', g.id)} disabled={isMax} className={`btn-neon ${state.autoTimers[g.id] ? 'btn-auto-on' : ''}`} style={{ flex: 1, padding: '8px 0', fontSize: '12px' }}>
                  {state.autoTimers[g.id] ? 'STOP' : 'AUTO'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🐉 동료 및 영지 패널 */}
      {['pet', 'castle'].map(type => {
        const isPet = type === 'pet';
        const isActive = isPet ? state.petActive : state.castleActive;
        const lvl = isPet ? state.petLevel : state.castleLevel;
        const name = isPet ? state.petName : state.castleName;
        const isMax = lvl >= 50;

        return (
          <div key={type} className={`animated-entry glass-panel ${anims[type] ? `anim-${anims[type]}` : ''}`} style={{ position: 'relative', width: '100%', maxWidth: '850px', margin: '15px 0', borderRadius: '15px', overflow: 'hidden' }}>
            {!isActive && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(10px)', background: 'rgba(11, 15, 25, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 'bold', padding: '12px', border: '1px solid #fbbf24', borderRadius: '8px', background: 'rgba(0,0,0,0.6)' }}>
                  🔒 {isPet ? '장비 ALL 30강 달성 시 개방' : '펫 50강 달성 시 개방'}
                </div>
              </div>
            )}
            <div className="pet-card-inner" style={{ opacity: isActive ? 1 : 0.4 }}>
              <div className="img-box-special" style={{ background: isPet ? 'linear-gradient(135deg, rgba(26,11,46,0.5) 0%, rgba(59,7,100,0.5) 100%)' : 'linear-gradient(135deg, rgba(46,26,11,0.5) 0%, rgba(100,20,7,0.5) 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(251,191,36,0.5)' }}>
                {isPet ? '🐉' : '🏰'}
              </div>
              <div style={{ flex: 1, width: '100%' }}>
                <h3 style={{ color: '#fbbf24', fontWeight: 'bold', margin: '0 0 5px 0', fontSize: '20px' }}>
                  {name} <span className={anims[type] === 'success' ? 'lvl-up' : ''} style={{ color: '#e6d5b8', fontSize: '70%' }}>Lv.{lvl}</span>
                </h3>
                <p style={{ color: '#e6d5b8', fontSize: '13px', margin: '0 0 10px 0' }}>
                  GOU 획득량 <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>+{isPet ? getPetBonus(lvl) : getCastleBonus(lvl)}%</span>
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleUpgrade(type)} disabled={!isActive || isMax} className="btn-neon" style={{ background: 'rgba(123, 24, 24, 0.5)', color: '#fff', flex: 1 }}>강화</button>
                  <button onClick={() => toggleAuto(type)} disabled={!isActive || isMax} className={`btn-neon ${state.autoTimers[type] ? 'btn-auto-on' : ''}`} style={{ flex: 1 }}>{state.autoTimers[type] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 🏆 랭킹 모달 */}
      {state.isRankingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animated-entry" style={{ background: 'rgba(20,20,25,0.9)', border: '1px solid #fbbf24', padding: '30px 20px', borderRadius: '15px', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', marginBottom: '20px' }}>RANKING</h2>
            <div style={{ color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>시즌 종료 후 업데이트 됩니다.</div>
            <button onClick={() => setState(s => ({...s, isRankingOpen: false}))} className="btn-neon" style={{ width: '100%', color: '#888', borderColor: '#555' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}