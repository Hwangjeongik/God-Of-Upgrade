/* eslint-disable */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { app } from './firebase'; 

const MAX_SUPPLY = 10000000000000; 
const SAVE_POINTS = [10, 20, 30, 40]; 

// 🚨 사령관님의 실제 운영비 지갑 주소 (TON 입금받을 주소)를 여기에 넣으십시오!
const ADMIN_WALLET_ADDRESS = "UQBeUaO9-hrCsfk8UWtaafeu3EXV08Gnoww4bbMdanCZwgmQ"; // 임시 주소, 반드시 수정!

// =========================================================================
// 🎟️ 핫타임 스크래치 복권 컴포넌트 (계급별 고정 보상 완벽 적용)
// =========================================================================
const ScratchLottery = ({ userRank, onReward, onClose }) => {
  const canvasRef = useRef(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [reward, setReward] = useState(0);

  useEffect(() => {
    // 🚨 사령관님의 헌법: 계급별 정확한 고정 확률과 보상금
    const roll = Math.random() * 100;
    let amt = 0;

    if (userRank.includes('GOD')) {
      if (roll < 80) amt = 100000000;       // 80%: 1억
      else if (roll < 95) amt = 1000000000;  // 15%: 10억
      else if (roll < 99) amt = 5000000000;  // 4%: 50억
      else amt = 10000000000;                // 1%: 100억
    } else if (userRank.includes('사령관')) {
      if (roll < 80) amt = 50000000;        // 80%: 5천만
      else if (roll < 95) amt = 100000000;   // 15%: 1억
      else if (roll < 99) amt = 500000000;   // 4%: 5억
      else amt = 1000000000;                 // 1%: 10억
    } else if (userRank.includes('기사')) {
      if (roll < 80) amt = 5000000;         // 80%: 500만
      else if (roll < 95) amt = 10000000;    // 15%: 1천만
      else if (roll < 99) amt = 50000000;    // 4%: 5천만
      else amt = 100000000;                  // 1%: 1억
    } else { // 훈련병
      if (roll < 80) amt = 500000;          // 80%: 50만
      else if (roll < 95) amt = 1000000;     // 15%: 100만
      else if (roll < 99) amt = 5000000;     // 4%: 500만
      else amt = 10000000;                   // 1%: 1천만
    }
    
    setReward(amt);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#b0bec5'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 22px Pretendard, sans-serif';
    ctx.fillStyle = '#78909c';
    ctx.textAlign = 'center';
    ctx.fillText('손가락으로 긁으세요!', canvas.width/2, canvas.height/2 + 7);
  }, [userRank]); // userRank 변경 시 재계산

  const handleScratch = (e) => {
    if(isCompleted) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for(let i=3; i<pixels.length; i+=4) if(pixels[i] === 0) transparent++;
    if(transparent / (canvas.width * canvas.height) > 0.5) {
      setIsCompleted(true);
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
    }
  };

  return (
    <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.9)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
       <h2 style={{color:'#fbbf24', textShadow:'0 0 10px #fbbf24', marginBottom:'30px', animation:'pulse 1.5s infinite'}}>🔥 핫타임 잭팟 복권 🔥</h2>
       <div style={{ position:'relative', width:'300px', height:'150px', background:'#222', borderRadius:'15px', border:'3px solid #fbbf24', overflow:'hidden', boxShadow:'0 0 30px rgba(251,191,36,0.6)' }}>
           <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', width:'100%' }}>
               <div style={{ color:'#fbbf24', fontSize:'24px', fontWeight:'900' }}>🎉 당첨 🎉</div>
               <div style={{ color:'#fff', fontSize:'22px', fontWeight:'bold', marginTop:'5px' }}>{reward.toLocaleString()} GOU</div>
           </div>
           <canvas ref={canvasRef} width={300} height={150} style={{ position:'absolute', top:0, left:0, cursor:'crosshair', touchAction:'none' }} 
             onPointerDown={(e)=>{e.target.setPointerCapture(e.pointerId); handleScratch(e);}} 
             onPointerMove={(e)=>{if(e.buttons>0) handleScratch(e);}} 
             onTouchMove={(e)=>{e.preventDefault(); handleScratch(e);}} 
           />
       </div>
       {isCompleted && <button onClick={()=>{ onReward(reward); onClose(); }} style={{ marginTop:'30px', background:'linear-gradient(90deg, #fbbf24, #d97706)', color:'#000', padding:'15px 40px', borderRadius:'10px', fontSize:'18px', fontWeight:'900', border:'none', boxShadow:'0 5px 15px rgba(251,191,36,0.5)', cursor:'pointer' }}>국고로 입금하기</button>}
    </div>
  );
};

