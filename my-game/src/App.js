import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { app } from './firebase'; 

const MAX_SUPPLY = 10000000000; 
const HALVING_BURN_THRESHOLD = MAX_SUPPLY * 0.2; 

export default function App() {
  const hunts = useMemo(() => [
    {name: '초원 영지', mult: 1, reqSum: 0, req: {atk:0, hp:0, def:0, acc:0}},
    {name: '신의 숲', mult: 1.5, reqSum: 35, req: {atk:50, hp:500, def:25, acc:10}},
    {name: '불멸 사막', mult: 2.5, reqSum: 70, req: {atk:100, hp:1000, def:50, acc:20}},
    {name: '심연 정글', mult: 5, reqSum: 110, req: {atk:170, hp:1700, def:75, acc:34}},
    {name: '황혼 화산', mult: 12, reqSum: 150, req: {atk:230, hp:2300, def:115, acc:46}}
  ], []);

  const [state, setState] = useState({ 
    screen: 'wallet', walletAddress: '', balance: 1000000000, burned: 1999000000, jackpot: 50000000, 
    pendingGOU: 0, unclaimedTime: 0, 
    userName: "사령관", userTitle: "견습 기사", isRankingOpen: false,
    petLevel: 0, castleLevel: 0,
    petHuntEndTime: 0, castleHuntEndTime: 0, 
    isAdActive: false, adTimeLeft: 0
  });

  const autoTimersRef = useRef({});
  const autoTargetsRef = useRef({});
  const enhancingLocksRef = useRef({}); 
  const handleUpgradeRef = useRef();
  const [autoActive, setAutoActive] = useState({});

  // 🚨 사령관님! 여기에 세팅된 파일명(weapon.png 등)을 실제 public 폴더에 넣으신 파일명/확장자와 정확히 일치시켜주세요! (jpg면 .jpg로 변경)
  const [gears, setGears] = useState([
    {id: 'sword', name: '제우스의 검', lvl: 0, stat: '공격력', base: 10, unit: '', imgFile: 'weapon.png', emoji: '⚡'},
    {id: 'armor', name: '아레스의 갑옷', lvl: 0, stat: '체력', base: 100, unit: '', imgFile: 'armor.png', emoji: '🔥'},
    {id: 'helmet', name: '아테나의 투구', lvl: 0, stat: '방어력', base: 5, unit: '', imgFile: 'helmet.png', emoji: '🦉'},
    {id: 'gloves', name: '헤파이스토스의 장갑', lvl: 0, stat: '명중률', base: 2, unit: '', imgFile: 'gloves.png', emoji: '🔨'},
    {id: 'boots', name: '헤르메스의 신발', lvl: 0, stat: 'GOU 보너스', base: 5, unit: '%', imgFile: 'shoes.png', emoji: '🪽'},
    {id: 'necklace', name: '아프로디테의 목걸이', lvl: 0, stat: '비용감소', base: 0.5, unit: '%', imgFile: 'necklace.png', emoji: '🌹'},
    {id: 'ring', name: '포세이돈의 반지', lvl: 0, stat: '성공확률', base: 0.1, unit: '%', imgFile: 'ring.png', emoji: '🌊'}
  ]);

  const [anims, setAnims] = useState({});
  const wallet = useTonWallet();

  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => setAnims(prev => ({ ...prev, [id]: null })), 250);
  }, []);

  const totalGearLevel = gears.reduce((a, b) => a + b.lvl, 0); 
  const minLvl = Math.min(...gears.map(g => g.lvl));
  const setBonus = minLvl >= 30 ? 500 : minLvl >= 20 ? 200 : minLvl >= 10 ? 100 : 0;

  const isPetUnlocked = totalGearLevel >= 210;
  const isCastleUnlocked = state.petLevel >= 50;

  const mockRankings = useMemo(() => [
    { rank: 1, name: "KOREA", title: "LEGENDARY GOD", power: "999,999" },
    { rank: 2, name: "UPGRADE", title: "KING OF LUCK", power: "850,200" },
    { rank: 3, name: "CHAMPION", title: "IRON KNIGHT", power: "720,500" },
    { rank: 4, name: state.userName, title: state.userTitle, power: totalGearLevel, isMe: true }
  ], [state.userName, state.userTitle, totalGearLevel]);

  const currentStats = useMemo(() => ({
    atk: gears[0].lvl * gears[0].base, hp: gears[1].lvl * gears[1].base,
    def: gears[2].lvl * gears[2].base, acc: gears[3].lvl * gears[3].base,
    sum: totalGearLevel
  }), [gears, totalGearLevel]);

  const getPetBonus = useCallback((lvl) => {
    if (lvl >= 50) return 500; if (lvl >= 40) return 400;
    if (lvl >= 30) return 300; if (lvl >= 20) return 200;
    if (lvl >= 10) return 100; return 0;
  }, []);

  const getCastleBonus = useCallback((lvl) => {
    if (lvl >= 50) return 1000; if (lvl >= 40) return 800;
    if (lvl >= 30) return 600; if (lvl >= 20) return 400;
    if (lvl >= 10) return 200; return 0;
  }, []);

  const gearGainBonus = totalGearLevel * 2;
  const petGainBonus = isPetUnlocked ? state.petLevel * 3 : 0;
  const castleGainBonus = isCastleUnlocked ? state.castleLevel * 5 : 0;

  const petMilestone = getPetBonus(state.petLevel);
  const castleMilestone = getCastleBonus(state.castleLevel);
  const totalBonusPct = gearGainBonus + setBonus + petGainBonus + petMilestone + castleGainBonus + castleMilestone; 

  const isHalving = state.burned >= HALVING_BURN_THRESHOLD;
  const halvingMult = isHalving ? 0.5 : 1.0;
  const adMultiplier = state.isAdActive ? 2.0 : 1.0;

  const getCost = useCallback((lvl, nLvl) => Math.floor(((lvl < 10 ? 1000 : lvl < 20 ? 10000 : 100000) + ((lvl % 10) * 100)) * (1 - (nLvl * 0.005)) * halvingMult), [halvingMult]);
  const getPetCost = useCallback((lvl, nLvl) => Math.floor((lvl < 9 ? 100 + (lvl * 10) : lvl < 19 ? 1000 + ((lvl % 10) * 100) : lvl < 29 ? 10000 + ((lvl % 10) * 1000) : lvl < 39 ? 100000 + ((lvl % 10) * 10000) : 1000000 + ((lvl % 10) * 100000)) * (1 - (nLvl * 0.005)) * halvingMult), [halvingMult]);
  const getCastleCost = useCallback((lvl, nLvl) => Math.floor((lvl < 9 ? 1000 + (lvl * 100) : lvl < 19 ? 10000 + ((lvl % 10) * 1000) : lvl < 29 ? 100000 + ((lvl % 10) * 10000) : lvl < 39 ? 1000000 + ((lvl % 10) * 100000) : 10000000 + ((lvl % 10) * 1000000)) * (1 - (nLvl * 0.005)) * halvingMult), [halvingMult]);

  const checkHunt = useCallback((now, stats) => {
    if (state.castleHuntEndTime > now) return { name: '🏰 제국의 심장 (특수)', mult: 50, isSpecial: true };
    if (state.petHuntEndTime > now) return { name: '🐉 신수의 둥지 (특수)', mult: 30, isSpecial: true };
    return hunts.slice().reverse().find(h => 
      stats.atk >= h.req.atk && stats.hp >= h.req.hp && 
      stats.def >= h.req.def && stats.acc >= h.req.acc && 
      stats.sum >= h.reqSum
    ) || hunts[0];
  }, [hunts, state.castleHuntEndTime, state.petHuntEndTime]);

  const currentHuntData = checkHunt(Date.now(), currentStats);
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * halvingMult * adMultiplier);
  const formatTime = (seconds) => `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    if (wallet) setState(s => ({ ...s, walletAddress: wallet.account.address.substring(0, 6) + '...' + wallet.account.address.substring(wallet.account.address.length - 4), screen: 'game' }));
    else setState(s => ({ ...s, screen: 'wallet' }));
  }, [wallet]);

  const getUserId = () => window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? String(window.Telegram.WebApp.initDataUnsafe.user.id) : "test_commander_123";

  const claimGOU = async () => {
    const estimatedGain = Math.floor(state.pendingGOU);
    if (estimatedGain < 10) return alert("최소 10 GOU 이상부터 수확 가능합니다.");

    setState(s => ({ ...s, balance: s.balance + estimatedGain, pendingGOU: 0, unclaimedTime: 0 }));
    triggerAnim('claim', 'success');

    const functions = getFunctions(app);
    try { await httpsCallable(functions, 'claimGOU')({ userId: getUserId(), currentMultiplier: currentHuntData.mult * adMultiplier }); } 
    catch (error) { console.log(error); }
  };

  const handleUpgrade = async (type, id = null) => {
    const timerKey = id || type;
    if (enhancingLocksRef.current[timerKey]) return; 

    let cost = 0; let currentLvl = 0; let maxLimit = type === 'gear' ? 30 : 50;

    if (type === 'gear') {
      const g = gears.find(x => x.id === id); cost = getCost(g.lvl, gears[5].lvl); currentLvl = g.lvl;
    } else if (type === 'pet') {
      cost = getPetCost(state.petLevel, gears[5].lvl); currentLvl = state.petLevel;
    } else if (type === 'castle') {
      cost = getCastleCost(state.castleLevel, gears[5].lvl); currentLvl = state.castleLevel;
    }

    if (autoActive[timerKey] && autoTargetsRef.current[timerKey]) {
      if (currentLvl >= autoTargetsRef.current[timerKey] || currentLvl >= maxLimit) {
        clearInterval(autoTimersRef.current[timerKey]);
        delete autoTimersRef.current[timerKey];
        delete autoTargetsRef.current[timerKey];
        setAutoActive(p => ({ ...p, [timerKey]: false }));
        return; 
      }
    }

    if (state.balance < cost) {
      if (autoActive[timerKey]) {
        clearInterval(autoTimersRef.current[timerKey]);
        delete autoTimersRef.current[timerKey];
        setAutoActive(p => ({ ...p, [timerKey]: false }));
      }
      return alert("GOU 잔고가 부족합니다.");
    }

    enhancingLocksRef.current[timerKey] = true;
    
    // 🚨 렉 제로 핵심: 오토 중일 때는 화면 새로고침(애니메이션 등)을 건너뜀 (Silent Update)
    if (!autoActive[timerKey]) {
      setState(s => ({ ...s, balance: s.balance - cost }));
      triggerAnim(timerKey, 'loading'); 
    }

    const functions = getFunctions(app);
    try {
      const result = await httpsCallable(functions, 'upgradeItem')({ userId: getUserId(), type, id });
      const data = result.data;
      
      if (data.newLevel !== undefined) {
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: data.newLevel } : g));
        else if (type === 'pet') setState(s => ({ ...s, petLevel: data.newLevel }));
        else if (type === 'castle') setState(s => ({ ...s, castleLevel: data.newLevel }));
      }

      if (!autoActive[timerKey]) {
        if (data.success) triggerAnim(timerKey, 'success');
        else triggerAnim(timerKey, 'fail');
      }
      
    } catch (error) { 
        console.error("강화 에러 발생:", error);
        alert(`네트워크 통신 불안정: ${error.message}\n다시 시도해주세요.`);
    } finally {
        enhancingLocksRef.current[timerKey] = false;
    }
  };

  useEffect(() => { handleUpgradeRef.current = handleUpgrade; });

  const toggleAuto = (type, id = null) => {
    const timerKey = id || type;
    const maxLvl = type === 'gear' ? 30 : 50;
    const currentLvl = type === 'gear' ? gears.find(g=>g.id===id).lvl : (type === 'pet' ? state.petLevel : state.castleLevel);

    if (autoActive[timerKey]) { 
      clearInterval(autoTimersRef.current[timerKey]); 
      delete autoTimersRef.current[timerKey]; 
      delete autoTargetsRef.current[timerKey];
      setAutoActive(p => ({ ...p, [timerKey]: false }));
    } else { 
      const targetStr = window.prompt(`목표 강화 레벨을 숫자로 입력하세요 (현재 ${currentLvl}강 / 최대 ${maxLvl}강):`, maxLvl);
      if (!targetStr) return; 
      const target = parseInt(targetStr, 10);
      
      if (isNaN(target) || target <= currentLvl || target > maxLvl) {
          alert(`현재 레벨보다 높은 ${maxLvl} 이하의 유효한 숫자를 입력해 주십시오.`);
          return;
      }

      autoTargetsRef.current[timerKey] = target;
      setAutoActive(p => ({ ...p, [timerKey]: true }));
      
      autoTimersRef.current[timerKey] = setInterval(() => {
        if (handleUpgradeRef.current) handleUpgradeRef.current(type, id);
      }, 1000); 
    }
  };

  const startSpecialHunt = (type) => {
    const now = Date.now();
    if (state.petHuntEndTime > now || state.castleHuntEndTime > now) {
      alert("🔒 중복 실행 불가! 이미 다른 특수 사냥터 탐색 작전이 가동 중입니다.");
      return;
    }
    const duration = 12 * 60 * 60 * 1000;
    if (type === 'pet') setState(s => ({ ...s, petHuntEndTime: now + duration }));
    else if (type === 'castle') setState(s => ({ ...s, castleHuntEndTime: now + duration }));
    alert("특수 사냥터 활성화! 12시간 동안 최고 배율의 수익이 국고로 자동 입금됩니다.");
  };

  const watchAdAndDouble = () => {
    setState(s => ({ ...s, isAdActive: true, adTimeLeft: 3600 }));
    alert("📺 광고 시청 완료! 지금부터 1시간 동안 일일 획득량이 2배로 폭증합니다!");
  };

  useEffect(() => {
    if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }

    const timer = setInterval(() => {
      setState(s => {
        const best = checkHunt(Date.now(), currentStats);
        const gainPerSec = ((300000 * best.mult * (1 + totalBonusPct / 100)) / 86400) * halvingMult * (s.isAdActive ? 2.0 : 1.0);
        let newUnclaimed = s.unclaimedTime + 1;
        let gainToApply = gainPerSec;
        if (newUnclaimed > 43200) { newUnclaimed = 43200; gainToApply = 0; }

        let nextAdActive = s.isAdActive; let nextAdTime = s.adTimeLeft;
        if (s.isAdActive && s.adTimeLeft > 0) { nextAdTime = s.adTimeLeft - 1; if (nextAdTime <= 0) nextAdActive = false; }

        return { ...s, pendingGOU: s.pendingGOU + gainToApply, unclaimedTime: newUnclaimed, isAdActive: nextAdActive, adTimeLeft: nextAdTime };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [checkHunt, currentStats, totalBonusPct, halvingMult]);

  // 🚨 안전하고 깔끔한 이미지 렌더링 폴백
  const handleImageError = (e, emoji) => {
    e.target.style.display = 'none';
    e.target.parentNode.innerHTML = `<div style="font-size: 32px;">${emoji}</div>`;
  };

  const renderMilestoneUI = () => {
    if (!isPetUnlocked) {
      return (
        <>
          <div style={{ color: '#fbbf24', fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>🎯 장비 세트 효과</div>
          <div style={{ fontSize: '9px', color: '#aaa', display: 'grid', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ALL 10강</span><span style={{color:'#fff'}}>+100%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ALL 20강</span><span style={{color:'#fff'}}>+200%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ALL 30강</span><span style={{color:'#fbbf24', fontWeight:'bold'}}>+500%</span></div>
          </div>
        </>
      );
    } else if (!isCastleUnlocked) {
      return (
        <>
          <div style={{ color: '#06b6d4', fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>🐉 신수 성장 혜택</div>
          <div style={{ fontSize: '9px', color: '#aaa', display: 'grid', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>펫 10강</span><span style={{color:'#fff'}}>+100%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>펫 20강</span><span style={{color:'#fff'}}>+200%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>펫 30강</span><span style={{color:'#fff'}}>+300%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>펫 40강</span><span style={{color:'#fff'}}>+400%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>펫 50강</span><span style={{color:'#fbbf24', fontWeight:'bold'}}>+500%</span></div>
          </div>
        </>
      );
    } else {
      return (
        <>
          <div style={{ color: '#a855f7', fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>🏰 영지 성장 혜택</div>
          <div style={{ fontSize: '9px', color: '#aaa', display: 'grid', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>성 10강</span><span style={{color:'#fff'}}>+200%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>성 20강</span><span style={{color:'#fff'}}>+400%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>성 30강</span><span style={{color:'#fff'}}>+600%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>성 40강</span><span style={{color:'#fff'}}>+800%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>성 50강</span><span style={{color:'#fbbf24', fontWeight:'bold'}}>+1000%</span></div>
          </div>
        </>
      );
    }
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
      backgroundImage: `linear-gradient(rgba(5, 8, 12, 0.75), rgba(15, 10, 12, 0.85)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e6d5b8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', 
      paddingTop: '85px' 
    }}>
      <style>{`
        * { box-sizing: border-box; font-family: 'Pretendard', sans-serif; }
        .fixed-header { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 850px; background: rgba(10, 12, 18, 0.95); backdrop-filter: blur(12px); border-bottom: 2px solid #fbbf24; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; box-shadow: 0 5px 20px rgba(0,0,0,0.8); }
        
        @keyframes flashSuccess { 0% { background: rgba(251, 191, 36, 0.6); transform: scale(1.03); } 100% { background: transparent; transform: scale(1); } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.6); transform: translateX(-4px); } 50% { transform: translateX(4px); } 100% { background: transparent; transform: translateX(0); } }
        @keyframes breathing { 0% { box-shadow: 0 0 5px #fbbf24; border-color: #fbbf24; } 50% { box-shadow: 0 0 25px #fbbf24; border-color: #fff; } 100% { box-shadow: 0 0 5px #fbbf24; border-color: #fbbf24; } }
        
        .anim-success { animation: flashSuccess 0.2s ease-out; }
        .anim-fail { animation: flashFail 0.2s ease-out; }
        .anim-loading { filter: brightness(1.3); transform: scale(0.97); transition: 0.05s; }
        .hunt-active { animation: breathing 1.5s infinite ease-in-out; background: rgba(217, 119, 6, 0.5) !important; border: 2px solid #fff !important; }
        
        .action-btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 14px; transition: transform 0.05s; }
        .action-btn:active { transform: scale(0.90); }
        
        .glass-panel { background: rgba(15, 18, 25, 0.85); border: 1px solid rgba(197, 160, 89, 0.4); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
        .img-box-gear { width: 60px; height: 60px; background: rgba(0,0,0,0.8); border: 1px solid rgba(197,160,89,0.5); border-radius: 10px; display: flex; justify-content: center; align-items: center; overflow: hidden; }
        .img-box-gear img { width: 85%; height: 85%; object-fit: contain; }
        
        @media (max-width: 768px) {
          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
        }
      `}</style>

      {/* 상단 고정 헤더 */}
      <div className="fixed-header">
        <div>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold' }}>{state.walletAddress || "지갑 연결됨"}</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>[{state.userTitle}] {state.userName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.8)' }}>
              {Math.floor(state.balance).toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#c5a059', marginLeft: '4px' }}>GOU</span>
          </div>
          <button onClick={() => setState(s => ({...s, isRankingOpen: true}))} style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: '1px solid #fbbf24', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>🏆 RANK</button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '10px 10px 80px 10px' }}>
        
        {/* 코어 자산 수확 대시보드 */}
        <div className="glass-panel" style={{ textAlign: 'center', padding: '20px', border: '2px solid #fbbf24', background: 'rgba(20,24,32,0.9)' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
              <span style={{ color: '#06b6d4' }}>미수확: +{Math.floor(state.pendingGOU).toLocaleString()} GOU</span>
              <span style={{ color: state.unclaimedTime >= 43200 ? '#ef4444' : '#e6d5b8' }}>{state.unclaimedTime >= 43200 ? "MAX (수확 요망)" : formatTime(state.unclaimedTime) + " / 12:00:00"}</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden', marginBottom: '15px' }}>
              <div style={{ width: `${timeProgress}%`, height: '100%', background: state.unclaimedTime >= 43200 ? '#ef4444' : '#06b6d4', transition: 'width 1s linear' }}></div>
            </div>
            <button className={`action-btn ${anims['claim'] ? `anim-${anims['claim']}` : ''}`} onClick={claimGOU} style={{ width: '100%', background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: '#000', padding: '16px 0', fontSize: '18px', fontWeight: '900', boxShadow: '0 4px 15px rgba(217,119,6,0.4)' }}>🚀 영지 수확하기</button>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
            <button className="action-btn" onClick={() => alert('스마트 컨트랙트 입금 준비 중')} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981' }}>📥 입금하기</button>
            <button className="action-btn" onClick={() => alert('스마트 컨트랙트 출금 준비 중')} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444' }}>📤 출금하기</button>
          </div>
        </div>

        {/* 실시간 소각량 및 시즌 잭팟 보상금 UI */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px' }}>
          <div className="glass-panel" style={{ flex: 1, padding: '15px', margin: 0, border: '1px solid rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '11px' }}>🔥 GOU 실시간 소각량 (Burned)</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginTop: '5px' }}>{state.burned.toLocaleString()} GOU</div>
          </div>
          <div className="glass-panel" style={{ flex: 1, padding: '15px', margin: 0, border: '1px solid rgba(251, 191, 36, 0.5)', background: 'rgba(251, 191, 36, 0.05)' }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '11px' }}>🏆 이번 주 랭커 잭팟 보상금</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginTop: '5px' }}>{state.jackpot.toLocaleString()} GOU</div>
          </div>
        </div>

        {/* 📈 스탯 보너스 및 마일스톤 UI */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
          <div className="glass-panel" style={{ flex: 1, padding: '15px', margin: 0 }}>
            <div style={{ color: '#06b6d4', fontWeight: 'bold', fontSize: '12px' }}>📈 일일 총 획득 속도</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '20px', margin: '5px 0' }}>+{dailyGainDisplay.toLocaleString()} GOU</div>
            <button className="action-btn" onClick={watchAdAndDouble} style={{ width: '100%', background: state.isAdActive ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)', color: '#fff', padding: '10px', fontSize: '12px', marginTop: '5px' }}>
              {state.isAdActive ? `⏳ 버프 적용 중 (${formatTime(state.adTimeLeft)})` : "📺 광고 보고 획득량 2배 (1시간)"}
            </button>
          </div>
          <div className="glass-panel" style={{ flex: 1.2, padding: '15px', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#c5a059', fontWeight: 'bold', fontSize: '12px' }}>⚔️ 통합 보너스 수치</div>
                <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '20px', margin: '5px 0' }}>+{totalBonusPct}%</div>
                <div style={{ fontSize: '11px', color: '#ccc', lineHeight: '1.4' }}>
                  • 장비 속성 버프: <span style={{color: '#fff'}}>+{gearGainBonus + setBonus}%</span><br/>
                  • 신수(펫): <span style={{color: '#fff'}}>+{petGainBonus + petMilestone}%</span> | 영지(성): <span style={{color: '#fff'}}>+{castleGainBonus + castleMilestone}%</span>
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', minWidth: '130px' }}>
                {renderMilestoneUI()}
              </div>
            </div>
          </div>
        </div>

        {/* 🗺️ 사냥터 UI */}
        <h3 style={{ color: '#fbbf24', margin: '15px 0 10px 5px', fontSize: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>🗺️ 점령 영지 현황 (전투력 매칭)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '25px' }} className="grid-hunts">
          {hunts.map(h => {
            const isActive = !currentHuntData.isSpecial && currentHuntData.name === h.name;
            const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.reqSum;
            return (
              <div key={h.name} className={isActive ? 'hunt-active' : ''} style={{ background: 'rgba(15, 18, 25, 0.8)', border: `1px solid ${isUnlocked ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.1)'}`, padding: '12px 8px', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center', opacity: isUnlocked ? 1 : 0.4 }}>
                <b style={{ color: isActive ? '#fff' : (isUnlocked ? '#06b6d4' : '#666'), fontSize: '12px', marginBottom: '5px' }}>{isActive ? '⚔️ ' : ''}{h.name}</b>
                {h.name !== '초원 영지' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '4px', fontSize: '10px', color: '#ccc', marginBottom: '5px' }}>
                    <div>공 <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444'}}>{h.req.atk}</span></div>
                    <div>체 <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444'}}>{h.req.hp}</span></div>
                    <div>방 <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444'}}>{h.req.def}</span></div>
                    <div>명 <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444'}}>{h.req.acc}</span></div>
                  </div>
                )}
                <div style={{ fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '5px' }}>
                  <div style={{ color: isUnlocked ? '#ccc' : '#666' }}>강화 총합 <span style={{color: isUnlocked ? '#fff' : '#666', fontWeight: 'bold'}}>{h.reqSum}</span></div>
                  <div style={{ color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', marginTop: '2px' }}>수익 X{h.mult}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ⚔️ 장비 무기고 */}
        <h3 style={{ color: '#fbbf24', margin: '20px 0 10px 5px', fontSize: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>⚔️ 신화 무기고 강화 (총합: <span style={{color: '#fff'}}>{totalGearLevel}강</span>)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }} className="gears-grid">
          {gears.map((g) => {
            const isMax = g.lvl >= 30;
            const timerKey = g.id;
            return (
              <div key={g.id} className={`glass-panel ${anims[g.id] ? `anim-${anims[g.id]}` : ''}`} style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 0, borderTop: '4px solid rgba(197,160,89,0.8)' }}>
                <div className="img-box-gear">
                  {/* 🚨 절대경로 이미지 엔진 완벽 가동 */}
                  <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt={g.name} onError={(e) => handleImageError(e, g.emoji)} />
                </div>
                <div style={{ fontSize: '11px', color: '#c5a059', fontWeight: 'bold', marginTop: '8px' }}>[{g.stat}: {(g.lvl * g.base).toFixed(1)}{g.unit}]</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', margin: '4px 0', color: '#fff', textAlign: 'center' }}>{g.name} <br/><span style={{ color: '#fbbf24' }}>+{g.lvl}</span></div>
                <div style={{ color: '#ccc', fontSize: '11px', lineHeight: '1.4', textAlign: 'center' }}>
                  확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `80.0%`}</span><br/>
                  비용: <span style={{color: '#fff'}}>{isMax ? 'MAX' : getCost(g.lvl, gears[5].lvl).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '100%', gap: '6px', marginTop: '10px' }}>
                  <button onClick={() => handleUpgrade('gear', g.id)} disabled={isMax} className="action-btn" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid #fbbf24' }}>강화</button>
                  <button onClick={() => toggleAuto('gear', g.id)} disabled={isMax} className="action-btn" style={{ background: autoActive[timerKey] ? 'rgba(6,182,212,0.3)' : 'rgba(0,0,0,0.4)', color: autoActive[timerKey] ? '#06b6d4' : '#aaa', border: `1px solid ${autoActive[timerKey] ? '#06b6d4' : '#555'}` }}>{autoActive[timerKey] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 🐉 신수 및 영지 */}
        {['pet', 'castle'].map(type => {
          const isPet = type === 'pet'; 
          const isUnlocked = isPet ? isPetUnlocked : isCastleUnlocked; 
          const lvl = isPet ? state.petLevel : state.castleLevel; const name = isPet ? (isPetUnlocked ? '고대 황금 드래곤' : '신수 (잠김)') : (isCastleUnlocked ? '위대한 군주의 성' : '영지 (잠김)');
          const img = isPet ? 'pet.png' : 'castle.png';
          const isMax = lvl >= 50; const cost = isPet ? getPetCost(lvl, gears[5].lvl) : getCastleCost(lvl, gears[5].lvl);
          const huntEndTime = isPet ? state.petHuntEndTime : state.castleHuntEndTime;
          const isHunting = huntEndTime > Date.now();
          const timerKey = type;

          return (
            <div key={type} className={`glass-panel ${anims[type] ? `anim-${anims[type]}` : ''}`} style={{ position: 'relative', overflow: 'hidden', padding: '20px', marginTop: '15px', marginBottom: 0 }}>
              {!isUnlocked && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px', padding: '10px 20px', border: '1px solid #fbbf24', borderRadius: '6px', background: 'rgba(0,0,0,0.9)' }}>
                    🔒 {isPet ? '장비 총합 210강 달성 시 개방' : '펫 50강 달성 시 개방'}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="img-box-gear" style={{ width: '70px', height: '70px', fontSize: '40px' }}>
                  <img src={`${process.env.PUBLIC_URL}/${img}`} alt={name} onError={(e) => handleImageError(e, isPet?'🐉':'🏰')} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '18px' }}>{name} <span style={{ color: '#fff', fontSize: '14px' }}>Lv.{lvl}</span></h3>
                  <div style={{ fontSize: '12px', color: '#ccc', margin: '5px 0', lineHeight: '1.4' }}>
                    수익 보너스: <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>+{(isPet ? state.petLevel * 3 : state.castleLevel * 5) + (isPet ? petMilestone : castleMilestone)}%</span><br/>
                    확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `80.0%`}</span> | 비용: <span style={{color: '#fff'}}>{isMax ? 'MAX' : cost.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={() => handleUpgrade(type)} disabled={!isUnlocked || isMax} className="action-btn" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444' }}>강화</button>
                    <button onClick={() => toggleAuto(type)} disabled={!isUnlocked || isMax} className="action-btn" style={{ background: autoActive[timerKey] ? 'rgba(6,182,212,0.3)' : 'rgba(0,0,0,0.4)', color: autoActive[timerKey] ? '#06b6d4' : '#aaa', border: `1px solid ${autoActive[timerKey] ? '#06b6d4' : '#555'}` }}>{autoActive[timerKey] ? 'STOP' : 'AUTO'}</button>
                  </div>
                  
                  {isMax && (
                    <button onClick={() => startSpecialHunt(type)} disabled={isHunting} className="action-btn" style={{ width: '100%', marginTop: '8px', background: isHunting ? '#333' : 'rgba(147,51,234,0.3)', color: isHunting ? '#888' : '#a855f7', border: `1px solid ${isHunting ? '#444' : '#a855f7'}` }}>
                      {isHunting ? '특수 사냥 진행 중 ⚔️' : `${isPet ? '🐉 둥지 사냥 (12h / X30)' : '🏰 천공 사냥 (12h / X50)'}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🏆 랭킹 리스트 */}
      {state.isRankingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ background: 'rgba(20,20,25,0.95)', border: '2px solid #fbbf24', padding: '30px 20px', borderRadius: '15px', width: '95%', maxWidth: '420px', boxShadow: '0 0 30px rgba(251,191,36,0.3)' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', marginBottom: '25px', fontSize: '26px', fontWeight: '900', letterSpacing: '2px' }}>👑 RANKING</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6d5b8', fontSize: '14px', marginBottom: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>순위</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>호칭</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>사령관명</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>강화총합</th>
                </tr>
              </thead>
              <tbody>
                {mockRankings.map(r => (
                  <tr key={r.rank} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: r.isMe ? 'rgba(251,191,36,0.15)' : 'transparent' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold', color: r.rank === 1 ? '#fbbf24' : '#fff' }}>{r.rank}</td>
                    <td style={{ padding: '12px 10px', color: '#06b6d4', fontSize: '12px', fontWeight: 'bold' }}>[{r.title}]</td>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{r.name} {r.isMe ? '⭐' : ''}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fbbf24', fontWeight: 'bold' }}>{r.power}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ color: '#aaa', fontSize: '11px', textAlign: 'center', margin: '15px 0' }}>※ 매주 월요일 자동 정산 완료 후 기금이 정산됩니다.</div>
            <button onClick={() => setState(s => ({...s, isRankingOpen: false}))} className="action-btn" style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #555' }}>명단 닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}