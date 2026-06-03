import React, { useState, useEffect } from 'react';

export default function PreRegister() {
  // 🚨 텔레그램 봇 유저네임을 사령관님 봇 이름으로 변경하세요 (예: god_of_upgrade_bot)
  const BOT_USERNAME = "god_of_upgrade_bot"; 
  
  // 6월 20일 오전 11시(KST) 세팅
  const targetDate = new Date('2026-06-20T11:00:00+09:00').getTime();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  // 초대 코드 및 링크 생성
  const [inviteCode] = useState("GOU-" + Math.floor(Math.random() * 90000 + 10000));
  const inviteLink = `https://t.me/${BOT_USERNAME}?start=${inviteCode}`;
  const [invitedCount] = useState(0);

  // 가이드 탭 상태
  const [activeGuideTab, setActiveGuideTab] = useState(1);

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

  // 초대 링크 복사 로직
  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert(`초대 링크가 복사되었습니다!\n\n[내 초대 링크]\n${inviteLink}\n\n이 링크로 친구가 봇에 접속하면 자동으로 50만 GOU가 지급됩니다!`);
  };

  // 텔레그램 봇 강제 이동 로직 (인앱 브라우저 먹통 방지)
  const handleBotRedirect = () => {
    const botUrl = `https://t.me/${BOT_USERNAME}?start=pre_register`;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
      // 텔레그램 미니앱 내부일 경우 강제 봇 채팅창 호출
      window.Telegram.WebApp.openTelegramLink(botUrl);
    } else {
      // 일반 브라우저일 경우 링크 이동
      window.location.href = botUrl;
    }
  };

  return (
    <div style={{ 
      backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.85), rgba(26, 15, 20, 0.95)), url("${process.env.PUBLIC_URL}/background.jpg")`, 
      backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      padding: '40px 20px', color: '#e6d5b8', fontFamily: 'Pretendard, sans-serif', overflowY: 'auto' 
    }}>
      
      {/* 슬로건 및 타이틀 */}
      <div style={{ textAlign: 'center', marginBottom: '30px', animation: 'fadeInDown 1s ease-out' }}>
        <h3 style={{ color: '#06b6d4', letterSpacing: '2px', margin: '0 0 10px 0', fontWeight: 'bold' }}>TELEGRAM WEB3 GAMING</h3>
        <h1 style={{ color: '#fbbf24', fontSize: '38px', margin: '0', textShadow: '0 0 20px rgba(251,191,36,0.8)', lineHeight: '1.2' }}>
          P2E의 신<br/>강화의 신이 되십시오
        </h1>
        <p style={{ color: '#ccc', fontSize: '15px', marginTop: '15px' }}>압도적인 스펙으로 제국을 점령하십시오.</p>
      </div>

      {/* 카운트다운 타이머 */}
      <div style={{ 
        background: 'rgba(0,0,0,0.6)', border: '2px solid #fbbf24', borderRadius: '15px', 
        padding: '20px', width: '100%', maxWidth: '500px', textAlign: 'center', 
        marginBottom: '30px', boxShadow: '0 0 30px rgba(251,191,36,0.2)' 
      }}>
        <h3 style={{ color: '#fbbf24', margin: '0 0 15px 0' }}>⏳ GRAND OPEN : 6월 20일 11:00</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          {[ 
            { label: 'DAYS', val: timeLeft.d }, { label: 'HOURS', val: timeLeft.h }, 
            { label: 'MINS', val: timeLeft.m }, { label: 'SECS', val: timeLeft.s } 
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                background: '#222', border: '1px solid #555', borderRadius: '10px', width: '60px', height: '60px', 
                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', 
                fontWeight: '900', color: '#fff', textShadow: '0 0 10px #fff' 
              }}>
                {t.val.toString().padStart(2, '0')}
              </div>
              <span style={{ fontSize: '11px', color: '#aaa', marginTop: '8px', fontWeight: 'bold' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 사전예약 혜택 안내 */}
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(0,0,0,0.8))', border: '1px solid #06b6d4', padding: '20px 15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>🎁</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>사전예약 접속 시</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#06b6d4', marginTop: '5px' }}>500,000 GOU</div>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(0,0,0,0.8))', border: '1px solid #a855f7', padding: '20px 15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>🤝</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>링크로 친구 초대 시</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#a855f7', marginTop: '5px' }}>+ 500,000 GOU</div>
        </div>
      </div>

      {/* 내 초대 링크 및 현황 */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '500px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '16px', textAlign: 'center' }}>🔥 나의 초대 퀘스트 현황</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #333' }}>
          <div style={{ overflow: 'hidden', marginRight: '10px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>내 전용 초대 링크 (공유용)</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {inviteLink}
            </div>
          </div>
          <button onClick={copyInviteLink} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}>복사</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>내 링크로 가입한 인원:</span>
          <span style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>{invitedCount} 명</span>
        </div>
      </div>

      {/* 게임 가이드 (안전 필터 통과형 탭 UI) */}
      <div style={{ width: '100%', maxWidth: '500px', background: 'rgba(20, 24, 34, 0.9)', border: '1px solid #555', borderRadius: '12px', overflow: 'hidden', marginBottom: '40px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #555' }}>
          {[1, 2, 3].map(tab => (
            <button key={tab} onClick={() => setActiveGuideTab(tab)} style={{
              flex: 1, padding: '12px 0', background: activeGuideTab === tab ? '#333' : 'transparent',
              color: activeGuideTab === tab ? '#fbbf24' : '#aaa', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'
            }}>
              가이드 {tab}장
            </button>
          ))}
        </div>
        <div style={{ padding: '20px', fontSize: '14px', lineHeight: '1.6', color: '#e6d5b8', minHeight: '150px' }}>
          {activeGuideTab === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#06b6d4', margin: '0 0 10px 0' }}>⚔️ 1장: 파괴와 창조의 강화</h4>
              <p>GOU 생태계의 핵심은 <b>'장비 강화'</b>입니다. 유저들은 모은 재화를 통해 무기와 영지를 업그레이드합니다. 140강을 달성한 자만이 진정한 사령관으로 인정받아 <b>DEX 스왑 및 국고 이동 권한</b>을 얻게 됩니다.</p>
            </div>
          )}
          {activeGuideTab === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 10px 0' }}>🔄 2장: 10조 폐쇄형 경제</h4>
              <p>본 서버의 토큰은 무한 발행되지 않습니다. 유저가 강화 실패 시 지불한 비용은 서버 소각, 유동성(LP) 공급, 그리고 매주 월요일 상위 랭커들에게 지급되는 <b>주간 시즌 보상(Season Reward)</b>으로 완벽하게 분배되어 생태계를 유지합니다.</p>
            </div>
          )}
          {activeGuideTab === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#a855f7', margin: '0 0 10px 0' }}>🎲 3장: 도파민 아케이드</h4>
              <p>매일 지급되는 티켓과 광고 시청을 통해 랜덤 아케이드 미니게임에 입장하십시오. 망치질, 블록 쌓기 등에서 <b>PERFECT</b>를 달성하면 채굴 외에도 막대한 양의 추가 GOU 보급품을 획득할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 사전예약 텔레그램 봇 연결 버튼 (API 강제 호출 적용) */}
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <button onClick={handleBotRedirect} style={{ 
          width: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', color: '#fff', 
          padding: '20px', borderRadius: '15px', fontSize: '20px', fontWeight: '900', border: 'none', 
          cursor: 'pointer', boxShadow: '0 10px 30px rgba(6,182,212,0.5)', animation: 'pulse 2s infinite' 
        }}>
          🚀 텔레그램 봇(전초기지) 입장하기
        </button>
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
          버튼 클릭 시 텔레그램 GOU 봇 채팅방으로 자동 이동 및 사전예약이 완료됩니다.
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); boxShadow: 0 0 0 0 rgba(6,182,212,0.7); }
          70% { transform: scale(1.03); boxShadow: 0 0 0 15px rgba(6,182,212,0); }
          100% { transform: scale(1); boxShadow: 0 0 0 0 rgba(6,182,212,0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}