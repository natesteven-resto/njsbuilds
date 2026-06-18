'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const ENEMIES = [
  { name:'Foot Ninja',    hp:3,  color:'#7c3aed', dark:'#4c1d95', variant:'ninja'    },
  { name:'Foot Soldier',  hp:3,  color:'#6d28d9', dark:'#3b0764', variant:'ninja'    },
  { name:'Foot Scout',    hp:4,  color:'#4f46e5', dark:'#312e81', variant:'ninja'    },
  { name:'Foot Elite',    hp:4,  color:'#1d4ed8', dark:'#1e3a8a', variant:'ninja'    },
  { name:'Foot Captain',  hp:4,  color:'#0e7490', dark:'#164e63', variant:'ninja'    },
  { name:'Foot General',  hp:5,  color:'#b45309', dark:'#78350f', variant:'big'      },
  { name:'Bebop',         hp:5,  color:'#db2777', dark:'#831843', variant:'bebop'    },
  { name:'Rocksteady',    hp:5,  color:'#92400e', dark:'#451a03', variant:'rock'     },
  { name:'Krang',         hp:6,  color:'#be185d', dark:'#500724', variant:'krang'    },
  { name:'Shredder',      hp:8,  color:'#374151', dark:'#111827', variant:'shredder', isShredder:true },
];

type Variant = 'ninja'|'big'|'bebop'|'rock'|'krang'|'shredder';
type Phase   = 'start'|'idle'|'attack'|'special'|'miss'|'levelup'|'win';

function genQ(level: number) {
  const isPower = Math.random() < 0.25;
  const [mxA, mxB, canSub] =
    level<=2 ? [3,3,false] : level<=4 ? [6,6,false] :
    level<=6 ? [10,10,false] : level<=8 ? [10,8,true] : [12,10,true];
  const bA = Math.min(mxA + (isPower?3:0), 15);
  const bB = Math.min(mxB + (isPower?3:0), 15);
  const a  = 1 + Math.floor(Math.random()*bA);
  const b  = 1 + Math.floor(Math.random()*bB);
  const sub = canSub && Math.random()>0.5 && a>b;
  const ans = sub ? a-b : a+b;
  const big = sub ? Math.max(a,b) : a;
  const sml = sub ? Math.min(a,b) : b;
  const wrongs = new Set<number>();
  for(let t=0;t<100&&wrongs.size<3;t++){const d=Math.floor(Math.random()*6)-3;const w=ans+d;if(d!==0&&w>=0)wrongs.add(w);}
  for(let f=1;wrongs.size<3;f++) if(ans+f!==ans)wrongs.add(ans+f);
  return { text:`${big} ${sub?'−':'+'} ${sml} = ?`, answer:ans, choices:[ans,...wrongs].sort(()=>Math.random()-0.5), isPower };
}

