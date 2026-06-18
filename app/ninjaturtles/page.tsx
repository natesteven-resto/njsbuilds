'use client';
import { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════
   NINJA TURTLES MATH — v2: Pixar Cinematic Edition
   • Pixar-style gradients, rim lighting, catchlights
   • Enemies attack on wrong answer
   • 60-second timer per level or Leo gets hit
   • Leo has 5 HP (hearts), game over at 0
   ═══════════════════════════════════════════════════ */

const ENEMIES = [
  { name:'Foot Ninja',    hp:3, atk:1, color:'#7c3aed', dark:'#2e1065', v:'ninja'    },
  { name:'Foot Soldier',  hp:3, atk:1, color:'#6d28d9', dark:'#1e0a4a', v:'ninja'    },
  { name:'Foot Scout',    hp:4, atk:1, color:'#4f46e5', dark:'#1e1a6e', v:'ninja'    },
  { name:'Foot Elite',    hp:4, atk:1, color:'#1d4ed8', dark:'#0a1a5a', v:'ninja'    },
  { name:'Foot Captain',  hp:4, atk:1, color:'#0e7490', dark:'#042432', v:'big'      },
  { name:'Foot General',  hp:5, atk:1, color:'#b45309', dark:'#3a1800', v:'big'      },
  { name:'Bebop',         hp:5, atk:2, color:'#db2777', dark:'#4a0025', v:'bebop'    },
  { name:'Rocksteady',    hp:5, atk:2, color:'#92400e', dark:'#301000', v:'rock'     },
  { name:'Krang',         hp:6, atk:2, color:'#be185d', dark:'#4a002a', v:'krang'    },
  { name:'Shredder',      hp:8, atk:3, color:'#6b21a8', dark:'#1a0035', v:'shredder', boss:true },
];

const LEO_MAX_HP  = 5;
const LEVEL_TIME  = 60;

type EnemyVariant = 'ninja'|'big'|'bebop'|'rock'|'krang'|'shredder';
type Phase = 'start'|'idle'|'attack'|'special'|'miss'|'enemyatk'|'levelup'|'win'|'over';

function genQ(level: number) {
  const isPower = Math.random() < 0.25;
  const [mxA,mxB,canSub] =
    level<=2?[3,3,false]:level<=4?[6,6,false]:
    level<=6?[10,10,false]:level<=8?[10,8,true]:[12,10,true];
  const bA=Math.min(mxA+(isPower?3:0),15), bB=Math.min(mxB+(isPower?3:0),15);
  const a=1+Math.floor(Math.random()*bA), b=1+Math.floor(Math.random()*bB);
  const sub=canSub&&Math.random()>0.5&&a>b;
  const ans=sub?a-b:a+b;
  const wr=new Set<number>();
  for(let i=0;i<100&&wr.size<3;i++){const d=Math.floor(Math.random()*6)-3;const w=ans+d;if(d!==0&&w>=0)wr.add(w);}
  for(let f=1;wr.size<3;f++) if(ans+f!==ans)wr.add(ans+f);
  return {text:`${sub?Math.max(a,b):a} ${sub?'−':'+'} ${sub?Math.min(a,b):b} = ?`,answer:ans,choices:[ans,...wr].sort(()=>Math.random()-0.5),isPower};
}

export default function NinjaTurtles() {
  const [phase,setPhase]=useState<Phase>('start');
  const [level,setLevel]=useState(1);
  const [eHp,setEHp]=useState<number>(ENEMIES[0].hp);
  const [lHp,setLHp]=useState<number>(LEO_MAX_HP);
  const [q,setQ]=useState(()=>genQ(1));
  const [fb,setFb]=useState('');
  const [score,setScore]=useState(0);
  const [timer,setTimer]=useState<number>(LEVEL_TIME);

  const cvs=useRef<HTMLCanvasElement>(null);
  const phRef=useRef<Phase>('start'); const phStart=useRef(0);
  const lvRef=useRef(1); const eHpRef=useRef<number>(ENEMIES[0].hp);
  const lHpRef=useRef<number>(LEO_MAX_HP); const scRef=useRef(0);
  const tmRef=useRef<number>(LEVEL_TIME); const lkRef=useRef(false);
  const timerInt=useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(()=>{phRef.current=phase;phStart.current=performance.now();},[phase]);
  useEffect(()=>{lvRef.current=level;},[level]);
  useEffect(()=>{eHpRef.current=eHp;},[eHp]);
  useEffect(()=>{lHpRef.current=lHp;},[lHp]);
  useEffect(()=>{scRef.current=score;},[score]);
  useEffect(()=>{tmRef.current=timer;},[timer]);

  // Countdown timer
  useEffect(()=>{
    const active=phase==='idle'||phase==='attack'||phase==='special'||phase==='miss'||phase==='enemyatk';
    if(active){
      if(!timerInt.current){
        timerInt.current=setInterval(()=>{
          const nt=tmRef.current-1;
          setTimer(nt); tmRef.current=nt;
          if(nt<=0){
            clearInterval(timerInt.current!); timerInt.current=null;
            lkRef.current=true;
            // Time's up — enemy attacks
            setPhase('enemyatk'); phStart.current=performance.now();
            setFb("⏱ Time's up! Enemy attacks!");
            setTimeout(()=>{
              const nh=Math.max(0,lHpRef.current-ENEMIES[Math.min(lvRef.current-1,9)].atk);
              setLHp(nh);
              if(nh<=0){setPhase('over');}
              else{setTimer(LEVEL_TIME);tmRef.current=LEVEL_TIME;lkRef.current=false;setQ(genQ(lvRef.current));setFb('');setPhase('idle');}
            },1000);
          }
        },1000);
      }
    } else {
      if(timerInt.current){clearInterval(timerInt.current);timerInt.current=null;}
    }
    return()=>{if(timerInt.current){clearInterval(timerInt.current);timerInt.current=null;}};
  },[phase]);

  const doEnemyAtk=(dmg:number,cb:()=>void)=>{
    setPhase('enemyatk'); phStart.current=performance.now();
    setTimeout(()=>{const nh=Math.max(0,lHpRef.current-dmg);setLHp(nh);if(nh<=0){lkRef.current=true;setPhase('over');}else cb();},900);
  };

  const nextQ=(lvl=lvRef.current)=>{lkRef.current=false;setQ(genQ(lvl));setFb('');setPhase('idle');};

  const answer=(c:number)=>{
    if(lkRef.current||phRef.current!=='idle')return;
    lkRef.current=true;
    if(c===q.answer){
      const sp=q.isPower,dmg=sp?2:1;
      setScore(s=>s+(sp?20:10)*lvRef.current);
      setFb(sp?'⭐ POWER STRIKE! Double damage!':'✅ Hit!');
      setPhase(sp?'special':'attack'); phStart.current=performance.now();
      const nh=Math.max(0,eHpRef.current-dmg); setEHp(nh);
      if(nh<=0){
        setTimeout(()=>{
          if(timerInt.current){clearInterval(timerInt.current);timerInt.current=null;}
          if(lvRef.current>=10){setPhase('win');}
          else{setPhase('levelup');setTimeout(()=>{const nl=lvRef.current+1;setLevel(nl);setEHp(ENEMIES[nl-1].hp);setTimer(LEVEL_TIME);tmRef.current=LEVEL_TIME;nextQ(nl);},2800);}
        },1100);
      }else{setTimeout(()=>nextQ(),850);}
    }else{
      setFb(`❌ The answer was ${q.answer}!`);
      const ei=Math.min(lvRef.current-1,9);
      setTimeout(()=>doEnemyAtk(ENEMIES[ei].atk,()=>{setFb('');nextQ();}),350);
    }
  };

  // ── Canvas ──────────────────────────────────────────────
  useEffect(()=>{
    const canvas=cvs.current; if(!canvas)return;
    const ctx=canvas.getContext('2d')!;
    let raf=0,live=true;
    const resize=()=>{canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;};
    resize(); const ro=new ResizeObserver(resize); ro.observe(canvas);

    function bg(W:number,H:number,t:number){
      // Sky
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#08041a');sky.addColorStop(0.6,'#0d082e');sky.addColorStop(1,'#16103c');
      ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      // Ooze fog
      const fog=ctx.createRadialGradient(W*.5,H,0,W*.5,H,H*.75);fog.addColorStop(0,'rgba(30,80,20,0.3)');fog.addColorStop(1,'transparent');
      ctx.fillStyle=fog;ctx.fillRect(0,0,W,H);
      // Pipes
      ctx.strokeStyle='rgba(45,45,80,0.65)';ctx.lineWidth=H*.042;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(W*.08,0);ctx.lineTo(W*.08,H*.66);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W*.06,H*.66);ctx.lineTo(W*.19,H*.66);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W*.92,0);ctx.lineTo(W*.92,H*.66);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W*.81,H*.66);ctx.lineTo(W*.94,H*.66);ctx.stroke();
      ctx.strokeStyle='rgba(80,200,80,0.07)';ctx.lineWidth=H*.08;
      ctx.beginPath();ctx.moveTo(W*.08,0);ctx.lineTo(W*.08,H*.66);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W*.92,0);ctx.lineTo(W*.92,H*.66);ctx.stroke();
      // Ground
      const g=ctx.createLinearGradient(0,H*.7,0,H);g.addColorStop(0,'#1a1832');g.addColorStop(1,'#08061a');
      ctx.fillStyle=g;ctx.fillRect(0,H*.7,W,H*.3);
      ctx.strokeStyle='rgba(70,70,150,0.55)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,H*.7);ctx.lineTo(W,H*.7);ctx.stroke();
      // Bricks
      const bh=Math.max(7,H*.036),bw=bh*2.7;ctx.strokeStyle='rgba(55,55,120,0.25)';ctx.lineWidth=1;
      for(let y=H*.7;y<H;y+=bh){const r=Math.floor((y-H*.7)/bh);const off=(r%2)*bw/2;for(let x=-off;x<W+bw;x+=bw)ctx.strokeRect(x,y,bw,bh);}
      // Ooze puddles
      [[.35,.98],[.6,.96],[.15,.94]].forEach(([px,py])=>{
        const og=ctx.createRadialGradient(W*px,H*py,0,W*px,H*py,W*.06);
        og.addColorStop(0,`rgba(40,180,40,${.3+Math.sin(t*.5)*.05})`);og.addColorStop(1,'transparent');
        ctx.fillStyle=og;ctx.beginPath();ctx.ellipse(W*px,H*py,W*.06,H*.013,0,0,Math.PI*2);ctx.fill();
      });
      // Drips
      for(let i=0;i<5;i++){const dx=W*(0.12+i*.18);const dy=(t*18*(1+i*.35))%(H*.68);ctx.fillStyle='rgba(30,160,30,0.15)';ctx.beginPath();ctx.arc(dx,dy,1.8,0,Math.PI*2);ctx.fill();}
    }

    function leo(cx:number,cy:number,sz:number,t:number,ph:Phase){
      const el=(performance.now()-phStart.current)/1000;
      const bob=Math.sin(t*2.1)*sz*.03;
      const atkX=(ph==='attack'||ph==='special')&&el<.5?Math.sin(el*Math.PI*2)*sz*.7:0;
      const mX=(ph==='miss'||ph==='enemyatk')&&el<.6?Math.sin(el*22)*sz*.07:0;
      ctx.save();ctx.translate(cx+atkX+mX,cy+bob);

      // Rim light
      ctx.save();ctx.globalAlpha=.18;
      const rl=ctx.createRadialGradient(0,-sz*.3,0,0,-sz*.3,sz*1.1);rl.addColorStop(.7,'rgba(100,200,255,0)');rl.addColorStop(1,'rgba(100,200,255,.8)');
      ctx.fillStyle=rl;ctx.beginPath();ctx.arc(0,-sz*.2,sz*1.2,0,Math.PI*2);ctx.fill();ctx.restore();
      // Shadow
      ctx.save();ctx.globalAlpha=.32;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(sz*.05,sz*.09,sz*.5,sz*.1,0,0,Math.PI*2);ctx.fill();ctx.restore();

      // Shell
      const shG=ctx.createRadialGradient(-sz*.08,-sz*.2,0,-sz*.08,-sz*.2,sz*.4);shG.addColorStop(0,'#a16207');shG.addColorStop(.5,'#78350f');shG.addColorStop(1,'#3f1802');
      ctx.fillStyle=shG;ctx.beginPath();ctx.ellipse(-sz*.1,-sz*.2,sz*.32,sz*.27,-.3,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(180,130,40,.38)';ctx.lineWidth=1;
      for(let i=-1;i<=1;i++)for(let j=0;j<=1;j++){ctx.beginPath();ctx.arc(-sz*.1+i*sz*.14,-sz*.2+j*sz*.18-sz*.09,sz*.06,0,Math.PI*2);ctx.stroke();}

      // Body
      const bG=ctx.createRadialGradient(sz*.06,-sz*.05,0,sz*.06,-sz*.05,sz*.45);bG.addColorStop(0,'#6ee7a0');bG.addColorStop(.5,'#4ade80');bG.addColorStop(1,'#15803d');
      ctx.fillStyle=bG;ctx.beginPath();ctx.ellipse(0,0,sz*.3,sz*.36,0,0,Math.PI*2);ctx.fill();
      // Plastron
      const pG=ctx.createRadialGradient(sz*.05,sz*.02,0,sz*.05,sz*.02,sz*.28);pG.addColorStop(0,'#bbf7d0');pG.addColorStop(1,'#86efac');
      ctx.fillStyle=pG;ctx.beginPath();ctx.ellipse(sz*.04,sz*.02,sz*.19,sz*.26,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(100,200,140,.3)';ctx.lineWidth=1;
      for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*sz*.08,-sz*.15);ctx.lineTo(i*sz*.08,sz*.2);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(-sz*.19,0);ctx.lineTo(sz*.19,0);ctx.stroke();

      // Head (Pixar big!)
      const hG=ctx.createRadialGradient(sz*.28,-sz*.52,0,sz*.28,-sz*.52,sz*.32);hG.addColorStop(0,'#6ee7a0');hG.addColorStop(.6,'#4ade80');hG.addColorStop(1,'#166534');
      ctx.fillStyle=hG;ctx.beginPath();ctx.arc(sz*.26,-sz*.48,sz*.25,0,Math.PI*2);ctx.fill();
      // Mask
      const mG=ctx.createLinearGradient(sz*.06,-sz*.52,sz*.46,-sz*.44);mG.addColorStop(0,'#1d4ed8');mG.addColorStop(.5,'#3b82f6');mG.addColorStop(1,'#1d4ed8');
      ctx.fillStyle=mG;ctx.beginPath();ctx.ellipse(sz*.26,-sz*.5,sz*.25,sz*.085,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(200,230,255,.22)';ctx.beginPath();ctx.ellipse(sz*.22,-sz*.515,sz*.1,sz*.035,0,0,Math.PI*2);ctx.fill();
      // Mask tails
      ctx.strokeStyle='#2563eb';ctx.lineWidth=sz*.046;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(sz*.43,-sz*.5);ctx.bezierCurveTo(sz*.58,-sz*.48,sz*.65,-sz*.42,sz*.7,-sz*.36);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sz*.43,-sz*.5);ctx.bezierCurveTo(sz*.6,-sz*.55,sz*.68,-sz*.6,sz*.72,-sz*.68);ctx.stroke();
      // Eyes (Pixar magic — big irises, catchlights!)
      ctx.fillStyle='white';ctx.beginPath();ctx.ellipse(sz*.17,-sz*.5,sz*.075,sz*.065,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(sz*.35,-sz*.5,sz*.075,sz*.065,0,0,Math.PI*2);ctx.fill();
      const iG1=ctx.createRadialGradient(sz*.17,-sz*.5,0,sz*.17,-sz*.5,sz*.055);iG1.addColorStop(0,'#60a5fa');iG1.addColorStop(1,'#1e40af');ctx.fillStyle=iG1;ctx.beginPath();ctx.arc(sz*.19,-sz*.5,sz*.048,0,Math.PI*2);ctx.fill();
      const iG2=ctx.createRadialGradient(sz*.35,-sz*.5,0,sz*.35,-sz*.5,sz*.055);iG2.addColorStop(0,'#60a5fa');iG2.addColorStop(1,'#1e40af');ctx.fillStyle=iG2;ctx.beginPath();ctx.arc(sz*.37,-sz*.5,sz*.048,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(sz*.2,-sz*.5,sz*.028,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(sz*.38,-sz*.5,sz*.028,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='white';ctx.beginPath();ctx.arc(sz*.17,-sz*.52,sz*.015,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(sz*.35,-sz*.52,sz*.015,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(sz*.22,-sz*.48,sz*.008,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(sz*.4,-sz*.48,sz*.008,0,Math.PI*2);ctx.fill();
      // Smile
      ctx.strokeStyle='#166534';ctx.lineWidth=sz*.02;ctx.lineCap='round';ctx.beginPath();ctx.arc(sz*.26,-sz*.38,sz*.05,.1,Math.PI-.1);ctx.stroke();

      // Arm + ninjato
      const aa=(ph==='attack'||ph==='special')?-.7:.2;
      ctx.save();ctx.translate(sz*.08,-sz*.1);ctx.rotate(aa);
      const aG=ctx.createRadialGradient(0,sz*.15,0,0,sz*.15,sz*.18);aG.addColorStop(0,'#6ee7a0');aG.addColorStop(1,'#15803d');ctx.fillStyle=aG;ctx.beginPath();ctx.ellipse(0,sz*.18,sz*.075,sz*.17,0,0,Math.PI*2);ctx.fill();
      const blG=ctx.createLinearGradient(0,sz*.28,sz*.56,sz*.04);blG.addColorStop(0,'#94a3b8');blG.addColorStop(.3,'#f1f5f9');blG.addColorStop(.7,'#cbd5e1');blG.addColorStop(1,'#64748b');
      ctx.fillStyle=blG;ctx.beginPath();ctx.moveTo(-sz*.02,sz*.29);ctx.lineTo(sz*.02,sz*.26);ctx.lineTo(sz*.58,sz*.02);ctx.lineTo(sz*.54,sz*.06);ctx.closePath();ctx.fill();
      ctx.fillStyle='#92400e';ctx.beginPath();ctx.ellipse(-sz*.01,sz*.3,sz*.06,sz*.035,.4,0,Math.PI*2);ctx.fill();
      ctx.restore();

      // Legs
      const lG1=ctx.createRadialGradient(-sz*.1,sz*.36,0,-sz*.1,sz*.36,sz*.15);lG1.addColorStop(0,'#6ee7a0');lG1.addColorStop(1,'#15803d');ctx.fillStyle=lG1;ctx.beginPath();ctx.ellipse(-sz*.1,sz*.38,sz*.09,sz*.15,-.1,0,Math.PI*2);ctx.fill();
      const lG2=ctx.createRadialGradient(sz*.1,sz*.36,0,sz*.1,sz*.36,sz*.15);lG2.addColorStop(0,'#6ee7a0');lG2.addColorStop(1,'#15803d');ctx.fillStyle=lG2;ctx.beginPath();ctx.ellipse(sz*.1,sz*.38,sz*.09,sz*.15,.1,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#bbf7d0';ctx.beginPath();ctx.ellipse(-sz*.12,sz*.51,sz*.1,sz*.056,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(sz*.12,sz*.51,sz*.1,sz*.056,0,0,Math.PI*2);ctx.fill();

      // Hit flash
      if(ph==='enemyatk'&&el<.5){ctx.globalAlpha=Math.max(0,.5-el);ctx.fillStyle='rgba(255,60,60,.6)';ctx.beginPath();ctx.arc(sz*.1,-sz*.15,sz*.75,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      // Special aura
      if(ph==='special'&&el<.7){ctx.globalAlpha=Math.max(0,1-el/.7)*.75;['#93c5fd','#60a5fa','#3b82f6','#1d4ed8'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(-sz*(.26+i*.19),-sz*.04,sz*(.18-i*.035),0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;}
      ctx.restore();
    }

    function enemy(cx:number,cy:number,sz:number,t:number,ph:Phase,ei:number){
      const en=ENEMIES[ei],v=en.v,ec=en.color;
      const el=(performance.now()-phStart.current)/1000;
      const bob=-Math.sin(t*2.1+1)*sz*.025;
      const hX=(ph==='attack'||ph==='special')&&el<.5?-Math.sin(el*Math.PI*2)*sz*.3:0;
      const aX=ph==='enemyatk'&&el<.5?Math.sin(el*Math.PI*2)*sz*.4:0;
      const sc=v==='shredder'?1.25:v==='rock'?1.12:v==='bebop'?1.08:1;
      ctx.save();ctx.translate(cx+hX-aX,cy+bob);ctx.scale(sc,sc);
      const s=sz;

      // Rim light
      ctx.save();ctx.globalAlpha=.16;const rl2=ctx.createRadialGradient(0,-s*.3,0,0,-s*.3,s*1.1);rl2.addColorStop(.7,'rgba(255,80,80,0)');rl2.addColorStop(1,'rgba(255,100,100,.7)');ctx.fillStyle=rl2;ctx.beginPath();ctx.arc(0,-s*.2,s*1.2,0,Math.PI*2);ctx.fill();ctx.restore();
      // Shadow
      ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,s*.1,s*.45,s*.1,0,0,Math.PI*2);ctx.fill();ctx.restore();

      if(v==='shredder'){
        // Cape
        ctx.fillStyle='#4c1d95';ctx.beginPath();ctx.moveTo(-s*.44,-s*.55);ctx.bezierCurveTo(-s*.6,-s*.2,-s*.65,s*.2,-s*.58,s*.56);ctx.lineTo(s*.58,s*.56);ctx.bezierCurveTo(s*.65,s*.2,s*.6,-s*.2,s*.44,-s*.55);ctx.closePath();ctx.fill();
        ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.moveTo(-s*.44,-s*.55);ctx.lineTo(-s*.58,s*.56);ctx.lineTo(-s*.38,s*.56);ctx.closePath();ctx.fill();
        // Armor body
        const aG2=ctx.createRadialGradient(0,-s*.05,0,0,-s*.05,s*.4);aG2.addColorStop(0,'#6b7280');aG2.addColorStop(.6,'#374151');aG2.addColorStop(1,'#111827');ctx.fillStyle=aG2;ctx.beginPath();ctx.ellipse(0,-s*.05,s*.3,s*.38,0,0,Math.PI*2);ctx.fill();
        // Silver chest
        const cG=ctx.createRadialGradient(0,-s*.12,0,0,-s*.12,s*.28);cG.addColorStop(0,'#f3f4f6');cG.addColorStop(.4,'#d1d5db');cG.addColorStop(1,'#6b7280');ctx.fillStyle=cG;ctx.beginPath();ctx.ellipse(0,-s*.12,s*.24,s*.24,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.ellipse(-s*.05,-s*.2,s*.1,s*.07,.4,0,Math.PI*2);ctx.fill();
        // Chest spikes
        ctx.fillStyle='#9ca3af';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*s*.08,-s*.16);ctx.lineTo(i*s*.06,-s*.36);ctx.lineTo(i*s*.1,-s*.36);ctx.closePath();ctx.fill();}
        // Helmet
        ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(0,-s*.52,s*.24,0,Math.PI*2);ctx.fill();
        const hmG=ctx.createRadialGradient(-s*.05,-s*.58,0,-s*.05,-s*.58,s*.22);hmG.addColorStop(0,'#9ca3af');hmG.addColorStop(.5,'#6b7280');hmG.addColorStop(1,'#374151');ctx.fillStyle=hmG;ctx.beginPath();ctx.arc(0,-s*.5,s*.18,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.ellipse(-s*.04,-s*.56,s*.07,s*.04,.5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#9ca3af';ctx.beginPath();ctx.moveTo(-s*.22,-s*.6);ctx.lineTo(-s*.44,-s*.86);ctx.lineTo(-s*.15,-s*.65);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(s*.22,-s*.6);ctx.lineTo(s*.44,-s*.86);ctx.lineTo(s*.15,-s*.65);ctx.closePath();ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.moveTo(-s*.28,-s*.63);ctx.lineTo(-s*.4,-s*.82);ctx.lineTo(-s*.24,-s*.68);ctx.closePath();ctx.fill();
        // Eyes
        const eG=ctx.createRadialGradient(0,-s*.51,0,0,-s*.51,s*.15);eG.addColorStop(0,'rgba(239,68,68,.55)');eG.addColorStop(1,'transparent');ctx.fillStyle=eG;ctx.beginPath();ctx.arc(0,-s*.51,s*.15,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(-s*.07,-s*.51,s*.048,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(s*.07,-s*.51,s*.048,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(252,165,165,.8)';ctx.beginPath();ctx.arc(-s*.065,-s*.52,s*.015,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(s*.075,-s*.52,s*.015,0,Math.PI*2);ctx.fill();
        // Arms
        ctx.strokeStyle='#374151';ctx.lineWidth=s*.13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-s*.28,-s*.22);ctx.lineTo(-s*.46,s*.12);ctx.stroke();ctx.beginPath();ctx.moveTo(s*.28,-s*.22);ctx.lineTo(s*.46,s*.12);ctx.stroke();
        ctx.strokeStyle='#9ca3af';ctx.lineWidth=s*.038;for(let i=0;i<4;i++){const bx=-s*.46+i*s*.055,by=s*.12-i*s*.06;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx-s*.16,by-s*.19);ctx.stroke();}
        ctx.fillStyle='#1f2937';ctx.beginPath();ctx.ellipse(-s*.12,s*.42,s*.12,s*.2,-.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(s*.12,s*.42,s*.12,s*.2,.1,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#374151';ctx.beginPath();ctx.ellipse(-s*.14,s*.57,s*.1,s*.055,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(s*.14,s*.57,s*.1,s*.055,0,0,Math.PI*2);ctx.fill();

      } else if(v==='krang'){
        ctx.fillStyle='#374151';ctx.beginPath();ctx.ellipse(0,s*.04,s*.27,s*.34,0,0,Math.PI*2);ctx.fill();
        const rG=ctx.createRadialGradient(0,0,0,0,0,s*.25);rG.addColorStop(0,'#9ca3af');rG.addColorStop(1,'#4b5563');ctx.fillStyle=rG;ctx.beginPath();ctx.ellipse(0,0,s*.22,s*.22,0,0,Math.PI*2);ctx.fill();
        const brG=ctx.createRadialGradient(-s*.04,-s*.42,0,-s*.04,-s*.42,s*.28);brG.addColorStop(0,'rgba(249,168,212,.95)');brG.addColorStop(.5,'rgba(236,72,153,.8)');brG.addColorStop(1,'rgba(157,23,77,.6)');ctx.fillStyle=brG;ctx.beginPath();ctx.arc(0,-s*.38,s*.26,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(200,100,150,.4)';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(0,-s*.38,s*(.06+i*.04),.1,Math.PI-.1);ctx.stroke();}
        ctx.fillStyle='#f9a8d4';ctx.beginPath();ctx.arc(-s*.07,-s*.4,s*.04,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(s*.07,-s*.4,s*.04,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#111';ctx.beginPath();ctx.arc(-s*.06,-s*.39,s*.022,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(s*.08,-s*.39,s*.022,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#f9a8d4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-s*.3,s*.06,.2,Math.PI-.2);ctx.stroke();
        ctx.strokeStyle='#9ca3af';ctx.lineWidth=s*.1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-s*.25,-s*.1);ctx.lineTo(-s*.44,s*.14);ctx.stroke();ctx.beginPath();ctx.moveTo(s*.25,-s*.1);ctx.lineTo(s*.44,s*.14);ctx.stroke();
        ctx.fillStyle='#374151';ctx.beginPath();ctx.ellipse(-s*.1,s*.39,s*.1,s*.18,-.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(s*.1,s*.39,s*.1,s*.18,.1,0,Math.PI*2);ctx.fill();

      } else {
        const hSz=v==='rock'?s*.23:v==='bebop'?s*.21:s*.2;
        const bdG=ctx.createRadialGradient(0,-s*.04,0,0,-s*.04,s*.38);bdG.addColorStop(0,ec+'dd');bdG.addColorStop(.6,ec);bdG.addColorStop(1,en.dark);ctx.fillStyle=bdG;ctx.beginPath();ctx.ellipse(0,-s*.04,s*.27,s*.33,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(-s*.27,-s*.04,s*.54,s*.065);
        const hdG=ctx.createRadialGradient(-s*.04,-s*.5,0,-s*.04,-s*.5,hSz*1.2);hdG.addColorStop(0,'#374151');hdG.addColorStop(.6,'#1f2937');hdG.addColorStop(1,'#111827');ctx.fillStyle=hdG;ctx.beginPath();ctx.arc(0,-s*.45,hSz,0,Math.PI*2);ctx.fill();
        if(v==='bebop'){
          const mhG=ctx.createLinearGradient(0,-s*.6,0,-s*.9);mhG.addColorStop(0,'#ec4899');mhG.addColorStop(1,'#be185d');ctx.fillStyle=mhG;ctx.beginPath();ctx.moveTo(-s*.055,-s*.62);ctx.bezierCurveTo(-s*.08,-s*.78,s*.08,-s*.78,s*.055,-s*.62);ctx.bezierCurveTo(s*.04,-s*.82,s*.01,-s*.88,0,-s*.88);ctx.bezierCurveTo(-s*.01,-s*.88,-s*.04,-s*.82,-s*.055,-s*.62);ctx.closePath();ctx.fill();
          ctx.fillStyle='rgba(255,200,220,.3)';ctx.beginPath();ctx.moveTo(-s*.02,-s*.64);ctx.lineTo(0,-s*.85);ctx.lineTo(s*.02,-s*.64);ctx.closePath();ctx.fill();
          ctx.fillStyle='rgba(0,0,0,.8)';ctx.beginPath();ctx.ellipse(-s*.07,-s*.47,s*.065,s*.04,.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(s*.07,-s*.47,s*.065,s*.04,-.1,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#fbbf24';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-s*.005,-s*.47);ctx.lineTo(s*.005,-s*.47);ctx.stroke();
        } else if(v==='rock'){
          const hnG=ctx.createLinearGradient(s*.22,-s*.48,s*.22,-s*.82);hnG.addColorStop(0,'#d97706');hnG.addColorStop(1,'#78350f');ctx.fillStyle=hnG;ctx.beginPath();ctx.moveTo(s*.14,-s*.56);ctx.bezierCurveTo(s*.18,-s*.7,s*.28,-s*.78,s*.3,-s*.86);ctx.bezierCurveTo(s*.32,-s*.78,s*.3,-s*.64,s*.26,-s*.56);ctx.closePath();ctx.fill();
          ctx.fillStyle='rgba(255,200,100,.2)';ctx.beginPath();ctx.moveTo(s*.16,-s*.58);ctx.lineTo(s*.3,-s*.84);ctx.lineTo(s*.22,-s*.6);ctx.closePath();ctx.fill();
          ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(-s*.07,-s*.47,s*.045,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(s*.07,-s*.47,s*.045,0,Math.PI*2);ctx.fill();
        } else {
          const eyG=ctx.createRadialGradient(0,-s*.47,0,0,-s*.47,s*.12);eyG.addColorStop(0,'rgba(239,68,68,.5)');eyG.addColorStop(1,'transparent');ctx.fillStyle=eyG;ctx.beginPath();ctx.arc(0,-s*.47,s*.12,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(-s*.065,-s*.47,s*.042,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(s*.065,-s*.47,s*.042,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='rgba(252,165,165,.7)';ctx.beginPath();ctx.arc(-s*.055,-s*.485,s*.013,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(s*.075,-s*.485,s*.013,0,Math.PI*2);ctx.fill();
        }
        ctx.strokeStyle=en.dark;ctx.lineWidth=s*.1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(s*.24,-s*.18);ctx.lineTo(s*.4,s*.06);ctx.stroke();ctx.beginPath();ctx.moveTo(-s*.24,-s*.18);ctx.lineTo(-s*.38,-s*.34);ctx.stroke();
        const ktG=ctx.createLinearGradient(-s*.38,-s*.34,-s*.62,-s*.64);ktG.addColorStop(0,'#9ca3af');ktG.addColorStop(.4,'#f8fafc');ktG.addColorStop(1,'#64748b');ctx.fillStyle=ktG;ctx.beginPath();ctx.moveTo(-s*.34,-s*.34);ctx.lineTo(-s*.42,-s*.34);ctx.lineTo(-s*.66,-s*.66);ctx.lineTo(-s*.58,-s*.66);ctx.closePath();ctx.fill();
        ctx.fillStyle=ec;ctx.beginPath();ctx.ellipse(-s*.1,s*.37,s*.1,s*.17,-.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(s*.1,s*.37,s*.1,s*.17,.1,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=en.dark;ctx.beginPath();ctx.ellipse(-s*.12,s*.5,s*.09,s*.05,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(s*.12,s*.5,s*.09,s*.05,0,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }

    function fx(W:number,H:number,ph:Phase,lv:number,sz:number,gy:number,t:number){
      const el=(performance.now()-phStart.current)/1000;

      if(ph==='attack'||ph==='special'){
        const a=Math.max(0,1-el*1.6);
        if(ph==='special'){
          ctx.globalAlpha=Math.max(0,.28-el*.5);ctx.fillStyle='rgba(59,130,246,.15)';ctx.fillRect(0,0,W,H);ctx.globalAlpha=a;
          const ag=ctx.createRadialGradient(W*.2,gy,sz*.05,W*.2,gy,sz*.85);ag.addColorStop(0,'rgba(96,165,250,.5)');ag.addColorStop(.6,'rgba(59,130,246,.2)');ag.addColorStop(1,'transparent');ctx.fillStyle=ag;ctx.beginPath();ctx.arc(W*.2,gy,sz*.85,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle=`rgba(250,204,21,${a*.9})`;ctx.lineWidth=sz*.05;ctx.lineCap='round';for(let i=0;i<10;i++){const ang=i/10*Math.PI*2+el*2,r=el*sz*1.8;ctx.beginPath();ctx.moveTo(W*.8+Math.cos(ang)*sz*.1,gy+Math.sin(ang)*sz*.08);ctx.lineTo(W*.8+Math.cos(ang)*r,gy+Math.sin(ang)*r*.45);ctx.stroke();}
          ctx.strokeStyle=`rgba(251,191,36,${a})`;ctx.lineWidth=sz*.09;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(W*.68,gy-sz*.58);ctx.lineTo(W*.9,gy+sz*.25);ctx.stroke();ctx.beginPath();ctx.moveTo(W*.88,gy-sz*.58);ctx.lineTo(W*.68,gy+sz*.25);ctx.stroke();ctx.globalAlpha=1;
        } else {
          ctx.globalAlpha=a;ctx.strokeStyle='#4ade80';ctx.lineWidth=sz*.065;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(W*.64,gy-sz*.5);ctx.lineTo(W*.87,gy+sz*.18);ctx.stroke();ctx.globalAlpha=1;
        }
        const pc=ph==='special'?20:12;
        for(let i=0;i<pc;i++){const ang=(i/pc)*Math.PI*2+(ph==='special'?el*3:0),r=el*sz*(ph==='special'?2.2:1.6);ctx.globalAlpha=Math.max(0,a*.85);ctx.fillStyle=ph==='special'?(i%3===0?'#fbbf24':i%3===1?'#60a5fa':'white'):'#4ade80';ctx.beginPath();ctx.arc(W*.8+Math.cos(ang)*r,gy+Math.sin(ang)*r*.4,ph==='special'?6:4.5,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
      }

      if(ph==='enemyatk'&&el<.9){
        const a=Math.max(0,1-el/.8);
        ctx.globalAlpha=a*.28;ctx.fillStyle='rgba(239,68,68,.4)';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
        ctx.globalAlpha=a;ctx.strokeStyle='#ef4444';ctx.lineWidth=sz*.07;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(W*.42,gy-sz*.48);ctx.lineTo(W*.18,gy+sz*.22);ctx.stroke();ctx.beginPath();ctx.moveTo(W*.38,gy-sz*.5);ctx.lineTo(W*.14,gy+sz*.2);ctx.stroke();ctx.globalAlpha=1;
        for(let i=0;i<10;i++){const ang=(i/10)*Math.PI*2,r=el*sz*1.3;ctx.globalAlpha=Math.max(0,a*.8);ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(W*.2+Math.cos(ang)*r,gy+Math.sin(ang)*r*.4,4,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
      }

      if(ph==='levelup'){
        for(let i=0;i<40;i++){const px=((W*(i*47+t*100))%W+W)%W,py=((t*65*((i%3)+1)*25+i*H/40))%H;ctx.fillStyle=['#ffd700','#4ade80','#3b82f6','#f472b6','#fb923c','#a78bfa'][i%6];ctx.save();ctx.translate(px,py);ctx.rotate(t*2.5+i);ctx.fillRect(-3,-6,6,12);ctx.restore();}
        ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(W*.03,H*.18,W*.94,H*.34);
        ctx.shadowColor='#ffd700';ctx.shadowBlur=18;ctx.fillStyle='#ffd700';ctx.font=`bold ${Math.min(sz*.65,40)}px sans-serif`;ctx.textAlign='center';ctx.fillText(`Level ${lv} Complete! 🎉`,W/2,H*.33);ctx.shadowBlur=0;
        ctx.fillStyle='white';ctx.font=`${Math.min(sz*.42,25)}px sans-serif`;ctx.fillText(lv<10?`Up next: ${ENEMIES[lv].name}!`:'The final boss awaits...',W/2,H*.44);
      }

      if(ph==='win'){
        const wG=ctx.createLinearGradient(0,0,0,H);wG.addColorStop(0,'#1e1b4b');wG.addColorStop(1,'#312e81');ctx.fillStyle=wG;ctx.fillRect(0,0,W,H);
        for(let i=0;i<14;i++){const fx2=W*(.05+i*.135%.95),fy2=H*(.06+i*.11%.5),fp=(t*2+i*.65)%(Math.PI*2),fr=Math.sin(fp)*H*.1;for(let j=0;j<12;j++){const fa=(j/12)*Math.PI*2;ctx.globalAlpha=Math.max(0,Math.cos(fp)*.95);ctx.fillStyle=['#ffd700','#4ade80','#f472b6','#60a5fa','#fb923c','#a78bfa'][i%6];ctx.beginPath();ctx.arc(fx2+Math.cos(fa)*fr,fy2+Math.sin(fa)*fr,3.5,0,Math.PI*2);ctx.fill();}}ctx.globalAlpha=1;
        ctx.shadowColor='#4ade80';ctx.shadowBlur=22;ctx.fillStyle='#4ade80';ctx.font=`bold ${Math.min(sz*.75,48)}px sans-serif`;ctx.textAlign='center';ctx.fillText('🐢 YOU WIN! 🐢',W/2,H*.28);ctx.shadowBlur=0;
        ctx.fillStyle='white';ctx.font=`${Math.min(sz*.48,30)}px sans-serif`;ctx.fillText('Shredder is defeated! NYC is safe!',W/2,H*.42);ctx.fillStyle='#fbbf24';ctx.font=`bold ${Math.min(sz*.52,32)}px sans-serif`;ctx.fillText(`Score: ${scRef.current}`,W/2,H*.56);
      }

      if(ph==='over'){
        const fa2=Math.min(1,el*1.5);ctx.fillStyle=`rgba(100,0,0,${fa2*.88})`;ctx.fillRect(0,0,W,H);
        if(el>.5){const a2=Math.min(1,(el-.5)*2);ctx.globalAlpha=a2;ctx.shadowColor='#ef4444';ctx.shadowBlur=28;ctx.fillStyle='#ef4444';ctx.font=`bold ${Math.min(sz*.85,54)}px sans-serif`;ctx.textAlign='center';ctx.fillText('GAME OVER',W/2,H*.35);ctx.shadowBlur=0;ctx.fillStyle='white';ctx.font=`${Math.min(sz*.45,28)}px sans-serif`;ctx.fillText(tmRef.current<=0?"Time ran out!":'Leonardo was defeated...',W/2,H*.48);ctx.fillStyle='#fbbf24';ctx.font=`bold ${Math.min(sz*.48,30)}px sans-serif`;ctx.fillText(`Score: ${scRef.current}`,W/2,H*.6);ctx.globalAlpha=1;}
      }
    }

    function render(ts:number){
      if(!live)return;
      const W=canvas!.width,H=canvas!.height,t=ts*.001;
      const ph=phRef.current,lv=lvRef.current,eh=eHpRef.current;
      const ei=Math.min(lv-1,9),sz=Math.min(W*.15,H*.36),gy=H*.68;
      bg(W,H,t);
      if(ph!=='start'&&ph!=='win'&&ph!=='over'){leo(W*.2,gy,sz,t,ph);if(eh>0||ph==='levelup')enemy(W*.8,gy,sz,t,ph,ei);}
      if(ph==='start'){const sdz=Math.min(W*.14,H*.3);leo(W*.22,H*.7,sdz,t,'idle');enemy(W*.78,H*.7,sdz,t,'idle',0);}
      fx(W,H,ph,lv,sz,gy,t);
      raf=requestAnimationFrame(render);
    }
    raf=requestAnimationFrame(render);
    return()=>{live=false;cancelAnimationFrame(raf);ro.disconnect();};
  },[]);

  const en=ENEMIES[Math.min(level-1,9)];
  const active=phase==='idle'||phase==='attack'||phase==='special'||phase==='miss'||phase==='enemyatk';
  const tPct=timer/LEVEL_TIME;
  const tColor=tPct>.5?'#4ade80':tPct>.25?'#fbbf24':'#ef4444';
  const bc=['linear-gradient(135deg,#1d4ed8,#3b82f6)','linear-gradient(135deg,#065f46,#10b981)','linear-gradient(135deg,#7c2d12,#ea580c)','linear-gradient(135deg,#581c87,#9333ea)'];
  const reset=()=>{setPhase('start');setLevel(1);setEHp(ENEMIES[0].hp);setLHp(LEO_MAX_HP);setScore(0);setTimer(LEVEL_TIME);tmRef.current=LEVEL_TIME;setQ(genQ(1));lkRef.current=false;setFb('');};

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',overflow:'hidden',background:'#08041a',userSelect:'none',WebkitUserSelect:'none' as 'none',fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 12px',background:'rgba(0,0,0,.72)',backdropFilter:'blur(8px)',borderBottom:'1px solid rgba(99,102,241,.38)',flexShrink:0}}>
        <div style={{color:'#4ade80',fontWeight:'bold',fontSize:12,minWidth:55}}>🐢 Leo</div>
        <div style={{color:'white',fontWeight:'bold',fontSize:14,textAlign:'center',flex:1}}>
          {phase==='start'?'NINJA TURTLES MATH':`Lv ${level}/10 — ${en.name}`}
        </div>
        <div style={{color:'#fbbf24',fontWeight:'bold',fontSize:12,minWidth:55,textAlign:'right'}}>⭐{score}</div>
      </div>

      {/* HP + Timer */}
      {active&&(
        <div style={{display:'flex',gap:6,padding:'4px 11px',background:'rgba(0,0,0,.5)',flexShrink:0,alignItems:'center'}}>
          <div style={{display:'flex',gap:2,flexShrink:0}}>
            {Array.from({length:LEO_MAX_HP}).map((_,i)=>(
              <span key={i} style={{fontSize:14,opacity:i<lHp?1:.18,filter:i<lHp?'none':'grayscale(1)',transition:'opacity .3s'}}>❤️</span>
            ))}
          </div>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:12,color:tColor,fontWeight:'bold',minWidth:26,textAlign:'center',animation:timer<=10?'pulse .5s infinite':undefined}}>{timer}s</span>
            <div style={{flex:1,height:7,background:'rgba(255,255,255,.1)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${tPct*100}%`,background:`linear-gradient(90deg,${tColor},${tColor}99)`,transition:'width 1s linear,background .5s',borderRadius:4,boxShadow:`0 0 6px ${tColor}`}}/>
            </div>
          </div>
          <div style={{flexShrink:0,minWidth:68,textAlign:'right'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,.45)',marginBottom:1}}>{en.name} {eHp}/{en.hp}</div>
            <div style={{width:68,height:5,background:'rgba(255,255,255,.1)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(eHp/en.hp)*100}%`,background:en.boss?'linear-gradient(90deg,#7c3aed,#ef4444)':en.color,transition:'width .3s',borderRadius:3}}/>
            </div>
          </div>
        </div>
      )}

      <canvas ref={cvs} style={{flex:'1 1 auto',width:'100%',minHeight:0,display:'block'}}/>

      {/* Question + Buttons */}
      {active&&(
        <div style={{flexShrink:0,padding:'7px 11px 13px',background:'rgba(10,4,26,.96)',borderTop:'1px solid rgba(99,102,241,.3)',backdropFilter:'blur(8px)'}}>
          {q.isPower&&<div style={{textAlign:'center',marginBottom:5,background:'linear-gradient(90deg,#d97706,#fbbf24,#d97706)',color:'#000',fontWeight:'bold',fontSize:11,borderRadius:20,padding:'2px 0',letterSpacing:.4}}>⭐ POWER QUESTION — Double damage! ⭐</div>}
          <div style={{textAlign:'center',color:'white',fontSize:'clamp(24px,6vw,40px)',fontWeight:'bold',letterSpacing:3,marginBottom:7,textShadow:q.isPower?'0 0 20px #fbbf24,0 0 40px #f59e0b':'0 0 10px rgba(74,222,128,.3)'}}>{q.text}</div>
          {fb&&<div style={{textAlign:'center',marginBottom:6,fontSize:13,fontWeight:'bold',color:phase==='miss'||phase==='enemyatk'?'#f87171':'#4ade80',textShadow:phase==='miss'||phase==='enemyatk'?'0 0 10px #ef4444':'0 0 10px #4ade80'}}>{fb}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
            {q.choices.map((c,i)=>(
              <button key={`${q.text}-${i}`} onClick={()=>answer(c)} disabled={phase!=='idle'}
                style={{padding:'13px 6px',fontSize:'clamp(20px,5vw,32px)',fontWeight:'bold',border:`1px solid rgba(255,255,255,${phase==='idle'?.2:.06})`,borderRadius:11,cursor:phase==='idle'?'pointer':'default',background:phase!=='idle'?'rgba(255,255,255,.03)':bc[i],color:'white',opacity:phase!=='idle'?.35:1,touchAction:'manipulation',WebkitTapHighlightColor:'transparent',transition:'transform .08s,opacity .2s',boxShadow:phase==='idle'?'0 2px 12px rgba(0,0,0,.4)':'none'}}
                onPointerDown={e=>{if(phase==='idle')(e.currentTarget as HTMLButtonElement).style.transform='scale(0.91)';}}
                onPointerUp={e=>{(e.currentTarget as HTMLButtonElement).style.transform='';}}
                onPointerLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform='';}}
              >{c}</button>
            ))}
          </div>
        </div>
      )}

      {/* Start */}
      {phase==='start'&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.8)',backdropFilter:'blur(4px)',padding:24,gap:12}}>
          <div style={{fontSize:'clamp(28px,7vw,50px)',fontWeight:'bold',color:'#4ade80',textAlign:'center',lineHeight:1.15,textShadow:'0 0 30px rgba(74,222,128,.6),0 0 60px rgba(74,222,128,.3)'}}>🐢 NINJA TURTLES<br/>MATH! 🐢</div>
          <div style={{color:'rgba(255,255,255,.62)',textAlign:'center',fontSize:'clamp(13px,3vw,16px)',maxWidth:320,lineHeight:1.5}}>Answer math questions to help Leonardo defeat the Foot Clan!</div>
          <div style={{display:'flex',flexDirection:'column',gap:5,background:'rgba(255,255,255,.06)',borderRadius:12,padding:'10px 18px',border:'1px solid rgba(255,255,255,.1)',maxWidth:300,width:'100%'}}>
            <div style={{color:'#fbbf24',fontSize:12,textAlign:'center'}}>⭐ Power Questions = Double Damage</div>
            <div style={{color:'#f87171',fontSize:12,textAlign:'center'}}>⏱ 60s per level or the enemy attacks!</div>
            <div style={{color:'#60a5fa',fontSize:12,textAlign:'center'}}>❤️ 5 lives — wrong answers = enemy hits back</div>
          </div>
          <button onClick={()=>{setPhase('idle');setQ(genQ(1));}} style={{padding:'15px 50px',fontSize:'clamp(17px,4.5vw,25px)',fontWeight:'bold',background:'linear-gradient(135deg,#16a34a,#4ade80)',color:'white',border:'none',borderRadius:15,cursor:'pointer',boxShadow:'0 0 30px rgba(74,222,128,.5),0 4px 15px rgba(0,0,0,.3)',touchAction:'manipulation',letterSpacing:1}}>🥋 START!</button>
          <div style={{color:'rgba(255,255,255,.28)',fontSize:10,textAlign:'center'}}>10 levels · Defeat Shredder to win!</div>
        </div>
      )}
      {phase==='over'&&(
        <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',justifyContent:'center',padding:24}}>
          <button onClick={reset} style={{padding:'14px 38px',fontSize:'clamp(15px,4vw,22px)',fontWeight:'bold',background:'linear-gradient(135deg,#dc2626,#ef4444)',color:'white',border:'none',borderRadius:14,cursor:'pointer',boxShadow:'0 0 24px rgba(239,68,68,.5)',touchAction:'manipulation'}}>🔄 Try Again</button>
        </div>
      )}
      {phase==='win'&&(
        <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',justifyContent:'center',padding:24}}>
          <button onClick={reset} style={{padding:'15px 44px',fontSize:'clamp(16px,4vw,23px)',fontWeight:'bold',background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',color:'white',border:'none',borderRadius:15,cursor:'pointer',boxShadow:'0 0 28px rgba(59,130,246,.5)',touchAction:'manipulation'}}>🔄 Play Again!</button>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  );
}
