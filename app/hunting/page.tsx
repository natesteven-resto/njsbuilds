'use client';
import { useEffect, useRef, useState } from 'react';
import type * as T from 'three';

/* ═══════════════════════════════════════════════════════════════
   WILDERNESS HUNT — Call of the Wild for Mobile
   Three.js PBR · Grass instancing · Wind/smell/sight/sound AI
   ═══════════════════════════════════════════════════════════════ */

const QUESTS = [
  { id:'q1', icon:'🦌', name:'First Blood',    desc:'Hunt 2 deer',    goal:2, reward:'🎯 Hunting Rifle',      key:'deer'   },
  { id:'q2', icon:'🐻', name:'Bear Bane',       desc:'Hunt a bear',    goal:1, reward:'💥 12-Gauge Shotgun',   key:'bear'   },
  { id:'q3', icon:'🫎', name:'Moose Master',    desc:'Hunt a moose',   goal:1, reward:'🔭 .308 Sniper Rifle',  key:'moose'  },
  { id:'q4', icon:'🐟', name:"Gone Fishin'",   desc:'Catch 3 fish',   goal:3, reward:'📦 +60 Ammo',           key:'fish'   },
  { id:'q5', icon:'🦃', name:'Turkey Season',  desc:'Hunt 3 turkeys', goal:3, reward:'🦺 Hunting Vest +50HP', key:'turkey' },
];

const ADEF: Record<string,{hp:number;meat:number;sightR:number;sightA:number;soundR:number;smellR:number;spd:number;aSpd:number}> = {
  deer:   { hp:80,  meat:2, sightR:70, sightA:0.65, soundR:45, smellR:90,  spd:4.8, aSpd:0  },
  bear:   { hp:300, meat:3, sightR:55, sightA:0.5,  soundR:65, smellR:110, spd:5.5, aSpd:6.5},
  turkey: { hp:50,  meat:1, sightR:80, sightA:0.8,  soundR:35, smellR:60,  spd:6.2, aSpd:0  },
  moose:  { hp:220, meat:4, sightR:50, sightA:0.5,  soundR:55, smellR:100, spd:5.0, aSpd:5.5},
};

