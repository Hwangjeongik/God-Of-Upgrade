import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { app } from './firebase'; 

const MAX_SUPPLY = 10000000000; 
const HALVING_BURN_THRESHOLD = MAX_SUPPLY * 0.2; 

export default function App() {
  const hunts = useMemo(() => [
    {name: '초원 영지', mult: 1, req: {atk:0, hp:0, def:0, acc:0, sum:0}},
    {name: '신의 숲', mult: 1.5, req: {atk:50, hp:500, def:25, acc:10, sum:35}},
    {name: '불멸 사막', mult: 2.5, req: {atk:100, hp:1000, def:50, acc:20, sum:70}},
    {name: '심연 정글', mult: 5, req: {atk:170, hp:1700, def:75, acc:34, sum:110}},
    {name: '황혼 화산', mult: 12, req: {atk:230, hp:2300, def:115, acc:46, sum:150}}
  ], []);

  const [state, setState] = useState({ 
    screen: 'wallet', walletAddress: '', balance: 50000000000, burned: 1999000000, jackpot: 50000000, 
    pendingGOU: 0, unclaimedTime: 0, 
    autoTimers: {}, userName: "사령관", userTitle: "견습 기사", isRankingOpen: false,
    petActive: true, petLevel: 49, petName: "고대 황금 드래곤",
    castleActive: false, castleLevel: 0, castleName: "위대한 군주의 성",
    isAdActive: false, adTimeLeft: 0
  });

  const [gears, setGears] = useState([
    {id: 'sword', name: '성검 엑스칼리버', lvl: 30, stat: '공격력', base: 10, unit: '', imgFile: 'weapon.png', emoji: '⚔️'},
    {id: 'armor', name: '성기사의 갑옷', lvl: 30, stat: '체력', base: 100, unit: '', imgFile: 'armor.png', emoji: '👕'},
    {id: 'helmet', name: '사자왕의 투구', lvl: 30, stat: '방어력', base: 5, unit: '', imgFile: 'helmet.png', emoji: '🪖'},
    {id: 'gloves', name: '용기사의 장갑', lvl: 30, stat: '명중률', base: 2, unit: '', imgFile: 'gloves.png', emoji: '🧤'},
    {id: 'boots', name: '바람의 장화', lvl: 30, stat: 'GOU 보너스', base: 5, unit: '%', imgFile: 'shoes.png', emoji: '👢'},
    {id: 'necklace', name: '현자의 목걸이', lvl: 30, stat: '비용감소', base: 0.5, unit: '%', imgFile: 'necklace.png', emoji: '📿'},
    {id: 'ring', name: '행운의 반지', lvl: 30, stat: '성공확률', base: 0.1, unit: '%', imgFile: 'ring.png', emoji: '💍'}
  ]);

  const [anims, setAnims] = useState({});
  const wallet = useTonWallet();

  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => setAnims(prev => ({ ...prev, [id]: null })), 300); // 🚨 애니메이션 체감 속도 더 빠르게 단축
  }, []);

  const totalGearLevel = gears.reduce((a, b) => a + b.lvl, 0); 
  const setBonus = totalGearLevel >= 210 ? 1000 : totalGearLevel >= 140 ? 300 : totalGearLevel >= 70 ? 100 : 0;

  const currentStats = useMemo(() => ({
    atk: gears[0].lvl * gears[0].base, hp: gears[1].lvl * gears[1].base,
    def: gears[2].lvl * gears[2].base, acc: gears[3].lvl * gears[3].base,
    sum: totalGearLevel
  }), [gears]);

  const getPetBonus = useCallback((lvl) => { let b = 100 + (lvl * 2); if (lvl >= 10) b += 30; if (lvl >= 20) b += 50; if (lvl >= 30) b += 100; if (lvl >= 40) b += 200; if (lvl >= 50) b += 500; return b; }, []);
  const getCastleBonus = useCallback((lvl) => { let b = 200 + (lvl * 5); if (lvl >= 10) b += 50; if (lvl >= 20) b += 100; if (lvl >= 30) b += 200; if (lvl >= 40) b += 500; if (lvl >= 50) b += 1500; return b; }, []);

  const petBonus = state.petActive ? getPetBonus(state.petLevel) : 0;
  const castleBonus = state.castleActive ? getCastleBonus(state.castleLevel) : 0;
  const totalBonusPct = (gears[4].lvl * gears[4].base) + setBonus + petBonus + castleBonus; 

  const isHalving = state.burned >= HALVING_BURN_THRESHOLD;
  const halvingMult = isHalving ? 0.5 : 1.0;
  const adMultiplier = state.isAdActive ? 2.0 : 1.0;

  const getCost = useCallback((lvl, nLvl) => Math.floor(((lvl < 10 ? 1000 : lvl < 20 ? 10000 : 100000) + ((lvl % 10) * 100)) * (1 - (nLvl * 0.005)) * halvingMult), [halvingMult]);
  const getPetCost = useCallback((lvl, nLvl) => Math.floor((lvl < 9 ? 100 + (lvl * 10) : lvl < 19 ? 1000 + ((lvl % 10) * 100) : lvl < 29 ? 10000 + ((lvl % 10) * 1000) : lvl < 39 ? 100000 + ((lvl % 10) * 10000) : 1000000 + ((lvl % 10) * 100000)) * (1 - (nLvl * 0.005)) * halvingMult), [halvingMult]);
  const getCastleCost = useCallback((lvl, nLvl) => Math.floor((lvl < 9 ? 1000 + (lvl * 100) : lvl < 19 ? 10000 + ((lvl % 10) * 1000) : lvl < 29 ? 100000 + ((lvl % 10) * 10000) : lvl < 39 ? 1000000 + ((lvl % 10) * 100000) : 10000000 + ((lvl % 10) * 1000000)) * (1 - (nLvl * 0.005)) * halvingMult), [halvingMult]);
  const getRate = useCallback((lvl, rLvl) => Math.min(0.99, ((lvl < 5 ? 1.0 : lvl < 10 ? 0.7 : lvl < 15 ? 0.6 : lvl < 20 ? 0.5 : [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20]) + (rLvl * 0.001))), []);
  const getPetRate = useCallback((lvl, ringLvl) => Math.min(0.99, (lvl < 5 ? 1.0 : lvl < 10 ? 0.7 : lvl < 15 ? 0.65 : lvl < 20 ? 0.6 : lvl < 25 ? 0.55 : lvl < 30 ? 0.5 : lvl < 35 ? 0.45 : lvl < 40 ? 0.4 : [0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][lvl - 41] || 0.1) + (ringLvl * 0.001)), []);

  const checkHunt = useCallback((stats) => hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum) || hunts[0], [hunts]);
  const currentHuntData = checkHunt(currentStats);
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * halvingMult * adMultiplier);

  const formatTime = (seconds) => `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    if (wallet) setState(s => ({ ...s, walletAddress: wallet.account.address.substring(0, 6) + '...' + wallet.account.address.substring(wallet.account.address.length - 4), screen: 'game' }));
    else setState(s => ({ ...s, screen: 'wallet' }));
  }, [wallet]);

  const getUserId = () => window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? String(window.Telegram.WebApp.initDataUnsafe.user.id) : "test_commander_123";

  // 🚀 [반응속도 개선] 0.001초 낙관적 업데이트 로직 탑재
  const claimGOU = async () => {
    const estimatedGain = Math.floor(state.pendingGOU);
    if (estimatedGain < 10) return alert("최소 10 GOU 이상부터 수확 가능합니다.");

    // 1. 클릭 즉시 잔고 상승 및 게이지 초기화 (딜레이 0초)
    setState(s => ({ ...s, balance: s.balance + estimatedGain, pendingGOU: 0, unclaimedTime: 0 }));
    triggerAnim('claim', 'success');

    // 2. 백그라운드 서버 전송
    const functions = getFunctions(app);
    const claimFunction = httpsCallable(functions, 'claimGOU');
    try {
      await claimFunction({ userId: getUserId(), currentMultiplier: currentHuntData.mult * adMultiplier });
    } catch (error) { console.log("백그라운드 동기화 딜레이:", error); }
  };

  const handleUpgrade = async (type, id = null) => {
    triggerAnim(id || type, 'loading'); 
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
    } catch (error) { alert(`강화 실패: ${error.message}`); }
  };

  const toggleAuto = (type, id = null) => {
    const timerKey = id || type;
    setState(s => {
      const newAuto = { ...s.autoTimers };
      if (newAuto[timerKey]) { clearInterval(newAuto[timerKey]); delete newAuto[timerKey]; }
      else { newAuto[timerKey] = setInterval(() => handleUpgrade(type, id), 2000); }
      return { ...s, autoTimers: newAuto };
    });
  };

  const watchAdAndDouble = () => {
    setState(s => ({ ...s, isAdActive: true, adTimeLeft: 3600 }));
    alert("📺 광고 시청 완료! 지금부터 1시간 동안 일일 획득량이 2배로 폭증합니다!");
  };

  useEffect(() => {
    if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }

    const timer = setInterval(() => {
      setState(s => {
        const gainPerSec = ((300000 * currentHuntData.mult * (1 + totalBonusPct / 100)) / 86400) * halvingMult * (s.isAdActive ? 2.0 : 1.0);
        let newUnclaimed = s.unclaimedTime + 1;
        let gainToApply = gainPerSec;
        
        if (newUnclaimed > 43200) { newUnclaimed = 43200; gainToApply = 0; }

        let nextAdActive = s.isAdActive; let nextAdTime = s.adTimeLeft;
        if (s.isAdActive && s.adTimeLeft > 0) { nextAdTime = s.adTimeLeft - 1; if (nextAdTime <= 0) nextAdActive = false; }

        return { ...s, pendingGOU: s.pendingGOU + gainToApply, unclaimedTime: newUnclaimed, isAdActive: nextAdActive, adTimeLeft: nextAdTime };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentHuntData, totalBonusPct, halvingMult]);

  // 🚨 이미지 로드 실패 시 동작하는 스마트 대체 로직
  const handleImageError = (e, emoji) => {
    e.target.style.display = 'none';
    e.target.parentNode.innerHTML = `<div style="font-size: 32px;">${emoji}</div>`;
  };

  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.4), rgba(26, 15, 20, 0.6)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <h1 style={{ color: '#fbbf24', fontSize: '32px', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>GOD OF UPGRADE</h1>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px', marginTop: '20px' }}><TonConnectButton /></div>
      </div>
    );
  }

  const timeProgress = (state.unclaimedTime / 43200) * 100;

  return (
    <div className="main-wrap" style={{ 
      /* 🚨 배경 투명도를 대폭 조절하여 영롱한 백그라운드가 훤히 보이도록 튜닝 */
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.2), rgba(26, 15, 20, 0.4)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e6d5b8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', 
      paddingTop: '80px' 
    }}>
      <style>{`
        * { box-sizing: border-box; font-family: 'Pretendard', sans-serif; }
        
        .fixed-header { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 850px; background: rgba(11, 15, 25, 0.85); backdrop-filter: blur(12px); border-bottom: 2px solid #fbbf24; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; box-shadow: 0 5px 20px rgba(0,0,0,0.5); }
        
        @keyframes flashSuccess { 0% { background: rgba(251, 191, 36, 0.6); transform: scale(1.02); } 100% { background: transparent; transform: scale(1); } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.6); transform: translateX(-5px); } 50% { transform: translateX(5px); } 100% { background: transparent; transform: translateX(0); } }
        .anim-success { animation: flashSuccess 0.3s ease-out; }
        .anim-fail { animation: flashFail 0.3s ease-out; }
        .anim-loading { filter: brightness(1.5) contrast(1.2); transform: scale(0.95); transition: 0.1s; }
        
        .action-btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 14px; transition: transform 0.1s, filter 0.1s; }
        .action-btn:active { transform: scale(0.92); filter: brightness(1.2); }
        
        /* 🚨 패널 투명도 대폭 상향 (0.85 -> 0.45) 및 유리 질감(Blur) 강화 */
        .glass-panel { background: rgba(15, 20, 25, 0.45); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px; backdrop-filter: blur(10px); box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .img-box-gear { width: 60px; height: 60px; background: rgba(0,0,0,0.5); border: 1px solid rgba(197,160,89,0.5); border-radius: 10px; display: flex; justify-content: center; align-items: center; overflow: hidden; }
        .img-box-gear img { width: 85%; height: 85%; object-fit: contain; }
        
        @media (max-width: 768px) {
          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
        }
      `}</style>

      <div className="fixed-header">
        <div>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold' }}>{state.walletAddress || "지갑 연결됨"}</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>[{state.userTitle}] {state.userName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.8)' }}>
            {Math.floor(state.balance).toLocaleString()}
          </span>
          <span style={{ fontSize: '12px', color: '#c5a059', marginLeft: '4px' }}>GOU</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '10px 10px 80px 10px' }}>
        
        <div className="glass-panel" style={{ textAlign: 'center', padding: '20px', border: '2px solid rgba(251,191,36,0.5)' }}>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
              <span style={{ color: '#06b6d4' }}>미수확: +{Math.floor(state.pendingGOU).toLocaleString()} GOU</span>
              <span style={{ color: state.unclaimedTime >= 43200 ? '#ef4444' : '#e6d5b8' }}>
                {state.unclaimedTime >= 43200 ? "MAX (수확 요망)" : formatTime(state.unclaimedTime) + " / 12:00:00"}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden', marginBottom: '15px' }}>
              <div style={{ width: `${timeProgress}%`, height: '100%', background: state.unclaimedTime >= 43200 ? '#ef4444' : '#06b6d4', transition: 'width 1s linear' }}></div>
            </div>
            {/* 🚨 즉각 반응하는 초고속 수확 버튼 */}
            <button className={`action-btn ${anims['claim'] ? `anim-${anims['claim']}` : ''}`} onClick={claimGOU} style={{ width: '100%', background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: '#000', padding: '16px 0', fontSize: '18px', fontWeight: '900', boxShadow: '0 4px 15px rgba(217,119,6,0.4)' }}>
              🚀 영지 수확하기
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
            <button className="action-btn" onClick={() => alert('스마트 컨트랙트 입금 준비 중')} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981' }}>📥 입금하기</button>
            <button className="action-btn" onClick={() => alert('스마트 컨트랙트 출금 준비 중')} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444' }}>📤 출금하기</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
          <div className="glass-panel" style={{ flex: 1, padding: '15px', margin: 0 }}>
            <div style={{ color: '#06b6d4', fontWeight: 'bold', fontSize: '12px' }}>📈 일일 총 획득 속도</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '20px', margin: '5px 0' }}>+{dailyGainDisplay.toLocaleString()} GOU</div>
            <button className="action-btn" onClick={watchAdAndDouble} style={{ width: '100%', background: state.isAdActive ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)', color: '#fff', padding: '10px', fontSize: '12px', marginTop: '5px' }}>
              {state.isAdActive ? `⏳ 버프 적용 중 (${formatTime(state.adTimeLeft)})` : "📺 광고 보고 획득량 2배 (1시간)"}
            </button>
          </div>
          <div className="glass-panel" style={{ flex: 1, padding: '15px', margin: 0 }}>
            <div style={{ color: '#c5a059', fontWeight: 'bold', fontSize: '12px' }}>⚔️ 통합 보너스 수치</div>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '20px', margin: '5px 0' }}>+{totalBonusPct}%</div>
            <div style={{ fontSize: '11px', color: '#ccc', lineHeight: '1.4' }}>• 합산 {totalGearLevel}강 버프: <span style={{color: '#fff'}}>+{setBonus}%</span><br/>• 장화: <span style={{color: '#fff'}}>+{gears[4].lvl * gears[4].base}%</span> | 신수: <span style={{color: '#fff'}}>+{petBonus}%</span></div>
          </div>
        </div>

        <h3 style={{ color: '#fbbf24', margin: '15px 0 10px 5px', fontSize: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>🗺️ 점령 영지 현황 (강화 총합 매칭)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '25px' }} className="grid-hunts">
          {hunts.map(h => {
            const isActive = state.currentHunt === h.name;
            const isUnlocked = totalGearLevel >= h.reqSum;
            return (
              <div key={h.name} style={{ background: isActive ? 'rgba(217,119,6,0.35)' : 'rgba(0,0,0,0.4)', border: `1px solid ${isActive ? '#fff' : (isUnlocked ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)')}`, padding: '12px 8px', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
                <b style={{ color: isActive ? '#fff' : (isUnlocked ? '#06b6d4' : '#666'), fontSize: '12px', marginBottom: '5px' }}>{isActive ? '⚔️ ' : ''}{h.name}</b>
                {h.name !== '초원 영지' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '4px', fontSize: '10px', color: '#ccc', marginBottom: '5px' }}>
                    <div>공 <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444'}}>{h.req.atk}</span></div>
                    <div>체 <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444'}}>{h.req.hp}</span></div>
                    <div>방 <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444'}}>{h.req.def}</span></div>
                    <div>명 <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444'}}>{h.req.acc}</span></div>
                  </div>
                )}
                <div style={{ fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '5px' }}>
                  <div style={{ color: isUnlocked ? '#ccc' : '#666' }}>강화 총합 <span style={{color: isUnlocked ? '#fff' : '#666', fontWeight: 'bold'}}>{h.req.sum}</span></div>
                  <div style={{ color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', marginTop: '2px' }}>수익 X{h.mult}</div>
                </div>
              </div>
            );
          })}
        </div>

        <h3 style={{ color: '#fbbf24', margin: '20px 0 10px 5px', fontSize: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>⚔️ 왕실 무기고 강화 (총합: <span style={{color: '#fff'}}>{totalGearLevel}강</span>)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }} className="gears-grid">
          {gears.map((g) => {
            const isMax = g.lvl >= 30;
            return (
              <div key={g.id} className={`glass-panel ${anims[g.id] ? `anim-${anims[g.id]}` : ''}`} style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 0, borderTop: '4px solid rgba(197,160,89,0.8)' }}>
                <div className="img-box-gear">
                  {/* 🚨 절대경로 이미지 및 폴백 에모지 완벽 적용 */}
                  <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt={g.name} onError={(e) => handleImageError(e, g.emoji)} />
                </div>
                <div style={{ fontSize: '11px', color: '#c5a059', fontWeight: 'bold', marginTop: '8px' }}>[{g.stat}: {(g.lvl * g.base).toFixed(1)}{g.unit}]</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0', color: '#fff' }}>{g.name} <span style={{ color: '#fbbf24' }}>+{g.lvl}</span></div>
                <div style={{ color: '#ccc', fontSize: '11px', lineHeight: '1.4', textAlign: 'center' }}>
                  확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%`}</span><br/>
                  비용: <span style={{color: '#fff'}}>{isMax ? 'MAX' : getCost(g.lvl, gears[5].lvl).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '100%', gap: '6px', marginTop: '10px' }}>
                  <button onClick={() => handleUpgrade('gear', g.id)} disabled={isMax} className="action-btn" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid #fbbf24' }}>강화</button>
                  <button onClick={() => toggleAuto('gear', g.id)} disabled={isMax} className="action-btn" style={{ background: state.autoTimers[g.id] ? 'rgba(6,182,212,0.3)' : 'rgba(0,0,0,0.4)', color: state.autoTimers[g.id] ? '#06b6d4' : '#aaa', border: `1px solid ${state.autoTimers[g.id] ? '#06b6d4' : '#555'}` }}>{state.autoTimers[g.id] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            );
          })}
        </div>

        {['pet', 'castle'].map(type => {
          const isPet = type === 'pet'; const isActive = isPet ? state.petActive : state.castleActive;
          const lvl = isPet ? state.petLevel : state.castleLevel; const name = isPet ? state.petName : state.castleName;
          const isMax = lvl >= 50; const cost = isPet ? getPetCost(lvl, gears[5].lvl) : getCastleCost(lvl, gears[5].lvl);
          const rate = isPet ? getPetRate(lvl, gears[6].lvl) : getRate(lvl, gears[6].lvl);

          return (
            <div key={type} className={`glass-panel ${anims[type] ? `anim-${anims[type]}` : ''}`} style={{ position: 'relative', overflow: 'hidden', padding: '20px', marginTop: '15px', marginBottom: 0 }}>
              {!isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px', padding: '10px 20px', border: '1px solid #fbbf24', borderRadius: '6px', background: 'rgba(0,0,0,0.8)' }}>
                    🔒 {isPet ? '장비 총합 210강 달성 시 개방' : '펫 50강 달성 시 개방'}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="img-box-gear" style={{ width: '70px', height: '70px', fontSize: '40px' }}>
                  <img src={`${process.env.PUBLIC_URL}/${isPet ? 'pet.png' : 'castle.png'}`} alt={name} onError={(e) => handleImageError(e, isPet?'🐉':'🏰')} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '18px' }}>{name} <span style={{ color: '#fff', fontSize: '14px' }}>Lv.{lvl}</span></h3>
                  <div style={{ fontSize: '12px', color: '#ccc', margin: '5px 0', lineHeight: '1.4' }}>수익 보너스: <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>+{isPet ? getPetBonus(lvl) : getCastleBonus(lvl)}%</span><br/>확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(rate*100).toFixed(1)}%`}</span> | 비용: <span style={{color: '#fff'}}>{isMax ? 'MAX' : cost.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={() => handleUpgrade(type)} disabled={!isActive || isMax} className="action-btn" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444' }}>강화</button>
                    <button onClick={() => toggleAuto(type)} disabled={!isActive || isMax} className="action-btn" style={{ background: state.autoTimers[type] ? 'rgba(6,182,212,0.3)' : 'rgba(0,0,0,0.4)', color: state.autoTimers[type] ? '#06b6d4' : '#aaa', border: `1px solid ${state.autoTimers[type] ? '#06b6d4' : '#555'}` }}>{state.autoTimers[type] ? 'STOP' : 'AUTO'}</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}