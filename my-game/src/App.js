import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * GOU3: THE KNIGHT'S TALE - ULTIMATE ECOSYSTEM EDITION (v8.0.0)
 * Update: Uncompressed Full Version, Sticky Header, Wallet Connect, Season Logs, Tokenomics
 * Principle: Full Code Integration, Highly Readable Format
 */

const MAX_SUPPLY = 10000000000; // 총 발행량 100억 개

export default function App() {
  // 사냥터 정보
  const hunts = useMemo(() => [
    { name: '초원', mult: 1, req: { atk: 0, hp: 0, def: 0, acc: 0, sum: 0 } },
    { name: '숲', mult: 1.5, req: { atk: 50, hp: 500, def: 25, acc: 10, sum: 25 } },
    { name: '사막', mult: 2.5, req: { atk: 100, hp: 1000, def: 50, acc: 20, sum: 55 } },
    { name: '정글', mult: 5, req: { atk: 170, hp: 1700, def: 75, acc: 34, sum: 90 } },
    { name: '화산', mult: 12, req: { atk: 230, hp: 2300, def: 115, acc: 46, sum: 125 } }
  ], []);

  // 메인 상태 (State)
  const [state, setState] = useState({
    isWalletConnected: false, // 🔴 게임 시작 시 지갑 연동 화면 제어
    walletAddress: "",
    balance: 50000000000,
    burned: 1990000000, // 테스트용
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

    adBuffEndTime: 0, // 광고 버프 (1시간)
    settlementLogs: [], // 정산 내역 로그 저장
    lastJackpotDate: null // 자동 정산 중복 방지용
  });

  // 장비 상태 (Gears)
  const [gears, setGears] = useState([
    { id: 'weapon', name: '성검 엑스칼리버', lvl: 30, stat: '공격력', base: 10, unit: '', imgFile: 'weapon.png', emoji: '⚔️' },
    { id: 'helmet', name: '사자왕의 투구', lvl: 30, stat: '체력', base: 100, unit: '', imgFile: 'helmet.png', emoji: '🪖' },
    { id: 'armor', name: '성기사의 갑옷', lvl: 30, stat: '방어력', base: 5, unit: '', imgFile: 'armor.png', emoji: '🛡️' },
    { id: 'gloves', name: '용기사의 장갑', lvl: 30, stat: '명중률', base: 2, unit: '', imgFile: 'gloves.png', emoji: '🧤' },
    { id: 'shoes', name: '바람의 장화', lvl: 30, stat: 'GOU 획득량', base: 5, unit: '%', imgFile: 'shoes.png', emoji: '👢' },
    { id: 'necklace', name: '현자의 목걸이', lvl: 30, stat: '강화비용감소', base: 0.5, unit: '%', imgFile: 'necklace.png', emoji: '📿' },
    { id: 'ring', name: '행운의 반지', lvl: 30, stat: '강화성공확률', base: 0.1, unit: '%', imgFile: 'ring.png', emoji: '💍' }
  ]);

  // 모달 제어 상태
  const [modals, setModals] = useState({
    rank: false,
    prob: false,
    token: false
  });

  // 애니메이션 제어 상태
  const [anims, setAnims] = useState({});

  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => {
      setAnims(prev => ({ ...prev, [id]: null }));
    }, 500);
  }, []);

  // 랭킹 데이터
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

  const currentStats = useMemo(() => {
    return {
      atk: gears[0].lvl * gears[0].base,
      hp: gears[1].lvl * gears[1].base,
      def: gears[2].lvl * gears[2].base,
      acc: gears[3].lvl * gears[3].base,
      sum: gears.reduce((a, b) => a + b.lvl, 0)
    };
  }, [gears]);

  const getPetBonus = useCallback((lvl) => {
    let b = 100 + (lvl * 2);
    if (lvl >= 10) b += 30;
    if (lvl >= 20) b += 50;
    if (lvl >= 30) b += 100;
    if (lvl >= 40) b += 200;
    if (lvl >= 50) b += 500;
    return b;
  }, []);

  const getCastleBonus = useCallback((lvl) => {
    let b = 200 + (lvl * 5);
    if (lvl >= 10) b += 50;
    if (lvl >= 20) b += 100;
    if (lvl >= 30) b += 200;
    if (lvl >= 40) b += 500;
    if (lvl >= 50) b += 1500;
    return b;
  }, []);

  const petBonus = state.petActive ? getPetBonus(state.petLevel) : 0;
  const castleBonus = state.castleActive ? getCastleBonus(state.castleLevel) : 0;
  const totalBonusPct = (gears[4].lvl * 5) + setBonus + petBonus + castleBonus;

  // 🌕 다단계 반감기 (Halving) & 토크노믹스 분배 로직
  const getHalvingState = useCallback(() => {
    if (state.burned >= MAX_SUPPLY * 0.6) {
      // 2차 반감기 (60% 소각)
      return { mult: 0.25, rates: { pool: 0.35, burn: 0.25, jackpot: 0.20, lp: 0.15, reserve: 0.05 }, step: 2 };
    }
    if (state.burned >= MAX_SUPPLY * 0.2) {
      // 1차 반감기 (20% 소각)
      return { mult: 0.50, rates: { pool: 0.40, burn: 0.25, jackpot: 0.15, lp: 0.15, reserve: 0.05 }, step: 1 };
    }
    // 기본 상태
    return { mult: 1.0, rates: { pool: 0.40, burn: 0.27, jackpot: 0.15, lp: 0.13, reserve: 0.05 }, step: 0 };
  }, [state.burned]);

  const hState = getHalvingState();

  const distributeFailure = useCallback((cost) => {
    const r = hState.rates;
    return {
      pool: cost * r.pool,
      burn: cost * r.burn,
      jackpot: cost * r.jackpot,
      lp: cost * r.lp,
      reserve: cost * r.reserve
    };
  }, [hState.rates]);

  // --- 강화 비용 및 확률 로직 ---
  const getCost = useCallback((lvl, nLvl) => {
    const baseCost = (lvl < 10 ? 1000 : lvl < 20 ? 10000 : 100000) + ((lvl % 10) * 100);
    return Math.floor(baseCost * (1 - (nLvl * 0.005)) * hState.mult);
  }, [hState.mult]);

  const getPetCost = useCallback((lvl, necklaceLvl) => {
    let cost = 0;
    if (lvl < 9) cost = 100 + (lvl * 10);
    else if (lvl < 19) cost = 1000 + ((lvl % 10) * 100);
    else if (lvl < 29) cost = 10000 + ((lvl % 10) * 1000);
    else if (lvl < 39) cost = 100000 + ((lvl % 10) * 10000);
    else cost = 1000000 + ((lvl % 10) * 100000);
    return Math.floor(cost * (1 - (necklaceLvl * 0.005)) * hState.mult);
  }, [hState.mult]);

  const getCastleCost = useCallback((lvl, necklaceLvl) => {
    let cost = 0;
    if (lvl < 9) cost = 1000 + (lvl * 100);
    else if (lvl < 19) cost = 10000 + ((lvl % 10) * 1000);
    else if (lvl < 29) cost = 100000 + ((lvl % 10) * 10000);
    else if (lvl < 39) cost = 1000000 + ((lvl % 10) * 100000);
    else cost = 10000000 + ((lvl % 10) * 1000000);
    return Math.floor(cost * (1 - (necklaceLvl * 0.005)) * hState.mult);
  }, [hState.mult]);

  const getRate = useCallback((lvl, rLvl) => {
    let baseRate = 0;
    if (lvl < 5) baseRate = 1.0;
    else if (lvl < 10) baseRate = 0.7;
    else if (lvl < 15) baseRate = 0.6;
    else if (lvl < 20) baseRate = 0.5;
    else baseRate = [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20];
    return Math.min(0.99, baseRate + (rLvl * 0.001));
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
      return { name: '🏰 제국의 심장', mult: 50, special: true };
    }
    if (state.petHuntEndTime > currentNow) {
      return { name: '🐉 신수의 둥지', mult: 30, special: true };
    }
    const found = hunts.slice().reverse().find(h => 
      stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum
    );
    return { ...(found || hunts[0]), special: false };
  }, [hunts, state.castleHuntEndTime, state.petHuntEndTime]);

  const currentHuntData = checkHunt(currentStats, Date.now());
  const adMultiplier = state.adBuffEndTime > Date.now() ? 2 : 1;
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * hState.mult * adMultiplier);

  // 🎥 광고 시청 기능 (버프)
  const watchAd = () => {
    alert("🎥 (테스트) 광고 시청 완료!\n1시간 동안 모든 GOU 획득량이 2배로 증가합니다.");
    setState(s => ({ ...s, adBuffEndTime: Date.now() + 3600000 }));
  };

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
  const upgrade = (id) => {
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
          ...s, 
          balance: s.balance - cost, 
          pool: s.pool + failDist.pool,
          burned: s.burned + failDist.burn, 
          jackpot: s.jackpot + failDist.jackpot,
          lp: s.lp + failDist.lp, 
          reserve: s.reserve + failDist.reserve
        }));
      }
      return nextGears;
    });
  };

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

  // 🏰 펫 및 성 개방 이벤트
  useEffect(() => {
    if (minLvl >= 30 && !state.petActive) {
      setTimeout(() => {
        const pName = window.prompt("🐉 전설의 동반자가 깨어났습니다!\n당신의 신수(Pet)에게 이름을 하사하소서:", "고대 황금 드래곤");
        setState(s => ({ ...s, petActive: true, petName: pName || "고대 황금 드래곤" }));
      }, 500);
    }
    if (state.petLevel >= 50 && !state.castleActive) {
      setTimeout(() => {
        triggerAnim('castleBox', 'unlockGlow');
        const cName = window.prompt("🎉 신의 경지(펫 50강)에 도달하여 새로운 영지가 개방되었습니다!\n당신의 위대한 [성(Castle)]의 이름을 하사하소서:", "위대한 군주의 성");
        setState(s => ({ ...s, castleActive: true, castleName: cName || "위대한 군주의 성" }));
      }, 500); 
    }
  }, [minLvl, state.petLevel, state.petActive, state.castleActive, triggerAnim]);

  // 💱 DEX 핸들러
  const handleDEXClick = () => {
    alert("💱 GOU/TON DEX 스왑 거래소\n\n사령관님이 획득하신 GOU 코인을 TON 파트너 코인 또는 메이저 자산으로 즉시 스왑할 수 있는 DEX 유동성 풀(LP)이 시즌 종료 직후 활성화됩니다!\n(현재 영지 통신망 구축 및 준비 중입니다.)");
  };

  const setGodTitle = () => {
    const newTitle = prompt("신이시여, 만천하에 선포할 호칭을 입력하소서:", state.userTitle);
    if (newTitle) setState(s => ({ ...s, userTitle: newTitle, showTitleInput: false }));
  };

  // 실시간 엔진 루프 (자동 정산 포함)
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
      const nowTime = Date.now();
      const best = checkHunt(currentStats, nowTime);
      const adM = state.adBuffEndTime > nowTime ? 2 : 1;
      const gain = (300000 * best.mult * (1 + totalBonusPct / 100)) / 86400 * hState.mult * adM;
      
      const today = new Date();
      // 매주 월요일 자동 정산
      if (today.getDay() === 1) { 
        const dateString = today.toDateString();
        setState(s => {
          if (s.lastJackpotDate !== dateString && s.jackpot > 0) {
            let tier = "미달";
            let amount = 0;

            if (s.castleLevel >= 50) { tier = "성 50강 달성자"; amount = s.jackpot; }
            else if (s.petLevel >= 50) { tier = "펫 50강 달성자"; amount = s.jackpot; }
            else if (minLvl >= 30) { tier = "ALL 30강 달성자"; amount = s.jackpot; }
            
            if (amount > 0) {
              const newLog = `[${today.toLocaleDateString()}] ${s.userName}(${tier}) - ${Math.floor(amount).toLocaleString()} GOU 수령`;
              return { 
                ...s, 
                balance: s.balance + amount, 
                jackpot: 0, 
                lastJackpotDate: dateString,
                settlementLogs: [newLog, ...s.settlementLogs].slice(0, 5) // 최근 5개만 유지
              };
            }
          }
          return s;
        });
      }

      setState(s => {
        const shouldTriggerGod = minLvl >= 30 && s.userTitle === "견습 기사";
        return { 
          ...s, 
          currentHunt: best.name, 
          balance: s.balance + gain, 
          mintedGOU: s.mintedGOU + gain,
          userTitle: shouldTriggerGod ? "GOD" : s.userTitle,
          showTitleInput: s.showTitleInput || shouldTriggerGod
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStats, totalBonusPct, checkHunt, minLvl, hState.mult, state.adBuffEndTime]);

  // 랭킹 정렬 (성 > 펫 > 장비합)
  const sortedRankings = useMemo(() => {
    const me = { name: state.userName, title: state.userTitle, power: (state.castleLevel * 10000) + (state.petLevel * 100) + currentStats.sum, isMe: true };
    const others = mockRankings.filter(r => !r.isMe).map(r => ({ ...r, powerVal: parseInt(r.power.toString().replace(/,/g, '')) }));
    const all = [...others, { ...me, powerVal: me.power, power: me.power.toLocaleString() }].sort((a,b) => b.powerVal - a.powerVal);
    return all.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [state.userName, state.userTitle, state.castleLevel, state.petLevel, currentStats.sum, mockRankings]);

  // ==========================================
  // 🟢 1. 지갑 연동 화면 (초기 진입 시)
  // ==========================================
  if (!state.isWalletConnected) {
    return (
      <div style={{ background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8', fontFamily: "'Cinzel', serif" }}>
        <img src={`${process.env.PUBLIC_URL}/ton_logo.png`} alt="TON" style={{ width: '100px', marginBottom: '30px' }} 
             onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<div style="font-size:80px; margin-bottom:20px;">💎</div>'; }} />
        <h1 style={{ color: '#fbbf24', textAlign: 'center', padding: '0 20px', letterSpacing: '2px' }}>GOD OF UPGRADE 3</h1>
        <p style={{ margin: '20px 0 40px 0', color: '#aaa', textAlign: 'center', fontSize: '14px', padding: '0 20px' }}>
          시즌제 토큰 마이닝 생태계에 오신 것을 환영합니다.<br/>TON 지갑을 연결하여 영지를 활성화하십시오.
        </p>
        <button onClick={() => setState(s => ({...s, isWalletConnected: true, walletAddress: "EQD...a1b2"}))} 
                style={{ background: '#0098EA', color: '#fff', border: 'none', padding: '15px 40px', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,152,234,0.5)' }}>
          TON 지갑 연결하기
        </button>
      </div>
    );
  }

  // ==========================================
  // 🟢 2. 메인 게임 화면
  // ==========================================
  return (
    <div className="main-wrap" style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.6), rgba(26, 15, 20, 0.8)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      color: '#e6d5b8', minHeight: '100vh', fontFamily: "'Cinzel', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '50px'
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
        
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; transition: 0.2s; }
        .btn-neon:active { transform: scale(0.95); }
        .btn-auto-on { background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid #06b6d4; }
        
        .glass-panel { background: rgba(20, 20, 25, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; }
        
        /* 스크롤을 내려도 상단에 붙어있는 상태바 (Sticky Header) */
        .sticky-header { position: sticky; top: 0; z-index: 100; width: 100%; background: rgba(15,15,20,0.95); border-bottom: 2px solid #fbbf24; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 5px 15px rgba(0,0,0,0.5); margin-bottom: 20px; }
        .balance-sticky { font-size: 24px; font-weight: bold; color: #fbbf24; text-shadow: 0 0 10px rgba(251,191,36,0.5); }
        
        /* 레이아웃 구조 */
        .grid-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; max-width: 850px; padding: 0 10px; margin-bottom: 15px; }
        .stat-box { padding: 15px; text-align: center; border-radius: 8px; }
        
        .grid-hunts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; width: 100%; max-width: 850px; margin-bottom: 20px; padding: 0 10px; }
        .hunt-box { padding: 15px; display: flex; flex-direction: column; justify-content: center; text-align: center; border-radius: 12px; }
        
        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; padding: 0 10px; }
        .gear-card { padding: 15px; border-top: 4px solid #555; text-align: center; }
        
        /* 이미지 기본 크기 (PC) */
        .img-box { width: 80px; height: 80px; font-size: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; }
        .img-box-gear { background: rgba(0,0,0,0.5); border: 1px solid rgba(197,160,89,0.3); }
        .img-box-special { width: 120px; height: 120px; font-size: 70px; background: linear-gradient(135deg, rgba(26,11,46,0.5), rgba(59,7,100,0.5)); border: 2px solid rgba(251,191,36,0.5); }

        /* 📱 반응형 모바일 디자인 (텔레그램 최적화) */
        @media (max-width: 768px) {
          .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .hunt-box:nth-child(5) { grid-column: 1 / -1; } /* 화산을 전체 가로폭으로 */
          
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          
          .img-box { width: 75px !important; height: 75px !important; font-size: 40px !important; }
          .img-box-special { width: 100px !important; height: 100px !important; font-size: 60px !important; }
        }
      `}</style>

      {/* 🔴 STICKY 상단 헤더 (항상 보유량 표시) */}
      <div className="sticky-header">
        <div>
          <div style={{ fontSize: '11px', color: '#06b6d4' }}>{state.walletAddress}</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>[{state.userTitle}] {state.userName}</div>
        </div>
        <div className="balance-sticky">
          {Math.floor(state.balance).toLocaleString()} <span style={{fontSize: '14px', color: '#c5a059', fontWeight: 'normal'}}>GOU</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '0 10px', marginBottom: '20px' }}>
        
        {/* 📊 상단 4칸 대시보드 */}
        <div className="grid-stats">
          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(6,182,212,0.3)' }}>
            <div style={{ color: '#06b6d4', fontSize: '13px', fontWeight: 'bold' }}>📈 일일 획득량</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', margin: '5px 0' }}>+{dailyGainDisplay.toLocaleString()}</div>
            {/* 🎥 광고 버튼 */}
            <button onClick={watchAd} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 0', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>
              {state.adBuffEndTime > Date.now() ? '버프 활성화 됨 🔥' : '광고 보고 2배 받기'}
            </button>
          </div>

          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold' }}>🔥 누적 소각 (단계: {hState.step})</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', margin: '5px 0' }}>{Math.floor(state.burned).toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>반감기 배율: X{hState.mult}</div>
          </div>

          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(197,160,89,0.3)' }}>
            <div style={{ color: '#c5a059', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>⚔️ 통합 보너스 (+{totalBonusPct}%)</div>
            <div style={{ fontSize: '12px' }}>ALL 30강: +{setBonus}%</div>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>펫: +{petBonus}% | 성: +{castleBonus}%</div>
          </div>

          {/* 💱 DEX 거래소 바로가기 */}
          <div className="glass-panel stat-box" onClick={handleDEXClick} style={{ border: '1px solid rgba(147,51,234,0.5)', background: 'rgba(147,51,234,0.1)', cursor: 'pointer' }}>
            <div style={{ color: '#a855f7', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>💱 DEX 스왑 풀</div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginTop: '10px', textShadow: '0 0 5px #a855f7' }}>거래소 접속 ➡️</div>
          </div>
        </div>

        {/* 🏆 시즌 자동 정산 현황판 */}
        <div className="glass-panel" style={{ padding: '20px', marginTop: '15px', textAlign: 'center', border: '1px solid rgba(251,191,36,0.5)' }}>
          <div style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 'bold' }}>🏆 시즌 보상 (자동 정산 대기중)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', margin: '10px 0' }}>
            {Math.floor(state.jackpot).toLocaleString()} <span style={{fontSize:'16px'}}>GOU</span>
          </div>
          
          {/* 수령 자격 표시 */}
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: minLvl >= 30 ? '#06b6d4' : '#ef4444', marginBottom: '15px' }}>
            {minLvl >= 30 ? "✅ 수령 권한 획득! (매주 월요일 자동 정산)" : `❌ 자격 미달 (필요: ALL 30강 / 현재 최소: +${minLvl})`}
          </div>

          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', fontSize: '12px', textAlign: 'left', minHeight: '60px' }}>
            <b style={{color:'#06b6d4'}}>📜 최근 서버 자동 정산 내역</b><br/>
            {state.settlementLogs.length === 0 ? (
              <span style={{color:'#aaa', marginTop: '5px', display: 'block'}}>아직 정산된 기록이 없습니다.</span>
            ) : (
              state.settlementLogs.map((log, i) => <div key={i} style={{marginTop: '4px'}}>{log}</div>)
            )}
          </div>
        </div>
        
        {/* 각종 모달 버튼 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button className="btn-neon" onClick={() => setModals(m => ({...m, rank: true}))}>🏆 랭킹</button>
          <button className="btn-neon" onClick={() => setModals(m => ({...m, prob: true}))} style={{borderColor:'#06b6d4', color:'#06b6d4'}}>📊 확률/비용</button>
          <button className="btn-neon" onClick={() => setModals(m => ({...m, token: true}))} style={{borderColor:'#a855f7', color:'#a855f7'}}>🪙 토크노믹스</button>
        </div>
      </div>

      {/* 🔴 특수 사냥터 현황 UI */}
      {currentHuntData.special && (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', padding: '20px', textAlign: 'center', border: '2px solid #ef4444', marginBottom: '20px', background: 'rgba(239,68,68,0.2)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#fff', textShadow: '0 0 10px #ef4444' }}>🔥 {currentHuntData.name} 진행 중 (X{currentHuntData.mult})</h3>
          <div style={{ fontSize: '14px', color: '#e6d5b8' }}>엔드게임 특수 배율이 적용되어 막대한 수익을 창출 중입니다!</div>
        </div>
      )}

      {/* 🗺️ 사냥터 */}
      <div className="grid-hunts">
        {hunts.map(h => {
          const isActive = state.currentHunt === h.name && !currentHuntData.special;
          const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.req.sum;
          
          return (
            <div key={h.name} className={`glass-panel hunt-box`} style={{ 
              border: isActive ? '1px solid #fbbf24' : (isUnlocked ? '1px solid #06b6d4' : '1px solid #555'), 
              background: isActive ? 'rgba(251,191,36,0.15)' : '' 
            }}>
              <b style={{ color: isActive ? '#fbbf24' : (isUnlocked ? '#fff' : '#888'), fontSize: '15px' }}>
                {isActive ? '⚔️ ' : (isUnlocked ? '🔓 ' : '🔒 ')}{h.name}
              </b>
              {h.name !== '초원' && (
                <div style={{ fontSize: '10px', background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '5px', margin: '5px 0', color: '#e6d5b8' }}>
                  공 {h.req.atk} | 체 {h.req.hp} | 방 {h.req.def} | 명 {h.req.acc}
                </div>
              )}
              <div style={{ fontSize: '12px', color: currentStats.sum >= h.req.sum ? '#06b6d4' : '#ef4444', fontWeight: 'bold' }}>
                총합 {h.req.sum} <span style={{color: '#c5a059'}}>(X{h.mult})</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ⚔️ 장비 무기고 */}
      <div className="gears-grid">
        {gears.map((g, index) => {
          const animClass = anims[g.id] ? `anim-${anims[g.id]}` : '';
          return (
            <div key={g.id} className={`glass-panel gear-card ${animClass}`} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="img-box img-box-gear">
                <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt={g.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} 
                     onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = g.emoji; }}/>
              </div>
              <div style={{ color: '#c5a059', fontSize: '12px', fontWeight: 'bold' }}>[{g.stat}: {(g.lvl * g.base).toFixed(1)}{g.unit}]</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '6px 0', color: '#fff' }}>
                {g.name} <span style={{color: '#fbbf24'}}>+{g.lvl}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>확률: <span style={{color:'#06b6d4'}}>{(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%</span></div>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '12px' }}>비용: {getCost(g.lvl, gears[5].lvl).toLocaleString()}</div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => upgrade(g.id)} className="btn-neon" style={{fontSize: '13px', padding: '8px 0'}}>강화</button>
                <button onClick={() => toggleAuto(g.id)} className={`btn-neon ${state.autoTimers[g.id] ? 'btn-auto-on' : ''}`} style={{fontSize: '13px', padding: '8px 0'}}>
                  {state.autoTimers[g.id] ? 'STOP' : 'AUTO'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🐉 펫 및 성 (엔드게임 콘텐츠) */}
      <div style={{ width: '100%', maxWidth: '850px', padding: '0 10px', marginTop: '20px' }}>
        
        {/* 펫 */}
        <div className={`glass-panel ${anims['pet'] ? `anim-${anims['pet']}` : ''}`} style={{ padding: '25px 15px', marginBottom: '15px', position: 'relative', textAlign: 'center' }}>
          {!state.petActive && (
            <div style={{ position: 'absolute', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px', fontWeight: 'bold' }}>
              🔒 장비 ALL 30강 달성 시 개방
            </div>
          )}
          <div className="img-box img-box-special">
            <img src={`${process.env.PUBLIC_URL}/pet.png`} alt={state.petName} style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                 onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '🐉'; }}/>
          </div>
          <h3 style={{ margin: '10px 0', color: '#fbbf24', fontSize: '22px' }}>
            {state.petName} <span style={{fontSize: '16px', color: '#fff'}}>Lv.{state.petLevel}</span>
          </h3>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>
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

        {/* 성 */}
        <div className={`glass-panel ${anims['castle'] ? `anim-${anims['castle']}` : ''}`} style={{ padding: '25px 15px', marginBottom: '15px', position: 'relative', textAlign: 'center' }}>
          {!state.castleActive && (
            <div style={{ position: 'absolute', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px', fontWeight: 'bold' }}>
              🔒 펫 50강 달성 시 개방
            </div>
          )}
          <div className="img-box img-box-special">
            <img src={`${process.env.PUBLIC_URL}/castle.png`} alt={state.castleName} style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                 onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '🏰'; }}/>
          </div>
          <h3 style={{ margin: '10px 0', color: '#fbbf24', fontSize: '22px' }}>
            {state.castleName || "위대한 군주의 성"} <span style={{fontSize: '16px', color: '#fff'}}>Lv.{state.castleLevel}</span>
          </h3>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>
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

      {/* ==========================================
          🧩 각종 모달(팝업창) 영역
          ========================================== */}
      
      {/* 랭킹 모달 */}
      {modals.rank && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', marginTop: 0 }}>🏆 실시간 랭킹</h2>
            <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>정렬 기준: 성 ➔ 펫 ➔ 장비합 (선착순)</div>
            {sortedRankings.map(r => (
              <div key={r.rank} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px', borderBottom: '1px solid #333', background: r.isMe ? 'rgba(251,191,36,0.1)' : '', borderRadius: r.isMe ? '8px' : '0' }}>
                <div>
                  <b style={{marginRight: '8px'}}>{r.rank}위</b> 
                  <span style={{color: '#ef4444', fontSize:'12px'}}>[{r.title}]</span> {r.name}
                </div>
                <div style={{color: '#fbbf24', fontWeight: 'bold'}}>{r.power}</div>
              </div>
            ))}
            <button onClick={() => setModals(m => ({...m, rank: false}))} className="btn-neon" style={{ marginTop: '25px', borderColor: '#888', color: '#aaa' }}>닫기</button>
          </div>
        </div>
      )}

      {/* 확률 정보 모달 */}
      {modals.prob && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', color: '#06b6d4', marginTop: 0 }}>📊 강화 확률 & 기본 비용</h2>
            <p style={{fontSize:'12px', color:'#aaa', textAlign: 'center', marginBottom: '20px'}}>* 실제 비용은 반감기 및 목걸이 레벨에 따라 감소합니다.</p>
            <table style={{ width: '100%', fontSize: '13px', textAlign: 'center', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #555', color: '#e6d5b8' }}>
                  <th style={{paddingBottom: '10px'}}>구간</th>
                  <th style={{paddingBottom: '10px'}}>성공률</th>
                  <th style={{paddingBottom: '10px'}}>기본 비용</th>
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

      {/* 토크노믹스 모달 */}
      {modals.token && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', marginTop: 0 }}>🪙 토크노믹스 & 반감기</h2>
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#e6d5b8', padding: '10px 0' }}>
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
              - 일일 획득량 추가 50% 감소 (총 1/4 토막)<br/>
              - 분배율: 소각 25%, 풀 35%, 보상 20% 조정
            </div>
            <button onClick={() => setModals(m => ({...m, token: false}))} className="btn-neon" style={{ marginTop: '25px', borderColor: '#888', color: '#aaa' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}