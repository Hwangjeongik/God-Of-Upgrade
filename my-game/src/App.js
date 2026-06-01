import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { app } from './firebase'; // 🚨 export 된 app을 완벽하게 가져옵니다.

export default function App() {
  // ==========================================
  // 1. 상태 관리 (불필요한 미니게임/국고 변수 제거, 서버 연동 최적화)
  // ==========================================
  const [state, setState] = useState({
    screen: 'wallet', // wallet, game
    walletAddress: '',
    balance: 100000,
    userName: "사령관", 
    userTitle: "초보자",
    isRankingOpen: false,
    showTitleInput: false,
    
    petActive: false, 
    petLevel: 0, 
    petName: "고대 황금 드래곤",
    
    castleActive: false, 
    castleLevel: 0, 
    castleName: "위대한 군주의 성",

    autoTimers: {} 
  });

  // 🚨 백엔드(Firebase)와 100% 일치하는 8부위 장비 세팅
  const [gears, setGears] = useState([
    { id: 'sword', name: '성검 엑스칼리버', emoji: '⚔️', lvl: 0, imgFile: 'weapon.png' },
    { id: 'shield', name: '수호자의 방패', emoji: '🛡️', lvl: 0, imgFile: 'shield.png' },
    { id: 'armor', name: '성기사의 갑옷', emoji: '👕', lvl: 0, imgFile: 'armor.png' },
    { id: 'helmet', name: '사자왕의 투구', emoji: '🪖', lvl: 0, imgFile: 'helmet.png' },
    { id: 'gloves', name: '용기사의 장갑', emoji: '🧤', lvl: 0, imgFile: 'gloves.png' },
    { id: 'boots', name: '바람의 장화', emoji: '👢', lvl: 0, imgFile: 'shoes.png' },
    { id: 'necklace', name: '현자의 목걸이', emoji: '📿', lvl: 0, imgFile: 'necklace.png' },
    { id: 'ring', name: '행운의 반지', emoji: '💍', lvl: 0, imgFile: 'ring.png' }
  ]);

  const [anims, setAnims] = useState({});
  const wallet = useTonWallet();

  // ==========================================
  // 2. 헬퍼 함수 및 UI 이펙트
  // ==========================================
  const triggerAnim = useCallback((id, type) => {
    setAnims(prev => ({ ...prev, [id]: type }));
    setTimeout(() => {
      setAnims(prev => ({ ...prev, [id]: null }));
    }, 500);
  }, []);

  const handleDEXClick = () => {
    alert("💱 GOU/TON DEX 스왑 거래소\n\n현재 영지 통신망 구축 및 준비 중입니다.");
  };

  // 화면 표기용 비용/확률 계산 로직 (서버 로직과 동일하게 유지)
  const getCost = useCallback((lvl, necklaceLvl) => {
    const effectiveLvl = Math.max(1, lvl + 1);
    const tier = Math.floor((effectiveLvl - 1) / 10);
    const step = ((effectiveLvl - 1) % 10) + 1;
    let rawCost = step * Math.pow(10, tier) * 1000;
    return Math.floor(rawCost * (1 - (necklaceLvl * 0.005)));
  }, []);

  const getRate = useCallback((lvl, ringLvl) => {
    let rate = 0;
    if (lvl < 5) rate = 1.0;
    else if (lvl < 10) rate = 0.7;
    else if (lvl < 15) rate = 0.6;
    else if (lvl < 20) rate = 0.5;
    else rate = [0.47, 0.44, 0.41, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.20][lvl - 20] || 0.1;
    return Math.min(0.99, rate + (ringLvl * 0.001));
  }, []);

  // ==========================================
  // 3. 지갑 연결 및 서버 연동(Firebase) 로직
  // ==========================================
  useEffect(() => {
    if (wallet) {
      const address = wallet.account.address;
      setState(s => ({
        ...s,
        walletAddress: address.substring(0, 6) + '...' + address.substring(address.length - 4),
        screen: 'game'
      }));
    } else {
      setState(s => ({ ...s, screen: 'wallet' }));
    }
  }, [wallet]);

  const getUserId = () => {
    const tg = window.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : "test_commander_123";
  };

  const claimGOU = async () => {
    const functions = getFunctions(app);
    const claimFunction = httpsCallable(functions, 'claimGOU');
    try {
      const result = await claimFunction({ userId: getUserId(), currentMultiplier: 1.0 });
      const data = result.data;
      if (data.success) {
        setState(s => ({ ...s, balance: s.balance + data.harvestedAmount }));
        triggerAnim('claim', 'success');
        alert(`🎉 ${data.message}`);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("수확 에러:", error);
      alert(`통신 오류: ${error.message}`);
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
        if (data.unlockMessage) alert(data.unlockMessage);
        
        setState(s => ({ ...s, balance: Math.max(0, s.balance - data.cost) }));
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: g.lvl + 1 } : g));
        else if (type === 'pet') setState(s => ({ ...s, petLevel: s.petLevel + 1 }));
        else if (type === 'castle') setState(s => ({ ...s, castleLevel: s.castleLevel + 1 }));
      } else {
        triggerAnim(id || type, 'fail');
        setState(s => ({ ...s, balance: Math.max(0, s.balance - data.cost) }));
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: Math.max(0, g.lvl - 1) } : g));
        else if (type === 'pet') setState(s => ({ ...s, petLevel: Math.max(0, s.petLevel - 1) }));
        else if (type === 'castle') setState(s => ({ ...s, castleLevel: Math.max(0, s.castleLevel - 1) }));
      }
    } catch (error) {
      console.error("강화 에러:", error);
      alert(`강화 실패: ${error.message}`);
    }
  };

  // 서버 과부하를 막기 위해 오토 속도를 350ms -> 2000ms(2초)로 조정
  const toggleAuto = (type, id = null) => {
    const timerKey = id || type;
    setState(s => {
      const newAuto = { ...s.autoTimers };
      if (newAuto[timerKey]) {
        clearInterval(newAuto[timerKey]);
        delete newAuto[timerKey];
      } else {
        newAuto[timerKey] = setInterval(() => handleUpgrade(type, id), 2000);
      }
      return { ...s, autoTimers: newAuto };
    });
  };

  // ==========================================
  // 4. UI 렌더링 파트 (사령관님의 어제 UI 100% 복원)
  // ==========================================
  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.7), rgba(26, 15, 20, 0.9)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <h1 style={{ color: '#fbbf24', fontSize: '32px', textShadow: '0 0 10px rgba(251,191,36,0.5)', fontFamily: "'Cinzel', serif" }}>GOD OF UPGRADE</h1>
        <p style={{ margin: '10px 0 30px 0', color: '#aaa', textAlign: 'center', fontSize: '13px', lineHeight: '1.6' }}>TON 지갑을 연결하여 영지를 활성화하십시오.</p>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px' }}><TonConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="main-wrap" style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.4), rgba(26, 15, 20, 0.5)), url("${process.env.PUBLIC_URL}/background.jpg")`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      color: '#e6d5b8', padding: '30px 20px', minHeight: '100vh', fontFamily: "'Cinzel', serif", display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes flashSuccess { 0% { background: rgba(251, 191, 36, 0.4); } 100% { background: rgba(20, 20, 25, 0.4); } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.4); } 100% { background: rgba(20, 20, 25, 0.4); } }
        @keyframes pulseLvl { 0% { color: #fbbf24; } 50% { color: #fff; text-shadow: 0 0 10px #fff; } 100% { color: #fbbf24; } }
        
        .animated-entry { animation: slideUp 0.6s ease-out forwards; }
        .anim-success { animation: flashSuccess 0.5s ease-out; }
        .anim-fail { animation: flashFail 0.4s ease-out; }
        .lvl-up { animation: pulseLvl 0.5s ease-out; display: inline-block; }
        
        .btn-neon { background: transparent; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.6); padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
        .btn-auto-on { background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid #06b6d4; }
        .glass-panel { background: rgba(20, 20, 25, 0.4); backdrop-filter: blur(15px); border: 1px solid rgba(197, 160, 89, 0.3); border-radius: 12px; }

        .dash-panel { padding: 30px; margin-bottom: 25px; }
        .treasury-title { font-size: 28px; margin: 20px 0 25px 0; }
        .balance-text { font-size: 52px; margin-bottom: 30px; }

        .gears-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; max-width: 850px; }
        .gear-card { padding: 15px; border-top: 4px solid #555; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .img-box-gear { width: 65px; height: 65px; background: rgba(0,0,0,0.3); border: 1px solid rgba(197,160,89,0.3); border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 30px; }
        
        .pet-card-inner { display: flex; align-items: center; gap: 30px; padding: 35px; }
        .img-box-special { width: 120px; height: 120px; font-size: 60px; }

        @media (max-width: 768px) {
          .main-wrap { padding: 10px 5px !important; }
          .dash-panel { padding: 15px 10px !important; margin-bottom: 15px !important; }
          .balance-text { font-size: 36px !important; margin-bottom: 20px !important; }
          .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .pet-card-inner { flex-direction: row !important; gap: 15px !important; padding: 15px !important; flex-wrap: wrap; }
          .img-box-special { width: 65px !important; height: 65px !important; font-size: 30px !important; }
        }
      `}</style>

      <button onClick={() => setState(s => ({...s, isRankingOpen: true}))} style={{ position: 'fixed', top: '15px', right: '15px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.5)', padding: '8px 16px', borderRadius: '8px', zIndex: 100, fontWeight: 'bold' }}>
        🏆 RANK
      </button>

      {/* 📊 메인 국고 대시보드 */}
      <div className={`animated-entry glass-panel dash-panel ${anims['claim'] ? 'anim-success' : ''}`} style={{ width: '100%', maxWidth: '850px', position: 'relative' }}>
        <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' }}>[{state.userTitle}] {state.userName}</div>
        <h2 className="treasury-title" style={{ color: '#e6d5b8', textAlign: 'center', letterSpacing: '2px' }}>TREASURY</h2>
        <div className="balance-text" style={{ textAlign: 'center', fontWeight: 'bold', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
          {Math.floor(state.balance).toLocaleString()} <span style={{color: '#c5a059', fontWeight: 'normal'}}>GOU</span>
        </div>
        
        {/* 미니게임(자동 획득)이 삭제되었으므로 수동 획득 거대 버튼 장착 */}
        <button onClick={claimGOU} style={{ width: '100%', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '8px', padding: '16px 0', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 15px rgba(251,191,36,0.4)', marginBottom: '15px' }}>
          🚀 영지 수확 (GOU 획득)
        </button>

        <div onClick={handleDEXClick} style={{ background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.5)', padding: '12px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ color: '#a855f7', fontWeight: 'bold' }}>💱 DEX 거래소 바로가기 ➡️</div>
        </div>
      </div>

      {/* ⚔️ 장비 무기고 */}
      <div className="gears-grid">
        {gears.map((g, index) => {
          const isMax = g.lvl >= 30;
          return (
            <div key={g.id} className={`animated-entry glass-panel gear-card ${anims[g.id] ? `anim-${anims[g.id]}` : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="img-box-gear">
                <img src={`${process.env.PUBLIC_URL}/${g.imgFile}`} alt={g.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = g.emoji; }}/>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', margin: '8px 0', color: '#e6d5b8' }}>
                {g.name} <span className={anims[g.id] === 'success' ? 'lvl-up' : ''} style={{ color: '#fbbf24' }}>+{g.lvl}</span>
              </div>
              <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '10px' }}>
                확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(getRate(g.lvl, gears[7].lvl)*100).toFixed(1)}%`}</span><br/>
                비용: {isMax ? 'MAX' : getCost(g.lvl, gears[6].lvl).toLocaleString()}
              </div>
              <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                <button onClick={() => handleUpgrade('gear', g.id)} disabled={isMax} className="btn-neon" style={{ flex: 1, padding: '8px 0' }}>강화</button>
                <button onClick={() => toggleAuto('gear', g.id)} disabled={isMax} className={`btn-neon ${state.autoTimers[g.id] ? 'btn-auto-on' : ''}`} style={{ flex: 1, padding: '8px 0' }}>
                  {state.autoTimers[g.id] ? 'STOP' : 'AUTO'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🐉 펫 & 성 렌더링 파트 */}
      {['pet', 'castle'].map(type => {
        const isPet = type === 'pet';
        const isActive = isPet ? state.petActive : state.castleActive;
        // 테스트 시 활성화 조건을 보고 싶다면 아래 코드를 지우지 마십시오.
        // if (!isActive) return null; 

        const lvl = isPet ? state.petLevel : state.castleLevel;
        const name = isPet ? state.petName : state.castleName;
        const isMax = lvl >= 50;

        return (
          <div key={type} className={`animated-entry glass-panel ${anims[type] ? `anim-${anims[type]}` : ''}`} style={{ position: 'relative', width: '100%', maxWidth: '850px', margin: '15px 0', borderRadius: '15px', overflow: 'hidden' }}>
            {!isActive && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(10px)', background: 'rgba(11, 15, 25, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <div style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 'bold', padding: '15px', border: '1px solid #fbbf24', borderRadius: '8px', background: 'rgba(0,0,0,0.6)' }}>
                  🔒 {isPet ? '장비 ALL 30강 달성 시 개방' : '펫 50강 달성 시 개방'}
                </div>
              </div>
            )}
            <div className="pet-card-inner" style={{ opacity: isActive ? 1 : 0.4 }}>
              <div className="img-box-special" style={{ background: isPet ? 'linear-gradient(135deg, rgba(26,11,46,0.5) 0%, rgba(59,7,100,0.5) 100%)' : 'linear-gradient(135deg, rgba(46,26,11,0.5) 0%, rgba(100,20,7,0.5) 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(251,191,36,0.5)' }}>
                {isPet ? '🐉' : '🏰'}
              </div>
              <div style={{ flex: 1, width: '100%' }}>
                <h3 style={{ color: '#fbbf24', fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '24px' }}>
                  {name} <span className={anims[type] === 'success' ? 'lvl-up' : ''} style={{ color: '#e6d5b8', fontSize: '70%', fontWeight: 'normal' }}>Lv.{lvl}</span>
                </h3>
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                  <button onClick={() => handleUpgrade(type)} disabled={!isActive || isMax} className="btn-neon" style={{ background: 'rgba(123, 24, 24, 0.5)', color: '#fff', flex: 1 }}>{isMax ? 'MAX' : '강화'}</button>
                  <button onClick={() => toggleAuto(type)} disabled={!isActive || isMax} className={`btn-neon ${state.autoTimers[type] ? 'btn-auto-on' : ''}`} style={{ flex: 1 }}>{state.autoTimers[type] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 🏆 랭킹 모달 */}
      {state.isRankingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animated-entry" style={{ background: 'rgba(20,20,25,0.9)', border: '1px solid #fbbf24', padding: '30px 20px', borderRadius: '15px', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', marginBottom: '20px' }}>RANKING</h2>
            <div style={{ color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>시즌 종료 후 업데이트 됩니다.</div>
            <button onClick={() => setState(s => ({...s, isRankingOpen: false}))} className="btn-neon" style={{ width: '100%', color: '#888', borderColor: '#555' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}