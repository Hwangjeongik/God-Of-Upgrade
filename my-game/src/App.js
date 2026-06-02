import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { app } from './firebase'; 

const MAX_SUPPLY = 10000000000000; 

// 🚀 통합 미니게임 아케이드 엔진 V4.5 (터치 딜레이 0ms 패치 & 밸런스 조정)
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
      let speed = type === 'blacksmith' ? 0.26 : 0.18 + (stacked * 0.04); 
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

  // 📦 상자 잡기 (터치 딜레이 해결 & 아주 조금 느리게: 0.5초 노출 / 0.15초 텀)
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
           }, 400); 
           return;
        }
        const id = catchSpawnRef.current;
        const newTarget = { id, top: Math.random()*60 + 10 + '%', left: Math.random()*70 + 10 + '%' };
        setTargets([newTarget]); 
        catchSpawnRef.current++;
        
        setTimeout(() => {
          setTargets(prev => prev.filter(t => t.id !== id));
          setTimeout(spawnNext, 150); // 0.15초 텀
        }, 500); // 0.5초 노출
      };
      setTimeout(spawnNext, 400); 
    }
  }, [type, status]);

  // 🧠 기억력 테스트 (더 빠르게: 0.1초 노출 / 0.2초 텀 -> 총 0.3초 주기)
  useEffect(() => {
    if(type === 'memory' && status === 'playing') {
      const seq = [Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4)];
      setMemSeq(seq);
      setUserSeq([]);
      let i = 0;
      const interval = setInterval(() => {
        if(i < seq.length) {
          setFlashIdx(seq[i]);
          setTimeout(() => setFlashIdx(-1), 100); 
          i++;
        } else {
          clearInterval(interval);
        }
      }, 300); 
      return () => clearInterval(interval);
    }
  }, [type, status]);

  // 🚨 0ms 즉발 터치 액션 (onPointerDown)
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
              {/* 🚨 onPointerDown을 사용해 터치 딜레이 0ms 실현 */}
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

