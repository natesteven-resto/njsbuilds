'use client';
import { useEffect, useRef, useState } from 'react';
import type * as T from 'three';

/* ═══════════════════════════════════════════════════════════════
   WILDERNESS HUNT — Call of the Wild for Mobile
   Three.js PBR · Grass instancing · Wind/smell/sight/sound AI
   ═══════════════════════════════════════════════════════════════ */

const QUESTS = [
  { id:'q1', icon:'🦌', name:'First Blood',      desc:'Hunt 2 deer',          goal:2, reward:'🎯 Hunting Rifle',        key:'deer'   },
  { id:'q2', icon:'🐻', name:'Bear Bane',         desc:'Hunt a bear',          goal:1, reward:'💥 12-Gauge Shotgun',     key:'bear'   },
  { id:'q3', icon:'🫎', name:'Moose Master',      desc:'Hunt a moose',         goal:1, reward:'🔭 .308 Sniper Rifle',    key:'moose'  },
  { id:'q4', icon:'🐟', name:"Gone Fishin'",     desc:'Catch 3 fish',         goal:3, reward:'📦 +60 Ammo',             key:'fish'   },
  { id:'q5', icon:'🦃', name:'Turkey Season',    desc:'Hunt 3 turkeys',       goal:3, reward:'🦺 Hunting Vest +50HP',   key:'turkey' },
  { id:'q6', icon:'🐐', name:'Mountain Hunter',  desc:'Hunt 2 mountain goats',goal:2, reward:'🏔️ Elite Rifle Scope',   key:'goat'   },
];

