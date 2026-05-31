import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * GOU3: THE KNIGHT'S TALE - TELEGRAM MOBILE FULL EDITION (v7.0.3)
 * Update: Added Mobile Responsive Design without removing ANY core features
 * Principle: No Omissions, Full Code Integration, Telegram Optimized
 */

const MAX_SUPPLY = 10000000000; // 총 발행량 100억 개
const HALVING_BURN_THRESHOLD = MAX_SUPPLY * 0.2; // 전체 코인의 20% 소각 시 반감기 발동

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
    burned: 1999000000, // 🔴 반감기 테스트를 위해 20% 소각 직전 세팅 (20억 목표)
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
    petLevel: 49, // 🔴 테스트를 위해 49강 시작 (1업 시 성 개방 & X30 사냥터 개방)
    petName: "고대 황금 드래곤",
    petHuntEndTime: 0, // 특수 사냥터 종료 시간
    
    castleActive: false, 
    castleLevel: 0, 
    castleName: "",
    castleHuntEndTime: 0, // 특수 사냥터 종료 시간

    lastJackpotDate: null // 자동 정산 중복 방지용
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

  // --- 스탯 및 보너스 계산 ---
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

  // 🌕 반감기 (Halving) 로직
  const isHalving = state.burned >= HALVING_BURN_THRESHOLD;
  const halvingMult = isHalving ? 0.5 : 1.0;
  
  const failRates = useMemo(() => ({
    pool: 0.40,
    burn: isHalving ? 0.27 : 0.30,
    jackpot: isHalving ? 0.15 : 0.10,
    lp: isHalving ? 0.13 : 0.15, 
    reserve: 0.05
  }), [isHalving]);

  const distributeFailure = useCallback((cost) => {
    return {
      pool: cost * failRates.pool,
      burn: cost * failRates.burn,
      jackpot: cost * failRates.jackpot,
      lp: cost * failRates.lp,
      reserve: cost * failRates.reserve
    };
  }, [failRates]);

  // --- 강화 비용 및 확률 로직 ---
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

  // --- 사냥터 및 특수 사냥터 로직 ---
  const checkHunt = useCallback((stats, currentNow) => {
    if (state.castleHuntEndTime > currentNow) {
      return { name: '🏰 제국의 심장 (특수)', mult: 50 };
    }
    if (state.petHuntEndTime > currentNow) {
      return { name: '🐉 신수의 둥지 (특수)', mult: 30 };
    }
    return hunts.slice().reverse().find(h => 
      stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum
    ) || hunts[0];
  }, [hunts, state.castleHuntEndTime, state.petHuntEndTime]);

  const currentHuntData = checkHunt(currentStats, Date.now());
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * halvingMult);

  const startSpecialHunt = (type) => {
    const duration = 12 * 60 * 60 * 1000; 
    const now = Date.now();
    if (type === 'pet') {
      setState(s => ({ ...s, petHuntEndTime: now + duration }));
    } else if (type === 'castle') {
      setState(s => ({ ...s, castleHuntEndTime: now + duration }));
    }
  };

  // --- 강화 코어 엔진 ---
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
          ...s, balance: s.balance - cost, 
          pool: s.pool + failDist.pool,
          burned: s.burned + failDist.burn, 
          jackpot: s.jackpot + failDist.jackpot,
          lp: s.lp + failDist.lp, 
          reserve: s.reserve + failDist.reserve
        }));
      }
      return nextGears;
    });
  }, [state.balance, triggerAnim, getCost, getRate, distributeFailure]);

  const upgradePet = () => {
    if (!state.petActive) return;
    const necklaceLvl = gears[5].lvl;
    const ringLvl = gears[6].lvl;

    setState(s => {
      const cost = getPetCost(s.petLevel, necklaceLvl);
      if (s.balance < cost) return s;
      
      const success = Math.random() < getPetRate(s.petLevel, ringLvl);
      setTimeout(() => { triggerAnim('pet', success ? 'success' : 'fail'); }, 0);
      
      if (success) {
        return { 
          ...s, balance: s.balance - cost, pool: s.pool + cost,
          petLevel: s.petLevel + 1 
        };
      } else {
        const failDist = distributeFailure(cost);
        return { 
          ...s, balance: s.balance - cost, 
          pool: s.pool + failDist.pool,
          burned: s.burned + failDist.burn, 
          jackpot: s.jackpot + failDist.jackpot,
          lp: s.lp + failDist.lp, 
          reserve: s.reserve + failDist.reserve,
          petLevel: Math.max(0, s.petLevel - 1) 
        };
      }
    });
  };

  const upgradeCastle = () => {
    if (!state.castleActive) return;
    const necklaceLvl = gears[5].lvl;
    const ringLvl = gears[6].lvl;

    setState(s => {
      const cost = getCastleCost(s.castleLevel, necklaceLvl);
      if (s.balance < cost) return s;
      
      const success = Math.random() < getPetRate(s.castleLevel, ringLvl); 
      setTimeout(() => { triggerAnim('castle', success ? 'success' : 'fail'); }, 0);
      
      if (success) {
        return { 
          ...s, balance: s.balance - cost, pool: s.pool + cost,
          castleLevel: s.castleLevel + 1 
        };
      } else {
        const failDist = distributeFailure(cost);
        return { 
          ...s, balance: s.balance - cost, 
          pool: s.pool + failDist.pool,
          burned: s.burned + failDist.burn, 
          jackpot: s.jackpot + failDist.jackpot,
          lp: s.lp + failDist.lp, 
          reserve: s.reserve + failDist.reserve,
          castleLevel: Math.max(0, s.castleLevel - 1) 
        };
      }
    });
  };

  // --- AUTO 강화 버튼 로직 ---
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
                lp: s.lp + failDist.lp, reserve: s.reserve + failDist.reserve,
                petLevel: Math.max(0, s.petLevel - 1) 
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
                lp: s.lp + failDist.lp, reserve: s.reserve + failDist.reserve,
                castleLevel: Math.max(0, s.castleLevel - 1) 
              };
            }
          });
        }, 350);
        setState(s => ({ ...s, autoTimers: { ...s.autoTimers, castle: timer } }));
      }
    }
  };

  // 🏰 펫 50강 달성 시 성 개방 이벤트
  useEffect(() => {
    if (state.petLevel >= 50 && !state.castleActive) {
      setTimeout(() => {
        triggerAnim('castleBox', 'unlockGlow');
        const cName = window.prompt("🎉 신의 경지(펫 50강)에 도달하여 새로운 영지가 개방되었습니다!\n당신의 위대한 [성(Castle)]의 이름을 하사하소서:", "위대한 군주의 성");
        setState(s => ({ ...s, castleActive: true, castleName: cName || "위대한 군주의 성" }));
      }, 500); 
    }
  }, [state.petLevel, state.castleActive, triggerAnim]);

  // 🏆 잭팟 배분 시스템 
  const processJackpot = useCallback((isAuto = false) => {
    setState(s => {
      if (s.jackpot <= 0) {
        if(!isAuto) alert("잭팟 기금이 없습니다.");
        return s;
      }
      
      let message = "";
      let newBalance = s.balance + s.jackpot;

      if (s.castleLevel >= 50) {
        message = `[${isAuto ? '자동' : '수동'} 정산] 절대 권력(성 50강) 달성!\n잭팟 기금 ${Math.floor(s.jackpot).toLocaleString()} GOU를 수령합니다!`;
      } else if (s.petLevel >= 50) {
        message = `[${isAuto ? '자동' : '수동'} 정산] 신의 경지(펫 50강) 달성!\n잭팟 기금 ${Math.floor(s.jackpot).toLocaleString()} GOU를 수령합니다!`;
      } else if (minLvl >= 30) {
        message = `[${isAuto ? '자동' : '수동'} 정산] 전설의 기사(ALL 30강) 자격 증명!\n잭팟 기금 ${Math.floor(s.jackpot).toLocaleString()} GOU를 수령합니다!`;
      } else {
        if(!isAuto) alert(`[정산 실패] 자격 미달.\n잭팟 기금 수령을 위해서는 ALL 30강 이상의 위업이 필요합니다.`);
        return s; 
      }

      alert(message);
      return { ...s, balance: newBalance, jackpot: 0, lastJackpotDate: new Date().toDateString() };
    });
  }, [minLvl]);

  const setGodTitle = () => {
    const newTitle = prompt("신이시여, 만천하에 선포할 호칭을 입력하소서:", state.userTitle);
    if (newTitle) setState(s => ({ ...s, userTitle: newTitle, showTitleInput: false }));
  };

  // 실시간 엔진 루프
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); 
      const tgUser = tg.initDataUnsafe?.user;
      if (tgUser && tgUser.first_name) {
        setState(s => ({ ...s, userName: tgUser.first_name }));
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
          ...s, 
          currentHunt: best.name, 
          balance: s.balance + gain,
          mintedGOU: s.mintedGOU + gain,
          petActive: s.petActive || shouldUnlockPet,
          userTitle: shouldTriggerGod ? "GOD" : s.userTitle,
          showTitleInput: s.showTitleInput || shouldTriggerGod
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStats, totalBonusPct, checkHunt, minLvl, halvingMult, processJackpot]);

  return (
    <div style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.4), rgba(26, 15, 20, 0.5)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      color: '#e6d5b8', padding: '30px 20px', minHeight: '100vh', fontFamily: "'Cinzel', serif", 
      display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes breathing { 0% { box-shadow: 0 0 5px #fbbf24; } 50% { box-shadow: 0 0 20px #fbbf24, inset 0 0 10px #fbbf24; } 100% { box-shadow: 0 0 5px #fbbf24; } }
        @keyframes halvingPulse { 0% { opacity: 0.8; } 50% { opacity: 1; text-shadow: 0 0 15px #ef4444; } 100% { opacity: 0.8; } }
        @keyframes unlockGlow { 0% { box-shadow: 0 0 0px transparent; } 50% { box-shadow: 0 0 50px #fff; background: rgba(255,255,255,0.3); } 100% { box-shadow: 0 0 0px transparent; } }
        
        @keyframes flashSuccess { 0% { background: rgba(251, 191, 36, 0.4); } 100% { background: rgba(20, 20, 25, 0.4); } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.4); } 100% { background: rgba(20, 20, 25, 0.4); } }
        @keyframes pulseLvl { 0% { color: #fbbf24; } 50% { color: #fff; text-shadow: 0 0 10px #fff; } 100% { color: #fbbf24; } }
        
        .animated-entry { animation: slideUp 0.6s ease-out forwards; }
        .hunt-active { animation: breathing 2s infinite ease-in-out; border-color: #fbbf24 !important; background: rgba(251, 191, 36, 0.15) !important; }
        .hunt-special { animation: breathing 1s infinite ease-in-out; border-color: #ef4444 !important; background: rgba(239, 68, 68, 0.15) !important; color: #ef4444 !important; }
        .anim-success { animation: flashSuccess 0.5s ease-out; }
        .anim-fail { animation: flashFail 0.4s ease-out; }
        .anim-unlockGlow { animation: unlockGlow 1.5s ease-out; }
        .lvl-up { animation: pulseLvl 0.5s ease-out; display: inline-block; }
        .halving-active { animation: halvingPulse 2s infinite ease-in-out; color: #ef4444; font-weight: bold; border: 1px solid #ef4444; padding: 6px 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.1); font-size: 16px; }
        
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 12px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cinzel', serif; font-size: 16px; font-weight: bold; transition: all 0.2s; backdrop-filter: blur(5px); }
        .btn-neon:hover { background: rgba(251, 191, 36, 0.2); box-shadow: 0 0 10px rgba(251, 191, 36, 0.5); border-color: #fbbf24; }
        .btn-auto-on { background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid #06b6d4; box-shadow: 0 0 10px rgba(6, 182, 212, 0.4); }
        .btn-special { background: rgba(239, 68, 68, 0.2); color: #fff; border: 1px solid #ef4444; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
        .btn-special:hover { background: rgba(239, 68, 68, 0.5); box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); }
        
        .glass-panel { background: rgba(20, 20, 25, 0.4) !important; backdrop-filter: blur(15px) !important; border: 1px solid rgba(197, 160, 89, 0.3) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important; }
        .glass-panel-unlocked { background: rgba(6, 182, 212, 0.05); backdrop-filter: blur(15px); border: 1px solid rgba(6, 182, 212, 0.4); }

        /* 📱 반응형 모바일 디자인 (텔레그램 사이즈 최적화) */
        .grid-hunts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; width: 100%; max-width: 850px; margin-bottom: 30px; }
        .gear-card-inner { display: flex; align-items: center; gap: 30px; }
        .gear-actions { display: flex; gap: 12px; }
        .pet-card-inner { display: flex; alignItems: center; gap: 30px; }
        .pet-actions { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
        
        @media (max-width: 768px) {
          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .gear-card { flex-direction: column !important; gap: 20px !important; text-align: center; }
          .gear-card-inner { flex-direction: column !important; gap: 10px !important; }
          .gear-actions { width: 100%; justify-content: center; }
          .pet-card-inner { flex-direction: column !important; text-align: center; gap: 15px !important; }
          .pet-actions { justify-content: center; }
          .balance-text { font-size: 38px !important; }
          .treasury-title { font-size: 22px !important; }
        }
      `}</style>

      <button onClick={() => setState(s => ({...s, isRankingOpen: true}))}
        style={{ position: 'fixed', top: '20px', right: '20px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.5)', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', backdropFilter: 'blur(10px)', textShadow: '0 0 5px #fbbf24', zIndex: 100 }}>
        🏆 R A N K I N G
      </button>

      {state.showTitleInput && (
        <div className="animated-entry" style={{ background: 'rgba(123, 24, 24, 0.7)', backdropFilter: 'blur(15px)', padding: '20px', borderRadius: '15px', border: '1px solid #fbbf24', marginBottom: '20px', textAlign: 'center', width: '100%', maxWidth: '850px', boxShadow: '0 0 20px rgba(251,191,36,0.2)' }}>
          <h3 style={{ color: '#fff', margin: '0 0 15px 0', textShadow: '0 0 10px #fbbf24', fontSize: '20px' }}>✨ 전설의 탄생: 신의 영역에 도달하셨습니다! ✨</h3>
          <button onClick={setGodTitle} className="btn-neon">호칭 선포하기</button>
        </div>
      )}

      {/* 📊 메인 국고 대시보드 */}
      <div className="animated-entry glass-panel" style={{ padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '850px', marginBottom: '25px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '25px', left: '25px', display: 'flex', gap: '15px' }}>
          <div style={{ color: '#fbbf24', fontSize: '18px', letterSpacing: '1px', textShadow: '0 0 5px rgba(251,191,36,0.5)', fontWeight: 'bold' }}>
            [ {state.userTitle} ] {state.userName}
          </div>
          {isHalving && <div className="halving-active">⚠️ 대소각(20%) 도달: 반감기 가동 중</div>}
        </div>
        
        <h2 className="treasury-title" style={{ margin: '20px 0 25px 0', color: '#e6d5b8', textAlign: 'center', fontSize: '28px', letterSpacing: '3px', marginTop: '40px' }}>T R E A S U R Y</h2>
        
        <div className="balance-text" style={{ textAlign: 'center', fontSize: '52px', fontWeight: 'bold', color: '#fbbf24', textShadow: '0 0 15px rgba(251,191,36,0.6)', marginBottom: '30px' }}>
          {Math.floor(state.balance).toLocaleString()} <span style={{fontSize: '24px', color: '#c5a059', fontWeight: 'normal'}}>GOU</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ color: '#06b6d4', fontSize: '16px', marginBottom: '8px', fontWeight: 'bold' }}>📈 일일 획득량</div>
            <div style={{ color: '#fff', fontSize: '26px', fontWeight: 'bold' }}>+{dailyGainDisplay.toLocaleString()}</div>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ color: '#ef4444', fontSize: '16px', marginBottom: '8px', fontWeight: 'bold' }}>🔥 누적 소각</div>
            <div style={{ color: '#fff', fontSize: '26px', fontWeight: 'bold' }}>{Math.floor(state.burned).toLocaleString()}</div>
          </div>
          <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ color: '#fbbf24', fontSize: '16px', marginBottom: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              🏆 잭팟 기금 
              <button onClick={() => processJackpot(false)} style={{background: '#fbbf24', color: '#000', border: 'none', borderRadius: '4px', fontSize: '14px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold'}}>정산</button>
            </div>
            <div style={{ color: '#fff', fontSize: '26px', fontWeight: 'bold' }}>{Math.floor(state.jackpot).toLocaleString()}</div>
            <div style={{ color: '#fbbf24', fontSize: '14px', marginTop: '6px' }}>
              우선권: {state.castleLevel >= 50 ? '성 50강' : (state.petLevel >= 50 ? '펫 50강' : 'ALL 30강')}
            </div>
          </div>
          <div style={{ background: 'rgba(197, 160, 89, 0.1)', border: '1px solid rgba(197, 160, 89, 0.3)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ color: '#c5a059', fontSize: '16px', marginBottom: '8px', fontWeight: 'bold' }}>⚔️ 통합 보너스</div>
            <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>장비(ALL {displaySetLevel}강): +{setBonus}% | 펫: +{petBonus}%</div>
            <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>성: +{castleBonus}%</div>
            <div style={{ color: '#fbbf24', fontSize: '14px', marginTop: '6px', fontWeight: 'bold' }}>총합: +{totalBonusPct}%</div>
          </div>
        </div>
      </div>

      {/* 🗺️ 사냥터 */}
      <div className="animated-entry grid-hunts">
        {hunts.map(h => {
          const isSpecialActive = state.currentHunt.includes('(특수)');
          const isActive = state.currentHunt === h.name && !isSpecialActive;
          const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.req.sum;
          
          return (
            <div key={h.name} className={isActive ? "hunt-active" : (isUnlocked ? "glass-panel-unlocked" : "glass-panel")} style={{ 
              padding: '20px 15px', borderRadius: '12px',
              transition: 'all 0.3s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              minHeight: '160px',
              background: isActive ? 'rgba(251, 191, 36, 0.15)' : 'rgba(15, 15, 20, 0.85)'
            }}>
              <b style={{ fontSize: '20px', display: 'block', letterSpacing: '1px', color: isActive ? '#fbbf24' : (isUnlocked ? '#fff' : '#888'), textAlign: 'center', marginBottom: '12px' }}>
                {isActive ? '⚔️ ' : (isUnlocked ? '🔓 ' : '🔒 ')}{h.name}
              </b>

              {h.name === '초원' ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fbbf24' : '#aaa', fontSize: '16px' }}>
                  기본 개방 영토
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px', fontSize: '14px', color: '#e6d5b8', 
                  background: 'rgba(0, 0, 0, 0.6)', padding: '12px', borderRadius: '8px', marginBottom: '12px' 
                }}>
                  <div style={{textAlign: 'left'}}>공격 <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444', fontWeight: 'bold'}}>{h.req.atk}</span></div>
                  <div style={{textAlign: 'right'}}>체력 <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444', fontWeight: 'bold'}}>{h.req.hp}</span></div>
                  <div style={{textAlign: 'left'}}>방어 <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444', fontWeight: 'bold'}}>{h.req.def}</span></div>
                  <div style={{textAlign: 'right'}}>명중 <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444', fontWeight: 'bold'}}>{h.req.acc}</span></div>
                </div>
              )}

              <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                <div style={{ fontSize: '15px', color: currentStats.sum >= h.req.sum ? '#06b6d4' : '#ef4444', fontWeight: 'bold' }}>
                  강화총합 {h.req.sum}
                </div>
                <div style={{ fontSize: '17px', marginTop: '8px', color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', letterSpacing: '1px' }}>
                  수익 : X{h.mult}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔴 특수 사냥터 현황판 */}
      {state.currentHunt.includes('(특수)') && (
        <div className="animated-entry hunt-special" style={{ width: '100%', maxWidth: '850px', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: 'bold', textShadow: '0 0 10px #ef4444' }}>
            🔥 진행 중: {state.currentHunt}
          </h3>
          <p style={{ margin: 0, color: '#fff', fontSize: '16px' }}>엔드게임 특수 배율이 적용되어 막대한 수익을 창출 중입니다!</p>
        </div>
      )}

      {/* ⚔️ 장비 무기고 */}
      <div style={{ width: '100%', maxWidth: '850px' }}>
        {gears.map((g, index) => {
          const animClass = anims[g.id] ? `anim-${anims[g.id]}` : '';
          return (
            <div key={g.id} className={`animated-entry glass-panel gear-card ${animClass}`} style={{ 
              animationDelay: `${index * 0.1}s`,
              margin: '16px 0', padding: '24px', borderRadius: '12px',
              borderLeft: `5px solid #555`, 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.3s'
            }}>
              <div className="gear-card-inner">
                <div style={{ 
                  width: '100px', height: '100px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(197,160,89,0.3)', borderRadius: '15px', 
                  display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backdropFilter: 'blur(5px)'
                }}>
                  <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt={g.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }}
                       onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '🛡️'; }}/>
                </div>
                <div>
                  <span style={{ color: '#c5a059', fontSize: '14px', letterSpacing: '1px', fontWeight: 'bold' }}>[ {g.stat}: {(g.lvl * g.base).toFixed(1)}{g.unit} ]</span>
                  <div style={{ fontSize: '24px', color: '#e6d5b8', margin: '8px 0', fontWeight: 'bold' }}>
                    {g.name} <span className={anims[g.id] === 'success' ? 'lvl-up' : ''} style={{ color: '#fbbf24' }}>+{g.lvl}</span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '14px' }}>
                    성공률: <span style={{color: '#06b6d4', fontWeight: 'bold'}}>{(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%</span> 
                    <span style={{ margin: '0 10px' }}>|</span> 
                    비용: <span style={{fontWeight: 'bold'}}>{getCost(g.lvl, gears[5].lvl).toLocaleString()} GOU</span>
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
      <div className={`animated-entry glass-panel ${anims['pet'] ? `anim-${anims['pet']}` : ''}`} style={{ animationDelay: '0.8s', position: 'relative', width: '100%', maxWidth: '850px', marginTop: '30px', borderRadius: '15px', overflow: 'hidden' }}>
        {!state.petActive && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(10px)', background: 'rgba(11, 15, 25, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ color: '#fbbf24', fontSize: '22px', letterSpacing: '1px', textShadow: '0 0 10px rgba(251,191,36,0.5)', textAlign: 'center', border: '1px solid rgba(251,191,36,0.3)', padding: '25px 50px', borderRadius: '12px', background: 'rgba(0,0,0,0.5)' }}>
              🔒 모든 장비 30강 달성 시 전설의 동반자가 깨어납니다
            </div>
          </div>
        )}

        <div className="pet-card-inner" style={{ padding: '35px', opacity: state.petActive ? 1 : 0.4 }}>
          <div style={{ width: '120px', height: '120px', background: 'linear-gradient(135deg, rgba(26,11,46,0.5) 0%, rgba(59,7,100,0.5) 100%)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid rgba(251,191,36,0.5)', backdropFilter: 'blur(5px)', margin: '0 auto' }}>
             <img src={`${process.env.PUBLIC_URL}/pet.png`} alt={state.petName} style={{ width: '95%', height: '95%', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="font-size: 70px;">🐉</span>'; }}/>
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fbbf24', fontSize: '28px', letterSpacing: '2px', textShadow: '0 0 8px rgba(251,191,36,0.4)', fontWeight: 'bold' }}>
              {state.petName} <span className={anims['pet'] === 'success' ? 'lvl-up' : ''} style={{ color: '#e6d5b8', fontSize: '20px', fontWeight: 'normal' }}>Lv.{state.petLevel}</span>
            </h3>
            <p style={{ margin: '0 0 18px 0', color: '#e6d5b8', fontSize: '16px' }}>
              왕국의 영광을 위해 <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>GOU 획득량 +{getPetBonus(state.petLevel)}%</span> 축복을 내립니다.
            </p>
            <div className="pet-actions">
              <button onClick={upgradePet} disabled={!state.petActive} className="btn-neon" style={{ background: 'rgba(123, 24, 24, 0.5)', color: '#fff', cursor: state.petActive ? 'pointer' : 'not-allowed' }}>강화</button>
              <button onClick={toggleAutoPet} disabled={!state.petActive} className={`btn-neon ${state.autoTimers['pet'] ? 'btn-auto-on' : ''}`} style={{ cursor: state.petActive ? 'pointer' : 'not-allowed' }}>{state.autoTimers['pet'] ? 'STOP' : 'AUTO'}</button>
              
              {state.petLevel >= 50 && (
                 <button onClick={() => startSpecialHunt('pet')} disabled={state.petHuntEndTime > Date.now()} className="btn-special">
                   {state.petHuntEndTime > Date.now() ? '특수 사냥 진행 중' : '🐉 둥지 사냥 (12h / X30)'}
                 </button>
              )}

              <span style={{ color: '#aaa', fontSize: '14px', marginLeft: '10px' }}>
                비용: <span style={{fontWeight:'bold'}}>{getPetCost(state.petLevel, gears[5].lvl).toLocaleString()} GOU</span> 
                <span style={{margin: '0 8px'}}>|</span> 
                확률: <span style={{color: '#06b6d4', fontWeight:'bold'}}>{(getPetRate(state.petLevel, gears[6].lvl)*100).toFixed(1)}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🏰 위대한 성(Castle) */}
      <div className={`animated-entry glass-panel ${anims['castleBox'] ? `anim-${anims['castleBox']}` : ''} ${anims['castle'] ? `anim-${anims['castle']}` : ''}`} style={{ animationDelay: '1.0s', position: 'relative', width: '100%', maxWidth: '850px', marginTop: '30px', borderRadius: '15px', overflow: 'hidden' }}>
        {!state.castleActive && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(10px)', background: 'rgba(11, 15, 25, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ color: '#fbbf24', fontSize: '22px', letterSpacing: '1px', textShadow: '0 0 10px rgba(251,191,36,0.5)', textAlign: 'center', border: '1px solid rgba(251,191,36,0.3)', padding: '25px 50px', borderRadius: '12px', background: 'rgba(0,0,0,0.5)' }}>
              🔒 펫(성수) 50강 달성 시 위대한 성(Castle)이 개방됩니다
            </div>
          </div>
        )}

        <div className="pet-card-inner" style={{ padding: '35px', opacity: state.castleActive ? 1 : 0.4 }}>
          <div style={{ width: '120px', height: '120px', background: 'linear-gradient(135deg, rgba(46,26,11,0.5) 0%, rgba(100,20,7,0.5) 100%)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid rgba(251,191,36,0.8)', backdropFilter: 'blur(5px)', margin: '0 auto' }}>
             <img src={`${process.env.PUBLIC_URL}/castle.png`} alt={state.castleName} style={{ width: '95%', height: '95%', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="font-size: 70px;">🏰</span>'; }}/>
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fbbf24', fontSize: '28px', letterSpacing: '2px', textShadow: '0 0 8px rgba(251,191,36,0.4)', fontWeight: 'bold' }}>
              {state.castleName || "위대한 군주의 성"} <span className={anims['castle'] === 'success' ? 'lvl-up' : ''} style={{ color: '#e6d5b8', fontSize: '20px', fontWeight: 'normal' }}>Lv.{state.castleLevel}</span>
            </h3>
            <p style={{ margin: '0 0 18px 0', color: '#e6d5b8', fontSize: '16px' }}>
              영지의 발전을 위해 <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>GOU 획득량 +{getCastleBonus(state.castleLevel)}%</span> 축복을 내립니다.
            </p>
            <div className="pet-actions">
              <button onClick={upgradeCastle} disabled={!state.castleActive} className="btn-neon" style={{ background: 'rgba(123, 24, 24, 0.5)', color: '#fff', cursor: state.castleActive ? 'pointer' : 'not-allowed' }}>강화</button>
              <button onClick={toggleAutoCastle} disabled={!state.castleActive} className={`btn-neon ${state.autoTimers['castle'] ? 'btn-auto-on' : ''}`} style={{ cursor: state.castleActive ? 'pointer' : 'not-allowed' }}>{state.autoTimers['castle'] ? 'STOP' : 'AUTO'}</button>
              
              {state.castleLevel >= 50 && (
                 <button onClick={() => startSpecialHunt('castle')} disabled={state.castleHuntEndTime > Date.now()} className="btn-special">
                   {state.castleHuntEndTime > Date.now() ? '특수 사냥 진행 중' : '🏰 천공 사냥 (12h / X50)'}
                 </button>
              )}

              <span style={{ color: '#aaa', fontSize: '14px', marginLeft: '10px' }}>
                비용: <span style={{fontWeight:'bold'}}>{getCastleCost(state.castleLevel, gears[5].lvl).toLocaleString()} GOU</span> 
                <span style={{margin: '0 8px'}}>|</span> 
                확률: <span style={{color: '#06b6d4', fontWeight:'bold'}}>{(getPetRate(state.castleLevel, gears[6].lvl)*100).toFixed(1)}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {state.isRankingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animated-entry" style={{ background: 'rgba(20,20,25,0.9)', border: '1px solid #fbbf24', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '600px', boxShadow: '0 0 30px rgba(251,191,36,0.2)' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', letterSpacing: '2px', marginBottom: '30px', fontSize: '28px' }}>R A N K I N G</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6d5b8', fontSize: '18px' }}>
              <tbody>
                {mockRankings.map(r => (
                  <tr key={r.rank} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: r.isMe ? 'rgba(251,191,36,0.1)' : 'transparent' }}>
                    <td style={{ padding: '18px 12px' }}>{r.rank}</td>
                    <td style={{ padding: '18px 12px', color: '#7b1818', fontSize: '14px' }}>[{r.title}]</td>
                    <td style={{ padding: '18px 12px', fontWeight: 'bold' }}>{r.name}</td>
                    <td style={{ padding: '18px 12px', textAlign: 'right', color: '#fbbf24' }}>{r.power}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setState(s => ({...s, isRankingOpen: false}))} className="btn-neon" style={{ width: '100%', marginTop: '30px', color: '#888', borderColor: '#555', fontSize: '18px' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}