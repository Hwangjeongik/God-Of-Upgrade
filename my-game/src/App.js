import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { app } from './firebase'; 

const MAX_SUPPLY = 10000000000; 
const HALVING_BURN_THRESHOLD = MAX_SUPPLY * 0.2; 

export default function App() {
  // 1. 사냥터 영토 데이터 (강화 총합 요구치로 변경)
  const hunts = useMemo(() => [
    {name: '초원 영지', mult: 1, reqSum: 0},
    {name: '신의 숲', mult: 1.5, reqSum: 35},
    {name: '불멸 사막', mult: 2.5, reqSum: 70},
    {name: '심연 정글', mult: 5, reqSum: 110},
    {name: '황혼 화산', mult: 12, reqSum: 150}
  ], []);

  const [state, setState] = useState({ 
    screen: 'wallet', 
    walletAddress: '',
    balance: 50000000000, 
    burned: 1999000000, 
    jackpot: 50000000, 
    
    // ⏳ 수확 및 타이머 시스템
    pendingGOU: 0,
    unclaimedTime: 0, // 초 단위 누적 (최대 43200초 = 12시간)

    autoTimers: {},
    userName: "사령관", 
    userTitle: "견습 기사",
    isRankingOpen: false,
    
    petActive: true, 
    petLevel: 49, 
    petName: "고대 황금 드래곤",
    
    castleActive: false, 
    castleLevel: 0, 
    castleName: "위대한 군주의 성",

    isAdActive: false,
    adTimeLeft: 0
  });

  // 7부위 장비 체제 (방패 삭제)
  const [gears, setGears] = useState([
    {id: 'sword', name: '성검 엑스칼리버', lvl: 30, stat: '공격력', base: 10, unit: '', emoji: '⚔️'},
    {id: 'armor', name: '성기사의 갑옷', lvl: 30, stat: '체력', base: 100, unit: '', emoji: '👕'},
    {id: 'helmet', name: '사자왕의 투구', lvl: 30, stat: '방어력', base: 5, unit: '', emoji: '🪖'},
    {id: 'gloves', name: '용기사의 장갑', lvl: 30, stat: '명중률', base: 2, unit: '', emoji: '🧤'},
    {id: 'boots', name: '바람의 장화', lvl: 30, stat: 'GOU 획득량', base: 5, unit: '%', emoji: '👢'},
    {id: 'necklace', name: '현자의 목걸이', lvl: 30, stat: '강화비용감소', base: 0.5, unit: '%', emoji: '📿'},
    {id: 'ring', name: '행운의 반지', lvl: 30, stat: '강화성공확률', base: 0.1, unit: '%', emoji: '💍'}
  ]);

  const [anims, setAnims] = useState({});
  const wallet = useTonWallet();

  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => setAnims(prev => ({ ...prev, [id]: null })), 500);
  }, []);

  const totalGearLevel = gears.reduce((a, b) => a + b.lvl, 0); // ⚔️ 진입 스펙: 강화 총합
  const setBonus = totalGearLevel >= 210 ? 1000 : totalGearLevel >= 140 ? 300 : totalGearLevel >= 70 ? 100 : 0;

  const getPetBonus = useCallback((lvl) => {
    let b = 100 + (lvl * 2);
    if (lvl >= 10) b += 30; if (lvl >= 20) b += 50; if (lvl >= 30) b += 100;
    if (lvl >= 40) b += 200; if (lvl >= 50) b += 500; return b;
  }, []);

  const getCastleBonus = useCallback((lvl) => {
    let b = 200 + (lvl * 5);
    if (lvl >= 10) b += 50; if (lvl >= 20) b += 100; if (lvl >= 30) b += 200;
    if (lvl >= 40) b += 500; if (lvl >= 50) b += 1500; return b;
  }, []);

  const petBonus = state.petActive ? getPetBonus(state.petLevel) : 0;
  const castleBonus = state.castleActive ? getCastleBonus(state.castleLevel) : 0;
  const totalBonusPct = (gears[4].lvl * gears[4].base) + setBonus + petBonus + castleBonus; // 4번: 장화

  const isHalving = state.burned >= HALVING_BURN_THRESHOLD;
  const halvingMult = isHalving ? 0.5 : 1.0;
  const adMultiplier = state.isAdActive ? 2.0 : 1.0;

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

  const currentHuntData = hunts.slice().reverse().find(h => totalGearLevel >= h.reqSum) || hunts[0];
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * halvingMult * adMultiplier);

  // 시간 포맷 변환 함수
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    if (wallet) {
      const address = wallet.account.address;
      setState(s => ({ ...s, walletAddress: address.substring(0, 6) + '...' + address.substring(address.length - 4), screen: 'game' }));
    } else {
      setState(s => ({ ...s, screen: 'wallet' }));
    }
  }, [wallet]);

  const getUserId = () => window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? String(window.Telegram.WebApp.initDataUnsafe.user.id) : "test_commander_123";

  // 수확 버튼 액션
  const claimGOU = async () => {
    const functions = getFunctions(app);
    const claimFunction = httpsCallable(functions, 'claimGOU');
    try {
      const result = await claimFunction({ userId: getUserId(), currentMultiplier: currentHuntData.mult * adMultiplier });
      const data = result.data;
      if (data.success) {
        setState(s => ({ ...s, balance: s.balance + data.harvestedAmount, pendingGOU: 0, unclaimedTime: 0 }));
        triggerAnim('claim', 'success');
        alert(`🎉 ${data.message}`);
      } else alert(data.message);
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
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: g.lvl + 1 } : g));
        else if (type === 'pet') setState(s => ({ ...s, petLevel: s.petLevel + 1 }));
        else if (type === 'castle') setState(s => ({ ...s, castleLevel: s.castleLevel + 1 }));
      } else {
        triggerAnim(id || type, 'fail');
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: Math.max(0, g.lvl - 1) } : g));
        else if (type === 'pet') setState(s => ({ ...s, petLevel: Math.max(0, s.petLevel - 1) }));
        else if (type === 'castle') setState(s => ({ ...s, castleLevel: Math.max(0, s.castleLevel - 1) }));
      }
    } catch (error) {
      alert(`강화 통신 실패: ${error.message}`);
    }
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

  // 12시간 방치 타이머 가동 엔진
  useEffect(() => {
    if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }

    const timer = setInterval(() => {
      setState(s => {
        const gainPerSec = ((300000 * currentHuntData.mult * (1 + totalBonusPct / 100)) / 86400) * halvingMult * (s.isAdActive ? 2.0 : 1.0);
        
        // 12시간 (43200초) 로직
        let newUnclaimed = s.unclaimedTime + 1;
        let gainToApply = gainPerSec;
        
        if (newUnclaimed > 43200) {
          newUnclaimed = 43200; // 12시간 도달 시 시간 멈춤
          gainToApply = 0; // 코인 생산 중단
        }

        let nextAdActive = s.isAdActive;
        let nextAdTime = s.adTimeLeft;
        if (s.isAdActive && s.adTimeLeft > 0) {
          nextAdTime = s.adTimeLeft - 1;
          if (nextAdTime <= 0) nextAdActive = false;
        }

        return { 
          ...s, 
          pendingGOU: s.pendingGOU + gainToApply,
          unclaimedTime: newUnclaimed,
          isAdActive: nextAdActive,
          adTimeLeft: nextAdTime
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentHuntData, totalBonusPct, halvingMult]);

  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.7), rgba(26, 15, 20, 0.9)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <h1 style={{ color: '#fbbf24', fontSize: '32px', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>GOD OF UPGRADE</h1>
        <p style={{ margin: '10px 0 30px 0', color: '#aaa', textAlign: 'center', fontSize: '13px' }}>TON 지갑을 연결하여 영지를 활성화하십시오.</p>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px' }}><TonConnectButton /></div>
      </div>
    );
  }

  const timeProgress = (state.unclaimedTime / 43200) * 100;

  return (
    <div className="main-wrap" style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.6), rgba(26, 15, 20, 0.8)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e6d5b8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0px'
    }}>
      <style>{`
        * { box-sizing: border-box; font-family: 'Pretendard', sans-serif; }
        .sticky-header { position: sticky; top: 0; width: 100%; max-width: 850px; background: rgba(11, 15, 25, 0.95); backdrop-filter: blur(10px); border-bottom: 2px solid #fbbf24; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.8); }
        @keyframes flashSuccess { 0% { background: rgba(251, 191, 36, 0.4); } 100% { background: transparent; } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.4); } 100% { background: transparent; } }
        .anim-success { animation: flashSuccess 0.5s ease-out; }
        .anim-fail { animation: flashFail 0.4s ease-out; }
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .btn-auto-on { background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid #06b6d4; }
        .glass-panel { background: rgba(20, 24, 32, 0.85); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .img-box-gear { width: 60px; height: 60px; background: rgba(0,0,0,0.6); border: 1px solid rgba(197,160,89,0.5); border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 32px; box-shadow: inset 0 0 10px rgba(197,160,89,0.2); }
        .action-btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 14px; transition: 0.2s; }
        @media (max-width: 768px) {
          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
        }
      `}</style>

      {/* 🚀 상단 고정 헤더 */}
      <div className="sticky-header">
        <div>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold' }}>{state.walletAddress || "지갑 연결됨"}</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>[{state.userTitle}] {state.userName}</div>
        </div>
        <button onClick={() => setState(s => ({...s, isRankingOpen: true}))} style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: '1px solid #fbbf24', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>🏆 랭킹</button>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '20px 10px 80px 10px' }}>
        
        {/* 💰 코어 자산 대시보드 (입출금 및 수확 버튼 배치) */}
        <div className={`glass-panel ${anims['claim'] ? 'anim-success' : ''}`} style={{ textAlign: 'center', padding: '30px 20px', border: '2px solid #fbbf24' }}>
          <div style={{ color: '#aaa', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>보유 자산 (GOU)</div>
          <div style={{ fontSize: '42px', fontWeight: '900', color: '#fbbf24', textShadow: '0 0 15px rgba(251,191,36,0.6)', letterSpacing: '1px' }}>
            {Math.floor(state.balance).toLocaleString()}
          </div>
          
          {/* 입금 / 출금 버튼 */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px', marginBottom: '25px' }}>
            <button className="action-btn" onClick={() => alert('스마트 컨트랙트 입금 준비 중입니다.')} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', maxWidth: '120px' }}>📥 입금하기</button>
            <button className="action-btn" onClick={() => alert('스마트 컨트랙트 출금 준비 중입니다.')} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', maxWidth: '120px' }}>📤 출금하기</button>
          </div>

          {/* 12시간 방치형 게이지 및 수확 버튼 */}
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
              <span style={{ color: '#06b6d4' }}>미수확 GOU: +{Math.floor(state.pendingGOU).toLocaleString()}</span>
              <span style={{ color: state.unclaimedTime >= 43200 ? '#ef4444' : '#aaa' }}>
                {state.unclaimedTime >= 43200 ? "MAX (생산 중단)" : formatTime(state.unclaimedTime) + " / 12:00:00"}
              </span>
            </div>
            {/* 프로그레스 바 */}
            <div style={{ width: '100%', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
              <div style={{ width: `${timeProgress}%`, height: '100%', background: state.unclaimedTime >= 43200 ? '#ef4444' : '#06b6d4', transition: 'width 1s linear' }}></div>
            </div>
            <button onClick={claimGOU} style={{ width: '100%', background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: '#000', border: 'none', borderRadius: '8px', padding: '16px 0', fontSize: '18px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 15px rgba(217,119,6,0.4)' }}>
              🚀 영지 수확하기
            </button>
          </div>
        </div>

        {/* 📈 스탯 및 광고 보너스 패널 */}
        <div style={{ display: 'flex', gap: '15px', width: '100%', marginBottom: '20px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
          <div style={{ flex: 1, background: 'rgba(6,182,212,0.1)', border: '1px solid #06b6d4', padding: '15px', borderRadius: '10px' }}>
            <div style={{ color: '#06b6d4', fontWeight: 'bold', fontSize: '12px' }}>📈 일일 총 획득 속도</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '22px', margin: '5px 0' }}>+{dailyGainDisplay.toLocaleString()} GOU</div>
            <button onClick={watchAdAndDouble} style={{ marginTop: '5px', width: '100%', background: state.isAdActive ? '#10b981' : '#ef4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
              {state.isAdActive ? `⏳ 버프 적용 중 (${formatTime(state.adTimeLeft)})` : "📺 광고 보고 획득량 2배 (1시간)"}
            </button>
          </div>
          <div style={{ flex: 1, background: 'rgba(197,160,89,0.1)', border: '1px solid #c5a059', padding: '15px', borderRadius: '10px' }}>
            <div style={{ color: '#c5a059', fontWeight: 'bold', fontSize: '12px' }}>⚔️ 통합 보너스 수치</div>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '22px', margin: '5px 0' }}>+{totalBonusPct}%</div>
            <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.4' }}>
              • 합산 {totalGearLevel}강 세트 버프: <span style={{color: '#fff'}}>+{setBonus}%</span><br/>
              • 장화 버프: <span style={{color: '#fff'}}>+{gears[4].lvl * gears[4].base}%</span> | 신수 버프: <span style={{color: '#fff'}}>+{petBonus}%</span>
            </div>
          </div>
        </div>

        {/* 🗺️ 사냥터 UI (합산 강화 수치 기준) */}
        <h3 style={{ color: '#fbbf24', margin: '15px 0 10px 5px', fontSize: '16px' }}>🗺️ 점령 영지 현황 (강화 총합 매칭)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '25px' }} className="grid-hunts">
          {hunts.map(h => {
            const isActive = state.currentHunt === h.name;
            const isUnlocked = totalGearLevel >= h.reqSum;
            return (
              <div key={h.name} style={{ background: isActive ? 'rgba(217,119,6,0.25)' : 'rgba(0,0,0,0.6)', border: `1px solid ${isActive ? '#fff' : (isUnlocked ? '#06b6d4' : '#333')}`, padding: '12px 8px', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center', minHeight: '90px' }}>
                <b style={{ color: isActive ? '#fff' : (isUnlocked ? '#06b6d4' : '#666'), fontSize: '12px' }}>{isActive ? '⚔️ ' : ''}{h.name}</b>
                <div style={{ fontSize: '11px', marginTop: '10px' }}>
                  <div style={{ color: isUnlocked ? '#aaa' : '#555' }}>강화 총합 <span style={{color: isUnlocked ? '#fff' : '#555', fontWeight: 'bold'}}>{h.reqSum}</span></div>
                  <div style={{ color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', marginTop: '2px' }}>수익 X{h.mult}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ⚔️ 장비 무기고 */}
        <h3 style={{ color: '#fbbf24', margin: '20px 0 10px 5px', fontSize: '16px' }}>⚔️ 왕실 무기고 강화 (총합: <span style={{color: '#fff'}}>{totalGearLevel}강</span>)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }} className="gears-grid">
          {gears.map((g) => {
            const isMax = g.lvl >= 30;
            return (
              <div key={g.id} className={`glass-panel ${anims[g.id] ? `anim-${anims[g.id]}` : ''}`} style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0', borderTop: '4px solid #c5a059' }}>
                {/* 🚨 폴백 에모지 이미지 디자인 적용 */}
                <div className="img-box-gear">{g.emoji}</div>
                <div style={{ fontSize: '11px', color: '#c5a059', fontWeight: 'bold', marginTop: '8px' }}>[{g.stat}: {(g.lvl * g.base).toFixed(1)}{g.unit}]</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0', color: '#fff' }}>{g.name} <span style={{ color: '#fbbf24' }}>+{g.lvl}</span></div>
                <div style={{ color: '#aaa', fontSize: '11px', lineHeight: '1.4', textAlign: 'center' }}>
                  확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%`}</span><br/>
                  비용: <span style={{color: '#eee'}}>{isMax ? 'MAX' : getCost(g.lvl, gears[5].lvl).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '100%', gap: '6px', marginTop: '10px' }}>
                  <button onClick={() => handleUpgrade('gear', g.id)} disabled={isMax} className="action-btn" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid #fbbf24' }}>강화</button>
                  <button onClick={() => toggleAuto('gear', g.id)} disabled={isMax} className="action-btn" style={{ background: state.autoTimers[g.id] ? 'rgba(6,182,212,0.2)' : 'transparent', color: state.autoTimers[g.id] ? '#06b6d4' : '#888', border: `1px solid ${state.autoTimers[g.id] ? '#06b6d4' : '#555'}` }}>{state.autoTimers[g.id] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 🐉 신수 및 영지 (확률, 비용 완벽 출력) */}
        {['pet', 'castle'].map(type => {
          const isPet = type === 'pet';
          const isActive = isPet ? state.petActive : state.castleActive;
          const lvl = isPet ? state.petLevel : state.castleLevel;
          const name = isPet ? state.petName : state.castleName;
          const isMax = lvl >= 50;
          const cost = isPet ? getPetCost(lvl, gears[5].lvl) : getCastleCost(lvl, gears[5].lvl);
          const rate = isPet ? getPetRate(lvl, gears[6].lvl) : getRate(lvl, gears[6].lvl);

          return (
            <div key={type} className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '20px', marginTop: '15px' }}>
              {!isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px', padding: '10px 20px', border: '1px solid #fbbf24', borderRadius: '6px', background: '#000' }}>
                    🔒 {isPet ? '장비 총합 210강 달성 시 개방' : '펫 50강 달성 시 개방'}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="img-box-gear" style={{ width: '70px', height: '70px', fontSize: '40px' }}>{isPet ? '🐉' : '🏰'}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '18px' }}>{name} <span style={{ color: '#fff', fontSize: '14px' }}>Lv.{lvl}</span></h3>
                  <div style={{ fontSize: '12px', color: '#aaa', margin: '5px 0' }}>
                    수익 보너스: <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>+{isPet ? getPetBonus(lvl) : getCastleBonus(lvl)}%</span><br/>
                    확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(rate*100).toFixed(1)}%`}</span> | 비용: <span style={{color: '#eee'}}>{isMax ? 'MAX' : cost.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={() => handleUpgrade(type)} disabled={!isActive || isMax} className="action-btn" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444' }}>강화</button>
                    <button onClick={() => toggleAuto(type)} disabled={!isActive || isMax} className="action-btn" style={{ background: state.autoTimers[type] ? 'rgba(6,182,212,0.2)' : 'transparent', color: state.autoTimers[type] ? '#06b6d4' : '#888', border: `1px solid ${state.autoTimers[type] ? '#06b6d4' : '#555'}` }}>{state.autoTimers[type] ? 'STOP' : 'AUTO'}</button>
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