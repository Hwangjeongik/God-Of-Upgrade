import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import './App.css'; 

// 🔥 [사전등록 스위치] false로 두면 바로 본 게임으로 진입합니다!
const IS_PRE_REGISTRATION = false; 

export default function App() {
  const hunts = useMemo(() => [
    { name: '초원', mult: 1, req: { atk: 0, hp: 0, def: 0, acc: 0, sum: 0 } },
    { name: '숲', mult: 1.5, req: { atk: 50, hp: 500, def: 25, acc: 10, sum: 25 } },
    { name: '사막', mult: 2.5, req: { atk: 100, hp: 1000, def: 50, acc: 20, sum: 55 } },
    { name: '정글', mult: 5, req: { atk: 170, hp: 1700, def: 75, acc: 34, sum: 90 } },
    { name: '화산', mult: 12, req: { atk: 230, hp: 2300, def: 115, acc: 46, sum: 125 } }
  ], []);

  const [state, setState] = useState({
    screen: 'wallet', 
    walletAddress: "",
    balance: 0,          
    pendingGOU: 0,        
    lastClaimTime: Date.now(), 
    burned: 0, 
    currentHunt: '초원',
    autoTimers: {},
    userName: "사령관", userTitle: "견습 기사",
    petActive: false,    
    petLevel: 0,         
    petName: "고대 황금 드래곤", 
    castleActive: false, 
    castleLevel: 0,      
    castleName: "위대한 군주의 성", 
    inviteCount: 0
  });

  const [gears, setGears] = useState([
    { id: 'weapon', name: '성검 엑스칼리버', lvl: 0, stat: '공격력', base: 10, imgFile: '/weapon.png', emoji: '⚔️' },
    { id: 'helmet', name: '사자왕의 투구', lvl: 0, stat: '체력', base: 100, imgFile: '/helmet.png', emoji: '🪖' },
    { id: 'armor', name: '성기사의 갑옷', lvl: 0, stat: '방어력', base: 5, imgFile: '/armor.png', emoji: '🛡️' },
    { id: 'gloves', name: '용기사의 장갑', lvl: 0, stat: '명중률', base: 2, imgFile: '/gloves.png', emoji: '🧤' },
    { id: 'shoes', name: '바람의 장화', lvl: 0, stat: 'GOU 획득량', base: 5, imgFile: '/shoes.png', emoji: '👢' },
    { id: 'necklace', name: '현자의 목걸이', lvl: 0, stat: '강화비용감소', base: 0.5, imgFile: '/necklace.png', emoji: '📿' },
    { id: 'ring', name: '행운의 반지', lvl: 0, stat: '강화성공확률', base: 0.1, imgFile: '/ring.png', emoji: '💍' }
  ]);

  const stateRef = useRef(state); const gearsRef = useRef(gears);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { gearsRef.current = gears; }, [gears]);

  const [modals, setModals] = useState({ guide: false });
  const [timeLeftStr, setTimeLeftStr] = useState("12:00:00");

  const getPetBonus = useCallback((lvl) => { let b = 100 + (lvl * 2); if (lvl>=10) b+=30; if (lvl>=20) b+=50; if (lvl>=30) b+=100; if (lvl>=40) b+=200; if (lvl>=50) b+=500; return b; }, []);
  const getCastleBonus = useCallback((lvl) => { let b = 200 + (lvl * 5); if (lvl>=10) b+=50; if (lvl>=20) b+=100; if (lvl>=30) b+=200; if (lvl>=40) b+=500; if (lvl>=50) b+=1500; return b; }, []);

  const calculateBaseCost = (lvl, startBase) => {
    const effectiveLvl = Math.max(1, lvl + 1); 
    const tier = Math.floor((effectiveLvl - 1) / 10); 
    const step = ((effectiveLvl - 1) % 10) + 1;       
    return step * Math.pow(10, tier) * startBase; 
  };

  const getCost = useCallback((lvl, nLvl) => { return Math.floor(calculateBaseCost(lvl, 1000) * (1 - (nLvl * 0.005))); }, []);
  const getPetCost = useCallback((lvl, nLvl) => { return Math.floor(calculateBaseCost(lvl, 1000) * (1 - (nLvl * 0.005))); }, []);
  const getCastleCost = useCallback((lvl, nLvl) => { return Math.floor(calculateBaseCost(lvl, 10000) * (1 - (nLvl * 0.005))); }, []);

  // 🚨 [사령관 전용 마스터 스위치] (테스트넷 90% 치트키 활성화)
  const IS_TEST_MODE = true;

  const getRate = useCallback((lvl, rLvl) => IS_TEST_MODE ? 0.9 : Math.min(0.99, 0.7 - (lvl * 0.01) + (rLvl * 0.001)), []);
  const getPetRate = useCallback((lvl, rLvl) => IS_TEST_MODE ? 0.9 : Math.min(0.99, 0.6 - (lvl * 0.01) + (rLvl * 0.001)), []);
  const getCastleRate = useCallback((lvl, rLvl) => IS_TEST_MODE ? 0.9 : Math.min(0.99, 0.5 - (lvl * 0.01) + (rLvl * 0.001)), []);

  const checkHunt = useCallback((stats, sObj) => {
    const found = hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum);
    return found || hunts[0];
  }, [hunts]);

  const claimGOU = () => {
    if (state.pendingGOU <= 0) { alert("획득할 GOU가 없습니다."); return; }
    const harvested = state.pendingGOU;
    setState(s => ({ ...s, balance: s.balance + harvested, pendingGOU: 0, lastClaimTime: Date.now() }));
    alert(`💰 ${Math.floor(harvested).toLocaleString()} GOU를 획득했습니다!`);
  };

  const handleUpgrade = useCallback((type, targetId) => {
    const gState = stateRef.current;
    const gList = gearsRef.current;
    let cost = 0; let prob = 0;
    
    if (type === 'gear') {
      const gear = gList.find(g => g.id === targetId);
      cost = getCost(gear.lvl, gList[5].lvl);
      prob = getRate(gear.lvl, gList[6].lvl);
      if (gState.balance < cost) { alert("💰 GOU가 부족합니다! (수확을 눌러 자금을 모으세요)"); return; }
      
      setState(s => ({ ...s, balance: s.balance - cost }));
      if (Math.random() < prob) {
        setGears(prev => {
          const next = prev.map(g => g.id === targetId ? { ...g, lvl: g.lvl + 1 } : g);
          if (next.every(g => g.lvl >= 30) && !gState.petActive) {
            setState(s => ({ ...s, petActive: true }));
            alert("🎉 장비 ALL 30강 달성! 신수(Pet)가 개방되었습니다!");
          }
          return next;
        });
      }
    } 
    else if (type === 'pet') {
      cost = getPetCost(gState.petLevel, gList[5].lvl);
      prob = getPetRate(gState.petLevel, gList[6].lvl);
      if (gState.balance < cost) return;
      setState(s => ({ ...s, balance: s.balance - cost }));
      if (Math.random() < prob) {
        setState(s => {
          const nextLvl = s.petLevel + 1;
          const unlockCastle = nextLvl >= 50 && !s.castleActive;
          if (unlockCastle) alert("🏰 펫 50강 달성! 위대한 군주의 성이 개방되었습니다!");
          return { ...s, petLevel: nextLvl, castleActive: s.castleActive || unlockCastle };
        });
      }
    } 
    else if (type === 'castle') {
      cost = getCastleCost(gState.castleLevel, gList[5].lvl);
      prob = getCastleRate(gState.castleLevel, gList[6].lvl);
      if (gState.balance < cost) return;
      setState(s => ({ ...s, balance: s.balance - cost }));
      if (Math.random() < prob) { setState(s => ({ ...s, castleLevel: s.castleLevel + 1 })); }
    }
  }, [getCost, getRate, getPetCost, getPetRate, getCastleCost, getCastleRate]);

  const toggleAuto = useCallback((type, targetId) => {
    const id = targetId || type;
    setState(s => {
      const next = { ...s.autoTimers };
      if (next[id]) { clearInterval(next[id]); delete next[id]; } 
      else { next[id] = setInterval(() => handleUpgrade(type, targetId), 500); }
      return { ...s, autoTimers: next };
    });
  }, [handleUpgrade]);

  useEffect(() => {
    if (state.screen === 'wallet' || state.screen === 'connecting') return;
    const timer = setInterval(() => {
      const s = stateRef.current; const g = gearsRef.current;
      const elapsedMiningTime = Date.now() - s.lastClaimTime;
      const remainingMs = Math.max(0, (12 * 60 * 60 * 1000) - elapsedMiningTime);
      
      const h = Math.floor(remainingMs / 3600000).toString().padStart(2, '0');
      const m = Math.floor((remainingMs % 3600000) / 60000).toString().padStart(2, '0');
      setTimeLeftStr(`${h}:${m}:${Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0')}`);

      if (IS_PRE_REGISTRATION) return; 

      const minL = Math.min(...g.map(x => x.lvl));
      const tBonusPct = (g[4].lvl * 5) + (minL >= 30 ? 1000 : minL >= 20 ? 300 : minL >= 10 ? 100 : 0) + (s.petActive ? getPetBonus(s.petLevel) : 0) + (s.castleActive ? getCastleBonus(s.castleLevel) : 0);
      const stats = { atk: g[0].lvl * g[0].base, hp: g[1].lvl * g[1].base, def: g[2].lvl * g[2].base, acc: g[3].lvl * g[3].base, sum: g.reduce((a, b) => a + b.lvl, 0) };
      const best = checkHunt(stats, s);
      
      const gainPerSec = (300000 * best.mult * (1 + tBonusPct / 100)) / 86400;
      setState(prev => ({ ...prev, currentHunt: best.name, pendingGOU: prev.pendingGOU + gainPerSec }));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.screen, getPetBonus, getCastleBonus, checkHunt]);

  const selectWallet = () => {
    setState(s => ({ ...s, screen: 'connecting' }));
    setTimeout(() => { setState(s => ({ ...s, screen: IS_PRE_REGISTRATION ? 'pre_reg' : 'game', walletAddress: `EQD...${Math.floor(1000 + Math.random() * 9000)}` })); }, 1000);
  };

  if (state.screen === 'connecting') return (<div style={{ background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><h2>지갑 연결 중...</h2></div>);

  if (state.screen === 'wallet') {
    return (
      <div style={{ background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
        <h1>GOD OF UPGRADE</h1>
        <button onClick={selectWallet} style={{ background: '#0098EA', color: '#fff', border: 'none', padding: '15px 40px', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', marginTop: '20px' }}>지갑 연결하기</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#111', color: '#e6d5b8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '80px' }}>
      <style>{`
        * { box-sizing: border-box; }
        .glass-panel { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; }
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 10px; border-radius: 6px; cursor: pointer; width: 100%; font-weight: bold; }
        .btn-neon:disabled { border-color: #555; color: #555; cursor: not-allowed; }
        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; padding: 0 10px; }
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
      `}</style>

      {/* 상단바 */}
      <div style={{ width: '100%', position: 'sticky', top: 0, background: '#000', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', zIndex: 100, borderBottom: '1px solid #fbbf24' }}>
        <div><div style={{ fontSize: '11px', color: '#06b6d4' }}>{state.walletAddress}</div><div style={{ fontWeight: 'bold' }}>[{state.userTitle}] {state.userName}</div></div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>{Math.floor(state.balance).toLocaleString()} GOU</div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '15px 10px' }}>
        
        {/* 수확 시스템 패널 */}
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', marginBottom: '15px', border: '2px solid #fbbf24' }}>
          <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '5px' }}>현재 사냥터: <span style={{color: '#a855f7', fontWeight:'bold'}}>{state.currentHunt}</span></div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>{Math.floor(state.pendingGOU).toLocaleString()} GOU</div>
          <div style={{ fontSize: '12px', color: '#06b6d4', margin: '10px 0', fontWeight: 'bold' }}>{timeLeftStr} 남음</div>
          <button onClick={claimGOU} className="btn-neon" style={{ background: '#fbbf24', color: '#000' }}>수확하기 (자금 획득)</button>
        </div>
        
        {/* 지갑/백서 관리 패널 */}
        <div className="glass-panel" style={{ padding: '15px', marginBottom: '20px', border: '1px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}><TonConnectButton /></div>
          <button onClick={() => setModals(m => ({ ...m, guide: true }))} className="btn-neon" style={{ borderColor: '#06b6d4', color: '#06b6d4' }}>📜 게임 백서 보기</button>
        </div>

        {/* 장비 그리드 (풀버전UI) */}
        <div className="gears-grid">
          {gears.map((g) => {
            const isMax = g.lvl >= 30; 
            return (
              <div key={g.id} className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '30px', margin: '10px 0' }}>{g.emoji}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', margin: '5px 0' }}>{g.name} <span style={{color: '#fbbf24'}}>+{g.lvl}</span></div>
                <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>
                  확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%`}</span><br/>
                  비용: {isMax ? 'MAX' : getCost(g.lvl, gears[5].lvl).toLocaleString()}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => handleUpgrade('gear', g.id)} disabled={isMax} className="btn-neon" style={{fontSize: '11px', padding: '6px'}}>{isMax ? 'MAX' : '강화'}</button>
                  <button onClick={() => toggleAuto('gear', g.id)} disabled={isMax} className="btn-neon" style={{fontSize: '11px', padding: '6px'}}>{state.autoTimers[g.id] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 펫 & 성 강화 구역 (풀버전UI) */}
        <div style={{ marginTop: '20px' }}>
          {['pet', 'castle'].map(type => {
            const isPet = type === 'pet';
            const isActive = isPet ? state.petActive : state.castleActive;
            const lvl = isPet ? state.petLevel : state.castleLevel;
            const isMax = lvl >= 50;
            const name = isPet ? state.petName : state.castleName;
            if (!isActive) return null;
            return (
              <div key={type} className="glass-panel" style={{ padding: '15px', textAlign: 'center', marginBottom: '15px', border: isPet ? '1px solid #a855f7' : '1px solid #ef4444' }}>
                <h3 style={{ color: isPet ? '#a855f7' : '#ef4444', margin: '0 0 10px 0' }}>{name} Lv.{lvl}</h3>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>
                  비용: {isMax ? 'MAX' : (isPet ? getPetCost(lvl, gears[5].lvl) : getCastleCost(lvl, gears[5].lvl)).toLocaleString()} | 확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(isPet ? getPetRate(lvl, gears[6].lvl) : getCastleRate(lvl, gears[6].lvl))*100}%`}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleUpgrade(type)} disabled={isMax} className="btn-neon" style={{ flex: 1, borderColor: isPet ? '#a855f7' : '#ef4444', color: isPet ? '#a855f7' : '#ef4444' }}>{isPet ? '펫' : '성'} 강화</button>
                  <button onClick={() => toggleAuto(type)} disabled={isMax} className="btn-neon" style={{ flex: 1 }}>{state.autoTimers[type] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📜 사령관님의 게임 백서 */}
      {modals.guide && (
        <div className="modal-overlay" style={{ overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '25px', background: 'rgba(15, 15, 20, 0.98)', border: '2px solid #fbbf24', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', borderBottom: '1px solid #333', paddingBottom: '15px' }}>👑 GOD OF UPGRADE 백서</h2>
            <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6' }}>
              <p>• <b>하이퍼 디플레이션 시스템:</b> 강화 실패 시 코인은 소각, 유동성, 잭팟으로 자동 분배됩니다.</p>
              <p>• <b>시즌 보상 (JACKPOT):</b> 성 50강 달성자 ➔ 펫 50강 달성자 ➔ ALL 30강 달성자 순으로 누적 상금을 1/N 균등 분배합니다.</p>
            </div>
            <button onClick={() => setModals(m => ({ ...m, guide: false }))} className="btn-neon" style={{ marginTop: '20px' }}>백서 닫기</button>
          </div>
        </div>
      )}

    </div>
  );
}