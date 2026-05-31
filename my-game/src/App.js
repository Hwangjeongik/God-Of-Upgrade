import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from './firebase'; 
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore'; 

/**
 * GOU: THE KNIGHT'S TALE - PERFECT MATH & WALLET UI (v9.1.0 - Bugfix & Retention Complete)
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
    screen: 'wallet', 
    walletAddress: "",
    userId: null,         
    balance: 50000000000,
    pendingGOU: 0,        // 🔥 12시간 제한 수확용 임시 저장고
    lastClaimTime: Date.now(), // 🔥 마지막 수확 시간
    burned: 1990000000, 
    jackpot: 50000000,
    lp: 0, pool: 5000000000, reserve: 0,
    mintedGOU: 2999000000,
    currentHunt: '초원',
    autoTimers: {},
    userName: "사령관", userTitle: "견습 기사",
    petActive: true, petLevel: 49, petName: "고대 황금 드래곤", petHuntEndTime: 0,
    castleActive: false, castleLevel: 0, castleName: "위대한 군주의 성", castleHuntEndTime: 0,
    adBuffEndTime: 0, settlementLogs: [], lastJackpotDate: null,
    gameTickets: 5,
    lastTicketRegen: Date.now()
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

  const [miniGame, setMiniGame] = useState({
    active: false, timer: 60, betSize: 1000000, prediction: null, chartData: [100], status: 'ready'
  });

  const stateRef = useRef(state);
  const gearsRef = useRef(gears);
  const miniGameRef = useRef(miniGame);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { gearsRef.current = gears; }, [gears]);
  useEffect(() => { miniGameRef.current = miniGame; }, [miniGame]);

  const [imageErrors, setImageErrors] = useState({});
  const handleImgError = (id) => setImageErrors(prev => ({ ...prev, [id]: true }));
  const [modals, setModals] = useState({ rank: false, prob: false, token: false, wallet: false, game: false });
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
  const shoesBonus = gears[4].lvl * 5; 
  const totalBonusPct = shoesBonus + setBonus + petBonus + castleBonus;

  const currentBetSize = useMemo(() => {
    if (state.castleLevel >= 50) return 1000000000; 
    if (state.petLevel >= 50) return 100000000;    
    if (minLvl >= 30) return 10000000;             
    return 1000000;                                
  }, [state.castleLevel, state.petLevel, minLvl]);

  const getHalvingStateInternal = (burnedAmount) => {
    if (burnedAmount >= MAX_SUPPLY * 0.6) return { mult: 0.25, rates: { pool: 0.20, burn: 0.50, jackpot: 0.15, lp: 0.10, reserve: 0.05 }, step: 2 };
    if (burnedAmount >= MAX_SUPPLY * 0.2) return { mult: 0.50, rates: { pool: 0.25, burn: 0.50, jackpot: 0.10, lp: 0.10, reserve: 0.05 }, step: 1 };
    return { mult: 1.0, rates: { pool: 0.30, burn: 0.50, jackpot: 0.05, lp: 0.10, reserve: 0.05 }, step: 0 };
  };

  const hState = getHalvingStateInternal(state.burned);

  const distributeFailure = useCallback((cost, currentHState) => {
    const r = currentHState ? currentHState.rates : hState.rates;
    return { pool: cost * r.pool, burn: cost * r.burn, jackpot: cost * r.jackpot, lp: cost * r.lp, reserve: cost * r.reserve };
  }, [hState]);

  // 🔥 모든 강화비용 엔진 10배 적용
  const calculateBaseCost = (lvl, startBase) => {
    const tier = Math.floor(lvl / 9);
    const step = (lvl % 9) + 1;
    return step * Math.pow(10, tier) * startBase * 10;
  };

  const getCost = useCallback((lvl, nLvl, mult = hState.mult) => {
    return Math.floor(calculateBaseCost(lvl, 1000) * (1 - (nLvl * 0.005)) * mult);
  }, [hState.mult]);

  const getPetCost = useCallback((lvl, nLvl, mult = hState.mult) => {
    return Math.floor(calculateBaseCost(lvl, 100) * (1 - (nLvl * 0.005)) * mult);
  }, [hState.mult]);

  const getCastleCost = useCallback((lvl, nLvl, mult = hState.mult) => {
    return Math.floor(calculateBaseCost(lvl, 1000) * (1 - (nLvl * 0.005)) * mult);
  }, [hState.mult]);
  
  const getRate = useCallback((lvl, rLvl) => {
    if (lvl < 5) return 1.0; 
    let baseRate = 0;
    if (lvl < 10) baseRate = 0.7;
    else if (lvl < 15) baseRate = 0.6;
    else if (lvl < 20) baseRate = 0.5;
    else baseRate = [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20] || 0.1;
    return Math.min(0.99, baseRate + (rLvl * 0.001));
  }, []);

  const getPetRate = useCallback((lvl, ringLvl) => {
    if (lvl < 5) return 1.0; 
    let baseRate = 0;
    if (lvl < 10) baseRate = 0.7;
    else if (lvl < 15) baseRate = 0.65;
    else if (lvl < 20) baseRate = 0.6;
    else if (lvl < 25) baseRate = 0.55;
    else if (lvl < 30) baseRate = 0.5;
    else if (lvl < 35) baseRate = 0.45;
    else if (lvl < 40) baseRate = 0.4;
    else baseRate = [0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][lvl - 40] || 0.1;
    return Math.min(0.99, baseRate + (ringLvl * 0.001));
  }, []);

  const checkHunt = useCallback((stats, currentNow, sObj) => {
    if (sObj.castleHuntEndTime > currentNow) return { name: '🏰 제국의 심장', mult: 50, special: true };
    if (sObj.petHuntEndTime > currentNow) return { name: '🐉 신수의 둥지', mult: 30, special: true };
    const found = hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum);
    return { ...(found || hunts[0]), special: false };
  }, [hunts]);

  const currentHuntData = checkHunt(currentStats, Date.now(), state);
  const adMultiplier = state.adBuffEndTime > Date.now() ? 2 : 1;
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * hState.mult * adMultiplier);

  const watchAd = () => {
    alert("🎥 광고 시청 완료!\n1시간 동안 모든 GOU 채굴 효율이 2배로 증가합니다.");
    setState(s => ({ ...s, adBuffEndTime: Date.now() + 3600000 }));
  };

  const startSpecialHunt = (type) => {
    const duration = 12 * 60 * 60 * 1000; 
    if (type === 'pet') setState(s => ({ ...s, petHuntEndTime: Date.now() + duration }));
    else if (type === 'castle') setState(s => ({ ...s, castleHuntEndTime: Date.now() + duration }));
  };

  const claimGOU = () => {
    if (state.pendingGOU <= 0) { alert("수확할 채굴량이 아직 없습니다! 모일 때까지 기다려주세요."); return; }
    const harvested = state.pendingGOU;
    setState(s => ({ ...s, balance: s.balance + harvested, pendingGOU: 0, lastClaimTime: Date.now() }));
    alert(`💰 영지 수확 완료!\n임시 저장고에서 ${Math.floor(harvested).toLocaleString()} GOU를 지갑으로 안전하게 인출했습니다.`);
  };

  useEffect(() => {
    const initFirebaseData = async (tgUser, inviterId) => {
      const uId = tgUser.id.toString();
      const uName = tgUser.first_name || "사령관";
      setState(s => ({ ...s, userName: uName, userId: uId }));

      const userRef = doc(db, "users", uId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert(`🎉 사전예약 환영합니다!\n보상으로 100,000 GOU가 추가 지급되었습니다.`);
        await setDoc(userRef, { name: uName, joinedAt: new Date(), invitedBy: inviterId || "none" });
        setState(s => ({ ...s, balance: s.balance + 100000 }));

        if (inviterId && inviterId !== uId) {
          const inviterRef = doc(db, "users", inviterId);
          try { await updateDoc(inviterRef, { balance: increment(100000), inviteCount: increment(1) }); } catch(e) { console.log(e); }
        }
      }
    };

    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready(); tg.expand(); 
      if (tg.initDataUnsafe?.user) {
        const inviter = tg.initDataUnsafe.start_param; 
        initFirebaseData(tg.initDataUnsafe.user, inviter);
      }
    }
  }, []);

  const copyReferralLink = () => {
    if (!state.userId) { alert("지갑 연결 후 초대 링크를 발급받을 수 있습니다."); return; }
    const refLink = `https://t.me/GodOfUpgradeBot?start=${state.userId}`;
    navigator.clipboard.writeText(refLink);
    alert(`🎉 나만의 초대 링크가 복사되었습니다!\n친구 한 명당 100,000 GOU가 지급됩니다.\n\n링크: ${refLink}`);
  };

  useEffect(() => {
    if (state.screen !== 'game') return;

    const timer = setInterval(() => {
      const s = stateRef.current;
      const g = gearsRef.current;
      const mGame = miniGameRef.current;
      
      const minL = Math.min(...g.map(x => x.lvl));
      const sBonus = minL >= 30 ? 1000 : minL >= 20 ? 300 : minL >= 10 ? 100 : 0;
      const pBonus = s.petActive ? getPetBonus(s.petLevel) : 0;
      const cBonus = s.castleActive ? getCastleBonus(s.castleLevel) : 0;
      const tBonusPct = (g[4].lvl * 5) + sBonus + pBonus + cBonus;

      const stats = { atk: g[0].lvl * g[0].base, hp: g[1].lvl * g[1].base, def: g[2].lvl * g[2].base, acc: g[3].lvl * g[3].base, sum: g.reduce((a, b) => a + b.lvl, 0) };
      const nowTime = Date.now();
      const best = checkHunt(stats, nowTime, s);
      const curH = getHalvingStateInternal(s.burned);
      const adM = s.adBuffEndTime > nowTime ? 2 : 1;
      
      const gainPerSec = (300000 * best.mult * (1 + tBonusPct / 100)) / 86400 * curH.mult * adM;
      const elapsedMiningTime = nowTime - s.lastClaimTime;
      const maxMiningDuration = 12 * 60 * 60 * 1000; 

      let nextPending = s.pendingGOU;
      if (elapsedMiningTime < maxMiningDuration) { nextPending += gainPerSec; }

      let nextTickets = s.gameTickets;
      let nextTicketRegen = s.lastTicketRegen;
      if (nowTime - s.lastTicketRegen >= 12 * 60 * 60 * 1000) {
        if (nextTickets < 5) { nextTickets = Math.min(5, nextTickets + 5); nextTicketRegen = nowTime; }
      }

      let nextMiniGame = { ...mGame };
      if (mGame.active && mGame.status === 'playing') {
        const nextTimer = mGame.timer - 1;
        const lastPrice = mGame.chartData[mGame.chartData.length - 1];
        const nextPrice = Math.max(10, lastPrice + (Math.random() * 20 - 10));
        const nextChart = [...mGame.chartData, nextPrice].slice(-15);

        if (nextTimer <= 0) {
          const startPrice = mGame.chartData[0];
          const endPrice = nextPrice;
          const isUp = endPrice >= startPrice;
          const userWon = (mGame.prediction === 'UP' && isUp) || (mGame.prediction === 'DOWN' && !isUp);

          nextMiniGame = { ...nextMiniGame, timer: 0, chartData: nextChart, status: userWon ? 'win' : 'lose' };

          setState(prev => ({ ...prev, balance: userWon ? prev.balance + (mGame.betSize * 2) : prev.balance }));
          alert(userWon ? `🎉 예측 성공! 정확한 판단으로 +${(mGame.betSize * 2).toLocaleString()} GOU를 획득했습니다!` : `💀 예측 실패... 시장의 흐름을 거스르지 못해 ${mGame.betSize.toLocaleString()} GOU를 잃었습니다.`);
        } else {
          nextMiniGame = { ...nextMiniGame, timer: nextTimer, chartData: nextChart };
        }
        setMiniGame(nextMiniGame);
      }

      const today = new Date();
      let payout = 0;
      let newLog = null;
      const dateString = today.toDateString();

      if (today.getDay() === 1 && s.lastJackpotDate !== dateString && s.jackpot > 0) {
        let tier = "미달";
        if (s.castleLevel >= 50) { tier = "성 50강"; payout = s.jackpot; }
        else if (s.petLevel >= 50) { tier = "펫 50강"; payout = s.jackpot; }
        else if (minLvl >= 30) { tier = "ALL 30강"; payout = s.jackpot; }
        if (payout > 0) { newLog = `[${today.toLocaleDateString()}] ${s.userName}(${tier}) - ${Math.floor(payout).toLocaleString()} GOU 정산 완료`; }
      }

      setState(prev => {
        let nextJackpot = prev.jackpot; let nextLastDate = prev.lastJackpotDate; let nextLogs = prev.settlementLogs;
        if (payout > 0) { nextJackpot = 0; nextLastDate = dateString; nextLogs = [newLog, ...prev.settlementLogs].slice(0, 5); }
        return { 
          ...prev, currentHunt: best.name, balance: prev.balance + payout, pendingGOU: nextPending,
          mintedGOU: prev.mintedGOU + gainPerSec, jackpot: nextJackpot, lastJackpotDate: nextLastDate, 
          settlementLogs: nextLogs, gameTickets: nextTickets, lastTicketRegen: nextTicketRegen
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.screen, getPetBonus, getCastleBonus, checkHunt]);

  const toggleAuto = (gId) => {
    if (state.autoTimers[gId]) {
      clearInterval(state.autoTimers[gId]);
      setState(s => ({ ...s, autoTimers: { ...s.autoTimers, [gId]: null } }));
    } else {
      const target = prompt("목표 레벨을 입력하라 (최대 30):", "30");
      if (target) {
        const targetLvl = parseInt(target);
        const timer = setInterval(() => {
          const s = stateRef.current; const gAll = gearsRef.current;
          const currentG = gAll.find(x => x.id === gId);
          if (currentG.lvl >= targetLvl || currentG.lvl >= 30) { clearInterval(timer); setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, [gId]: null } })); return; }
          const curH = getHalvingStateInternal(s.burned);
          const cost = getCost(currentG.lvl, gAll[5].lvl, curH.mult);
          if (s.balance < cost) { clearInterval(timer); setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, [gId]: null } })); return; }

          const success = Math.random() < getRate(currentG.lvl, gAll[6].lvl);
          triggerAnim(gId, success ? 'success' : 'fail');
          
          setGears(prevG => prevG.map(item => item.id === gId ? { ...item, lvl: success ? item.lvl + 1 : Math.max(0, item.lvl - 1) } : item));
          setState(prevS => {
            const dist = distributeFailure(cost, curH);
            return { ...prevS, balance: prevS.balance - cost, pool: prevS.pool + (success ? cost : dist.pool), burned: prevS.burned + (success ? 0 : dist.burn), jackpot: prevS.jackpot + (success ? 0 : dist.jackpot), lp: prevS.lp + (success ? 0 : dist.lp), reserve: prevS.reserve + (success ? 0 : dist.reserve) };
          });
        }, 650);
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
        const targetLvl = parseInt(target);
        const timer = setInterval(() => {
          const s = stateRef.current; const gAll = gearsRef.current;
          if (s.petLevel >= targetLvl || s.petLevel >= 50) { clearInterval(timer); setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, pet: null } })); return; }
          const curH = getHalvingStateInternal(s.burned);
          const cost = getPetCost(s.petLevel, gAll[5].lvl, curH.mult);
          if (s.balance < cost) { clearInterval(timer); setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, pet: null } })); return; }

          const success = Math.random() < getPetRate(s.petLevel, gAll[6].lvl);
          triggerAnim('pet', success ? 'success' : 'fail');
          
          setState(prevS => {
            const dist = distributeFailure(cost, curH);
            return { ...prevS, balance: prevS.balance - cost, pool: prevS.pool + (success ? cost : dist.pool), burned: prevS.burned + (success ? 0 : dist.burn), jackpot: prevS.jackpot + (success ? 0 : dist.jackpot), lp: prevS.lp + (success ? 0 : dist.lp), reserve: prevS.reserve + (success ? 0 : dist.reserve), petLevel: success ? prevS.petLevel + 1 : Math.max(0, prevS.petLevel - 1) };
          });
        }, 650);
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
        const targetLvl = parseInt(target);
        const timer = setInterval(() => {
          const s = stateRef.current; const gAll = gearsRef.current;
          if (s.castleLevel >= targetLvl || s.castleLevel >= 50) { clearInterval(timer); setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, castle: null } })); return; }
          const curH = getHalvingStateInternal(s.burned);
          const cost = getCastleCost(s.castleLevel, gAll[5].lvl, curH.mult);
          if (s.balance < cost) { clearInterval(timer); setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, castle: null } })); return; }

          const success = Math.random() < getPetRate(s.castleLevel, gAll[6].lvl);
          triggerAnim('castle', success ? 'success' : 'fail');
          
          setState(prevS => {
            const dist = distributeFailure(cost, curH);
            return { ...prevS, balance: prevS.balance - cost, pool: prevS.pool + (success ? cost : dist.pool), burned: prevS.burned + (success ? 0 : dist.burn), jackpot: prevS.jackpot + (success ? 0 : dist.jackpot), lp: prevS.lp + (success ? 0 : dist.lp), reserve: prevS.reserve + (success ? 0 : dist.reserve), castleLevel: success ? prevS.castleLevel + 1 : Math.max(0, prevS.castleLevel - 1) };
          });
        }, 650);
        setState(s => ({ ...s, autoTimers: { ...s.autoTimers, castle: timer } }));
      }
    }
  };

  const upgrade = (id) => {
    const s = stateRef.current; const gAll = gearsRef.current;
    const currentG = gAll.find(x => x.id === id);
    if (currentG.lvl >= 30) return;
    const curH = getHalvingStateInternal(s.burned);
    const cost = getCost(currentG.lvl, gAll[5].lvl, curH.mult);
    if (s.balance < cost) return;

    const success = Math.random() < getRate(currentG.lvl, gAll[6].lvl);
    triggerAnim(id, success ? 'success' : 'fail');
    setGears(prevG => prevG.map(item => item.id === id ? { ...item, lvl: success ? item.lvl + 1 : Math.max(0, item.lvl - 1) } : item));
    setState(prevS => {
      const dist = distributeFailure(cost, curH);
      return { ...prevS, balance: prevS.balance - cost, pool: prevS.pool + (success ? cost : dist.pool), burned: prevS.burned + (success ? 0 : dist.burn), jackpot: prevS.jackpot + (success ? 0 : dist.jackpot), lp: prevS.lp + (success ? 0 : dist.lp), reserve: prevS.reserve + (success ? 0 : dist.reserve) };
    });
  };

  const upgradePet = () => {
    const s = stateRef.current; const gAll = gearsRef.current;
    if (!s.petActive || s.petLevel >= 50) return;
    const curH = getHalvingStateInternal(s.burned);
    const cost = getPetCost(s.petLevel, gAll[5].lvl, curH.mult);
    if (s.balance < cost) return;
    const success = Math.random() < getPetRate(s.petLevel, gAll[6].lvl);
    triggerAnim('pet', success ? 'success' : 'fail');
    setState(prevS => {
      const dist = distributeFailure(cost, curH);
      return { ...prevS, balance: prevS.balance - cost, pool: prevS.pool + (success ? cost : dist.pool), burned: prevS.burned + (success ? 0 : dist.burn), jackpot: prevS.jackpot + (success ? 0 : dist.jackpot), lp: prevS.lp + (success ? 0 : dist.lp), reserve: prevS.reserve + (success ? 0 : dist.reserve), petLevel: success ? prevS.petLevel + 1 : Math.max(0, prevS.petLevel - 1) };
    });
  };

  const upgradeCastle = () => {
    const s = stateRef.current; const gAll = gearsRef.current;
    if (!s.castleActive || s.castleLevel >= 50) return;
    const curH = getHalvingStateInternal(s.burned);
    const cost = getCastleCost(s.castleLevel, gAll[5].lvl, curH.mult);
    if (s.balance < cost) return;
    const success = Math.random() < getPetRate(s.castleLevel, gAll[6].lvl);
    triggerAnim('castle', success ? 'success' : 'fail');
    setState(prevS => {
      const dist = distributeFailure(cost, curH);
      return { ...prevS, balance: prevS.balance - cost, pool: prevS.pool + (success ? cost : dist.pool), burned: prevS.burned + (success ? 0 : dist.burn), jackpot: prevS.jackpot + (success ? 0 : dist.jackpot), lp: prevS.lp + (success ? 0 : dist.lp), reserve: prevS.reserve + (success ? 0 : dist.reserve), castleLevel: success ? prevS.castleLevel + 1 : Math.max(0, prevS.castleLevel - 1) };
    });
  };

  useEffect(() => {
    if (minLvl >= 30 && !state.petActive) { setState(s => ({ ...s, petActive: true })); alert("🐉 전설의 동반자(Pet)가 깨어났습니다!"); }
    if (state.petLevel >= 50 && !state.castleActive) { setState(s => ({ ...s, castleActive: true })); alert("🎉 신의 경지 도달! 위대한 성(Castle) 개방!"); }
  }, [minLvl, state.petLevel, state.petActive, state.castleActive]);

  const renamePet = () => { const newName = prompt("펫의 이름을 지어주세요:", state.petName); if (newName) setState(s => ({ ...s, petName: newName })); };
  const renameCastle = () => { const newName = prompt("성의 이름을 지어주세요:", state.castleName); if (newName) setState(s => ({ ...s, castleName: newName })); };

  const selectWallet = (walletName) => {
    setModals(m => ({ ...m, wallet: false }));
    setState(s => ({ ...s, screen: 'connecting' }));
    setTimeout(() => { setState(s => ({ ...s, screen: 'game', walletAddress: `EQD...${Math.floor(1000 + Math.random() * 9000)}` })); }, 1500);
  };

  const refillTicketWithAd = () => {
    alert("🎥 광고 시청 완료! 미니게임 도전 전용 티켓이 +1개 충전되었습니다.");
    setState(s => ({ ...s, gameTickets: Math.min(5, s.gameTickets + 1) }));
  };

  const startMiniGame = (userPredict) => {
    if (state.balance < currentBetSize) { alert("잔액이 부족하여 이 등급의 미니게임에 참여할 수 없습니다!"); return; }
    if (state.gameTickets <= 0) { alert("사용 가능한 도전 티켓이 없습니다! 광고를 보고 충전하거나 12시간을 기다리세요."); return; }

    setState(s => ({ ...s, balance: s.balance - currentBetSize, gameTickets: s.gameTickets - 1 }));
    setMiniGame({ active: true, timer: 60, betSize: currentBetSize, prediction: userPredict, chartData: [100 + Math.floor(Math.random() * 50)], status: 'playing' });
    setModals(m => ({ ...m, game: true }));
  };

  const sortedRankings = useMemo(() => {
    const me = { name: state.userName, title: state.userTitle, power: (state.castleLevel * 10000) + (state.petLevel * 100) + currentStats.sum, isMe: true };
    const others = mockRankings.filter(r => !r.isMe).map(r => ({ ...r, powerVal: parseInt(r.power.toString().replace(/,/g, '')) }));
    return [...others, { ...me, powerVal: me.power, power: me.power.toLocaleString() }].sort((a,b) => b.powerVal - a.powerVal).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [state.userName, state.userTitle, state.castleLevel, state.petLevel, currentStats.sum, mockRankings]);

  if (state.screen === 'connecting') {
    return (
      <div style={{ background: '#111', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0098EA', fontFamily: "'Cinzel', serif" }}>
        <div style={{ fontSize: '50px', marginBottom: '20px', animation: 'pulseLvl 1s infinite' }}>🔗</div>
        <h2 style={{ letterSpacing: '2px', color: '#fff' }}>지갑 연결 중...</h2>
        <p style={{ color: '#aaa', fontSize: '13px' }}>블록체인 네트워크와 안전하게 동기화하고 있습니다.</p>
        <style>{`@keyframes pulseLvl { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }`}</style>
      </div>
    );
  }

  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.7), rgba(26, 15, 20, 0.9)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8', fontFamily: "'Cinzel', serif", boxSizing: 'border-box' }}>
        {imageErrors['ton'] ? <div style={{ fontSize: '70px', marginBottom: '20px' }}>💎</div> : <img src={`${process.env.PUBLIC_URL}/ton_logo.png`} alt="TON" style={{ width: '80px', marginBottom: '20px' }} onError={() => handleImgError('ton')} />}
        <h1 style={{ color: '#fbbf24', textAlign: 'center', letterSpacing: '1px', textShadow: '0 0 10px #fbbf24', padding: '0 10px', fontSize: '24px', margin: '0 0 10px 0' }}>GOD OF UPGRADE</h1>
        <p style={{ margin: '10px 0 30px 0', color: '#aaa', textAlign: 'center', fontSize: '13px', padding: '0 20px', lineHeight: '1.5', wordBreak: 'keep-all' }}>시즌제 토큰 마이닝 생태계에 오신 것을 환영합니다.<br/>TON 생태계 지갑을 연결하여 영지를 활성화하십시오.</p>
        <button onClick={() => setModals(m => ({ ...m, wallet: true }))} style={{ background: '#0098EA', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 15px rgba(0,152,234,0.5)', zIndex: 10 }}>TON 지갑 연결하기</button>

        {modals.wallet && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'rgba(20,20,25,0.98)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '15px 15px calc(15px + env(safe-area-inset-bottom))', zIndex: 9999, boxShadow: '0 -5px 20px rgba(0,0,0,0.8)', borderTop: '1px solid #0098EA', boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#fff', textAlign: 'center', fontSize: '15px' }}>지갑 선택</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button onClick={() => selectWallet('Telegram Wallet')} style={{ width: '100%', padding: '10px 15px', background: 'rgba(0,152,234,0.1)', border: '1px solid #0098EA', borderRadius: '8px', color: '#fff', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box', cursor: 'pointer' }}><span>Telegram Wallet</span> <span style={{fontSize: '16px'}}>🔷</span></button>
              <button onClick={() => selectWallet('Tonkeeper')} style={{ width: '100%', padding: '10px 15px', background: 'rgba(255,255,255,0.05)', border: '1px solid #555', borderRadius: '8px', color: '#fff', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box', cursor: 'pointer' }}><span>Tonkeeper</span> <span style={{fontSize: '16px'}}>🛡️</span></button>
            </div>
            <button onClick={() => setModals(m => ({ ...m, wallet: false }))} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#aaa', marginTop: '5px', fontSize: '13px', cursor: 'pointer' }}>취소</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="main-wrap" style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.6), rgba(26, 15, 20, 0.8)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e6d5b8', minHeight: '100vh', fontFamily: "'Cinzel', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '80px', boxSizing: 'border-box' }}>
      <style>{`
        * { box-sizing: border-box; }
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; transition: 0.2s; }
        .btn-auto-on { background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid #06b6d4; }
        .glass-panel { background: rgba(20, 20, 25, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; }
        .sticky-header { position: sticky; top: 0; z-index: 100; width: 100%; background: rgba(15,15,20,0.95); border-bottom: 2px solid #fbbf24; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 5px 15px rgba(0,0,0,0.5); margin-bottom: 20px; }
        .balance-sticky { font-size: 24px; font-weight: bold; color: #fbbf24; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(15,15,20,0.95); border-top: 1px solid #fbbf24; display: flex; justify-content: space-around; padding: 10px 5px; z-index: 900; backdrop-filter: blur(10px); padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
        .bottom-nav button { flex: 1; background: transparent; border: none; color: #e6d5b8; font-weight: bold; font-size: 15px; padding: 10px 0; border-right: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
        .bottom-nav button:last-child { border-right: none; }
        .img-box { width: 100%; aspect-ratio: 1 / 1; font-size: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; overflow: hidden; position: relative; background: linear-gradient(145deg, #1e1e24, #0a0a0f); box-shadow: inset 0 0 15px rgba(251,191,36,0.2); }
        .img-box img { width: 85%; height: 85%; object-fit: contain; }
        .img-box-special { width: 40%; background: linear-gradient(135deg, #1a0b2e, #3b0764); border: 2px solid #fbbf24; font-size: 60px; box-shadow: 0 0 20px rgba(168,85,247,0.4); }
        @keyframes blueFlash { 0% { border-color: #06b6d4; box-shadow: 0 0 25px #06b6d4, inset 0 0 15px #06b6d4; } 100% { border-color: rgba(197, 160, 89, 0.3); box-shadow: none; } }
        @keyframes redFlash { 0% { border-color: #ef4444; box-shadow: 0 0 25px #ef4444, inset 0 0 15px #ef4444; } 100% { border-color: rgba(197, 160, 89, 0.3); box-shadow: none; } }
        .anim-success { animation: blueFlash 0.6s ease-out-in; border-width: 2px !important; }
        .anim-fail { animation: redFlash 0.6s ease-out-in; border-width: 2px !important; }
        .grid-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; max-width: 850px; padding: 0 10px; margin-bottom: 15px; }
        .stat-box { padding: 15px; text-align: center; border-radius: 8px; }
        .grid-hunts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; width: 100%; max-width: 850px; margin-bottom: 20px; padding: 0 10px; }
        .hunt-box { padding: 12px; display: flex; flex-direction: column; justify-content: center; text-align: center; border-radius: 12px; }
        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; padding: 0 10px; }
        .gear-card { padding: 15px; border-top: 4px solid #555; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; transition: all 0.3s; }
        .stat-badge { background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-bottom: 6px; width: 100%; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; alignItems: center; justify-content: center; padding: 20px; }
        @media (max-width: 768px) { .grid-hunts { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; } .hunt-box:nth-child(5) { grid-column: 1 / -1; } .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; } .img-box-special { width: 35%; } }
      `}</style>

      <div className="sticky-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '11px', color: '#06b6d4' }}>{state.walletAddress}</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>[{state.userTitle}] {state.userName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="balance-sticky">{Math.floor(state.balance).toLocaleString()} <span style={{fontSize: '12px', color: '#c5a059'}}>GOU</span></div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '0 10px', marginBottom: '20px' }}>
        
        {/* 🔥 12시간 홀딩 수확 시스템 */}
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '15px', textAlign: 'center', border: '2px solid #fbbf24', background: 'linear-gradient(rgba(0,0,0,0.4), rgba(251,191,36,0.05))' }}>
          <div style={{ color: '#aaa', fontSize: '12px' }}>📦 영지 임시 저장고 (최대 12시간 적립 가능)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24', margin: '8px 0' }}>
            {Math.floor(state.pendingGOU).toLocaleString()} <span style={{fontSize: '14px', color:'#fff'}}>GOU 쌓임</span>
          </div>
          <div style={{ fontSize: '11px', color: (Date.now() - state.lastClaimTime >= 12*3600*1000) ? '#ef4444' : '#06b6d4', marginBottom: '12px', fontWeight: 'bold' }}>
            {Date.now() - state.lastClaimTime >= 12*3600*1000 ? "🚨 저장고 한계 도달! 수확하지 않으면 채굴 정지!" : `⏱️ 다음 제한까지: ${Math.max(0, (12 - (Date.now() - state.lastClaimTime) / 3600000).toFixed(2))}시간 남음`}
          </div>
          <button onClick={claimGOU} className="btn-neon" style={{ background: '#fbbf24', color: '#000', fontSize: '16px', border: 'none', boxShadow: '0 0 15px rgba(251,191,36,0.4)' }}>🌾 영지 자원 수확하기 (지갑 인출)</button>
        </div>

        {/* 🔥 1분봉 미니게임 */}
        <div className="glass-panel" style={{ padding: '15px', marginBottom: '15px', border: '1px solid #a855f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '14px' }}>📈 1분봉 크립토 Up & Down 미니게임</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>현재 배팅금: <span style={{color:'#fff', fontWeight:'bold'}}>{currentBetSize.toLocaleString()} GOU</span></div>
            <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '4px', fontWeight: 'bold' }}>🎫 보유 티켓: {state.gameTickets} / 5개</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={refillTicketWithAd} style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid #a855f7', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>🎥 광고보고 티켓+1</button>
            <button onClick={() => setModals(m => ({ ...m, game: true }))} style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>게임장 입장</button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '15px', marginBottom: '15px', textAlign: 'center', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
          <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>🤝 친구 초대할 때마다 둘 다 10만 GOU 무한 지급!</div>
          <button onClick={copyReferralLink} className="btn-neon" style={{ borderColor: '#10b981', color: '#10b981', padding: '6px', fontSize: '12px' }}>초대 링크 복사하기 🔗</button>
        </div>

        <div className="grid-stats">
          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(6,182,212,0.3)' }}>
            <div style={{ color: '#06b6d4', fontSize: '12px', fontWeight: 'bold' }}>📈 실시간 총 생산율</div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: '5px 0' }}>+{dailyGainDisplay.toLocaleString()} / 일</div>
            <button onClick={watchAd} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 0', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>{state.adBuffEndTime > Date.now() ? '버프 활성화 됨 🔥' : '광고 보고 2배 받기'}</button>
          </div>
          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>🔥 누적 소각 (단계: {hState.step})</div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: '5px 0' }}>{Math.floor(state.burned).toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>반감기 배율: X{hState.mult}</div>
          </div>
          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(197,160,89,0.3)' }}>
            <div style={{ color: '#c5a059', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>⚔️ 통합 보너스 (+{totalBonusPct}%)</div>
            <div style={{ fontSize: '11px' }}>ALL 30강: +{setBonus}% | 장화: +{shoesBonus}% | 펫: +{petBonus}% | 성: +{castleBonus}%</div>
          </div>
          <div className="glass-panel stat-box" style={{ border: '1px solid rgba(147,51,234,0.5)', background: 'rgba(147,51,234,0.1)', cursor: 'pointer' }} onClick={() => alert('시즌 종료 직후 유동성 풀이 활성화됩니다!')}>
            <div style={{ color: '#a855f7', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>💱 DEX 스왑 풀</div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', marginTop: '8px' }}>거래소 접속 ➡️</div>
          </div>
        </div>
      </div>

      {/* 🗺️ 사냥터 */}
      <div className="grid-hunts">
        {hunts.map(h => {
          const isActive = state.currentHunt === h.name && !currentHuntData.special;
          const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.req.sum;
          return (
            <div key={h.name} className={`glass-panel hunt-box`} style={{ border: isActive ? '1px solid #fbbf24' : (isUnlocked ? '1px solid #06b6d4' : '1px solid #555'), background: isActive ? 'rgba(251,191,36,0.15)' : '' }}>
              <b style={{ color: isActive ? '#fbbf24' : (isUnlocked ? '#fff' : '#888'), fontSize: '14px', marginBottom: '5px' }}>{isActive ? '⚔️ ' : (isUnlocked ? '🔓 ' : '🔒 ')}{h.name}</b>
              {h.name !== '초원' && <div style={{ fontSize: '10px', background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '5px', margin: '5px 0', color: '#e6d5b8' }}>공 {h.req.atk} | 체 {h.req.hp} | 방 {h.req.def}</div>}
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>총합 {h.req.sum} <span style={{color: '#c5a059'}}>(X{h.mult})</span></div>
            </div>
          );
        })}
      </div>

      {/* ⚔️ 장비 */}
      <div className="gears-grid">
        {gears.map((g, index) => {
          const animClass = anims[g.id] ? `anim-${anims[g.id]}` : '';
          const isMax = g.lvl >= 30; 
          return (
            <div key={g.id} className={`glass-panel gear-card ${animClass}`} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="img-box">
                {imageErrors[g.id] ? <span style={{zIndex:2}}>{g.emoji}</span> : <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt="" onError={() => handleImgError(g.id)} />}
              </div>
              <div className="stat-badge" style={{ color: '#c5a059' }}>{g.stat} <span style={{color: '#fff'}}>+{(g.lvl * g.base).toFixed(1)}{g.unit}</span></div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', margin: '6px 0', color: '#fff' }}>{g.name} <span style={{color: '#fbbf24'}}>+{g.lvl}</span></div>
              
              <div className="stat-badge" style={{ color: '#aaa', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>확률</span><span style={{color: isMax ? '#fbbf24' : '#06b6d4', fontWeight: 'bold'}}>{isMax ? 'MAX' : `${(getRate(g.lvl, gears[6].lvl)*100).toFixed(1)}%`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>비용</span><span>{isMax ? 'MAX' : getCost(g.lvl, gears[5].lvl).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '6px' }}>
                <button onClick={() => upgrade(g.id)} disabled={isMax} className="btn-neon" style={{fontSize: '12px'}}>{isMax ? '만렙완료' : '강화'}</button>
                <button onClick={() => toggleAuto(g.id)} disabled={isMax} className={`btn-neon ${state.autoTimers[g.id] ? 'btn-auto-on' : ''}`} style={{fontSize: '12px'}}>
                  {state.autoTimers[g.id] ? 'STOP' : 'AUTO'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🐉 펫 & 성 */}
      <div style={{ width: '100%', maxWidth: '850px', padding: '0 10px', marginTop: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px 15px', marginBottom: '15px', position: 'relative', textAlign: 'center' }}>
          {!state.petActive && <div style={{ position: 'absolute', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px', fontWeight: 'bold' }}>🔒 장비 ALL 30강 달성 시 개방</div>}
          <div className={`img-box img-box-special ${anims['pet'] ? `anim-${anims['pet']}` : ''}`}>
            {imageErrors['pet'] ? <span>🐉</span> : <img src={`${process.env.PUBLIC_URL}/pet.png`} alt="" onError={() => handleImgError('pet')} />}
          </div>
          <h3 style={{ margin: '10px 0', color: '#fbbf24', fontSize: '20px', cursor: 'pointer' }} onClick={renamePet}>{state.petName} ✏️ <span style={{fontSize: '14px', color: '#fff'}}>Lv.{state.petLevel}</span></h3>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px' }}>
            획득량 <span style={{color: '#06b6d4', fontWeight: 'bold'}}>+{getPetBonus(state.petLevel)}%</span><br/>
            {/* 🔥 여기서 에러가 났었습니다! 깔끔하게 수정 완료! */}
            비용: {state.petLevel >= 50 ? 'MAX' : getPetCost(state.petLevel, gears[5].lvl).toLocaleString()} | 확률: <span style={{color: state.petLevel >= 50 ? '#fbbf24' : '#06b6d4', fontWeight:'bold'}}>{state.petLevel >= 50 ? 'MAX' : `${(getPetRate(state.petLevel, gears[6].lvl)*100).toFixed(1)}%`}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={upgradePet} disabled={state.petLevel >= 50} className="btn-neon" style={{ flex: 1, background: 'rgba(239,68,68,0.2)' }}>펫 강화</button>
            <button onClick={toggleAutoPet} disabled={state.petLevel >= 50} className={`btn-neon ${state.autoTimers['pet'] ? 'btn-auto-on' : ''}`} style={{ flex: 1 }}>{state.autoTimers['pet'] ? 'STOP' : 'AUTO'}</button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 15px', position: 'relative', textAlign: 'center' }}>
          {!state.castleActive && <div style={{ position: 'absolute', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px', fontWeight: 'bold' }}>🔒 펫 50강 달성 시 개방</div>}
          <div className={`img-box img-box-special ${anims['castle'] ? `anim-${anims['castle']}` : ''}`}>
            {imageErrors['castle'] ? <span>🏰</span> : <img src={`${process.env.PUBLIC_URL}/castle.png`} alt="" onError={() => handleImgError('castle')} />}
          </div>
          <h3 style={{ margin: '10px 0', color: '#fbbf24', fontSize: '20px', cursor: 'pointer' }} onClick={renameCastle}>{state.castleName} ✏️ <span style={{fontSize: '14px', color: '#fff'}}>Lv.{state.castleLevel}</span></h3>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px' }}>
            획득량 <span style={{color: '#06b6d4', fontWeight: 'bold'}}>+{getCastleBonus(state.castleLevel)}%</span><br/>
            비용: {state.castleLevel >= 50 ? 'MAX' : getCastleCost(state.castleLevel, gears[5].lvl).toLocaleString()} | 확률: <span style={{color: state.castleLevel >= 50 ? '#fbbf24' : '#06b6d4', fontWeight:'bold'}}>{state.castleLevel >= 50 ? 'MAX' : `${(getPetRate(state.castleLevel, gears[6].lvl)*100).toFixed(1)}%`}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={upgradeCastle} disabled={state.castleLevel >= 50} className="btn-neon" style={{ flex: 1, background: 'rgba(239,68,68,0.2)' }}>성 강화</button>
            <button onClick={toggleAutoCastle} disabled={state.castleLevel >= 50} className={`btn-neon ${state.autoTimers['castle'] ? 'btn-auto-on' : ''}`} style={{ flex: 1 }}>{state.autoTimers['castle'] ? 'STOP' : 'AUTO'}</button>
          </div>
        </div>
      </div>

      <div className="bottom-nav">
        <button onClick={() => setModals(m => ({...m, rank: true}))}>🏆 랭킹</button>
        <button onClick={() => setModals(m => ({...m, prob: true}))}>📊 확률/비용</button>
        <button onClick={() => setModals(m => ({...m, token: true}))}>🪙 토크노믹스</button>
      </div>

      {/* 🔥 미니게임 모달 */}
      {modals.game && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '20px', background: 'rgba(15,15,20,0.98)', border: '2px solid #a855f7' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', margin: '0 0 10px 0' }}>📈 실시간 1분봉 트레이딩</h2>
            <div style={{ background: '#000', padding: '15px', borderRadius: '8px', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '4px', border: '1px solid #333', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '11px', color: '#888' }}>시작지점: {miniGame.chartData[0]?.toFixed(1)}</div>
              <div style={{ position: 'absolute', top: '25px', left: '10px', fontSize: '14px', fontWeight: 'bold', color: miniGame.chartData[miniGame.chartData.length-1] >= miniGame.chartData[0] ? '#06b6d4' : '#ef4444' }}>현재가격: {miniGame.chartData[miniGame.chartData.length-1]?.toFixed(1)}</div>
              {miniGame.chartData.map((val, i) => {
                const heightPct = Math.min(95, Math.max(5, (val / 200) * 100));
                return <div key={i} style={{ flex: 1, height: `${heightPct}%`, background: miniGame.chartData[i] >= (miniGame.chartData[i-1] || miniGame.chartData[0]) ? '#06b6d4' : '#ef4444', borderRadius: '2px' }} />
              })}
            </div>
            <div style={{ textAlign: 'center', margin: '15px 0' }}>
              <div style={{ fontSize: '12px', color: '#aaa' }}>남은 거래시간</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>{miniGame.timer} <span style={{fontSize:'16px'}}>초</span></div>
              <div style={{ fontSize: '13px', marginTop: '5px' }}>이번 라운드 계약금: <b style={{color:'#fbbf24'}}>{miniGame.betSize.toLocaleString()} GOU</b></div>
            </div>
            {miniGame.status === 'playing' ? (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', textAlign: 'center', color: miniGame.prediction === 'UP' ? '#06b6d4' : '#ef4444', fontWeight: 'bold' }}>
                {miniGame.prediction === 'UP' ? "🔷 가격 상승(UP)에 계약을 체결했습니다." : "🔻 가격 하락(DOWN)에 계약을 체결했습니다."}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => startMiniGame('UP')} style={{ flex: 1, background: '#06b6d4', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>🔷 롱 (UP)</button>
                <button onClick={() => startMiniGame('DOWN')} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>🔻 숏 (DOWN)</button>
              </div>
            )}
            <button onClick={() => { if (miniGame.status === 'playing') { alert("계약 거래가 진행중일 때는 퇴장할 수 없습니다!"); return; } setModals(m => ({ ...m, game: false })); }} className="btn-neon" style={{ marginTop: '15px', borderColor: '#555', color: '#aaa' }}>닫기 / 거래소 퇴장</button>
          </div>
        </div>
      )}

      {/* 🔥 랭킹 모달 */}
      {modals.rank && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px', background: 'rgba(20,20,25,0.95)' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', marginTop: 0 }}>🏆 실시간 랭킹</h2>
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

      {/* 🔥 복구된 확률 모달 */}
      {modals.prob && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px', background: 'rgba(20,20,25,0.95)', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', color: '#06b6d4', marginTop: 0 }}>📊 확률 & 기본 비용 (x10 적용됨)</h2>
            <p style={{fontSize:'11px', color:'#aaa', textAlign: 'center', marginBottom: '20px'}}>* 실제 비용은 반감기 및 목걸이 레벨에 따라 감소합니다.</p>
            <h3 style={{color: '#e6d5b8', fontSize: '15px'}}>⚔️ 일반 장비 강화</h3>
            <table style={{ width: '100%', fontSize: '13px', textAlign: 'center', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead><tr style={{ borderBottom: '1px solid #555', color: '#fbbf24' }}><th>구간</th><th>성공률</th><th>기본 비용</th></tr></thead>
              <tbody style={{ color: '#fff' }}>
                <tr><td style={{padding: '8px 0'}}>1~4강</td><td>100%</td><td>10,000~</td></tr>
                <tr style={{background: 'rgba(255,255,255,0.05)'}}><td style={{padding: '8px 0'}}>5~9강</td><td>70%</td><td>50,000~</td></tr>
                <tr><td style={{padding: '8px 0'}}>10~19강</td><td>60~50%</td><td>100,000~</td></tr>
                <tr style={{background: 'rgba(255,255,255,0.05)'}}><td style={{padding: '8px 0'}}>20~29강</td><td style={{color:'#ef4444'}}>47~20%</td><td>1,000,000~</td></tr>
              </tbody>
            </table>
            <h3 style={{color: '#e6d5b8', fontSize: '15px'}}>🐉 펫 & 🏰 성 강화</h3>
            <table style={{ width: '100%', fontSize: '13px', textAlign: 'center', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #555', color: '#fbbf24' }}><th>구간</th><th>성공률</th><th>펫/성 비용</th></tr></thead>
              <tbody style={{ color: '#fff' }}>
                <tr><td style={{padding: '8px 0'}}>1~4강</td><td>100%</td><td>1,000~ / 10,000~</td></tr>
                <tr style={{background: 'rgba(255,255,255,0.05)'}}><td style={{padding: '8px 0'}}>5~9강</td><td>70%</td><td>5,000~ / 50,000~</td></tr>
                <tr><td style={{padding: '8px 0'}}>10~19강</td><td>65~60%</td><td>10,000~ / 100,000~</td></tr>
                <tr style={{background: 'rgba(255,255,255,0.05)'}}><td style={{padding: '8px 0'}}>20~29강</td><td>55~50%</td><td>100,000~ / 1,000,000~</td></tr>
                <tr><td style={{padding: '8px 0'}}>30~39강</td><td>45~40%</td><td>1,000,000~ / 10,000,000~</td></tr>
                <tr style={{background: 'rgba(255,255,255,0.05)'}}><td style={{padding: '8px 0'}}>40~50강</td><td style={{color:'#ef4444'}}>38~20%</td><td>10,000,000~ / 1억~</td></tr>
              </tbody>
            </table>
            <button onClick={() => setModals(m => ({...m, prob: false}))} className="btn-neon" style={{ marginTop: '25px', borderColor: '#888', color: '#aaa' }}>닫기</button>
          </div>
        </div>
      )}

      {/* 🔥 복구된 토크노믹스 모달 */}
      {modals.token && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '25px 20px', background: 'rgba(20,20,25,0.95)' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', marginTop: 0 }}>🪙 토크노믹스 시스템</h2>
            <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#e6d5b8', padding: '10px 0' }}>
              <b style={{color: '#fff'}}>📌 기본 분배 비율 (현재 단계)</b><br/>
              - 영구 소각(Burn): <span style={{color: '#ef4444'}}>{(hState.rates.burn * 100).toFixed(0)}%</span><br/>
              - 마이닝 풀 재귀속: <span style={{color: '#06b6d4'}}>{(hState.rates.pool * 100).toFixed(0)}%</span><br/>
              - 유동성(LP) 공급: <span style={{color: '#a855f7'}}>{(hState.rates.lp * 100).toFixed(0)}%</span><br/>
              - 시즌 보상 기금: <span style={{color: '#fbbf24'}}>{(hState.rates.jackpot * 100).toFixed(0)}%</span><br/>
              - 운영비 보존: {(hState.rates.reserve * 100).toFixed(0)}%<br/><br/>
              <b style={{color: '#ef4444'}}>🔥 1차 반감기 (총 20% 소각 시)</b><br/>
              - 일일 획득량 50% 감소 적용<br/>
              - 실패 시 분배율: 풀 25%, 시즌보상 10% 등으로 자동 조정<br/><br/>
              <b style={{color: '#ef4444'}}>🔥 2차 반감기 (총 60% 소각 시)</b><br/>
              - 일일 획득량 추가 50% 감소
            </div>
            <button onClick={() => setModals(m => ({...m, token: false}))} className="btn-neon" style={{ marginTop: '25px', borderColor: '#888', color: '#aaa' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}