export default function NinjaTurtles() {
  const [phase,  setPhase]  = useState<Phase>('start');
  const [level,  setLevel]  = useState(1);
  const [eHp,    setEHp]    = useState(ENEMIES[0].hp);
  const [q,      setQ]      = useState(()=>genQ(1));
  const [fb,     setFb]     = useState('');
  const [score,  setScore]  = useState(0);
  const cvs = useRef<HTMLCanvasElement>(null);
  const phaseStart = useRef(0);
  const phaseRef   = useRef<Phase>('start');
  const levelRef   = useRef(1);
  const eHpRef     = useRef(ENEMIES[0].hp);
  const scoreRef   = useRef(0);

  // Sync refs
  useEffect(()=>{ phaseRef.current=phase; phaseStart.current=performance.now(); },[phase]);
  useEffect(()=>{ levelRef.current=level; },[level]);
  useEffect(()=>{ eHpRef.current=eHp; },[eHp]);
  useEffect(()=>{ scoreRef.current=score; },[score]);

  const nextQ = useCallback((lvl=levelRef.current)=>{ setQ(genQ(lvl)); setFb(''); setPhase('idle'); },[]);

  const answer = useCallback((c:number)=>{
    if(phaseRef.current!=='idle') return;
    const curr = q;
    if(c===curr.answer){
      const sp=curr.isPower;
      const dmg=sp?2:1;
      setScore(s=>s+(sp?20:10)*levelRef.current);
      setFb(sp?'⭐ POWER HIT! Double damage!':'✅ Correct!');
      setPhase(sp?'special':'attack');
      const nh=Math.max(0, eHpRef.current-dmg);
      setEHp(nh);
      if(nh<=0){
        setTimeout(()=>{
          if(levelRef.current>=10){ setPhase('win'); }
          else {
            setPhase('levelup');
            setTimeout(()=>{
              const nl=levelRef.current+1;
              setLevel(nl); setEHp(ENEMIES[nl-1].hp);
              nextQ(nl);
            },2500);
          }
        },1100);
      } else { setTimeout(()=>nextQ(),900); }
    } else {
      setFb(`❌ Not quite — it was ${curr.answer}`);
      setPhase('miss');
      setTimeout(()=>nextQ(),1400);
    }
  },[q, nextQ]);

  // ── Canvas ──────────────────────────────────────────────────
  useEffect(()=>{
    const canvas=cvs.current; if(!canvas) return;
    const ctx=canvas.getContext('2d')!;
    let raf=0, live=true;

    const resize=()=>{ canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize();
    const ro=new ResizeObserver(resize); ro.observe(canvas);

    function drawLeo(cx:number,cy:number,sz:number,t:number,ph:Phase){
      ctx.save();
      const elap=(performance.now()-phaseStart.current)/1000;
      const bob=(ph==='idle'||ph==='attack'||ph==='special')?Math.sin(t*2.2)*sz*0.04:0;
      const atkX=(ph==='attack'||ph==='special')&&elap<0.5?Math.sin(elap*Math.PI*2)*sz*0.5:0;
      const missX=ph==='miss'?Math.sin(elap*25)*sz*0.06:0;
      ctx.translate(cx+atkX+missX,cy+bob);
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0,sz*0.07,sz*0.48,sz*0.1,0,0,Math.PI*2); ctx.fill();
      // shell
      ctx.fillStyle='#78350f'; ctx.beginPath(); ctx.ellipse(-sz*0.1,-sz*0.18,sz*0.32,sz*0.26,-0.3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#92400e'; ctx.lineWidth=2; ctx.stroke();
      ctx.strokeStyle='rgba(161,98,7,0.5)'; ctx.lineWidth=1;
      for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-sz*0.28+i*sz*0.13,-sz*0.38);ctx.lineTo(-sz*0.36+i*sz*0.13,-sz*0.07);ctx.stroke();}
      // body
      ctx.fillStyle='#4ade80'; ctx.beginPath(); ctx.ellipse(0,0,sz*0.3,sz*0.36,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#86efac'; ctx.beginPath(); ctx.ellipse(sz*0.04,sz*0.02,sz*0.19,sz*0.26,0,0,Math.PI*2); ctx.fill();
      // head
      ctx.fillStyle='#4ade80'; ctx.beginPath(); ctx.arc(sz*0.26,-sz*0.44,sz*0.21,0,Math.PI*2); ctx.fill();
      // mask
      ctx.fillStyle='#2563eb'; ctx.beginPath(); ctx.ellipse(sz*0.26,-sz*0.46,sz*0.21,sz*0.075,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#2563eb'; ctx.lineWidth=sz*0.045; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(sz*0.39,-sz*0.46); ctx.lineTo(sz*0.56,-sz*0.38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sz*0.39,-sz*0.46); ctx.lineTo(sz*0.58,-sz*0.54); ctx.stroke();
      // eyes
      ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(sz*0.2,-sz*0.47,sz*0.055,0,Math.PI*2); ctx.arc(sz*0.32,-sz*0.47,sz*0.055,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#1e3a8a'; ctx.beginPath(); ctx.arc(sz*0.22,-sz*0.47,sz*0.032,0,Math.PI*2); ctx.arc(sz*0.34,-sz*0.47,sz*0.032,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(sz*0.24,-sz*0.49,sz*0.01,0,Math.PI*2); ctx.arc(sz*0.36,-sz*0.49,sz*0.01,0,Math.PI*2); ctx.fill();
      // arm + sword
      ctx.save(); const aa=(ph==='attack'||ph==='special')?-0.6:0.25; ctx.translate(sz*0.08,-sz*0.1); ctx.rotate(aa);
      ctx.fillStyle='#4ade80'; ctx.beginPath(); ctx.ellipse(0,sz*0.18,sz*0.075,sz*0.17,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#c0c0c0'; ctx.lineWidth=sz*0.038; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(0,sz*0.28); ctx.lineTo(sz*0.56,sz*0.04); ctx.stroke();
      ctx.strokeStyle='#92400e'; ctx.lineWidth=sz*0.055;
      ctx.beginPath(); ctx.moveTo(-sz*0.04,sz*0.3); ctx.lineTo(sz*0.04,sz*0.27); ctx.stroke();
      ctx.restore();
      // legs
      ctx.fillStyle='#4ade80';
      ctx.beginPath(); ctx.ellipse(-sz*0.11,sz*0.4,sz*0.095,sz*0.15,-0.12,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sz*0.11,sz*0.4,sz*0.095,sz*0.15,0.12,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#86efac';
      ctx.beginPath(); ctx.ellipse(-sz*0.13,sz*0.53,sz*0.11,sz*0.065,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sz*0.13,sz*0.53,sz*0.11,sz*0.065,0,0,Math.PI*2); ctx.fill();
      // sprint flame if special
      if(ph==='special'&&elap<0.6){
        ctx.globalAlpha=Math.max(0,1-elap/0.6)*0.7;
        ['#60a5fa','#3b82f6','#1d4ed8'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(-sz*(0.32+i*0.24),0,sz*(0.18-i*0.05),0,Math.PI*2);ctx.fill();});
        ctx.globalAlpha=1;
      }
      ctx.restore();
    }

    function drawEnemy(cx:number,cy:number,sz:number,t:number,ph:Phase,variant:Variant,ecolor:string){
      ctx.save();
      const elap=(performance.now()-phaseStart.current)/1000;
      const bob=-Math.sin(t*2+1)*sz*0.03;
      const hurtX=(ph==='attack'||ph==='special')&&elap<0.5?-Math.sin(elap*Math.PI*2)*sz*0.28:0;
      const scale=variant==='shredder'?1.22:variant==='rock'?1.12:variant==='bebop'?1.08:1;
      ctx.translate(cx+hurtX,cy+bob);
      ctx.scale(scale,scale);
      const s=sz;
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0,s*0.08,s*0.42*scale,s*0.1,0,0,Math.PI*2); ctx.fill();

      if(variant==='shredder'){
        // cape
        ctx.fillStyle='#581c87'; ctx.beginPath(); ctx.moveTo(-s*0.42,-s*0.56); ctx.lineTo(-s*0.54,s*0.56); ctx.lineTo(s*0.54,s*0.56); ctx.lineTo(s*0.42,-s*0.56); ctx.closePath(); ctx.fill();
        // armor body
        ctx.fillStyle='#374151'; ctx.beginPath(); ctx.ellipse(0,-s*0.05,s*0.3,s*0.38,0,0,Math.PI*2); ctx.fill();
        // silver chest
        ctx.fillStyle='#d1d5db'; ctx.beginPath(); ctx.ellipse(0,-s*0.1,s*0.24,s*0.24,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#9ca3af'; ctx.lineWidth=s*0.04;
        for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*s*0.09,-s*0.16);ctx.lineTo(i*s*0.09,-s*0.34);ctx.stroke();}
        // helmet
        ctx.fillStyle='#1f2937'; ctx.beginPath(); ctx.arc(0,-s*0.52,s*0.24,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#9ca3af'; ctx.beginPath(); ctx.arc(0,-s*0.5,s*0.17,0,Math.PI*2); ctx.fill();
        // helmet wings
        ctx.fillStyle='#9ca3af';
        ctx.beginPath(); ctx.moveTo(-s*0.22,-s*0.6); ctx.lineTo(-s*0.44,-s*0.82); ctx.lineTo(-s*0.18,-s*0.66); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(s*0.22,-s*0.6); ctx.lineTo(s*0.44,-s*0.82); ctx.lineTo(s*0.18,-s*0.66); ctx.closePath(); ctx.fill();
        // eyes
        ctx.fillStyle='#dc2626'; ctx.beginPath(); ctx.arc(-s*0.07,-s*0.52,s*0.048,0,Math.PI*2); ctx.arc(s*0.07,-s*0.52,s*0.048,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(220,38,38,0.3)'; ctx.beginPath(); ctx.arc(-s*0.07,-s*0.52,s*0.1,0,Math.PI*2); ctx.arc(s*0.07,-s*0.52,s*0.1,0,Math.PI*2); ctx.fill();
        // arms + blades
        ctx.strokeStyle='#374151'; ctx.lineWidth=s*0.12; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-s*0.28,-s*0.22); ctx.lineTo(-s*0.46,s*0.12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s*0.28,-s*0.22); ctx.lineTo(s*0.46,s*0.12); ctx.stroke();
        ctx.strokeStyle='#9ca3af'; ctx.lineWidth=s*0.04;
        for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-s*0.46+i*s*0.06,s*0.12-i*s*0.08);ctx.lineTo(-s*0.46+i*s*0.06-s*0.16,s*0.12-i*s*0.08-s*0.18);ctx.stroke();}
        // legs
        ctx.fillStyle='#1f2937';
        ctx.beginPath(); ctx.ellipse(-s*0.11,s*0.42,s*0.11,s*0.2,-0.1,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s*0.11,s*0.42,s*0.11,s*0.2,0.1,0,Math.PI*2); ctx.fill();

      } else if(variant==='krang'){
        // android body
        ctx.fillStyle='#374151'; ctx.beginPath(); ctx.ellipse(0,s*0.05,s*0.28,s*0.35,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#9ca3af'; ctx.beginPath(); ctx.ellipse(0,s*0.0,s*0.22,s*0.22,0,0,Math.PI*2); ctx.fill();
        // brain dome on top
        ctx.fillStyle='rgba(236,72,153,0.7)'; ctx.beginPath(); ctx.arc(0,-s*0.38,s*0.26,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(249,168,212,0.4)'; ctx.lineWidth=1;
        for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(0,-s*0.38,s*(0.08+i*0.04),0,Math.PI); ctx.stroke();}
        // face inside dome
        ctx.fillStyle='#f472b6'; ctx.beginPath(); ctx.arc(-s*0.08,-s*0.4,s*0.04,0,Math.PI*2); ctx.arc(s*0.08,-s*0.4,s*0.04,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#f472b6'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(0,-s*0.32,s*0.06,0.2,Math.PI-0.2); ctx.stroke();
        // arms
        ctx.strokeStyle='#9ca3af'; ctx.lineWidth=s*0.1; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-s*0.26,-s*0.1); ctx.lineTo(-s*0.44,s*0.14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s*0.26,-s*0.1); ctx.lineTo(s*0.44,s*0.14); ctx.stroke();
        ctx.fillStyle='#374151';
        ctx.beginPath(); ctx.ellipse(-s*0.1,s*0.4,s*0.1,s*0.18,-0.1,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s*0.1,s*0.4,s*0.1,s*0.18,0.1,0,Math.PI*2); ctx.fill();

      } else {
        // ninja / big / bebop / rock variants
        const headSz = variant==='rock'?s*0.22:s*0.2;
        const beltColor = variant==='bebop'?'#db2777':variant==='rock'?'#92400e':'#000';
        // body
        ctx.fillStyle=ecolor; ctx.beginPath(); ctx.ellipse(0,-s*0.04,s*0.28,s*0.34,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=beltColor; ctx.fillRect(-s*0.28,-s*0.04,s*0.56,s*0.07);
        // head
        ctx.fillStyle='#111827'; ctx.beginPath(); ctx.arc(0,-s*0.46,headSz,0,Math.PI*2); ctx.fill();
        // bebop: mohawk
        if(variant==='bebop'){
          ctx.fillStyle='#f472b6';
          ctx.beginPath(); ctx.moveTo(-s*0.06,-s*0.6); ctx.lineTo(0,-s*0.86); ctx.lineTo(s*0.06,-s*0.6); ctx.closePath(); ctx.fill();
        }
        // rock: horn
        if(variant==='rock'){
          ctx.fillStyle='#d97706';
          ctx.beginPath(); ctx.moveTo(-s*0.04,-s*0.64); ctx.lineTo(s*0.04,-s*0.9); ctx.lineTo(s*0.08,-s*0.64); ctx.closePath(); ctx.fill();
        }
        // eyes (red glow)
        ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(-s*0.07,-s*0.48,s*0.046,0,Math.PI*2); ctx.arc(s*0.07,-s*0.48,s*0.046,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(239,68,68,0.25)'; ctx.beginPath(); ctx.arc(-s*0.07,-s*0.48,s*0.09,0,Math.PI*2); ctx.arc(s*0.07,-s*0.48,s*0.09,0,Math.PI*2); ctx.fill();
        // arms
        ctx.strokeStyle='#374151'; ctx.lineWidth=s*0.1; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(s*0.24,-s*0.18); ctx.lineTo(s*0.4,s*0.06); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s*0.24,-s*0.18); ctx.lineTo(-s*0.38,-s*0.34); ctx.stroke();
        // weapon
        ctx.strokeStyle='#9ca3af'; ctx.lineWidth=s*0.025; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-s*0.38,-s*0.34); ctx.lineTo(-s*0.6,-s*0.62); ctx.stroke();
        // legs
        ctx.fillStyle='#374151';
        ctx.beginPath(); ctx.ellipse(-s*0.1,s*0.38,s*0.1,s*0.18,-0.1,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s*0.1,s*0.38,s*0.1,s*0.18,0.1,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    function render(ts:number){
      if(!live) return;
      const W=canvas!.width, H=canvas!.height, t=ts*0.001;
      const ph=phaseRef.current, lvl=levelRef.current, ehp=eHpRef.current;
      const enemy=ENEMIES[Math.min(lvl-1,9)];
      const elap=(performance.now()-phaseStart.current)/1000;

      // bg
      ctx.fillStyle='#0f0f1a'; ctx.fillRect(0,0,W,H);
      // ambient glow behind enemy
      const grd=ctx.createRadialGradient(W*0.8,H*0.5,0,W*0.8,H*0.5,H*0.4);
      grd.addColorStop(0,enemy.dark+'88'); grd.addColorStop(1,'transparent');
      ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
      // Leo glow
      const leoG=ctx.createRadialGradient(W*0.2,H*0.5,0,W*0.2,H*0.5,H*0.35);
      leoG.addColorStop(0,'rgba(74,222,128,0.15)'); leoG.addColorStop(1,'transparent');
      ctx.fillStyle=leoG; ctx.fillRect(0,0,W,H);
      // ground
      ctx.fillStyle='#1e1e3a'; ctx.fillRect(0,H*0.72,W,H*0.28);
      ctx.strokeStyle='#3a3a6a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,H*0.72); ctx.lineTo(W,H*0.72); ctx.stroke();
      const bh=Math.max(8,H*0.038), bw=bh*2.6;
      ctx.strokeStyle='rgba(80,80,140,0.22)'; ctx.lineWidth=1;
      for(let y=H*0.72;y<H;y+=bh){const row=Math.floor((y-H*0.72)/bh);const off=(row%2)*bw/2;for(let x=-off;x<W+bw;x+=bw){ctx.strokeRect(x,y,bw,bh);}}

      const sz=Math.min(W*0.15,H*0.36);
      const gy=H*0.68;

      // Characters
      if(ph!=='start'&&ph!=='win'){
        drawLeo(W*0.2,gy,sz,t,ph);
        if(ehp>0||ph==='levelup'){
          drawEnemy(W*0.8,gy,sz,t,ph,enemy.variant as Variant,enemy.color);
        }
      }

      // Attack FX
      if((ph==='attack'||ph==='special')&&elap<1){
        const alpha=Math.max(0,1-elap*1.8);
        if(ph==='special'){
          // blue aura
          ctx.globalAlpha=alpha*0.5;
          const ag=ctx.createRadialGradient(W*0.2,gy,sz*0.05,W*0.2,gy,sz*0.75);
          ag.addColorStop(0,'rgba(96,165,250,0.9)'); ag.addColorStop(1,'transparent');
          ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(W*0.2,gy,sz*0.75,0,Math.PI*2); ctx.fill();
          ctx.globalAlpha=1;
          // star burst lines
          ctx.strokeStyle=`rgba(250,204,21,${alpha*0.8})`; ctx.lineWidth=sz*0.04; ctx.lineCap='round';
          for(let i=0;i<8;i++){const a=i/8*Math.PI*2+elap*2;const r=elap*sz*1.5; ctx.beginPath(); ctx.moveTo(W*0.8+Math.cos(a)*sz*0.1,gy+Math.sin(a)*sz*0.08); ctx.lineTo(W*0.8+Math.cos(a)*r,gy+Math.sin(a)*r*0.5); ctx.stroke();}
          // double slash
          ctx.globalAlpha=alpha; ctx.strokeStyle='#fbbf24'; ctx.lineWidth=sz*0.07; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(W*0.7,gy-sz*0.55); ctx.lineTo(W*0.88,gy+sz*0.22); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(W*0.74,gy-sz*0.55); ctx.lineTo(W*0.85,gy+sz*0.22); ctx.stroke();
          ctx.globalAlpha=1;
        } else {
          ctx.globalAlpha=alpha; ctx.strokeStyle='#4ade80'; ctx.lineWidth=sz*0.055; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(W*0.68,gy-sz*0.48); ctx.lineTo(W*0.87,gy+sz*0.16); ctx.stroke();
          ctx.globalAlpha=1;
        }
        // particles
        for(let i=0;i<(ph==='special'?16:10);i++){
          const a=(i/(ph==='special'?16:10))*Math.PI*2+(ph==='special'?elap*3:0);
          const r=elap*sz*(ph==='special'?2.0:1.5);
          ctx.globalAlpha=Math.max(0,alpha*0.9);
          ctx.fillStyle=ph==='special'?(i%2===0?'#fbbf24':'#60a5fa'):'#4ade80';
          ctx.beginPath(); ctx.arc(W*0.8+Math.cos(a)*r,gy+Math.sin(a)*r*0.4,ph==='special'?5:4,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
      }

      // Miss FX
      if(ph==='miss'&&elap<1.2){
        const alpha=Math.max(0,1-elap/1.0);
        ctx.globalAlpha=alpha*0.8;
        ctx.fillStyle='rgba(239,68,68,0.18)'; ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=alpha;
        ctx.fillStyle='#ef4444'; ctx.font=`bold ${Math.min(sz*0.55,36)}px sans-serif`; ctx.textAlign='center';
        ctx.fillText('MISS! ❌',W/2,gy-sz*0.9);
        ctx.globalAlpha=1;
      }

      // Level up FX
      if(ph==='levelup'){
        for(let i=0;i<32;i++){
          const px=((W*(i*47+t*80))%W+W)%W;
          const py=((t*60*((i%3)+1)*30+i*H/32))%H;
          ctx.fillStyle=['#ffd700','#4ade80','#3b82f6','#f472b6','#fb923c'][i%5];
          ctx.save(); ctx.translate(px,py); ctx.rotate(t*2+i); ctx.fillRect(-3,-5,6,10); ctx.restore();
        }
        ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(W*0.04,H*0.22,W*0.92,H*0.28);
        ctx.fillStyle='#ffd700'; ctx.font=`bold ${Math.min(sz*0.62,38)}px sans-serif`; ctx.textAlign='center';
        ctx.fillText(`Level ${lvl} Complete! 🎉`,W/2,H*0.34);
        ctx.fillStyle='white'; ctx.font=`${Math.min(sz*0.4,24)}px sans-serif`;
        ctx.fillText(lvl<10?`Up next: ${ENEMIES[lvl].name} 👊`:'Final Boss incoming... 😱',W/2,H*0.44);
      }

      // Win FX
      if(ph==='win'){
        ctx.fillStyle='#1e1b4b'; ctx.fillRect(0,0,W,H);
        for(let i=0;i<10;i++){
          const fx=W*(0.08+i*0.19%0.9), fy=H*(0.08+i*0.13%0.5);
          const fp=(t*1.8+i*0.72)%(Math.PI*2);
          const fr=Math.sin(fp)*H*0.09;
          for(let j=0;j<12;j++){
            const fa=(j/12)*Math.PI*2;
            ctx.globalAlpha=Math.max(0,Math.cos(fp)*0.9);
            ctx.fillStyle=['#ffd700','#4ade80','#f472b6','#60a5fa','#fb923c'][i%5];
            ctx.beginPath(); ctx.arc(fx+Math.cos(fa)*fr,fy+Math.sin(fa)*fr,3,0,Math.PI*2); ctx.fill();
          }
        }
        ctx.globalAlpha=1;
        ctx.fillStyle='#ffd700'; ctx.font=`bold ${Math.min(sz*0.72,46)}px sans-serif`; ctx.textAlign='center';
        ctx.fillText('🐢 YOU WIN! 🐢',W/2,H*0.3);
        ctx.fillStyle='white'; ctx.font=`${Math.min(sz*0.46,29)}px sans-serif`;
        ctx.fillText('Shredder is defeated!',W/2,H*0.45);
        ctx.fillStyle='#86efac'; ctx.font=`bold ${Math.min(sz*0.5,31)}px sans-serif`;
        ctx.fillText(`Final Score: ${scoreRef.current}`,W/2,H*0.58);
      }

      // Start bg art
      if(ph==='start'){
        ctx.fillStyle='rgba(74,222,128,0.06)'; ctx.beginPath(); ctx.arc(W*0.2,H*0.55,H*0.28,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(124,58,237,0.06)'; ctx.beginPath(); ctx.arc(W*0.8,H*0.55,H*0.28,0,Math.PI*2); ctx.fill();
        drawLeo(W*0.22,H*0.68,Math.min(W*0.14,H*0.32),t,'idle');
        drawEnemy(W*0.78,H*0.68,Math.min(W*0.13,H*0.3),t,'idle','ninja','#7c3aed');
      }

      raf=requestAnimationFrame(render);
    }
    raf=requestAnimationFrame(render);
    return()=>{ live=false; cancelAnimationFrame(raf); ro.disconnect(); };
  },[]);

  const enemy=ENEMIES[Math.min(level-1,9)];
  const isActive=phase==='idle'||phase==='attack'||phase==='special'||phase==='miss';
  const btnColors=['linear-gradient(135deg,#1d4ed8,#3b82f6)','linear-gradient(135deg,#065f46,#10b981)','linear-gradient(135deg,#7c2d12,#ea580c)','linear-gradient(135deg,#581c87,#9333ea)'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',overflow:'hidden',background:'#0f0f1a',userSelect:'none',WebkitUserSelect:'none',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 14px',background:'#1a1a2e',borderBottom:'2px solid #3b82f6',flexShrink:0}}>
        <div style={{color:'#4ade80',fontWeight:'bold',fontSize:13}}>🐢 Leonardo</div>
        <div style={{color:'white',fontWeight:'bold',fontSize:15,textAlign:'center'}}>
          {phase==='start'?'Ninja Turtles Math!':`Level ${level}/10 — ${enemy.name}`}
        </div>
        <div style={{color:'#fbbf24',fontWeight:'bold',fontSize:13}}>⭐ {score}</div>
      </div>

      {/* Enemy HP bar */}
      {isActive&&(
        <div style={{padding:'5px 14px 0',flexShrink:0}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginBottom:3,display:'flex',justifyContent:'space-between'}}>
            <span>{enemy.name} HP</span><span>{eHp}/{enemy.hp}</span>
          </div>
          <div style={{height:9,background:'rgba(255,255,255,0.1)',borderRadius:5,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(eHp/enemy.hp)*100}%`,background:enemy.isShredder?'linear-gradient(90deg,#7c3aed,#dc2626)':`linear-gradient(90deg,${enemy.color},${enemy.color}99)`,transition:'width 0.3s ease',borderRadius:5}} />
          </div>
        </div>
      )}

      {/* Canvas — battle scene */}
      <canvas ref={cvs} style={{flex:'1 1 0',width:'100%',display:'block',minHeight:0}} />

      {/* Question + Answers */}
      {isActive&&(
        <div style={{flexShrink:0,padding:'8px 14px 10px',background:'rgba(15,15,26,0.92)',borderTop:'1px solid rgba(59,130,246,0.3)'}}>
          {/* Feedback */}
          <div style={{minHeight:22,textAlign:'center',marginBottom:6,fontSize:13,fontWeight:'bold',color:fb.startsWith('✅')||fb.startsWith('⭐')?'#4ade80':'#f87171',transition:'opacity 0.2s'}}>
            {fb||'\u00a0'}
          </div>
          {/* Power hint */}
          {q.isPower&&phase==='idle'&&(
            <div style={{textAlign:'center',fontSize:11,color:'#fbbf24',marginBottom:4}}>⭐ Power Question — 2× damage + 2× points!</div>
          )}
          {/* Question */}
          <div style={{textAlign:'center',fontSize:26,fontWeight:'bold',color:'white',marginBottom:10,letterSpacing:1,textShadow:q.isPower?'0 0 12px #fbbf24':'none'}}>
            {q.text}
          </div>
          {/* Answer buttons */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {q.choices.map((c,i)=>(
              <button
                key={`${c}-${i}`}
                onClick={()=>answer(c)}
                disabled={phase!=='idle'}
                style={{
                  background:phase==='idle'?btnColors[i%4]:'rgba(255,255,255,0.08)',
                  color:'white',border:'none',borderRadius:10,
                  padding:'13px 0',fontSize:20,fontWeight:'bold',
                  cursor:phase==='idle'?'pointer':'default',
                  opacity:phase==='idle'?1:0.5,
                  boxShadow:phase==='idle'?'0 3px 10px rgba(0,0,0,0.4)':'none',
                  transition:'transform 0.08s,opacity 0.2s',
                  WebkitTapHighlightColor:'transparent',
                  touchAction:'manipulation',
                }}
                onPointerDown={e=>{ if(phase==='idle')(e.currentTarget.style.transform='scale(0.94)'); }}
                onPointerUp={e=>{ (e.currentTarget.style.transform='scale(1)'); }}
                onPointerLeave={e=>{ (e.currentTarget.style.transform='scale(1)'); }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Screen */}
      {phase==='start'&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',paddingBottom:'10dvh',pointerEvents:'none'}}>
          <div style={{pointerEvents:'auto',textAlign:'center',padding:'0 20px'}}>
            <div style={{fontSize:28,fontWeight:'bold',color:'#4ade80',textShadow:'0 0 16px #4ade80',marginBottom:6}}>🐢 Ninja Turtles Math!</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.7)',marginBottom:18}}>Answer math questions to defeat Shredder's army!</div>
            <button
              onClick={()=>{ setLevel(1); setEHp(ENEMIES[0].hp); setScore(0); nextQ(1); }}
              style={{background:'linear-gradient(135deg,#065f46,#10b981)',color:'white',border:'none',borderRadius:14,padding:'14px 44px',fontSize:20,fontWeight:'bold',cursor:'pointer',boxShadow:'0 4px 16px rgba(16,185,129,0.4)',WebkitTapHighlightColor:'transparent',touchAction:'manipulation'}}
            >
              🗡️ Start Game
            </button>
          </div>
        </div>
      )}

      {/* Win Screen overlay buttons */}
      {phase==='win'&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',paddingBottom:'8dvh',pointerEvents:'none'}}>
          <div style={{pointerEvents:'auto',textAlign:'center'}}>
            <button
              onClick={()=>{ setLevel(1); setEHp(ENEMIES[0].hp); setScore(0); nextQ(1); }}
              style={{background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',color:'white',border:'none',borderRadius:14,padding:'13px 36px',fontSize:18,fontWeight:'bold',cursor:'pointer',boxShadow:'0 4px 16px rgba(59,130,246,0.4)',WebkitTapHighlightColor:'transparent',touchAction:'manipulation'}}
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