const ADEF: Record<string,{hp:number;meat:number;sightR:number;sightA:number;soundR:number;smellR:number;spd:number;aSpd:number}> = {
  deer:   { hp:80,  meat:2, sightR:70, sightA:0.65, soundR:45, smellR:90,  spd:4.8, aSpd:0  },
  bear:   { hp:300, meat:3, sightR:55, sightA:0.5,  soundR:65, smellR:110, spd:5.5, aSpd:6.5},
  turkey: { hp:50,  meat:1, sightR:80, sightA:0.8,  soundR:35, smellR:60,  spd:6.2, aSpd:0  },
  moose:  { hp:220, meat:4, sightR:50, sightA:0.5,  soundR:55, smellR:100, spd:5.0, aSpd:5.5},
  goat:   { hp:90,  meat:2, sightR:90, sightA:0.7,  soundR:50, smellR:80,  spd:6.8, aSpd:0  },
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
      scene.fog = new THREE.FogExp2(0x8aaa80,0.0022);

      /* ── Camera ────────────────────────────────────────── */
      camera = new THREE.PerspectiveCamera(72,innerWidth/innerHeight,0.1,1400);
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
      const sunGroup=new THREE.Group();
      sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(7,16,16),new THREE.MeshBasicMaterial({color:0xfffef0})));
      const sc1=new THREE.Mesh(new THREE.SphereGeometry(13,16,16),new THREE.MeshBasicMaterial({color:0xfff0c0,transparent:true,opacity:.28,depthWrite:false}));sunGroup.add(sc1);
      const sc2=new THREE.Mesh(new THREE.SphereGeometry(24,16,16),new THREE.MeshBasicMaterial({color:0xffe080,transparent:true,opacity:.10,depthWrite:false}));sunGroup.add(sc2);
      const sc3=new THREE.Mesh(new THREE.SphereGeometry(44,12,12),new THREE.MeshBasicMaterial({color:0xffcc40,transparent:true,opacity:.04,depthWrite:false}));sunGroup.add(sc3);
      const sunDisc=sunGroup;
      scene.add(sunGroup);

      /* ── Terrain ───────────────────────────────────────── */
      // Larger world — mountains are part of the terrain, not separate objects
      const tSz=700, tSeg=isMob2?80:110;
      const tGeo = new THREE.PlaneGeometry(tSz,tSz,tSeg,tSeg);
      tGeo.rotateX(-Math.PI/2);
      const tPos=tGeo.attributes.position;
      for(let i=0;i<tPos.count;i++){
        const x=tPos.getX(i),z=tPos.getZ(i);
        let h=0;
        // Base rolling forest hills
        h+=Math.sin(x*.038)*Math.cos(z*.032)*3.5;
        h+=Math.sin(x*.082+1.2)*Math.cos(z*.075+0.7)*2.0;
        h+=Math.sin(x*.16+2.1)*Math.cos(z*.14+1.4)*1.0;
        h+=(Math.random()-.5)*.35;
        // Mountain ring: terrain rises dramatically past radius ~150
        const d=Math.sqrt(x*x+z*z);
        const mRing=Math.max(0,(d-145)/95);
        h+=mRing*mRing*52;
        h+=Math.sin(x*.018+3.5)*Math.cos(z*.022+2.1)*mRing*22;
        h+=Math.sin(x*.034+1.1)*Math.cos(z*.028+0.8)*mRing*14;
        h+=Math.sin(x*.055+0.4)*Math.cos(z*.048+1.6)*mRing*8;
        // Lake depression
        const ld=Math.sqrt((x-80)**2+(z-80)**2);
        if(ld<32)h=Math.min(h,-0.4-(32-ld)*.12);
        // River channel
        const rv=Math.abs(x+z*.4-20);
        if(rv<12)h=Math.min(h,-0.2-(12-rv)*.08);
        tPos.setY(i,h);
      }
      tGeo.computeVertexNormals();
      // Vertex colors: grass → rocky slope → grey peak → snow
      const cols:number[]=[];
      for(let i=0;i<tPos.count;i++){
        const x=tPos.getX(i),z=tPos.getZ(i),y=tPos.getY(i);
        const n=(Math.sin(x*.31)*Math.cos(z*.28)*.5+.5)*.06;
        if(y<-0.25){      cols.push(.18+n,.28+n,.52);          } // water/mud
        else if(y<1.0){   cols.push(.20+n,.44+n,.15);          } // rich grass
        else if(y<5){     cols.push(.26+n,.46+n,.16);          } // mid grass
        else if(y<12){    cols.push(.30+n,.38+n,.18);          } // dry/rocky grass
        else if(y<22){    cols.push(.36+n*.4,.32+n*.4,.26);    } // grey rock
        else if(y<32){    cols.push(.50+n*.2,.46+n*.2,.42);    } // lighter rock
        else{             cols.push(.84,.87,.92);               } // snow
      }
      tGeo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
      const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.92, metalness:0 }));
      terrain.receiveShadow=true;
      scene.add(terrain);

      /* ── Ground raycaster helper ───────────────────────── */
      // --- Height cache: sample once, fast bilinear lookup every frame ---
      // Pure procedural height — same formula as terrain generation, no raycasting needed
      // Procedural height — MUST match terrain generation above exactly
      function tH(x:number,z:number):number{
        let h=0;
        h+=Math.sin(x*.038)*Math.cos(z*.032)*3.5;
        h+=Math.sin(x*.082+1.2)*Math.cos(z*.075+0.7)*2.0;
        h+=Math.sin(x*.16+2.1)*Math.cos(z*.14+1.4)*1.0;
        const d=Math.sqrt(x*x+z*z);
        const mRing=Math.max(0,(d-145)/95);
        h+=mRing*mRing*52;
        h+=Math.sin(x*.018+3.5)*Math.cos(z*.022+2.1)*mRing*22;
        h+=Math.sin(x*.034+1.1)*Math.cos(z*.028+0.8)*mRing*14;
        h+=Math.sin(x*.055+0.4)*Math.cos(z*.048+1.6)*mRing*8;
        const ld=Math.sqrt((x-80)**2+(z-80)**2);
        if(ld<32)h=Math.min(h,-0.4-(32-ld)*.12);
        const rv=Math.abs(x+z*.4-20);
        if(rv<12)h=Math.min(h,-0.2-(12-rv)*.08);
        return h;
      }
      function groundY(x:number,z:number,base=1.75){return tH(x,z)+base;}

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
      // Seeded RNG so grass placement is stable (no flicker on re-update)
      function seededRand(seed:number){let x=Math.sin(seed*9301+49297)*233280;return x-Math.floor(x);}
      function updateGrass(px:number,pz:number){
        if(Math.sqrt((px-lastGrassUpdate.x)**2+(pz-lastGrassUpdate.z)**2)<5)return;
        lastGrassUpdate={x:px,z:pz};
        for(let i=0;i<GRASS_COUNT;i++){
          const gx=px+grassPos[i].x,gz=pz+grassPos[i].z;
          const gh=tH(gx,gz);
          // No grass on snow (>28), water (<-0.15), or extreme slopes
          if(gh>28||gh<-0.15){
            dummy.position.set(9999,0,9999);dummy.scale.setScalar(.001);dummy.updateMatrix();
            grassMesh.setMatrixAt(i,dummy.matrix);continue;
          }
          const gy=groundY(gx,gz,0);
          // Patchy distribution — clump via noise so it looks natural
          const patch=Math.sin(gx*.18)*Math.cos(gz*.22)+Math.sin(gx*.09+gz*.11);
          if(patch<-0.2){
            dummy.position.set(9999,0,9999);dummy.scale.setScalar(.001);dummy.updateMatrix();
            grassMesh.setMatrixAt(i,dummy.matrix);continue;
          }
          dummy.position.set(gx,gy,gz);
          dummy.rotation.y=seededRand(i)*Math.PI*2;
          // Taller in valley, shorter on slopes
          const sc=Math.max(.3,(1.1-gh/35))*(seededRand(i+1000)*.5+.75);
          dummy.scale.setScalar(sc);
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

      // Mountains are now baked into the terrain heightmap — no separate cones needed

      /* ── Trees ─────────────────────────────────────────── */
      // ── Instanced trees — 4 draw calls total regardless of tree count ──
      const TREE_N = isMob2 ? 500 : 900;
      const treeDummy = new THREE.Object3D();
      const trnkIM = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(.17,.3,1,7), // unit height, scaled per instance
        (() => {
          const m = new THREE.MeshStandardMaterial({color:0x3a1804,roughness:.96,metalness:0});
          m.onBeforeCompile = (s:any) => {
            s.fragmentShader = s.fragmentShader.replace(
              'vec4 diffuseColor = vec4( diffuse, opacity );',
              `float bg = sin(vUv.x*20.0+vUv.y*4.0)*.32+sin(vUv.x*9.0)*.24+.5;
               float br = max(0.,sin(vUv.y*28.0+sin(vUv.x*11.0)*2.))*.28;
               vec3 bd = vec3(.16,.09,.04); vec3 bl = vec3(.36,.20,.09);
               vec4 diffuseColor = vec4(mix(bd,bl,bg+br), opacity);`
            );
          }; return m;
        })(), TREE_N);
      const cone1IM = new THREE.InstancedMesh(
        new THREE.ConeGeometry(1,1,8),
        new THREE.MeshStandardMaterial({color:0x165208,roughness:.86,metalness:0}), TREE_N);
      const cone2IM = new THREE.InstancedMesh(
        new THREE.ConeGeometry(1,1,8),
        new THREE.MeshStandardMaterial({color:0x1c6210,roughness:.86,metalness:0}), TREE_N);
      const cone3IM = new THREE.InstancedMesh(
        new THREE.ConeGeometry(1,1,8),
        new THREE.MeshStandardMaterial({color:0x20680e,roughness:.86,metalness:0}), TREE_N);
      trnkIM.castShadow=true; cone1IM.castShadow=true;
      scene.add(trnkIM,cone1IM,cone2IM,cone3IM);

      // Forest cluster centers — natural groupings like real woods
      const clusters:number[][]=[];
      for(let c=0;c<28;c++){
        const ca=Math.random()*Math.PI*2, cd=20+Math.random()*140;
        clusters.push([Math.cos(ca)*cd, Math.sin(ca)*cd]);
      }

      let tIdx=0;
      for(let attempt=0;attempt<TREE_N*4&&tIdx<TREE_N;attempt++){
        // Pick a cluster and spread around it (forest clumping)
        const cl=clusters[Math.floor(Math.random()*clusters.length)];
        const spread=4+Math.random()*22;
        const ang2=Math.random()*Math.PI*2;
        const tx=cl[0]+Math.cos(ang2)*spread;
        const tz=cl[1]+Math.sin(ang2)*spread;
        const ld=Math.sqrt((tx-80)**2+(tz-80)**2);
        const pd=Math.sqrt(tx*tx+tz*tz);
        const th=tH(tx,tz);
        // Trees on forest floor AND mountain slopes — not on snow peaks or in water
        if(ld<34||pd<10||th>30||th<-0.1)continue;
        const sc=0.65+Math.random()*1.1;
        const trH=4.2*sc;
        const gy=groundY(tx,tz,0);
        // Trunk
        treeDummy.position.set(tx,gy+trH/2,tz);
        treeDummy.scale.set(sc,trH,sc);
        treeDummy.rotation.set(0,Math.random()*Math.PI*2,0);
        treeDummy.updateMatrix();
        trnkIM.setMatrixAt(tIdx,treeDummy.matrix);
        // 3 cone layers
        [[2.4,4.5,0],[1.85,3.8,1.9],[1.3,3.0,3.6]].forEach(([cr,ch,yo],li)=>{
          treeDummy.position.set(tx,gy+trH+(yo+1.3)*sc,tz);
          treeDummy.scale.set(cr*sc,ch*sc,cr*sc);
          treeDummy.updateMatrix();
          [cone1IM,cone2IM,cone3IM][li].setMatrixAt(tIdx,treeDummy.matrix);
        });
        tIdx++;
      }
      // Fill unused slots off-screen
      for(let i=tIdx;i<TREE_N;i++){
        treeDummy.position.set(9999,0,9999);treeDummy.scale.setScalar(.01);treeDummy.updateMatrix();
        trnkIM.setMatrixAt(i,treeDummy.matrix);
        cone1IM.setMatrixAt(i,treeDummy.matrix);
        cone2IM.setMatrixAt(i,treeDummy.matrix);
        cone3IM.setMatrixAt(i,treeDummy.matrix);
      }
      trnkIM.instanceMatrix.needsUpdate=true;
      cone1IM.instanceMatrix.needsUpdate=true;
      cone2IM.instanceMatrix.needsUpdate=true;
      cone3IM.instanceMatrix.needsUpdate=true;

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

      /* PMREM env for PBR reflections */
      try{
        const pmrem=new THREE.PMREMGenerator(renderer);
        const envS=new THREE.Scene();
        envS.add(new THREE.HemisphereLight(0x87ceeb,0x3a5a2a,3));
        const esl=new THREE.DirectionalLight(0xfff5e0,5);esl.position.set(1,2,1);envS.add(esl);
        envS.add(new THREE.Mesh(new THREE.SphereGeometry(50,8,8),new THREE.MeshBasicMaterial({color:0x87ceeb,side:THREE.BackSide})));
        scene.environment=pmrem.fromScene(envS).texture;
        pmrem.dispose();
      }catch(ee){console.warn('PMREM:',ee);}

buildWeapon('pistol');

      /* ── Animals ───────────────────────────────────────── */
      interface Animal3D {
        type:string; group:T.Group; hp:number; maxHp:number; meat:number;
        state:'idle'|'alert'|'flee'|'aggro'|'dead'|string;
        alertLevel:number; alertMethod:string;
        angle:number; anim:number; dieT:number;
        trophyScore:number;
        bleedRate:number; hitZone:string;
      }
      function makeAnimal(type:string):T.Group{
        const g=new THREE.Group();
        const cols:Record<string,number>={deer:0x8b6914,bear:0x2a1a0a,turkey:0x704a18,moose:0x4a3010,goat:0xddd8cc};
        const darkMul:Record<string,number>={deer:.62,bear:.55,turkey:.58,moose:.6,goat:.78};
        const bCol=cols[type]||0x8b6914;
        const bMat=new THREE.MeshStandardMaterial({color:bCol,roughness:.88,metalness:0});
        const dMat=new THREE.MeshStandardMaterial({color:new THREE.Color(bCol).multiplyScalar(darkMul[type]||.62),roughness:.88,metalness:0});
        const eyeMat=new THREE.MeshStandardMaterial({color:0x0a0505,roughness:.15,metalness:0});
        const noseMat=new THREE.MeshStandardMaterial({color:0x0a0a0a,roughness:.3,metalness:0});
        function cyl(r:number,h:number,s=7){return new THREE.CylinderGeometry(r,r*1.06,h,s);}
        function sph(r:number,w=8,h2=6){return new THREE.SphereGeometry(r,w,h2);}
        function mk(geo:any,mat:any){const m=new THREE.Mesh(geo,mat);m.castShadow=true;return m;}

        if(type==='deer'){
          const body=mk(sph(.35,8,6),bMat); body.scale.set(.52,.60,1.68); body.position.set(0,.82,0); g.add(body);
          const belly=mk(sph(.32,6,5),new THREE.MeshStandardMaterial({color:0xc8a05a,roughness:.9}));
          belly.scale.set(.4,.45,1.3); belly.position.set(0,.76,.05); g.add(belly);
          [[-0.17,-0.34],[-0.17,.30],[.17,-.34],[.17,.30]].forEach(([lx,lz])=>{
            const leg=mk(cyl(.042,.72),dMat); leg.position.set(lx,.36,lz); g.add(leg);
            const hoof=mk(cyl(.052,.09),new THREE.MeshStandardMaterial({color:0x1a0a00,roughness:.95}));
            hoof.position.set(lx,0,lz); g.add(hoof);
          });
          const neck=mk(cyl(.09,.52,7),bMat); neck.position.set(0,1.18,-.44); neck.rotation.x=-.56; g.add(neck);
          const head=mk(sph(.18,8,7),bMat); head.scale.set(.88,1,1.42); head.position.set(0,1.55,-.72); g.add(head);
          [-.14,.14].forEach(ex=>{
            const e=mk(sph(.088,6,5),bMat); e.scale.set(1,1.65,.7); e.position.set(ex,1.7,-.68); g.add(e);
            const ei=mk(sph(.06,5,4),new THREE.MeshStandardMaterial({color:0xd4a0a0,roughness:.9})); ei.scale.set(.7,1.3,.5); ei.position.set(ex,1.72,-.67); g.add(ei);
          });
          [-.1,.1].forEach(ex=>{
            const ew=mk(sph(.038,6,5),new THREE.MeshStandardMaterial({color:0xf0e8d0,roughness:.3})); ew.position.set(ex,1.6,-.86); g.add(ew);
            const ep=mk(sph(.026,5,4),eyeMat); ep.position.set(ex*1.02,1.6,-.88); g.add(ep);
          });
          const nose=mk(sph(.05,5,4),noseMat); nose.scale.set(1.1,.7,1); nose.position.set(0,1.56,-.88); g.add(nose);
          const aMat=new THREE.MeshStandardMaterial({color:0x5a3a10,roughness:.97});
          [-.08,.08].forEach(ax=>{
            const main=mk(cyl(.022,.46,5),aMat); main.position.set(ax,1.78,-.68); main.rotation.z=ax*3.8; g.add(main);
            const b1=mk(cyl(.014,.24,4),aMat); b1.position.set(ax*2.2,2.0,-.72); b1.rotation.z=ax*1.8; b1.rotation.x=-.3; g.add(b1);
            const b2=mk(cyl(.012,.2,4),aMat); b2.position.set(ax*2.8,2.12,-.7); b2.rotation.z=ax*1.2; b2.rotation.x=.2; g.add(b2);
          });
          const tail=mk(sph(.09,5,4),new THREE.MeshStandardMaterial({color:0xeee8d8,roughness:.9})); tail.position.set(0,.88,.48); g.add(tail);

        }else if(type==='bear'){
          const body=mk(sph(.42,8,6),bMat); body.scale.set(.95,.78,1.52); body.position.set(0,.68,0); g.add(body);
          const chest=mk(sph(.38,7,5),new THREE.MeshStandardMaterial({color:new THREE.Color(bCol).multiplyScalar(.72),roughness:.92}));
          chest.scale.set(.6,.55,1.0); chest.position.set(0,.65,-.18); g.add(chest);
          [[-0.28,-.35],[-.28,.28],[.28,-.35],[.28,.28]].forEach(([lx,lz])=>{
            const l=mk(cyl(.12,.55),dMat); l.position.set(lx,.275,lz); g.add(l);
            const p=mk(cyl(.14,.08),new THREE.MeshStandardMaterial({color:0x0a0500,roughness:.95})); p.position.set(lx,0,lz); g.add(p);
          });
          const head=mk(sph(.32,8,7),dMat); head.position.set(0,1.05,-.65); g.add(head);
          const snout=mk(sph(.2,7,6),new THREE.MeshStandardMaterial({color:0x5a3a18,roughness:.88}));
          snout.scale.set(.85,.7,1.55); snout.position.set(0,.98,-.92); g.add(snout);
          const nose=mk(sph(.07,6,5),noseMat); nose.position.set(0,1.02,-1.08); g.add(nose);
          [-.18,.18].forEach(ex=>{
            const e=mk(sph(.11,7,6),dMat); e.position.set(ex,1.34,-.62); g.add(e);
            const ei=mk(sph(.07,5,4),new THREE.MeshStandardMaterial({color:0x1a0a00,roughness:.9})); ei.position.set(ex,1.35,-.66); g.add(ei);
          });
          [-.13,.13].forEach(ex=>{ const ep=mk(sph(.05,5,4),eyeMat); ep.position.set(ex,1.12,-.88); g.add(ep); });

        }else if(type==='turkey'){
          const body=mk(sph(.26,8,7),bMat); body.scale.set(1.0,.92,1.38); body.position.set(0,.48,0); g.add(body);
          const breast=mk(sph(.22,7,6),new THREE.MeshStandardMaterial({color:0x4a3818,roughness:.85}));
          breast.scale.set(.7,.7,1.0); breast.position.set(0,.44,-.16); g.add(breast);
          const lMat3=new THREE.MeshStandardMaterial({color:0xaa7030,roughness:.88});
          [-.07,.07].forEach(lx=>{
            const l=mk(cyl(.03,.42,5),lMat3); l.position.set(lx,.21,lx*.4); g.add(l);
          });
          for(let fi=0;fi<7;fi++){
            const fa=((fi/6)-.5)*Math.PI*.68;
            const fan=new THREE.Mesh(new THREE.PlaneGeometry(.14,.52),new THREE.MeshStandardMaterial({color:fi%2===0?0x7a4a10:0x9a6a22,side:THREE.DoubleSide,roughness:.88}));
            fan.position.set(Math.sin(fa)*.18,.52,Math.cos(fa)*.18+.28); fan.rotation.y=-fa; g.add(fan);
          }
          const neck=mk(cyl(.04,.28,5),new THREE.MeshStandardMaterial({color:0x8a1a1a,roughness:.75})); neck.position.set(0,.72,-.3); neck.rotation.x=-.22; g.add(neck);
          const head=mk(sph(.115,7,6),dMat); head.position.set(0,.9,-.48); g.add(head);
          const wattle=mk(sph(.046,5,4),new THREE.MeshStandardMaterial({color:0xdd1111,roughness:.5})); wattle.scale.set(1,1.5,1); wattle.position.set(0,.83,-.57); g.add(wattle);
          const snood=mk(cyl(.022,.1,4),new THREE.MeshStandardMaterial({color:0xcc1111,roughness:.5})); snood.position.set(0,.93,-.55); snood.rotation.x=.3; g.add(snood);
          [-.055,.055].forEach(ex=>{ const e=mk(sph(.03,5,4),eyeMat); e.position.set(ex,.92,-.57); g.add(e); });

        }else if(type==='moose'){
          const body=mk(sph(.5,8,6),bMat); body.scale.set(.58,.78,2.08); body.position.set(0,1.42,0); g.add(body);
          const hump=mk(sph(.3,7,6),bMat); hump.scale.set(.85,.75,1.1); hump.position.set(0,1.82,.38); g.add(hump);
          [[-0.24,-.6],[-.24,.42],[.24,-.6],[.24,.42]].forEach(([lx,lz])=>{
            const upper=mk(cyl(.1,.58),dMat); upper.position.set(lx,.82,lz); g.add(upper);
            const lower=mk(cyl(.072,.68),new THREE.MeshStandardMaterial({color:0x1e1008,roughness:.9})); lower.position.set(lx,.34,lz); g.add(lower);
            const hoof=mk(cyl(.1,.1),noseMat); hoof.position.set(lx,0,lz); g.add(hoof);
          });
          const neck=mk(cyl(.17,.82,7),bMat); neck.position.set(0,2.12,-.65); neck.rotation.x=-.5; g.add(neck);
          const head=mk(sph(.26,8,7),dMat); head.scale.set(.82,1,1.95); head.position.set(0,2.6,-1.18); g.add(head);
          const bigNose=mk(sph(.2,8,7),new THREE.MeshStandardMaterial({color:new THREE.Color(bCol).multiplyScalar(.52),roughness:.88}));
          bigNose.scale.set(.9,1.1,1.4); bigNose.position.set(0,2.52,-1.45); g.add(bigNose);
          const nose2=mk(sph(.08,6,5),noseMat); nose2.position.set(0,2.5,-1.62); g.add(nose2);
          const bell=mk(cyl(.06,.4,5),dMat); bell.position.set(0,2.28,-1.25); g.add(bell);
          [-.16,.16].forEach(ex=>{ const e=mk(sph(.05,5,4),eyeMat); e.position.set(ex,2.65,-1.3); g.add(e); });
          const aMat=new THREE.MeshStandardMaterial({color:0x5a3a10,roughness:.97});
          [-1,1].forEach(s=>{
            const main=mk(cyl(.042,.88,5),aMat); main.position.set(s*.22,3.02,-1.12); main.rotation.z=s*.36; g.add(main);
            const palm=new THREE.Mesh(new THREE.BoxGeometry(.72,.07,.3),aMat); palm.position.set(s*.52,3.42,-1.12); g.add(palm);
            for(let t2=0;t2<5;t2++){
              const pt=mk(cyl(.016,.24,4),aMat); pt.position.set(s*(.16+t2*.15),3.46,-1.12); pt.rotation.z=s*.18; g.add(pt);
            }
          });

        }else{ // goat — mountain goat, stocky and sure-footed
          const body=mk(sph(.3,8,6),bMat); body.scale.set(.72,.7,1.38); body.position.set(0,.68,0); g.add(body);
          const coat=mk(sph(.28,7,5),new THREE.MeshStandardMaterial({color:0xf4f0e8,roughness:.95}));
          coat.scale.set(.55,.5,.95); coat.position.set(0,.65,0); g.add(coat);
          [[-0.14,-.28],[-.14,.22],[.14,-.28],[.14,.22]].forEach(([lx,lz])=>{
            const l=mk(cyl(.055,.52),dMat); l.position.set(lx,.26,lz); g.add(l);
            const h2=mk(cyl(.065,.09),noseMat); h2.position.set(lx,0,lz); g.add(h2);
          });
          const neck=mk(cyl(.08,.38,6),bMat); neck.position.set(0,.98,-.38); neck.rotation.x=-.48; g.add(neck);
          const head=mk(sph(.18,7,6),bMat); head.scale.set(.88,1,1.2); head.position.set(0,1.28,-.56); g.add(head);
          const beard=mk(cyl(.04,.22,5),new THREE.MeshStandardMaterial({color:0xf0ece0,roughness:.95})); beard.position.set(0,1.06,-.62); g.add(beard);
          const hornMat=new THREE.MeshStandardMaterial({color:0x1a1208,roughness:.88});
          [-.09,.09].forEach(hx=>{
            const h1=mk(cyl(.028,.32,5),hornMat); h1.position.set(hx,1.44,-.5); h1.rotation.z=hx*3.2; h1.rotation.x=.2; g.add(h1);
            const h3=mk(cyl(.02,.2,5),hornMat); h3.position.set(hx*1.6,1.62,-.52); h3.rotation.z=hx*4; h3.rotation.x=.8; g.add(h3);
          });
          [-.09,.09].forEach(ex=>{ const e=mk(sph(.032,5,4),eyeMat); e.position.set(ex,1.32,-.68); g.add(e); });
          const nose3=mk(sph(.055,5,4),noseMat); nose3.scale.set(1,.7,1); nose3.position.set(0,1.26,-.7); g.add(nose3);
        }
        return g;
      }

      const animals:Animal3D[]=[];

      const aDefs:[string,number,number,number][]=isMob2?[['deer',5,80,2],['bear',2,300,3],['turkey',5,50,1],['moose',2,220,4]]:[['deer',8,80,2],['bear',3,300,3],['turkey',8,50,1],['moose',3,220,4]];
      aDefs.forEach(([type,n,hp,meat])=>{
        for(let i=0;i<n;i++){
          // Place animals deep in forest clusters, hard to spot
          const cl=clusters[Math.floor(Math.random()*clusters.length)];
          const spread=8+Math.random()*18;
          const ang3=Math.random()*Math.PI*2;
          const ax=cl[0]+Math.cos(ang3)*spread;
          const az=cl[1]+Math.sin(ang3)*spread;
          const ld=Math.sqrt((ax-80)**2+(az-80)**2);
          if(ld<38||Math.sqrt(ax*ax+az*az)<14)continue;
          const grp=makeAnimal(type);
          grp.position.set(ax,groundY(ax,az,0),az);
          // Scale up animals so they're visible and easier to hit
          const sScale={deer:2.2,bear:2.6,turkey:1.6,moose:2.8,goat:1.8}[type]||2;
          grp.scale.setScalar(sScale);
          // Invisible hitbox sphere makes shooting forgiving
          const hb=new THREE.Mesh(new THREE.SphereGeometry(sScale*.55,5,4),new THREE.MeshBasicMaterial({visible:false}));
          hb.position.set(0,0.8,0); grp.add(hb);
          scene.add(grp);
          const ts=Math.random();
          animals.push({type,group:grp,hp,maxHp:hp,meat,state:'idle',alertLevel:0,alertMethod:'',angle:Math.random()*Math.PI*2,anim:Math.random()*10,dieT:0,trophyScore:ts,bleedRate:0,hitZone:''});
        }
      });

      // Mountain goats — spawn specifically on high-elevation terrain
      const goatCount=isMob2?5:10;
      for(let gi=0;gi<goatCount*8&&animals.filter(a=>a.type==='goat').length<goatCount;gi++){
        const ga=Math.random()*Math.PI*2;
        const gd=155+Math.random()*85; // mountain zone
        const gx=Math.cos(ga)*gd, gz=Math.sin(ga)*gd;
        const gh=tH(gx,gz);
        if(gh<12||gh>45)continue; // only on slopes (not flat ground, not extreme peaks)
        const gGrp=makeAnimal('goat');
        gGrp.position.set(gx,groundY(gx,gz,0),gz);
        gGrp.scale.setScalar(1.8);
        const ghb=new THREE.Mesh(new THREE.SphereGeometry(1.2,5,4),new THREE.MeshBasicMaterial({visible:false}));
        ghb.position.set(0,0.7,0); gGrp.add(ghb);
        scene.add(gGrp);
        animals.push({type:'goat',group:gGrp,hp:ADEF.goat.hp,maxHp:ADEF.goat.hp,meat:ADEF.goat.meat,state:'idle',alertLevel:0,alertMethod:'',angle:Math.random()*Math.PI*2,anim:Math.random()*10,dieT:0,trophyScore:Math.random(),bleedRate:0,hitZone:''});
      }

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
      // Expose functions so HTML buttons can call them
      (gs as any).shootFn=shoot;
      (gs as any).interactFn=interact;
      (gs as any).switchFn=()=>{
        const w=Array.from(gs.weapons),ci=w.indexOf(gs.weapon);
        gs.weapon=w[(ci+1)%w.length];
        buildWeapon(gs.weapon);
        setMsg(`Switched to ${gs.weapon.toUpperCase()}`);
      };
      // Init EffectComposer bloom after gs is ready
      ;(async()=>{try{
        const [{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass}]=await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          import('three/examples/jsm/postprocessing/OutputPass.js'),
        ]);
        const comp=new (EffectComposer as any)(renderer);
        comp.addPass(new (RenderPass as any)(scene,camera));
        comp.addPass(new (UnrealBloomPass as any)(new THREE.Vector2(innerWidth,innerHeight),isMob2?0.28:0.48,0.4,0.80));
        comp.addPass(new (OutputPass as any)());
        (gs as any).composer=comp;
      }catch(ee){console.warn('Bloom:',ee);}})();

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
          // Vital organ detection
          const hp=hits[0].point;
          const localY=(hp.y-a.group.position.y)/a.group.scale.x;
          const localDist=Math.sqrt((hp.x-a.group.position.x)**2+(hp.z-a.group.position.z)**2)/a.group.scale.x;
          let zone='body',zoneDmgMult=1,bleedAdd=0,zoneMsg='';
          if(localY>1.6){zone='head';zoneDmgMult=4;bleedAdd=0;zoneMsg='💀 HEAD SHOT!';}
          else if(localY>0.7&&localDist<0.7){zone='vital';zoneDmgMult=2;bleedAdd=8;zoneMsg='🫀 Vital hit! Bleeding...';}
          else if(localY<0.35){zone='leg';zoneDmgMult=0.6;bleedAdd=2;zoneMsg='🦵 Leg shot. Animal limping.';}
          else{zone='gut';zoneDmgMult=1;bleedAdd=4;zoneMsg='💢 Gut shot. Animal bleeding...';}
          a.hitZone=zone;
          a.bleedRate=Math.min(25,a.bleedRate+bleedAdd);
          const baseDmg=(dmg[gs.weapon]||22)*zoneDmgMult;
          a.hp-=baseDmg;
          const adef=ADEF[a.type];
          a.state=a.type==='bear'&&a.hp>0?'aggro':'flee';
          addBlood(hp.x,hp.y,hp.z);
          if(zoneMsg)setMsg(zoneMsg);
          if(a.hp<=0){
            a.state='dead';a.dieT=4;a.bleedRate=0;
            gs.inv[a.type as keyof typeof gs.inv]++;
            const rating=a.trophyScore>.92?'💎 Diamond':a.trophyScore>.7?'🥇 Gold':a.trophyScore>.4?'🥈 Silver':'🥉 Bronze';
            gs.trophies.push({type:a.type,rating,score:Math.round(a.trophyScore*100)});
            const q=gs.quests.find(q=>q.key===a.type);
            if(q&&!q.done){q.prog++;if(q.prog>=q.goal){q.done=true;unlockReward(q);}}
            setMsg(`${a.type.charAt(0).toUpperCase()+a.type.slice(1)} downed! ${rating} trophy!`);
          }
        });

        // Gunshot sound alarm — all nearby animals flee from the noise
        const soundRange:Record<string,number>={pistol:90,rifle:160,shotgun:140,sniper:200};
        const alarmR=soundRange[gs.weapon]||120;
        const alarmR2=alarmR*alarmR;
        animals.forEach(a=>{
          if(a.state==='dead')return;
          const dx=a.group.position.x-gs.pos.x;
          const dz=a.group.position.z-gs.pos.z;
          if(dx*dx+dz*dz<alarmR2){
            // Bears that haven't been shot get alert/aggro, others flee
            if(a.state==='idle'||a.state==='alert'){
              a.state=a.type==='bear'?'aggro':'flee';
            }
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
        gs.pos.x=Math.max(-310,Math.min(310,gs.pos.x));
        gs.pos.z=Math.max(-310,Math.min(310,gs.pos.z));

        // Terrain stick
        const ty=groundY(gs.pos.x,gs.pos.z,gs.crouching?1.1:1.75);
        gs.pos.y=ty; // snap instantly, no lerp = no clipping

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

          // Dawn/dusk: animals more active; midday/night they rest
          const isActive=(gs.tod>.20&&gs.tod<.38)||(gs.tod>.60&&gs.tod<.80);
          const actMult=isActive?1.8:gs.tod>.38&&gs.tod<.60?1.0:0.35;

          // Herding: occasionally drift toward nearest same-species companion
          if(a.state==='idle'&&Math.random()<.0008*dt/16){
            let nearDist=9999,nearAX=0,nearAZ=0,foundNear=false;
            animals.forEach(b=>{if(b!==a&&b.type===a.type&&b.state!=='dead'){const d2=Math.sqrt((b.group.position.x-a.group.position.x)**2+(b.group.position.z-a.group.position.z)**2);if(d2>12&&d2<80&&d2<nearDist){nearDist=d2;nearAX=b.group.position.x;nearAZ=b.group.position.z;foundNear=true;}}});
            if(foundNear)a.angle=Math.atan2(nearAX-a.group.position.x,nearAZ-a.group.position.z);
          }

          // Grazing: slow wander with occasional pause (head-bob)
          const isGrazing=a.state==='idle'&&Math.sin(a.anim*.3)>.4;
          const idleSpd=isGrazing?.18:.55;

          // Move
          const mSpd=(a.state==='flee'?adef.spd:a.state==='aggro'?adef.aSpd||5:idleSpd)*actMult*(dt/1000);
          if(a.state==='flee'){
            const fd=Math.sqrt(dx*dx+dz*dz)||1;
            // Zigzag flee — animals don't run in a straight line
            const zz=Math.sin(a.anim*7)*0.45;
            const fx=-dx/fd+zz*(dz/fd);  // add perpendicular component
            const fz=-dz/fd+zz*(-dx/fd);
            a.group.position.x+=fx*mSpd;a.group.position.z+=fz*mSpd;
            a.angle=Math.atan2(fx,fz);
          }else if(a.state==='aggro'){
            const fd=Math.sqrt(dx*dx+dz*dz)||1;
            a.group.position.x+=dx/fd*mSpd;a.group.position.z+=dz/fd*mSpd;a.angle=Math.atan2(dx,dz);
            if(dist<3&&gs.hp>0){gs.hp=Math.max(0,gs.hp-14*(dt/1000));}
          }else{
            // Natural wander: stop/start, graze, change direction naturally
            if(!isGrazing){
              if(Math.random()<.003*actMult)a.angle+=(Math.random()-.5)*1.6;
              a.group.position.x+=Math.sin(a.angle)*mSpd;
              a.group.position.z+=Math.cos(a.angle)*mSpd;
            }
          }
          a.group.position.x=Math.max(-300,Math.min(300,a.group.position.x));
          a.group.position.z=Math.max(-300,Math.min(300,a.group.position.z));
          a.group.position.y=groundY(a.group.position.x,a.group.position.z,0);
          a.group.rotation.y=a.angle;
          // Bleed-out: lose HP over time when bleeding, drop blood trail
          if(a.bleedRate>0&&a.state!=='dead'){
            a.hp-=a.bleedRate*(dt/1000);
            if(Math.random()<0.08)addBlood(a.group.position.x+(Math.random()-.5)*.4,a.group.position.y+.1,a.group.position.z+(Math.random()-.5)*.4);
            if(a.hp<=0){
              a.state='dead';a.dieT=4;a.bleedRate=0;
              gs.inv[a.type as keyof typeof gs.inv]++;
              const rt=a.trophyScore>.92?'💎 Diamond':a.trophyScore>.7?'🥇 Gold':a.trophyScore>.4?'🥈 Silver':'🥉 Bronze';
              gs.trophies.push({type:a.type,rating:rt,score:Math.round(a.trophyScore*100)});
              const q2=gs.quests.find(q=>q.key===a.type);
              if(q2&&!q2.done){q2.prog++;if(q2.prog>=q2.goal){q2.done=true;unlockReward(q2);}}
              setMsg(`${capitalize(a.type)} bled out! ${rt} trophy!`);
            }
          }
          // Body animation: bob when moving, head-down when grazing
          a.group.children.forEach((c:any,ci)=>{
            if(ci===0&&isGrazing) c.rotation.x=Math.sin(a.anim*.8)*.12+.15; // graze: head down
            else if(ci===0) c.rotation.x=Math.sin(a.anim*1.5)*.04; // alert: slight head bob
          });
          // Reset flee if far enough
          if(a.state==='flee'&&dist>85)a.state='idle';
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

        // Detection: no HUD — that's immersion breaking. Animals act on it silently.

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

          // Buttons now handled by HTML React elements — no canvas drawing needed
        }
      }

      // Mobile buttons are now HTML React elements wired via gsRef — no canvas listener needed

      /* ── Render loop ───────────────────────────────────── */
      let lastT=0;
      function loop(t:number){
        if(!alive)return;
        const dt=Math.min(t-lastT,80);lastT=t;
        update(dt);
        if((gs as any).composer) (gs as any).composer.render();
        else renderer.render(scene,camera);
        drawHUD();
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

      {/* ── Mobile action buttons (HTML, reliable touch targets) ── */}
      {(typeof window!=='undefined'&&'ontouchstart' in window) && (
        <div style={{position:'absolute',right:12,bottom:110,display:'flex',flexDirection:'column',gap:10,zIndex:8,pointerEvents:'none'}}>
          {/* Fire button — big red, always visible */}
          <button
            onPointerDown={e=>{e.preventDefault();gsRef.current?.shootFn?.();}}
            style={{width:84,height:84,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#ff4444,#aa0000)',border:'3px solid rgba(255,150,150,.5)',fontSize:32,cursor:'pointer',pointerEvents:'all',touchAction:'manipulation',boxShadow:'0 4px 20px rgba(200,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',userSelect:'none',WebkitUserSelect:'none' as 'none'}}>
            🔫
          </button>
          {/* Scope */}
          <button
            onPointerDown={e=>{e.preventDefault();if(gsRef.current)gsRef.current.scoped=!gsRef.current.scoped;}}
            style={{width:64,height:64,borderRadius:'50%',background:'rgba(30,60,30,.85)',border:'2px solid rgba(100,200,100,.4)',fontSize:26,cursor:'pointer',pointerEvents:'all',touchAction:'manipulation',boxShadow:'0 2px 12px rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',userSelect:'none',WebkitUserSelect:'none' as 'none'}}>
            🔭
          </button>
          {/* Crouch */}
          <button
            onPointerDown={e=>{e.preventDefault();if(gsRef.current)gsRef.current.crouching=!gsRef.current.crouching;}}
            style={{width:64,height:64,borderRadius:'50%',background:'rgba(20,50,20,.85)',border:'2px solid rgba(100,200,100,.4)',fontSize:26,cursor:'pointer',pointerEvents:'all',touchAction:'manipulation',boxShadow:'0 2px 12px rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',userSelect:'none',WebkitUserSelect:'none' as 'none'}}>
            🦆
          </button>
          {/* Interact */}
          <button
            onPointerDown={e=>{e.preventDefault();gsRef.current?.interactFn?.();}}
            style={{width:64,height:64,borderRadius:'50%',background:'rgba(20,40,80,.85)',border:'2px solid rgba(100,140,220,.4)',fontSize:26,cursor:'pointer',pointerEvents:'all',touchAction:'manipulation',boxShadow:'0 2px 12px rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',userSelect:'none',WebkitUserSelect:'none' as 'none'}}>
            🎯
          </button>
        </div>
      )}

      {/* Weapon switch button */}
        {(typeof window!=='undefined') && (
          <button
            onPointerDown={e=>{e.preventDefault();gsRef.current?.switchFn?.();}}
            style={{
              position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',
              padding:'10px 22px',borderRadius:30,
              background:'rgba(10,20,10,.88)',border:'2px solid rgba(100,200,80,.45)',
              color:'white',fontSize:15,fontWeight:'bold',cursor:'pointer',
              pointerEvents:'all',touchAction:'manipulation',
              boxShadow:'0 4px 18px rgba(0,0,0,.5)',
              display:'flex',alignItems:'center',gap:8,zIndex:8,
              userSelect:'none',WebkitUserSelect:'none' as 'none',
              fontFamily:'system-ui,sans-serif',letterSpacing:.5,
            }}>
            <span style={{fontSize:20}}>
              {snap.weapon==='rifle'?'🎯':snap.weapon==='shotgun'?'💥':snap.weapon==='sniper'?'🔭':'🔫'}
            </span>
            <span style={{textTransform:'uppercase' as 'uppercase'}}>{snap.weapon}</span>
            <span style={{fontSize:11,opacity:.6,marginLeft:2}}>↕</span>
          </button>
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
