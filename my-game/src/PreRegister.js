import React, { useState, useEffect } from 'react';

export default function PreRegister() {
  // 🚨 사령관님의 텔레그램 봇 주소를 여기에 입력하세요!
  const TELEGRAM_BOT_URL = "https://t.me/god_of_upgrade_bot?start=pre_register"; 
  
  // 6월 20일 자정(KST) 카운트다운 세팅
  const targetDate = new Date('2026-06-20T00:00:00+09:00').getTime();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  // 유저 초대 데이터 (실제 연동 전 UI 시뮬레이션용)
  const [inviteCode] = useState("GOU-GOD-" + Math.floor(Math.random() * 9000 + 1000));
  const [invitedCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    alert(`초대 코드 [${inviteCode}] 복사 완료!\n친구에게 공유하여 50만 GOU를 추가 획득하세요!`);
  };

  return (
    <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.85), rgba(26, 15, 20, 0.95)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: '#e6d5b8', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 타이틀 영역 */}
      <div style={{ textAlign: 'center', marginBottom: '30px', animation: 'fadeInDown 1s ease-out' }}>
        <h3 style={{ color: '#06b6d4', letterSpacing: '3px', margin: '0 0 10px 0', fontWeight: 'bold' }}>TELEGRAM WEB3 GAMING</h3>
        <h1 style={{ color: '#fbbf24', fontSize: '42px', margin: '0', textShadow: '0 0 20px rgba(251,191,36,0.8)' }}>GOD OF UPGRADE</h1>
        <p style={{ color: '#ccc', fontSize: '16px', marginTop: '10px' }}>10조 GOU 폐쇄형 생태계의 주인이 되십시오.</p>
      </div>

      {/* 카운트다운 타이머 */}
      <div style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #fbbf24', borderRadius: '15px', padding: '20px', width: '100%', maxWidth: '500px', textAlign: 'center', marginBottom: '30px', boxShadow: '0 0 30px rgba(251,191,36,0.2)' }}>
        <h3 style={{ color: '#fbbf24', margin: '0 0 15px 0' }}>⏳ GRAND OPEN : 6월 20일</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          {[ { label: 'DAYS', val: timeLeft.d }, { label: 'HOURS', val: timeLeft.h }, { label: 'MINS', val: timeLeft.m }, { label: 'SECS', val: timeLeft.s } ].map((t, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: '#222', border: '1px solid #555', borderRadius: '10px', width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: '900', color: '#fff', textShadow: '0 0 10px #fff' }}>
                {t.val.toString().padStart(2, '0')}
              </div>
              <span style={{ fontSize: '11px', color: '#aaa', marginTop: '8px', fontWeight: 'bold' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 혜택 안내 */}
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(0,0,0,0.8))', border: '1px solid #06b6d4', padding: '20px 15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>🎁</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>사전예약 접속 시</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#06b6d4', marginTop: '5px' }}>500,000 GOU</div>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(0,0,0,0.8))', border: '1px solid #a855f7', padding: '20px 15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>🤝</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>친구 초대 1명당</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#a855f7', marginTop: '5px' }}>+ 500,000 GOU</div>
        </div>
      </div>

      {/* 내 초대 현황 대시보드 */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '500px', marginBottom: '40px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '16px', textAlign: 'center' }}>🔥 나의 사전예약 초대 현황</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>내 초대 코드</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fbbf24', letterSpacing: '1px' }}>{inviteCode}</div>
          </div>
          <button onClick={copyInviteCode} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>복사</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>내가 초대한 인원 수:</span>
          <span style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>{invitedCount} 명</span>
        </div>
      </div>

      {/* 사전예약 텔레그램 봇 연결 버튼 */}
      <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', width: '100%', maxWidth: '500px' }}>
        <button style={{ width: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', color: '#fff', padding: '20px', borderRadius: '15px', fontSize: '22px', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(6,182,212,0.5)', animation: 'pulse 2s infinite' }}>
          🚀 텔레그램 사전예약 완료하기
        </button>
      </a>
      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666', textAlign: 'center' }}>버튼을 누르면 텔레그램 GOU 봇으로 자동 이동됩니다.</div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); boxShadow: 0 0 0 0 rgba(6,182,212,0.7); }
          70% { transform: scale(1.05); boxShadow: 0 0 0 15px rgba(6,182,212,0); }
          100% { transform: scale(1); boxShadow: 0 0 0 0 rgba(6,182,212,0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}