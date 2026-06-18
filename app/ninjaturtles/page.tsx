'use client';
import { useState, useEffect, useRef } from 'react';

/* ══════════════════════════════════════════════════════
   NINJA TURTLES MATH  —  Kindergarten Edition
   ══════════════════════════════════════════════════════ */

const ENEMIES = [
  { name:'Foot Ninja',    hp:3,  color:'#7c3aed', dark:'#4c1d95', v:'ninja'    },
  { name:'Foot Soldier',  hp:3,  color:'#6d28d9', dark:'#3b0764', v:'ninja'    },
  { name:'Foot Scout',    hp:4,  color:'#4f46e5', dark:'#312e81', v:'ninja'    },
  { name:'Foot Elite',    hp:4,  color:'#1d4ed8', dark:'#1e3a8a', v:'ninja'    },
  { name:'Foot Captain',  hp:4,  color:'#0e7490', dark:'#164e63', v:'big'      },
  { name:'Foot General',  hp:5,  color:'#b45309', dark:'#78350f', v:'big'      },
  { name:'Bebop',         hp:5,  color:'#db2777', dark:'#831843', v:'bebop'    },
  { name:'Rocksteady',    hp:5,  color:'#92400e', dark:'#451a03', v:'rock'     },
  { name:'Krang',         hp:6,  color:'#be185d', dark:'#500724', v:'krang'    },
  { name:'Shredder',      hp:8,  color:'#374151', dark:'#111827', v:'shredder', boss:true },
] as const;

type Phase = 'start'|'idle'|'attack'|'special'|'miss'|'levelup'|'win';

function genQ(level: number) {
  const isPower = Math.random() < 0.25;
  const [mxA,mxB,canSub] =
    level<=2?[3,3,false]:level<=4?[6,6,false]:
    level<=6?[10,10,false]:level<=8?[10,8,true]:[12,10,true];
  const bA=Math.min(mxA+(isPower?3:0),15), bB=Math.min(mxB+(isPower?3:0),15);
  const a=1+Math.floor(Math.random()*bA), b=1+Math.floor(Math.random()*bB);
  const sub=canSub&&Math.random()>0.5&&a>b;
  const ans=sub?a-b:a+b;
  const wrongs=new Set<number>();
  for(let t=0;t<100&&wrongs.size<3;t++){const d=Math.floor(Math.random()*6)-3;const w=ans+d;if(d!==0&&w>=0)wrongs.add(w);}
  for(let f=1;wrongs.size<3;f++) if(ans+f!==ans)wrongs.add(ans+f);
  return {
    text:`${sub?Math.max(a,b):a} ${sub?'−':'+'} ${sub?Math.min(a,b):b} = ?`,
    answer:ans, choices:[ans,...wrongs].sort(()=>Math.random()-0.5), isPower,
  };
}

