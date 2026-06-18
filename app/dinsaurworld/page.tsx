'use client';
import { useEffect, useRef } from 'react';

const WW = 6000, WH = 6000;

const STAGES = [
  { name:'Hatchling', need:0,    sz:18,  spd:4.0, hp:40,  rng:26,  dmg:6,   abil:'' },
  { name:'Juvenile',  need:60,   sz:32,  spd:3.6, hp:90,  rng:42,  dmg:15,  abil:'⚡ Sprint Unlocked!' },
  { name:'Sub-Adult', need:250,  sz:54,  spd:3.2, hp:185, rng:66,  dmg:33,  abil:'🦖 Roar Unlocked!' },
  { name:'Apex',      need:850,  sz:85,  spd:2.9, hp:370, rng:99,  dmg:78,  abil:'💥 Charge Unlocked!' },
  { name:'Titan',     need:2600, sz:132, spd:2.5, hp:750, rng:150, dmg:170, abil:'🌋 Quake Unlocked!' },
];

const ABIL_KEYS = [null,'sprint','roar','charge','quake'];

const PREY = [
  { n:'Fern',          f:4,    s:11,  v:0,   h:1,   bc:'#1e8a1e', fc:'#44cc44', ms:0, pl:true,  ag:false },
  { n:'Dragonfly',     f:8,    s:7,   v:2.0, h:1,   bc:'#3070b0', fc:'#60a8e0', ms:0, pl:false, ag:false },
  { n:'Lizard',        f:22,   s:14,  v:2.8, h:5,   bc:'#70b020', fc:'#a0e040', ms:0, pl:false, ag:false },
  { n:'Compsognathus', f:35,   s:17,  v:3.4, h:8,   bc:'#c07828', fc:'#e0a858', ms:0, pl:false, ag:false },
  { n:'Raptor',        f:70,   s:29,  v:3.2, h:25,  bc:'#b05820', fc:'#d08848', ms:1, pl:false, ag:false },
  { n:'Parasaur',      f:160,  s:51,  v:2.2, h:62,  bc:'#806030', fc:'#b08858', ms:2, pl:false, ag:false },
  { n:'Iguanodon',     f:240,  s:63,  v:1.8, h:85,  bc:'#706040', fc:'#a09068', ms:2, pl:false, ag:false },
  { n:'Stegosaurus',   f:400,  s:78,  v:1.5, h:140, bc:'#607038', fc:'#90a060', ms:3, pl:false, ag:true  },
  { n:'Triceratops',   f:520,  s:86,  v:1.7, h:180, bc:'#907040', fc:'#c09870', ms:3, pl:false, ag:true  },
  { n:'T-Rex',         f:1200, s:113, v:2.4, h:400, bc:'#802808', fc:'#b05030', ms:4, pl:false, ag:true  },
];

interface Ent {
  id:number;x:number;y:number;vx:number;vy:number;ang:number;
  ti:number;hp:number;mhp:number;walk:number;
  flee:boolean;fleeT:number;stun:number;
  idleT:number;idleA:number;
  dead:boolean;dieT:number;
}
interface Part{x:number;y:number;vx:number;vy:number;life:number;ml:number;cl:string;r:number;}
interface FTxt{x:number;y:number;vy:number;text:string;cl:string;life:number;ml:number;}
interface Dec{x:number;y:number;t:number;r:number;h:number;cl:string;}
interface Lake{x:number;y:number;rx:number;ry:number;}
interface Patch{x:number;y:number;r:number;cl:string;}

