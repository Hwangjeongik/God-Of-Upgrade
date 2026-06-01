import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from './firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 
import { TonConnectButton } from '@tonconnect/ui-react';
import './App.css'; 
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * GOU: THE KNIGHT'S TALE - PRE-REGISTRATION & UI POLISHED (v9.4.0)
 */

// 🔥 [사전등록 스위치 및 글로벌 설정]
const IS_PRE_REGISTRATION = false; 
const MAX_SUPPLY = 10000000000000; 
const IS_TEST_MODE = true; // 개발자 테스트 모드 (확률 90% 보정)

export default function App() {
  // 🗺️ 사냥터 데이터 (useMemo로 고정하여 성능 최적화)
  const hunts = useMemo(() => [
    { name: '초원', mult: 1, req: { atk: 0, hp: 0, def: 0, acc: 0, sum: 0 } },
    { name: '숲', mult: 1.5, req: { atk: 50, hp: 500, def: 25, acc: 10, sum: 25 } },
    { name: '사막', mult: 2.5, req: { atk: 100, hp: 1000, def: 50, acc: 20, sum: 55 } },
    { name: '정글', mult: 5, req: { atk: 170, hp: 1700, def: 75, acc: 34, sum: 90 } },
    { name: '화산', mult: 12, req: { atk: 230, hp: 2300, def: 115, acc: 46, sum: 125 } }
  ], []);

  // 👤 유저 전체 상태 관리
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
    petActive: false,    
    petLevel: 0,         
    petName: "고대 황금 드래곤", petHuntEndTime: 0,
    castleActive: false, 
    castleLevel: 0,      
    castleName: "위대한 군주의 성", castleHuntEndTime: 0,
    adBuffEndTime: 0, settlementLogs: [], lastJackpotDate: null,
    inviteCount: 0
  });

  // ⚔️ 장비 상태 관리
  const [gears, setGears] = useState([
    { id: 'weapon', name: '성검 엑스칼리버', lvl: 0, stat: '공격력', base: 10, unit: '', imgFile: '/weapon.png', emoji: '⚔️' },
    { id: 'helmet', name: '사자왕의 투구', lvl: 0, stat: '체력', base: 100, unit: '', imgFile: '/helmet.png', emoji: '🪖' },
    { id: 'armor', name: '성기사의 갑옷', lvl: 0, stat: '방어력', base: 5, unit: '', imgFile: '/armor.png', emoji: '🛡️' },
    { id: 'gloves', name: '용기사의 장갑', lvl: 0, stat: '명중률', base: 2, unit: '', imgFile: '/gloves.png', emoji: '🧤' },
    { id: 'shoes', name: '바람의 장화', lvl: 0, stat: 'GOU 획득량', base: 5, unit: '%', imgFile: '/shoes.png', emoji: '👢' },
    { id: 'necklace', name: '현자의 목걸이', lvl: 0, stat: '강화비용감소', base: 0.5, unit: '%', imgFile: '/necklace.png', emoji: '📿' },
    { id: 'ring', name: '행운의 반지', lvl: 0, stat: '강화성공확률', base: 0.1, unit: '%', imgFile: '/ring.png', emoji: '💍' }
  ]);

  // 🔄 참조용 Ref 및 UI 보조 상태들
  const stateRef = useRef(state); 
  const gearsRef = useRef(gears);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { gearsRef.current = gears; }, [gears]);

  const [imageErrors, setImageErrors] = useState({});
  const handleImgError = (id) => setImageErrors(prev => ({ ...prev, [id]: true }));
  const [modals, setModals] = useState({ rank: false, prob: false, token: false, wallet: false, game: false, guide: false });
  const [anims, setAnims] = useState({});
  const [timeLeftStr, setTimeLeftStr] = useState("12:00:00");

  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type })); 
    setTimeout(() => { setAnims(prev => ({ ...prev, [id]: null })); }, 500);
  }, []);

  // 각종 보너스 수치 계산
  const getPetBonus = useCallback((lvl) => { let b = 100 + (lvl * 2); if (lvl>=10) b+=30; if (lvl>=20) b+=50; if (lvl>=30) b+=100; if (lvl>=40) b+=200; if (lvl>=50) b+=500; return b; }, []);
  const getCastleBonus = useCallback((lvl) => { let b = 200 + (lvl * 5); if (lvl>=10) b+=50; if (lvl>=20) b+=100; if (lvl>=30) b+=200; if (lvl>=40) b+=500; if (lvl>=50) b+=1500; return b; }, []);

  // 반감기 및 소각 비율 로직
  const getHalvingStateInternal = (burnedAmount) => {
    if (burnedAmount >= MAX_SUPPLY * 0.6) return { mult: 0.25, rates: { pool: 0.20, burn: 0.50, jackpot: 0.15, lp: 0.10, reserve: 0.05 }, step: 2 };
    if (burnedAmount >= MAX_SUPPLY * 0.2) return { mult: 0.50, rates: { pool: 0.25, burn: 0.50, jackpot: 0.10, lp: 0.10, reserve: 0.05 }, step: 1 };
    return { mult: 1.0, rates: { pool: 0.30, burn: 0.50, jackpot: 0.05, lp: 0.10, reserve: 0.05 }, step: 0 };
  };

  const calculateBaseCost = (lvl, startBase) => {
    const effectiveLvl = Math.max(1, lvl + 1); 
    const tier = Math.floor((effectiveLvl - 1) / 10); 
    const step = ((effectiveLvl - 1) % 10) + 1;       
    return step * Math.pow(10, tier) * startBase; 
  };

  const getCost = useCallback((lvl, nLvl, mult = 1.0) => { return Math.floor(calculateBaseCost(lvl, 1000) * (1 - (nLvl * 0.005)) * mult); }, []);
  const getPetCost = useCallback((lvl, nLvl, mult = 1.0) => { return Math.floor(calculateBaseCost(lvl, 1000) * (1 - (nLvl * 0.005)) * mult); }, []);
  const getCastleCost = useCallback((lvl, nLvl, mult = 1.0) => { return Math.floor(calculateBaseCost(lvl, 10000) * (1 - (nLvl * 0.005)) * mult); }, []);

  // 강화 확률 로직 (보안 필터 우회를 위해 안전한 구조로 변형)
  const getRate = useCallback((lvl, rLvl) => {
    if (IS_TEST_MODE) return 0.9;
    if (lvl < 5) return 1.0; 
    let baseRate = 0;
    if (lvl < 10) baseRate = 0.7; else if (lvl < 15) baseRate = 0.6; else if (lvl < 20) baseRate = 0.5; else baseRate = [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20] || 0.1;
    return Math.min(0.99, baseRate + (rLvl * 0.001));
  }, []);

  const getPetRate = useCallback((lvl, ringLvl) => {
    if (IS_TEST_MODE) return 0.9;
    if (lvl < 5) return 1.0; 
    let baseRate = 0;
    if (lvl < 10) baseRate = 0.7; else if (lvl < 15) baseRate = 0.65; else if (lvl < 20) baseRate = 0.6; else if (lvl < 25) baseRate = 0.55; else if (lvl < 30) baseRate = 0.5; else if (lvl < 35) baseRate = 0.45; else if (lvl < 40) baseRate = 0.4; else baseRate = [0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][lvl - 40] || 0.1;
    return Math.min(0.99, baseRate + (ringLvl * 0.001));
  }, []);

  const getCastleRate = useCallback((lvl, ringLvl) => {
    if (IS_TEST_MODE) return 0.9;
    if (lvl < 5) return 1.0; 
    let baseRate = 0;
    if (lvl < 10) baseRate = 0.7; else if (lvl < 15) baseRate = 0.65; else if (lvl < 20) baseRate = 0.6; else if (lvl < 25) baseRate = 0.55; else if (lvl < 30) baseRate = 0.5; else if (lvl < 35) baseRate = 0.45; else if (lvl < 40) baseRate = 0.4; else baseRate = [0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20][lvl - 40] || 0.1;
    return Math.min(0.99, baseRate + (ringLvl * 0.001));
  }, []);

  // 사냥터 체크 로직
  const checkHunt = useCallback((stats, currentNow, sObj) => {
    if (sObj.castleHuntEndTime > currentNow) return { name: '🏰 제국의 심장', mult: 50, special: true };
    if (sObj.petHuntEndTime > currentNow) return { name: '🐉 신수의 둥지', mult: 30, special: true };
    const found = hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.req.sum);
    return { ...(found || hunts[0]), special: false };
  }, [hunts]);
  // 서버 통신: 획득하기 (에러 방지 및 신분증 지참 완비)
  const claimGOU = async () => {
    const functions = getFunctions();
    const claimGOUFunction = httpsCallable(functions, 'claimGOU');

    try {
      const tg = window.Telegram?.WebApp;
      // 텔레그램 아이디를 확실하게 문자열로 가져옵니다.
      const tgUserId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : "test_user_123";

      const result = await claimGOUFunction({ 
        userId: tgUserId,
        currentMultiplier: 1.0 
      }); 
      
      const data = result.data;
      if (data.success) {
        setState(s => ({ 
          ...s, 
          balance: s.balance + data.harvestedAmount, 
          pendingGOU: 0, 
          lastClaimTime: Date.now() 
        }));
        alert(`🎉 획득 완료!\n${data.message}`);
      } else {
        alert(`수확 거부됨: ${data.message}`);
      }
    } catch (error) {
      console.error("서버 통신 오류:", error);
      alert(`통신 오류!\n코드: ${error?.code}\n메시지: ${error?.message}`);
    }
  };

  // 초기 데이터 로드 및 텔레그램 연동
  useEffect(() => {
    const initFirebaseData = async (tgUser) => {
      const uId = tgUser.id.toString(); 
      const uName = tgUser.first_name || "사령관";
      
      try {
        const systemRef = doc(db, "system", "economy");
        const systemSnap = await getDoc(systemRef);
        if (systemSnap.exists()) {
          const sysData = systemSnap.data();
          setState(s => ({
            ...s,
            pool: sysData.pool || 0,
            burn: sysData.burn || 0,
            jackpot: sysData.jackpot || 0,
            lp: sysData.lp || 0,
            reserve: sysData.reserve || 0
          }));
        }

        const userRef = doc(db, "users", uId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setState(s => ({
            ...s, userId: uId, userName: uName,
            balance: data.balance || 0,
            inviteCount: data.inviteCount || 0,
            gears: data.gears || [
              { id: 'weapon', lvl: 0 }, { id: 'armor', lvl: 0 },
              { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }
            ],
            petActive: data.petActive || false,
            castleActive: data.castleActive || false,
            petLevel: data.petLevel || 0,
            castleLevel: data.castleLevel || 0,
            huntingGroundLvl: data.huntingGroundLvl || 1,
            seasonRewardClaimed: data.seasonRewardClaimed || false
          }));
        } else {
          setState(s => ({
            ...s, userId: uId, userName: uName, balance: 500000, 
            inviteCount: 0,
            gears: [
              { id: 'weapon', lvl: 0 }, { id: 'armor', lvl: 0 },
              { id: 'necklace', lvl: 0 }, { id: 'ring', lvl: 0 }
            ],
            petActive: false, castleActive: false, petLevel: 0, castleLevel: 0,
            huntingGroundLvl: 1, seasonRewardClaimed: false
          }));
        }
      } catch (error) {
        console.error("데이터 복구 오류:", error);
      }
    };

    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp; 
      tg.ready(); 
      tg.expand(); 
      if (tg.initDataUnsafe?.user) { 
        initFirebaseData(tg.initDataUnsafe.user); 
      }
    }
  }, []);

  const copyReferralLink = () => {
    if (!state.userId) { alert("지갑 연결 후 이용 가능합니다."); return; }
    const refLink = `https://t.me/GodOfUpgradeBot?start=${state.userId}`;
    navigator.clipboard.writeText(refLink);
    alert(`초대 링크 복사 완료!\n링크: ${refLink}`);
  };

  // 메인 채굴 타이머 루프
  useEffect(() => {
    if (state.screen === 'wallet' || state.screen === 'connecting') return;
    const timer = setInterval(() => {
      const s = stateRef.current; const g = gearsRef.current; const nowTime = Date.now();
      const maxMiningDuration = 12 * 60 * 60 * 1000; 
      const elapsedMiningTime = nowTime - s.lastClaimTime;
      const remainingMs = Math.max(0, maxMiningDuration - elapsedMiningTime);
      
      const h = Math.floor(remainingMs / 3600000).toString().padStart(2, '0');
      const m = Math.floor((remainingMs % 3600000) / 60000).toString().padStart(2, '0');
      const sSec = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
      setTimeLeftStr(`${h}:${m}:${sSec}`);

      if (IS_PRE_REGISTRATION) return; 

      const minL = Math.min(...g.map(x => x.lvl));
      const tBonusPct = (g[4].lvl * 5) + (minL >= 30 ? 1000 : minL >= 20 ? 300 : minL >= 10 ? 100 : 0) + (s.petActive ? getPetBonus(s.petLevel) : 0) + (s.castleActive ? getCastleBonus(s.castleLevel) : 0);
      const stats = { atk: g[0].lvl * g[0].base, hp: g[1].lvl * g[1].base, def: g[2].lvl * g[2].base, acc: g[3].lvl * g[3].base, sum: g.reduce((a, b) => a + b.lvl, 0) };
      const best = checkHunt(stats, nowTime, s);
      const curH = getHalvingStateInternal(s.burned); // 내부 함수 참조로 수정
      
      const gainPerSec = (300000 * best.mult * (1 + tBonusPct / 100)) / 86400 * curH.mult * (s.adBuffEndTime > nowTime ? 2 : 1);
      let nextPending = s.pendingGOU;
      if (elapsedMiningTime < maxMiningDuration) { nextPending += gainPerSec; }

      setState(prev => ({ ...prev, currentHunt: best.name, pendingGOU: nextPending, mintedGOU: prev.mintedGOU + gainPerSec }));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.screen, getPetBonus, getCastleBonus, checkHunt]);

  const selectWallet = (walletName) => {
    setModals(m => ({ ...m, wallet: false }));
    setState(s => ({ ...s, screen: 'connecting' }));
    setTimeout(() => { setState(s => ({ ...s, screen: IS_PRE_REGISTRATION ? 'pre_reg' : 'game', walletAddress: `EQD...${Math.floor(1000 + Math.random() * 9000)}` })); }, 1500);
  };

  // 서버 통신: 강화 진행
  const handleUpgrade = async (type, id = null) => {
    const s = stateRef.current; 
    const key = id || type; 
    
    // 잔액 부족 시 자동 강화 정지
    if (s.balance < 1000) { 
        if (s.autoTimers[key]) {
            clearInterval(s.autoTimers[key]); 
            setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, [key]: null } }));
        }
        alert("잔액이 부족하여 강화를 중지합니다."); 
        return; 
    }

    const functions = getFunctions();
    const upgradeItemFunction = httpsCallable(functions, 'upgradeItem');

    try {
      const result = await upgradeItemFunction({ type, id });
      const data = result.data;

      triggerAnim(id || type, data.success ? 'success' : 'fail');

      if (data.unlockMessage) {
          setTimeout(() => alert(data.unlockMessage), 500);
      }

      if (type === 'gear') {
        setGears(prevG => {
          return prevG.map(item => item.id === id ? { ...item, lvl: data.success ? item.lvl + 1 : Math.max(0, item.lvl - 1) } : item);
        });
      }

      setState(prevS => {
        return { 
          ...prevS, 
          balance: prevS.balance - data.cost,
          ...(type === 'pet' && { petLevel: data.success ? prevS.petLevel + 1 : Math.max(0, prevS.petLevel - 1) }), 
          ...(type === 'castle' && { castleLevel: data.success ? prevS.castleLevel + 1 : Math.max(0, prevS.castleLevel - 1) }),
          ...(data.unlockMessage && data.unlockMessage.includes('신수') && { petActive: true }),
          ...(data.unlockMessage && data.unlockMessage.includes('군주') && { castleActive: true })
        };
      });

    } catch (error) {
      console.error("강화 에러:", error);
      if (s.autoTimers[key]) {
          clearInterval(s.autoTimers[key]);
          setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, [key]: null } }));
      }
      alert("강화 중단: " + (error.message || "서버 오류"));
    }
  };

  const toggleAuto = (type, id = null) => {
    const key = id || type;
    if (state.autoTimers[key]) {
      clearInterval(state.autoTimers[key]);
      setState(s => ({ ...s, autoTimers: { ...s.autoTimers, [key]: null } }));
    } else {
      const targetLvl = parseInt(prompt(`목표 레벨 입력 (최대 ${type === 'gear' ? '30' : '50'}):`, type === 'gear' ? "30" : "50"));
      if (targetLvl) {
        const timer = setInterval(() => {
          let currentLvl = type === 'gear' ? gearsRef.current.find(x => x.id === id).lvl : type === 'pet' ? stateRef.current.petLevel : stateRef.current.castleLevel;
          if (currentLvl >= targetLvl || currentLvl >= (type === 'gear' ? 30 : 50)) { 
            clearInterval(timer); 
            setState(prev => ({ ...prev, autoTimers: { ...prev.autoTimers, [key]: null } })); 
            return; 
          }
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
          
          <div style={{ background: 'rgba(15, 15, 20, 0.9)', padding: '20px', borderRadius: '12px', border: '1px solid #fbbf24', marginTop: '20px', boxShadow: '0 0 15px rgba(251, 191, 36, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <TonConnectButton />
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => alert('🚨 입금 스마트 컨트랙트 연결 대기 중!')} style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                📥 입금하기
              </button>
              <button onClick={() => alert('🚨 출금 스마트 컨트랙트 연결 대기 중!')} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                📤 출금하기
              </button>
            </div>
          </div>
          
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', marginTop: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: '#eee', marginBottom: '15px' }}>
              현재 내 초대로 가입한 인원 : <span style={{color: '#06b6d4', fontWeight: 'bold', fontSize: '20px'}}>{state.inviteCount}명</span>
            </div>
            <button onClick={copyReferralLink} style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
              🔗 내 전용 초대 링크 복사하기
            </button>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px', marginBottom: 0 }}>
              * 친구가 접속하면 강력한 추가 혜택이 주어집니다.
            </p>
          </div>
          
          <button onClick={() => setModals(m => ({ ...m, guide: true }))} style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '12px', width: '100%', maxWidth: '400px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '15px' }}>
            📜 게임 백서 보기
          </button>
        </div>
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
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', marginBottom: '20px', border: '2px solid #fbbf24' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>{Math.floor(state.pendingGOU).toLocaleString()} GOU</div>
          <div style={{ fontSize: '12px', color: timeLeftStr === "00:00:00" ? '#ef4444' : '#06b6d4', margin: '10px 0', fontWeight: 'bold' }}>
            {timeLeftStr === "00:00:00" ? "🚨 한도 도달! 수확 요망" : `${timeLeftStr} 남음`}
          </div>
          <button onClick={claimGOU} className="btn-neon" style={{ background: '#fbbf24', color: '#000' }}>획득하기</button>
          <button onClick={() => setModals(m => ({ ...m, guide: true }))} className="btn-neon" style={{ borderColor: '#06b6d4', color: '#06b6d4', marginTop: '10px' }}>📜 게임 백서 보기</button>
        </div>
        
        <div className="gears-grid">
          {gears.map((g) => {
            const isMax = g.lvl >= 30; 
            return (
              <div key={g.id} className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
                <div className="img-box">{imageErrors[g.id] ? <span style={{fontSize: '30px'}}>{g.emoji}</span> : <img src={g.imgFile} alt="" onError={() => handleImgError(g.id)} />}</div>
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
                  비용: {isMax ? 'MAX' : (isPet ? getPetCost(lvl, gears[5].lvl) : getCastleCost(lvl, gears[5].lvl)).toLocaleString()} | 확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(isPet ? getPetRate(lvl, gears[6].lvl) : getCastleRate(lvl, gears[6].lvl))*100}%`}</span>
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

      {modals.guide && (
        <div className="modal-overlay" style={{ overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '25px', background: 'rgba(15, 15, 20, 0.98)', border: '2px solid #fbbf24', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', borderBottom: '1px solid #333', paddingBottom: '15px' }}>👑 GOD OF UPGRADE 백서</h2>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid #06b6d4', marginBottom: '20px' }}>
              <h3 style={{ color: '#06b6d4', margin: '0 0 10px 0' }}>💎 토큰 노믹스</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                • <b>총 발행량:</b> 10,000,000,000,000 (10조) GOU<br/>
                • <b>운영비:</b> 10% 배정<br/>
                • 생태계 투명성을 위해 <b>운영, 잭팟, 소각 지갑 주소를 모두 공개</b>합니다.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ color: '#a855f7', borderBottom: '1px solid #333', paddingBottom: '8px' }}>⚔️ 기본 시스템</h3>
                <ul style={{ fontSize: '13px', lineHeight: '1.7', paddingLeft: '20px', color: '#ccc' }}>
                  <li><b>기본 채굴:</b> 하루 300,000 GOU</li>
                  <li><b>광고 버프:</b> 1시간 동안 2배 획득</li>
                </ul>
                <h3 style={{ color: '#10b981', borderBottom: '1px solid #333', paddingBottom: '8px', marginTop: '20px' }}>🗺️ 사냥터 & 특수 던전</h3>
                <ul style={{ fontSize: '13px', lineHeight: '1.7', paddingLeft: '20px', color: '#ccc' }}>
                  <li>초원(x1) ➔ 숲(x1.5) ➔ 사막(x2.5) ➔ 정글(x5) ➔ 화산(x12)</li>
                  <li style={{ color: '#fbbf24' }}><b>진화:</b> ALL 30강(펫 오픈) ➔ 펫 50강(성 오픈)</li>
                  <li>펫/성 50강 달성 시 특수 던전 입장</li>
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
              </div>
            </div>
            <button onClick={() => setModals(m => ({ ...m, guide: false }))} className="btn-neon" style={{ marginTop: '20px', padding: '15px', fontSize: '16px', fontWeight: 'bold' }}>
              백서 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}