export default function NinjaTurtles() {
  const [phase,  setPhase]  = useState<Phase>('start');
  const [level,  setLevel]  = useState(1);
  const [eHp,    setEHp]    = useState(ENEMIES[0].hp);
  const [q,      setQ]      = useState(()=>genQ(1));
  const [fb,     setFb]     = useState('');
  const [score,  setScore]  = useState(0);

  const cvs          = useRef<HTMLCanvasElement>(null);
  const phaseRef     = useRef<Phase>('start');
  const phaseStart   = useRef(0);
  const levelRef     = useRef(1);
  const eHpRef       = useRef(ENEMIES[0].hp);
  const scoreRef     = useRef(0);
  const locked       = useRef(false);

  useEffect(()=>{ phaseRef.current=phase; phaseStart.current=performance.now(); },[phase]);
  useEffect(()=>{ levelRef.current=level; },[level]);
  useEffect(()=>{ eHpRef.current=eHp; },[eHp]);
  useEffect(()=>{ scoreRef.current=score; },[score]);

  const nextQ = (lvl=levelRef.current) => {
    locked.current=false;
    setQ(genQ(lvl)); setFb(''); setPhase('idle');
  };

  const answer = (c: number) => {
    if(locked.current||phaseRef.current!=='idle') return;
    locked.current=true;
    const curr=q;
    if(c===curr.answer){
      const sp=curr.isPower, dmg=sp?2:1;
      setScore(s=>s+(sp?20:10)*levelRef.current);
      setFb(sp?'⭐ POWER HIT! Double damage!':'✅ Correct!');
      setPhase(sp?'special':'attack');
      const nh=Math.max(0,eHpRef.current-dmg);
      setEHp(nh);
      if(nh<=0){
        setTimeout(()=>{
          if(levelRef.current>=10){ setPhase('win'); }
          else {
            setPhase('levelup');
            setTimeout(()=>{
              const nl=levelRef.current+1;
              setLevel(nl); setEHp(ENEMIES[nl-1].hp); nextQ(nl);
            },2600);
          }
        },1100);
      } else { setTimeout(()=>nextQ(),900); }
    } else {
      setFb(`❌ Not quite — the answer was ${curr.answer}`);
      setPhase('miss');
      setTimeout(()=>nextQ(),1500);
    }
  };

  /* ── Canvas ─────────────────────────────────────────── */
  useEffect(()=>{
    const canvas=cvs.current; if(!canvas) return;
    const ctx=canvas.getContext('2d')!;
    let raf=0, live=true;
    const resize=()=>{ canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize();
    const ro=new ResizeObserver(resize); ro.observe(canvas);

    // ── Draw Leonardo ───────────────────────────────────
    function drawLeo(cx:number,cy:number,sz:number,t:number,ph:Phase){
      const el=(performance.now()-phaseStart.current)/1000;
      const bob=Math.sin(t*2.2)*sz*0.04;
      const atkX=(ph==='attack'||ph==='special')&&el<0.5?Math.sin(el*Math.PI*2)*sz*0.5:0;
      const mX=ph==='miss'?Math.sin(el*25)*sz*0.06:0;
      ctx.save(); ctx.translate(cx+atkX+mX,cy+bob);
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0,sz*0.08,sz*0.46,sz*0.1,0,0,Math.PI*2); ctx.fill();
      // shell
      ctx.fillStyle='#78350f'; ctx.beginPath(); ctx.ellipse(-sz*0.1,-sz*0.18,sz*0.3,sz*0.25,-0.3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#92400e'; ctx.lineWidth=2; ctx.stroke();
      ctx.strokeStyle='rgba(161,98,7,0.45)'; ctx.lineWidth=1;
      for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-sz*0.26+i*sz*0.12,-sz*0.36);ctx.lineTo(-sz*0.34+i*sz*0.12,-sz*0.07);ctx.stroke();}
      // body
      ctx.fillStyle='#4ade80'; ctx.beginPath(); ctx.ellipse(0,0,sz*0.29,sz*0.35,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#86efac'; ctx.beginPath(); ctx.ellipse(sz*0.04,sz*0.02,sz*0.18,sz*0.25,0,0,Math.PI*2); ctx.fill();
      // head
      ctx.fillStyle='#4ade80'; ctx.beginPath(); ctx.arc(sz*0.25,-sz*0.43,sz*0.2,0,Math.PI*2); ctx.fill();
      // blue mask
      ctx.fillStyle='#2563eb'; ctx.beginPath(); ctx.ellipse(sz*0.25,-sz*0.45,sz*0.2,sz*0.072,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#2563eb'; ctx.lineWidth=sz*0.043; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(sz*0.38,-sz*0.45); ctx.lineTo(sz*0.54,-sz*0.37); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sz*0.38,-sz*0.45); ctx.lineTo(sz*0.56,-sz*0.53); ctx.stroke();
      // eyes
      ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(sz*0.19,-sz*0.46,sz*0.052,0,Math.PI*2); ctx.arc(sz*0.31,-sz*0.46,sz*0.052,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#1e3a8a'; ctx.beginPath(); ctx.arc(sz*0.21,-sz*0.46,sz*0.03,0,Math.PI*2); ctx.arc(sz*0.33,-sz*0.46,sz*0.03,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(sz*0.23,-sz*0.48,sz*0.01,0,Math.PI*2); ctx.arc(sz*0.35,-sz*0.48,sz*0.01,0,Math.PI*2); ctx.fill();
      // arm + sword
      const aa=(ph==='attack'||ph==='special')?-0.6:0.25;
      ctx.save(); ctx.translate(sz*0.08,-sz*0.1); ctx.rotate(aa);
      ctx.fillStyle='#4ade80'; ctx.beginPath(); ctx.ellipse(0,sz*0.17,sz*0.072,sz*0.16,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=sz*0.036; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(0,sz*0.27); ctx.lineTo(sz*0.54,sz*0.04); ctx.stroke();
      ctx.strokeStyle='#92400e'; ctx.lineWidth=sz*0.052;
      ctx.beginPath(); ctx.moveTo(-sz*0.035,sz*0.29); ctx.lineTo(sz*0.035,sz*0.26); ctx.stroke();
      ctx.restore();
      // legs
      ctx.fillStyle='#4ade80';
      ctx.beginPath(); ctx.ellipse(-sz*0.1,sz*0.39,sz*0.09,sz*0.14,-0.12,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sz*0.1,sz*0.39,sz*0.09,sz*0.14,0.12,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#86efac';
      ctx.beginPath(); ctx.ellipse(-sz*0.12,sz*0.51,sz*0.1,sz*0.06,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sz*0.12,sz*0.51,sz*0.1,sz*0.06,0,0,Math.PI*2); ctx.fill();
      // sprint flames on special
      if(ph==='special'&&el<0.6){
        ctx.globalAlpha=Math.max(0,1-el/0.6)*0.7;
        ['#93c5fd','#3b82f6','#1d4ed8'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(-sz*(0.3+i*0.22),0,sz*(0.17-i*0.04),0,Math.PI*2);ctx.fill();});
        ctx.globalAlpha=1;
      }
      ctx.restore();
    }

    // ── Draw Enemy ──────────────────────────────────────
    function drawEnemy(cx:number,cy:number,sz:number,t:number,ph:Phase,vi:number){
      const enemy=ENEMIES[vi]; const v=enemy.v, ec=enemy.color;
      const el=(performance.now()-phaseStart.current)/1000;
      const bob=-Math.sin(t*2.1+1)*sz*0.03;
      const hX=(ph==='attack'||ph==='special')&&el<0.5?-Math.sin(el*Math.PI*2)*sz*0.26:0;
      const sc=v==='shredder'?1.2:v==='rock'?1.1:v==='bebop'?1.06:1;
      ctx.save(); ctx.translate(cx+hX,cy+bob); ctx.scale(sc,sc);
      const s=sz;
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0,s*0.09,s*0.4,s*0.1,0,0,Math.PI*2); ctx.fill();

      if(v==='shredder'){
        ctx.fillStyle='#581c87';
        ctx.beginPath();ctx.moveTo(-s*0.42,-s*0.55);ctx.lineTo(-s*0.52,s*0.54);ctx.lineTo(s*0.52,s*0.54);ctx.lineTo(s*0.42,-s*0.55);ctx.closePath();ctx.fill();
        ctx.fillStyle='#374151';ctx.beginPath();ctx.ellipse(0,-s*0.05,s*0.29,s*0.37,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#d1d5db';ctx.beginPath();ctx.ellipse(0,-s*0.1,s*0.23,s*0.23,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#9ca3af';ctx.lineWidth=s*0.038;
        for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*s*0.08,-s*0.15);ctx.lineTo(i*s*0.08,-s*0.33);ctx.stroke();}
        ctx.fillStyle='#1f2937';ctx.beginPath();ctx.arc(0,-s*0.51,s*0.23,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#9ca3af';ctx.beginPath();ctx.arc(0,-s*0.49,s*0.16,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#9ca3af';
        ctx.beginPath();ctx.moveTo(-s*0.21,-s*0.59);ctx.lineTo(-s*0.42,-s*0.8);ctx.lineTo(-s*0.17,-s*0.64);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo(s*0.21,-s*0.59);ctx.lineTo(s*0.42,-s*0.8);ctx.lineTo(s*0.17,-s*0.64);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(-s*0.07,-s*0.51,s*0.046,0,Math.PI*2);ctx.arc(s*0.07,-s*0.51,s*0.046,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(239,68,68,0.28)';ctx.beginPath();ctx.arc(-s*0.07,-s*0.51,s*0.1,0,Math.PI*2);ctx.arc(s*0.07,-s*0.51,s*0.1,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#374151';ctx.lineWidth=s*0.12;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(-s*0.27,-s*0.22);ctx.lineTo(-s*0.44,s*0.12);ctx.stroke();
        ctx.beginPath();ctx.moveTo(s*0.27,-s*0.22);ctx.lineTo(s*0.44,s*0.12);ctx.stroke();
        ctx.strokeStyle='#9ca3af';ctx.lineWidth=s*0.038;
        for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-s*0.44+i*s*0.06,s*0.12-i*s*0.07);ctx.lineTo(-s*0.44+i*s*0.06-s*0.15,s*0.12-i*s*0.07-s*0.17);ctx.stroke();}
        ctx.fillStyle='#1f2937';
        ctx.beginPath();ctx.ellipse(-s*0.11,s*0.41,s*0.11,s*0.19,-0.1,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(s*0.11,s*0.41,s*0.11,s*0.19,0.1,0,Math.PI*2);ctx.fill();

      } else if(v==='krang'){
        ctx.fillStyle='#374151';ctx.beginPath();ctx.ellipse(0,s*0.04,s*0.27,s*0.34,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#9ca3af';ctx.beginPath();ctx.ellipse(0,s*0.0,s*0.21,s*0.21,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(236,72,153,0.65)';ctx.beginPath();ctx.arc(0,-s*0.37,s*0.25,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(249,168,212,0.35)';ctx.lineWidth=1;
        for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,-s*0.37,s*(0.09+i*0.04),0,Math.PI);ctx.stroke();}
        ctx.fillStyle='#f472b6';ctx.beginPath();ctx.arc(-s*0.07,-s*0.39,s*0.038,0,Math.PI*2);ctx.arc(s*0.07,-s*0.39,s*0.038,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#f472b6';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-s*0.31,s*0.055,0.2,Math.PI-0.2);ctx.stroke();
        ctx.strokeStyle='#9ca3af';ctx.lineWidth=s*0.1;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(-s*0.25,-s*0.1);ctx.lineTo(-s*0.43,s*0.14);ctx.stroke();
        ctx.beginPath();ctx.moveTo(s*0.25,-s*0.1);ctx.lineTo(s*0.43,s*0.14);ctx.stroke();
        ctx.fillStyle='#374151';
        ctx.beginPath();ctx.ellipse(-s*0.1,s*0.39,s*0.1,s*0.18,-0.1,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(s*0.1,s*0.39,s*0.1,s*0.18,0.1,0,Math.PI*2);ctx.fill();

      } else {
        const hSz=v==='rock'?s*0.22:s*0.2;
        ctx.fillStyle=ec;ctx.beginPath();ctx.ellipse(0,-s*0.04,s*0.27,s*0.33,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#000';ctx.fillRect(-s*0.27,-s*0.04,s*0.54,s*0.065);
        ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(0,-s*0.45,hSz,0,Math.PI*2);ctx.fill();
        if(v==='bebop'){
          ctx.fillStyle='#f472b6';
          ctx.beginPath();ctx.moveTo(-s*0.055,-s*0.59);ctx.lineTo(0,-s*0.84);ctx.lineTo(s*0.055,-s*0.59);ctx.closePath();ctx.fill();
        }
        if(v==='rock'){
          ctx.fillStyle='#d97706';
          ctx.beginPath();ctx.moveTo(-s*0.038,-s*0.63);ctx.lineTo(s*0.04,-s*0.88);ctx.lineTo(s*0.078,-s*0.63);ctx.closePath();ctx.fill();
        }
        ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(-s*0.07,-s*0.47,s*0.043,0,Math.PI*2);ctx.arc(s*0.07,-s*0.47,s*0.043,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(239,68,68,0.22)';ctx.beginPath();ctx.arc(-s*0.07,-s*0.47,s*0.088,0,Math.PI*2);ctx.arc(s*0.07,-s*0.47,s*0.088,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#374151';ctx.lineWidth=s*0.1;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(s*0.23,-s*0.17);ctx.lineTo(s*0.39,s*0.06);ctx.stroke();
        ctx.beginPath();ctx.moveTo(-s*0.23,-s*0.17);ctx.lineTo(-s*0.37,-s*0.32);ctx.stroke();
        ctx.strokeStyle='#9ca3af';ctx.lineWidth=s*0.024;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(-s*0.37,-s*0.32);ctx.lineTo(-s*0.58,-s*0.6);ctx.stroke();
        ctx.fillStyle='#374151';
        ctx.beginPath();ctx.ellipse(-s*0.1,s*0.37,s*0.1,s*0.17,-0.1,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(s*0.1,s*0.37,s*0.1,s*0.17,0.1,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }

    // ── Main render loop ────────────────────────────────
    function render(ts:number){
      if(!live) return;
      const W=canvas!.width, H=canvas!.height, t=ts*0.001;
      const ph=phaseRef.current, lvl=levelRef.current, ehp=eHpRef.current;
      const ei=Math.min(lvl-1,9), enemy=ENEMIES[ei];
      const el=(performance.now()-phaseStart.current)/1000;

      // Background
      ctx.fillStyle='#0f0f1a'; ctx.fillRect(0,0,W,H);
      // Enemy aura
      const aG=ctx.createRadialGradient(W*0.78,H*0.5,0,W*0.78,H*0.5,H*0.45);
      aG.addColorStop(0,enemy.dark+'66'); aG.addColorStop(1,'transparent');
      ctx.fillStyle=aG; ctx.fillRect(0,0,W,H);
      // Leo aura
      const lG=ctx.createRadialGradient(W*0.22,H*0.5,0,W*0.22,H*0.5,H*0.38);
      lG.addColorStop(0,'rgba(74,222,128,0.14)'); lG.addColorStop(1,'transparent');
      ctx.fillStyle=lG; ctx.fillRect(0,0,W,H);
      // Ground
      ctx.fillStyle='#1e1e3a'; ctx.fillRect(0,H*0.72,W,H*0.28);
      ctx.strokeStyle='#3a3a6a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,H*0.72); ctx.lineTo(W,H*0.72); ctx.stroke();
      const bh=Math.max(8,H*0.038), bw=bh*2.6;
      ctx.strokeStyle='rgba(80,80,150,0.2)'; ctx.lineWidth=1;
      for(let y=H*0.72;y<H;y+=bh){const row=Math.floor((y-H*0.72)/bh);const off=(row%2)*bw/2;for(let x=-off;x<W+bw;x+=bw){ctx.strokeRect(x,y,bw,bh);}}

      const sz=Math.min(W*0.15,H*0.36), gy=H*0.68;

      // Characters
      if(ph!=='start'&&ph!=='win'){
        drawLeo(W*0.2,gy,sz,t,ph);
        if(ehp>0||ph==='levelup') drawEnemy(W*0.8,gy,sz,t,ph,ei);
      }

      // Attack FX
      if((ph==='attack'||ph==='special')&&el<1.0){
        const alpha=Math.max(0,1-el*1.7);
        if(ph==='special'){
          ctx.globalAlpha=alpha*0.45;
          const ag=ctx.createRadialGradient(W*0.2,gy,sz*0.05,W*0.2,gy,sz*0.7);
          ag.addColorStop(0,'rgba(96,165,250,0.9)'); ag.addColorStop(1,'transparent');
          ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(W*0.2,gy,sz*0.7,0,Math.PI*2); ctx.fill();
          ctx.globalAlpha=alpha; ctx.strokeStyle='#fbbf24'; ctx.lineWidth=sz*0.07; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(W*0.7,gy-sz*0.52); ctx.lineTo(W*0.87,gy+sz*0.2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(W*0.74,gy-sz*0.52); ctx.lineTo(W*0.84,gy+sz*0.2); ctx.stroke();
          ctx.globalAlpha=1;
          for(let i=0;i<16;i++){const a=(i/16)*Math.PI*2+el*3;const r=el*sz*2;ctx.globalAlpha=Math.max(0,alpha*0.9);ctx.fillStyle=i%2===0?'#fbbf24':'#60a5fa';ctx.beginPath();ctx.arc(W*0.8+Math.cos(a)*r,gy+Math.sin(a)*r*0.42,5,0,Math.PI*2);ctx.fill();}
        } else {
          ctx.globalAlpha=alpha; ctx.strokeStyle='#4ade80'; ctx.lineWidth=sz*0.055; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(W*0.68,gy-sz*0.46); ctx.lineTo(W*0.86,gy+sz*0.15); ctx.stroke();
          ctx.globalAlpha=1;
          for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2;const r=el*sz*1.5;ctx.globalAlpha=Math.max(0,alpha*0.8);ctx.fillStyle='#4ade80';ctx.beginPath();ctx.arc(W*0.8+Math.cos(a)*r,gy+Math.sin(a)*r*0.4,4,0,Math.PI*2);ctx.fill();}
        }
        ctx.globalAlpha=1;
      }

      // Miss FX
      if(ph==='miss'&&el<1.3){
        const alpha=Math.max(0,1-el/1.1);
        ctx.globalAlpha=alpha*0.75; ctx.fillStyle='rgba(239,68,68,0.16)'; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
      }

      // Level-up FX
      if(ph==='levelup'){
        for(let i=0;i<32;i++){
          const px=((W*(i*47+t*90))%W+W)%W;
          const py=((t*55*((i%3)+1)*28+i*H/32))%H;
          ctx.fillStyle=['#ffd700','#4ade80','#3b82f6','#f472b6','#fb923c'][i%5];
          ctx.save();ctx.translate(px,py);ctx.rotate(t*2.2+i);ctx.fillRect(-3,-5,6,10);ctx.restore();
        }
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(W*0.04,H*0.2,W*0.92,H*0.32);
        ctx.fillStyle='#ffd700'; ctx.font=`bold ${Math.min(sz*0.62,38)}px sans-serif`; ctx.textAlign='center';
        ctx.fillText(`Level ${lvl} Complete! 🎉`,W/2,H*0.34);
        ctx.fillStyle='white'; ctx.font=`${Math.min(sz*0.4,24)}px sans-serif`;
        ctx.fillText(lvl<10?`Up next: ${ENEMIES[lvl].name} 👊`:'Final boss incoming... 😈',W/2,H*0.44);
      }

      // Win screen
      if(ph==='win'){
        const wg=ctx.createLinearGradient(0,0,0,H);wg.addColorStop(0,'#1e1b4b');wg.addColorStop(1,'#312e81');
        ctx.fillStyle=wg; ctx.fillRect(0,0,W,H);
        for(let i=0;i<10;i++){
          const fx=W*(0.08+i*0.19%0.9), fy=H*(0.08+i*0.13%0.5);
          const fp=(t*1.8+i*0.7)%(Math.PI*2), fr=Math.sin(fp)*H*0.09;
          for(let j=0;j<12;j++){const fa=(j/12)*Math.PI*2;ctx.globalAlpha=Math.max(0,Math.cos(fp)*0.9);ctx.fillStyle=['#ffd700','#4ade80','#f472b6','#60a5fa','#fb923c'][i%5];ctx.beginPath();ctx.arc(fx+Math.cos(fa)*fr,fy+Math.sin(fa)*fr,3,0,Math.PI*2);ctx.fill();}
        }
        ctx.globalAlpha=1;
        ctx.fillStyle='#ffd700';ctx.font=`bold ${Math.min(sz*0.72,46)}px sans-serif`;ctx.textAlign='center';ctx.fillText('🐢 YOU WIN! 🐢',W/2,H*0.28);
        ctx.fillStyle='white';ctx.font=`${Math.min(sz*0.46,28)}px sans-serif`;ctx.fillText('Shredder is defeated!',W/2,H*0.42);
        ctx.fillStyle='#86efac';ctx.font=`bold ${Math.min(sz*0.5,30)}px sans-serif`;ctx.fillText(`Final Score: ${scoreRef.current}`,W/2,H*0.55);
      }

      // Start screen art (deco)
      if(ph==='start'){
        ctx.fillStyle='rgba(74,222,128,0.05)';ctx.beginPath();ctx.arc(W*0.2,H*0.6,H*0.3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(124,58,237,0.05)';ctx.beginPath();ctx.arc(W*0.8,H*0.6,H*0.3,0,Math.PI*2);ctx.fill();
        const sdz=Math.min(W*0.14,H*0.3);
        drawLeo(W*0.22,H*0.7,sdz,t,'idle');
        drawEnemy(W*0.78,H*0.7,sdz,t,'idle',0);
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
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',overflow:'hidden',background:'#0f0f1a',userSelect:'none',WebkitUserSelect:'none' as 'none',fontFamily:"system-ui,sans-serif"}}>

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 14px',background:'#1a1a2e',borderBottom:'2px solid #3b82f6',flexShrink:0}}>
        <div style={{color:'#4ade80',fontWeight:'bold',fontSize:13}}>🐢 Leonardo</div>
        <div style={{color:'white',fontWeight:'bold',fontSize:15,textAlign:'center'}}>
          {phase==='start'?'Ninja Turtles Math!':`Level ${level}/10 — ${enemy.name}`}
        </div>
        <div style={{color:'#fbbf24',fontWeight:'bold',fontSize:13}}>⭐ {score}</div>
      </div>

      {/* ── Enemy HP bar ── */}
      {isActive&&(
        <div style={{padding:'5px 14px 0',flexShrink:0}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:3,display:'flex',justifyContent:'space-between'}}>
            <span>{enemy.name}</span><span>{eHp}/{enemy.hp} HP</span>
          </div>
          <div style={{height:9,background:'rgba(255,255,255,0.1)',borderRadius:5,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(eHp/enemy.hp)*100}%`,background:enemy.boss?'linear-gradient(90deg,#7c3aed,#dc2626)':`linear-gradient(90deg,${enemy.color},${enemy.color}88)`,transition:'width 0.3s ease',borderRadius:5}}/>
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      <canvas ref={cvs} style={{flex:'1 1 auto',width:'100%',minHeight:0,display:'block'}}/>

      {/* ── Question + Buttons ── */}
      {isActive&&(
        <div style={{flexShrink:0,padding:'8px 12px 14px',background:'#1a1a2e',borderTop:'2px solid #3b82f6'}}>
          {q.isPower&&(
            <div style={{textAlign:'center',marginBottom:6,background:'linear-gradient(90deg,#f59e0b,#fbbf24)',color:'#000',fontWeight:'bold',fontSize:12,borderRadius:20,padding:'3px 0',width:'100%'}}>
              ⭐ POWER QUESTION — Answer for DOUBLE DAMAGE! ⭐
            </div>
          )}
          <div style={{textAlign:'center',color:'white',fontSize:'clamp(26px,6.5vw,42px)',fontWeight:'bold',letterSpacing:2,marginBottom:8,textShadow:q.isPower?'0 0 18px #fbbf24':'none'}}>
            {q.text}
          </div>
          {fb&&(
            <div style={{textAlign:'center',marginBottom:7,fontSize:14,fontWeight:'bold',color:phase==='miss'?'#f87171':'#4ade80'}}>
              {fb}
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {q.choices.map((c,i)=>(
              <button key={`${q.text}-${i}`} onClick={()=>answer(c)} disabled={phase!=='idle'}
                style={{padding:'15px 8px',fontSize:'clamp(22px,5.5vw,34px)',fontWeight:'bold',border:'2px solid rgba(255,255,255,0.18)',borderRadius:12,cursor:phase==='idle'?'pointer':'default',background:phase!=='idle'?'rgba(255,255,255,0.04)':btnColors[i],color:'white',opacity:phase!=='idle'?0.55:1,touchAction:'manipulation',WebkitTapHighlightColor:'transparent',transition:'transform 0.08s,opacity 0.15s'}}
                onPointerDown={e=>{if(phase==='idle')(e.currentTarget as HTMLButtonElement).style.transform='scale(0.93)';}}
                onPointerUp={e=>{(e.currentTarget as HTMLButtonElement).style.transform='scale(1)';}}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Start screen overlay ── */}
      {phase==='start'&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.82)',padding:24,gap:14}}>
          <div style={{fontSize:'clamp(30px,7.5vw,52px)',fontWeight:'bold',color:'#4ade80',textAlign:'center',lineHeight:1.18,textShadow:'0 0 30px rgba(74,222,128,0.5)'}}>
            🐢 NINJA TURTLES<br/>MATH! 🐢
          </div>
          <div style={{color:'rgba(255,255,255,0.7)',textAlign:'center',fontSize:'clamp(13px,3.2vw,17px)',maxWidth:340}}>
            Help Leonardo defeat the Foot Clan by answering math questions!
          </div>
          <div style={{background:'rgba(251,191,36,0.15)',border:'1px solid #fbbf24',borderRadius:10,padding:'8px 18px',color:'#fbbf24',fontSize:'clamp(12px,2.8vw,14px)',textAlign:'center'}}>
            ⭐ Power Questions do <strong>DOUBLE DAMAGE</strong>
          </div>
          <button onClick={()=>{ setPhase('idle'); setQ(genQ(1)); }}
            style={{padding:'16px 52px',fontSize:'clamp(18px,4.5vw,26px)',fontWeight:'bold',background:'linear-gradient(135deg,#16a34a,#4ade80)',color:'white',border:'none',borderRadius:16,cursor:'pointer',boxShadow:'0 0 28px rgba(74,222,128,0.45)',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}}>
            🥋 START!
          </button>
          <div style={{color:'rgba(255,255,255,0.35)',fontSize:11,textAlign:'center'}}>
            10 levels · Defeat Shredder to win!
          </div>
        </div>
      )}

      {/* ── Win screen play again button ── */}
      {phase==='win'&&(
        <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',justifyContent:'center',padding:28}}>
          <button onClick={()=>{setPhase('start');setLevel(1);setEHp(ENEMIES[0].hp);setScore(0);setQ(genQ(1));locked.current=false;}}
            style={{padding:'16px 44px',fontSize:'clamp(16px,4vw,24px)',fontWeight:'bold',background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',color:'white',border:'none',borderRadius:16,cursor:'pointer',boxShadow:'0 0 28px rgba(59,130,246,0.45)',touchAction:'manipulation'}}>
            🔄 Play Again!
          </button>
        </div>
      )}
    </div>
  );
}