export default function DinsaurWorld() {
  const cvs = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cvs.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0, alive = true;

    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const g = {
      px:WW/2, py:WH/2, pvx:0, pvy:0, pang:0,
      stage:0, food:0, hp:STAGES[0].hp, mhp:STAGES[0].hp,
      walk:0, hitFlash:0, invinc:0,
      hasSprint:false, hasRoar:false, hasCharge:false, hasQuake:false,
      sprintT:0, sprintCool:0,
      roarCool:0, roarAnim:0,
      chargeCool:0, chargeT:0, chargeDx:0, chargeDy:0,
      quakeCool:0, quakeAnim:0,
      camx:WW/2-innerWidth/2, camy:WH/2-innerHeight/2,
      shake:0,
      keys:new Set<string>(),
      joyOn:false, joySx:0, joySy:0, joyCx:0, joyCy:0, joyId:-1,
      ents:[] as Ent[],
      parts:[] as Part[],
      ftxts:[] as FTxt[],
      decs:[] as Dec[],
      lakes:[] as Lake[],
      patches:[] as Patch[],
      stageMsg:'', stageT:0,
      dead:false, deadT:0,
      lastT:0, eid:0,
    };

    for(let i=0;i<25;i++) g.patches.push({x:Math.random()*WW,y:Math.random()*WH,r:150+Math.random()*350,cl:['#3d7028','#4a8030','#506838','#4a7028'][Math.floor(Math.random()*4)]});
    for(let i=0;i<10;i++) g.lakes.push({x:300+Math.random()*(WW-600),y:300+Math.random()*(WH-600),rx:60+Math.random()*160,ry:40+Math.random()*100});
    for(let i=0;i<600;i++){const t=Math.floor(Math.random()*4);g.decs.push({x:Math.random()*WW,y:Math.random()*WH,t,r:14+Math.random()*28,h:28+Math.random()*68,cl:['#2d7a1a','#368a20','#1a5a0e','#3a6a18'][t]});}
    for(let i=0;i<200;i++) g.decs.push({x:Math.random()*WW,y:Math.random()*WH,t:10,r:8+Math.random()*22,h:0,cl:`hsl(${25+Math.random()*25},${12+Math.random()*12}%,${42+Math.random()*18}%)`});

    const mkEnt = (ti:number,x:number,y:number):Ent => ({
      id:g.eid++,x,y,vx:0,vy:0,ang:Math.random()*Math.PI*2,
      ti,hp:PREY[ti].h,mhp:PREY[ti].h,walk:0,
      flee:false,fleeT:0,stun:0,
      idleT:Math.random()*150,idleA:Math.random()*Math.PI*2,
      dead:false,dieT:0
    });

    [40,30,30,25,20,12,12,8,6,2].forEach((n,ti)=>{
      for(let i=0;i<n;i++) g.ents.push(mkEnt(ti,100+Math.random()*(WW-200),100+Math.random()*(WH-200)));
    });

    const burst = (x:number,y:number,cl:string,n:number,v=3.5,r=4) => {
      for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=v*(0.5+Math.random());g.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.7+Math.random()*0.6,ml:1.3,cl,r:r*(0.4+Math.random()*0.8)});}
    };
    const ftxt = (x:number,y:number,t:string,cl:string) => { g.ftxts.push({x,y,vy:-1.8,text:t,cl,life:1.8,ml:1.8}); };

    const doSprint = () => { if(!g.hasSprint||g.sprintCool>0||g.chargeT>0)return; g.sprintT=2800; g.sprintCool=10000; ftxt(g.px,g.py-60,'⚡ SPRINT!','#ffe040'); burst(g.px,g.py,'#ffe040',8); };
    const doRoar = () => {
      if(!g.hasRoar||g.roarCool>0)return; g.roarCool=14000; g.roarAnim=1000;
      ftxt(g.px,g.py-70,'🦖 ROAR!','#ff8830'); g.shake=800; burst(g.px,g.py,'#ff8830',25,7,8);
      const sr=STAGES[g.stage].rng*4;
      g.ents.forEach(e=>{if(!e.dead){const d2=(e.x-g.px)**2+(e.y-g.py)**2;if(d2<sr*sr){e.stun=2500;e.flee=false;}}});
    };
    const doCharge = () => {
      if(!g.hasCharge||g.chargeCool>0||g.chargeT>0)return; g.chargeCool=16000; g.chargeT=550;
      g.chargeDx=Math.cos(g.pang); g.chargeDy=Math.sin(g.pang);
      ftxt(g.px,g.py-60,'💥 CHARGE!','#ff4040'); burst(g.px,g.py,'#ff5522',12,6,6);
    };
    const doQuake = () => {
      if(!g.hasQuake||g.quakeCool>0)return; g.quakeCool=28000; g.quakeAnim=2000; g.shake=1800;
      ftxt(g.px,g.py-70,'🌋 QUAKE!','#ff2222'); burst(g.px,g.py,'#ff4400',40,10,10);
      g.ents.forEach(e=>{if(e.dead)return;const sx=e.x-g.camx,sy=e.y-g.camy;if(sx>-300&&sx<canvas.width+300&&sy>-300&&sy<canvas.height+300)e.stun=4000;});
    };

    const onKD = (e:KeyboardEvent) => {
      g.keys.add(e.key.toLowerCase());
      if(e.key.toLowerCase()==='q') doSprint();
      if(e.key.toLowerCase()==='e') doRoar();
      if(e.key.toLowerCase()==='r') doCharge();
      if(e.key.toLowerCase()==='f') doQuake();
    };
    const onKU = (e:KeyboardEvent) => g.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown',onKD);
    window.addEventListener('keyup',onKU);

    const BTNS = [
      {has:()=>g.hasSprint, fn:doSprint, cool:()=>g.sprintCool, max:10000, lbl:'⚡'},
      {has:()=>g.hasRoar,   fn:doRoar,   cool:()=>g.roarCool,   max:14000, lbl:'🦖'},
      {has:()=>g.hasCharge, fn:doCharge, cool:()=>g.chargeCool, max:16000, lbl:'💥'},
      {has:()=>g.hasQuake,  fn:doQuake,  cool:()=>g.quakeCool,  max:28000, lbl:'🌋'},
    ];

    const onTS = (e:TouchEvent) => {
      e.preventDefault();
      const W=canvas.width,H=canvas.height;
      for(const t of Array.from(e.changedTouches)){
        if(t.clientX<W*0.5&&g.joyId===-1){
          g.joyId=t.identifier; g.joyOn=true;
          g.joySx=t.clientX; g.joySy=t.clientY; g.joyCx=t.clientX; g.joyCy=t.clientY;
        } else if(t.clientX>W*0.6){
          BTNS.forEach(({has,fn},i)=>{
            if(!has())return;
            const bx=W-58,by=H-220+i*72;
            if((t.clientX-bx)**2+(t.clientY-by)**2<900) fn();
          });
        }
      }
    };
    const onTM = (e:TouchEvent) => { e.preventDefault(); for(const t of Array.from(e.changedTouches)) if(t.identifier===g.joyId){g.joyCx=t.clientX;g.joyCy=t.clientY;} };
    const onTE = (e:TouchEvent) => { e.preventDefault(); for(const t of Array.from(e.changedTouches)) if(t.identifier===g.joyId){g.joyId=-1;g.joyOn=false;} };
    canvas.addEventListener('touchstart',onTS,{passive:false});
    canvas.addEventListener('touchmove',onTM,{passive:false});
    canvas.addEventListener('touchend',onTE,{passive:false});
    canvas.addEventListener('touchcancel',onTE,{passive:false});

    const killEnt = (e:Ent) => {
      if(e.dead)return;
      e.dead=true; e.dieT=0;
      const p=PREY[e.ti];
      g.food+=p.f;
      burst(e.x,e.y,p.bc,12,4,6);
      ftxt(e.x,e.y-p.s,`+${p.f}`,'#fff200');
      while(g.stage<STAGES.length-1&&g.food>=STAGES[g.stage+1].need){
        g.stage++;
        const stg=STAGES[g.stage];
        g.mhp=stg.hp; g.hp=stg.hp;
        const ak=ABIL_KEYS[g.stage];
        if(ak==='sprint') g.hasSprint=true;
        if(ak==='roar')   g.hasRoar=true;
        if(ak==='charge') g.hasCharge=true;
        if(ak==='quake')  g.hasQuake=true;
        g.stageMsg=`${stg.name.toUpperCase()}! ${stg.abil}`;
        g.stageT=3500; g.shake=500;
        burst(g.px,g.py,'#ffd700',35,9,9);
        ftxt(g.px,g.py-100,`★ ${stg.name.toUpperCase()} ★`,'#ffd700');
      }
    };

    const update = (dt:number) => {
      if(g.dead){g.deadT+=dt;return;}
      const stg=STAGES[g.stage];

      if(g.sprintT>0)   g.sprintT   =Math.max(0,g.sprintT-dt);
      if(g.sprintCool>0)g.sprintCool=Math.max(0,g.sprintCool-dt);
      if(g.roarCool>0)  g.roarCool  =Math.max(0,g.roarCool-dt);
      if(g.roarAnim>0)  g.roarAnim  =Math.max(0,g.roarAnim-dt);
      if(g.chargeCool>0)g.chargeCool=Math.max(0,g.chargeCool-dt);
      if(g.chargeT>0)   g.chargeT   =Math.max(0,g.chargeT-dt);
      if(g.quakeCool>0) g.quakeCool =Math.max(0,g.quakeCool-dt);
      if(g.quakeAnim>0) g.quakeAnim =Math.max(0,g.quakeAnim-dt);
      if(g.hitFlash>0)  g.hitFlash  =Math.max(0,g.hitFlash-dt);
      if(g.invinc>0)    g.invinc    =Math.max(0,g.invinc-dt);
      if(g.shake>0)     g.shake     =Math.max(0,g.shake-dt);
      if(g.stageT>0)    g.stageT    =Math.max(0,g.stageT-dt);

      let mx=0,my=0;
      if(g.chargeT>0){mx=g.chargeDx;my=g.chargeDy;}
      else{
        if(g.keys.has('arrowleft')||g.keys.has('a'))mx-=1;
        if(g.keys.has('arrowright')||g.keys.has('d'))mx+=1;
        if(g.keys.has('arrowup')||g.keys.has('w'))my-=1;
        if(g.keys.has('arrowdown')||g.keys.has('s'))my+=1;
        if(g.joyOn){const jdx=g.joyCx-g.joySx,jdy=g.joyCy-g.joySy,jd=Math.sqrt(jdx**2+jdy**2);if(jd>10){mx=jdx/Math.max(jd,60);my=jdy/Math.max(jd,60);}}
        const md=Math.sqrt(mx**2+my**2);if(md>1){mx/=md;my/=md;}
      }
      let tSpd=stg.spd*60;
      if(g.chargeT>0)tSpd*=4.5; else if(g.sprintT>0)tSpd*=2.2;
      g.pvx+=(mx*tSpd-g.pvx)*0.2;
      g.pvy+=(my*tSpd-g.pvy)*0.2;
      if(mx!==0||my!==0){g.pang=Math.atan2(my,mx);g.walk+=dt*0.008;}
      g.px=Math.max(stg.sz,Math.min(WW-stg.sz,g.px+g.pvx*(dt/1000)));
      g.py=Math.max(stg.sz,Math.min(WH-stg.sz,g.py+g.pvy*(dt/1000)));

      if(g.chargeT>0){
        g.ents.forEach(e=>{
          if(e.dead)return;
          const p=PREY[e.ti],d2=(e.x-g.px)**2+(e.y-g.py)**2;
          if(d2<(stg.sz+p.s)**2){e.hp-=stg.dmg*2.5;if(e.hp<=0)killEnt(e);else{e.flee=true;e.fleeT=3000;burst(e.x,e.y,p.bc,5);}}
        });
      }

      g.ents.forEach(e=>{
        if(e.dead)return;
        const p=PREY[e.ti],dx=e.x-g.px,dy=e.y-g.py,d2=dx**2+dy**2;
        if(d2<(stg.rng+p.s)**2&&e.stun<=0){e.hp-=stg.dmg*(dt/1000)*2.5;if(e.hp<=0)killEnt(e);else{e.flee=true;e.fleeT=3000;}}
        if(!p.ag&&d2<((stg.sz+p.s)*5)**2){e.flee=true;e.fleeT=Math.max(e.fleeT,2000);}
        if(p.ag&&p.s>=stg.sz*0.5&&e.stun<=0&&!e.dead){
          const dist=Math.sqrt(d2)||1;
          if(d2<(p.s*5)**2){e.vx=-dx/dist*p.v*60;e.vy=-dy/dist*p.v*60;e.ang=Math.atan2(-dy,-dx);}
          if(d2<(stg.sz+p.s*0.7)**2&&g.invinc<=0){g.hp-=Math.max(5,p.s*0.4);g.hitFlash=200;g.invinc=800;burst(g.px,g.py,'#ff2222',6,4,5);if(g.hp<=0)g.dead=true;}
        }
      });

      g.ents.forEach(e=>{
        if(e.dead){e.dieT+=dt;return;}
        const p=PREY[e.ti];
        if(p.pl||p.v===0)return;
        if(e.stun>0){e.stun=Math.max(0,e.stun-dt);e.vx*=0.9;e.vy*=0.9;return;}
        if(e.flee){
          e.fleeT=Math.max(0,e.fleeT-dt);if(e.fleeT<=0)e.flee=false;
          const dx=g.px-e.x,dy=g.py-e.y,d=Math.sqrt(dx**2+dy**2)||1;
          e.vx+=(-(dx/d)*p.v*60-e.vx)*0.15;e.vy+=(-(dy/d)*p.v*60-e.vy)*0.15;
          e.ang=Math.atan2(-dy,-dx);
        } else if(p.ag&&p.s>=stg.sz*0.5){
          const dx2=g.px-e.x,dy2=g.py-e.y,d22=dx2**2+dy2**2;
          if(d22>=(p.s*5)**2){
            e.idleT=Math.max(0,e.idleT-dt);
            if(e.idleT<=0){e.idleT=1500+Math.random()*2000;e.idleA=Math.random()*Math.PI*2;}
            e.vx+=(Math.cos(e.idleA)*p.v*20-e.vx)*0.04;e.vy+=(Math.sin(e.idleA)*p.v*20-e.vy)*0.04;
            if(Math.abs(e.vx)>0.5||Math.abs(e.vy)>0.5)e.ang=Math.atan2(e.vy,e.vx);
          }
        } else {
          e.idleT=Math.max(0,e.idleT-dt);
          if(e.idleT<=0){e.idleT=1500+Math.random()*2000;e.idleA=Math.random()*Math.PI*2;}
          e.vx+=(Math.cos(e.idleA)*p.v*25-e.vx)*0.04;e.vy+=(Math.sin(e.idleA)*p.v*25-e.vy)*0.04;
          if(Math.abs(e.vx)>0.5||Math.abs(e.vy)>0.5)e.ang=Math.atan2(e.vy,e.vx);
        }
        e.x=Math.max(p.s,Math.min(WW-p.s,e.x+e.vx*(dt/1000)));
        e.y=Math.max(p.s,Math.min(WH-p.s,e.y+e.vy*(dt/1000)));
        if(Math.sqrt(e.vx**2+e.vy**2)>1)e.walk+=dt*0.006;
      });

      g.ents=g.ents.filter(e=>!e.dead||e.dieT<900);

      const minN=[30,20,20,15,12,8,8,5,4,2];
      const cts=new Array(PREY.length).fill(0);
      g.ents.forEach(e=>{if(!e.dead)cts[e.ti]++;});
      cts.forEach((c,ti)=>{
        if(PREY[ti].ms<=g.stage+1&&c<minN[ti]){
          let nx=Math.random()*WW,ny=Math.random()*WH,tr=0;
          while(tr++<20&&(nx-g.px)**2+(ny-g.py)**2<400**2){nx=Math.random()*WW;ny=Math.random()*WH;}
          g.ents.push(mkEnt(ti,nx,ny));
        }
      });

      g.parts=g.parts.filter(p=>{p.x+=p.vx*(dt/60);p.y+=p.vy*(dt/60);p.vx*=0.93;p.vy*=0.93;p.life-=dt/1000;return p.life>0;});
      g.ftxts=g.ftxts.filter(t=>{t.y+=t.vy;t.life-=dt/1000;return t.life>0;});

      g.camx+=(g.px-canvas.width/2-g.camx)*0.1;
      g.camy+=(g.py-canvas.height/2-g.camy)*0.1;
      g.camx=Math.max(0,Math.min(WW-canvas.width,g.camx));
      g.camy=Math.max(0,Math.min(WH-canvas.height,g.camy));
    };

    const drawDino = (x:number,y:number,sz:number,ang:number,walk:number,bc:string,fc:string,stun:boolean,isP:boolean) => {
      ctx.save();ctx.translate(x,y);ctx.rotate(ang);
      ctx.save();ctx.globalAlpha=0.12;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(sz*0.1,sz*0.82,sz*0.72,sz*0.2,0,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.save();ctx.strokeStyle=bc;ctx.lineWidth=sz*0.34;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-sz*0.32,0);ctx.quadraticCurveTo(-sz*1.05,sz*0.2*Math.sin(walk*0.85),-sz*1.38,sz*0.32*Math.sin(walk));ctx.stroke();ctx.restore();
      ctx.fillStyle=bc;ctx.beginPath();ctx.ellipse(0,0,sz*0.66,sz*0.4,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=fc;ctx.beginPath();ctx.ellipse(sz*0.1,sz*0.14,sz*0.42,sz*0.24,0.15,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=bc;ctx.beginPath();ctx.ellipse(sz*0.52,-sz*0.16,sz*0.23,sz*0.16,-0.35,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(sz*0.74,-sz*0.26,sz*0.36,sz*0.22,-0.2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(sz*1.04,-sz*0.12,sz*0.21,sz*0.14,-0.12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=bc+'cc';ctx.beginPath();ctx.ellipse(sz*0.98,sz*0.06,sz*0.17,sz*0.09,0.12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.arc(sz*1.16,-sz*0.16,sz*0.024,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=isP?'#ffe080':'#f8f8f8';ctx.beginPath();ctx.arc(sz*0.79,-sz*0.35,sz*0.07,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(sz*0.82,-sz*0.34,sz*0.04,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='white';ctx.beginPath();ctx.arc(sz*0.84,-sz*0.36,sz*0.015,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=bc;ctx.lineWidth=sz*0.1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sz*0.36,sz*0.1);ctx.lineTo(sz*0.58,sz*0.28+Math.sin(walk)*sz*0.05);ctx.stroke();
      const la=Math.sin(walk)*sz*0.18,lb=-la;
      ctx.lineWidth=sz*0.14;
      ctx.beginPath();ctx.moveTo(sz*0.02,sz*0.34);ctx.lineTo(sz*0.14,sz*0.66+la);ctx.lineTo(sz*0.28,sz*0.74+la);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-sz*0.19,sz*0.34);ctx.lineTo(-sz*0.08,sz*0.66+lb);ctx.lineTo(sz*0.06,sz*0.74+lb);ctx.stroke();
      if(isP&&g.sprintT>0){ctx.globalAlpha=0.65;['#ff6600','#ff3300','#ff1100'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(-sz*(0.48+i*0.32),0,sz*(0.22-i*0.06),0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;}
      if(stun){ctx.fillStyle='#ffff00';ctx.font=`${sz*0.4}px sans-serif`;ctx.textAlign='center';for(let i=0;i<3;i++){const a=(walk*0.01+i*2.09);ctx.fillText('★',Math.cos(a)*sz*0.85,-sz*0.95+Math.sin(a)*sz*0.25);}}
      ctx.restore();
    };

    const drawDec = (d:Dec) => {
      const sx=d.x-g.camx,sy=d.y-g.camy;
      if(sx<-120||sx>canvas.width+120||sy<-120||sy>canvas.height+120)return;
      ctx.save();
      if(d.t===10){
        ctx.fillStyle=d.cl;ctx.beginPath();ctx.ellipse(sx,sy,d.r,d.r*0.55,0.2,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.1)';ctx.lineWidth=1;ctx.stroke();
      } else if(d.t===0){
        ctx.strokeStyle='#6a3808';ctx.lineWidth=d.r*0.17;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(sx,sy+d.r*0.4);ctx.bezierCurveTo(sx+d.r*0.2,sy-d.h*0.25,sx-d.r*0.15,sy-d.h*0.55,sx-d.r*0.12,sy-d.h*0.5);ctx.stroke();
        for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2;ctx.strokeStyle=d.cl;ctx.lineWidth=d.r*0.09;ctx.beginPath();ctx.moveTo(sx-d.r*0.12,sy-d.h*0.5);ctx.lineTo(sx-d.r*0.12+Math.cos(a)*d.r*1.05,sy-d.h*0.5+Math.sin(a)*d.r*0.5);ctx.stroke();}
      } else if(d.t===1){
        for(let i=0;i<8;i++){const a=(-Math.PI/2)+(i-3.5)/4*Math.PI;ctx.strokeStyle=d.cl;ctx.lineWidth=d.r*0.08;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*d.r*1.4,sy+Math.sin(a)*d.r*0.8);ctx.stroke();}
      } else if(d.t===2){
        ctx.fillStyle=d.cl;
        ctx.beginPath();ctx.moveTo(sx,sy-d.h);ctx.lineTo(sx-d.r*0.82,sy+d.r*0.2);ctx.lineTo(sx+d.r*0.82,sy+d.r*0.2);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo(sx,sy-d.h*0.56);ctx.lineTo(sx-d.r*1.12,sy+d.r*0.75);ctx.lineTo(sx+d.r*1.12,sy+d.r*0.75);ctx.closePath();ctx.fill();
      } else {
        ctx.fillStyle=d.cl;
        [[0,0,1],[-0.48,0.2,0.65],[0.48,0.2,0.65]].forEach(([ox,oy,sc])=>{ctx.beginPath();ctx.arc(sx+ox*d.r,sy+oy*d.r,d.r*sc,0,Math.PI*2);ctx.fill();});
      }
      ctx.restore();
    };

    const draw = () => {
      const W=canvas.width,H=canvas.height;
      const shx=g.shake>0?(Math.random()-0.5)*Math.min(g.shake/80,10):0;
      const shy=g.shake>0?(Math.random()-0.5)*Math.min(g.shake/80,10):0;
      ctx.save();ctx.translate(shx,shy);

      ctx.fillStyle='#3a6820';ctx.fillRect(0,0,W,H);
      g.patches.forEach(p=>{
        const sx=p.x-g.camx,sy=p.y-g.camy;
        if(sx+p.r<-50||sx-p.r>W+50||sy+p.r<-50||sy-p.r>H+50)return;
        ctx.fillStyle=p.cl;ctx.beginPath();ctx.arc(sx,sy,p.r,0,Math.PI*2);ctx.fill();
      });
      ctx.strokeStyle='rgba(0,0,0,0.04)';ctx.lineWidth=1;
      const gs=90,ox=g.camx%gs,oy=g.camy%gs;
      for(let x=-ox;x<W+gs;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=-oy;y<H+gs;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      g.lakes.forEach(lk=>{
        const sx=lk.x-g.camx,sy=lk.y-g.camy;
        if(sx+lk.rx<-60||sx-lk.rx>W+60||sy+lk.ry<-60||sy-lk.ry>H+60)return;
        ctx.beginPath();ctx.ellipse(sx,sy,lk.rx,lk.ry,0,0,Math.PI*2);ctx.fillStyle='rgba(25,70,165,0.55)';ctx.fill();
        ctx.strokeStyle='rgba(70,130,210,0.4)';ctx.lineWidth=2;ctx.stroke();
        ctx.save();ctx.globalAlpha=0.12;ctx.strokeStyle='white';ctx.lineWidth=1.5;
        for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(sx+(i-1)*14,sy-lk.ry*0.28,lk.rx*(0.28+i*0.09),lk.ry*0.22,0,0,Math.PI*2);ctx.stroke();}
        ctx.restore();
      });
      g.decs.forEach(drawDec);

      const stg=STAGES[g.stage];
      g.ents.forEach(e=>{
        if(e.dead&&e.dieT>700)return;
        const p=PREY[e.ti],sx=e.x-g.camx,sy=e.y-g.camy;
        if(sx<-p.s*3||sx>W+p.s*3||sy<-p.s*3||sy>H+p.s*3)return;
        ctx.save();
        if(e.dead)ctx.globalAlpha=Math.max(0,1-e.dieT/700);
        if(e.stun>0&&Math.floor(e.stun/120)%2===0)ctx.globalAlpha=(ctx.globalAlpha||1)*0.55;
        if(p.pl){
          ctx.fillStyle=p.bc;ctx.beginPath();ctx.arc(sx,sy,p.s,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle=p.fc;ctx.lineWidth=1.4;
          for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*p.s*1.3,sy+Math.sin(a)*p.s*0.85);ctx.stroke();}
        } else {
          drawDino(sx,sy,p.s,e.ang,e.walk,p.bc,p.fc,e.stun>0,false);
        }
        if(!e.dead&&e.hp<e.mhp){
          const bw=p.s*2.4,bh=4,bx=sx-bw/2,by=sy-p.s-10;
          ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(bx,by,bw,bh);
          ctx.fillStyle=e.hp/e.mhp>0.5?'#44cc44':'#cc4422';ctx.fillRect(bx,by,bw*(e.hp/e.mhp),bh);
        }
        ctx.restore();
      });

      const bcs=['#7cb87c','#5a9e5a','#3a7e3a','#1e5e1e','#0e3e0e'];
      const fcs=['#b8dcb8','#a0c8a0','#80b880','#5a9a5a','#3a6e3a'];
      const px2=g.px-g.camx,py2=g.py-g.camy;
      ctx.save();
      if(g.invinc>0&&Math.floor(g.invinc/80)%2===0)ctx.globalAlpha=0.35;
      if(g.hitFlash>0)ctx.filter='brightness(2)';
      if(g.roarAnim>0){const s=1+0.12*Math.sin(g.roarAnim*0.02);ctx.translate(px2,py2);ctx.scale(s,s);ctx.translate(-px2,-py2);}
      drawDino(px2,py2,stg.sz,g.pang,g.walk,bcs[g.stage],fcs[g.stage],false,true);
      ctx.restore();

      ctx.save();
      g.parts.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.ml);ctx.fillStyle=p.cl;ctx.beginPath();ctx.arc(p.x-g.camx,p.y-g.camy,p.r,0,Math.PI*2);ctx.fill();});
      ctx.restore();
      ctx.save();
      g.ftxts.forEach(t=>{ctx.globalAlpha=Math.min(1,t.life/(t.ml*0.5));ctx.fillStyle=t.cl;ctx.font=`bold ${13+t.life*2.5}px sans-serif`;ctx.textAlign='center';ctx.fillText(t.text,t.x-g.camx,t.y-g.camy);});
      ctx.restore();

      // HUD
      const hpPct=Math.max(0,g.hp/g.mhp);
      ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(16,14,220,20);
      const hpG=ctx.createLinearGradient(18,16,228,32);hpG.addColorStop(0,hpPct<0.3?'#ff3333':'#55ff55');hpG.addColorStop(1,hpPct<0.3?'#aa0000':'#22aa22');
      ctx.fillStyle=hpG;ctx.fillRect(18,16,212*hpPct,16);
      ctx.fillStyle='rgba(255,255,255,0.9)';ctx.font='bold 11px monospace';ctx.textAlign='left';ctx.fillText(`\u2764 ${Math.ceil(g.hp)} / ${g.mhp}`,22,28);

      const nextSt=STAGES[g.stage+1];
      const fPct=nextSt?Math.min(1,(g.food-STAGES[g.stage].need)/(nextSt.need-STAGES[g.stage].need)):1;
      ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(16,38,220,14);
      const fG=ctx.createLinearGradient(18,40,228,52);fG.addColorStop(0,'#ffdd22');fG.addColorStop(1,'#ff9900');
      ctx.fillStyle=fG;ctx.fillRect(18,40,216*fPct,10);
      ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='10px monospace';
      ctx.fillText(nextSt?`${stg.name} \u25b6 ${nextSt.name}`:'TITAN SUPREME',22,49);

      ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(16,56,220,18);
      ctx.fillStyle='#ffd700';ctx.font='bold 11px monospace';ctx.fillText(`Stage: ${stg.name}  |  Food: ${g.food}`,22,68);

      // Minimap
      const mmx=W-84,mmy=H-84,mmw=70,mmh=70;
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(mmx,mmy,mmw,mmh);
      ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1;ctx.strokeRect(mmx,mmy,mmw,mmh);
      g.ents.forEach(e=>{if(e.dead)return;ctx.fillStyle='rgba(255,80,80,0.7)';ctx.fillRect(mmx+e.x/WW*mmw-0.5,mmy+e.y/WH*mmh-0.5,1.5,1.5);});
      ctx.fillStyle='#7cf07c';ctx.beginPath();ctx.arc(mmx+g.px/WW*mmw,mmy+g.py/WH*mmh,2.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;ctx.strokeRect(mmx+g.camx/WW*mmw,mmy+g.camy/WH*mmh,W/WW*mmw,H/WH*mmh);
      ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='8px sans-serif';ctx.textAlign='center';ctx.fillText('MAP',mmx+mmw/2,mmy+mmh+10);

      if(g.stageT>0){
        ctx.globalAlpha=Math.min(1,g.stageT/400);
        ctx.fillStyle='rgba(0,0,0,0.78)';ctx.fillRect(W/2-265,H/2-54,530,94);
        ctx.fillStyle='#ffd700';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText(g.stageMsg,W/2,H/2+10);
        ctx.globalAlpha=1;
      }

      const isMob='ontouchstart' in window;
      if(isMob){
        if(g.joyOn){
          ctx.globalAlpha=0.25;ctx.fillStyle='white';ctx.beginPath();ctx.arc(g.joySx,g.joySy,52,0,Math.PI*2);ctx.fill();
          const jdx2=g.joyCx-g.joySx,jdy2=g.joyCy-g.joySy,jd2=Math.sqrt(jdx2**2+jdy2**2);
          const cx=g.joySx+jdx2*(jd2>50?50/jd2:1),cy=g.joySy+jdy2*(jd2>50?50/jd2:1);
          ctx.globalAlpha=0.5;ctx.beginPath();ctx.arc(cx,cy,26,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        } else {
          ctx.globalAlpha=0.15;ctx.fillStyle='white';ctx.beginPath();ctx.arc(80,H-80,50,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=0.4;ctx.fillStyle='white';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('MOVE',80,H-78);ctx.globalAlpha=1;
        }
        BTNS.forEach(({has,cool,max,lbl},i)=>{
          if(!has())return;
          const bx=W-58,by=H-220+i*72,cl2=cool(),pct=1-Math.min(1,cl2/max);
          ctx.globalAlpha=cl2>0?0.42:0.9;
          ctx.fillStyle=cl2>0?'#222':'#2a5a2a';ctx.beginPath();ctx.arc(bx,by,28,0,Math.PI*2);ctx.fill();
          if(cl2<=0){ctx.strokeStyle='#88ff88';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(bx,by,28,0,Math.PI*2);ctx.stroke();}
          else{ctx.strokeStyle='#88ff88';ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(bx,by,28,-Math.PI/2,-Math.PI/2+pct*Math.PI*2);ctx.stroke();}
          ctx.globalAlpha=1;ctx.fillStyle='white';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(lbl,bx,by+8);
          if(cl2>0){ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='10px monospace';ctx.fillText(`${Math.ceil(cl2/1000)}s`,bx,by+22);}
        });
      } else {
        const hints=['WASD / Arrows \u2014 Move',
          g.hasSprint?`[Q] \u26a1 Sprint${g.sprintCool>0?` ${Math.ceil(g.sprintCool/1000)}s`:'  \u2713'}`:'',
          g.hasRoar?`[E] \uD83E\uDD96 Roar${g.roarCool>0?` ${Math.ceil(g.roarCool/1000)}s`:'  \u2713'}`:'',
          g.hasCharge?`[R] \uD83D\uDCA5 Charge${g.chargeCool>0?` ${Math.ceil(g.chargeCool/1000)}s`:'  \u2713'}`:'',
          g.hasQuake?`[F] \uD83C\uDF0B Quake${g.quakeCool>0?` ${Math.ceil(g.quakeCool/1000)}s`:'  \u2713'}`:'',
        ].filter(Boolean);
        const hh=hints.length*20+12;
        ctx.fillStyle='rgba(0,0,0,0.42)';ctx.fillRect(14,H-hh-14,210,hh);
        ctx.textAlign='left';
        hints.forEach((k,i)=>{ctx.fillStyle=i===0?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.85)';ctx.font=`${i===0?11:12}px monospace`;ctx.fillText(k,22,H-hh-4+16+i*20);});
      }

      if(g.dead){
        const da=Math.min(0.85,g.deadT/1500);
        ctx.fillStyle=`rgba(160,0,0,${da})`;ctx.fillRect(0,0,W,H);
        if(g.deadT>1000){
          ctx.fillStyle='white';ctx.font='bold 52px sans-serif';ctx.textAlign='center';ctx.fillText('EXTINCT',W/2,H/2-18);
          ctx.font='22px sans-serif';ctx.fillStyle='rgba(255,255,255,0.85)';ctx.fillText(`${stg.name} | ${g.food} food eaten`,W/2,H/2+22);
          ctx.font='16px sans-serif';ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fillText('Reload to play again',W/2,H/2+62);
        }
      }

      ctx.restore();
    };

    const loop = (ts:number) => {
      if(!alive)return;
      const dt=Math.min(ts-g.lastT,80);
      g.lastT=ts;update(dt);draw();
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(ts=>{g.lastT=ts;raf=requestAnimationFrame(loop);});

    return () => {
      alive=false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize',resize);
      window.removeEventListener('keydown',onKD);
      window.removeEventListener('keyup',onKU);
    };
  },[]);

  return <canvas ref={cvs} style={{display:'block',touchAction:'none',userSelect:'none',outline:'none'}} tabIndex={0}/>;
}
