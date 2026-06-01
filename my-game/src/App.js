import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { app } from './firebase'; 

const MAX_SUPPLY = 10000000000; 
const HALVING_BURN_THRESHOLD = MAX_SUPPLY * 0.2; 

export default function App() {
  // ==========================================
  // 1. 사냥터 영토 데이터
  // ==========================================
  const hunts = useMemo(() => [
    {name: '초원 영지', mult: 1, req: {atk:0, hp:0, def:0, acc:0, sum:0}},
    {name: '신의 숲', mult: 1.5, req: {atk:50, hp:500, def:25, acc:10, sum:25}},
    {name: '불멸 사막', mult: 2.5, req: {atk:100, hp:1000, def:50, acc:20, sum:55}},
    {name: '심연 정글', mult: 5, req: {atk:170, hp:1700, def:75, acc:34, sum:90}},
    {name: '황혼 화산', mult: 12, req: {atk:230, hp:2300, def:115, acc:46, sum:125}}
  ], []);

  // ==========================================
  // 2. 사령관 자산 상태 (500억 잔고 및 49렙 드래곤)
  // ==========================================
  const [state, setState] = useState({ 
    screen: 'wallet', 
    walletAddress: '',
    balance: 50000000000, 
    burned: 1999000000, 
    jackpot: 50000000, 
    lp: 0, 
    pool: 5000000000, 
    reserve: 0,
    mintedGOU: 2999000000, 
    currentHunt: '초원 영지', 
    autoTimers: {},
    userName: "사령관", 
    userTitle: "견습 기사",
    isRankingOpen: false,
    
    petActive: true, 
    petLevel: 49, 
    petName: "고대 황금 드래곤",
    petHuntEndTime: 0, 
    
    castleActive: false, 
    castleLevel: 0, 
    castleName: "위대한 군주의 성",
    castleHuntEndTime: 0,

    isAdActive: false,
    adTimeLeft: 0
  });

  // 🚨 [수정 완료] 사령관님 오리지널 7부위 체제 완벽 복구 (방패 삭제)
  const [gears, setGears] = useState([
    {id: 'sword', name: '성검 엑스칼리버', lvl: 30, stat: '공격력', base: 10, unit: '', imgFile: 'weapon.png', emoji: '⚔️'}, // 0
    {id: 'armor', name: '성기사의 갑옷', lvl: 30, stat: '체력', base: 100, unit: '', imgFile: 'armor.png', emoji: '👕'}, // 1
    {id: 'helmet', name: '사자왕의 투구', lvl: 30, stat: '방어력', base: 5, unit: '', imgFile: 'helmet.png', emoji: '🪖'}, // 2
    {id: 'gloves', name: '용기사의 장갑', lvl: 30, stat: '명중률', base: 2, unit: '', imgFile: 'gloves.png', emoji: '🧤'}, // 3
    {id: 'boots', name: '바람의 장화', lvl: 30, stat: 'GOU 획득량', base: 5, unit: '%', imgFile: 'shoes.png', emoji: '👢'}, // 4
    {id: 'necklace', name: '현자의 목걸이', lvl: 30, stat: '강화비용감소', base: 0.5, unit: '%', imgFile: 'necklace.png', emoji: '📿'}, // 5
    {id: 'ring', name: '행운의 반지', lvl: 30, stat: '강화성공확률', base: 0.1, unit: '%', imgFile: 'ring.png', emoji: '💍'} // 6
  ]);

  const [anims, setAnims] = useState({});
  const wallet = useTonWallet();

  // ==========================================
  // 3. 스탯 및 통합 보너스 실시간 명세 (7부위 맞춰 연산 최적화)
  // ==========================================
  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => setAnims(prev => ({ ...prev, [id]: null })), 500);
  }, []);

  const minLvl = Math.min(...gears.map(g => g.lvl));
  const setBonus = minLvl >= 30 ? 1000 : minLvl >= 20 ? 300 : minLvl >= 10 ? 100 : 0;

  const currentStats = useMemo(() => ({
    atk: gears[0].lvl * gears[0].base, // sword
    hp: gears[1].lvl * gears[1].base, // armor
    def: gears[2].lvl * gears[2].base, // helmet
    acc: gears[3].lvl * gears[3].base, // gloves
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
  
  // 🚨 장화(인덱스 4) 능력치로 보너스 획득 연산
  const totalBonusPct = (gears[4].lvl * gears[4].base) + setBonus + petBonus + castleBonus;

  const isHalving = state.burned >= HALVING_BURN_THRESHOLD;
  const halvingMult = isHalving ? 0.5 : 1.0;
  const adMultiplier = state.isAdActive ? 2.0 : 1.0;

  const getCost = useCallback((lvl, nLvl) => {
    const baseCost = (lvl < 10 ? 1000 : lvl < 20 ? 10000 : 100000) + ((lvl % 10) * 100);
    return Math.floor(baseCost * (1 - (nLvl * 0.005)) * halvingMult);
  }, [halvingMult]);

  const getRate = useCallback((lvl, rLvl) => {
    return Math.min(0.99, ((lvl < 5 ? 1.0 : lvl < 10 ? 0.7 : lvl < 15 ? 0.6 : lvl < 20 ? 0.5 : [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20]) + (rLvl * 0.001)));
  }, []);

  const checkHunt = useCallback((stats) => {
    return hunts.slice().reverse().find(h => 
      stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum
    ) || hunts[0];
  }, [hunts]);

  const currentHuntData = checkHunt(currentStats);
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * halvingMult * adMultiplier);

  // ==========================================
  // 4. 지갑 연동 및 서버 통신 인터페이스
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

  const claimGOU = async () => {
    const functions = getFunctions(app);
    const claimFunction = httpsCallable(functions, 'claimGOU');
    try {
      const result = await claimFunction({ userId: getUserId(), currentMultiplier: currentHuntData.mult * adMultiplier });
      const data = result.data;
      if (data.success) {
        setState(s => ({ ...s, balance: s.balance + data.harvestedAmount }));
        triggerAnim('claim', 'success');
        alert(`🎉 ${data.message}`);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert(`서버 수확 실패: ${error.message}`);
    }
  };

  const handleUpgrade = async (type, id = null) => {
    const functions = getFunctions(app);
    const upgradeFunction = httpsCallable(functions, 'upgradeItem');
    try {
      const result = await upgradeFunction({ userId: getUserId(), type, id });
      const data = result.data;

      if (data.success) {
        triggerAnim(id || type, 'success');
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
      alert(`서버 강화 통신 실패: ${error.message}`);
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

  const watchAdAndDouble = () => {
    setState(s => ({
      ...s,
      isAdActive: true,
      adTimeLeft: 3600
    }));
    alert("📺 광고 시청 완료! 지금부터 1시간 동안 모든 영지 일일 획득량이 2배로 폭증합니다!");
  };

  // ==========================================
  // 5. 방치형 실시간 자동 루프
  // ==========================================
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready(); tg.expand();
      if (tg.initDataUnsafe?.user?.first_name) {
        setState(s => ({ ...s, userName: tg.initDataUnsafe.user.first_name }));
      }
    }

    const timer = setInterval(() => {
      setState(s => {
        const best = checkHunt(currentStats);
        const currentGain = (300000 * best.mult * (1 + totalBonusPct / 100)) / 86400 * halvingMult * (s.isAdActive ? 2.0 : 1.0);
        
        let nextAdActive = s.isAdActive;
        let nextAdTime = s.adTimeLeft;
        if (s.isAdActive && s.adTimeLeft > 0) {
          nextAdTime = s.adTimeLeft - 1;
          if (nextAdTime <= 0) nextAdActive = false;
        }

        return { 
          ...s, 
          currentHunt: best.name, 
          balance: s.balance + currentGain, 
          mintedGOU: s.mintedGOU + currentGain,
          isAdActive: nextAdActive,
          adTimeLeft: nextAdTime
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStats, totalBonusPct, checkHunt, halvingMult]);

  // ==========================================
  // 6. UI 구조 파트
  // ==========================================
  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.7), rgba(26, 15, 20, 0.9)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <h1 style={{ color: '#fbbf24', fontSize: '32px', textShadow: '0 0 10px rgba(251,191,36,0.5)', fontFamily: "'Cinzel', serif" }}>GOD OF UPGRADE</h1>
        <p style={{ margin: '10px 0 30px 0', color: '#aaa', textAlign: 'center', fontSize: '13px' }}>TON 지갑을 연결하여 영지를 활성화하십시오.</p>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px' }}><TonConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="main-wrap" style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.4), rgba(26, 15, 20, 0.5)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      color: '#e6d5b8', minHeight: '100vh', fontFamily: "'Cinzel', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0px'
    }}>
      <style>{`
        * { box-sizing: border-box; }
        
        .sticky-header { position: sticky; top: 0; width: 100%; max-width: 850px; background: rgba(11, 15, 25, 0.95); backdrop-filter: blur(10px); border-bottom: 2px solid #fbbf24; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.8); }
        
        @keyframes breathing { 0% { box-shadow: 0 0 5px #fbbf24; border-color: #fbbf24; } 50% { box-shadow: 0 0 25px #fbbf24; border-color: #fff; } 100% { box-shadow: 0 0 5px #fbbf24; border-color: #fbbf24; } }
        @keyframes flashSuccess { 0% { background: rgba(251, 191, 36, 0.4); } 100% { background: rgba(20, 20, 25, 0.4); } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.4); } 100% { background: rgba(20, 20, 25, 0.4); } }
        
        .hunt-active { animation: breathing 1.5s infinite ease-in-out; background: rgba(217, 119, 6, 0.25) !important; border: 2px solid #fff !important; }
        .anim-success { animation: flashSuccess 0.5s ease-out; }
        .anim-fail { animation: flashFail 0.4s ease-out; }
        
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .btn-auto-on { background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid #06b6d4; }
        .glass-panel { background: rgba(15, 17, 23, 0.85); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px; }

        .grid-hunts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 20px 0; width: 100%; max-width: 850px; padding: 0 10px; }
        .hunt-box { background: rgba(0, 0, 0, 0.85); border: 1px solid rgba(255,255,255,0.15); padding: 15px 10px; border-radius: 10px; min-height: 150px; display: flex; flex-direction: column; justify-content: space-between; text-shadow: 1px 1px 2px #000; }

        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; padding: 0 10px; }
        .gear-card { padding: 15px; border-top: 4px solid #c5a059; display: flex; flex-direction: column; align-items: center; text-align: center; background: rgba(15,17,23,0.85); border-radius: 8px; }
        .img-box-gear { width: 60px; height: 60px; background: #000; border: 1px solid #c5a059; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 28px; }

        @media (max-width: 768px) {
          .sticky-header { padding: 10px 12px; }
          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .stat-flex-box { flex-direction: column !important; gap: 10px; }
        }
      `}</style>

      <div className="sticky-header">
        <div>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold' }}>{state.walletAddress || "지갑 연결됨"}</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>[{state.userTitle}] {state.userName}</div>
        </div>
        <div style={{ textHeading: 'right' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24', textShadow: '0 0 10px #fbbf24' }}>
            {Math.floor(state.balance).toLocaleString()}
          </span>
          <span style={{ fontSize: '12px', color: '#c5a059', marginLeft: '4px' }}>GOU</span>
        </div>
        <button onClick={() => setState(s => ({...s, isRankingOpen: true}))} style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: '1px solid #fbbf24', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>🏆 RANK</button>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '20px 10px 80px 10px' }}>
        
        <div className="glass-panel">
          <div className="stat-flex-box" style={{ display: 'flex', gap: '15px', width: '100%' }}>
            <div style={{ flex: 1, background: 'rgba(6,182,212,0.1)', border: '1px solid #06b6d4', padding: '15px', borderRadius: '10px' }}>
              <div style={{ color: '#06b6d4', fontWeight: 'bold', fontSize: '12px' }}>📈 일일 총 획득 속도</div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '22px', margin: '5px 0' }}>+{dailyGainDisplay.toLocaleString()} GOU</div>
              <button onClick={watchAdAndDouble} style={{ marginTop: '5px', width: '100%', background: state.isAdActive ? '#10b981' : '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                {state.isAdActive ? `⏳ 버프 적용 중 (${state.adTimeLeft}초)` : "📺 광고 보고 획득량 2배 (1시간)"}
              </button>
            </div>

            <div style={{ flex: 1, background: 'rgba(197,160,89,0.1)', border: '1px solid #c5a059', padding: '15px', borderRadius: '10px' }}>
              <div style={{ color: '#c5a059', fontWeight: 'bold', fontSize: '12px' }}>⚔️ 통합 보너스 수치</div>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '22px', margin: '5px 0' }}>+{totalBonusPct}%</div>
              {/* 🚨 장화 인덱스(4)로 완벽 매칭된 보너스 연산 */}
              <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.4' }}>
                • ALL 강화 30강 버프: <span style={{color: '#fff'}}>+{setBonus}%</span><br/>
                • 장화 버프: <span style={{color: '#fff'}}>+{gears[4].lvl * gears[4].base}%</span> | 신수 버프: <span style={{color: '#fff'}}>+{petBonus}%</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '15px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '10px', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px' }}>🏆 이번 주 시즌 랭커 기금</div>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', marginTop: '3px' }}>{state.jackpot.toLocaleString()} GOU</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#10b981', fontWeight: 'bold', border: '1px solid #10b981', padding: '6px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)' }}>
                🗓️ 매주 월요일 자동 지급
              </div>
            </div>
          </div>

          <button onClick={claimGOU} style={{ width: '100%', background: 'linear-gradient(to right, #fbbf24, #d97706)', color: '#000', border: 'none', borderRadius: '8px', padding: '15px 0', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', boxShadow: '0 4px 15px rgba(217,119,6,0.4)' }}>
            🚀 영지 수확 (GOU 코인 실시간 획득)
          </button>
        </div>

        <h3 style={{ color: '#fbbf24', margin: '15px 0 10px 5px', fontSize: '16px', letterSpacing: '1px' }}>🗺️ 점령 영지 현황</h3>
        <div className="grid-hunts">
          {hunts.map(h => {
            const isActive = state.currentHunt === h.name;
            const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.req.sum;
            return (
              <div key={h.name} className={`hunt-box ${isActive ? "hunt-active" : ""}`} style={{ borderColor: isActive ? '#fff' : (isUnlocked ? '#06b6d4' : 'rgba(255,255,255,0.15)'), background: isActive ? 'rgba(217,119,6,0.3)' : '#000' }}>
                <b style={{ color: isActive ? '#fff' : (isUnlocked ? '#06b6d4' : '#666'), fontSize: '13px', textAlign: 'center' }}>
                  {isActive ? '⚔️ ' : (isUnlocked ? '🔓 ' : '🔒 ')}{h.name}
                </b>
                {h.name !== '초원 영지' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '5px', fontSize: '10px', color: '#ccc' }}>
                    <div>공 <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444'}}>{h.req.atk}</span></div>
                    <div>체 <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444'}}>{h.req.hp}</span></div>
                    <div>방 <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444'}}>{h.req.def}</span></div>
                    <div>명 <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444'}}>{h.req.acc}</span></div>
                  </div>
                )}
                <div style={{ textAlign: 'center', fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '5px' }}>
                  <div style={{ color: isUnlocked ? '#06b6d4' : '#888', fontWeight: 'bold' }}>요구 전투력 {h.req.sum}</div>
                  <div style={{ color: '#fbbf24', fontWeight: 'bold', marginTop: '2px' }}>배율 X{h.mult}</div>
                </div>
              </div>
            );
          })}
        </div>

        <h3 style={{ color: '#fbbf24', margin: '20px 0 10px 5px', fontSize: '16px' }}>⚔️ 왕실 무기고 강화</h3>
        <div className="gears-grid">
          {gears.map((g) => {
            const isMax = g.lvl >= 30;
            return (
              <div key={g.id} className={`gear-card ${anims[g.id] ? `anim-${anims[g.id]}` : ''}`}>
                <div className="img-box-gear">{g.emoji}</div>
                <div style={{ fontSize: '11px', color: '#c5a059', fontWeight: 'bold', marginTop: '5px' }}>[{g.stat}: {(g.lvl * g.base).toFixed(1)}{g.unit}]</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0', color: '#fff' }}>{g.name} <span style={{ color: '#fbbf24' }}>+{g.lvl}</span></div>
                {/* 🚨 목걸이(5), 반지(6) 인덱스로 비용/확률 연산 완벽 동기화 */}
                <div style={{ color: '#aaa', fontSize: '11px', lineHeight: '1.3' }}>
                  확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%`}</span><br/>
                  비용: <span style={{color: '#eee'}}>{isMax ? 'MAX' : getCost(g.lvl, gears[5].lvl).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '100%', gap: '6px', marginTop: '10px' }}>
                  <button onClick={() => handleUpgrade('gear', g.id)} disabled={isMax} className="btn-neon" style={{ flex: 1, padding: '6px 0', fontSize: '12px' }}>강화</button>
                  <button onClick={() => toggleAuto('gear', g.id)} disabled={isMax} className={`btn-neon ${state.autoTimers[g.id] ? 'btn-auto-on' : ''}`} style={{ flex: 1, padding: '6px 0', fontSize: '12px' }}>
                    {state.autoTimers[g.id] ? 'STOP' : 'AUTO'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {['pet', 'castle'].map(type => {
          const isPet = type === 'pet';
          const isActive = isPet ? state.petActive : state.castleActive;
          const lvl = isPet ? state.petLevel : state.castleLevel;
          const name = isPet ? state.petName : state.castleName;
          const isMax = lvl >= 50;

          return (
            <div key={type} className="glass-panel" style={{ position: 'relative', overflow: 'hidden', marginTop: '20px', padding: '15px' }}>
              {!isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px', padding: '10px 20px', border: '1px solid #fbbf24', borderRadius: '6px', background: '#000' }}>
                    🔒 {isPet ? '장비 ALL 30강 달성 시 개방' : '펫 50강 달성 시 개방'}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '80px', height: '80px', background: '#000', border: '2px solid #fbbf24', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '45px' }}>
                  {isPet ? '🐉' : '🏰'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '18px' }}>{name} <span style={{ color: '#fff', fontSize: '14px' }}>Lv.{lvl}</span></h3>
                  <p style={{ margin: '3px 0 10px 0', fontSize: '12px', color: '#aaa' }}>GOU 추가 영지 획득량 보너스: <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>+{isPet ? getPetBonus(lvl) : getCastleBonus(lvl)}%</span></p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleUpgrade(type)} disabled={!isActive || isMax} className="btn-neon" style={{ flex: 1, padding: '6px', fontSize: '12px' }}>강화</button>
                    <button onClick={() => toggleAuto(type)} disabled={!isActive || isMax} className={`btn-neon ${state.autoTimers[type] ? 'btn-auto-on' : ''}`} style={{ flex: 1, padding: '6px', fontSize: '12px' }}>{state.autoTimers[type] ? 'STOP' : 'AUTO'}</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {state.isRankingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ background: '#111', border: '2px solid #fbbf24', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ color: '#fbbf24', margin: '0 0 15px 0' }}>RANKING</h2>
            <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '20px' }}>시즌 자동 정산 완료 후 월요일마다 명단이 갱신됩니다.</div>
            <button onClick={() => setState(s => ({...s, isRankingOpen: false}))} className="btn-neon" style={{ width: '100%' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}