// ✂️ 🚨 100% 버그 픽스 완료된 업그레이드 카드 컴포넌트
const UpgradeCard = ({ item, type, isMax, cost, onUpgrade, onAuto, autoActive, animClass, boxAnimClass, specialHunt }) => (
  <div className={`glass-panel ${boxAnimClass}`} style={{ padding: '15px', display: 'flex', flexDirection: type === 'gear' ? 'column' : 'row', alignItems: 'center', gap: type === 'gear' ? '0' : '25px', marginBottom: type === 'gear' ? 0 : '15px', borderTop: type === 'gear' ? '4px solid rgba(197,160,89,0.8)' : 'none', position:'relative', overflow:'hidden' }}>
    {item.locked && (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px', padding: '10px 20px', border: '1px solid #fbbf24', borderRadius: '6px', background: 'rgba(0,0,0,0.9)' }}>🔒 {item.lockMsg}</div>
      </div>
    )}
    <div className="img-box-gear" style={type !== 'gear' ? { width: '110px', height: '110px', margin: '0' } : {}}>
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
        확률: <span style={{color: isMax ? '#fbbf24' : '#06b6d4', fontWeight: 'bold'}}>{isMax ? 'MAX' : `80.0%`}</span><br/>
        비용: <span style={{color: '#fbbf24', fontWeight: 'bold'}}>{isMax ? 'MAX' : `${cost.toLocaleString()}${type !== 'gear' ? ' GOU' : ''}`}</span>
      </div>
      
      <div style={{ display: 'flex', width: '100%', gap: '6px', marginTop: '12px' }}>
        {/* 🚨 type 변수 정확하게 전달! */}
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

export default function App() {
  const hunts = useMemo(() => [
    {name: '초원 영지', mult: 1, reqSum: 0, req: {atk:0, hp:0, def:0, acc:0}},
    {name: '신의 숲', mult: 1.5, reqSum: 35, req: {atk:50, hp:500, def:25, acc:10}},
    {name: '불멸 사막', mult: 2.5, reqSum: 70, req: {atk:100, hp:1000, def:50, acc:20}},
    {name: '심연 정글', mult: 5, reqSum: 110, req: {atk:170, hp:1700, def:75, acc:34}},
    {name: '황혼 화산', mult: 12, reqSum: 150, req: {atk:230, hp:2300, def:115, acc:46}}
  ], []);

  const [state, setState] = useState({ 
    screen: 'wallet', walletAddress: '', balance: 1000000000, burned: 0, jackpot: 50000000, 
    pendingGOU: 0, unclaimedTime: 0, userName: "사령관", userTitle: "전설의 기사", isRankingOpen: false,
    petLevel: 0, castleLevel: 0, petHuntEndTime: 0, castleHuntEndTime: 0, isAdActive: false, adTimeLeft: 0,
    tickets: 5, adViewsLeft: 5 
  });

  const lockRef = useRef({}); 
  const autoActiveRef = useRef({}); 
  const levelsRef = useRef({}); 
  const [autoUI, setAutoUI] = useState({});
  const [lvlAnims, setLvlAnims] = useState({}); 
  const [anims, setAnims] = useState({});
  const [activeModal, setActiveModal] = useState(null); 
  const [showGuide, setShowGuide] = useState(false); 

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
  const latestUpgradeRef = useRef();

  useEffect(() => {
    gears.forEach(g => levelsRef.current[g.id] = g.lvl);
    levelsRef.current['pet'] = state.petLevel;
    levelsRef.current['castle'] = state.castleLevel;
    levelsRef.current['balance'] = state.balance;
    levelsRef.current['necklace'] = gears.find(g => g.id === 'necklace')?.lvl || 0;
  });

  const triggerAnim = useCallback((id, type) => { setAnims(p => ({ ...p, [id]: type })); setTimeout(() => setAnims(p => ({ ...p, [id]: null })), 250); }, []);
  const triggerLvlAnim = useCallback((id, type) => { setLvlAnims(p => ({ ...p, [id]: type })); setTimeout(() => setLvlAnims(p => ({ ...p, [id]: null })), 200); }, []);

  const totalGearLevel = gears.reduce((a, b) => a + b.lvl, 0); 
  const minLvl = Math.min(...gears.map(g => g.lvl));
  const setBonus = minLvl >= 30 ? 500 : minLvl >= 20 ? 200 : minLvl >= 10 ? 100 : 0;
  const isPetUnlocked = totalGearLevel >= 210;
  const isCastleUnlocked = state.petLevel >= 50;

  const mockRankings = useMemo(() => [
    { rank: 1, name: "KOREA", title: "LEGENDARY GOD", power: "999,999" },
    { rank: 2, name: "UPGRADE", title: "KING OF LUCK", power: "850,200" },
    { rank: 3, name: "CHAMPION", title: "IRON KNIGHT", power: "720,500" },
    { rank: 4, name: state.userName, title: state.userTitle, power: totalGearLevel, isMe: true }
  ], [state.userName, state.userTitle, totalGearLevel]);

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

  const checkHunt = useCallback((now, stats, huntState) => {
    if (huntState.castleHuntEndTime > now) return { name: '🏰 제국의 심장 (특수)', mult: 50, isSpecial: true };
    if (huntState.petHuntEndTime > now) return { name: '🐉 신수의 둥지 (특수)', mult: 30, isSpecial: true };
    return hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.reqSum) || hunts[0];
  }, [hunts]);

  const currentHuntData = checkHunt(Date.now(), currentStats, state);
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * gainHalvingMult * (state.isAdActive ? 2.0 : 1.0));

  useEffect(() => {
    if (wallet) setState(s => ({ ...s, walletAddress: wallet.account.address.substring(0, 6) + '...' + wallet.account.address.substring(wallet.account.address.length - 4), screen: 'game' }));
    else setState(s => ({ ...s, screen: 'wallet' }));
  }, [wallet]);

  const getUserId = () => window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? String(window.Telegram.WebApp.initDataUnsafe.user.id) : "test_commander_123";

  const resetAndSyncDB = async () => {
    if (!window.confirm("서버 데이터를 완전히 초기화하시겠습니까?")) return;
    try {
      const res = await httpsCallable(getFunctions(app), 'resetAccount')({ userId: getUserId() });
      if (res.data.success) {
        const d = res.data.data;
        setState(s => ({ ...s, balance: d.balance, petLevel: d.petLevel, castleLevel: d.castleLevel, burned: 0, tickets: 5, adViewsLeft: 5 }));
        setGears(p => p.map(g => { const found = d.gears.find(x => x.id === g.id); return found ? { ...g, lvl: found.lvl } : g; }));
        alert("초기화 성공!");
      }
    } catch (e) { alert("동기화 실패: " + e.message); }
  };

  const withdrawGOU = async () => {
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

  // 🚨 강화 로직 (매개변수 버그 완벽 수정)
  const handleUpgrade = async (type, id = null) => {
    const key = id || type;
    if (lockRef.current[key]) return; 
    let cost = calculateCost(levelsRef.current[key], type, levelsRef.current['necklace']);
    let currentLvl = levelsRef.current[key];
    if (currentLvl >= (type === 'gear' ? 30 : 50)) return;
    if (levelsRef.current['balance'] < cost) return alert("GOU 부족");

    lockRef.current[key] = true;
    setTimeout(() => { lockRef.current[key] = false; }, 150);

    const isSuccess = Math.random() < 0.8;
    let nextLvl = isSuccess ? currentLvl + 1 : (currentLvl <= 5 || currentLvl === 10 || currentLvl === 20 ? currentLvl : currentLvl - 1);

    setState(s => ({ ...s, balance: s.balance - cost }));
    if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: nextLvl } : g));
    else if (type === 'pet') setState(s => ({ ...s, petLevel: nextLvl }));
    else if (type === 'castle') setState(s => ({ ...s, castleLevel: nextLvl }));
    
    triggerLvlAnim(key, isSuccess ? 'up' : 'down');
    triggerAnim(key, isSuccess ? 'success' : 'fail');

    httpsCallable(getFunctions(app), 'upgradeItem')({ userId: getUserId(), type, id }).then(res => {
        if(res.data.newLevel !== undefined && res.data.newLevel !== nextLvl) {
            if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: res.data.newLevel } : g));
            else if (type === 'pet') setState(s => ({ ...s, petLevel: res.data.newLevel }));
            else if (type === 'castle') setState(s => ({ ...s, castleLevel: res.data.newLevel }));
        }
    }).catch(e => console.log(e));
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
    let successCost = 0; let failCost = 0;

    const runSimulator = async () => {
      while (autoActiveRef.current[key]) {
        let simLvl = levelsRef.current[key];
        let simBalance = levelsRef.current['balance'];
        if (simLvl >= target || simLvl >= maxLimit) { alert(`목표 달성!`); break; }

        let cost = calculateCost(simLvl, type, levelsRef.current['necklace']);
        if (simBalance < cost) { alert(`잔고 부족!`); break; }

        simBalance -= cost;
        const isSuccess = Math.random() < 0.8;
        if (isSuccess) { simLvl++; successCost += cost; } else { failCost += cost; if (simLvl > 5 && simLvl !== 10 && simLvl !== 20) simLvl--; }

        setState(s => ({ ...s, balance: simBalance }));
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: simLvl } : g));
        else if (type === 'pet') setState(s => ({ ...s, petLevel: simLvl }));
        else if (type === 'castle') setState(s => ({ ...s, castleLevel: simLvl }));
        
        triggerLvlAnim(key, isSuccess ? 'up' : 'down');
        triggerAnim(key, isSuccess ? 'success' : 'fail'); 
        await new Promise(r => setTimeout(r, 400)); 
      }

      autoActiveRef.current[key] = false;
      setAutoUI(p => ({ ...p, [key]: false }));

      if (successCost > 0 || failCost > 0) {
          httpsCallable(getFunctions(app), 'syncAutoUpgrade')({ userId: getUserId(), type, id, finalLevel: levelsRef.current[key], successCost, failCost }).catch(e => console.log(e));
      }
    };
    runSimulator();
  };

  useEffect(() => {
    if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }
    const timer = setInterval(() => {
      setState(s => {
        const b = checkHunt(Date.now(), currentStats, s);
        const gainPerSec = ((300000 * b.mult * (1 + totalBonusPct / 100)) / 86400) * gainHalvingMult * (s.isAdActive ? 2.0 : 1.0);
        let nUnclaimed = s.unclaimedTime + 1;
        if (nUnclaimed > 43200) { nUnclaimed = 43200; return { ...s, unclaimedTime: nUnclaimed, isAdActive: s.adTimeLeft > 0 ? true : false, adTimeLeft: Math.max(0, s.adTimeLeft - 1) }; }
        return { ...s, pendingGOU: s.pendingGOU + gainPerSec, unclaimedTime: nUnclaimed, isAdActive: s.adTimeLeft > 0 ? true : false, adTimeLeft: Math.max(0, s.adTimeLeft - 1) };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [checkHunt, currentStats, totalBonusPct, gainHalvingMult]);

  if (state.screen === 'wallet') {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.4), rgba(26, 15, 20, 0.6)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e6d5b8' }}>
        <h1 style={{ color: '#fbbf24', fontSize: '32px', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>GOD OF UPGRADE</h1>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '15px', marginTop: '20px' }}><TonConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="main-wrap" style={{ backgroundImage: `linear-gradient(rgba(5, 8, 12, 0.85), rgba(15, 10, 12, 0.95)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e6d5b8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '85px' }}>
      <style>{`
        * { box-sizing: border-box; font-family: 'Pretendard', sans-serif; }
        .fixed-header { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 850px; background: rgba(15, 20, 28, 0.98); border-bottom: 2px solid #fbbf24; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; box-shadow: 0 5px 20px rgba(0,0,0,0.9); }
        @keyframes flashSuccess { 0% { background: rgba(34, 197, 94, 0.3) !important; transition: background 0.15s ease-out; } 100% { background: transparent; } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.3) !important; transition: background 0.15s ease-out; } 100% { background: transparent; } }
        @keyframes lvlUp { 0% { transform: scale(1); color: #fbbf24; } 50% { transform: scale(1.6); color: #fff; } 100% { transform: scale(1); color: #fbbf24; } }
        @keyframes lvlDown { 0% { transform: scale(1); color: #fbbf24; } 50% { transform: scale(0.7); color: #ef4444; } 100% { transform: scale(1); color: #fbbf24; } }
        .anim-success { animation: flashSuccess 0.2s ease-out; } .anim-fail { animation: flashFail 0.2s ease-out; }
        .lvl-up { animation: lvlUp 0.25s ease-out; display: inline-block; } .lvl-down { animation: lvlDown 0.25s ease-out; display: inline-block; }
        .action-btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 14px; transition: transform 0.05s, opacity 0.2s; }
        .action-btn:active { transform: scale(0.92); } .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .glass-panel { background: rgba(20, 24, 34, 0.85); border: 1px solid rgba(197, 160, 89, 0.4); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
        .img-box-gear { width: 100px; height: 100px; background: rgba(0,0,0,0.9); border: 1px solid rgba(197,160,89,0.5); border-radius: 15px; display: flex; justify-content: center; align-items: center; overflow: hidden; margin: 0 auto 10px auto; position: relative; }
        .img-box-gear img { width: 90%; height: 90%; object-fit: contain; }
        @media (max-width: 768px) { .grid-hunts, .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; } }
      `}</style>

      {activeModal && <ArcadeGames type={activeModal} onClose={() => setActiveModal(null)} onReward={(r) => { if(r>0) setState(s=>({...s, balance:s.balance+r})); setActiveModal(null); }} pReward={pReward} gReward={gReward} />}
      
      {showGuide && (
        <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.95)', zIndex: 40000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'rgba(20,20,25,0.98)', border: '2px solid #06b6d4', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', color: '#06b6d4', marginBottom: '20px' }}>🎮 아케이드 플레이 가이드</h2>
            <div style={{ color: '#e6d5b8', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
              <h4 style={{ color: '#fbbf24', marginBottom: '5px' }}>🔨 대장장이 망치질</h4><p style={{ margin: '0 0 10px 0' }}><span style={{color:'#10b981'}}>PERFECT: 정중앙</span> | <span style={{color:'#fbbf24'}}>GOOD: 노란색 영역</span></p>
              <h4 style={{ color: '#fbbf24', marginBottom: '5px' }}>🏗️ 올림포스 블록 쌓기</h4><p style={{ margin: '0 0 10px 0' }}>첫 블록은 프리패스! 2,3층은 1층에 맞춰 정확히 쌓으세요.<br/><span style={{color:'#10b981'}}>PERFECT: 3층 완성</span> | <span style={{color:'#fbbf24'}}>GOOD: 2층 완성</span></p>
              <h4 style={{ color: '#fbbf24', marginBottom: '5px' }}>📦 보물 상자 잡기</h4><p style={{ margin: '0 0 10px 0' }}>0.5초 만에 사라지는 상자 5개를 모두 터치하세요!<br/><span style={{color:'#10b981'}}>PERFECT: 5개 적중</span> | <span style={{color:'#fbbf24'}}>GOOD: 3~4개 적중</span></p>
              <h4 style={{ color: '#fbbf24', marginBottom: '5px' }}>🧠 기억력 테스트</h4><p style={{ margin: '0 0 10px 0' }}>0.1초씩 번쩍이는 패턴 5개를 암기하고 똑같이 터치하세요!<br/><span style={{color:'#10b981'}}>PERFECT: 5연속 성공</span> | <span style={{color:'#fbbf24'}}>GOOD: 3~4연속 성공</span></p>
            </div>
            <h3 style={{ color: '#fbbf24', fontSize: '15px', marginBottom: '10px', textAlign: 'center', borderTop: '1px solid #444', paddingTop: '15px' }}>📈 스펙 티어별 보상 안내</h3>
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '15px 10px', fontSize: '12px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🌱 장비 210 미만</span><span style={{fontWeight:'bold'}}>P: 100만 / G: 20만</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>⚔️ 장비 210 이상</span><span style={{color:'#06b6d4', fontWeight:'bold'}}>P: 1,000만 / G: 200만</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🐉 펫 50강 이상</span><span style={{color:'#a855f7', fontWeight:'bold'}}>P: 1억 / G: 2,000만</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🏰 성 50강 이상</span><span style={{color:'#fbbf24', fontWeight:'bold'}}>P: 10억 / G: 2억</span></div>
            </div>
            <button onClick={() => setShowGuide(false)} style={{ width: '100%', background: '#333', color: '#fff', border: 'none', padding: '15px', borderRadius: '10px', marginTop: '20px', fontWeight: 'bold', cursor: 'pointer' }}>확인 완료</button>
          </div>
        </div>
      )}

      <div className="fixed-header">
        <div>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold' }}>{state.walletAddress || "지갑 연결됨"}</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>[{state.userTitle}] {state.userName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right', marginRight: '5px' }}>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.8)' }}>{Math.floor(state.balance).toLocaleString()}</span>
            <span style={{ fontSize: '12px', color: '#c5a059', marginLeft: '4px' }}>GOU</span>
          </div>
          <button onClick={resetAndSyncDB} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>🔄 리셋</button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '10px 10px 80px 10px' }}>
        
        {/* 🚨 V4.5 자산 획득 및 🌟보너스 통합 UI 🚨 */}
        <div style={{ display: 'flex', gap: '15px', width: '100%', marginBottom: '20px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
          <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', border: '2px solid #06b6d4' }}>
            <h3 style={{color:'#06b6d4', margin:'0 0 10px 0', textAlign:'center', fontSize:'18px'}}>🌱 자산 획득 및 효율</h3>
            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              
              <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <div style={{ color: '#ccc', fontSize: '11px' }}>일일 자동 채굴량</div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '20px' }}>+{dailyGainDisplay.toLocaleString()} GOU</div>
                <button onClick={() => { if(state.adViewsLeft>0){ setState(s=>({...s, isAdActive:true, adTimeLeft:3600})); alert("2배 획득 시작!"); } }} style={{ background: state.isAdActive ? 'rgba(16,185,129,0.8)' : 'transparent', color: state.isAdActive ? '#fff' : '#10b981', border: '1px solid #10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', marginTop: '5px', cursor: 'pointer' }}>
                  {state.isAdActive ? `버프 중 (${Math.floor(state.adTimeLeft/60)}분 남음)` : "📺 광고: 1시간 2배"}
                </button>
              </div>

              {/* ✨ 사령관 오더: 획득량 상세(보너스 % 내역) UI 복구 완벽 적용 ✨ */}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px', marginBottom: '15px', fontSize: '11px' }}>
                 <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>🌟 통합 보너스: +{totalBonusPct}%</div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc' }}>
                   <span>⚔️ 장비: <span style={{color: '#fff'}}>+{gearGainBonus + setBonus}%</span></span>
                   <span>🐉 펫: <span style={{color: '#fff'}}>+{petGainBonus + petMilestone}%</span></span>
                   <span>🏰 성: <span style={{color: '#fff'}}>+{castleGainBonus + castleMilestone}%</span></span>
                 </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                <span style={{ color: '#06b6d4' }}>미수확: +{Math.floor(state.pendingGOU).toLocaleString()} GOU</span>
                <span style={{ color: state.unclaimedTime >= 43200 ? '#ef4444' : '#e6d5b8' }}>{state.unclaimedTime >= 43200 ? "MAX" : `${Math.floor(state.unclaimedTime/3600)}h ${Math.floor((state.unclaimedTime%3600)/60)}m`}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
                <div style={{ width: `${(state.unclaimedTime/43200)*100}%`, height: '100%', background: state.unclaimedTime >= 43200 ? '#ef4444' : '#06b6d4' }}></div>
              </div>
              <button className={`action-btn ${anims['claim'] ? `anim-${anims['claim']}` : ''}`} onClick={claimGOU} style={{ width: '100%', background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: '#000', padding: '15px 0', fontSize: '18px', fontWeight: '900', boxShadow: '0 4px 15px rgba(217,119,6,0.4)', borderRadius:'10px' }}>🚀 GOU 획득하기</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button className="action-btn" onClick={() => alert('입금 준비 중')} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', fontSize:'12px' }}>📥 입금</button>
              <button className="action-btn" onClick={withdrawGOU} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', fontSize:'12px' }}>📤 출금 (5% 소각)</button>
            </div>
          </div>

          <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', border: '2px solid #10b981' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3 style={{color:'#10b981', margin:0, fontSize:'18px'}}>🎰 아케이드 게임장</h3>
              <button onClick={() => setShowGuide(true)} style={{ background: 'transparent', color: '#ccc', border: '1px solid #555', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>ℹ️ 게임 가이드</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '10px', border:'1px solid #333' }}>
              <div style={{textAlign:'center', flex:1}}>
                <div style={{fontSize:'11px', color:'#aaa', marginBottom:'4px'}}>보유 티켓</div>
                <div style={{color:'#fbbf24', fontWeight:'bold', fontSize:'18px'}}>🎟️ {state.tickets}개</div>
              </div>
              <div style={{width:'1px', background:'#333'}}></div>
              <div style={{textAlign:'center', flex:1}}>
                <div style={{fontSize:'11px', color:'#aaa', marginBottom:'4px'}}>남은 광고</div>
                <div style={{color:'#06b6d4', fontWeight:'bold', fontSize:'18px'}}>📺 {state.adViewsLeft}회</div>
              </div>
            </div>
            <button onClick={() => { if(state.adViewsLeft<=0)return alert("광고 소진!"); setState(s=>({...s,tickets:s.tickets+1,adViewsLeft:s.adViewsLeft-1})); alert("티켓 획득!"); }} style={{ width:'100%', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', color: '#fff', border:'none', padding:'12px', borderRadius:'10px', fontWeight:'bold', marginBottom:'15px', cursor:'pointer' }}>📺 광고 보고 티켓 받기</button>
            <div style={{ fontSize: '11px', color: '#fbbf24', textAlign: 'center', marginBottom: '10px', fontWeight:'bold' }}>👇 테스트 접속 (티켓 1장 소모) 👇</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex:1 }}>
              <button onClick={() => { if(state.tickets<=0)return alert("티켓 부족!"); setState(s=>({...s,tickets:s.tickets-1})); setActiveModal('blacksmith'); }} className="action-btn" style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid #555', fontSize:'12px', padding:'10px'}}>🔨 망치질</button>
              <button onClick={() => { if(state.tickets<=0)return alert("티켓 부족!"); setState(s=>({...s,tickets:s.tickets-1})); setActiveModal('tower'); }} className="action-btn" style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid #555', fontSize:'12px', padding:'10px'}}>🏗️ 블록쌓기</button>
              <button onClick={() => { if(state.tickets<=0)return alert("티켓 부족!"); setState(s=>({...s,tickets:s.tickets-1})); setActiveModal('catch'); }} className="action-btn" style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid #555', fontSize:'12px', padding:'10px'}}>📦 상자잡기</button>
              <button onClick={() => { if(state.tickets<=0)return alert("티켓 부족!"); setState(s=>({...s,tickets:s.tickets-1})); setActiveModal('memory'); }} className="action-btn" style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid #555', fontSize:'12px', padding:'10px'}}>🧠 기억력테스트</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
          <div className="glass-panel" style={{ flex: 1, padding: '15px', margin: 0, border: '1px solid rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '11px' }}>🔥 총 소각량 (Burned)</div>{isPhase2 ? <span style={{fontSize:'10px', color:'#ef4444', border:'1px solid #ef4444', padding:'2px 4px', borderRadius:'4px'}}>2차 반감기 가동중</span> : isPhase1 ? <span style={{fontSize:'10px', color:'#fbbf24', border:'1px solid #fbbf24', padding:'2px 4px', borderRadius:'4px'}}>1차 반감기 가동중</span> : <span style={{fontSize:'10px', color:'#06b6d4', border:'1px solid #06b6d4', padding:'2px 4px', borderRadius:'4px'}}>기본 페이즈</span>}</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginTop: '5px' }}>{state.burned.toLocaleString()} GOU</div>
            <div style={{ color: '#aaa', fontSize: '10px', marginTop: '5px' }}>다음 반감기: {isPhase2 ? 'MAX' : isPhase1 ? '6조 돌파 시 (비용 50%↓)' : '3조 돌파 시 (획득 50%↓)'}</div>
          </div>
          <div className="glass-panel" style={{ flex: 1, padding: '15px', margin: 0, border: '1px solid rgba(251, 191, 36, 0.5)', background: 'rgba(251, 191, 36, 0.05)' }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '11px' }}>🏆 이번 주 랭커 잭팟 보상금</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginTop: '5px' }}>{state.jackpot.toLocaleString()} GOU</div>
            <div style={{ color: '#aaa', fontSize: '10px', marginTop: '5px' }}>실패 수수료 적립률: <span style={{color: '#fff'}}>{isPhase2 ? '23%' : isPhase1 ? '18%' : '15%'}</span></div>
          </div>
        </div>

        <h3 style={{ color: '#fbbf24', margin: '15px 0 10px 5px', fontSize: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>🗺️ 점령 영지 현황 (전투력 매칭)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '25px' }} className="grid-hunts">
          {hunts.map(h => {
            const isActive = !currentHuntData.isSpecial && currentHuntData.name === h.name;
            const isUnlocked = currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.reqSum;
            return (
              <div key={h.name} className={isActive ? 'hunt-active' : ''} style={{ background: 'rgba(15, 18, 25, 0.8)', border: `1px solid ${isActive ? '#fff' : (isUnlocked ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.1)')}`, padding: '12px 8px', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center', opacity: isUnlocked ? 1 : 0.4 }}>
                <b style={{ color: isActive ? '#fff' : (isUnlocked ? '#06b6d4' : '#666'), fontSize: '12px', marginBottom: '5px' }}>{isActive ? '⚔️ ' : ''}{h.name}</b>
                {h.name !== '초원 영지' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: 'rgba(0,0,0,0.8)', padding: '4px', borderRadius: '4px', fontSize: '10px', color: '#ccc', marginBottom: '5px' }}>
                    <div>공 <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444'}}>{h.req.atk}</span></div><div>체 <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444'}}>{h.req.hp}</span></div>
                    <div>방 <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444'}}>{h.req.def}</span></div><div>명 <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444'}}>{h.req.acc}</span></div>
                  </div>
                )}
                <div style={{ fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '5px' }}><div style={{ color: isUnlocked ? '#ccc' : '#666' }}>강화 <span style={{color: isUnlocked ? '#fff' : '#666', fontWeight: 'bold'}}>{h.reqSum}</span></div><div style={{ color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', marginTop: '2px' }}>수익 X{h.mult}</div></div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 10px 5px' }}>
          <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>⚔️ 신화 무기고 강화 (총합: <span style={{color: '#fff'}}>{totalGearLevel}강</span>)</h3>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', color: '#ccc' }}>장비 세트 30강 <span style={{color:'#fbbf24', fontWeight:'bold'}}>+500%</span></div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }} className="gears-grid">
          {gears.map(g => (
            <UpgradeCard key={g.id} type="gear" item={{...g, statText: `${g.stat}: ${(g.lvl * g.base).toFixed(1)}${g.unit}`, bonusText: `수익 버프: +${g.lvl * 2}%`}} isMax={g.lvl >= 30} cost={getCost(g.lvl)} onUpgrade={handleUpgrade} onAuto={toggleAuto} autoActive={autoUI[g.id]} animClass={lvlAnims[g.id] === 'up' ? 'lvl-up' : lvlAnims[g.id] === 'down' ? 'lvl-down' : ''} boxAnimClass={anims[g.id] === 'success' ? 'anim-success' : anims[g.id] === 'fail' ? 'anim-fail' : ''} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 10px 5px' }}>
          <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>🐉 신수 및 영지 성장</h3>
        </div>
        
        {['pet', 'castle'].map(type => {
          const isPet = type === 'pet'; 
          const isUnlocked = isPet ? isPetUnlocked : isCastleUnlocked; 
          const lvl = isPet ? state.petLevel : state.castleLevel; 
          const isMax = lvl >= 50; 
          const cost = isPet ? getPetCost(lvl) : getCastleCost(lvl);
          const isHunting = (isPet ? state.petHuntEndTime : state.castleHuntEndTime) > Date.now();
          
          return (
            <UpgradeCard key={type} type={type} 
              item={{ id: type, name: isPet ? '고대 황금 드래곤' : '위대한 군주의 성', imgFile: isPet ? 'pet.jpg' : 'castle.jpg', emoji: isPet ? '🐉' : '🏰', lvl: lvl, locked: !isUnlocked, lockMsg: isPet ? '장비 210강 달성 시 개방' : '펫 50강 달성 시 개방', bonusText: `수익 보너스: +${(isPet ? lvl * 3 : lvl * 5) + (isPet ? getPetBonus(lvl) : getCastleBonus(lvl))}%` }} 
              isMax={isMax} cost={cost} onUpgrade={handleUpgrade} onAuto={toggleAuto} autoActive={autoUI[type]} animClass={lvlAnims[type] === 'up' ? 'lvl-up' : lvlAnims[type] === 'down' ? 'lvl-down' : ''} boxAnimClass={anims[type] === 'success' ? 'anim-success' : anims[type] === 'fail' ? 'anim-fail' : ''}
              specialHunt={{ isHunting, huntText: isPet ? '🐉 둥지 사냥 (12h / X30)' : '🏰 천공 사냥 (12h / X50)', onStart: () => startSpecialHunt(type) }}
            />
          );
        })}
      </div>
      
      {state.isRankingOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ background: 'rgba(20,20,25,0.98)', border: '2px solid #fbbf24', padding: '30px 20px', borderRadius: '15px', width: '95%', maxWidth: '420px' }}>
            <h2 style={{ textAlign: 'center', color: '#fbbf24', marginBottom: '25px' }}>👑 RANKING</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6d5b8', fontSize: '14px', marginBottom: '10px' }}>
              <thead><tr style={{ borderBottom: '2px solid #fbbf24', color: '#fbbf24' }}><th style={{ padding: '10px', textAlign: 'left' }}>순위</th><th style={{ padding: '10px', textAlign: 'left' }}>사령관명</th><th style={{ padding: '10px', textAlign: 'right' }}>강화총합</th></tr></thead>
              <tbody>
                {mockRankings.map(r => (
                  <tr key={r.rank} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: r.isMe ? 'rgba(251,191,36,0.15)' : 'transparent' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{r.rank}</td><td style={{ padding: '12px 10px', fontWeight: 'bold' }}>[{r.title}] {r.name}</td><td style={{ padding: '12px 10px', textAlign: 'right', color: '#fbbf24' }}>{r.power}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setState(s => ({...s, isRankingOpen: false}))} className="action-btn" style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #555' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}