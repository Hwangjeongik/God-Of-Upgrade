import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
// 🚨 본인의 firebase.js 경로에 맞게 임포트 (수정하지 마십시오)
import { app } from './firebase'; 

const IS_PRE_REGISTRATION = true; // 정식 오픈 시 false로 변경

function App() {
  // ==========================================
  // 1. 풀옵션 상태 관리 (State)
  // ==========================================
  const [state, setState] = useState({
    screen: 'connecting', // connecting, wallet, pre_reg, game
    walletAddress: '',
    balance: 100000,
    pendingGOU: 0,
    userTitle: '초보자',
    userName: 'GUEST',
    inviteCount: 0,
    petActive: false,
    castleActive: false,
    petLevel: 0,
    castleLevel: 0,
    petName: '신수',
    castleName: '군주의 성',
    autoTimers: {} // 오토 모드 상태 저장
  });

  const [gears, setGears] = useState([
    { id: 'sword', name: '무기', emoji: '⚔️', lvl: 0, imgFile: '/sword.png' },
    { id: 'shield', name: '방패', emoji: '🛡️', lvl: 0, imgFile: '/shield.png' },
    { id: 'armor', name: '갑옷', emoji: '👕', lvl: 0, imgFile: '/armor.png' },
    { id: 'helmet', name: '투구', emoji: '🪖', lvl: 0, imgFile: '/helmet.png' },
    { id: 'gloves', name: '장갑', emoji: '🧤', lvl: 0, imgFile: '/gloves.png' },
    { id: 'boots', name: '신발', emoji: '👢', lvl: 0, imgFile: '/boots.png' },
    { id: 'necklace', name: '목걸이', emoji: '📿', lvl: 0, imgFile: '/necklace.png' },
    { id: 'ring', name: '반지', emoji: '💍', lvl: 0, imgFile: '/ring.png' }
  ]);

  const [modals, setModals] = useState({ guide: false });
  const [imageErrors, setImageErrors] = useState({});
  const [timeLeftStr, setTimeLeftStr] = useState("12:00:00");

  const wallet = useTonWallet();

  // ==========================================
  // 2. 헬퍼 함수 (비용/확률 계산 및 에러 처리)
  // ==========================================
  const handleImgError = (id) => setImageErrors(prev => ({ ...prev, [id]: true }));
  
  const getCost = (lvl, discountLvl = 0) => Math.floor(((lvl % 10) + 1) * Math.pow(10, Math.floor(lvl / 10)) * 1000 * (1 - discountLvl * 0.005));
  const getPetCost = (lvl, discountLvl = 0) => getCost(lvl, discountLvl);
  const getCastleCost = (lvl, discountLvl = 0) => getCost(lvl, discountLvl) * 10;
  
  const getRate = (lvl, buffLvl = 0) => Math.min(0.99, (lvl < 5 ? 1.0 : lvl < 20 ? 0.8 - (lvl*0.01) : 0.5) + (buffLvl * 0.001));
  const getPetRate = (lvl, buffLvl = 0) => getRate(lvl, buffLvl);
  const getCastleRate = (lvl, buffLvl = 0) => getRate(lvl, buffLvl);

  // ==========================================
  // 3. 지갑 연결 및 초기 세팅
  // ==========================================
  useEffect(() => {
    setTimeout(() => {
      if (wallet) {
        const address = wallet.account.address;
        setState(s => ({
          ...s,
          walletAddress: address.substring(0, 6) + '...' + address.substring(address.length - 4),
          screen: IS_PRE_REGISTRATION ? 'pre_reg' : 'game'
        }));
      } else {
        setState(s => ({ ...s, screen: 'wallet' }));
      }
    }, 500);
  }, [wallet]);

  // ==========================================
  // 4. 완벽 방어 서버 통신 로직
  // ==========================================
  const getUserId = () => {
    const tg = window.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : "test_user_123";
  };

  const claimGOU = async () => {
    const functions = getFunctions(app);
    const claimGOUFunction = httpsCallable(functions, 'claimGOU');

    try {
      const result = await claimGOUFunction({ userId: getUserId(), currentMultiplier: 1.0 });
      const data = result.data;
      
      if (data.success) {
        setState(s => ({ ...s, balance: s.balance + data.harvestedAmount, pendingGOU: 0 }));
        alert(`🎉 획득 완료!\n${data.message}`);
      } else {
        alert(`수확 거부됨: ${data.message}`);
      }
    } catch (error) {
      console.error("수확 오류:", error);
      alert(`통신 오류!\n코드: ${error?.code}\n메시지: ${error?.message}`);
    }
  };

  const handleUpgrade = async (type, id = null) => {
    const functions = getFunctions(app);
    const upgradeItem = httpsCallable(functions, 'upgradeItem');

    try {
      const result = await upgradeItem({ userId: getUserId(), type, id });
      const data = result.data;

      if (data.success) {
        if (data.unlockMessage) alert(data.unlockMessage);
        
        setState(s => ({ ...s, balance: Math.max(0, s.balance - data.cost) }));
        if (type === 'gear') {
          setGears(prev => prev.map(g => g.id === id ? { ...g, lvl: g.lvl + 1 } : g));
        } else if (type === 'pet') {
          setState(s => ({ ...s, petLevel: s.petLevel + 1 }));
        } else if (type === 'castle') {
          setState(s => ({ ...s, castleLevel: s.castleLevel + 1 }));
        }
      } else {
        setState(s => ({ ...s, balance: Math.max(0, s.balance - data.cost) }));
        if (type === 'gear') {
          setGears(prev => prev.map(g => g.id === id ? { ...g, lvl: Math.max(0, g.lvl - 1) } : g));
        } else if (type === 'pet') {
          setState(s => ({ ...s, petLevel: Math.max(0, s.petLevel - 1) }));
        } else if (type === 'castle') {
          setState(s => ({ ...s, castleLevel: Math.max(0, s.castleLevel - 1) }));
        }
      }
    } catch (error) {
      console.error("강화 오류:", error);
      alert(`강화 실패: ${error?.message}`);
    }
  };

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

  const copyReferralLink = () => {
    const link = `https://t.me/GodOfUpgradeBot?start=${getUserId()}`;
    navigator.clipboard.writeText(link);
    alert("초대 링크가 복사되었습니다!");
  };

  // ==========================================
  // 5. 풀옵션 UI 렌더링 파트
  // ==========================================
  if (state.screen === 'connecting') {
    return (<div style={{ background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><div style={{ fontSize: '50px', marginBottom: '20px' }}>🔗</div><h2>서버 연결 중...</h2></div>);
  }

  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.7), rgba(26, 15, 20, 0.9)), url("/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <h1 style={{ color: '#fbbf24', fontSize: '32px', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>GOD OF UPGRADE</h1>
        <p style={{ margin: '10px 0 30px 0', color: '#aaa', textAlign: 'center', fontSize: '13px', padding: '0 20px', lineHeight: '1.6' }}>
          {IS_PRE_REGISTRATION ? "현재 사전예약 기간입니다.\n지갑을 연결하고 초기 자본을 확보하세요." : "시즌제 토큰 마이닝 생태계에 오신 것을 환영합니다.\nTON 지갑을 연결하여 영지를 활성화하십시오."}
        </p>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px' }}>
          <TonConnectButton />
        </div>
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
          
          <div style={{ background: 'rgba(15, 15, 20, 0.9)', padding: '20px', borderRadius: '12px', border: '1px solid #fbbf24', marginTop: '20px', boxShadow: '0 0 15px rgba(251, 191, 36, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <TonConnectButton />
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => alert('🚨 입금 스마트 컨트랙트 연결 대기 중!')} style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📥 입금하기</button>
              <button onClick={() => alert('🚨 출금 스마트 컨트랙트 연결 대기 중!')} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📤 출금하기</button>
            </div>
          </div>
          
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', marginTop: '20px' }}>
            <div style={{ fontSize: '15px', color: '#eee', marginBottom: '15px' }}>현재 내 초대로 가입한 인원 : <span style={{color: '#06b6d4', fontWeight: 'bold'}}>{state.inviteCount}명</span></div>
            <button onClick={copyReferralLink} style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>🔗 내 전용 초대 링크 복사하기</button>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button onClick={() => setModals(m => ({ ...m, guide: true }))} style={{ flex: 1, background: 'rgba(251, 191, 36, 0.1)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📜 백서 보기</button>
            <button onClick={() => setState(s => ({ ...s, screen: 'game' }))} style={{ flex: 1, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid #fff', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🕹️ 게임 입장 (테스트)</button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 본 게임 화면 (Game Screen)
  // ==========================================
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
            {timeLeftStr === "00:00:00" ? "🚨 한도 도달! 수확 요망" : `다음 수확까지 대기 중`}
          </div>
          <button onClick={claimGOU} className="btn-neon" style={{ background: '#fbbf24', color: '#000', fontSize: '16px', fontWeight: 'bold' }}>🚀 획득하기 (최신)</button>
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
                  <button onClick={() => toggleAuto('gear', g.id)} disabled={isMax} className="btn-neon" style={{fontSize: '11px', padding: '6px', background: state.autoTimers[g.id] ? 'rgba(251,191,36,0.2)' : 'transparent'}}>{state.autoTimers[g.id] ? 'STOP' : 'AUTO'}</button>
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
            
            // 펫/성 개방 안되었으면 렌더링 안함
            // if (!isActive) return null; // 테스트를 위해 주석 처리하거나 살려둘 수 있습니다. (원래 로직 유지)
            
            return (
              <div key={type} className="glass-panel" style={{ padding: '15px', textAlign: 'center', marginBottom: '15px', display: isActive ? 'block' : 'none' }}>
                <h3 style={{ color: '#fbbf24', margin: '0 0 10px 0' }}>{name} Lv.{lvl}</h3>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>
                  비용: {isMax ? 'MAX' : (isPet ? getPetCost(lvl, gears[5].lvl) : getCastleCost(lvl, gears[5].lvl)).toLocaleString()} | 확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4'}}>{isMax ? 'MAX' : `${(isPet ? getPetRate(lvl, gears[6].lvl) : getCastleRate(lvl, gears[6].lvl))*100}%`}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleUpgrade(type)} disabled={isMax} className="btn-neon" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}>{isPet ? '펫' : '성'} 강화</button>
                  <button onClick={() => toggleAuto(type)} disabled={isMax} className="btn-neon" style={{ flex: 1, background: state.autoTimers[type] ? 'rgba(251,191,36,0.2)' : 'transparent' }}>{state.autoTimers[type] ? 'STOP' : 'AUTO'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modals.guide && (
        <div className="modal-overlay" style={{ overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '25px', background: 'rgba(15, 15, 20, 0.98)', border: '2px solid #fbbf24', margin: 'auto' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', borderBottom: '1px solid #333', paddingBottom: '15px' }}>👑 GOD OF UPGRADE 백서</h2>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid #06b6d4', marginBottom: '20px' }}>
              <h3 style={{ color: '#06b6d4', margin: '0 0 10px 0' }}>💎 토큰 노믹스</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                • <b>총 발행량:</b> 10,000,000,000,000 (10조) GOU<br/>
                • 실패 시 코인은 <b>잭팟(상금), 유동성, 소각</b>으로 자동 분배됩니다.
              </p>
            </div>
            <button onClick={() => setModals(m => ({ ...m, guide: false }))} className="btn-neon" style={{ marginTop: '20px', padding: '15px', fontSize: '16px', fontWeight: 'bold' }}>백서 닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;