export default function HuntingGame() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const hudRef    = useRef<HTMLCanvasElement>(null);
  const gsRef     = useRef<any>(null);
  const [panel,   setPanel]   = useState<'none'|'quests'>('none');
  const [loading, setLoading] = useState(true);
  const [errMsg,  setErrMsg]  = useState('');
  const [snap,    setSnap]    = useState({
    hp:100,maxHp:100,ammo:18,maxAmmo:18,weapon:'pistol',
    quests:QUESTS.map(q=>({...q,prog:0,done:false})),
    inv:{deer:0,bear:0,turkey:0,moose:0,fish:0,cooked:0},
    campfire:false,tent:false,crouching:false,scoped:false,
    msg:'',msgTimer:0,tod:0.55,windDeg:0,
    trophies:[] as {type:string;rating:string;score:number}[],
  });

  useEffect(()=>{
    if(!mountRef.current)return;
    let alive=true, raf=0;
    let THREE:any, renderer:any, scene:any, camera:any;

    async function init(){
      try{
      THREE = await import('three');

      /* ── Renderer ──────────────────────────────────────── */
      const isMob2='ontouchstart' in window;
      renderer = new THREE.WebGLRenderer({ antialias:!isMob2 });
      renderer.setPixelRatio(Math.min(devicePixelRatio, isMob2 ? 1.2 : 2));
      renderer.setSize(innerWidth,innerHeight);
      renderer.shadowMap.enabled=!isMob2;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.15;
      mountRef.current!.appendChild(renderer.domElement);

      /* ── Scene ─────────────────────────────────────────── */
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x8aaa80,0.004);

      /* ── Camera ────────────────────────────────────────── */
      camera = new THREE.PerspectiveCamera(72,innerWidth/innerHeight,0.1,800);
      camera.position.set(0,1.75,0);
      scene.add(camera);

      /* ── Lights ────────────────────────────────────────── */
      const ambient  = new THREE.AmbientLight(0xfff8e8,0.5);
      const hemi     = new THREE.HemisphereLight(0x87ceeb,0x3a5a2a,0.4);
      const sun      = new THREE.DirectionalLight(0xfff5e0,2.2);
      sun.castShadow=true;
      sun.shadow.mapSize.set(2048,2048);
      sun.shadow.camera.near=1;sun.shadow.camera.far=500;
      sun.shadow.camera.left=-200;sun.shadow.camera.right=200;
      sun.shadow.camera.top=200;sun.shadow.camera.bottom=-200;
      sun.shadow.bias=-0.001;
      const fill = new THREE.DirectionalLight(0x4466bb,0.25);
      fill.position.set(-80,40,-100);
      scene.add(ambient,hemi,sun,fill);

      /* ── Sky sphere ────────────────────────────────────── */
      const skyMesh = new THREE.Mesh(
        new THREE.SphereGeometry(490,32,16),
        new THREE.ShaderMaterial({
          side:THREE.BackSide,
          uniforms:{ uSky:{value:new THREE.Color(0x4a82c8)}, uHorizon:{value:new THREE.Color(0xc8dce8)}, uGround:{value:new THREE.Color(0x2a5a1a)} },
          vertexShader:`varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader:`uniform vec3 uSky,uHorizon,uGround; varying vec3 vPos; void main(){float h=normalize(vPos).y;vec3 c=h>0.0?mix(uHorizon,uSky,pow(h,0.5)):mix(uHorizon,uGround,-h*3.0);gl_FragColor=vec4(c,1.0);}`,
        })
      );
      scene.add(skyMesh);

      /* ── Sun disc ──────────────────────────────────────── */
      const sunDisc = new THREE.Mesh(
        new THREE.SphereGeometry(8,16,16),
        new THREE.MeshBasicMaterial({color:0xfffae0})
      );
      scene.add(sunDisc);

      /* ── Terrain ───────────────────────────────────────── */
      const tSz=400, tSeg=isMob2?64:96;
      const tGeo = new THREE.PlaneGeometry(tSz,tSz,tSeg,tSeg);
      tGeo.rotateX(-Math.PI/2);
      const tPos=tGeo.attributes.position;
      for(let i=0;i<tPos.count;i++){
        const x=tPos.getX(i),z=tPos.getZ(i);
        let h=0;
        h+=Math.sin(x*.038)*Math.cos(z*.032)*3.2;
        h+=Math.sin(x*.082+1.2)*Math.cos(z*.075+0.7)*1.8;
        h+=Math.sin(x*.16+2.1)*Math.cos(z*.14+1.4)*0.8;
        h+=(Math.random()-.5)*.3;
        const ld=Math.sqrt((x-80)**2+(z-80)**2);
        if(ld<32) h=Math.min(h,-0.4-(32-ld)*.12);
        const river=Math.abs(x+z*.4-20);
        if(river<12) h=Math.min(h,-0.2-(12-river)*.08);
        tPos.setY(i,h);
      }
      tGeo.computeVertexNormals();
      // PBR vertex colors
      const cols:number[]=[];
      for(let i=0;i<tPos.count;i++){
        const x=tPos.getX(i),z=tPos.getZ(i),y=tPos.getY(i);
        const n=(Math.sin(x*.31)*Math.cos(z*.28)*.5+.5)*.07;
        if(y<-0.25){ cols.push(.18+n,.28+n,.52); }
        else if(y<.5){ cols.push(.2+n,.42+n,.14); }
        else if(y<2){ cols.push(.26+n,.48+n,.16); }
        else if(y<4){ cols.push(.35+n,.42+n,.2); }
        else{ cols.push(.42,.38,.24); }
      }
      tGeo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
      const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.92, metalness:0 }));
      terrain.receiveShadow=true;
      scene.add(terrain);

      /* ── Ground raycaster helper ───────────────────────── */
      // --- Height cache: sample once, fast bilinear lookup every frame ---
      const gRay=new THREE.Raycaster(), gDir=new THREE.Vector3(0,-1,0);
      function groundYRay(x:number,z:number,base=1.75){
        gRay.set(new THREE.Vector3(x,60,z),gDir);
        const hits=gRay.intersectObject(terrain);
        return hits.length>0?hits[0].point.y+base:base;
      }
      // Build height grid from terrain vertices
      const HRES=128, HHALF=tSz/2;
      const hGrid=new Float32Array(HRES*HRES);
      for(let i=0;i<tPos.count;i++){
        const wx=tPos.getX(i)+HHALF,wz=tPos.getZ(i)+HHALF;
        const hi=Math.round(wx/tSz*(HRES-1)),hj=Math.round(wz/tSz*(HRES-1));
        if(hi>=0&&hi<HRES&&hj>=0&&hj<HRES)hGrid[hi*HRES+hj]=tPos.getY(i);
      }
      function groundY(x:number,z:number,base=1.75){
        const u=(x+HHALF)/tSz*(HRES-1),v=(z+HHALF)/tSz*(HRES-1);
        if(u<0||u>=HRES-1||v<0||v>=HRES-1)return base;
        const ui=Math.floor(u),vi=Math.floor(v),uf=u-ui,vf=v-vi;
        const h=hGrid[ui*HRES+vi]*(1-uf)*(1-vf)+hGrid[(ui+1)*HRES+vi]*uf*(1-vf)+hGrid[ui*HRES+(vi+1)]*(1-uf)*vf+hGrid[(ui+1)*HRES+(vi+1)]*uf*vf;
        return h+base;
      }

      /* ── Instanced Grass ───────────────────────────────── */
      const GRASS_COUNT=isMob2?1500:5000;
      const bladeGeo=new THREE.PlaneGeometry(.12,.45);
      bladeGeo.translate(0,.225,0);
      const bladeMat=new THREE.MeshStandardMaterial({
        color:0x2a7218,side:THREE.DoubleSide,roughness:.95,metalness:0,alphaTest:.1,
      });
      const grassMesh=new THREE.InstancedMesh(bladeGeo,bladeMat,GRASS_COUNT);
      grassMesh.receiveShadow=true;
      scene.add(grassMesh);
      const grassPos:{x:number;z:number}[]=[];
      for(let i=0;i<GRASS_COUNT;i++){
        const a=Math.random()*Math.PI*2,d=Math.random()*32;
        grassPos.push({x:Math.cos(a)*d,z:Math.sin(a)*d});
      }
      const dummy=new THREE.Object3D();
      let lastGrassUpdate={x:9999,z:9999};
      function updateGrass(px:number,pz:number){
        if(Math.sqrt((px-lastGrassUpdate.x)**2+(pz-lastGrassUpdate.z)**2)<5)return;
        lastGrassUpdate={x:px,z:pz};
        for(let i=0;i<GRASS_COUNT;i++){
          const gx=px+grassPos[i].x,gz=pz+grassPos[i].z;
          const gy=groundY(gx,gz,0);
          dummy.position.set(gx,gy,gz);
          dummy.rotation.y=Math.random()*Math.PI*2;
          dummy.scale.setScalar(.8+Math.random()*.5);
          dummy.updateMatrix();
          grassMesh.setMatrixAt(i,dummy.matrix);
        }
        grassMesh.instanceMatrix.needsUpdate=true;
      }
      updateGrass(0,0);

      /* ── Water shader ──────────────────────────────────── */
      const waterMat=new THREE.ShaderMaterial({
        transparent:true,
        uniforms:{uTime:{value:0},uSunDir:{value:new THREE.Vector3(.6,.4,.4)}},
        vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader:`
          uniform float uTime; uniform vec3 uSunDir; varying vec2 vUv;
          void main(){
            float w1=sin(vUv.x*12.0+uTime*.8)*.5+.5;
            float w2=sin(vUv.y*9.0+uTime*.6+1.4)*.5+.5;
            float w3=sin((vUv.x+vUv.y)*7.0+uTime*.4)*.5+.5;
            vec3 deep=vec3(.06,.18,.55);vec3 shallow=vec3(.15,.42,.78);
            float wv=w1*.4+w2*.35+w3*.25;
            vec3 col=mix(deep,shallow,wv);
            float spec=pow(max(0.0,wv-.3),8.0)*.6;
            col+=vec3(spec);
            gl_FragColor=vec4(col,.82);
          }
        `,
      });
      const lake=new THREE.Mesh(new THREE.CircleGeometry(28,64),waterMat);
      lake.rotation.x=-Math.PI/2;lake.position.set(80,.08,80);
      scene.add(lake);

      /* ── Mountains ─────────────────────────────────────── */
      // Mountains
      for(let m=0;m<24;m++){
        const ang=(m/24)*Math.PI*2,d=210+Math.random()*110;
        const mh=50+Math.random()*90,mr=28+Math.random()*22;
        const seg=7+Math.floor(Math.random()*5);
        const mGeo=new THREE.ConeGeometry(mr,mh,seg);
        const r=.28+Math.random()*.08,gv=.3+Math.random()*.08,b=.36+Math.random()*.1;
        const mMesh=new THREE.Mesh(mGeo,new THREE.MeshStandardMaterial({color:new THREE.Color(r,gv,b),roughness:.9,metalness:.05}));
        mMesh.position.set(Math.cos(ang)*d,mh/2-3,Math.sin(ang)*d);
        mMesh.castShadow=true; scene.add(mMesh);
        const sMesh=new THREE.Mesh(new THREE.ConeGeometry(mr*.38,mh*.28,seg),new THREE.MeshStandardMaterial({color:0xeef4ff,roughness:.7,metalness:.05}));
        sMesh.position.set(mMesh.position.x,mh*.87,mMesh.position.z);
        scene.add(sMesh);
      }

      /* ── Trees ─────────────────────────────────────────── */
      const treeMats=[
        new THREE.MeshStandardMaterial({color:0x1a5808,roughness:.88,metalness:0}),
        new THREE.MeshStandardMaterial({color:0x1e6a0a,roughness:.88,metalness:0}),
        new THREE.MeshStandardMaterial({color:0x245c0c,roughness:.88,metalness:0}),
      ];
      const trunkMat=new THREE.MeshStandardMaterial({color:0x4a2a0a,roughness:.95,metalness:0});
      function makeTree(x:number,z:number,sc:number){
        const g=new THREE.Group();
        const trH=4*sc;
        const tr=new THREE.Mesh(new THREE.CylinderGeometry(.16*sc,.28*sc,trH,7),trunkMat);
        tr.position.y=trH/2;tr.castShadow=true;g.add(tr);
        for(let i=0;i<3;i++){
          const cH=(4.5-i*.6)*sc,cR=(2.4-i*.55)*sc;
          const c=new THREE.Mesh(new THREE.ConeGeometry(cR,cH,8),treeMats[i]);
          c.position.y=trH+(i*1.9+1.4)*sc;c.castShadow=true;g.add(c);
        }
        g.position.set(x,groundY(x,z,0),z);
        scene.add(g);
      }
      for(let i=0;i<(isMob2?90:200);i++){
        const a=Math.random()*Math.PI*2,d=10+Math.random()*165;
        const tx=Math.cos(a)*d,tz=Math.sin(a)*d;
        const ld=Math.sqrt((tx-80)**2+(tz-80)**2);
        if(ld<35||Math.sqrt(tx*tx+tz*tz)<7)continue;
        makeTree(tx,tz,.7+Math.random()*.9);
      }

      /* ── Rocks ─────────────────────────────────────────── */
      const rockMat=new THREE.MeshStandardMaterial({color:0x6a6a60,roughness:.85,metalness:.08});
      for(let i=0;i<(isMob2?40:120);i++){
        const a=Math.random()*Math.PI*2,d=8+Math.random()*170;
        const rx=Math.cos(a)*d,rz=Math.sin(a)*d;
        const rs=.3+Math.random()*1.8;
        const r=new THREE.Mesh(new THREE.DodecahedronGeometry(rs,0),rockMat);
        r.position.set(rx,groundY(rx,rz,rs*.4),rz);
        r.rotation.set(Math.random(),Math.random(),Math.random());
        r.castShadow=r.receiveShadow=true;scene.add(r);
      }

      /* ── Fallen logs ───────────────────────────────────── */
      const logMat=new THREE.MeshStandardMaterial({color:0x3a2008,roughness:.98,metalness:0});
      for(let i=0;i<(isMob2?8:25);i++){
        const a=Math.random()*Math.PI*2,d=15+Math.random()*120;
        const lx=Math.cos(a)*d,lz=Math.sin(a)*d;
        const log=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,2+Math.random()*3,8),logMat);
        log.position.set(lx,groundY(lx,lz,.15),lz);
        log.rotation.z=Math.PI/2;log.rotation.y=Math.random()*Math.PI;
        log.castShadow=log.receiveShadow=true;scene.add(log);
      }

      /* ── Campfire ──────────────────────────────────────── */
      const cfGroup=new THREE.Group();cfGroup.visible=false;
      const cfLogMat=new THREE.MeshStandardMaterial({color:0x3a1a04,roughness:.98,metalness:0});
      for(let i=0;i<5;i++){
        const la=(i/5)*Math.PI*2;
        const cl=new THREE.Mesh(new THREE.CylinderGeometry(.065,.08,.7,6),cfLogMat);
        cl.position.set(Math.cos(la)*.28,.065,Math.sin(la)*.28);cl.rotation.z=Math.PI/2;cfGroup.add(cl);
      }
      const fireLight=new THREE.PointLight(0xff6010,5,10);
      fireLight.position.y=.5;cfGroup.add(fireLight);
      scene.add(cfGroup);

      /* ── Tent ──────────────────────────────────────────── */
      const tentGroup=new THREE.Group();tentGroup.visible=false;
      const tentMat=new THREE.MeshStandardMaterial({color:0x8a6040,roughness:.85,metalness:0,side:THREE.DoubleSide});
      const tentMesh=new THREE.Mesh(new THREE.ConeGeometry(2.2,2.6,4),tentMat);
      tentMesh.position.y=1.3;
      tentGroup.add(tentMesh);
      scene.add(tentGroup);

      /* ── Weapon attached to camera ─────────────────────── */
      // First-person weapon + hand group
      const fpGroup=new THREE.Group();
      camera.add(fpGroup);
      const skinMat=new THREE.MeshStandardMaterial({color:0xc07848,roughness:.88,metalness:0});
      // Forearm
      const armMesh=new THREE.Mesh(new THREE.CapsuleGeometry(.044,.32,4,8),skinMat);
      armMesh.position.set(.24,-.38,-.22);armMesh.rotation.x=-.55;armMesh.rotation.z=.12;
      fpGroup.add(armMesh);
      // Hand knuckles
      const handMesh=new THREE.Mesh(new THREE.BoxGeometry(.09,.072,.11),skinMat);
      handMesh.position.set(.22,-.26,-.42);fpGroup.add(handMesh);
      // Thumb
      const thumbMesh=new THREE.Mesh(new THREE.CapsuleGeometry(.02,.06,3,5),skinMat);
      thumbMesh.position.set(.16,-.22,-.44);thumbMesh.rotation.z=.6;fpGroup.add(thumbMesh);

      const wGroup=new THREE.Group();
      fpGroup.add(wGroup);

      function buildWeapon(t:string){
        while(wGroup.children.length)wGroup.remove(wGroup.children[0]);
        const dm=new THREE.MeshStandardMaterial({color:0x222222,roughness:.25,metalness:.85});
        const wm=new THREE.MeshStandardMaterial({color:0x3a1e06,roughness:.88,metalness:0});
        wGroup.position.set(.22,-.26,-.42);
        if(t==='pistol'){
          const slide=new THREE.Mesh(new THREE.BoxGeometry(.075,.085,.28),dm);slide.position.set(0,.04,-.1);
          const grip=new THREE.Mesh(new THREE.BoxGeometry(.068,.14,.10),dm);grip.position.set(0,-.04,0);grip.rotation.x=.15;
          const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.18,6),dm);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.042,-.22);
          wGroup.add(slide,grip,barrel);
        }else if(t==='rifle'){
          const body=new THREE.Mesh(new THREE.BoxGeometry(.06,.078,.38),dm);body.position.set(0,.02,-.24);
          const stock=new THREE.Mesh(new THREE.BoxGeometry(.058,.072,.32),wm);stock.position.set(0,.016,.08);
          const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.55,6),dm);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.032,-.58);
          const mag=new THREE.Mesh(new THREE.BoxGeometry(.044,.14,.062),dm);mag.position.set(0,-.06,-.18);
          wGroup.add(body,stock,barrel,mag);
        }else if(t==='shotgun'){
          const body=new THREE.Mesh(new THREE.BoxGeometry(.065,.082,.38),dm);body.position.set(0,.02,-.24);
          const stock=new THREE.Mesh(new THREE.BoxGeometry(.062,.078,.30),wm);stock.position.set(0,.016,.1);
          const b1=new THREE.Mesh(new THREE.CylinderGeometry(.019,.019,.52,6),dm);b1.rotation.x=Math.PI/2;b1.position.set(-.018,.04,-.52);
          const b2=b1.clone();b2.position.x=.018;
          wGroup.add(body,stock,b1,b2);
        }else{
          const body=new THREE.Mesh(new THREE.BoxGeometry(.052,.07,.44),dm);body.position.set(0,.02,-.32);
          const stock=new THREE.Mesh(new THREE.BoxGeometry(.05,.068,.34),wm);stock.position.set(0,.016,.12);
          const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.72,6),dm);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.03,-.78);
          const scope=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,.28,8),dm);scope.rotation.x=Math.PI/2;scope.position.set(0,.072,-.36);
          const lensL=new THREE.Mesh(new THREE.CircleGeometry(.028,8),new THREE.MeshStandardMaterial({color:0x223344,roughness:.05,metalness:.1}));lensL.position.set(0,.072,-.52);lensL.rotation.y=Math.PI;
          const lensR=lensL.clone();lensR.position.z=-.2;lensR.rotation.y=0;
          wGroup.add(body,stock,barrel,scope,lensL,lensR);
        }
      }
      buildWeapon('pistol');

      /* ── Animals ───────────────────────────────────────── */
      interface Animal3D {
        type:string; group:T.Group; hp:number; maxHp:number; meat:number;
        state:'idle'|'alert'|'flee'|'aggro'|'dead';
        alertLevel:number; alertMethod:string;
        angle:number; anim:number; dieT:number;
        trophyScore:number;
      }
      function makeAnimal(type:string):T.Group{
        const g=new THREE.Group();
        const bc:Record<string,number>={deer:0x8b6914,bear:0x2a1a0a,turkey:0x6a4a1a,moose:0x4a3010};
        const bMat=new THREE.MeshStandardMaterial({color:bc[type],roughness:.9,metalness:0});
        const dMat=new THREE.MeshStandardMaterial({color:new THREE.Color(bc[type]).multiplyScalar(.62),roughness:.9,metalness:0});
        if(type==='deer'){
          const body=new THREE.Mesh(new THREE.CapsuleGeometry(.36,.9,8,8),bMat);body.rotation.z=Math.PI/2;body.position.y=1.1;body.castShadow=true;g.add(body);
          [[-0.25,-0.45],[-0.25,.25],[.25,-.45],[.25,.25]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.92,6),dMat);l.position.set(x,.46,z);l.castShadow=true;g.add(l);});
          const neck=new THREE.Mesh(new THREE.CylinderGeometry(.11,.17,.72,7),bMat);neck.position.set(0,1.56,-.52);neck.rotation.x=-.5;neck.castShadow=true;g.add(neck);
          const head=new THREE.Mesh(new THREE.SphereGeometry(.22,8,8),bMat);head.position.set(0,1.98,-.8);head.scale.z=1.38;head.castShadow=true;g.add(head);
          const eye1=new THREE.Mesh(new THREE.SphereGeometry(.04,6,6),new THREE.MeshStandardMaterial({color:0x111111,roughness:.2}));eye1.position.set(-.14,2.05,-.98);g.add(eye1);eye1.clone().position.set(.14,2.05,-.98);g.add(eye1.clone());
          const aMat=new THREE.MeshStandardMaterial({color:0x4a3010,roughness:.95,metalness:0});
          [-.1,.1].forEach(x=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,.52,5),aMat);a.position.set(x,2.18,-.76);a.rotation.z=x*.8;g.add(a);});
        }else if(type==='bear'){
          const body=new THREE.Mesh(new THREE.CapsuleGeometry(.58,.92,8,8),bMat);body.rotation.z=Math.PI/2;body.position.y=.88;body.castShadow=true;g.add(body);
          [[-0.36,-.42],[-.36,.32],[.36,-.42],[.36,.32]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.14,.12,.68,6),dMat);l.position.set(x,.34,z);l.castShadow=true;g.add(l);});
          const head=new THREE.Mesh(new THREE.SphereGeometry(.4,8,8),dMat);head.position.set(0,1.38,-.72);head.castShadow=true;g.add(head);
          const snout=new THREE.Mesh(new THREE.SphereGeometry(.22,8,8),new THREE.MeshStandardMaterial({color:0x5a3a18,roughness:.9}));snout.position.set(0,1.3,-.98);snout.scale.z=1.4;g.add(snout);
          [-.22,.22].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.1,6,6),dMat);e.position.set(x,1.68,-.7);g.add(e);});
        }else if(type==='turkey'){
          const body=new THREE.Mesh(new THREE.SphereGeometry(.4,8,8),bMat);body.position.y=.8;body.scale.z=1.4;body.castShadow=true;g.add(body);
          [-.12,.12].forEach(x=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.04,.03,.58,5),new THREE.MeshStandardMaterial({color:0xa08040,roughness:.9}));l.position.set(x,.29,x*.5);g.add(l);});
          for(let fi=0;fi<8;fi++){const fa=((fi/7)-.5)*Math.PI*.72;const fan=new THREE.Mesh(new THREE.PlaneGeometry(.2,.58),new THREE.MeshStandardMaterial({color:0x8a5a10,side:THREE.DoubleSide,roughness:.9}));fan.position.set(Math.sin(fa)*.28,.9,Math.cos(fa)*.28+.2);fan.rotation.y=-fa;g.add(fan);}
          const head=new THREE.Mesh(new THREE.SphereGeometry(.14,6,6),dMat);head.position.set(0,1.15,-.52);g.add(head);
          const wattle=new THREE.Mesh(new THREE.SphereGeometry(.06,5,5),new THREE.MeshStandardMaterial({color:0xcc2222,roughness:.6}));wattle.position.set(0,1.05,-.62);g.add(wattle);
        }else{
          const body=new THREE.Mesh(new THREE.CapsuleGeometry(.62,1.22,8,8),bMat);body.rotation.z=Math.PI/2;body.position.y=1.42;body.castShadow=true;g.add(body);
          [[-0.36,-.62],[-.36,.36],[.36,-.62],[.36,.36]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.1,.08,1.22,6),dMat);l.position.set(x,.61,z);l.castShadow=true;g.add(l);});
          const neck=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,.9,7),bMat);neck.position.set(0,2.18,-.72);neck.rotation.x=-.58;g.add(neck);
          const head=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.72),dMat);head.position.set(0,2.68,-1.18);g.add(head);
          const bell=new THREE.Mesh(new THREE.CapsuleGeometry(.07,.28,4,6),dMat);bell.position.set(0,2.4,-1.3);g.add(bell);
          const aMat=new THREE.MeshStandardMaterial({color:0x5a3a10,roughness:.95,metalness:0});
          [-1,1].forEach(s=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,.95,5),aMat);m.position.set(s*.22,3.08,-1.16);m.rotation.z=s*.42;g.add(m);const p=new THREE.Mesh(new THREE.BoxGeometry(.72,.08,.36),aMat);p.position.set(s*.52,3.45,-1.16);g.add(p);});
        }
        return g;
      }

      const animals:Animal3D[]=[];
      const aDefs:[string,number,number,number][]=isMob2?[['deer',4,80,2],['bear',2,300,3],['turkey',4,50,1],['moose',2,220,4]]:[['deer',7,80,2],['bear',3,300,3],['turkey',7,50,1],['moose',3,220,4]];
      aDefs.forEach(([type,n,hp,meat])=>{
        for(let i=0;i<n;i++){
          const a=Math.random()*Math.PI*2,d=22+Math.random()*100;
          const ax=Math.cos(a)*d,az=Math.sin(a)*d;
          const ld=Math.sqrt((ax-80)**2+(az-80)**2);
          if(ld<36)continue;
          const grp=makeAnimal(type);
          grp.position.set(ax,groundY(ax,az,0),az);
          scene.add(grp);
          const ts=Math.random();
          animals.push({type,group:grp,hp,maxHp:hp,meat,state:'idle',alertLevel:0,alertMethod:'',angle:Math.random()*Math.PI*2,anim:Math.random()*10,dieT:0,trophyScore:ts});
        }
      });

      /* ── Blood drops ───────────────────────────────────── */
      const bloodGeo=new THREE.SphereGeometry(.06,4,4);
      const bloodMat=new THREE.MeshStandardMaterial({color:0x8a0000,roughness:.9,metalness:0});
      const bloodDrops:{mesh:T.Mesh;life:number}[]=[];
      function addBlood(x:number,y:number,z:number){
        for(let i=0;i<5;i++){
          const m=new THREE.Mesh(bloodGeo,bloodMat);
          m.position.set(x+(Math.random()-.5)*.8,y+.01,z+(Math.random()-.5)*.8);
          m.scale.setScalar(.5+Math.random()*.8);
          scene.add(m);bloodDrops.push({mesh:m,life:30});
        }
      }

      /* ── Game state ────────────────────────────────────── */
      const gs={
        pos:new THREE.Vector3(0,1.75,0), yaw:0, pitch:0,
        hp:100, maxHp:100, ammo:18, maxAmmo:18, weapon:'pistol',
        weapons:new Set<string>(['pistol']),
        quests:QUESTS.map(q=>({...q,prog:0,done:false})),
        inv:{deer:0,bear:0,turkey:0,moose:0,fish:0,cooked:0},
        campfire:false, cfPos:new THREE.Vector3(4,0,4),
        tent:false,
        fishing:false, fishT:0, fishBite:false, fishBiteT:0,
        tod:0.55, windAngle:Math.random()*Math.PI*2,
        windT:0,
        crouching:false, scoped:false, moving:false,
        shotAnim:0, recoil:0, walkBob:0,
        keys:new Set<string>(),
        mouse:{dx:0,dy:0},
        joy1:{on:false,sx:0,sy:0,cx:0,cy:0,id:-1},
        joy2:{on:false,sx:0,sy:0,cx:0,cy:0,id:-1},
        msg:'',msgT:0,
        trophies:[] as {type:string;rating:string;score:number}[],
        lastT:0,
      };
      gsRef.current=gs;

      function setMsg(m:string){gs.msg=m;gs.msgT=4;}

      /* ── Input ─────────────────────────────────────────── */
      function shoot(){
        if(gs.ammo<=0){setMsg('No ammo!');return;}
        gs.ammo--;gs.shotAnim=.4;gs.recoil=.22;
        const dmg:Record<string,number>={pistol:22,rifle:62,shotgun:85,sniper:155};
        const rng:Record<string,number>={pistol:80,rifle:200,shotgun:55,sniper:320};
        const dir=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(gs.pitch,gs.yaw,0,'YXZ'));
        const ray=new THREE.Raycaster(gs.pos.clone(),dir,0.1,rng[gs.weapon]||80);
        animals.forEach(a=>{
          if(a.state==='dead')return;
          const hits=ray.intersectObject(a.group,true);
          if(!hits.length)return;
          a.hp-=dmg[gs.weapon]||22;
          const adef=ADEF[a.type];
          a.state=a.type==='bear'&&a.hp>0?'aggro':'flee';
          addBlood(hits[0].point.x,hits[0].point.y,hits[0].point.z);
          if(a.hp<=0){
            a.state='dead';a.dieT=4;
            gs.inv[a.type as keyof typeof gs.inv]++;
            const rating=a.trophyScore>.92?'💎 Diamond':a.trophyScore>.7?'🥇 Gold':a.trophyScore>.4?'🥈 Silver':'🥉 Bronze';
            gs.trophies.push({type:a.type,rating,score:Math.round(a.trophyScore*100)});
            const q=gs.quests.find(q=>q.key===a.type);
            if(q&&!q.done){q.prog++;if(q.prog>=q.goal){q.done=true;unlockReward(q);}}
            setMsg(`${a.type.charAt(0).toUpperCase()+a.type.slice(1)} downed! ${rating} trophy!`);
          }
        });
      }

      function capitalize(s:string){return s[0].toUpperCase()+s.slice(1);}

      function unlockReward(q:typeof gs.quests[0]){
        if(q.id==='q1'&&!gs.weapons.has('rifle')){gs.weapons.add('rifle');gs.weapon='rifle';gs.ammo=gs.maxAmmo;buildWeapon('rifle');setMsg('🎯 Hunting Rifle unlocked!');}
        if(q.id==='q2'&&!gs.weapons.has('shotgun')){gs.weapons.add('shotgun');gs.weapon='shotgun';gs.ammo=gs.maxAmmo;buildWeapon('shotgun');setMsg('💥 Shotgun unlocked!');}
        if(q.id==='q3'&&!gs.weapons.has('sniper')){gs.weapons.add('sniper');gs.weapon='sniper';gs.maxAmmo=30;gs.ammo=30;buildWeapon('sniper');setMsg('🔭 Sniper unlocked!');}
        if(q.id==='q4'){gs.maxAmmo+=60;gs.ammo=Math.min(gs.ammo+60,gs.maxAmmo);setMsg('📦 +60 Ammo!');}
        if(q.id==='q5'){gs.maxHp+=50;gs.hp=gs.maxHp;setMsg('🦺 Hunting Vest — +50 HP!');}
      }

      function interact(){
        const lk=new THREE.Vector3(80,0,80);
        const lakeDist=new THREE.Vector3(gs.pos.x,0,gs.pos.z).distanceTo(lk);
        if(lakeDist<30){
          gs.fishing=!gs.fishing;gs.fishT=0;gs.fishBite=false;
          setMsg(gs.fishing?'🎣 Fishing... wait for a bite!':'Stopped fishing.');return;
        }
        const fd=new THREE.Vector3(gs.pos.x,0,gs.pos.z).distanceTo(new THREE.Vector3(gs.cfPos.x,0,gs.cfPos.z));
        if(gs.campfire&&fd<10){
          const raw=Object.entries(gs.inv).filter(([k])=>['deer','bear','turkey','moose'].includes(k)).reduce((a,[,v])=>a+(v as number),0);
          if(raw>0){gs.inv.cooked+=raw;(['deer','bear','turkey','moose'] as const).forEach(k=>gs.inv[k]=0);setMsg(`🍖 Cooked ${raw} meat!`);}
          else if(gs.inv.cooked>0){gs.hp=Math.min(gs.maxHp,gs.hp+35);gs.inv.cooked--;setMsg('🍖 Ate cooked meat. +35 HP!');}
          else setMsg('No meat to cook.');return;
        }
      }

      const onKD=(e:KeyboardEvent)=>{
        gs.keys.add(e.code);
        if(e.code==='KeyF')shoot();
        if(e.code==='KeyE')interact();
        if(e.code==='KeyT'){gs.tent=true;tentGroup.position.set(gs.pos.x+Math.sin(gs.yaw)*-4,groundY(gs.pos.x,gs.pos.z,0),gs.pos.z+Math.cos(gs.yaw)*-4);tentGroup.visible=true;setMsg('⛺ Tent placed!');}
        if(e.code==='KeyC'){gs.campfire=true;gs.cfPos.set(gs.pos.x+Math.sin(gs.yaw)*-3,0,gs.pos.z+Math.cos(gs.yaw)*-3);cfGroup.position.copy(gs.cfPos);cfGroup.visible=true;setMsg('🔥 Campfire lit!');}
        if(e.code==='KeyQ')gs.crouching=!gs.crouching;
        if(e.code==='KeyZ')gs.scoped=!gs.scoped;
        if(e.code==='KeyG'){const w=Array.from(gs.weapons),ci=w.indexOf(gs.weapon);gs.weapon=w[(ci+1)%w.length];buildWeapon(gs.weapon);}
        if(e.code==='Tab'){e.preventDefault();setPanel(p=>p==='none'?'quests':'none');}
      };
      const onKU=(e:KeyboardEvent)=>gs.keys.delete(e.code);
      window.addEventListener('keydown',onKD);window.addEventListener('keyup',onKU);

      const isMobileDevice='ontouchstart' in window;
      const onMM=(e:MouseEvent)=>{
        if(document.pointerLockElement===renderer.domElement){
          gs.mouse.dx+=e.movementX*.002;gs.mouse.dy+=e.movementY*.002;
        }
      };
      if(!isMobileDevice){
        renderer.domElement.addEventListener('click',()=>{
          try{renderer.domElement.requestPointerLock();}catch(err){}
        });
        window.addEventListener('mousemove',onMM);
        window.addEventListener('mousedown',(e:MouseEvent)=>{
          if(e.button===0&&document.pointerLockElement===renderer.domElement)shoot();
        });
      }

      // Touch input
      const onTS=(e:TouchEvent)=>{
        e.preventDefault();
        for(const t of Array.from(e.changedTouches)){
          if(t.clientX<innerWidth*.45&&gs.joy1.id===-1){gs.joy1={on:true,sx:t.clientX,sy:t.clientY,cx:t.clientX,cy:t.clientY,id:t.identifier};}
          else if(t.clientX>innerWidth*.45&&gs.joy2.id===-1){gs.joy2={on:true,sx:t.clientX,sy:t.clientY,cx:t.clientX,cy:t.clientY,id:t.identifier};}
        }
      };
      const onTM=(e:TouchEvent)=>{e.preventDefault();for(const t of Array.from(e.changedTouches)){if(t.identifier===gs.joy1.id){gs.joy1.cx=t.clientX;gs.joy1.cy=t.clientY;}if(t.identifier===gs.joy2.id){const dx=(t.clientX-gs.joy2.cx)*.0035,dy=(t.clientY-gs.joy2.cy)*.0035;gs.mouse.dx+=dx;gs.mouse.dy+=dy;gs.joy2.cx=t.clientX;gs.joy2.cy=t.clientY;}}};
      const onTE=(e:TouchEvent)=>{e.preventDefault();for(const t of Array.from(e.changedTouches)){if(t.identifier===gs.joy1.id)gs.joy1={on:false,sx:0,sy:0,cx:0,cy:0,id:-1};if(t.identifier===gs.joy2.id)gs.joy2={on:false,sx:0,sy:0,cx:0,cy:0,id:-1};}};
      renderer.domElement.addEventListener('touchstart',onTS,{passive:false});
      renderer.domElement.addEventListener('touchmove',onTM,{passive:false});
      renderer.domElement.addEventListener('touchend',onTE,{passive:false});
      renderer.domElement.addEventListener('touchcancel',onTE,{passive:false});

      /* ── Resize ────────────────────────────────────────── */
      function onResize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(hudRef.current){hudRef.current.width=innerWidth;hudRef.current.height=innerHeight;}}
      window.addEventListener('resize',onResize);
      if(hudRef.current){hudRef.current.width=innerWidth;hudRef.current.height=innerHeight;}

      /* ── Update ────────────────────────────────────────── */
      function update(dt:number){
        // TOD + wind
        gs.tod=(gs.tod+dt/480000)%1;
        gs.windT+=dt;
        gs.windAngle+=Math.sin(gs.windT*.0001)*.0002+Math.cos(gs.windT*.00007)*.00015;

        // Camera look
        gs.yaw-=gs.mouse.dx;gs.mouse.dx*=.15;
        gs.pitch=Math.max(-.75,Math.min(.65,gs.pitch-gs.mouse.dy));gs.mouse.dy*=.15;
        if(gs.keys.has('ArrowLeft'))gs.yaw+=dt*.002;
        if(gs.keys.has('ArrowRight'))gs.yaw-=dt*.002;

        // Movement
        const fwd=new THREE.Vector3(-Math.sin(gs.yaw),0,-Math.cos(gs.yaw));
        const rgt=new THREE.Vector3(Math.cos(gs.yaw),0,-Math.sin(gs.yaw));
        const spd=(gs.crouching?2.8:5.2)*(dt/1000);
        let moved=false;
        if(gs.keys.has('KeyW')||gs.keys.has('ArrowUp')){gs.pos.addScaledVector(fwd,spd);moved=true;}
        if(gs.keys.has('KeyS')||gs.keys.has('ArrowDown')){gs.pos.addScaledVector(fwd,-spd);moved=true;}
        if(gs.keys.has('KeyA')){gs.pos.addScaledVector(rgt,-spd);moved=true;}
        if(gs.keys.has('KeyD')){gs.pos.addScaledVector(rgt,spd);moved=true;}
        if(gs.joy1.on){const jdx=gs.joy1.cx-gs.joy1.sx,jdy=gs.joy1.cy-gs.joy1.sy;const jd=Math.sqrt(jdx**2+jdy**2);if(jd>8){gs.pos.addScaledVector(fwd,-jdy/Math.max(jd,55)*spd*1.8);gs.pos.addScaledVector(rgt,jdx/Math.max(jd,55)*spd*1.8);moved=true;}}
        gs.moving=moved;
        gs.pos.x=Math.max(-180,Math.min(180,gs.pos.x));
        gs.pos.z=Math.max(-180,Math.min(180,gs.pos.z));

        // Terrain stick
        const ty=groundY(gs.pos.x,gs.pos.z,gs.crouching?1.1:1.75);
        gs.pos.y+=(ty-gs.pos.y)*.25;

        // Walk bob
        if(moved)gs.walkBob+=dt*.008;
        const bob=Math.sin(gs.walkBob)*( gs.crouching?.025:.05);
        // Weapon bob and recoil
        const bT=Date.now()*.001;
        fpGroup.position.set(Math.sin(bT*.9)*.004,bob*.4-gs.recoil,0);
        fpGroup.rotation.x=-gs.recoil*.5+Math.sin(bT*.7)*.003;
        gs.recoil=Math.max(0,gs.recoil-dt*.0012);
        gs.shotAnim=Math.max(0,gs.shotAnim-dt*.002);

        // Scope FOV
        const targetFOV=gs.scoped?(gs.weapon==='sniper'?15:gs.weapon==='rifle'?30:50):72;
        camera.fov+=(targetFOV-camera.fov)*.14;
        camera.updateProjectionMatrix();

        // Camera
        camera.position.copy(gs.pos).add(new THREE.Vector3(0,bob,0));
        camera.rotation.order='YXZ';camera.rotation.y=gs.yaw;camera.rotation.x=gs.pitch;

        // TOD lighting
        const todNorm=(gs.tod+.5)%1; // 0=midnight, .5=noon
        const sunPhi=todNorm*Math.PI*2; // full circle
        const isDaytime=gs.tod>.25&&gs.tod<.78;
        const sunH=Math.max(0,Math.sin((gs.tod-.25)/(.78-.25)*Math.PI));
        sun.position.set(Math.cos(sunPhi)*220,Math.sin(sunPhi)*180,60);
        sunDisc.position.copy(sun.position).normalize().multiplyScalar(460);
        sun.intensity=isDaytime?Math.max(0,sunH*2.4):0;
        sun.color.setHSL(isDaytime?(.12+sunH*.04):0,.9,.85);
        ambient.intensity=isDaytime?.3+sunH*.7:.1;
        ambient.color.set(isDaytime?0xfff8e0:0x101828);
        hemi.intensity=isDaytime?.2+sunH*.4:.06;
        const skyS=(isDaytime?new THREE.Color(0x4a82c8):new THREE.Color(0x050c20));
        const horS=(isDaytime?new THREE.Color(0xc8dce8):new THREE.Color(0x101828));
        (skyMesh.material as any).uniforms.uSky.value.lerp(skyS,.04);
        (skyMesh.material as any).uniforms.uHorizon.value.lerp(horS,.04);
        const fogC=isDaytime?new THREE.Color(0x8aaa80):new THREE.Color(0x060c18);
        (scene.fog as any).color.lerp(fogC,.04);
        (scene.fog as any).density=isDaytime?.004:.012;
        sunDisc.visible=isDaytime&&sunH>.1;
        waterMat.uniforms.uTime.value+=dt*.001;

        // Campfire flicker
        if(gs.campfire){fireLight.intensity=4+Math.sin(Date.now()*.014)*2+Math.random()*.6;fireLight.color.setHSL(.06+Math.random()*.04,1,.5);}

        // Grass update
        updateGrass(gs.pos.x,gs.pos.z);

        // Animal detection (wind/sight/sound)
        const windX=Math.cos(gs.windAngle),windZ=Math.sin(gs.windAngle);
        animals.forEach(a=>{
          if(a.state==='dead'){
            a.dieT=Math.max(0,a.dieT-dt*.001);
            if(a.dieT<2){a.group.rotation.z=Math.min(Math.PI/2,a.group.rotation.z+dt*.002);a.group.position.y-=dt*.0003;}
            return;
          }
          a.anim+=dt*.003;
          const adef=ADEF[a.type];
          const dx=gs.pos.x-a.group.position.x,dz=gs.pos.z-a.group.position.z;
          const dist=Math.sqrt(dx*dx+dz*dz)||.01;

          // Detection
          if(a.state!=='flee'&&a.state!=='aggro'){
            let detected=false;let method='';
            // Smell (wind-based)
            const toPlayer=new THREE.Vector2(dx,dz).normalize();
            const wind2=new THREE.Vector2(windX,windZ);
            const windDot=toPlayer.dot(wind2); // >0 = player upwind (safe)
            const smellFactor=Math.max(0,-windDot);
            if(smellFactor>.55&&dist<adef.smellR*smellFactor){detected=true;method='smell 💨';}
            // Sound
            const soundRad=gs.crouching?adef.soundR*.25:gs.moving?adef.soundR*.75:adef.soundR*.08;
            if(!detected&&dist<soundRad){detected=true;method='sound 👂';}
            // Sight
            if(!detected){
              const animalFwd=new THREE.Vector2(Math.sin(a.angle),Math.cos(a.angle));
              const toP=new THREE.Vector2(-dx,-dz).normalize();
              const dot=animalFwd.dot(toP);
              if(dot>Math.cos(adef.sightA)&&dist<adef.sightR){detected=true;method='sight 👁️';}
            }
            if(detected){
              a.alertLevel=Math.min(1,a.alertLevel+dt*.0015);
              a.alertMethod=method;
              if(a.alertLevel>1){a.state=a.type==='bear'?'aggro':'flee';a.alertLevel=0;setMsg(`${capitalize(a.type)} spooked! (${method})`);}
            }else{
              a.alertLevel=Math.max(0,a.alertLevel-dt*.0008);
            }
          }

          // Move
          const mSpd=(a.state==='flee'?adef.spd:a.state==='aggro'?adef.aSpd||5:.6)*(dt/1000);
          if(a.state==='flee'){
            const fd=Math.sqrt(dx*dx+dz*dz)||1;
            a.group.position.x-=dx/fd*mSpd;a.group.position.z-=dz/fd*mSpd;a.angle=Math.atan2(-dx,-dz);
          }else if(a.state==='aggro'){
            const fd=Math.sqrt(dx*dx+dz*dz)||1;
            a.group.position.x+=dx/fd*mSpd;a.group.position.z+=dz/fd*mSpd;a.angle=Math.atan2(dx,dz);
            if(dist<3&&gs.hp>0){gs.hp=Math.max(0,gs.hp-14*(dt/1000));}
          }else{
            if(Math.random()<.004)a.angle+=(Math.random()-.5)*1.4;
            a.group.position.x+=Math.sin(a.angle)*mSpd*.4;
            a.group.position.z+=Math.cos(a.angle)*mSpd*.4;
          }
          a.group.position.x=Math.max(-170,Math.min(170,a.group.position.x));
          a.group.position.z=Math.max(-170,Math.min(170,a.group.position.z));
          a.group.position.y=groundY(a.group.position.x,a.group.position.z,0);
          a.group.rotation.y=a.angle;
          // Body bob
          a.group.children.forEach((c:any,i)=>{if(i<3)c.position.y+=Math.sin(a.anim*2+i)*.003;});
          // Reset flee if far enough
          if(a.state==='flee'&&dist>80)a.state='idle';
        });

        // Blood cleanup
        for(let i=bloodDrops.length-1;i>=0;i--){bloodDrops[i].life--;if(bloodDrops[i].life<=0){scene.remove(bloodDrops[i].mesh);bloodDrops.splice(i,1);}}

        // Fishing
        if(gs.fishing){
          gs.fishT+=dt;
          if(!gs.fishBite&&gs.fishT>3000+Math.random()*4000){gs.fishBite=true;gs.fishBiteT=1800;setMsg('🎣 BITE! Press [E]!');}
          if(gs.fishBite){gs.fishBiteT-=dt;if(gs.fishBiteT<=0){gs.fishBite=false;gs.fishT=0;setMsg('It got away...');}}
          if(gs.fishBite&&gs.keys.has('KeyE')){gs.fishBite=false;gs.fishT=0;gs.inv.fish++;const q=gs.quests.find(q=>q.id==='q4');if(q&&!q.done){q.prog++;if(q.prog>=q.goal){q.done=true;unlockReward(q);}}setMsg(`🐟 Caught one! (${gs.inv.fish} total)`);}
        }

        // Timers
        if(gs.msgT>0)gs.msgT=Math.max(0,gs.msgT-dt*.001);

        // Sync snapshot
        // Throttle React state updates to ~4fps to not kill mobile
        gs.lastT=(gs.lastT||0)+dt;
        if(gs.lastT>250){gs.lastT=0;
          setSnap({hp:Math.round(gs.hp),maxHp:gs.maxHp,ammo:gs.ammo,maxAmmo:gs.maxAmmo,weapon:gs.weapon,quests:gs.quests.map(q=>({...q})),inv:{...gs.inv},campfire:gs.campfire,tent:gs.tent,crouching:gs.crouching,scoped:gs.scoped,msg:gs.msg,msgTimer:gs.msgT,tod:gs.tod,windDeg:Math.round((gs.windAngle*180/Math.PI+360)%360),trophies:gs.trophies});
        }
      }

      /* ── HUD ───────────────────────────────────────────── */
      const hud=hudRef.current!;
      const hx=hud.getContext('2d')!;
      function drawHUD(){
        hx.clearRect(0,0,hud.width,hud.height);
        const W=hud.width,H=hud.height;
        const mob='ontouchstart' in window;

        // Scope overlay
        if(gs.scoped){
          hx.fillStyle='rgba(0,0,0,.88)';
          hx.fillRect(0,0,W,H);
          const r=Math.min(W,H)*.38;
          hx.save();hx.beginPath();hx.arc(W/2,H/2,r,0,Math.PI*2);hx.clip();hx.clearRect(W/2-r,H/2-r,r*2,r*2);hx.restore();
          hx.strokeStyle='rgba(255,255,255,.6)';hx.lineWidth=1.5;
          hx.beginPath();hx.arc(W/2,H/2,r,0,Math.PI*2);hx.stroke();
          hx.beginPath();hx.moveTo(W/2-r,H/2);hx.lineTo(W/2+r,H/2);hx.moveTo(W/2,H/2-r);hx.lineTo(W/2,H/2+r);hx.stroke();
          for(let i=-4;i<=4;i++){if(i===0)continue;hx.fillStyle='rgba(255,255,255,.5)';hx.font='10px monospace';hx.textAlign='center';hx.fillText(`${i}`,W/2+i*r/5,H/2+14);}
          hx.fillStyle='rgba(0,255,0,.12)';hx.fillRect(W/2-r,H/2-1.5,r*2,3);
        }else{
          // Crosshair
          const cx=W/2,cy=H/2,cs=11;
          hx.strokeStyle='rgba(255,255,255,.88)';hx.lineWidth=1.4;hx.lineCap='round';
          hx.beginPath();hx.moveTo(cx-cs,cy);hx.lineTo(cx-3,cy);hx.moveTo(cx+3,cy);hx.lineTo(cx+cs,cy);hx.moveTo(cx,cy-cs);hx.lineTo(cx,cy-3);hx.moveTo(cx,cy+3);hx.lineTo(cx,cy+cs);hx.stroke();
          hx.beginPath();hx.arc(cx,cy,2.2,0,Math.PI*2);hx.fillStyle='rgba(255,255,255,.5)';hx.fill();
        }

        // Compass (top center)
        const compR=36, compX=W/2, compY=50;
        hx.save();hx.fillStyle='rgba(0,0,0,.55)';hx.beginPath();hx.arc(compX,compY,compR+4,0,Math.PI*2);hx.fill();
        hx.strokeStyle='rgba(255,255,255,.2)';hx.lineWidth=1;hx.beginPath();hx.arc(compX,compY,compR+4,0,Math.PI*2);hx.stroke();
        // Cardinal labels
        ['N','E','S','W'].forEach((d,i)=>{const a=(i/4)*Math.PI*2-gs.yaw;const lx=compX+Math.sin(a)*compR,ly=compY-Math.cos(a)*compR;hx.fillStyle=d==='N'?'#ef4444':'rgba(255,255,255,.7)';hx.font=`bold ${d==='N'?13:10}px sans-serif`;hx.textAlign='center';hx.textBaseline='middle';hx.fillText(d,lx,ly);});
        // Forward indicator
        hx.strokeStyle='rgba(255,200,50,.9)';hx.lineWidth=2;hx.beginPath();hx.moveTo(compX,compY-8);hx.lineTo(compX,compY-compR+6);hx.stroke();
        hx.restore();

        // Wind indicator (top right)
        const wx=W-65,wy=52;
        hx.save();hx.fillStyle='rgba(0,0,0,.5)';hx.beginPath();hx.arc(wx,wy,28,0,Math.PI*2);hx.fill();
        hx.strokeStyle='rgba(255,255,255,.15)';hx.lineWidth=1;hx.beginPath();hx.arc(wx,wy,28,0,Math.PI*2);hx.stroke();
        // Wind arrow
        const wa=gs.windAngle-gs.yaw;
        hx.strokeStyle='#7dd3fc';hx.lineWidth=2;hx.lineCap='round';
        hx.beginPath();hx.moveTo(wx+Math.sin(wa+Math.PI)*18,wy-Math.cos(wa+Math.PI)*18);hx.lineTo(wx+Math.sin(wa)*18,wy-Math.cos(wa)*18);hx.stroke();
        hx.fillStyle='#7dd3fc';hx.beginPath();hx.moveTo(wx+Math.sin(wa)*22,wy-Math.cos(wa)*22);hx.lineTo(wx+Math.sin(wa+2.5)*12,wy-Math.cos(wa+2.5)*12);hx.lineTo(wx+Math.sin(wa-2.5)*12,wy-Math.cos(wa-2.5)*12);hx.fill();
        hx.fillStyle='rgba(125,211,252,.7)';hx.font='8px sans-serif';hx.textAlign='center';hx.textBaseline='middle';hx.fillText('WIND',wx,wy+38);
        hx.restore();

        // Animal detection meters
        let detY=105;
        animals.forEach(a=>{
          if(a.alertLevel<=0||a.state==='dead')return;
          const lbl=`${capitalize(a.type)} ${a.alertMethod}`;
          const mw=130,mh=6;const mx2=(W-mw)/2;
          hx.fillStyle='rgba(0,0,0,.55)';hx.fillRect(mx2-2,detY-2,mw+4,mh+14);
          hx.fillStyle=a.alertLevel>.7?'#ef4444':a.alertLevel>.4?'#fb923c':'#fbbf24';
          hx.fillRect(mx2,detY+10,mw*a.alertLevel,mh);
          hx.fillStyle='white';hx.font='9px monospace';hx.textAlign='center';hx.fillText(lbl,W/2,detY+8);
          detY+=26;
        });

        // HP bar (bottom left)
        const hpPct=Math.max(0,gs.hp/gs.maxHp);
        hx.fillStyle='rgba(0,0,0,.6)';hx.fillRect(14,H-52,155,22);
        const hpG=hx.createLinearGradient(16,0,152,0);hpG.addColorStop(0,'#dc2626');hpG.addColorStop(.5,'#ea580c');hpG.addColorStop(1,'#16a34a');
        hx.fillStyle=hpG;hx.fillRect(16,H-50,142*hpPct,18);
        hx.fillStyle='white';hx.font='bold 11px monospace';hx.textAlign='left';hx.fillText(`❤️  ${Math.ceil(gs.hp)} / ${gs.maxHp}`,18,H-35);

        // Ammo bottom right
        hx.fillStyle='rgba(0,0,0,.6)';hx.fillRect(W-175,H-52,163,22);
        hx.fillStyle=gs.scoped?'#fbbf24':'#f8f8f8';hx.font='bold 13px monospace';hx.textAlign='right';
        hx.fillText(`${gs.weapon.toUpperCase()}  ${gs.ammo}/${gs.maxAmmo}`,W-16,H-34);
        if(gs.crouching){hx.fillStyle='#4ade80';hx.font='bold 10px monospace';hx.textAlign='left';hx.fillText('🦆 CROUCHING',16,H-55);}

        // Status (time/weather)
        const hr=Math.floor(gs.tod*24);const ampm=hr<12?'AM':'PM';const h12=(hr%12||12);
        hx.fillStyle='rgba(0,0,0,.48)';hx.fillRect(W/2-60,H-40,120,22);
        hx.fillStyle='rgba(255,255,255,.75)';hx.font='11px monospace';hx.textAlign='center';hx.fillText(`⏰ ${h12}:00 ${ampm}`,W/2,H-23);

        // Message
        if(gs.msgT>0){hx.globalAlpha=Math.min(1,gs.msgT);hx.fillStyle='rgba(0,0,0,.62)';hx.fillRect(W/2-240,H*.32-18,480,32);hx.fillStyle='#ffd700';hx.font='bold 15px sans-serif';hx.textAlign='center';hx.fillText(gs.msg,W/2,H*.32);hx.globalAlpha=1;}

        // Fishing
        if(gs.fishing){hx.fillStyle='rgba(20,60,140,.78)';hx.fillRect(W/2-155,H*.27-16,310,26);hx.fillStyle=gs.fishBite?'#ffd700':'#7dd3fc';hx.font='bold 13px sans-serif';hx.textAlign='center';hx.fillText(gs.fishBite?'🎣 BITE! Press [E] now!':'🎣 Fishing — waiting for bite...',W/2,H*.27);}

        // Keys hint (desktop)
        if(!mob){
          hx.fillStyle='rgba(0,0,0,.45)';hx.fillRect(14,H-82,230,26);
          hx.fillStyle='rgba(255,255,255,.5)';hx.font='9px monospace';hx.textAlign='left';
          hx.fillText('[F]=Shoot [E]=Act [T]=Tent [C]=Fire [Q]=Crouch [Z]=Scope [G]=Gun [TAB]=Quests',18,H-63);
        }

        // Mobile UI
        if(mob){
          // Move stick
          hx.globalAlpha=.28;hx.fillStyle='white';hx.beginPath();hx.arc(80,H-95,48,0,Math.PI*2);hx.fill();
          if(gs.joy1.on){const jdx=gs.joy1.cx-gs.joy1.sx,jdy=gs.joy1.cy-gs.joy1.sy,jd=Math.sqrt(jdx**2+jdy**2);const cx2=gs.joy1.sx+jdx*(jd>48?48/jd:1),cy2=gs.joy1.sy+jdy*(jd>48?48/jd:1);hx.globalAlpha=.5;hx.beginPath();hx.arc(cx2,cy2,24,0,Math.PI*2);hx.fill();}
          hx.globalAlpha=1;hx.fillStyle='rgba(255,255,255,.38)';hx.font='10px sans-serif';hx.textAlign='center';hx.fillText('MOVE',80,H-92);

          // Action buttons (right side)
          const btns=[
            {x:W-62,y:H-200,lbl:'🔫',act:'shoot',col:'rgba(200,0,0,.7)',r:36},
            {x:W-130,y:H-130,lbl:'🔭',act:'scope',col:gs.scoped?'rgba(251,191,36,.7)':'rgba(50,80,50,.6)',r:26},
            {x:W-62,y:H-130,lbl:'🦆',act:'crouch',col:gs.crouching?'rgba(74,222,128,.6)':'rgba(50,60,50,.6)',r:26},
            {x:W-130,y:H-200,lbl:'🎯',act:'interact',col:'rgba(60,80,200,.6)',r:26},
          ];
          btns.forEach(b=>{
            hx.globalAlpha=.88;hx.fillStyle=b.col;hx.beginPath();hx.arc(b.x,b.y,b.r,0,Math.PI*2);hx.fill();
            hx.globalAlpha=1;hx.font=`${b.r*.9}px sans-serif`;hx.textAlign='center';hx.textBaseline='middle';hx.fillText(b.lbl,b.x,b.y);hx.textBaseline='alphabetic';
          });
        }
      }

      // Mobile button tap handler
      renderer.domElement.addEventListener('touchstart',(e:TouchEvent)=>{
        e.preventDefault();
        const W=innerWidth,H=innerHeight;
        for(const t of Array.from(e.changedTouches)){
          const tx=t.clientX,ty=t.clientY;
          // Fire
          if(Math.sqrt((tx-(W-62))**2+(ty-(H-200))**2)<36)shoot();
          // Scope
          if(Math.sqrt((tx-(W-130))**2+(ty-(H-130))**2)<26)gs.scoped=!gs.scoped;
          // Crouch
          if(Math.sqrt((tx-(W-62))**2+(ty-(H-130))**2)<26)gs.crouching=!gs.crouching;
          // Interact
          if(Math.sqrt((tx-(W-130))**2+(ty-(H-200))**2)<26)interact();
        }
      },{passive:false});

      /* ── Render loop ───────────────────────────────────── */
      let lastT=0;
      function loop(t:number){
        if(!alive)return;
        const dt=Math.min(t-lastT,80);lastT=t;
        update(dt);renderer.render(scene,camera);drawHUD();
        raf=requestAnimationFrame(loop);
      }
      raf=requestAnimationFrame(loop);
      setLoading(false);

      return()=>{
        window.removeEventListener('keydown',onKD);window.removeEventListener('keyup',onKU);
        window.removeEventListener('mousemove',onMM);window.removeEventListener('resize',onResize);
      };
      }catch(e:any){
        console.error('Game init error:',e);
        setErrMsg('Error: '+(e?.message||String(e)));
        setLoading(false);
      }
    }

    const cleanup=init();
    return()=>{
      alive=false;cancelAnimationFrame(raf);
      renderer?.dispose();
      if(renderer?.domElement&&mountRef.current?.contains(renderer.domElement))mountRef.current.removeChild(renderer.domElement);
      cleanup.then(fn=>fn?.());
    };
  },[]);

  return (
    <div style={{position:'relative',width:'100vw',height:'100dvh',overflow:'hidden',background:'#000',userSelect:'none',WebkitUserSelect:'none' as 'none'}}>
      <div ref={mountRef} style={{position:'absolute',inset:0}}/>
      <canvas ref={hudRef} style={{position:'absolute',inset:0,pointerEvents:'none',width:'100%',height:'100%'}}/>

      {/* Loading screen */}
      {loading&&!errMsg&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#030a04',zIndex:20}}>
          <div style={{fontSize:48,marginBottom:16}}>🌲</div>
          <div style={{color:'#4ade80',fontWeight:'bold',fontSize:18,marginBottom:8}}>Loading Wilderness...</div>
          <div style={{width:200,height:4,background:'rgba(255,255,255,.1)',borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',width:'60%',background:'#4ade80',borderRadius:2,animation:'slide 1.4s ease-in-out infinite'}}/>
          </div>
          <style>{`@keyframes slide{0%{transform:translateX(-200%)}100%{transform:translateX(300%)}}`}</style>
        </div>
      )}

      {/* Error screen */}
      {errMsg&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0a0404',zIndex:20,padding:24,textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
          <div style={{color:'#f87171',fontWeight:'bold',fontSize:16,marginBottom:8}}>Failed to start game</div>
          <div style={{color:'rgba(255,255,255,.5)',fontSize:12,maxWidth:320,wordBreak:'break-word',marginBottom:16}}>{errMsg}</div>
          <div style={{color:'rgba(255,255,255,.4)',fontSize:11}}>Make sure WebGL is enabled in your browser settings. Try reloading.</div>
          <button onClick={()=>window.location.reload()} style={{marginTop:20,padding:'10px 28px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:14,cursor:'pointer'}}>🔄 Reload</button>
        </div>
      )}

      {/* Quest panel */}
      {panel==='quests'&&(
        <div style={{position:'absolute',top:0,right:0,bottom:0,width:'min(400px,100vw)',background:'rgba(5,12,6,.95)',backdropFilter:'blur(12px)',borderLeft:'1px solid rgba(74,222,128,.2)',display:'flex',flexDirection:'column',fontFamily:'system-ui,sans-serif',zIndex:10,overflowY:'auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',borderBottom:'1px solid rgba(74,222,128,.18)'}}>
            <div style={{color:'#4ade80',fontWeight:'bold',fontSize:16}}>🗺️ Quest Log</div>
            <button onClick={()=>setPanel('none')} style={{background:'none',border:'none',color:'rgba(255,255,255,.5)',fontSize:20,cursor:'pointer',padding:'2px 6px'}}>✕</button>
          </div>
          <div style={{padding:'12px 14px',flex:1,display:'flex',flexDirection:'column',gap:10}}>
            {snap.quests.map(q=>(
              <div key={q.id} style={{background:q.done?'rgba(22,163,74,.12)':'rgba(255,255,255,.05)',border:`1px solid ${q.done?'rgba(22,163,74,.3)':'rgba(74,222,128,.15)'}`,borderRadius:10,padding:'11px 14px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:q.done?0:8}}>
                  <span style={{fontSize:20}}>{q.icon}</span>
                  <div>
                    <div style={{color:q.done?'#4ade80':'white',fontWeight:'bold',fontSize:13}}>{q.done?'✓ ':''}{q.name}</div>
                    <div style={{color:'rgba(255,255,255,.45)',fontSize:11}}>{q.desc}</div>
                  </div>
                </div>
                {!q.done&&<><div style={{height:5,background:'rgba(255,255,255,.1)',borderRadius:3,overflow:'hidden',marginBottom:5}}><div style={{height:'100%',width:`${Math.min(100,(q.prog/q.goal)*100)}%`,background:'linear-gradient(90deg,#16a34a,#4ade80)',borderRadius:3}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:11}}><span style={{color:'#86efac'}}>{q.prog}/{q.goal}</span><span style={{color:'#fbbf24'}}>Reward: {q.reward}</span></div></>}
              </div>
            ))}
          </div>
          {/* Inventory */}
          <div style={{padding:'12px 14px',borderTop:'1px solid rgba(74,222,128,.18)'}}>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:11,fontWeight:'bold',marginBottom:8}}>🎒 INVENTORY</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
              {([['🦌','Deer',snap.inv.deer],['🐻','Bear',snap.inv.bear],['🦃','Turkey',snap.inv.turkey],['🫎','Moose',snap.inv.moose],['🐟','Fish',snap.inv.fish],['🍖','Cooked',snap.inv.cooked]] as [string,string,number][]).map(([ico,lbl,cnt])=>(
                <div key={lbl} style={{background:'rgba(255,255,255,.05)',borderRadius:6,padding:'5px 8px',display:'flex',alignItems:'center',gap:5}}>
                  <span style={{fontSize:13}}>{ico}</span><span style={{color:'rgba(255,255,255,.55)',fontSize:11,flex:1}}>{lbl}</span><span style={{color:'white',fontWeight:'bold',fontSize:12}}>{cnt}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Trophies */}
          {snap.trophies.length>0&&<div style={{padding:'12px 14px',borderTop:'1px solid rgba(74,222,128,.18)'}}>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:11,fontWeight:'bold',marginBottom:8}}>🏆 TROPHIES</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {snap.trophies.map((t,i)=><div key={i} style={{fontSize:12,color:'rgba(255,255,255,.7)'}}>
                {t.rating} {t.type.charAt(0).toUpperCase()+t.type.slice(1)} — Score: {t.score}
              </div>)}
            </div>
          </div>}
        </div>
      )}

      {/* Start overlay */}
      <div id="start-ov" style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.75)',backdropFilter:'blur(4px)',zIndex:5}}>
        <div style={{textAlign:'center',color:'white',padding:28,maxWidth:500}}>
          <div style={{fontSize:'clamp(26px,5vw,42px)',fontWeight:'bold',color:'#4ade80',marginBottom:10,textShadow:'0 0 30px rgba(74,222,128,.5)'}}>🌲 WILDERNESS HUNT</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.65)',marginBottom:16,lineHeight:1.6}}>Open-world first-person hunting. Animals have real sight, hearing, and smell. Use the wind.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',fontSize:11,color:'rgba(255,255,255,.55)',textAlign:'left',maxWidth:340,margin:'0 auto 18px',lineHeight:1.8}}>
            {[['WASD','Move'],['Mouse drag','Look'],['F / Tap🔫','Shoot'],['Q / Tap🦆','Crouch (quiet)'],['Z / Tap🔭','Scope'],['E / Tap🎯','Interact'],['T','Place Tent'],['C','Light Fire'],['G','Switch Weapon'],['TAB','Quest Log'],['Wind arrow','Top right']].map(([k,v])=><><span style={{color:'#fbbf24'}}>{k}</span><span>{v}</span></>)}
          </div>
          <div style={{background:'rgba(74,222,128,.1)',border:'1px solid rgba(74,222,128,.3)',borderRadius:8,padding:'8px 16px',fontSize:12,color:'#86efac',marginBottom:18}}>
            💡 Crouch + move upwind of animals for the best approach. Bears charge when wounded!
          </div>
          <button onClick={()=>{const el=document.getElementById('start-ov');if(el)el.style.display='none';}} style={{padding:'14px 48px',fontSize:18,fontWeight:'bold',background:'linear-gradient(135deg,#16a34a,#4ade80)',color:'white',border:'none',borderRadius:14,cursor:'pointer',boxShadow:'0 0 28px rgba(74,222,128,.45)',touchAction:'manipulation'}}>
            🎯 Enter the Wild
          </button>
        </div>
      </div>
    </div>
  );
}
