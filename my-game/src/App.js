import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * GOU3: THE KNIGHT'S TALE - FULLSCREEN SPLASH & BOTTOM NAV EDITION (v8.2.0)
 * Update: Fullscreen Splash Image, Bottom Navigation Bar, Modal Z-Index fix, UI Alignment
 */

const MAX_SUPPLY = 10000000000; 

export default function App() {
  const hunts = useMemo(() => [
    { name: '초원', mult: 1, req: { atk: 0, hp: 0, def: 0, acc: 0, sum: 0 } },
    { name: '숲', mult: 1.5, req: { atk: 50, hp: 500, def: 25, acc: 10, sum: 25 } },
    { name: '사막', mult: 2.5, req: { atk: 100, hp: 1000, def: 50, acc: 20, sum: 55 } },
    { name: '정글', mult: 5, req: { atk: 170, hp: 1700, def: 75, acc: 34, sum: 90 } },
    { name: '화산', mult: 12, req: { atk: 230, hp: 2300, def: 115, acc: 46, sum: 125 } }
  ], []);

  const [state, setState] = useState({
    screen: 'loading', 
    walletAddress: "",
    balance: 50000000000,
    burned: 1990000000, 
    jackpot: 50000000,
    lp: 0, pool: 5000000000, reserve: 0,
    mintedGOU: 2999000000,
    currentHunt: '초원',
    autoTimers: {},
    userName: "사령관", userTitle: "견습 기사",
    showTitleInput: false,

    petActive: true, petLevel: 49, petName: "고대 황금 드래곤", petHuntEndTime: 0,
    castleActive: false, castleLevel: 0, castleName: "", castleHuntEndTime: 0,

    adBuffEndTime: 0, settlementLogs: [], lastJackpotDate: null 
  });

  const [gears, setGears] = useState([
    { id: 'weapon', name: '성검 엑스칼리버', lvl: 30, stat: '공격력', base: 10, unit: '', imgFile: 'weapon.png', emoji: '⚔️' },
    { id: 'helmet', name: '사자왕의 투구', lvl: 30, stat: '체력', base: 100, unit: '', imgFile: 'helmet.png', emoji: '🪖' },
    { id: 'armor', name: '성기사의 갑옷', lvl: 30, stat: '방어력', base: 5, unit: '', imgFile: 'armor.png', emoji: '🛡️' },
    { id: 'gloves', name: '용기사의 장갑', lvl: 30, stat: '명중률', base: 2, unit: '', imgFile: 'gloves.png', emoji: '🧤' },
    { id: 'shoes', name: '바람의 장화', lvl: 30, stat: 'GOU 획득량', base: 5, unit: '%', imgFile: 'shoes.png', emoji: '👢' },
    { id: 'necklace', name: '현자의 목걸이', lvl: 30, stat: '강화비용감소', base: 0.5, unit: '%', imgFile: 'necklace.png', emoji: '📿' },
    { id: 'ring', name: '행운의 반지', lvl: 30, stat: '강화성공확률', base: 0.1, unit: '%', imgFile: 'ring.png', emoji: '💍' }
  ]);

  const [imageErrors, setImageErrors] = useState({});
  const handleImgError = (id) => setImageErrors(prev => ({ ...prev, [id]: true }));

  const [modals, setModals] = useState({ rank: false, prob: false, token: false });
  const [anims, setAnims] = useState({});

  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => { setAnims(prev => ({ ...prev, [id]: null })); }, 500);
  }, []);

  const mockRankings = [
    { rank: 1, name: "KOREA", title: "LEGENDARY GOD", power: "999,999" },
    { rank: 2, name: "UPGRADE", title: "KING OF LUCK", power: "850,200" },
    { rank: 3, name: "CHAMPION", title: "IRON KNIGHT", power: "720,500" },
    { rank: 4, name: state.userName, title: state.userTitle, power: gears.reduce((a, b) => a + b.lvl, 0), isMe: true }
  ];

  const minLvl = Math.min(...gears.map(g => g.lvl));
  const setBonus = minLvl >= 30 ? 1000 : minLvl >= 20 ? 300 : minLvl >= 10 ? 100 : 0;
  
  const currentStats = useMemo(() => ({
    atk: gears[0].lvl * gears[0].base, hp: gears[1].lvl * gears[1].base,
    def: gears[2].lvl * gears[2].base, acc: gears[3].lvl * gears[3].base,
    sum: gears.reduce((a, b) => a + b.lvl, 0)
  }), [gears]);

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
  const totalBonusPct = (gears[4].lvl * 5) + setBonus + petBonus + castleBonus;

  const getHalvingState = useCallback(() => {
    if (state.burned >= MAX_SUPPLY * 0.6) return { mult: 0.25, rates: { pool: 0.35, burn: 0.25, jackpot: 0.20, lp: 0.15, reserve: 0.05 }, step: 2 };
    if (state.burned >= MAX_SUPPLY * 0.2) return { mult: 0.50, rates: { pool: 0.40, burn: 0.25, jackpot: 0.15, lp: 0.15, reserve: 0.05 }, step: 1 };
    return { mult: 1.0, rates: { pool: 0.40, burn: 0.27, jackpot: 0.15, lp: 0.13, reserve: 0.05 }, step: 0 };
  }, [state.burned]);

  const hState = getHalvingState();

  const distributeFailure = useCallback((cost) => {
    const r = hState.rates;
    return { pool: cost * r.pool, burn: cost * r.burn, jackpot: cost * r.jackpot, lp: cost * r.lp, reserve: cost * r.reserve };
  }, [hState.rates]);

  const getCost = useCallback((lvl, nLvl) => Math.floor(((lvl < 10 ? 1000 : lvl < 20 ? 10000 : 100000) + ((lvl % 10) * 100)) * (1 - (nLvl * 0.005)) * hState.mult), [hState.mult]);
  const getPetCost = useCallback((lvl, nLvl) => Math.floor(((lvl < 9 ? 100+(lvl*10) : lvl < 19 ? 1000+((lvl%10)*100) : lvl < 29 ? 10000+((lvl%10)*1000) : lvl < 39 ? 100000+((lvl%10)*10000) : 1000000+((lvl%10)*100000))) * (1 - (nLvl * 0.005)) * hState.mult), [hState.mult]);
  const getCastleCost = useCallback((lvl, nLvl) => Math.floor(((lvl < 9 ? 1000+(lvl*100) : lvl < 19 ? 10000+((lvl%10)*1000) : lvl < 29 ? 100000+((lvl%10)*10000) : lvl < 39 ? 1000000+((lvl%10)*100000) : 10000000+((lvl%10)*1000000))) * (1 - (nLvl * 0.005)) * hState.mult), [hState.mult]);
  
  const getRate = useCallback((lvl, rLvl) => Math.min(0.99, ((lvl < 5 ? 1.0 : lvl < 10 ? 0.7 : lvl < 15 ? 0.6 : lvl < 20 ? 0.5 : [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20]) + (rLvl * 0.001))), []);
  const getPetRate = useCallback((lvl, ringLvl) => Math.min(0.99, (lvl < 5 ? 1.0 : lvl < 10 ? 0.7 : lvl < 15 ? 0.65 : lvl < 20 ? 0.6 : lvl < 25 ? 0.55 : lvl < 30 ? 0.5 : lvl < 35 ? 0.45 : lvl < 40 ? 0.4 : ([0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][lvl - 41] || 0.1)) + (ringLvl * 0.001)), []);

  const checkHunt = useCallback((stats, currentNow) => {
    if (state.castleHuntEndTime > currentNow) return { name: '🏰 제국의 심장', mult: 50, special: true };
    if (state.petHuntEndTime > currentNow) return { name: '🐉 신수의 둥지', mult: 30, special: true };
    const found = hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum);
    return { ...(found || hunts[0]), special: false };
  }, [hunts, state.castleHuntEndTime, state.petHuntEndTime]);

  const currentHuntData = checkHunt(currentStats, Date.now());
  const adMultiplier = state.adBuffEndTime > Date.now() ? 2 : 1;
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * hState.mult * adMultiplier);

  const watchAd = () => {
    alert("🎥 광고 시청 완료!\n1시간 동안 모든 GOU 획득량이 2배로 증가합니다.");
    setState(s => ({ ...s, adBuffEndTime: Date.now() + 3600000 }));
  };

  const startSpecialHunt = (type) => {
    const duration = 12 * 60 * 60 * 1000; 
    if (type === 'pet') setState(s => ({ ...s, petHuntEndTime: Date.now() + duration }));
    else if (type === 'castle') setState(s => ({ ...s, castleHuntEndTime: Date.now() + duration }));
  };

  const upgrade = (id) => {
    setGears(prev => {
      const g = prev.find(x => x.id === id);
      if (g.lvl >= 30) return prev;
      const cost = getCost(g.lvl, prev[5].lvl);
      if (state.balance < cost) return prev;
      
      const success = Math.random() < getRate(g.lvl, prev[6].lvl);
      triggerAnim(id, success ? 'success' : 'fail');
      
      setState(s => {
        const dist = distributeFailure(cost);
        return {
          ...s, balance: s.balance - cost, pool: s.pool + (success ? cost : dist.pool),
          burned: s.burned + (success ? 0 : dist.burn), jackpot: s.jackpot + (success ? 0 : dist.jackpot),
          lp: s.lp + (success ? 0 : dist.lp), reserve: s.reserve + (success ? 0 : dist.reserve)
        };
      });
      return prev.map(item => item.id === id ? { ...item, lvl: success ? item.lvl + 1 : item.lvl - 1 } : item);
    });
  };

  const upgradePet = () => {
    if (!state.petActive) return;
    const cost = getPetCost(state.petLevel, gears[5].lvl);
    if (state.balance < cost) return;
    const success = Math.random() < getPetRate(state.petLevel, gears[6].lvl);
    triggerAnim('pet', success ? 'success' : 'fail');
    
    setState(s => {
      const dist = distributeFailure(cost);
      return {
        ...s, balance: s.balance - cost, pool: s.pool + (success ? cost : dist.pool),
        burned: s.burned + (success ? 0 : dist.burn), jackpot: s.jackpot + (success ? 0 : dist.jackpot),
        lp: s.lp + (success ? 0 : dist.lp), reserve: s.reserve + (success ? 0 : dist.reserve),
        petLevel: success ? s.petLevel + 1 : Math.max(0, s.petLevel - 1)
      };
    });
  };

  const upgradeCastle = () => {
    if (!state.castleActive) return;
    const cost = getCastleCost(state.castleLevel, gears[5].lvl);
    if (state.balance < cost) return;
    const success = Math.random() < getPetRate(state.castleLevel, gears[6].lvl);
    triggerAnim('castle', success ? 'success' : 'fail');
    
    setState(s => {
      const dist = distributeFailure(cost);
      return {
        ...s, balance: s.balance - cost, pool: s.pool + (success ? cost : dist.pool),
        burned: s.burned + (success ? 0 : dist.burn), jackpot: s.jackpot + (success ? 0 : dist.jackpot),
        lp: s.lp + (success ? 0 : dist.lp), reserve: s.reserve + (success ? 0 : dist.reserve),
        castleLevel: success ? s.castleLevel + 1 : Math.max(0, s.castleLevel - 1)
      };
    });
  };

  const toggleAuto = (gId) => {
    if (state.autoTimers[gId]) {
      clearInterval(state.autoTimers[gId]);
      setState(s => ({ ...s, autoTimers: { ...s.autoTimers, [gId]: null } }));
    } else {
      const target = prompt("목표 레벨을 입력하라 (최대 30):", "30");
      if (target) {
        const timer = setInterval(() => {
          setGears(p => {
            const currentG = p.find(x => x.id === gId);
            if (currentG.lvl >= parseInt(target)) { 
              setState(s => { clearInterval(s.autoTimers[gId]); return { ...s, autoTimers: { ...s.autoTimers, [gId]: null } }; });
              return p; 
            }
            upgrade(gId); return p;
          });
        }, 350);
        setState(s => ({ ...s, autoTimers: { ...s.autoTimers, [gId]: timer } }));
      }
    }
  };

  const toggleAutoPet = () => {
    if (state.autoTimers['pet']) {
      clearInterval(state.autoTimers['pet']);
      setState(s => ({ ...s, autoTimers: { ...s.autoTimers, pet: null } }));
    } else {
      const target = prompt("목표 펫 레벨을 입력하라 (최대 50):", "50");
      if (target) {
        const timer = setInterval(() => {
          setState(s => {
            if (s.petLevel >= parseInt(target)) { clearInterval(timer); return { ...s, autoTimers: { ...s.autoTimers, pet: null } }; }
            upgradePet(); return s;
          });
        }, 350);
        setState(s => ({ ...s, autoTimers: { ...s.autoTimers, pet: timer } }));
      }
    }
  };

  const toggleAutoCastle = () => {
    if (state.autoTimers['castle']) {
      clearInterval(state.autoTimers['castle']);
      setState(s => ({ ...s, autoTimers: { ...s.autoTimers, castle: null } }));
    } else {
      const target = prompt("목표 성 레벨을 입력하라 (최대 50):", "50");
      if (target) {
        const timer = setInterval(() => {
          setState(s => {
            if (s.castleLevel >= parseInt(target)) { clearInterval(timer); return { ...s, autoTimers: { ...s.autoTimers, castle: null } }; }
            upgradeCastle(); return s;
          });
        }, 350);
        setState(s => ({ ...s, autoTimers: { ...s.autoTimers, castle: timer } }));
      }
    }
  };

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready(); tg.expand(); 
      if (tg.initDataUnsafe?.user?.first_name) {
        setState(s => ({ ...s, userName: tg.initDataUnsafe.user.first_name }));
      }
    }
  }, []);

  // ⏱️ 로딩 화면 2초 타이머
  useEffect(() => {
    if (state.screen === 'loading') {
      const timer = setTimeout(() => { setState(s => ({ ...s, screen: 'wallet' })); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.screen]);

  // ⚙️ 메인 엔진 루프
  useEffect(() => {
    if (state.screen !== 'game') return;

    const timer = setInterval(() => {
      const nowTime = Date.now();
      const best = checkHunt(currentStats, nowTime);
      const adM = state.adBuffEndTime > nowTime ? 2 : 1;
      const gain = (300000 * best.mult * (1 + totalBonusPct / 100)) / 86400 * hState.mult * adM;
      
      const today = new Date();
      if (today.getDay() === 1) { 
        const dateString = today.toDateString();
        setState(s => {
          if (s.lastJackpotDate !== dateString && s.jackpot > 0) {
            let tier = "미달", amount = 0;
            if (s.castleLevel >= 50) { tier = "성 50강"; amount = s.jackpot; }
            else if (s.petLevel >= 50) { tier = "펫 50강"; amount = s.jackpot; }
            else if (minLvl >= 30) { tier = "ALL 30강"; amount = s.jackpot; }
            
            if (amount > 0) {
              const newLog = `[${today.toLocaleDateString()}] ${s.userName}(${tier}) - ${Math.floor(amount).toLocaleString()} GOU 정산 완료`;
              return { ...s, balance: s.balance + amount, jackpot: 0, lastJackpotDate: dateString, settlementLogs: [newLog, ...s.settlementLogs].slice(0, 5) };
            }
          }
          return s;
        });
      }

      setState(s => ({ ...s, currentHunt: best.name, balance: s.balance + gain, mintedGOU: s.mintedGOU + gain }));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.screen, currentStats, totalBonusPct, checkHunt, minLvl, hState.mult, state.adBuffEndTime, state.lastJackpotDate, state.jackpot]);

  const handleDEXClick = () => {
    alert("💱 GOU/TON DEX 스왑 거래소\n\n사령관님이 획득하신 GOU 코인을 TON 코인으로 즉시 스왑할 수 있는 유동성 풀이 시즌 종료 직후 활성화됩니다!");
  };

  const sortedRankings = useMemo(() => {
    const me = { name: state.userName, title: state.userTitle, power: (state.castleLevel * 10000) + (state.petLevel * 100) + currentStats.sum, isMe: true };
    const others = mockRankings.filter(r => !r.isMe).map(r => ({ ...r, powerVal: parseInt(r.power.toString().replace(/,/g, '')) }));
    return [...others, { ...me, powerVal: me.power, power: me.power.toLocaleString() }].sort((a,b) => b.powerVal - a.powerVal).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [state.userName, state.userTitle, state.castleLevel, state.petLevel, currentStats.sum, mockRankings]);

  // ==========================================
  // 🟢 1. 꽉 찬 전체화면 로딩 (Splash)
  // ==========================================
  if (state.screen === 'loading') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', fontFamily: "'Cinzel', serif", zIndex: 9999 }}>
        <img src={`${process.env.PUBLIC_URL}/splash.png`} alt="Splash" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
             onError={(e) => { e.target.style.display = 'none'; }} />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚔️</div>
          <h1 style={{ letterSpacing: '3px', textShadow: '0 0 20px #000', margin: '0 0 10px 0' }}>GOD OF UPGRADE 3</h1>
          <p style={{ color: '#aaa', textShadow: '0 0 10px #000', fontWeight: 'bold' }}>엔진을 예열하는 중입니다...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🟢 2. 지갑 연동 화면
  // ==========================================
  if (state.screen === 'wallet') {
    return (
      <div style={{ background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8', fontFamily: "'Cinzel', serif" }}>
        {imageErrors['ton'] ? <div style={{ fontSize: '80px', marginBottom: '20px' }}>💎</div> : <img src={`${process.env.PUBLIC_URL}/ton_logo.png`} alt="TON" style={{ width: '100px', marginBottom: '30px' }} onError={() => handleImgError('ton')} />}
        <h1 style={{ color: '#fbbf24', textAlign: 'center', letterSpacing: '2px' }}>GOD OF UPGRADE 3</h1>
        <p style={{ margin: '20px 0 40px 0', color: '#aaa', textAlign: 'center', fontSize: '14px', padding: '0 20px' }}>
          시즌제 토큰 마이닝 생태계에 오신 것을 환영합니다.<br/>TON 지갑을 연결하여 영지를 활성화하십시오.
        </p>
        <button onClick={() => setState(s => ({...s, screen: 'game', walletAddress: "EQD...a1b2"}))} 
                style={{ background: '#0098EA', color: '#fff', border: 'none', padding: '15px 40px', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,152,234,0.5)' }}>
          TON 지갑 연결하기
        </button>
      </div>
    );
  }

  // ==========================================
  // 🟢 3. 메인 게임 화면
  // ==========================================
  return (
    <div className="main-wrap" style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.6), rgba(26, 15, 20, 0.8)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      color: '#e6d5b8', minHeight: '100vh', fontFamily: "'Cinzel', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', 
      paddingBottom: '80px' // 하단 네비게이션 바 공간 확보
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .animated-entry { animation: slideUp 0.6s ease-out forwards; }
        .hunt-active { animation: breathing 2s infinite ease-in-out; border-color: #fbbf24 !important; background: rgba(251, 191, 36, 0.15) !important; }
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; transition: 0.2s; }
        .btn-auto-on { background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid #06b6d4; }
        .glass-panel { background: rgba(20, 20, 25, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; }
        
        /* 상단 고정 헤더 */
        .sticky-header { position: sticky; top: 0; z-index: 100; width: 100%; background: rgba(15,15,20,0.95); border-bottom: 2px solid #fbbf24; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 5px 15px rgba(0,0,0,0.5); margin-bottom: 20px; }
        .balance-sticky { font-size: 24px; font-weight: bold; color: #fbbf24; }
        
        /* 하단 고정 네비게이션 바 (랭킹/확률/토큰) */
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(15,15,20,0.95); border-top: 1px solid #fbbf24; display: flex; justify-content: space-around; padding: 10px 5px; z-index: 900; backdrop-filter: blur(10px); padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
        .bottom-nav button { flex: 1; background: transparent; border: none; color: #e6d5b8; font-weight: bold; font-size: 15px; padding: 10px 0; border-right: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
        .bottom-nav button:last-child { border-right: none; }
        .bottom-nav button:active { color: #fbbf24; }
        
        /* 모달 최상위 강제 고정 */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; alignItems: center; justifyContent: center; padding: 20px; }
        
        /* 레이아웃 구조 */
        .grid-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; max-width: 850px; padding: 0 10px; margin-bottom: 15px; }
        .stat-box { padding: 15px; text-align: center; border-radius: 8px; }
        .grid-hunts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; width: 100%; max-width: 850px; margin-bottom: 20px; padding: 0 10px; }
        .hunt-box { padding: 12px; display: flex; flex-direction: column; justify-content: center; text-align: center; border-radius: 12px; }
        
        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; padding: 0 10px; }
        .gear-card { padding: 15px; border-top: 4px solid #555; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
        
        /* 이미지 기본 크기 (PC) */
        .img-box { width: 80px; height: 80px; font-size: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; }
        .img-box-gear { background: rgba(0,0,0,0.5); border: 1px solid rgba(197,160,89,0.3); }
        .img-box-special { width: 100px; height: 100px; font-size: 60px; background: linear-gradient(135deg, rgba(26,11,46,0.5), rgba(59,7,100,0.5)); border: 2px solid rgba(251,191,36,0.5); }
        
        /* 깔끔한 정렬용 배지 */
        .stat-badge { background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-bottom: 6px; width: 100%; }
        
        @media (max-width: 768px) {
          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .hunt-box:nth-child(5) { grid-column: 1 / -1; }
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .img-box { width: 70px !important; height: 70px !important; font-size: 40px !important; }
        }
      `}</style>

      {/* 🔴 STICKY 상단 헤더 (항상 보유량 표시 - 모달 아래로 배치됨) */}
      <div className="sticky-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '11px', color: '#06b6d4' }}>{state.walletAddress}</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>[{state.userTitle}] {state.userName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="balance-sticky">
            {Math.floor(state.balance).toLocaleString()} <span style={{fontSize: '12px', color: '#c5a059', fontWeight: 'normal'}}>GOU</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '0 10px', marginBottom: '20px' }}>
        <div className="grid-stats">
          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(6,182,212,0.3)' }}>
            <div style={{ color: '#06b6d4', fontSize: '12px', fontWeight: 'bold' }}>📈 일일 획득량</div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: '5px 0' }}>+{dailyGainDisplay.toLocaleString()}</div>
            <button onClick={watchAd} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 0', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>
              {state.adBuffEndTime > Date.now() ? '버프 활성화 됨 🔥' : '광고 보고 2배 받기'}
            </button>
          </div>
          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>🔥 누적 소각 (단계: {hState.step})</div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: '5px 0' }}>{Math.floor(state.burned).toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>반감기 배율: X{hState.mult}</div>
          </div>
          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(197,160,89,0.3)' }}>
            <div style={{ color: '#c5a059', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>⚔️ 통합 보너스 (+{totalBonusPct}%)</div>
            <div style={{ fontSize: '11px' }}>ALL 30강: +{setBonus}% | 펫: +{petBonus}% | 성: +{castleBonus}%</div>
          </div>
          <div className="glass-panel stat-box" onClick={handleDEXClick} style={{ border: '1px solid rgba(147,51,234,0.5)', background: 'rgba(147,51,234,0.1)', cursor: 'pointer' }}>
            <div style={{ color: '#a855f7', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>💱 DEX 스왑 풀</div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', marginTop: '8px' }}>거래소 접속 ➡️</div>
          </div>
        </div>

        {/* 🏆 시즌 자동 정산 현황판 */}
        <div className="glass-panel" style={{ padding: '20px', marginTop: '10px', textAlign: 'center', border: '1px solid rgba(251,191,36,0.5)' }}>
          <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' }}>🏆 1주차 시즌 보상 기금</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', margin: '10px 0' }}>
            {Math.floor(state.jackpot).toLocaleString()} <span style={{fontSize:'14px'}}>GOU</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: minLvl >= 30 ? '#06b6d4' : '#ef4444', marginBottom: '15px' }}>
            {minLvl >= 30 ? "✅ 수령 권한 충족! (매주 월요일 자동 정산)" : `❌ 자격 미달 (필요: ALL 30강 / 현재 최소: +${minLvl}강)`}
          </div>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', fontSize: '11px', textAlign: 'left', minHeight: '50px' }}>
            <b style={{color:'#06b6d4'}}>📜 최근 서버 자동 정산 내역</b><br/>
            {state.settlementLogs.length === 0 ? (
              <span style={{color:'#aaa', marginTop: '4px', display: 'block'}}>기록 없음</span>
            ) : (
              state.settlementLogs.map((log, i) => <div key={i} style={{marginTop: '4px'}}>{log}</div>)
            )}
          </div>
        </div>
      </div>

      {/* 🔴 특수 사냥터 현황 UI */}
      {currentHuntData.special && (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', padding: '15px', textAlign: 'center', border: '2px solid #ef4444', marginBottom: '15px', background: 'rgba(239,68,68,0.2)' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#fff', textShadow: '0 0 10px #ef4444', fontSize: '16px' }}>🔥 {currentHuntData.name} 진행 중 (X{currentHuntData.mult})</h3>
        </div>
      )}

      {/* 🗺️ 사냥터 그리드 */}
      <div className="grid-hunts">
        {hunts.map(h => {
          const isActive = state.currentHunt === h.name && !currentHuntData.special;
          const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.req.sum;
          
          return (
            <div key={h.name} className={`glass-panel hunt-box`} style={{ border: isActive ? '1px solid #fbbf24' : (isUnlocked ? '1px solid #06b6d4' : '1px solid #555'), background: isActive ? 'rgba(251,191,36,0.15)' : '' }}>
              <b style={{ color: isActive ? '#fbbf24' : (isUnlocked ? '#fff' : '#888'), fontSize: '14px', marginBottom: '5px' }}>
                {isActive ? '⚔️ ' : (isUnlocked ? '🔓 ' : '🔒 ')}{h.name}
              </b>
              {h.name !== '초원' && (
                <div style={{ fontSize: '10px', background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '5px', margin: '5px 0', color: '#e6d5b8' }}>
                  공 {h.req.atk} | 체 {h.req.hp} | 방 {h.req.def} | 명 {h.req.acc}
                </div>
              )}
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                총합 {h.req.sum} <span style={{color: '#c5a059'}}>(X{h.mult})</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ⚔️ 장비 바둑판 (UI 칼각 정렬 완료) */}
      <div className="gears-grid">
        {gears.map((g, index) => {
          const animClass = anims[g.id] ? `anim-${anims[g.id]}` : '';
          return (
            <div key={g.id} className={`glass-panel gear-card ${animClass}`} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="img-box img-box-gear">
                {imageErrors[g.id] ? g.emoji : <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt="" style={{ width: '85%', height: '85%', objectFit: 'contain' }} onError={() => handleImgError(g.id)} />}
              </div>
              
              {/* 스탯 배지 스타일 적용 */}
              <div className="stat-badge" style={{ color: '#c5a059' }}>{g.stat} <span style={{color: '#fff'}}>+{(g.lvl * g.base).toFixed(1)}{g.unit}</span></div>
              
              <div style={{ fontSize: '15px', fontWeight: 'bold', margin: '6px 0', color: '#fff', minHeight: '20px' }}>
                {g.name} <span style={{color: '#fbbf24'}}>+{g.lvl}</span>
              </div>
              
              <div className="stat-badge" style={{ color: '#aaa', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>확률</span><span style={{color:'#06b6d4'}}>{(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>비용</span><span>{getCost(g.lvl, gears[5].lvl).toLocaleString()}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '6px' }}>
                <button onClick={() => upgrade(g.id)} className="btn-neon" style={{fontSize: '12px'}}>강화</button>
                <button onClick={() => toggleAuto(g.id)} className={`btn-neon ${state.autoTimers[g.id] ? 'btn-auto-on' : ''}`} style={{fontSize: '12px'}}>
                  {state.autoTimers[g.id] ? 'STOP' : 'AUTO'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🐉 엔드게임 (펫 & 성) */}
      <div style={{ width: '100%', maxWidth: '850px', padding: '0 10px', marginTop: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px 15px', marginBottom: '15px', position: 'relative', textAlign: 'center' }}>
          {!state.petActive && <div style={{ position: 'absolute', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px', fontWeight: 'bold' }}>🔒 장비 ALL 30강 달성 시 개방</div>}
          <div className="img-box img-box-special">
            {imageErrors['pet'] ? '🐉' : <img src={`${process.env.PUBLIC_URL}/pet.png`} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} onError={() => handleImgError('pet')} />}
          </div>
          <h3 style={{ margin: '10px 0', color: '#fbbf24', fontSize: '20px' }}>{state.petName} <span style={{fontSize: '14px', color: '#fff'}}>Lv.{state.petLevel}</span></h3>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px' }}>
            획득량 <span style={{color: '#06b6d4', fontWeight: 'bold'}}>+{getPetBonus(state.petLevel)}%</span><br/>
            비용: {getPetCost(state.petLevel, gears[5].lvl).toLocaleString()} | 확률: {(getPetRate(state.petLevel, gears[6].lvl)*100).toFixed(1)}%
          </div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={upgradePet} className="btn-neon" style={{ flex: 1, background: 'rgba(239,68,68,0.2)' }}>펫 강화</button>
              <button onClick={toggleAutoPet} className={`btn-neon ${state.autoTimers['pet'] ? 'btn-auto-on' : ''}`} style={{ flex: 1 }}>{state.autoTimers['pet'] ? 'STOP' : 'AUTO'}</button>
            </div>
            {state.petLevel >= 50 && (
              <button onClick={() => startSpecialHunt('pet')} disabled={state.petHuntEndTime > Date.now()} className="btn-neon" style={{ borderColor: '#06b6d4', color: '#06b6d4' }}>
                {state.petHuntEndTime > Date.now() ? '특수 사냥 진행 중' : '🐉 둥지 사냥 시작 (12시간 / X30)'}
              </button>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 15px', position: 'relative', textAlign: 'center' }}>
          {!state.castleActive && <div style={{ position: 'absolute', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px', fontWeight: 'bold' }}>🔒 펫 50강 달성 시 개방</div>}
          <div className="img-box img-box-special">
            {imageErrors['castle'] ? '🏰' : <img src={`${process.env.PUBLIC_URL}/castle.png`} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} onError={() => handleImgError('castle')} />}
          </div>
          <h3 style={{ margin: '10px 0', color: '#fbbf24', fontSize: '20px' }}>{state.castleName || "위대한 군주의 성"} <span style={{fontSize: '14px', color: '#fff'}}>Lv.{state.castleLevel}</span></h3>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px' }}>
            획득량 <span style={{color: '#06b6d4', fontWeight: 'bold'}}>+{getCastleBonus(state.castleLevel)}%</span><br/>
            비용: {getCastleCost(state.castleLevel, gears[5].lvl).toLocaleString()} | 확률: {(getPetRate(state.castleLevel, gears[6].lvl)*100).toFixed(1)}%
          </div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={upgradeCastle} className="btn-neon" style={{ flex: 1, background: 'rgba(239,68,68,0.2)' }}>성 강화</button>
              <button onClick={toggleAutoCastle} className={`btn-neon ${state.autoTimers['castle'] ? 'btn-auto-on' : ''}`} style={{ flex: 1 }}>{state.autoTimers['castle'] ? 'STOP' : 'AUTO'}</button>
            </div>
            {state.castleLevel >= 50 && (
              <button onClick={() => startSpecialHunt('castle')} disabled={state.castleHuntEndTime > Date.now()} className="btn-neon" style={{ borderColor: '#06b6d4', color: '#06b6d4' }}>
                {state.castleHuntEndTime > Date.now() ? '특수 사냥 진행 중' : '🏰 천공 사냥 시작 (12시간 / X50)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 📱 하단 고정 메뉴 바 (랭킹/확률/토큰 가려짐 원천 해결) */}
      <div className="bottom-nav">
        <button onClick={() => setModals(m => ({...m, rank: true}))}>🏆 랭킹</button>
        <button onClick={() => setModals(m => ({...m, prob: true}))}>📊 확률/비용</button>
        <button onClick={() => setModals(m => ({...m, token: true}))}>🪙 토크노믹스</button>
      </div>

      {/* ==========================================
          🧩 각종 모달창 (Z-Index 최상위 강제 고정 9999)
          ========================================== */}
      {modals.rank && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px', background: 'rgba(20,20,25,0.95)' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', marginTop: 0 }}>🏆 실시간 랭킹</h2>
            <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>정렬 기준: 성 ➔ 펫 ➔ 장비합 (선착순)</div>
            {sortedRankings.map(r => (
              <div key={r.rank} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px', borderBottom: '1px solid #333', background: r.isMe ? 'rgba(251,191,36,0.1)' : '', borderRadius: r.isMe ? '8px' : '0' }}>
                <div><b style={{marginRight: '8px'}}>{r.rank}위</b> <span style={{color: '#ef4444', fontSize:'12px'}}>[{r.title}]</span> {r.name}</div>
                <div style={{color: '#fbbf24', fontWeight: 'bold'}}>{r.power}</div>
              </div>
            ))}
            <button onClick={() => setModals(m => ({...m, rank: false}))} className="btn-neon" style={{ marginTop: '25px', borderColor: '#888', color: '#aaa' }}>닫기</button>
          </div>
        </div>
      )}

      {modals.prob && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px', background: 'rgba(20,20,25,0.95)' }}>
            <h2 style={{ textAlign: 'center', color: '#06b6d4', marginTop: 0 }}>📊 강화 성공 확률</h2>
            <p style={{fontSize:'11px', color:'#aaa', textAlign: 'center', marginBottom: '20px'}}>* 실제 비용은 반감기 및 목걸이 레벨에 따라 감소합니다.</p>
            <table style={{ width: '100%', fontSize: '13px', textAlign: 'center', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #555', color: '#e6d5b8' }}>
                  <th style={{paddingBottom: '10px'}}>구간</th><th style={{paddingBottom: '10px'}}>성공률</th><th style={{paddingBottom: '10px'}}>기본 비용</th>
                </tr>
              </thead>
              <tbody style={{ color: '#fff' }}>
                <tr><td style={{padding: '10px 0'}}>1~4강</td><td>100%</td><td>1,000</td></tr>
                <tr style={{background: 'rgba(255,255,255,0.05)'}}><td style={{padding: '10px 0'}}>5~9강</td><td>70%</td><td>1,000</td></tr>
                <tr><td style={{padding: '10px 0'}}>10~14강</td><td>60%</td><td>10,000</td></tr>
                <tr style={{background: 'rgba(255,255,255,0.05)'}}><td style={{padding: '10px 0'}}>15~19강</td><td>50%</td><td>10,000</td></tr>
                <tr><td style={{padding: '10px 0'}}>20~29강</td><td style={{color:'#ef4444'}}>47~20%</td><td>100,000</td></tr>
              </tbody>
            </table>
            <button onClick={() => setModals(m => ({...m, prob: false}))} className="btn-neon" style={{ marginTop: '25px', borderColor: '#888', color: '#aaa' }}>닫기</button>
          </div>
        </div>
      )}

      {modals.token && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px', background: 'rgba(20,20,25,0.95)' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', marginTop: 0 }}>🪙 토크노믹스 시스템</h2>
            <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#e6d5b8', padding: '10px 0' }}>
              <b style={{color: '#fff'}}>📌 기본 분배 비율 (현재 단계)</b><br/>
              - 마이닝 풀 재귀속: <span style={{color: '#06b6d4'}}>{(hState.rates.pool * 100).toFixed(0)}%</span><br/>
              - 영구 소각(Burn): <span style={{color: '#ef4444'}}>{(hState.rates.burn * 100).toFixed(0)}%</span><br/>
              - 시즌 보상 기금: <span style={{color: '#fbbf24'}}>{(hState.rates.jackpot * 100).toFixed(0)}%</span><br/>
              - 유동성(LP) 공급: <span style={{color: '#a855f7'}}>{(hState.rates.lp * 100).toFixed(0)}%</span><br/>
              - 운영비 보존: {(hState.rates.reserve * 100).toFixed(0)}%<br/><br/>
              
              <b style={{color: '#ef4444'}}>🔥 1차 반감기 (총 20% 소각 시)</b><br/>
              - 일일 획득량 50% 감소 적용<br/>
              - 분배율: 소각 25%, 풀 40%, LP 15% 조정<br/><br/>
              
              <b style={{color: '#ef4444'}}>🔥 2차 반감기 (총 60% 소각 시)</b><br/>
              - 일일 획득량 추가 50% 감소<br/>
              - 분배율: 소각 25%, 풀 35%, 보상 20% 조정
            </div>
            <button onClick={() => setModals(m => ({...m, token: false}))} className="btn-neon" style={{ marginTop: '25px', borderColor: '#888', color: '#aaa' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}