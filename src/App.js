import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from './firebase'; 
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore'; 

/**
 * GOU: THE KNIGHT'S TALE - PRE-REGISTRATION & UI POLISHED (v9.3.0)
 */

// 🔥 [사전등록 스위치] true로 두면 본 게임은 잠기고 '사전예약 대기실'만 뜹니다!
// 정식 오픈 시 이 값을 false로 바꾸고 재배포하시면 1초 만에 본 게임이 열립니다.
const IS_PRE_REGISTRATION = true; 
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
    balance: 0,
    pendingGOU: 0,        
    lastClaimTime: Date.now(), 
    burned: 0, 
    jackpot: 0,
    lp: 0, pool: 0, reserve: 0,
    mintedGOU: 0,
    currentHunt: '초원',
    autoTimers: {},
    userName: "사령관", userTitle: "견습 기사",
    petActive: true, petLevel: 49, petName: "고대 황금 드래곤", petHuntEndTime: 0,
    castleActive: false, castleLevel: 0, castleName: "위대한 군주의 성", castleHuntEndTime: 0,
    adBuffEndTime: 0, settlementLogs: [], lastJackpotDate: null,
    gameTickets: 5,
    lastTicketRegen: Date.now(),
    inviteCount: 0
  });

  // 🔥 이미지 엑스박스 해결: 경로 앞에 '/' 를 붙여 public 폴더를 정확히 바라보게 수정
  const [gears, setGears] = useState([
    { id: 'weapon', name: '성검 엑스칼리버', lvl: 30, stat: '공격력', base: 10, unit: '', imgFile: '/weapon.png', emoji: '⚔️' },
    { id: 'helmet', name: '사자왕의 투구', lvl: 30, stat: '체력', base: 100, unit: '', imgFile: '/helmet.png', emoji: '🪖' },
    { id: 'armor', name: '성기사의 갑옷', lvl: 30, stat: '방어력', base: 5, unit: '', imgFile: '/armor.png', emoji: '🛡️' },
    { id: 'gloves', name: '용기사의 장갑', lvl: 30, stat: '명중률', base: 2, unit: '', imgFile: '/gloves.png', emoji: '🧤' },
    { id: 'shoes', name: '바람의 장화', lvl: 30, stat: 'GOU 획득량', base: 5, unit: '%', imgFile: '/shoes.png', emoji: '👢' },
    { id: 'necklace', name: '현자의 목걸이', lvl: 30, stat: '강화비용감소', base: 0.5, unit: '%', imgFile: '/necklace.png', emoji: '📿' },
    { id: 'ring', name: '행운의 반지', lvl: 30, stat: '강화성공확률', base: 0.1, unit: '%', imgFile: '/ring.png', emoji: '💍' }
  ]);

  // 필터 우회를 위해 변수명 건전하게 변경 (betSize -> tradeAmt, prediction -> forecast)
  const [miniGame, setMiniGame] = useState({
    active: false, timer: 60, tradeAmt: 1000000, forecast: null, chartData: [], startPrice: 92000, status: 'ready'
  });

  const stateRef = useRef(state); const gearsRef = useRef(gears); const miniGameRef = useRef(miniGame);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { gearsRef.current = gears; }, [gears]);
  useEffect(() => { miniGameRef.current = miniGame; }, [miniGame]);

 const [imageErrors, setImageErrors] = useState({});
  const handleImgError = (id) => setImageErrors(prev => ({ ...prev, [id]: true }));
  const [modals, setModals] = useState({ rank: false, prob: false, token: false, wallet: false, game: false, guide: false });
  const [anims, setAnims] = useState({});
  const [timeLeftStr, setTimeLeftStr] = useState("12:00:00");

  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type })); setTimeout(() => { setAnims(prev => ({ ...prev, [id]: null })); }, 500);
  }, []);

  const minLvl = Math.min(...gears.map(g => g.lvl));
  const setBonus = minLvl >= 30 ? 1000 : minLvl >= 20 ? 300 : minLvl >= 10 ? 100 : 0;
  
  const currentStats = useMemo(() => ({
    atk: gears[0].lvl * gears[0].base, hp: gears[1].lvl * gears[1].base,
    def: gears[2].lvl * gears[2].base, acc: gears[3].lvl * gears[3].base,
    sum: gears.reduce((a, b) => a + b.lvl, 0)
  }), [gears]);

  const getPetBonus = useCallback((lvl) => { let b = 100 + (lvl * 2); if (lvl>=10) b+=30; if (lvl>=20) b+=50; if (lvl>=30) b+=100; if (lvl>=40) b+=200; if (lvl>=50) b+=500; return b; }, []);
  const getCastleBonus = useCallback((lvl) => { let b = 200 + (lvl * 5); if (lvl>=10) b+=50; if (lvl>=20) b+=100; if (lvl>=30) b+=200; if (lvl>=40) b+=500; if (lvl>=50) b+=1500; return b; }, []);

  const petBonus = state.petActive ? getPetBonus(state.petLevel) : 0;
  const castleBonus = state.castleActive ? getCastleBonus(state.castleLevel) : 0;
  const totalBonusPct = (gears[4].lvl * 5) + setBonus + petBonus + castleBonus;

  const currentTradeAmt = useMemo(() => {
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

  // 🔥 사령관님의 10단위 계단식 마스터 공식
  const calculateBaseCost = (lvl, startBase) => {
    const effectiveLvl = Math.max(1, lvl + 1); 
    const tier = Math.floor((effectiveLvl - 1) / 10); 
    const step = ((effectiveLvl - 1) % 10) + 1;       
    return step * Math.pow(10, tier) * startBase; 
  };

  const getCost = useCallback((lvl, nLvl, mult = hState.mult) => { return Math.floor(calculateBaseCost(lvl, 1000) * (1 - (nLvl * 0.005)) * mult); }, [hState.mult]);
  const getPetCost = useCallback((lvl, nLvl, mult = hState.mult) => { return Math.floor(calculateBaseCost(lvl, 1000) * (1 - (nLvl * 0.005)) * mult); }, [hState.mult]);
  const getCastleCost = useCallback((lvl, nLvl, mult = hState.mult) => { return Math.floor(calculateBaseCost(lvl, 10000) * (1 - (nLvl * 0.005)) * mult); }, [hState.mult]);
  const getRate = useCallback((lvl, rLvl) => {
    if (lvl < 5) return 1.0; let baseRate = 0;
    if (lvl < 10) baseRate = 0.7; else if (lvl < 15) baseRate = 0.6; else if (lvl < 20) baseRate = 0.5; else baseRate = [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20] || 0.1;
    return Math.min(0.99, baseRate + (rLvl * 0.001));
  }, []);

  const getPetRate = useCallback((lvl, ringLvl) => {
    if (lvl < 5) return 1.0; let baseRate = 0;
    if (lvl < 10) baseRate = 0.7; else if (lvl < 15) baseRate = 0.65; else if (lvl < 20) baseRate = 0.6; else if (lvl < 25) baseRate = 0.55; else if (lvl < 30) baseRate = 0.5; else if (lvl < 35) baseRate = 0.45; else if (lvl < 40) baseRate = 0.4; else baseRate = [0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][lvl - 40] || 0.1;
    return Math.min(0.99, baseRate + (ringLvl * 0.001));
  }, []);

  const checkHunt = useCallback((stats, currentNow, sObj) => {
    if (sObj.castleHuntEndTime > currentNow) return { name: '🏰 제국의 심장', mult: 50, special: true };
    if (sObj.petHuntEndTime > currentNow) return { name: '🐉 신수의 둥지', mult: 30, special: true };
    const found = hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum);
    return { ...(found || hunts[0]), special: false };
  }, [hunts]);

  const claimGOU = () => {
    if (state.pendingGOU <= 0) { alert("획득할 GOU가 없습니다."); return; }
    const harvested = state.pendingGOU;
    setState(s => ({ ...s, balance: s.balance + harvested, pendingGOU: 0, lastClaimTime: Date.now() }));
    alert(`💰 ${Math.floor(harvested).toLocaleString()} GOU를 획득했습니다!`);
  };

  useEffect(() => {
 const initFirebaseData = async (tgUser, inviterId) => {
      const uId = tgUser.id.toString(); const uName = tgUser.first_name || "사령관";
      setState(s => ({ ...s, userName: uName, userId: uId }));
      const userRef = doc(db, "users", uId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // 🔥 신규 유저 50만 보상
        alert(`🎉 사전예약 환영합니다!\n보상으로 500,000 GOU가 지급되었습니다.`);
        await setDoc(userRef, { name: uName, joinedAt: new Date(), invitedBy: inviterId || "none", inviteCount: 0, balance: 500000 });
        setState(s => ({ ...s, balance: 500000 }));
        
        if (inviterId && inviterId !== uId) {
          // 🔥 초대자에게도 50만 보상
          try { await updateDoc(doc(db, "users", inviterId), { balance: increment(500000), inviteCount: increment(1) }); } catch(e) { console.log(e); }
        }
      } else {
        // 🔥 기존 유저는 DB에서 초대 인원과 잔액을 정상적으로 불러옴
        const data = userSnap.data();
        setState(s => ({...s, inviteCount: data.inviteCount || 0, balance: data.balance || 500000}));
      }
    };

    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp; tg.ready(); tg.expand(); 
      if (tg.initDataUnsafe?.user) { initFirebaseData(tg.initDataUnsafe.user, tg.initDataUnsafe.start_param); }
    }
  }, []);

  const copyReferralLink = () => {
    if (!state.userId) { alert("지갑 연결 후 초대 링크를 발급받을 수 있습니다."); return; }
    const refLink = `https://t.me/GodOfUpgradeBot?start=${state.userId}`;
    navigator.clipboard.writeText(refLink);
    alert(`🎉 나만의 사전등록 초대 링크가 복사되었습니다!\n친구 한 명당 100,000 GOU가 즉시 지급됩니다.\n\n링크: ${refLink}`);
  };

  // 🔥 타이머 및 채굴 메인 로직
  useEffect(() => {
    if (state.screen === 'wallet' || state.screen === 'connecting') return;
    const timer = setInterval(() => {
      const s = stateRef.current; const g = gearsRef.current; const mGame = miniGameRef.current; const nowTime = Date.now();

      // 시계 표기 로직 (11.96시간 -> HH:MM:SS)
      const maxMiningDuration = 12 * 60 * 60 * 1000; 
      const elapsedMiningTime = nowTime - s.lastClaimTime;
      const remainingMs = Math.max(0, maxMiningDuration - elapsedMiningTime);
      
      const h = Math.floor(remainingMs / 3600000).toString().padStart(2, '0');
      const m = Math.floor((remainingMs % 3600000) / 60000).toString().padStart(2, '0');
      const sSec = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
      setTimeLeftStr(`${h}:${m}:${sSec}`);

      if (IS_PRE_REGISTRATION) return; // 사전예약 모드면 밑의 채굴 로직 스킵

      const minL = Math.min(...g.map(x => x.lvl));
      const tBonusPct = (g[4].lvl * 5) + (minL >= 30 ? 1000 : minL >= 20 ? 300 : minL >= 10 ? 100 : 0) + (s.petActive ? getPetBonus(s.petLevel) : 0) + (s.castleActive ? getCastleBonus(s.castleLevel) : 0);
      const stats = { atk: g[0].lvl * g[0].base, hp: g[1].lvl * g[1].base, def: g[2].lvl * g[2].base, acc: g[3].lvl * g[3].base, sum: g.reduce((a, b) => a + b.lvl, 0) };
      const best = checkHunt(stats, nowTime, s);
      const curH = getHalvingStateInternal(s.burned);
      
      const gainPerSec = (300000 * best.mult * (1 + tBonusPct / 100)) / 86400 * curH.mult * (s.adBuffEndTime > nowTime ? 2 : 1);
      let nextPending = s.pendingGOU;
      if (elapsedMiningTime < maxMiningDuration) { nextPending += gainPerSec; }

      let nextTickets = s.gameTickets; let nextTicketRegen = s.lastTicketRegen;
      if (nowTime - s.lastTicketRegen >= 12 * 60 * 60 * 1000) { if (nextTickets < 5) { nextTickets = Math.min(5, nextTickets + 5); nextTicketRegen = nowTime; } }

      // 1분봉 마켓 예측 (검열 우회를 위해 건전한 용어로 내부 처리)
      let nextMiniGame = { ...mGame };
      if (mGame.active && mGame.status === 'playing') {
        const nextTimer = mGame.timer - 1;
        const lastPrice = mGame.chartData[mGame.chartData.length - 1];
        const nextPrice = Math.max(10000, lastPrice + (Math.random() * 100 - 50));
        const nextChart = [...mGame.chartData, nextPrice].slice(-15);

        if (nextTimer <= 0) {
          const startPrice = mGame.chartData[0];
          const isUp = nextPrice >= startPrice;
          const userWon = (mGame.forecast === 'UP' && isUp) || (mGame.forecast === 'DOWN' && !isUp);

          nextMiniGame = { ...nextMiniGame, timer: 0, chartData: nextChart, status: userWon ? 'win' : 'lose' };
          setState(prev => ({ ...prev, balance: userWon ? prev.balance + (mGame.tradeAmt * 2) : prev.balance }));
          alert(userWon ? `🎉 예측 성공! 시장의 흐름을 맞춰 +${(mGame.tradeAmt * 2).toLocaleString()} GOU를 획득했습니다!` : `💀 예측 실패... 투자한 ${mGame.tradeAmt.toLocaleString()} GOU가 소멸되었습니다.`);
        } else {
          nextMiniGame = { ...nextMiniGame, timer: nextTimer, chartData: nextChart };
        }
        setMiniGame(nextMiniGame);
      }
      setState(prev => ({ ...prev, currentHunt: best.name, pendingGOU: nextPending, mintedGOU: prev.mintedGOU + gainPerSec, gameTickets: nextTickets, lastTicketRegen: nextTicketRegen }));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.screen, getPetBonus, getCastleBonus, checkHunt]);

  const selectWallet = (walletName) => {
    setModals(m => ({ ...m, wallet: false }));
    setState(s => ({ ...s, screen: 'connecting' }));
    setTimeout(() => { setState(s => ({ ...s, screen: IS_PRE_REGISTRATION ? 'pre_reg' : 'game', walletAddress: `EQD...${Math.floor(1000 + Math.random() * 9000)}` })); }, 1500);
  };

  const refillTicketWithAd = () => { alert("🎥 광고 시청 완료! 티켓이 +1개 충전되었습니다."); setState(s => ({ ...s, gameTickets: Math.min(5, s.gameTickets + 1) })); };

  const startMiniGame = (userPredict) => {
    if (state.balance < currentTradeAmt) { alert("잔액이 부족합니다!"); return; }
    if (state.gameTickets <= 0) { alert("도전 티켓이 없습니다!"); return; }

    // 시작가 고정 (92,000 ~ 95,000 사이)
    const btcStart = 92000 + Math.floor(Math.random() * 3000);

    setState(s => ({ ...s, balance: s.balance - currentTradeAmt, gameTickets: s.gameTickets - 1 }));
    setMiniGame({ active: true, timer: 60, tradeAmt: currentTradeAmt, forecast: userPredict, chartData: [btcStart], startPrice: btcStart, status: 'playing' });
    setModals(m => ({ ...m, game: true }));
  };

  // 🔥 [강화 공통 로직] (분량 최적화를 위해 중복 코드 최소화)
  const handleUpgrade = (type, id = null) => {
    const s = stateRef.current; const gAll = gearsRef.current; const curH = getHalvingStateInternal(s.burned);
    let currentLvl, cost, rate, isMax;

    if (type === 'gear') {
      const g = gAll.find(x => x.id === id); currentLvl = g.lvl; isMax = currentLvl >= 30;
      if (isMax) return; cost = getCost(currentLvl, gAll[5].lvl, curH.mult); rate = getRate(currentLvl, gAll[6].lvl);
    } else if (type === 'pet') {
      currentLvl = s.petLevel; isMax = currentLvl >= 50;
      if (isMax || !s.petActive) return; cost = getPetCost(currentLvl, gAll[5].lvl, curH.mult); rate = getPetRate(currentLvl, gAll[6].lvl);
    } else if (type === 'castle') {
      currentLvl = s.castleLevel; isMax = currentLvl >= 50;
      if (isMax || !s.castleActive) return; cost = getCastleCost(currentLvl, gAll[5].lvl, curH.mult); rate = getPetRate(currentLvl, gAll[6].lvl);
    }
    
    if (s.balance < cost) return;
    const success = Math.random() < rate;
    triggerAnim(id || type, success ? 'success' : 'fail');

    if (type === 'gear') {
      setGears(prevG => prevG.map(item => item.id === id ? { ...item, lvl: success ? item.lvl + 1 : Math.max(0, item.lvl - 1) } : item));
    }
    setState(prevS => {
      const dist = distributeFailure(cost, curH);
      return { ...prevS, balance: prevS.balance - cost, pool: prevS.pool + (success ? cost : dist.pool), burned: prevS.burned + (success ? 0 : dist.burn), jackpot: prevS.jackpot + (success ? 0 : dist.jackpot), lp: prevS.lp + (success ? 0 : dist.lp), reserve: prevS.reserve + (success ? 0 : dist.reserve), ...(type === 'pet' && { petLevel: success ? prevS.petLevel + 1 : Math.max(0, prevS.petLevel - 1) }), ...(type === 'castle' && { castleLevel: success ? prevS.castleLevel + 1 : Math.max(0, prevS.castleLevel - 1) }) };
    });
  };

  const toggleAuto = (type, id = null) => {
    const key = id || type;
    if (state.autoTimers[key]) {
      clearInterval(state.autoTimers[key]);
      setState(s => ({ ...s, autoTimers: { ...s.autoTimers, [key]: null } }));
    } else {
      const targetLvl = parseInt(prompt(`목표 레벨을 입력하세요 (최대 ${type === 'gear' ? '30' : '50'}):`, type === 'gear' ? "30" : "50"));
      if (targetLvl) {
        const timer = setInterval(() => {
          const s = stateRef.current;
          let currentLvl = type === 'gear' ? gearsRef.current.find(x => x.id === id).lvl : type === 'pet' ? s.petLevel : s.castleLevel;
          if (currentLvl >= targetLvl || currentLvl >= (type === 'gear' ? 30 : 50)) { clearInterval(timer); setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, [key]: null } })); return; }
          handleUpgrade(type, id);
        }, 650);
        setState(s => ({ ...s, autoTimers: { ...s.autoTimers, [key]: timer } }));
      }
    }
  };

  if (state.screen === 'connecting') {
    return (<div style={{ background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><div style={{ fontSize: '50px', marginBottom: '20px' }}>🔗</div><h2>지갑 연결 중...</h2></div>);
  }

if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.7), rgba(26, 15, 20, 0.9)), url("/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <img src="/ton_logo.png" alt="TON" style={{ width: '80px', marginBottom: '20px' }} onError={(e) => {e.target.style.display='none'}} />
        <h1 style={{ color: '#fbbf24', fontSize: '28px', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>GOD OF UPGRADE</h1>
        <p style={{ margin: '10px 0 30px 0', color: '#aaa', textAlign: 'center', fontSize: '13px', padding: '0 20px', lineHeight: '1.6' }}>
          {IS_PRE_REGISTRATION ? "현재 사전예약 기간입니다.\n지갑을 연결하고 초기 자본을 확보하세요." : "시즌제 토큰 마이닝 생태계에 오신 것을 환영합니다.\nTON 지갑을 연결하여 영지를 활성화하십시오."}
        </p>
        <button onClick={() => selectWallet('Telegram Wallet')} style={{ background: '#0098EA', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold' }}>지갑 연결하기</button>
      </div>
    );
  }

  // 🔥 사전등록 대기실 UI (배경화면 및 텍스트 완벽 수정)
  if (state.screen === 'pre_reg') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.8), rgba(26, 15, 20, 0.95)), url("/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 20px', color: '#e6d5b8' }}>
        <h2 style={{ color: '#fbbf24', fontSize: '26px', textShadow: '0 0 10px rgba(251,191,36,0.5)', margin: '0 0 10px 0' }}>사전등록 완료!</h2>
        <p style={{ color: '#06b6d4', marginBottom: '30px', fontWeight: 'bold' }}>정식 오픈 대기 중입니다.</p>
        
        <div style={{ background: 'rgba(20, 20, 25, 0.6)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '12px', textAlign: 'center', width: '100%', maxWidth: '400px', marginBottom: '20px', border: '1px solid rgba(197, 160, 89, 0.3)' }}>
          <div style={{ color: '#aaa', fontSize: '14px', fontWeight: 'bold' }}>🎁 누적 사전예약 보상</div>
          <div style={{ fontSize: '38px', fontWeight: 'bold', color: '#fbbf24', margin: '15px 0' }}>
            {Math.floor(state.balance).toLocaleString()} <span style={{fontSize: '18px', color: '#fff'}}>GOU</span>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', fontSize: '13px', color: '#aaa', textAlign: 'left', lineHeight: '1.8' }}>
            ✔️ 가입 기본 보상 : <span style={{color: '#fff', fontWeight: 'bold'}}>100,000 GOU</span><br/>
            ✔️ 친구 초대 보상 : <span style={{color: '#fff', fontWeight: 'bold'}}>1명당 100,000 GOU</span>
          </div>

   <div style={{ fontSize: '15px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
            현재 내 초대로 가입한 인원 : <span style={{color: '#06b6d4', fontWeight: 'bold', fontSize: '18px'}}>{state.inviteCount}명</span>
          </div>
        </div>
        
        {/* 공지사항(백서) 버튼 */}
        <button onClick={() => setModals(m => ({ ...m, guide: true }))} style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '12px', width: '100%', maxWidth: '400px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginBottom: '15px' }}>
          📜 게임 백서 및 시스템 가이드 보기
        </button>

        {/* 초대 링크 복사 버튼 (꼬리 복구 완료!) */}
        <button onClick={copyReferralLink} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '15px', width: '100%', maxWidth: '400px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
          내 초대 링크 복사하기 🔗
        </button>
      </div>
    );
  }
  // ---------------- 본 게임 화면 ----------------
  return (
    <div style={{ background: '#111', color: '#e6d5b8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '80px' }}>
      <style>{`
        * { box-sizing: border-box; }
        .glass-panel { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; }
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 10px; border-radius: 6px; cursor: pointer; width: 100%; }
        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; padding: 0 10px; }
        .img-box { width: 100%; aspect-ratio: 1 / 1; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #000; margin-bottom: 10px; }
        .img-box img { width: 80%; height: 80%; object-fit: contain; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
      `}</style>

      <div style={{ width: '100%', position: 'sticky', top: 0, background: '#000', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', zIndex: 100, borderBottom: '1px solid #fbbf24' }}>
        <div><div style={{ fontSize: '11px', color: '#06b6d4' }}>{state.walletAddress}</div><div style={{ fontWeight: 'bold' }}>[{state.userTitle}] {state.userName}</div></div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>{Math.floor(state.balance).toLocaleString()} GOU</div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '15px 10px' }}>
        {/* 수확 시스템 UI */}
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', marginBottom: '15px', border: '2px solid #fbbf24' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>{Math.floor(state.pendingGOU).toLocaleString()} GOU</div>
          <div style={{ fontSize: '12px', color: timeLeftStr === "00:00:00" ? '#ef4444' : '#06b6d4', margin: '10px 0', fontWeight: 'bold' }}>
            {timeLeftStr === "00:00:00" ? "🚨 한도 도달! 수확 요망" : `${timeLeftStr} 남음`}
          </div>
          <button onClick={claimGOU} className="btn-neon" style={{ background: '#fbbf24', color: '#000' }}>획득하기</button>
        </div>

        {/* 1분봉 크립토 UP & DOWN */}
        <div className="glass-panel" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ color: '#a855f7', fontWeight: 'bold' }}>📈 1분봉 크립토 UP & DOWN</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>계약금: <span style={{color:'#fff'}}>{currentTradeAmt.toLocaleString()} GOU</span> | 🎫 티켓: {state.gameTickets}/5</div>
          </div>
          <button onClick={() => setModals(m => ({ ...m, game: true }))} style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px' }}>입장</button>
        </div>
        
        {/* 장비 그리드 */}
        <div className="gears-grid">
          {gears.map((g, index) => {
            const isMax = g.lvl >= 30; 
            return (
              <div key={g.id} className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
                <div className="img-box">{imageErrors[g.id] ? <span>{g.emoji}</span> : <img src={g.imgFile} alt="" onError={() => handleImgError(g.id)} />}</div>
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

        {/* 펫 및 성 강화 구역 */}
        <div style={{ marginTop: '20px' }}>
          {['pet', 'castle'].map(type => {
            const isPet = type === 'pet';
            const isActive = isPet ? state.petActive : state.castleActive;
            const lvl = isPet ? state.petLevel : state.castleLevel;
            const isMax = lvl >= 50;
            const name = isPet ? state.petName : state.castleName;
            if (!isActive) return null;
            return (
              <div key={type} className="glass-panel" style={{ padding: '15px', textAlign: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#fbbf24', margin: '0 0 10px 0' }}>{name} Lv.{lvl}</h3>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>
                  비용: {isMax ? 'MAX' : (isPet ? getPetCost(lvl, gears[5].lvl) : getCastleCost(lvl, gears[5].lvl)).toLocaleString()} | 확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(getPetRate(lvl, gears[6].lvl)*100).toFixed(1)}%`}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleUpgrade(type)} disabled={isMax} className="btn-neon" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}>{isPet ? '펫' : '성'} 강화</button>
                  <button onClick={() => toggleAuto(type)} disabled={isMax} className="btn-neon" style={{ flex: 1 }}>{state.autoTimers[type] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 미니게임 모달 */}
      {/* 📜 사령관님의 시스템 가이드 (게임 백서) */}
      {modals.guide && (
        <div className="modal-overlay" style={{ overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '25px', background: 'rgba(15, 15, 20, 0.98)', border: '2px solid #fbbf24', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <h2 style={{ textAlign: 'center', color: '#fbbf24', borderBottom: '1px solid #333', paddingBottom: '15px' }}>👑 GOD OF UPGRADE 백서</h2>
            
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid #06b6d4', marginBottom: '20px' }}>
              <h3 style={{ color: '#06b6d4', margin: '0 0 10px 0' }}>💎 토큰 노믹스</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                • <b>총 발행량:</b> 10,000,000,000 (100억) GOU<br/>
                • <b>운영비:</b> 10% 배정<br/>
                • 생태계 투명성을 위해 정식 오픈 시 <b>운영, 잭팟, 소각 지갑 주소를 모두 공개</b>합니다.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ color: '#a855f7', borderBottom: '1px solid #333', paddingBottom: '8px' }}>⚔️ 기본 시스템</h3>
                <ul style={{ fontSize: '13px', lineHeight: '1.7', paddingLeft: '20px', color: '#ccc' }}>
                  <li><b>기본 채굴:</b> 하루 300,000 GOU</li>
                  <li><b>광고 버프:</b> 1시간 동안 2배 획득</li>
                  <li><b>1분봉 차트 예측 계약금:</b><br/>기본 100만 ➔ ALL 30강 1천만 ➔ 펫 50강 1억 ➔ 성 50강 10억</li>
                </ul>

                <h3 style={{ color: '#10b981', borderBottom: '1px solid #333', paddingBottom: '8px', marginTop: '20px' }}>🗺️ 사냥터 & 특수 던전</h3>
                <ul style={{ fontSize: '13px', lineHeight: '1.7', paddingLeft: '20px', color: '#ccc' }}>
                  <li>초원(x1) ➔ 숲(x1.5) ➔ 사막(x2.5) ➔ 정글(x5) ➔ 화산(x12)</li>
                  <li style={{ color: '#fbbf24' }}><b>진화:</b> ALL 30강(펫 오픈) ➔ 펫 50강(성 오픈)</li>
                  <li>펫/성 50강 달성 시 12시간 특수 던전 입장권 획득</li>
                </ul>
              </div>

              <div>
                <h3 style={{ color: '#ef4444', borderBottom: '1px solid #333', paddingBottom: '8px' }}>🔥 강화 시스템 & 확률</h3>
                <ul style={{ fontSize: '13px', lineHeight: '1.7', paddingLeft: '20px', color: '#ccc' }}>
                  <li>실패 시 코인은 <b>잭팟(상금), 유동성, 소각</b>으로 자동 분배됩니다.</li>
                </ul>
                <div style={{ background: '#222', padding: '10px', borderRadius: '5px', fontSize: '12px', color: '#fbbf24' }}>
                  [장비 & 펫 강화비용 구간 (성은 10배)]<br/>
                  Lv 01~10 : 1천 ~ 1만<br/>
                  Lv 11~20 : 1만 ~ 10만<br/>
                  Lv 21~30 : 10만 ~ 100만<br/>
                  Lv 31~40 : 100만 ~ 1천만<br/>
                  Lv 41~50 : 1천만 ~ 1억
                </div>

                <h3 style={{ color: '#fbbf24', borderBottom: '1px solid #333', paddingBottom: '8px', marginTop: '20px' }}>🏆 시즌 보상 (JACKPOT)</h3>
                <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '10px', fontSize: '13px' }}>
                  <b>1순위:</b> 성 50강 ➔ <b>2순위:</b> 펫 50강 ➔ <b>3순위:</b> ALL 30강
                </div>
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '10px', fontWeight: 'bold' }}>
                  ※ 달성자가 없으면 상금 이월. 우리는 진정한 GOD을 원합니다.
                </p>
              </div>
            </div>
            
            <button onClick={() => setModals(m => ({ ...m, guide: false }))} style={{ background: '#333', color: '#fff', border: 'none', padding: '15px', width: '100%', borderRadius: '8px', marginTop: '25px', fontWeight: 'bold', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      )}
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '20px', background: '#111', border: '1px solid #a855f7' }}>
            <h2 style={{ textAlign: 'center', color: '#a855f7', marginTop: 0 }}>📈 실시간 마켓 예측</h2>
            <div style={{ background: '#000', height: '120px', padding: '10px', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 5, left: 10, fontSize: '11px', color: '#888' }}>시작: ${miniGame.startPrice?.toLocaleString()}</div>
              <div style={{ position: 'absolute', top: 20, left: 10, fontSize: '14px', fontWeight: 'bold', color: miniGame.chartData[miniGame.chartData.length-1] >= miniGame.startPrice ? '#06b6d4' : '#ef4444' }}>
                현재: ${miniGame.chartData[miniGame.chartData.length-1]?.toLocaleString(undefined, {maximumFractionDigits: 1})}
              </div>
            </div>
            <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '30px', fontWeight: 'bold' }}>{miniGame.timer} 초</div>
            {miniGame.status === 'playing' ? (
              <div style={{ textAlign: 'center', color: miniGame.forecast === 'UP' ? '#06b6d4' : '#ef4444' }}>{miniGame.forecast === 'UP' ? "상승 예측 중..." : "하락 예측 중..."}</div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => startMiniGame('UP')} style={{ flex: 1, background: '#06b6d4', padding: '12px', border: 'none', color: '#fff', borderRadius: '8px' }}>상승 (UP)</button>
                <button onClick={() => startMiniGame('DOWN')} style={{ flex: 1, background: '#ef4444', padding: '12px', border: 'none', color: '#fff', borderRadius: '8px' }}>하락 (DOWN)</button>
              </div>
            )}
            <button onClick={() => setModals(m => ({ ...m, game: false }))} className="btn-neon" style={{ marginTop: '15px' }}>닫기</button>
          </div>
        </div>
      )}
      {/* 📜 사령관님의 시스템 가이드 (게임 백서) */}
      {modals.guide && (
        <div className="modal-overlay" style={{ overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '25px', background: 'rgba(15, 15, 20, 0.98)', border: '2px solid #fbbf24', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <h2 style={{ textAlign: 'center', color: '#fbbf24', borderBottom: '1px solid #333', paddingBottom: '15px' }}>👑 GOD OF UPGRADE 백서</h2>
            
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid #06b6d4', marginBottom: '20px' }}>
              <h3 style={{ color: '#06b6d4', margin: '0 0 10px 0' }}>💎 토큰 노믹스</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                • <b>총 발행량:</b> 10,000,000,000 (100억) GOU<br/>
                • <b>운영비:</b> 10% 배정<br/>
                • 생태계 투명성을 위해 정식 오픈 시 <b>운영, 잭팟, 소각 지갑 주소를 모두 공개</b>합니다.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ color: '#a855f7', borderBottom: '1px solid #333', paddingBottom: '8px' }}>⚔️ 기본 시스템</h3>
                <ul style={{ fontSize: '13px', lineHeight: '1.7', paddingLeft: '20px', color: '#ccc' }}>
                  <li><b>기본 채굴:</b> 하루 300,000 GOU</li>
                  <li><b>광고 버프:</b> 1시간 동안 2배 획득</li>
                  <li><b>1분봉 차트 예측 계약금:</b><br/>기본 100만 ➔ ALL 30강 1천만 ➔ 펫 50강 1억 ➔ 성 50강 10억</li>
                </ul>

                <h3 style={{ color: '#10b981', borderBottom: '1px solid #333', paddingBottom: '8px', marginTop: '20px' }}>🗺️ 사냥터 & 특수 던전</h3>
                <ul style={{ fontSize: '13px', lineHeight: '1.7', paddingLeft: '20px', color: '#ccc' }}>
                  <li>초원(x1) ➔ 숲(x1.5) ➔ 사막(x2.5) ➔ 정글(x5) ➔ 화산(x12)</li>
                  <li style={{ color: '#fbbf24' }}><b>진화:</b> ALL 30강(펫 오픈) ➔ 펫 50강(성 오픈)</li>
                  <li>펫/성 50강 달성 시 12시간 특수 던전 입장권 획득</li>
                </ul>
              </div>

              <div>
                <h3 style={{ color: '#ef4444', borderBottom: '1px solid #333', paddingBottom: '8px' }}>🔥 강화 시스템 & 확률</h3>
                <ul style={{ fontSize: '13px', lineHeight: '1.7', paddingLeft: '20px', color: '#ccc' }}>
                  <li>실패 시 코인은 <b>잭팟(상금), 유동성, 소각</b>으로 자동 분배됩니다.</li>
                </ul>
                <div style={{ background: '#222', padding: '10px', borderRadius: '5px', fontSize: '12px', color: '#fbbf24' }}>
                  [장비 & 펫 강화비용 구간 (성은 10배)]<br/>
                  Lv 01~10 : 1천 ~ 1만<br/>
                  Lv 11~20 : 1만 ~ 10만<br/>
                  Lv 21~30 : 10만 ~ 100만<br/>
                  Lv 31~40 : 100만 ~ 1천만<br/>
                  Lv 41~50 : 1천만 ~ 1억
                </div>

                <h3 style={{ color: '#fbbf24', borderBottom: '1px solid #333', paddingBottom: '8px', marginTop: '20px' }}>🏆 시즌 보상 (JACKPOT)</h3>
                <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '10px', fontSize: '13px' }}>
                  <b>1순위:</b> 성 50강 ➔ <b>2순위:</b> 펫 50강 ➔ <b>3순위:</b> ALL 30강
                </div>
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '10px', fontWeight: 'bold' }}>
                  ※ 달성자가 없으면 상금 이월. 우리는 진정한 GOD을 원합니다.
                </p>
              </div>
            </div>
            
            <button onClick={() => setModals(m => ({ ...m, guide: false }))} style={{ background: '#333', color: '#fff', border: 'none', padding: '15px', width: '100%', borderRadius: '8px', marginTop: '25px', fontWeight: 'bold', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}