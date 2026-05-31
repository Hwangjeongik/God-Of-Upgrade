import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * GOU3: THE KNIGHT'S TALE - DEX REVOLUTION & TOTAL SEASON REWARD EDITION (v7.0.6)
 * Update: Removed all 'Jackpot' remnants, Added wide Season Reward layout with massive button, Added DEX shortcut card
 * Principle: No Omissions, Full Code Integration, Telegram Mobile Optimized
 */

const MAX_SUPPLY = 10000000000; 
const HALVING_BURN_THRESHOLD = MAX_SUPPLY * 0.2; 

export default function App() {
  const hunts = useMemo(() => [
    {name: '초원', mult: 1, req: {atk:0, hp:0, def:0, acc:0, sum:0}},
    {name: '숲', mult: 1.5, req: {atk:50, hp:500, def:25, acc:10, sum:25}},
    {name: '사막', mult: 2.5, req: {atk:100, hp:1000, def:50, acc:20, sum:55}},
    {name: '정글', mult: 5, req: {atk:170, hp:1700, def:75, acc:34, sum:90}},
    {name: '화산', mult: 12, req: {atk:230, hp:2300, def:115, acc:46, sum:125}}
  ], []);

  const [state, setState] = useState({ 
    balance: 50000000000, 
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
    
    petActive: true, 
    petLevel: 49, 
    petName: "고대 황금 드래곤",
    petHuntEndTime: 0, 
    
    castleActive: false, 
    castleLevel: 0, 
    castleName: "",
    castleHuntEndTime: 0, 

    lastJackpotDate: null 
  });

  const [gears, setGears] = useState([
    {id: 'weapon', name: '성검 엑스칼리버', lvl: 30, stat: '공격력', base: 10, unit: '', imgFile: 'weapon.png'},
    {id: 'helmet', name: '사자왕의 투구', lvl: 30, stat: '체력', base: 100, unit: '', imgFile: 'helmet.png'},
    {id: 'armor', name: '성기사의 갑옷', lvl: 30, stat: '방어력', base: 5, unit: '', imgFile: 'armor.png'},
    {id: 'gloves', name: '용기사의 장갑', lvl: 30, stat: '명중률', base: 2, unit: '', imgFile: 'gloves.png'},
    {id: 'shoes', name: '바람의 장화', lvl: 30, stat: 'GOU 획득량', base: 5, unit: '%', imgFile: 'shoes.png'},
    {id: 'necklace', name: '현자의 목걸이', lvl: 30, stat: '강화비용감소', base: 0.5, unit: '%', imgFile: 'necklace.png'},
    {id: 'ring', name: '행운의 반지', lvl: 30, stat: '강화성공확률', base: 0.1, unit: '%', imgFile: 'ring.png'}
  ]);

  const [anims, setAnims] = useState({});

  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => {
      setAnims(prev => ({ ...prev, [id]: null }));
    }, 500);
  }, []);

  const mockRankings = [
    { rank: 1, name: "KOREA", title: "LEGENDARY GOD", power: "999,999" },
    { rank: 2, name: "UPGRADE", title: "KING OF LUCK", power: "850,200" },
    { rank: 3, name: "CHAMPION", title: "IRON KNIGHT", power: "720,500" },
    { rank: 4, name: state.userName, title: state.userTitle, power: gears.reduce((a, b) => a + b.lvl, 0), isMe: true }
  ];

  const minLvl = Math.min(...gears.map(g => g.lvl));
  const setBonus = minLvl >= 30 ? 1000 : minLvl >= 20 ? 300 : minLvl >= 10 ? 100 : 0;
  const displaySetLevel = Math.floor(minLvl / 10) * 10; 

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
    let cost = 0;
    if (lvl < 9) cost = 100 + (lvl * 10);
    else if (lvl < 19) cost = 1000 + ((lvl % 10) * 100);
    else if (lvl < 29) cost = 10000 + ((lvl % 10) * 1000);
    else if (lvl < 39) cost = 100000 + ((lvl % 10) * 10000);
    else cost = 1000000 + ((lvl % 10) * 100000);
    return Math.floor(cost * (1 - (necklaceLvl * 0.005)) * halvingMult);
  }, [halvingMult]);

  const getCastleCost = useCallback((lvl, necklaceLvl) => {
    let cost = 0;
    if (lvl < 9) cost = 1000 + (lvl * 100);
    else if (lvl < 19) cost = 10000 + ((lvl % 10) * 1000);
    else if (lvl < 29) cost = 100000 + ((lvl % 10) * 10000);
    else if (lvl < 39) cost = 1000000 + ((lvl % 10) * 100000);
    else cost = 10000000 + ((lvl % 10) * 1000000);
    return Math.floor(cost * (1 - (necklaceLvl * 0.005)) * halvingMult);
  }, [halvingMult]);

  const getRate = useCallback((lvl, rLvl) => {
    return Math.min(0.99, ((lvl < 5 ? 1.0 : lvl < 10 ? 0.7 : lvl < 15 ? 0.6 : lvl < 20 ? 0.5 : [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20]) + (rLvl * 0.001)));
  }, []);

  const getPetRate = useCallback((lvl, ringLvl) => {
    let baseRate = 0;
    if (lvl < 5) baseRate = 1.0;
    else if (lvl < 10) baseRate = 0.7;
    else if (lvl < 15) baseRate = 0.65;
    else if (lvl < 20) baseRate = 0.6;
    else if (lvl < 25) baseRate = 0.55;
    else if (lvl < 30) baseRate = 0.5;
    else if (lvl < 35) baseRate = 0.45;
    else if (lvl < 40) baseRate = 0.4;
    else baseRate = [0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][lvl - 41] || 0.1;
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

  const startSpecialHunt = (type) => {
    const duration = 12 * 60 * 60 * 1000; 
    const now = Date.now();
    if (type === 'pet') setState(s => ({ ...s, petHuntEndTime: now + duration }));
    else if (type === 'castle') setState(s => ({ ...s, castleHuntEndTime: now + duration }));
  };

  const upgrade = useCallback((id) => {
    setGears(prev => {
      const g = prev.find(x => x.id === id);
      if (g.lvl >= 30) return prev;
      const cost = getCost(g.lvl, prev[5].lvl);
      if (state.balance < cost) return prev;
      
      let nextGears = [...prev];
      const success = Math.random() < getRate(g.lvl, prev[6].lvl);
      
      if (success) {
        triggerAnim(id, 'success');
        nextGears = prev.map(item => item.id === id ? { ...item, lvl: item.lvl + 1 } : item);
        setState(s => ({ ...s, balance: s.balance - cost, pool: s.pool + cost }));
      } else {
        triggerAnim(id, 'fail');
        nextGears = prev.map(item => item.id === id ? { ...item, lvl: item.lvl - 1 } : item);
        const failDist = distributeFailure(cost);
        setState(s => ({ 
          ...s, balance: s.balance - cost, pool: s.pool + failDist.pool,
          burned: s.burned + failDist.burn, jackpot: s.jackpot + failDist.jackpot,
          lp: s.lp + failDist.lp, reserve: s.reserve + failDist.reserve
        }));
      }
      return nextGears;
    });
  }, [state.balance, triggerAnim, getCost, getRate, distributeFailure]);

  const upgradePet = () => {
    if (!state.petActive) return;
    setState(s => {
      const cost = getPetCost(s.petLevel, gears[5].lvl);
      if (s.balance < cost) return s;
      
      const success = Math.random() < getPetRate(s.petLevel, gears[6].lvl);
      setTimeout(() => { triggerAnim('pet', success ? 'success' : 'fail'); }, 0);
      
      if (success) {
        return { ...s, balance: s.balance - cost, pool: s.pool + cost, petLevel: s.petLevel + 1 };
      } else {
        const failDist = distributeFailure(cost);
        return { 
          ...s, balance: s.balance - cost, pool: s.pool + failDist.pool,
          burned: s.burned + failDist.burn, jackpot: s.jackpot + failDist.jackpot,
          lp: s.lp + failDist.lp, reserve: s.reserve + failDist.reserve, petLevel: Math.max(0, s.petLevel - 1) 
        };
      }
    });
  };

  const upgradeCastle = () => {
    if (!state.castleActive) return;
    setState(s => {
      const cost = getCastleCost(s.castleLevel, gears[5].lvl);
      if (s.balance < cost) return s;
      
      const success = Math.random() < getPetRate(s.castleLevel, gears[6].lvl); 
      setTimeout(() => { triggerAnim('castle', success ? 'success' : 'fail'); }, 0);
      
      if (success) {
        return { ...s, balance: s.balance - cost, pool: s.pool + cost, castleLevel: s.castleLevel + 1 };
      } else {
        const failDist = distributeFailure(cost);
        return { 
          ...s, balance: s.balance - cost, pool: s.pool + failDist.pool,
          burned: s.burned + failDist.burn, jackpot: s.jackpot + failDist.jackpot,
          lp: s.lp + failDist.lp, reserve: s.reserve + failDist.reserve, castleLevel: Math.max(0, s.castleLevel - 1) 
        };
      }
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
            upgrade(gId);
            return p;
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
            if (s.petLevel >= parseInt(target)) {
              clearInterval(timer);
              return { ...s, autoTimers: { ...s.autoTimers, pet: null } };
            }
            const cost = getPetCost(s.petLevel, gears[5].lvl);
            if (s.balance < cost) {
              clearInterval(timer);
              return { ...s, autoTimers: { ...s.autoTimers, pet: null } };
            }
            const success = Math.random() < getPetRate(s.petLevel, gears[6].lvl);
            setTimeout(() => { triggerAnim('pet', success ? 'success' : 'fail'); }, 0);
            if (success) {
              return { ...s, balance: s.balance - cost, pool: s.pool + cost, petLevel: s.petLevel + 1 };
            } else {
              const failDist = distributeFailure(cost);
              return { 
                ...s, balance: s.balance - cost, pool: s.pool + failDist.pool,
                burned: s.burned + failDist.burn, jackpot: s.jackpot + failDist.jackpot,
                lp: s.lp + failDist.lp, reserve: s.reserve + failDist.reserve, petLevel: Math.max(0, s.petLevel - 1) 
              };
            }
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
            if (s.castleLevel >= parseInt(target)) {
              clearInterval(timer);
              return { ...s, autoTimers: { ...s.autoTimers, castle: null } };
            }
            const cost = getCastleCost(s.castleLevel, gears[5].lvl);
            if (s.balance < cost) {
              clearInterval(timer);
              return { ...s, autoTimers: { ...s.autoTimers, castle: null } };
            }
            const success = Math.random() < getPetRate(s.castleLevel, gears[6].lvl);
            setTimeout(() => { triggerAnim('castle', success ? 'success' : 'fail'); }, 0);
            if (success) {
              return { ...s, balance: s.balance - cost, pool: s.pool + cost, castleLevel: s.castleLevel + 1 };
            } else {
              const failDist = distributeFailure(cost);
              return { 
                ...s, balance: s.balance - cost, pool: s.pool + failDist.pool,
                burned: s.burned + failDist.burn, jackpot: s.jackpot + failDist.jackpot,
                lp: s.lp + failDist.lp, reserve: s.reserve + failDist.reserve, castleLevel: Math.max(0, s.castleLevel - 1) 
              };
            }
          });
        }, 350);
        setState(s => ({ ...s, autoTimers: { ...s.autoTimers, castle: timer } }));
      }
    }
  };

  useEffect(() => {
    if (state.petLevel >= 50 && !state.castleActive) {
      setTimeout(() => {
        triggerAnim('castleBox', 'unlockGlow');
        const cName = window.prompt("🎉 신의 경지(펫 50강)에 도달하여 새로운 영지가 개방되었습니다!\n당신의 위대한 [성(Castle)]의 이름을 하사하소서:", "위대한 군주의 성");
        setState(s => ({ ...s, castleActive: true, castleName: cName || "위대한 군주의 성" }));
      }, 500); 
    }
  }, [state.petLevel, state.castleActive, triggerAnim]);

  // 🏆 시즌보상 정산 시스템 (내부 '잭팟' 소거 완료)
  const processJackpot = useCallback((isAuto = false) => {
    setState(s => {
      if (s.jackpot <= 0) { 
        if(!isAuto) alert("시즌 보상 기금이 비어있습니다."); 
        return s; 
      }
      
      let message = "";
      if (s.castleLevel >= 50) {
        message = `[${isAuto ? '자동' : '수동'} 정산] 절대 권력(성 50강) 달성!\n시즌 보상 기금 ${Math.floor(s.jackpot).toLocaleString()} GOU를 수령합니다!`;
      } else if (s.petLevel >= 50) {
        message = `[${isAuto ? '자동' : '수동'} 정산] 신의 경지(펫 50강) 달성!\n시즌 보상 기금 ${Math.floor(s.jackpot).toLocaleString()} GOU를 수령합니다!`;
      } else if (minLvl >= 30) {
        message = `[${isAuto ? '자동' : '수동'} 정산] 전설의 기사(ALL 30강) 자격 증명!\n시즌 보상 기금 ${Math.floor(s.jackpot).toLocaleString()} GOU를 수령합니다!`;
      } else { 
        if(!isAuto) {
          alert(`[정산 실패] 시즌 보상 수령 자격 미달입니다.\n\n- 필요 조건: 모든 장비 최소 +30강 이상 달성\n- 사령관님의 현재 최소 장비 레벨: +${minLvl}강`); 
        }
        return s; 
      }
      
      alert(message);
      return { ...s, balance: s.balance + s.jackpot, jackpot: 0, lastJackpotDate: new Date().toDateString() };
    });
  }, [minLvl]);

  const handleDEXClick = () => {
    alert("💱 GOU/TON DEX 스왑 거래소\n\n사령관님이 획득하신 GOU 코인을 TON 파트너 코인 또는 메이저 자산으로 즉시 스왑할 수 있는 DEX 유동성 풀(LP)이 시즌 종료 직후 활성화됩니다!\n(현재 영지 통신망 구축 및 준비 중입니다.)");
  };

  const setGodTitle = () => {
    const newTitle = prompt("신이시여, 만천하에 선포할 호칭을 입력하소서:", state.userTitle);
    if (newTitle) setState(s => ({ ...s, userTitle: newTitle, showTitleInput: false }));
  };

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
      
      const today = new Date();
      if (today.getDay() === 1) { 
        const dateString = today.toDateString();
        setState(s => {
          if (s.lastJackpotDate !== dateString && s.jackpot > 0 && minLvl >= 30) {
            processJackpot(true);
          }
          return s;
        });
      }

      setState(s => {
        const shouldUnlockPet = minLvl >= 30 && !s.petActive;
        const shouldTriggerGod = minLvl >= 30 && s.userTitle === "견습 기사";
        return { 
          ...s, currentHunt: best.name, balance: s.balance + gain, mintedGOU: s.mintedGOU + gain,
          petActive: s.petActive || shouldUnlockPet, userTitle: shouldTriggerGod ? "GOD" : s.userTitle,
          showTitleInput: s.showTitleInput || shouldTriggerGod
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStats, totalBonusPct, checkHunt, minLvl, halvingMult, processJackpot]);

  return (
    <div className="main-wrap" style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.4), rgba(26, 15, 20, 0.5)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      color: '#e6d5b8', padding: '30px 20px', minHeight: '100vh', fontFamily: "'Cinzel', serif", display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      <style>{`
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
        .btn-special { background: rgba(239, 68, 68, 0.2); color: #fff; border: 1px solid #ef4444; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        
        .glass-panel { background: rgba(20, 20, 25, 0.4); backdrop-filter: blur(15px); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; }
        .glass-panel-unlocked { background: rgba(6, 182, 212, 0.05); backdrop-filter: blur(15px); border: 1px solid rgba(6, 182, 212, 0.4); }

        .dash-panel { padding: 30px; margin-bottom: 25px; }
        .treasury-title { font-size: 28px; margin: 20px 0 25px 0; }
        .balance-text { font-size: 52px; margin-bottom: 30px; }
        .grid-hunts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 30px; }
        .hunt-box { padding: 20px 15px; min-height: 160px; }

        /* 📊 상단 스탯 대시보드 2x2 깔끔 격자 (DEX 바로가기 안착) */
        .grid-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .grid-stats > div { padding: 18px; border-radius: 10px; text-align: center; display: flex; flexDirection: column; justify-content: center; }

        /* ⚔️ 장비창 그리드화 (바둑판 배열) */
        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; }
        .gear-card { padding: 15px; border-top: 4px solid #555; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; }
        .gear-card-inner { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
        .img-box-gear { width: 65px; height: 65px; background: rgba(0,0,0,0.3); border: 1px solid rgba(197,160,89,0.3); border-radius: 12px; display: flex; justify-content: center; align-items: center; }
        .item-name { font-size: 18px; font-weight: bold; margin: 5px 0; color: #e6d5b8; }
        .item-stat { font-size: 13px; color: #c5a059; font-weight: bold; }
        .gear-actions { display: flex; width: 100%; gap: 8px; margin-top: 15px; }
        .gear-actions .btn-neon { flex: 1; padding: 10px 0; font-size: 14px; }
        
        .pet-card-inner { display: flex; align-items: center; gap: 30px; padding: 35px; }
        .img-box-special { width: 120px; height: 120px; }
        .special-name { font-size: 28px; }
        .pet-actions { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }

        /* 📱 반응형 모바일 디자인 (텔레그램 전용 극치 설계) */
        @media (max-width: 768px) {
          .main-wrap { padding: 10px 5px !important; }
          .dash-panel { padding: 15px 10px !important; margin-bottom: 15px !important; }
          .treasury-title { font-size: 20px !important; margin: 10px 0 15px 0 !important; }
          .balance-text { font-size: 32px !important; margin-bottom: 20px !important; }
          .balance-text span { font-size: 16px !important; }
          
          .grid-stats { gap: 10px !important; }
          .grid-stats > div { padding: 12px !important; }
          .grid-stats .stat-value { font-size: 18px !important; }
          .grid-stats .stat-label { font-size: 12px !important; }
          
          .season-wide-panel { flex-direction: column !important; text-align: center !important; gap: 12px !important; padding: 15px 12px !important; }
          .btn-season-claim { width: 100% !important; padding: 14px 0 !important; font-size: 16px !important; }

          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; margin-bottom: 15px !important; }
          .hunt-box { padding: 10px !important; min-height: 100px !important; }
          .hunt-name { font-size: 14px !important; margin-bottom: 5px !important; }
          
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .gear-card { padding: 12px 8px !important; border-top: 3px solid #555 !important; }
          .img-box-gear { width: 55px !important; height: 55px !important; border-radius: 8px !important; }
          .item-name { font-size: 15px !important; }
          .item-stat { font-size: 11px !important; }
          .gear-actions { margin-top: 10px !important; gap: 6px !important; }
          .gear-actions .btn-neon { font-size: 12px !important; padding: 8px 0 !important; }

          .pet-card-inner { flex-direction: row !important; gap: 15px !important; padding: 15px !important; flex-wrap: wrap; }
          .img-box-special { width: 65px !important; height: 65px !important; border-radius: 10px !important; }
          .special-name { font-size: 18px !important; margin: 0 0 5px 0 !important; }
          .pet-desc { font-size: 12px !important; margin: 0 0 10px 0 !important; }
          .pet-actions { width: 100%; justify-content: space-between !important; gap: 8px !important; }
        }
      `}</style>

      <button onClick={() => setState(s => ({...s, isRankingOpen: true}))}
        style={{ position: 'fixed', top: '15px', right: '15px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.5)', padding: '8px 16px', borderRadius: '8px', zIndex: 100, fontWeight: 'bold' }}>
        🏆 RANK
      </button>

      {/* 📊 메인 국고 대시보드 */}
      <div className="animated-entry glass-panel dash-panel" style={{ width: '100%', maxWidth: '850px', position: 'relative' }}>
        <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' }}>
          [{state.userTitle}] {state.userName}
        </div>
        
        <h2 className="treasury-title" style={{ color: '#e6d5b8', textAlign: 'center', letterSpacing: '2px' }}>TREASURY</h2>
        
        <div className="balance-text" style={{ textAlign: 'center', fontWeight: 'bold', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
          {Math.floor(state.balance).toLocaleString()} <span style={{color: '#c5a059', fontWeight: 'normal'}}>GOU</span>
        </div>
        
        {/* 상단 4칸 그리드 시스템 (DEX 바로가기 합류 완료) */}
        <div className="grid-stats">
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
            <div className="stat-label" style={{ color: '#06b6d4', fontWeight: 'bold', marginBottom: '4px' }}>📈 일일 획득량</div>
            <div className="stat-value" style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>+{dailyGainDisplay.toLocaleString()}</div>
          </div>
          
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="stat-label" style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>🔥 누적 소각</div>
            <div className="stat-value" style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>{Math.floor(state.burned).toLocaleString()}</div>
          </div>

          <div style={{ background: 'rgba(197,160,89,0.1)', border: '1px solid rgba(197,160,89,0.3)' }}>
            <div className="stat-label" style={{ color: '#c5a059', fontWeight: 'bold', marginBottom: '4px' }}>⚔️ 통합 보너스</div>
            <div className="stat-value" style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>+{totalBonusPct}%</div>
          </div>

          {/* 💱 남는 한 칸을 채우는 강력한 DEX 바로가기 모듈 */}
          <div onClick={handleDEXClick} style={{ background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.5)', cursor: 'pointer', transition: 'all 0.2s' }}
               onMouseOver={(e) => e.currentTarget.style.background = 'rgba(147,51,234,0.3)'}
               onMouseOut={(e) => e.currentTarget.style.background = 'rgba(147,51,234,0.15)'}>
            <div className="stat-label" style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '4px' }}>💱 DEX 거래소</div>
            <div className="stat-value" style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', textShadow: '0 0 5px #a855f7' }}>바로가기 ➡️</div>
          </div>
        </div>

        {/* 🏆 시즌보상 전용 독립 와이드 패널 및 거대 클릭 버튼 */}
        <div className="season-wide-panel" style={{ 
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '12px', 
          padding: '16px 20px', marginTop: '15px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '15px' 
        }}>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px' }}>🏆 시즌 종료 정산 보상</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '28px', margin: '2px 0' }}>
              {Math.floor(state.jackpot).toLocaleString()} <span style={{fontSize:'14px', color:'#c5a059', fontWeight:'normal'}}>GOU</span>
            </div>
            {/* 수령 불가 사유 실시간 계측 장치 */}
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: minLvl >= 30 ? '#06b6d4' : '#ef4444' }}>
              {minLvl >= 30 
                ? "✅ 현재 즉시 수령 권한 획득 완료!" 
                : `❌ 수령 조건 미달 (필요: ALL +30강 / 현재 최소: +${minLvl}강)`}
            </div>
          </div>

          <button className="btn-season-claim" onClick={() => processJackpot(false)} style={{ 
            background: '#fbbf24', color: '#000', border: 'none', borderRadius: '8px', 
            padding: '14px 28px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', 
            boxShadow: '0 0 15px rgba(251,191,36,0.4)', transition: 'all 0.1s' 
          }} onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
             onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            보상 정산 수령 ⚡
          </button>
        </div>
      </div>

      {/* 🗺️ 사냥터 */}
      <div className="animated-entry grid-hunts">
        {hunts.map(h => {
          const isSpecialActive = state.currentHunt.includes('(특수)');
          const isActive = state.currentHunt === h.name && !isSpecialActive;
          const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.req.sum;
          
          return (
            <div key={h.name} className={`hunt-box ${isActive ? "hunt-active" : (isUnlocked ? "glass-panel-unlocked" : "glass-panel")}`} style={{ 
              borderRadius: '12px', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              background: isActive ? 'rgba(251, 191, 36, 0.15)' : 'rgba(15, 15, 20, 0.85)'
            }}>
              <b className="hunt-name" style={{ display: 'block', color: isActive ? '#fbbf24' : (isUnlocked ? '#fff' : '#888'), textAlign: 'center', marginBottom: '8px' }}>
                {isActive ? '⚔️ ' : (isUnlocked ? '🔓 ' : '🔒 ')}{h.name}
              </b>
              {h.name === '초원' ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fbbf24' : '#aaa', fontSize: '12px' }}>기본 개방 영토</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', color: '#e6d5b8', background: 'rgba(0, 0, 0, 0.6)', padding: '8px', borderRadius: '8px', marginBottom: '8px', fontSize: '11px' }}>
                  <div style={{textAlign: 'left'}}>공 <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444', fontWeight: 'bold'}}>{h.req.atk}</span></div>
                  <div style={{textAlign: 'right'}}>체 <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444', fontWeight: 'bold'}}>{h.req.hp}</span></div>
                  <div style={{textAlign: 'left'}}>방 <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444', fontWeight: 'bold'}}>{h.req.def}</span></div>
                  <div style={{textAlign: 'right'}}>명 <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444', fontWeight: 'bold'}}>{h.req.acc}</span></div>
                </div>
              )}
              <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                <div style={{ color: currentStats.sum >= h.req.sum ? '#06b6d4' : '#ef4444', fontWeight: 'bold', fontSize: '13px' }}>총합 {h.req.sum}</div>
                <div style={{ marginTop: '4px', color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', fontSize: '14px' }}>수익 X{h.mult}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ⚔️ 장비 무기고 (그리드 바둑판) */}
      <div className="gears-grid">
        {gears.map((g, index) => {
          const animClass = anims[g.id] ? `anim-${anims[g.id]}` : '';
          return (
            <div key={g.id} className={`animated-entry glass-panel gear-card ${animClass}`} style={{ animationDelay: `${index * 0.1}s`, transition: 'background 0.3s' }}>
              <div className="gear-card-inner">
                <div className="img-box-gear">
                  <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt={g.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                       onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '🛡️'; }}/>
                </div>
                <div>
                  <div className="item-stat">[{g.stat}: {(g.lvl * g.base).toFixed(1)}{g.unit}]</div>
                  <div className="item-name">
                    {g.name} <span className={anims[g.id] === 'success' ? 'lvl-up' : ''} style={{ color: '#fbbf24' }}>+{g.lvl}</span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>
                    성공: <span style={{color: '#06b6d4'}}>{(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%</span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>
                    비용: {getCost(g.lvl, gears[5].lvl).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="gear-actions">
                <button onClick={() => upgrade(g.id)} className="btn-neon">강화</button>
                <button onClick={() => toggleAuto(g.id)} className={`btn-neon ${state.autoTimers[g.id] ? 'btn-auto-on' : ''}`}>
                  {state.autoTimers[g.id] ? 'STOP' : 'AUTO'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🐉 동료(Pet) */}
      <div className={`animated-entry glass-panel ${anims['pet'] ? `anim-${anims['pet']}` : ''}`} style={{ animationDelay: '0.8s', position: 'relative', width: '100%', maxWidth: '850px', margin: '20px 0', borderRadius: '15px', overflow: 'hidden' }}>
        {!state.petActive && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(10px)', background: 'rgba(11, 15, 25, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 'bold', padding: '15px', border: '1px solid #fbbf24', borderRadius: '8px', background: 'rgba(0,0,0,0.6)' }}>
              🔒 장비 ALL 30강 달성 시 개방
            </div>
          </div>
        )}

        <div className="pet-card-inner" style={{ opacity: state.petActive ? 1 : 0.4 }}>
          <div className="img-box-special" style={{ background: 'linear-gradient(135deg, rgba(26,11,46,0.5) 0%, rgba(59,7,100,0.5) 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid rgba(251,191,36,0.5)' }}>
             <img src={`${process.env.PUBLIC_URL}/pet.png`} alt={state.petName} style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '🐉'; }}/>
          </div>
          
          <div style={{ flex: 1, width: '100%' }}>
            <h3 className="special-name" style={{ color: '#fbbf24', fontWeight: 'bold', margin: '0 0 10px 0' }}>
              {state.petName} <span className={anims['pet'] === 'success' ? 'lvl-up' : ''} style={{ color: '#e6d5b8', fontSize: '70%', fontWeight: 'normal' }}>Lv.{state.petLevel}</span>
            </h3>
            <p className="pet-desc" style={{ color: '#e6d5b8', margin: '0 0 15px 0' }}>
              GOU 획득량 <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>+{getPetBonus(state.petLevel)}%</span>
            </p>
            <div className="pet-actions">
              <button onClick={upgradePet} disabled={!state.petActive} className="btn-neon" style={{ background: 'rgba(123, 24, 24, 0.5)', color: '#fff', flex: 1 }}>강화</button>
              <button onClick={toggleAutoPet} disabled={!state.petActive} className={`btn-neon ${state.autoTimers['pet'] ? 'btn-auto-on' : ''}`} style={{ flex: 1 }}>{state.autoTimers['pet'] ? 'STOP' : 'AUTO'}</button>
              
              {state.petLevel >= 50 && (
                 <button onClick={() => startSpecialHunt('pet')} disabled={state.petHuntEndTime > Date.now()} className="btn-special" style={{ width: '100%', marginTop: '5px' }}>
                   {state.petHuntEndTime > Date.now() ? '특수 사냥 진행 중' : '🐉 둥지 사냥 (12h / X30)'}
                 </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🏰 위대한 성(Castle) */}
      <div className={`animated-entry glass-panel ${anims['castleBox'] ? `anim-${anims['castleBox']}` : ''} ${anims['castle'] ? `anim-${anims['castle']}` : ''}`} style={{ animationDelay: '1.0s', position: 'relative', width: '100%', maxWidth: '850px', borderRadius: '15px', overflow: 'hidden' }}>
        {!state.castleActive && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(10px)', background: 'rgba(11, 15, 25, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 'bold', padding: '15px', border: '1px solid #fbbf24', borderRadius: '8px', background: 'rgba(0,0,0,0.6)' }}>
              🔒 펫(성수) 50강 달성 시 개방
            </div>
          </div>
        )}

        <div className="pet-card-inner" style={{ opacity: state.castleActive ? 1 : 0.4 }}>
          <div className="img-box-special" style={{ background: 'linear-gradient(135deg, rgba(46,26,11,0.5) 0%, rgba(100,20,7,0.5) 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid rgba(251,191,36,0.8)' }}>
             <img src={`${process.env.PUBLIC_URL}/castle.png`} alt={state.castleName} style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '🏰'; }}/>
          </div>
          
          <div style={{ flex: 1, width: '100%' }}>
            <h3 className="special-name" style={{ color: '#fbbf24', fontWeight: 'bold', margin: '0 0 10px 0' }}>
              {state.castleName || "위대한 군주의 성"} <span className={anims['castle'] === 'success' ? 'lvl-up' : ''} style={{ color: '#e6d5b8', fontSize: '70%', fontWeight: 'normal' }}>Lv.{state.castleLevel}</span>
            </h3>
            <p className="pet-desc" style={{ color: '#e6d5b8', margin: '0 0 15px 0' }}>
              GOU 획득량 <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>+{getCastleBonus(state.castleLevel)}%</span>
            </p>
            <div className="pet-actions">
              <button onClick={upgradeCastle} disabled={!state.castleActive} className="btn-neon" style={{ background: 'rgba(123, 24, 24, 0.5)', color: '#fff', flex: 1 }}>강화</button>
              <button onClick={toggleAutoCastle} disabled={!state.castleActive} className={`btn-neon ${state.autoTimers['castle'] ? 'btn-auto-on' : ''}`} style={{ flex: 1 }}>{state.autoTimers['castle'] ? 'STOP' : 'AUTO'}</button>
              
              {state.castleLevel >= 50 && (
                 <button onClick={() => startSpecialHunt('castle')} disabled={state.castleHuntEndTime > Date.now()} className="btn-special" style={{ width: '100%', marginTop: '5px' }}>
                   {state.castleHuntEndTime > Date.now() ? '특수 사냥 진행 중' : '🏰 천공 사냥 (12h / X50)'}
                 </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {state.isRankingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animated-entry" style={{ background: 'rgba(20,20,25,0.9)', border: '1px solid #fbbf24', padding: '30px 20px', borderRadius: '15px', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', marginBottom: '20px', fontSize: '24px' }}>RANKING</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6d5b8', fontSize: '14px' }}>
              <tbody>
                {mockRankings.map(r => (
                  <tr key={r.rank} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: r.isMe ? 'rgba(251,191,36,0.1)' : 'transparent' }}>
                    <td style={{ padding: '12px 8px' }}>{r.rank}</td>
                    <td style={{ padding: '12px 8px', color: '#7b1818', fontSize: '12px' }}>[{r.title}]</td>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{r.name}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fbbf24' }}>{r.power}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setState(s => ({...s, isRankingOpen: false}))} className="btn-neon" style={{ width: '100%', marginTop: '20px', color: '#888', borderColor: '#555' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}