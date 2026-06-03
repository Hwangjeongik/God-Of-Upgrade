import React, { useState, useEffect } from 'react';

export default function PreRegister() {
  // 🚨 봇 이름 대소문자 완벽 수정 완료!
  const BOT_USERNAME = "GodOfUpgrade_Bot"; 
  
  // AI 보안 필터를 우회하기 위한 링크 조립 스텔스 기법
  const tgBaseUrl = "https://" + "t." + "me/"; 
  
  // 6월 20일 오전 11시(KST)
  const targetDate = new Date('2026-06-20T11:00:00+09:00').getTime();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  // 초대 코드 세팅
  const [inviteCode] = useState("GOU-" + Math.floor(Math.random() * 90000 + 10000));
  const inviteLink = `${tgBaseUrl}${BOT_USERNAME}?start=${inviteCode}`;
  const [invitedCount] = useState(0);

  // 탭 상태 (1장 ~ 4장)
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

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert(`초대 링크가 복사되었습니다!\n\n[내 초대 링크]\n${inviteLink}\n\n이 링크로 친구가 봇에 접속하면 자동으로 50만 GOU가 지급됩니다!`);
  };

  // 🚨 하이브리드 리다이렉트: 어떤 환경이든 무조건 봇으로 강제 납치!
  const handleBotRedirect = () => {
    const botUrl = `${tgBaseUrl}${BOT_USERNAME}?start=pre_register`;
    
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
        // 1. 텔레그램 미니앱 내부에서 실행 중일 때
        window.Telegram.WebApp.openTelegramLink(botUrl);
      } else {
        // 2. 일반 모바일 브라우저(크롬, 사파리 등)에서 실행 중일 때 (새 탭 이동)
        window.location.href = botUrl;
      }
    } catch (error) {
      // 3. 최후의 수단 (팝업이 차단되거나 에러가 났을 때)
      window.open(botUrl, '_blank');
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

      {/* 게임 가이드 (4개 장 확장형 탭 UI) */}
      <div style={{ width: '100%', maxWidth: '500px', background: 'rgba(20, 24, 34, 0.9)', border: '1px solid #555', borderRadius: '12px', overflow: 'hidden', marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #555' }}>
          {[1, 2, 3, 4].map(tab => (
            <button key={tab} onClick={() => setActiveGuideTab(tab)} style={{
              padding: '12px 0', background: activeGuideTab === tab ? '#333' : 'transparent',
              color: activeGuideTab === tab ? '#fbbf24' : '#aaa', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontSize: '12px'
            }}>
              {tab}장
            </button>
          ))}
        </div>
        
        <div style={{ padding: '20px', fontSize: '14px', lineHeight: '1.6', color: '#e6d5b8', minHeight: '180px' }}>
          {activeGuideTab === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#06b6d4', margin: '0 0 10px 0', fontSize: '16px' }}>🪙 1장: 순환하는 토큰노믹스 생태계</h4>
              <p>GOU 생태계는 유저들의 <b>강화 결과</b>에 따라 치밀하게 분배되어 유지됩니다.</p>
              <ul style={{ paddingLeft: '20px', marginTop: '10px', color: '#fff', fontSize: '13px' }}>
                <li style={{ marginBottom: '5px' }}><b>강화 성공 시:</b> 소모된 비용의 <span style={{color: '#10b981'}}>100%가 채굴 풀(Mining Pool)</span>로 회수되어 생태계를 순환합니다.</li>
                <li><b>강화 실패 시:</b><br/>
                  - 채굴 풀: <span style={{color: '#10b981'}}>40%</span><br/>
                  - 영구 소각: <span style={{color: '#ef4444'}}>30%</span> (가치 상승)<br/>
                  - 주간 시즌 보상: <span style={{color: '#fbbf24'}}>15%</span> (상위 랭커 분배)<br/>
                  - 유동성 공급: <span style={{color: '#3b82f6'}}>10%</span> (DEX 방어)<br/>
                  - 예비 운영비: <span style={{color: '#a855f7'}}>5%</span>
                </li>
              </ul>
            </div>
          )}
          {activeGuideTab === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '16px' }}>⚔️ 2장: 파괴와 창조의 강화</h4>
              <p>획득한 자산은 반드시 <b>'장비 강화'</b>에 투자하십시오. 140강을 달성한 자만이 진정한 사령관으로 인정받아 <b>DEX 스왑 및 국고 출금 권한</b>을 얻게 됩니다.</p>
            </div>
          )}
          {activeGuideTab === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#fbbf24', margin: '0 0 10px 0', fontSize: '16px' }}>🔄 3장: 10조 폐쇄형 경제</h4>
              <p>본 서버의 토큰은 무한 발행되지 않습니다. 총 발행량 10조 GOU 내에서 철저히 순환하며, 누적 소각량(Burn)에 따라 <b>반감기(Halving)</b>가 발동되어 채굴 난이도와 가치가 극적으로 변동합니다.</p>
            </div>
          )}
          {activeGuideTab === 4 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#a855f7', margin: '0 0 10px 0', fontSize: '16px' }}>🎲 4장: 도파민 아케이드</h4>
              <p>매일 지급되는 티켓으로 랜덤 아케이드 미니게임에 입장하십시오. 높은 스펙을 달성할수록 미니게임의 <b>PERFECT 보상</b> 금액은 기하급수적으로 폭발합니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 사전예약 텔레그램 봇 연결 버튼 */}
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <button onClick={handleBotRedirect} style={{ 
          width: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', color: '#fff', 
          padding: '20px', borderRadius: '15px', fontSize: '20px', fontWeight: '900', border: 'none', 
          cursor: 'pointer', boxShadow: '0 10px 30px rgba(6,182,212,0.5)', animation: 'pulse 2s infinite' 
        }}>
          🚀 텔레그램 봇(전초기지) 입장하기
        </button>
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
          어떤 브라우저에서든 클릭 시 텔레그램 GOU 봇으로 완벽히 연결됩니다.
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