// =========================================================================
// 🚀 통합 미니게임 아케이드 엔진 V8
// =========================================================================
const ArcadeGames = ({ type, onClose, onReward, pReward, gReward }) => {
  const [status, setStatus] = useState('playing'); 
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const reqRef = useRef();
  const lastTimeRef = useRef();

  const [stacked, setStacked] = useState(0);
  const [basePos, setBasePos] = useState(50); 

  const [targets, setTargets] = useState([]);
  const catchScoreRef = useRef(0);
  const catchSpawnRef = useRef(0);
  
  const [memSeq, setMemSeq] = useState([]);
  const [userSeq, setUserSeq] = useState([]);
  const [flashIdx, setFlashIdx] = useState(-1);

  const animate = useCallback((time) => {
    if (lastTimeRef.current != null) {
      const dt = time - lastTimeRef.current;
      let speed = type === 'blacksmith' ? 0.26 : 0.21 + (stacked * 0.055); 
      posRef.current += dirRef.current * speed * dt;
      if (posRef.current >= 100) { posRef.current = 100; dirRef.current = -1; }
      if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }
      setPos(posRef.current);
    }
    lastTimeRef.current = time;
    if (status === 'playing' && (type === 'blacksmith' || type === 'tower')) {
      reqRef.current = requestAnimationFrame(animate);
    }
  }, [status, type, stacked]);

  useEffect(() => {
    if (status === 'playing' && (type === 'blacksmith' || type === 'tower')) {
      reqRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(reqRef.current);
  }, [status, animate, type]);

  useEffect(() => {
    if(type === 'catch' && status === 'playing') {
      catchScoreRef.current = 0;
      catchSpawnRef.current = 0;
      const spawnNext = () => {
        if (catchSpawnRef.current >= 5) {
           setTimeout(() => {
             const score = catchScoreRef.current;
             if(score === 5) setStatus('perfect');
             else if(score >= 3) setStatus('good');
             else setStatus('miss');
           }, 250); 
           return;
        }
        const id = catchSpawnRef.current;
        const newTarget = { id, top: Math.random()*60 + 10 + '%', left: Math.random()*70 + 10 + '%' };
        setTargets([newTarget]); 
        catchSpawnRef.current++;
        setTimeout(() => {
          setTargets(prev => prev.filter(t => t.id !== id));
          setTimeout(spawnNext, 90); 
        }, 380); 
      };
      setTimeout(spawnNext, 250); 
    }
  }, [type, status]);

  useEffect(() => {
    if(type === 'memory' && status === 'playing') {
      const seq = [Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4)];
      setMemSeq(seq);
      setUserSeq([]);
      let i = 0;
      const interval = setInterval(() => {
        if(i < seq.length) {
          setFlashIdx(seq[i]);
          setTimeout(() => setFlashIdx(-1), 75); 
          i++;
        } else {
          clearInterval(interval);
        }
      }, 220); 
      return () => clearInterval(interval);
    }
  }, [type, status]);

  const handleHit = (e) => {
    if (e) e.preventDefault();
    if(status !== 'playing') return;
    if (type === 'blacksmith') {
      cancelAnimationFrame(reqRef.current);
      if (posRef.current >= 45 && posRef.current <= 55) setStatus('perfect');
      else if (posRef.current >= 30 && posRef.current <= 70) setStatus('good');
      else setStatus('miss');
    } 
    else if (type === 'tower') {
      if (stacked === 0) {
        setBasePos(posRef.current); 
        setStacked(1);
      } else {
        const diff = Math.abs(posRef.current - basePos);
        if (diff <= 15) { 
          const nextStacked = stacked + 1;
          setStacked(nextStacked);
          if (nextStacked === 3) {
             cancelAnimationFrame(reqRef.current);
             setStatus('perfect');
          }
        } else {
          cancelAnimationFrame(reqRef.current);
          if (stacked === 2) setStatus('good');
          else setStatus('miss'); 
        }
      }
    }
  };

  const handleCatch = (e, id) => {
    if (e) e.preventDefault();
    if(status !== 'playing') return;
    catchScoreRef.current++;
    setTargets([]); 
  };

  const handleMemoryClick = (e, idx) => {
    if (e) e.preventDefault();
    if(status !== 'playing' || memSeq.length === 0 || flashIdx !== -1) return;
    const newSeq = [...userSeq, idx];
    setUserSeq(newSeq);
    if(newSeq[newSeq.length-1] !== memSeq[newSeq.length-1]) {
       if (newSeq.length - 1 >= 3) setStatus('good');
       else setStatus('miss');
    } else if(newSeq.length === memSeq.length) {
       setStatus('perfect');
    }
  };

  const getTitle = () => {
    if(type==='blacksmith') return '🔨 대장장이 망치질';
    if(type==='tower') return '🏗️ 블록 쌓기';
    if(type==='catch') return '📦 보물 상자 잡기';
    if(type==='memory') return '🧠 기억력 테스트';
  };

  return (
    <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(10,12,18,0.95)', backdropFilter: 'blur(10px)', zIndex:20000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
       <h2 style={{color:'#fbbf24', fontSize:'28px', marginBottom:'20px'}}>{getTitle()}</h2>
       <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #555', padding: '10px 20px', borderRadius: '10px', marginBottom: '30px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold', marginBottom: '5px' }}>📈 현재 스펙 보상 티어</div>
          <div style={{ fontSize: '14px', color: '#fff' }}>
            PERFECT: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{pReward.toLocaleString()}</span> GOU <br/>
            GOOD: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{gReward.toLocaleString()}</span> GOU
          </div>
        </div>

       <div style={{width:'90%', maxWidth:'400px', height:'200px', position:'relative', display:'flex', justifyContent:'center', alignItems:'center', marginBottom:'30px'}}>
         {type === 'blacksmith' && (
            <div style={{ position: 'relative', width: '100%', height: '40px', background: '#222', border: '2px solid #555', borderRadius: '20px' }}>
              <div style={{ position: 'absolute', left: '30%', width: '40%', height: '100%', background: 'rgba(251, 191, 36, 0.4)' }}></div>
              <div style={{ position: 'absolute', left: '45%', width: '10%', height: '100%', background: 'rgba(6, 182, 212, 0.8)' }}></div>
              <div style={{ position: 'absolute', left: `${pos}%`, width: '6px', height: '60px', background: '#fff', top: '-10px', boxShadow: '0 0 15px #fff', transform: 'translateX(-50%)', borderRadius: '3px' }}></div>
            </div>
         )}
         {type === 'tower' && (
            <div style={{ position: 'relative', width: '100%', height: '180px', borderBottom: '4px solid #fff' }}>
              {stacked > 0 && <div style={{position:'absolute', left:`${basePos}%`, width:'2px', height:'100%', background:'rgba(255,255,255,0.2)', transform:'translateX(-50%)'}}></div>}
              {Array.from({length: stacked}).map((_, i) => (
                 <div key={i} style={{ position: 'absolute', left: `${basePos}%`, width: '25%', height: '30px', background: '#fbbf24', bottom: `${i*30}px`, transform: 'translateX(-50%)', borderRadius:'4px', border:'1px solid #000' }}></div>
              ))}
              {status === 'playing' && stacked > 0 && <div style={{ position: 'absolute', left: `${basePos}%`, width: '25%', height: '30px', bottom: `${stacked*30}px`, background: 'rgba(6, 182, 212, 0.3)', border: '2px dashed #06b6d4', transform: 'translateX(-50%)' }}></div>}
              {status === 'playing' && <div style={{ position: 'absolute', left: `${pos}%`, width: '25%', height: '30px', background: '#fbbf24', bottom: `${stacked*30}px`, border:'2px solid #fff', transform: 'translateX(-50%)', borderRadius:'4px' }}></div>}
              {stacked === 0 && <div style={{position:'absolute', width:'100%', textAlign:'center', color:'#aaa', bottom:'40px', fontSize:'12px'}}>첫 블록은 자유롭게 1층을 만드세요!</div>}
            </div>
         )}
         {type === 'catch' && (
            <div style={{ width: '100%', height: '100%', position: 'relative', background:'rgba(0,0,0,0.5)', borderRadius:'15px', border:'1px solid #333', overflow:'hidden', touchAction: 'none' }}>
              <div style={{position:'absolute', top:10, left:10, color:'#fbbf24', fontWeight:'bold', zIndex:10}}>적중: {catchScoreRef.current} / 5</div>
              {targets.map(t => (
                <div key={t.id} onPointerDown={(e) => handleCatch(e, t.id)} style={{ position:'absolute', top:t.top, left:t.left, fontSize:'50px', cursor:'pointer', padding:'10px', filter:'drop-shadow(0 0 10px #fbbf24)', transition: 'top 0.1s, left 0.1s', userSelect: 'none' }}>📦</div>
              ))}
              {status === 'playing' && targets.length === 0 && <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'#555', fontWeight:'bold'}}>집중하세요!</div>}
            </div>
         )}
         {type === 'memory' && (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', touchAction: 'none'}}>
              <div style={{color:'#06b6d4', marginBottom:'15px', fontWeight:'bold', fontSize:'16px'}}>
                {flashIdx !== -1 ? '패턴을 외우세요!' : '순서대로 터치하세요!'} ({userSeq.length}/5)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} onPointerDown={(e) => handleMemoryClick(e, i)} style={{ width: '80px', height: '80px', borderRadius: '15px', background: flashIdx === i ? '#fff' : ['#ef4444','#3b82f6','#10b981','#fbbf24'][i], opacity: flashIdx === i ? 1 : 0.6, cursor: 'pointer', transition: 'background 0.1s, opacity 0.1s', boxShadow: flashIdx === i ? '0 0 20px #fff' : 'none', userSelect: 'none' }}></div>
                ))}
              </div>
            </div>
         )}
       </div>

       {status === 'playing' ? (
         <div style={{ display: 'flex', gap: '15px' }}>
           <button onClick={onClose} style={{ background: '#333', color: '#fff', padding: '15px 30px', borderRadius: '15px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>도망치기</button>
           {(type === 'blacksmith' || type === 'tower') && (
             <button onPointerDown={handleHit} style={{ background: 'linear-gradient(90deg, #ef4444, #b91c1c)', color: '#fff', padding: '15px 50px', borderRadius: '15px', fontSize: '20px', fontWeight: '900', border: 'none', boxShadow: '0 5px 20px rgba(239, 68, 68, 0.5)', cursor: 'pointer', userSelect: 'none', touchAction: 'none' }}>
               💥 멈추기!
             </button>
           )}
         </div>
       ) : (
         <div style={{ textAlign: 'center', animation: 'flashSuccess 0.5s ease-out' }}>
            <div style={{ fontSize: '36px', fontWeight: '900', color: status === 'perfect' ? '#06b6d4' : status === 'good' ? '#fbbf24' : '#ef4444', marginBottom: '10px' }}>
              {status.toUpperCase()}!!
            </div>
            <div style={{ fontSize: '18px', color: '#fff', marginBottom: '30px' }}>
              결과 보상: <span style={{ color: status !== 'miss' ? '#10b981' : '#ef4444', fontWeight:'bold' }}>{status !== 'miss' ? `+${(status === 'perfect' ? pReward : gReward).toLocaleString()} GOU` : '보상 없음'}</span>
            </div>
            <button onClick={() => onReward(status === 'perfect' ? pReward : status === 'good' ? gReward : 0)} style={{ background: '#fbbf24', color: '#000', padding: '15px 40px', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(251,191,36,0.4)' }}>
              보상 획득 및 복귀
            </button>
         </div>
       )}
    </div>
  );
};

// =========================================================================
// ⚔️ 업그레이드 카드
// =========================================================================
const UpgradeCard = ({ item, type, isMax, cost, onUpgrade, onAuto, autoActive, animClass, boxAnimClass, specialHunt }) => (
  <div className={`glass-panel ${boxAnimClass}`} style={{ padding: '15px', display: 'flex', flexDirection: type === 'gear' ? 'column' : 'row', alignItems: 'center', gap: type === 'gear' ? '0' : '25px', marginBottom: type === 'gear' ? 0 : '15px', borderTop: type === 'gear' ? '4px solid rgba(197,160,89,0.8)' : 'none', position:'relative', overflow:'hidden' }}>
    {item.locked && (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px', padding: '10px 20px', border: '1px solid #fbbf24', borderRadius: '6px', background: 'rgba(0,0,0,0.9)' }}>🔒 {item.lockMsg}</div>
      </div>
    )}
    <div className="img-box-gear" style={type !== 'gear' ? { width: '150px', height: '150px', margin: '0' } : {}}>
      <img src={`${process.env.PUBLIC_URL}/${item.imgFile}`} alt={item.name} onError={(e)=>{e.target.style.opacity='0'; e.target.nextSibling.style.display='block';}} />
      <span style={{ display: 'none', fontSize: '40px', position: 'absolute' }}>{item.emoji}</span>
    </div>
    
    <div style={type !== 'gear' ? { flex: 1 } : { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {type === 'gear' && <div style={{ fontSize: '11px', color: '#c5a059', fontWeight: 'bold', marginTop: '8px' }}>[{item.statText}]</div>}
      
      <div style={{ fontSize: type === 'gear' ? '13px' : '20px', fontWeight: '900', margin: '6px 0', color: type === 'gear' ? '#fff' : '#fbbf24', textAlign: type === 'gear' ? 'center' : 'left' }}>
        {item.name} <span className={animClass} style={{ color: type === 'gear' ? '#fbbf24' : '#fff', fontSize: type === 'gear' ? 'inherit' : '14px', display: 'inline-block', marginLeft: type !== 'gear' ? '5px' : '0' }}><br/>+{item.lvl}</span>
      </div>

      <div style={{ color: '#ccc', fontSize: '12px', lineHeight: '1.5', textAlign: type === 'gear' ? 'center' : 'left', background: 'rgba(0,0,0,0.4)', padding: '5px', borderRadius: '5px', width: '100%' }}>
        {item.bonusText}<br/>
        확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4', fontWeight: 'bold'}}>{isMax ? 'MAX' : `${item.successRateDisplay}%`}</span><br/>
        비용: <span style={{color: '#fbbf24', fontWeight: 'bold'}}>{isMax ? 'MAX' : `${cost.toLocaleString()}${type !== 'gear' ? ' GOU' : ''}`}</span>
      </div>
      
      <div style={{ display: 'flex', width: '100%', gap: '6px', marginTop: '12px' }}>
        <button onClick={() => onUpgrade(type, item.id)} disabled={isMax || autoActive} className="action-btn" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid #fbbf24' }}>강화</button>
        <button onClick={() => onAuto(type, item.id)} disabled={isMax} className="action-btn" style={{ background: autoActive ? 'rgba(6,182,212,0.3)' : 'rgba(0,0,0,0.6)', color: autoActive ? '#06b6d4' : '#888', border: `1px solid ${autoActive ? '#06b6d4' : '#555'}` }}>{autoActive ? 'STOP' : 'AUTO'}</button>
      </div>

      {specialHunt && isMax && (
        <button onClick={specialHunt.onStart} disabled={specialHunt.isHunting} className="action-btn" style={{ width: '100%', marginTop: '10px', background: specialHunt.isHunting ? '#333' : 'rgba(147,51,234,0.3)', color: specialHunt.isHunting ? '#888' : '#a855f7', border: `1px solid ${specialHunt.isHunting ? '#444' : '#a855f7'}` }}>
          {specialHunt.isHunting ? '진행 중 ⚔️' : specialHunt.huntText}
        </button>
      )}
    </div>
  </div>
);

// =========================================================================
// 👑 메인 사령부 APP
// =========================================================================
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [settingTab, setSettingTab] = useState('friend'); 
  const [invitedFriends, setInvitedFriends] = useState([
    { name: "홍길동", rank: "훈련병", petLvl: 0, castleLvl: 0 },
    { name: "KOREA", rank: "기사", petLvl: 50, castleLvl: 10 }
  ]);
  const [validInvites, setValidInvites] = useState(1); 

  const hunts = useMemo(() => [
    {name: '초원 영지', mult: 1, reqSum: 0, req: {atk:0, hp:0, def:0, acc:0}},
    {name: '신의 숲', mult: 1.5, reqSum: 35, req: {atk:50, hp:500, def:25, acc:10}},
    {name: '불멸 사막', mult: 2.5, reqSum: 70, req: {atk:100, hp:1000, def:50, acc:20}},
    {name: '심연 정글', mult: 5, reqSum: 110, req: {atk:170, hp:1700, def:75, acc:34}},
    {name: '황혼 화산', mult: 12, reqSum: 150, req: {atk:230, hp:2300, def:115, acc:46}}
  ], []);

  const [state, setState] = useState({ 
    screen: 'wallet', walletAddress: '', balance: 1000000000, burned: 0, jackpot: 50000000, 
    pendingGOU: 0, unclaimedTime: 0, userName: "사령관",
    petLevel: 0, castleLevel: 0, petHuntEndTime: 0, castleHuntEndTime: 0, isAdActive: false, adTimeLeft: 0,
    tickets: 3, adViewsLeft: 3, nextAdChargeTime: 0, 
    nextBuffAdTime: 0, 
    lastLotterySlot: "", 
    lastDailyReset: Math.floor((Date.now() + 9 * 3600000) / 86400000), customGodTitle: "UPGRADE" 
  });

  const lockRef = useRef({}); 
  const autoActiveRef = useRef({}); 
  const levelsRef = useRef({}); 
  const [autoUI, setAutoUI] = useState({});
  const [lvlAnims, setLvlAnims] = useState({}); 
  const [anims, setAnims] = useState({});
  const [activeModal, setActiveModal] = useState(null); 
  const [showGuide, setShowGuide] = useState(false); 
  const [showLottery, setShowLottery] = useState(false);

  const [gears, setGears] = useState([
    {id: 'sword', name: '제우스의 검', lvl: 0, stat: '공격력', base: 10, unit: '', imgFile: 'sword.jpg', emoji: '⚡'},
    {id: 'armor', name: '아레스의 갑옷', lvl: 0, stat: '체력', base: 100, unit: '', imgFile: 'armor.jpg', emoji: '🔥'},
    {id: 'helmet', name: '아테나의 투구', lvl: 0, stat: '방어력', base: 5, unit: '', imgFile: 'helmet.jpg', emoji: '🦉'},
    {id: 'gloves', name: '헤파이스토스의 장갑', lvl: 0, stat: '명중률', base: 2, unit: '', imgFile: 'gloves.jpg', emoji: '🔨'},
    {id: 'boots', name: '헤르메스의 신발', lvl: 0, stat: 'GOU 보너스', base: 5, unit: '%', imgFile: 'shoes.jpg', emoji: '🪽'},
    {id: 'necklace', name: '아프로디테의 목걸이', lvl: 0, stat: '비용감소', base: 0.5, unit: '%', imgFile: 'necklace.jpg', emoji: '🌹'},
    {id: 'ring', name: '포세이돈의 반지', lvl: 0, stat: '성공확률', base: 0.1, unit: '%', imgFile: 'ring.jpg', emoji: '🌊'}
  ]);

  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI(); // 🚨 TON 결제를 위한 UI 훅 추가
  const latestUpgradeRef = useRef();

  useEffect(() => {
    gears.forEach(g => levelsRef.current[g.id] = g.lvl);
    levelsRef.current['pet'] = state.petLevel;
    levelsRef.current['castle'] = state.castleLevel;
    levelsRef.current['balance'] = state.balance;
    levelsRef.current['necklace'] = gears.find(g => g.id === 'necklace')?.lvl || 0;
    levelsRef.current['ring'] = gears.find(g => g.id === 'ring')?.lvl || 0;
  });

  const triggerAnim = useCallback((id, type) => { setAnims(p => ({ ...p, [id]: type })); setTimeout(() => setAnims(p => ({ ...p, [id]: null })), 250); }, []);
  const triggerLvlAnim = useCallback((id, type) => { setLvlAnims(p => ({ ...p, [id]: type })); setTimeout(() => setLvlAnims(p => ({ ...p, [id]: null })), 200); }, []);

  const totalGearLevel = gears.reduce((a, b) => a + b.lvl, 0); 
  const minLvl = Math.min(...gears.map(g => g.lvl));
  const setBonus = minLvl >= 30 ? 500 : minLvl >= 20 ? 200 : minLvl >= 10 ? 100 : 0;
  const isPetUnlocked = totalGearLevel >= 210;
  const isCastleUnlocked = state.petLevel >= 50;

  const userRankTitle = useMemo(() => {
    if (state.castleLevel >= 50) return `${state.customGodTitle} GOD`;
    if (state.petLevel >= 50) return "사령관";
    if (totalGearLevel >= 210) return "기사";
    return "훈련병";
  }, [state.castleLevel, state.petLevel, totalGearLevel, state.customGodTitle]);

  const rankings = useMemo(() => {
    const myScore = state.castleLevel * 100000 + state.petLevel * 1000 + totalGearLevel;
    const myData = { name: state.userName, title: userRankTitle, score: myScore, isMe: true, c: state.castleLevel, p: state.petLevel, g: totalGearLevel };
    const bots = [
      { name: "KOREA", title: "LEGENDARY GOD", score: 50 * 100000 + 50 * 1000 + 210, c: 50, p: 50, g: 210 },
      { name: "UPGRADE", title: "KING OF LUCK", score: 40 * 100000 + 50 * 1000 + 210, c: 40, p: 50, g: 210 },
      { name: "CHAMPION", title: "IRON KNIGHT", score: 30 * 100000 + 20 * 1000 + 150, c: 30, p: 20, g: 150 },
    ];
    return [...bots, myData].sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [state.userName, userRankTitle, state.castleLevel, state.petLevel, totalGearLevel]);

  const currentStats = useMemo(() => ({
    atk: gears[0].lvl * gears[0].base, hp: gears[1].lvl * gears[1].base, def: gears[2].lvl * gears[2].base, acc: gears[3].lvl * gears[3].base, sum: totalGearLevel
  }), [gears, totalGearLevel]);

  const { pReward, gReward } = useMemo(() => {
    let p = 1000000; let g = 200000;
    if (state.castleLevel >= 50) { p = 1000000000; g = 200000000; }
    else if (state.petLevel >= 50) { p = 100000000; g = 20000000; }
    else if (totalGearLevel >= 210) { p = 10000000; g = 2000000; }
    return { pReward: p, gReward: g };
  }, [state.castleLevel, state.petLevel, totalGearLevel]);

  const getPetBonus = useCallback((lvl) => { if (lvl >= 50) return 1000; if (lvl >= 40) return 800; if (lvl >= 30) return 600; if (lvl >= 20) return 400; if (lvl >= 10) return 200; return 0; }, []);
  const getCastleBonus = useCallback((lvl) => { if (lvl >= 50) return 1500; if (lvl >= 40) return 1200; if (lvl >= 30) return 900; if (lvl >= 20) return 600; if (lvl >= 10) return 300; return 0; }, []);

  const isPhase2 = state.burned >= MAX_SUPPLY * 0.6;
  const isPhase1 = !isPhase2 && state.burned >= MAX_SUPPLY * 0.3;
  const gainHalvingMult = isPhase2 ? 0.25 : (isPhase1 ? 0.5 : 1.0);
  const costHalvingMult = isPhase2 ? 0.5 : 1.0; 

  const gearGainBonus = totalGearLevel * 2;
  const petGainBonus = isPetUnlocked ? state.petLevel * 3 : 0;
  const castleGainBonus = isCastleUnlocked ? state.castleLevel * 5 : 0;
  const petMilestone = getPetBonus(state.petLevel);
  const castleMilestone = getCastleBonus(state.castleLevel);
  const totalBonusPct = gearGainBonus + setBonus + petGainBonus + petMilestone + castleGainBonus + castleMilestone; 
  
  const calculateCost = useCallback((lvl, type, nLvl) => {
    const tier = Math.floor(lvl / 10);
    const baseMult = type === 'castle' ? 10000 : 1000;
    return Math.floor(((lvl % 10) + 1) * Math.pow(10, tier) * baseMult * (1 - (nLvl * 0.005)) * costHalvingMult);
  }, [costHalvingMult]);

  const getCost = useCallback((lvl) => calculateCost(lvl, 'gear', levelsRef.current['necklace']), [calculateCost]);
  const getPetCost = useCallback((lvl) => calculateCost(lvl, 'pet', levelsRef.current['necklace']), [calculateCost]);
  const getCastleCost = useCallback((lvl) => calculateCost(lvl, 'castle', levelsRef.current['necklace']), [calculateCost]);

  const getSuccessRate = (lvl) => {
    const ringBonus = (levelsRef.current['ring'] || 0) * 0.1; 
    let base = lvl >= 15 ? 50 : lvl >= 10 ? 60 : lvl >= 5 ? 70 : 100;
    return (base + ringBonus).toFixed(1);
  };

  const checkHunt = useCallback((now, stats, huntState) => {
    if (huntState.castleHuntEndTime > now) return { name: '🏰 제국의 심장 (특수)', mult: 50, isSpecial: true };
    if (huntState.petHuntEndTime > now) return { name: '🐉 신수의 둥지 (특수)', mult: 30, isSpecial: true };
    return hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.reqSum) || hunts[0];
  }, [hunts]);

  const currentHuntData = checkHunt(Date.now(), currentStats, state);
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * gainHalvingMult * (state.isAdActive ? 2.0 : 1.0));

  const activeHuntsToRender = useMemo(() => {
    const arr = [...hunts];
    const now = Date.now();
    if (state.castleHuntEndTime > now) arr.unshift({ name: '🏰 제국의 심장', mult: 50, isSpecial: true, endTime: state.castleHuntEndTime });
    if (state.petHuntEndTime > now) arr.unshift({ name: '🐉 신수의 둥지', mult: 30, isSpecial: true, endTime: state.petHuntEndTime });
    return arr;
  }, [hunts, state.castleHuntEndTime, state.petHuntEndTime]);

  const getUserId = () => window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? String(window.Telegram.WebApp.initDataUnsafe.user.id) : "test_commander_123";

  useEffect(() => {
    if (wallet) {
      setState(s => ({ ...s, walletAddress: wallet.account.address.substring(0, 6) + '...' + wallet.account.address.substring(wallet.account.address.length - 4), screen: 'game' }));
      httpsCallable(getFunctions(app), 'syncUserInfo')({ userId: getUserId(), title: userRankTitle, name: state.userName }).catch(e => console.log(e));
    } else {
      setState(s => ({ ...s, screen: 'wallet' }));
    }
  }, [wallet, userRankTitle, state.userName]);

  const withdrawGOU = async () => {
    if (totalGearLevel < 140) return alert(`🚨 출금 불가: 장비 총합 140강 이상 달성 시에만 국고 출금이 가능합니다! (현재: ${totalGearLevel}강)`);
    if (state.balance < 10000000) return alert("최소 1,000만 GOU부터 출금 가능합니다!");
    const input = window.prompt(`출금할 수량을 입력하세요.\n(현재 잔고: ${Math.floor(state.balance).toLocaleString()})\n※ 5% 소각 수수료 차감`, 10000000);
    if (!input) return;
    const amount = parseInt(input, 10);
    if (isNaN(amount) || amount < 10000000 || amount > state.balance) return alert("올바른 수량을 입력해주세요.");
    if (!window.confirm(`${amount.toLocaleString()} GOU 출금 (수수료 5% 차감 후 ${(amount * 0.95).toLocaleString()} 지급)`)) return;

    setState(s => ({...s, balance: s.balance - amount, burned: s.burned + (amount * 0.05) }));
    try {
        const res = await httpsCallable(getFunctions(app), 'withdrawGOU')({ userId: getUserId(), amount });
        alert(`출금 완료! 수수료 ${res.data.feeBurned.toLocaleString()} 소각됨.`);
    } catch (e) { alert("출금 실패: " + e.message); }
  };

  // 🚨 다이렉트 상점: TON 결제 연동 함수
  const handleBuyGOU = async (tonAmount, gouAmount) => {
    if (!wallet) return alert("지갑 연결이 필요합니다!");
    
    // 블록체인 트랜잭션 데이터 생성 (tonAmount를 나노톤 단위로 변환)
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // 60초 내 유효
        messages: [
            {
                address: ADMIN_WALLET_ADDRESS,
                amount: String(tonAmount * 1e9), // 1 TON = 1,000,000,000 nanotons
            }
        ]
    };

    try {
        // 톤키퍼 등 지갑으로 결제 승인 요청
        const result = await tonConnectUI.sendTransaction(transaction);
        
        // 결제 성공 시 서버에 GOU 지급 요청
        const res = await httpsCallable(getFunctions(app), 'buyGOU')({ 
            userId: getUserId(), 
            amount: gouAmount, 
            txHash: result.boc // 영수증 해시
        });
        
        if (res.data.success) {
            setState(s => ({...s, balance: s.balance + gouAmount}));
            alert(`🎉 결제 완료! ${gouAmount.toLocaleString()} GOU가 즉시 보급되었습니다!`);
        }
    } catch (e) {
        console.error("결제 에러:", e);
        alert("결제가 취소되었거나 오류가 발생했습니다.");
    }
  };

  const claimGOU = async () => {
    const gain = Math.floor(state.pendingGOU);
    if (gain < 10) return alert("최소 10 GOU 이상 획득 가능합니다.");
    setState(s => ({ ...s, balance: s.balance + gain, pendingGOU: 0, unclaimedTime: 0 }));
    triggerAnim('claim', 'success');
    try { await httpsCallable(getFunctions(app), 'claimGOU')({ userId: getUserId(), currentMultiplier: currentHuntData.mult * (state.isAdActive ? 2.0 : 1.0) }); } catch (error) {}
  };

  const startSpecialHunt = (type) => {
    const now = Date.now();
    if (state.petHuntEndTime > now || state.castleHuntEndTime > now) {
      alert("🔒 중복 실행 불가! 이미 다른 특수 사냥터 작전이 진행 중입니다.");
      return;
    }
    const duration = 12 * 60 * 60 * 1000;
    if (type === 'pet') setState(s => ({ ...s, petHuntEndTime: now + duration }));
    else if (type === 'castle') setState(s => ({ ...s, castleHuntEndTime: now + duration }));
    alert("특수 사냥터 활성화! 12시간 동안 최고 배율의 수익이 국고로 자동 입금됩니다.");
  };

  const handleTitleEdit = () => {
    if (state.castleLevel >= 50) {
      const newPrefix = window.prompt("자신만의 호칭(영문/한글)을 입력하세요! (예: KOREA)\n입력하신 단어 뒤에 ' GOD'이 고정으로 붙습니다.", state.customGodTitle);
      if (newPrefix && newPrefix.trim() !== "") {
         setState(s => ({ ...s, customGodTitle: newPrefix.trim().toUpperCase() }));
      }
    } else { alert("🔒 성 50강 달성 시 나만의 GOD 호칭을 부여할 수 있습니다!"); }
  };

  const formatTimeStr = (targetTime) => {
    const diff = Math.max(0, targetTime - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const watchAdForTicket = () => {
    if (state.adViewsLeft <= 0) return alert("현재 광고 충전 중입니다! (3시간마다 1장씩 충전, 매일 오전 9시 3장 리셋)");
    setState(s => {
      const nextCharge = s.adViewsLeft === 3 ? Date.now() + 3 * 3600000 : s.nextAdChargeTime;
      return { ...s, tickets: s.tickets + 1, adViewsLeft: s.adViewsLeft - 1, nextAdChargeTime: nextCharge };
    });
    alert("📺 광고 시청 완료! 게임장 티켓 1장이 충전되었습니다.");
  };

  const watchBuffAd = () => {
    if (Date.now() < state.nextBuffAdTime) {
      return alert(`🚨 버프 쿨타임 중입니다! 남은 시간: ${formatTimeStr(state.nextBuffAdTime)}`);
    }
    setState(s => ({
      ...s, isAdActive: true, adTimeLeft: 3600, nextBuffAdTime: Date.now() + 3 * 3600000
    }));
    alert("📺 광고 시청 완료! 1시간 동안 채굴량이 2배로 증가합니다. (3시간 후 다시 시청 가능)");
  };

  const testPushNotification = async () => {
    const uid = getUserId();
    if (uid === "test_commander_123") return alert("🚨 에러: 텔레그램 앱에서 실행했는지 확인하세요.");
    try {
      await httpsCallable(getFunctions(app), 'testPushNotification')({ userId: uid, title: userRankTitle, name: state.userName });
      alert("✅ 백엔드로 실제 알림 전송 명령을 꽂아 넣었습니다!");
    } catch (e) { alert("❌ 푸시 실패: " + e.message); }
  };

  const handleUpgrade = async (type, id = null) => {
    const key = id || type;
    if (lockRef.current[key]) return; 
    let cost = calculateCost(levelsRef.current[key], type, levelsRef.current['necklace']);
    let currentLvl = levelsRef.current[key];
    if (currentLvl >= (type === 'gear' ? 30 : 50)) return;
    if (levelsRef.current['balance'] < cost) return alert("GOU 부족");

    lockRef.current[key] = true;
    setTimeout(() => { lockRef.current[key] = false; }, 150);

    const ringBonus = (levelsRef.current['ring'] || 0) * 0.001;
    let successRate = currentLvl >= 15 ? 0.5 : currentLvl >= 10 ? 0.6 : currentLvl >= 5 ? 0.7 : 1.0;
    successRate += ringBonus;

    const isSuccess = Math.random() < successRate;
    let nextLvl = currentLvl;

    if (isSuccess) {
      nextLvl++;
    } else {
      if (currentLvl >= 5 && !SAVE_POINTS.includes(currentLvl)) {
        nextLvl--;
      }
    }

    setState(s => {
      const feeRate = s.burned >= MAX_SUPPLY * 0.6 ? 0.23 : (s.burned >= MAX_SUPPLY * 0.3 ? 0.18 : 0.15);
      const fee = isSuccess ? 0 : cost * feeRate;
      const newState = { ...s, balance: s.balance - cost, burned: s.burned + fee, jackpot: s.jackpot + fee };
      if (type === 'pet') newState.petLevel = nextLvl;
      if (type === 'castle') newState.castleLevel = nextLvl;
      return newState;
    });

    if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: nextLvl } : g));
    
    if (!isSuccess && SAVE_POINTS.includes(currentLvl)) {
      triggerLvlAnim(key, 'up'); 
    } else {
      triggerLvlAnim(key, isSuccess ? 'up' : 'down');
    }
    triggerAnim(key, isSuccess ? 'success' : 'fail');

    httpsCallable(getFunctions(app), 'upgradeItem')({ userId: getUserId(), type, id }).catch(e => console.log(e));
  };

  useEffect(() => { latestUpgradeRef.current = handleUpgrade; });

  const toggleAuto = async (type, id = null) => {
    const key = id || type;
    const maxLimit = type === 'gear' ? 30 : 50;
    if (autoActiveRef.current[key]) { autoActiveRef.current[key] = false; setAutoUI(p => ({ ...p, [key]: false })); return; } 

    const currentLvl = levelsRef.current[key];
    const targetStr = window.prompt(`목표 강화 레벨 입력 (최대 ${maxLimit}):`, maxLimit);
    if (!targetStr) return; 
    const target = parseInt(targetStr, 10);
    if (isNaN(target) || target <= currentLvl || target > maxLimit) return alert("유효한 숫자 입력 요망.");

    autoActiveRef.current[key] = true;
    setAutoUI(p => ({ ...p, [key]: true }));

    const runSimulator = async () => {
      while (autoActiveRef.current[key]) {
        let simLvl = levelsRef.current[key];
        let simBalance = levelsRef.current['balance'];
        if (simLvl >= target || simLvl >= maxLimit) { alert(`목표 달성!`); break; }

        let cost = calculateCost(simLvl, type, levelsRef.current['necklace']);
        if (simBalance < cost) { alert(`잔고 부족!`); break; }

        const ringBonus = (levelsRef.current['ring'] || 0) * 0.001;
        let successRate = simLvl >= 15 ? 0.5 : simLvl >= 10 ? 0.6 : simLvl >= 5 ? 0.7 : 1.0;
        successRate += ringBonus;

        const isSuccess = Math.random() < successRate;
        let nextSimLvl = simLvl;
        if (isSuccess) nextSimLvl++;
        else if (simLvl >= 5 && !SAVE_POINTS.includes(simLvl)) nextSimLvl--;

        setState(s => {
          const feeRate = s.burned >= MAX_SUPPLY * 0.6 ? 0.23 : (s.burned >= MAX_SUPPLY * 0.3 ? 0.18 : 0.15);
          const fee = isSuccess ? 0 : cost * feeRate;
          const newState = { ...s, balance: s.balance - cost, burned: s.burned + fee, jackpot: s.jackpot + fee };
          if (type === 'pet') newState.petLevel = nextSimLvl;
          if (type === 'castle') newState.castleLevel = nextSimLvl;
          return newState;
        });

        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: nextSimLvl } : g));
        
        if (!isSuccess && SAVE_POINTS.includes(simLvl)) triggerLvlAnim(key, 'up');
        else triggerLvlAnim(key, isSuccess ? 'up' : 'down');
        triggerAnim(key, isSuccess ? 'success' : 'fail'); 
        await new Promise(r => setTimeout(r, 400)); 
      }
      autoActiveRef.current[key] = false;
      setAutoUI(p => ({ ...p, [key]: false }));
    };
    runSimulator();
  };

  useEffect(() => {
    if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }
    const timer = setInterval(() => {
      setState(s => {
        const currentKSTDay = Math.floor((Date.now() + 9 * 3600000) / 86400000);
        let newAdViews = s.adViewsLeft; let newNextCharge = s.nextAdChargeTime; let newLastReset = s.lastDailyReset;
        if (currentKSTDay > s.lastDailyReset) { newAdViews = 3; newNextCharge = 0; newLastReset = currentKSTDay; } 
        else if (newAdViews < 3 && Date.now() >= newNextCharge && newNextCharge > 0) {
          newAdViews++; newNextCharge = newAdViews < 3 ? Date.now() + 3 * 3600000 : 0;
        }
        const b = checkHunt(Date.now(), currentStats, s);
        const gainPerSec = ((300000 * b.mult * (1 + totalBonusPct / 100)) / 86400) * gainHalvingMult * (s.isAdActive ? 2.0 : 1.0);
        let nUnclaimed = s.unclaimedTime + 1;
        if (nUnclaimed > 43200) nUnclaimed = 43200; 
        return { 
          ...s, pendingGOU: nUnclaimed < 43200 ? s.pendingGOU + gainPerSec : s.pendingGOU, unclaimedTime: nUnclaimed, 
          isAdActive: s.adTimeLeft > 0 ? true : false, adTimeLeft: Math.max(0, s.adTimeLeft - 1),
          adViewsLeft: newAdViews, nextAdChargeTime: newNextCharge, lastDailyReset: newLastReset
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [checkHunt, currentStats, totalBonusPct, gainHalvingMult]);

  const currentHour = new Date().getHours();
  const isHotTime = (currentHour >= 12 && currentHour < 14) || (currentHour >= 18 && currentHour < 20);
  const currentLotterySlot = `${new Date().toDateString()}-${currentHour >= 12 && currentHour < 14 ? 'lunch' : 'dinner'}`;
  const canPlayLottery = isHotTime && state.lastLotterySlot !== currentLotterySlot;

  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.4), rgba(26, 15, 20, 0.6)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <h1 style={{ color: '#fbbf24', fontSize: '32px', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>GOD OF UPGRADE</h1>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px', marginTop: '20px' }}><TonConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="main-wrap" style={{ backgroundImage: `linear-gradient(rgba(5, 8, 12, 0.85), rgba(15, 10, 12, 0.95)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e6d5b8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px', paddingBottom: '90px' }}>
      <style>{`
        * { box-sizing: border-box; font-family: 'Pretendard', sans-serif; }
        .fixed-header { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 850px; background: rgba(15, 20, 28, 0.98); border-bottom: 2px solid #fbbf24; padding: 15px 15px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; box-shadow: 0 5px 20px rgba(0,0,0,0.9); }
        .action-btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 14px; transition: transform 0.05s, opacity 0.2s; }
        .action-btn:active { transform: scale(0.92); } .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .glass-panel { background: rgba(20, 24, 34, 0.85); border: 1px solid rgba(197, 160, 89, 0.4); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
        .img-box-gear { width: 135px; height: 135px; background: rgba(0,0,0,0.9); border: 1px solid rgba(197,160,89,0.5); border-radius: 15px; display: flex; justify-content: center; align-items: center; overflow: hidden; margin: 0 auto 10px auto; position: relative; }
        .img-box-gear img { width: 90%; height: 90%; object-fit: contain; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .big-banner-jackpot { background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(217,119,6,0.15)); border: 1px solid rgba(251,191,36,0.4); border-radius: 15px; padding: 25px; text-align: center; box-shadow: 0 5px 20px rgba(251,191,36,0.1); margin-bottom: 20px; }
        .big-banner-burn { background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.15)); border: 1px solid rgba(239,68,68,0.4); border-radius: 15px; padding: 25px; text-align: center; box-shadow: 0 5px 20px rgba(239,68,68,0.1); margin-bottom: 20px; }
        @media (max-width: 768px) { .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; } }
        @keyframes flashSuccess { 0% { background: rgba(34, 197, 94, 0.3) !important; transition: background 0.15s ease-out; } 100% { background: transparent; } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.3) !important; transition: background 0.15s ease-out; } 100% { background: transparent; } }
        @keyframes lvlUp { 0% { transform: scale(1); color: #fbbf24; } 50% { transform: scale(1.6); color: #fff; } 100% { transform: scale(1); color: #fbbf24; } }
        @keyframes lvlDown { 0% { transform: scale(1); color: #fbbf24; } 50% { transform: scale(0.7); color: #ef4444; } 100% { transform: scale(1); color: #fbbf24; } }
        .anim-success { animation: flashSuccess 0.2s ease-out; } .anim-fail { animation: flashFail 0.2s ease-out; }
        .lvl-up { animation: lvlUp 0.25s ease-out; display: inline-block; } .lvl-down { animation: lvlDown 0.25s ease-out; display: inline-block; }
        /* 하단 네비게이션 5개 버튼 정렬용 */
        .bottom-nav-btn { flex: 1; background: transparent; border: none; display: flex; flexDirection: column; alignItems: center; cursor: pointer; transition: 0.2s; padding: 5px 2px; }
      `}</style>

      {/* 🚨 여기에 userRank={userRankTitle} 가 추가되었습니다! */}
{showLottery && <ScratchLottery userRank={userRankTitle} onReward={(amt) => { setState(s => ({...s, balance: s.balance + amt, lastLotterySlot: currentLotterySlot})); alert("국고 입금 완료!"); }} onClose={() => setShowLottery(false)} />}
      {activeModal && <ArcadeGames type={activeModal} onClose={() => setActiveModal(null)} onReward={(r) => { if(r>0) setState(s=>({...s, balance:s.balance+r})); setActiveModal(null); }} pReward={pReward} gReward={gReward} />}
      
      {canPlayLottery && activeTab === 'home' && (
        <div onClick={() => setShowLottery(true)} style={{ position: 'fixed', top: '75px', left: '50%', transform:'translateX(-50%)', background: 'linear-gradient(45deg, #ffd700, #ff8c00)', color: '#000', padding: '10px 20px', borderRadius: '20px', fontWeight: '900', zIndex: 9000, cursor: 'pointer', boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)', animation: 'pulse 1.5s infinite', border:'2px solid #fff' }}>
          🎟️ 점심/저녁 핫타임 복권 긁기!
        </div>
      )}

      <div className="fixed-header">
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold' }}>{state.walletAddress || "지갑 연결됨"}</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
            <span style={{color: userRankTitle.includes('GOD') ? '#fbbf24' : '#06b6d4'}}>[{userRankTitle}]</span> {state.userName}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right', minWidth: '60px' }}>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.8)' }}>{Math.floor(state.balance).toLocaleString()}</span>
            <span style={{ fontSize: '10px', color: '#c5a059', marginLeft: '2px' }}>GOU</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '10px', flex: 1 }}>
        
        {/* 1️⃣ 홈 탭 */}
        {activeTab === 'home' && (
          <div style={{ marginTop: canPlayLottery ? '40px' : '0' }}>
            <div className="big-banner-jackpot">
              <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>🏆 이번 주 시즌 잭팟 보상금</div>
              <div style={{ color: '#fff', fontWeight: '900', fontSize: '38px', textShadow: '0 0 15px rgba(251,191,36,0.8)' }}>{state.jackpot.toLocaleString()} <span style={{fontSize:'16px', color:'#fbbf24'}}>GOU</span></div>
            </div>

            <div className="big-banner-burn">
              <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>🔥 서버 총 소각량 (반감기 게이지)</div>
              <div style={{ color: '#fff', fontWeight: '900', fontSize: '32px', textShadow: '0 0 15px rgba(239,68,68,0.8)' }}>{state.burned.toLocaleString()} <span style={{fontSize:'16px', color:'#ef4444'}}>GOU</span></div>
              <div style={{ color: '#ffbaba', fontSize: '12px', marginTop: '10px' }}>{isPhase2 ? '🚨 2차 반감기 가동 중 (비용 50%↓)' : isPhase1 ? '⚠️ 1차 반감기 가동 중 (수익 50%↓)' : '🟢 기본 페이즈 진행 중'}</div>
            </div>

            <div style={{ display: 'flex', gap: '15px', width: '100%', marginBottom: '20px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
              <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', border: '2px solid #06b6d4' }}>
                <h3 style={{color:'#06b6d4', margin:'0 0 10px 0', textAlign:'center', fontSize:'18px'}}>🌱 자산 획득 및 효율</h3>
                <div style={{ background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                    <div style={{ color: '#ccc', fontSize: '11px' }}>일일 자동 채굴량</div>
                    <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '28px', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>+{dailyGainDisplay.toLocaleString()}</div>
                    <button onClick={watchBuffAd} style={{ background: state.isAdActive ? 'rgba(16,185,129,0.8)' : 'transparent', color: state.isAdActive ? '#fff' : '#10b981', border: '1px solid #10b981', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer', width: '100%' }}>
                      {state.isAdActive ? `🔥 버프 가동 중 (${Math.floor(state.adTimeLeft/60)}분 남음)` : Date.now() < state.nextBuffAdTime ? `⏳ 쿨타임 (${formatTimeStr(state.nextBuffAdTime)})` : "📺 광고: 1시간 채굴량 2배"}
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                    <span style={{ color: '#06b6d4' }}>미수확: +{Math.floor(state.pendingGOU).toLocaleString()} GOU</span>
                    <span style={{ color: state.unclaimedTime >= 43200 ? '#ef4444' : '#e6d5b8' }}>{state.unclaimedTime >= 43200 ? "MAX" : `${Math.floor(state.unclaimedTime/3600)}h ${Math.floor((state.unclaimedTime%3600)/60)}m`}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}><div style={{ width: `${(state.unclaimedTime/43200)*100}%`, height: '100%', background: state.unclaimedTime >= 43200 ? '#ef4444' : '#06b6d4' }}></div></div>
                  <button className={`action-btn ${anims['claim'] ? `anim-${anims['claim']}` : ''}`} onClick={claimGOU} style={{ width: '100%', background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: '#000', padding: '15px 0', fontSize: '18px', fontWeight: '900', boxShadow: '0 4px 15px rgba(217,119,6,0.4)', borderRadius:'10px' }}>🚀 GOU 획득하기</button>
                </div>
              </div>

              <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', border: '2px solid #10b981' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h3 style={{color:'#10b981', margin:0, fontSize:'18px'}}>🎰 아케이드 게임장</h3>
                  <button onClick={() => setShowGuide(true)} style={{ background: 'transparent', color: '#ccc', border: '1px solid #555', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>ℹ️ 가이드</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '10px', border:'1px solid #333' }}>
                  <div style={{textAlign:'center', flex:1}}><div style={{fontSize:'11px', color:'#aaa', marginBottom:'4px'}}>보유 티켓</div><div style={{color:'#fbbf24', fontWeight:'bold', fontSize:'18px'}}>🎟️ {state.tickets}장</div></div>
                  <div style={{width:'1px', background:'#333'}}></div>
                  <div style={{textAlign:'center', flex:1}}><div style={{fontSize:'11px', color:'#aaa', marginBottom:'4px'}}>남은 광고</div><div style={{color:'#06b6d4', fontWeight:'bold', fontSize:'18px'}}>📺 {state.adViewsLeft}/3</div></div>
                </div>
                <button onClick={watchAdForTicket} style={{ width:'100%', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', color: '#fff', border:'none', padding:'12px', borderRadius:'10px', fontWeight:'bold', marginBottom:'15px', cursor:'pointer' }}>📺 광고 보고 티켓 충전</button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {['blacksmith', 'tower', 'catch', 'memory'].map(t => (
                    <button key={t} onClick={() => { if(state.tickets<=0)return alert("티켓 부족!"); setState(s=>({...s,tickets:s.tickets-1})); setActiveModal(t); }} className="action-btn" style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid #555', fontSize:'12px', padding:'10px'}}>
                      {t==='blacksmith'?'🔨 망치질':t==='tower'?'🏗️ 블록쌓기':t==='catch'?'📦 상자잡기':'🧠 기억력'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2️⃣ 강화 탭 */}
        {activeTab === 'upgrade' && (
          <div>
            <h3 style={{ color: '#fbbf24', margin: '0 0 10px 5px', fontSize: '16px' }}>🗺️ 점령 영지 현황 (전투력 매칭)</h3>
            <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '12px', paddingBottom: '15px', WebkitOverflowScrolling: 'touch' }}>
              {activeHuntsToRender.map(h => {
                const isActive = !h.isSpecial ? (!currentHuntData.isSpecial && currentHuntData.name === h.name) : true;
                const isUnlocked = h.isSpecial ? true : (currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.reqSum);
                return (
                  <div key={h.name} className={isActive ? 'hunt-active' : ''} style={{ minWidth: '150px', flexShrink: 0, background: h.isSpecial ? 'rgba(147, 51, 234, 0.2)' : 'rgba(15, 18, 25, 0.8)', border: `1px solid ${isActive ? (h.isSpecial ? '#a855f7' : '#fff') : (isUnlocked ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.1)')}`, padding: '12px 10px', borderRadius: '12px', opacity: isUnlocked ? 1 : 0.4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'center' }}>
                      <b style={{ color: isActive ? '#fff' : (isUnlocked ? '#06b6d4' : '#666'), fontSize: '13px' }}>{isActive && !h.isSpecial ? '⚔️ ' : ''}{h.name}</b>
                      <div style={{ color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', marginTop: '5px', fontSize: '12px' }}>수익 X{h.mult}</div>
                    </div>
                    {!h.isSpecial && (
                      <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'rgba(0,0,0,0.6)', padding: '6px', borderRadius: '6px', fontSize: '10px', color: '#ccc', textAlign: 'center' }}>
                          <div>공 <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444', fontWeight:'bold'}}>{h.req.atk}</span></div>
                          <div>체 <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444', fontWeight:'bold'}}>{h.req.hp}</span></div>
                          <div>방 <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444', fontWeight:'bold'}}>{h.req.def}</span></div>
                          <div>명 <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444', fontWeight:'bold'}}>{h.req.acc}</span></div>
                        </div>
                        <div style={{ fontSize: '10px', color: isUnlocked ? '#aaa' : '#666', marginTop: '6px', textAlign: 'center' }}>필요 강화 합: <span style={{color: isUnlocked?'#fff':'#666', fontWeight:'bold'}}>{h.reqSum}강</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 style={{ color: '#fbbf24', margin: '10px 0 10px 5px', fontSize: '16px', borderTop: '1px solid #333', paddingTop: '20px' }}>⚔️ 신화 무기고 (총합: <span style={{color: '#fff'}}>{totalGearLevel}강</span>)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }} className="gears-grid">
              {gears.map(g => (
                <UpgradeCard key={g.id} type="gear" item={{...g, statText: `${g.stat}: ${(g.lvl * g.base).toFixed(1)}${g.unit}`, bonusText: `버프: +${g.lvl * 2}%`, successRateDisplay: getSuccessRate(g.lvl) }} isMax={g.lvl >= 30} cost={getCost(g.lvl)} onUpgrade={handleUpgrade} onAuto={toggleAuto} autoActive={autoUI[g.id]} animClass={lvlAnims[g.id] === 'up' ? 'lvl-up' : lvlAnims[g.id] === 'down' ? 'lvl-down' : ''} boxAnimClass={anims[g.id] === 'success' ? 'anim-success' : anims[g.id] === 'fail' ? 'anim-fail' : ''} />
              ))}
            </div>

            <h3 style={{ color: '#fbbf24', margin: '0 0 10px 5px', fontSize: '16px', borderTop: '1px solid #333', paddingTop: '20px' }}>🐉 신수 및 영지 성장</h3>
            {['pet', 'castle'].map(type => {
              const isPet = type === 'pet'; const isUnlocked = isPet ? isPetUnlocked : isCastleUnlocked; 
              const lvl = isPet ? state.petLevel : state.castleLevel; const isMax = lvl >= 50; 
              const cost = isPet ? getPetCost(lvl) : getCastleCost(lvl);
              const isHunting = (isPet ? state.petHuntEndTime : state.castleHuntEndTime) > Date.now();
              return (
                <UpgradeCard key={type} type={type} 
                  // 🚨 펫 이름 "고대 드래곤" 으로 수정 완료!
                  item={{ id: type, name: isPet ? '고대 드래곤' : '위대한 군주의 성', imgFile: isPet ? 'pet.jpg' : 'castle.jpg', emoji: isPet ? '🐉' : '🏰', lvl: lvl, locked: !isUnlocked, lockMsg: isPet ? '장비 210강 달성 시 개방' : '펫 50강 달성 시 개방', bonusText: `수익 보너스: +${(isPet ? lvl * 3 : lvl * 5) + (isPet ? getPetBonus(lvl) : getCastleBonus(lvl))}%`, successRateDisplay: getSuccessRate(lvl) }} 
                  isMax={isMax} cost={cost} onUpgrade={handleUpgrade} onAuto={toggleAuto} autoActive={autoUI[type]} animClass={lvlAnims[type] === 'up' ? 'lvl-up' : lvlAnims[type] === 'down' ? 'lvl-down' : ''} boxAnimClass={anims[type] === 'success' ? 'anim-success' : anims[type] === 'fail' ? 'anim-fail' : ''}
                  specialHunt={{ isHunting, huntText: isPet ? '🐉 둥지 사냥 (12h)' : '🏰 천공 사냥 (12h)', onStart: () => startSpecialHunt(type) }}
                />
              );
            })}
          </div>
        )}

        {/* 3️⃣ 랭킹 탭 */}
        {activeTab === 'rank' && (
          <div>
            <div className="big-banner-jackpot" style={{ padding: '20px' }}>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>🏆 이번 주 시즌 잭팟 보상금</div>
              <div style={{ color: '#fff', fontWeight: '900', fontSize: '32px', textShadow: '0 0 15px rgba(251,191,36,0.8)' }}>{state.jackpot.toLocaleString()} <span style={{fontSize:'14px', color:'#fbbf24'}}>GOU</span></div>
            </div>

            <div className="glass-panel" style={{ padding: '25px 15px' }}>
              <h2 style={{ textAlign: 'center', color: '#fbbf24', margin: '0 0 25px 0' }}>👑 SERVER RANKING</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6d5b8', fontSize: '14px' }}>
                <thead><tr style={{ borderBottom: '2px solid #fbbf24', color: '#fbbf24' }}><th style={{ padding: '10px', textAlign: 'center' }}>순위</th><th style={{ padding: '10px', textAlign: 'left' }}>사령관명</th><th style={{ padding: '10px', textAlign: 'right' }}>달성 스펙</th></tr></thead>
                <tbody>
                  {rankings.map(r => (
                    <tr key={r.rank} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: r.isMe ? 'rgba(251,191,36,0.15)' : 'transparent' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', textAlign: 'center', fontSize: '16px' }}>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}><span style={{color: r.title.includes('GOD') ? '#fbbf24' : '#06b6d4', fontSize:'11px'}}>[{r.title}]</span><br/>{r.name} {r.isMe ? '⭐' : ''}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', lineHeight: '1.4' }}>
                        {r.c > 0 && <div style={{color:'#fbbf24', fontSize:'13px'}}>🏰 성 {r.c}강</div>}
                        {r.p > 0 && <div style={{color:'#10b981', fontSize:'13px'}}>🐉 펫 {r.p}강</div>}
                        <div style={{color:'#06b6d4', fontSize:'13px'}}>⚔️ 장비 {r.g}강</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 🚨 4️⃣ 신규 탭: 다이렉트 상점 (고래 사냥터) 🚨 */}
        {activeTab === 'shop' && (
          <div className="glass-panel" style={{ padding: '25px 20px', border: '2px solid #06b6d4', background: 'linear-gradient(180deg, rgba(20,24,34,0.9), rgba(6,182,212,0.1))' }}>
            <h2 style={{ textAlign: 'center', color: '#06b6d4', margin: '0 0 15px 0', textShadow: '0 0 10px rgba(6,182,212,0.5)' }}>💎 GOU 다이렉트 상점</h2>
            <p style={{ color: '#ccc', fontSize: '13px', textAlign: 'center', marginBottom: '25px', lineHeight: '1.5' }}>
              DEX의 악랄한 슬리피지와 봇들의 사재기를 피하십시오!<br/>
              <span style={{color:'#fbbf24', fontWeight:'bold'}}>진짜 사령관님들께만 고정 교환비로 국고에서 즉시 GOU를 보급합니다.</span>
            </p>

            {[
              { ton: 1, gou: 10000000, bonus: null },
              { ton: 5, gou: 55000000, bonus: '10% BONUS' },
              { ton: 10, gou: 120000000, bonus: '20% BONUS' }
            ].map((pkg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.6)', padding: '15px 20px', borderRadius: '12px', marginBottom: '15px', border: pkg.bonus ? '1px solid #fbbf24' : '1px solid #333', boxShadow: pkg.bonus ? '0 0 15px rgba(251,191,36,0.2)' : 'none' }}>
                <div>
                  <div style={{ color: '#06b6d4', fontWeight: '900', fontSize: '20px' }}>{pkg.ton} TON</div>
                  <div style={{ color: '#fff', fontSize: '13px', marginTop: '4px' }}>= {pkg.gou.toLocaleString()} GOU</div>
                  {pkg.bonus && <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '900', marginTop: '6px', background: 'rgba(251,191,36,0.2)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>🔥 {pkg.bonus}</div>}
                </div>
                <button onClick={() => handleBuyGOU(pkg.ton, pkg.gou)} className="action-btn" style={{ background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', color: '#fff', maxWidth: '110px', fontSize: '15px', padding: '12px 0', boxShadow: '0 4px 15px rgba(6,182,212,0.4)' }}>
                  TON 결제
                </button>
              </div>
            ))}
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#666', marginTop: '20px' }}>
              결제 즉시 사령관님의 계정(GOU 국고)으로 전송됩니다.<br/>블록체인 네트워크 상황에 따라 약 10~30초 소요될 수 있습니다.
            </div>
          </div>
        )}

        {/* 5️⃣ 설정 탭 */}
        {activeTab === 'setting' && (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', marginBottom: '25px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', padding: '5px' }}>
              <button onClick={() => setSettingTab('my')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: settingTab === 'my' ? '#06b6d4' : 'transparent', color: settingTab === 'my' ? '#fff' : '#888', fontWeight: 'bold', fontSize: '13px', transition: '0.2s' }}>👤 내 정보 (MY)</button>
              <button onClick={() => setSettingTab('friend')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: settingTab === 'friend' ? '#a855f7' : 'transparent', color: settingTab === 'friend' ? '#fff' : '#888', fontWeight: 'bold', fontSize: '13px', transition: '0.2s' }}>🤝 친구초대 퀘스트</button>
            </div>

            {settingTab === 'my' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button onClick={handleTitleEdit} className="action-btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #555' }}>🛡️ 나만의 GOD 칭호 변경 (성 50강 필요)</button>
                <button onClick={testPushNotification} className="action-btn" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6' }}>🔔 텔레그램 알림 시스템 테스트</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setActiveTab('shop')} className="action-btn" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid #22c55e' }}>📥 GOU 다이렉트 구매</button>
                  <button onClick={withdrawGOU} className="action-btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444' }}>📤 GOU 국고 출금 (140강 필요)</button>
                </div>
              </div>
            )}

            {settingTab === 'friend' && (
              <div>
                <button onClick={() => alert("초대 링크가 복사되었습니다!\n(백엔드 봇 시스템 연결 시 실제 링크가 생성됩니다.)")} style={{ width: '100%', padding: '15px', background: 'linear-gradient(90deg, #a855f7, #7e22ce)', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', border: 'none', marginBottom: '20px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(168,85,247,0.4)' }}>
                  🔗 초대 링크 복사하기<br/><span style={{fontSize:'12px', fontWeight:'normal'}}>(접속만 해도 나와 친구 모두 50만 GOU)</span>
                </button>
                
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #333' }}>
                  <h4 style={{ color: '#fbbf24', margin: '0 0 10px 0', fontSize: '14px' }}>🔥 기사(210강) 달성 친구 초대 현황</h4>
                  <div style={{ color: '#fff', fontWeight: '900', fontSize: '24px', textAlign: 'center', marginBottom: '5px' }}>{validInvites} / 10 명</div>
                  <div style={{ textAlign: 'center', color: '#a855f7', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>다음 목표 달성 시: 2,000만 GOU 지급!</div>
                  <div style={{ width: '100%', height: '10px', background: '#222', borderRadius: '5px', overflow: 'hidden' }}><div style={{ width: `${(validInvites/10)*100}%`, height: '100%', background: 'linear-gradient(90deg, #fbbf24, #d97706)' }}></div></div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '10px', border: '1px solid #333' }}>
                  <h4 style={{ color: '#06b6d4', margin: '0 0 10px 0', fontSize: '14px' }}>🤝 내 친구 육성 현황</h4>
                  <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '15px' }}>친구 펫 50강 시 <b style={{color:'#10b981'}}>1억</b> / 성 50강 시 <b style={{color:'#fbbf24'}}>10억</b> 자동 지급!</div>
                  {invitedFriends.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>{f.name}</div>
                        <div style={{ color: f.rank === '기사' ? '#06b6d4' : '#666', fontSize: '11px' }}>[{f.rank}]</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', color: '#ccc' }}>
                        <div>🐉 펫: <span style={{color: f.petLvl>=50 ? '#10b981' : '#fff'}}>{f.petLvl}</span>강</div>
                        <div>🏰 성: <span style={{color: f.castleLvl>=50 ? '#fbbf24' : '#fff'}}>{f.castleLvl}</span>강</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🚨 5버튼 체제 하단 네비게이션 */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '850px', background: 'rgba(15, 20, 28, 0.98)', borderTop: '2px solid #333', display: 'flex', justifyContent: 'space-around', padding: '10px 2px 20px 2px', zIndex: 9999, boxShadow: '0 -5px 20px rgba(0,0,0,0.8)' }}>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('home')} style={{ color: activeTab === 'home' ? '#06b6d4' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'home' ? 'drop-shadow(0 0 5px rgba(6,182,212,0.5))' : 'none', transform: activeTab === 'home' ? 'scale(1.15)' : 'scale(1)' }}>🏠</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>홈(수확)</span>
        </button>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('upgrade')} style={{ color: activeTab === 'upgrade' ? '#ef4444' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'upgrade' ? 'drop-shadow(0 0 5px rgba(239,68,68,0.5))' : 'none', transform: activeTab === 'upgrade' ? 'scale(1.15)' : 'scale(1)' }}>⚔️</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>강화</span>
        </button>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('shop')} style={{ color: activeTab === 'shop' ? '#3b82f6' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'shop' ? 'drop-shadow(0 0 5px rgba(59,130,246,0.5))' : 'none', transform: activeTab === 'shop' ? 'scale(1.15)' : 'scale(1)' }}>💎</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>상점</span>
        </button>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('rank')} style={{ color: activeTab === 'rank' ? '#fbbf24' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'rank' ? 'drop-shadow(0 0 5px rgba(251,191,36,0.5))' : 'none', transform: activeTab === 'rank' ? 'scale(1.15)' : 'scale(1)' }}>🏆</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>랭킹</span>
        </button>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('setting')} style={{ color: activeTab === 'setting' ? '#a855f7' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'setting' ? 'drop-shadow(0 0 5px rgba(168,85,247,0.5))' : 'none', transform: activeTab === 'setting' ? 'scale(1.15)' : 'scale(1)' }}>⚙️</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>시스템</span>
        </button>
      </div>
    </div>
  );
}