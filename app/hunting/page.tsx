'use client';
import { useEffect, useRef, useState } from 'react';
import type * as THREEType from 'three';

/* ═══════════════════════════════════════════════════════════════
   WILDERNESS HUNT — First-Person 3D Hunting Game
   Three.js + Canvas 2D HUD overlay
   ═══════════════════════════════════════════════════════════════ */

const QUESTS = [
  { id:'q1', icon:'🦌', name:'First Blood',    desc:'Hunt 2 deer',      goal:2,  reward:'🎯 Hunting Rifle (60 dmg)',    key:'deer'    },
  { id:'q2', icon:'🐻', name:'Bear Bane',       desc:'Hunt a bear',      goal:1,  reward:'💥 12-Gauge Shotgun (80 dmg)', key:'bear'    },
  { id:'q3', icon:'🫎', name:'Moose Master',    desc:'Hunt a moose',     goal:1,  reward:'🔭 .308 Sniper (150 dmg)',     key:'moose'   },
  { id:'q4', icon:'🐟', name:"Gone Fishin'",    desc:'Catch 3 fish',     goal:3,  reward:'📦 +60 Ammo',                 key:'fish'    },
  { id:'q5', icon:'🦃', name:'Turkey Season',   desc:'Hunt 3 turkeys',   goal:3,  reward:'🦺 Hunting Vest (+50 HP)',    key:'turkey'  },
];

export default function HuntingGame() {
  const mountRef   = useRef<HTMLDivElement>(null);
  const hudRef     = useRef<HTMLCanvasElement>(null);
  const gameState  = useRef<any>(null);
  const [showPanel, setShowPanel] = useState<'none'|'quests'|'inventory'>('none');
  const [snapshot, setSnapshot]   = useState({ hp:100, ammo:18, maxAmmo:18, weapon:'pistol',
    msg:'', msgTimer:0, quests:QUESTS.map(q=>({...q,prog:0,done:false})),
    inventory:{deer:0,bear:0,turkey:0,moose:0,fish:0,cooked:0,wood:0},
    campfire:false, tent:false });

  useEffect(() => {
    if (!mountRef.current) return;
    let alive = true;
    let THREE: any, renderer: any, scene: any, camera: any, raf = 0;

    async function init() {
      THREE = await import('three');

      // ── Renderer ──────────────────────────────────────────
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      mountRef.current!.appendChild(renderer.domElement);

      // ── Scene ─────────────────────────────────────────────
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x7a9e7a, 0.006);
      scene.background = new THREE.Color(0x87ceeb);

      // ── Camera ────────────────────────────────────────────
      camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 800);
      camera.position.set(0, 1.7, 0);

      // ── Lighting ──────────────────────────────────────────
      const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
      scene.add(ambientLight);

      const sun = new THREE.DirectionalLight(0xfff5e0, 2.0);
      sun.position.set(80, 120, 60);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 500;
      sun.shadow.camera.left = -200;
      sun.shadow.camera.right = 200;
      sun.shadow.camera.top = 200;
      sun.shadow.camera.bottom = -200;
      scene.add(sun);

      const fillLight = new THREE.DirectionalLight(0x4060ff, 0.3);
      fillLight.position.set(-60, 30, -80);
      scene.add(fillLight);

      const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5a2a, 0.4);
      scene.add(hemiLight);

      // ── Sky ───────────────────────────────────────────────
      const skyGeo = new THREE.SphereGeometry(500, 32, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { topColor: { value: new THREE.Color(0x1a3a7a) }, bottomColor: { value: new THREE.Color(0x87ceeb) }, offset: { value: 33 }, exponent: { value: 0.6 } },
        vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main() { float h = normalize(vWorldPosition + offset).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0); }`,
      });
      scene.add(new THREE.Mesh(skyGeo, skyMat));

      // ── Terrain ───────────────────────────────────────────
      const terrainSize = 400;
      const terrainSegs = 128;
      const terrainGeo  = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
      terrainGeo.rotateX(-Math.PI / 2);

      // Procedural heightmap
      const positions = terrainGeo.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getZ(i);
        let h = 0;
        h += Math.sin(x * 0.04) * Math.cos(z * 0.04) * 3;
        h += Math.sin(x * 0.09 + 1.3) * Math.cos(z * 0.07 + 0.8) * 1.5;
        h += (Math.random() - 0.5) * 0.4;
        // Lake depression
        const ld = Math.sqrt((x - 80) ** 2 + (z - 80) ** 2);
        if (ld < 30) h = Math.min(h, -0.5 - (30 - ld) * 0.15);
        positions.setY(i, h);
      }
      terrainGeo.computeVertexNormals();

      // Multi-texture terrain using vertex colors
      const colors = [];
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        if (y < -0.3) { colors.push(0.2, 0.35, 0.6); } // water-ish low
        else if (y < 1)  { colors.push(0.15, 0.45, 0.12); } // grass
        else if (y < 3)  { colors.push(0.25, 0.52, 0.15); } // bright grass
        else              { colors.push(0.35, 0.55, 0.22); } // high ground
      }
      terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const terrain = new THREE.Mesh(terrainGeo, terrainMat);
      terrain.receiveShadow = true;
      scene.add(terrain);

      // ── Lake ──────────────────────────────────────────────
      const lakeGeo = new THREE.CircleGeometry(26, 64);
      lakeGeo.rotateX(-Math.PI / 2);
      const lakeMat = new THREE.MeshPhysicalMaterial({
        color: 0x2255aa, transparent: true, opacity: 0.75,
        roughness: 0.05, metalness: 0.1, reflectivity: 0.9,
      });
      const lake = new THREE.Mesh(lakeGeo, lakeMat);
      lake.position.set(80, 0.05, 80);
      scene.add(lake);

      // ── Mountains ─────────────────────────────────────────
      for (let m = 0; m < 20; m++) {
        const angle = (m / 20) * Math.PI * 2;
        const dist  = 200 + Math.random() * 120;
        const mh    = 40 + Math.random() * 80;
        const geo   = new THREE.ConeGeometry(30 + Math.random() * 25, mh, 8 + Math.floor(Math.random() * 6));
        const r     = 0.28 + Math.random() * 0.12;
        const gv    = 0.32 + Math.random() * 0.12;
        const b     = 0.38 + Math.random() * 0.12;
        const mat   = new THREE.MeshLambertMaterial({ color: new THREE.Color(r, gv, b) });
        const mesh  = new THREE.Mesh(geo, mat);
        mesh.position.set(Math.cos(angle) * dist, mh / 2 - 2, Math.sin(angle) * dist);
        mesh.castShadow = true;
        scene.add(mesh);
        // Snow cap
        const snowGeo = new THREE.ConeGeometry((30 + Math.random() * 25) * 0.35, mh * 0.25, 8);
        const snowMat = new THREE.MeshLambertMaterial({ color: 0xf0f4ff });
        const snow    = new THREE.Mesh(snowGeo, snowMat);
        snow.position.set(mesh.position.x, mh * 0.88, mesh.position.z);
        scene.add(snow);
      }

      // ── Trees ─────────────────────────────────────────────
      function makeTree(x: number, z: number, scale: number) {
        const group = new THREE.Group();
        const trunkH = 3.5 * scale;
        // Trunk
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, trunkH, 8),
          new THREE.MeshLambertMaterial({ color: 0x5a3010 })
        );
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        group.add(trunk);
        // 3 cone layers
        const greens = [0x1a5a0a, 0x2a7a12, 0x1e6a0e];
        for (let i = 0; i < 3; i++) {
          const coneH = (4 - i * 0.5) * scale;
          const coneR = (2.2 - i * 0.5) * scale;
          const cone  = new THREE.Mesh(
            new THREE.ConeGeometry(coneR, coneH, 8),
            new THREE.MeshLambertMaterial({ color: greens[i] })
          );
          cone.position.y = trunkH + (i * 1.8 + 1.5) * scale;
          cone.castShadow = true;
          group.add(cone);
        }
        group.position.set(x, 0, z);
        // Snap to terrain height
        const raycaster = new THREE.Raycaster(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
        const hits = raycaster.intersectObject(terrain);
        if (hits.length > 0) group.position.y = hits[0].point.y;
        scene.add(group);
        return group;
      }

      // Generate trees avoiding lake and start area
      const treeMeshes: THREEType.Group[] = [];
      for (let i = 0; i < 180; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = 12 + Math.random() * 160;
        const x     = Math.cos(angle) * dist;
        const z     = Math.sin(angle) * dist;
        const ld    = Math.sqrt((x - 80) ** 2 + (z - 80) ** 2);
        const pd    = Math.sqrt(x * x + z * z);
        if (ld < 32 || pd < 6) continue;
        const scale = 0.6 + Math.random() * 0.9;
        treeMeshes.push(makeTree(x, z, scale));
      }

      // ── Animals ───────────────────────────────────────────
      type AnimalType = 'deer'|'bear'|'turkey'|'moose';
      interface Animal3D {
        type: AnimalType; group: THREEType.Group; hp: number; maxHp: number;
        state: 'idle'|'walk'|'flee'|'aggro'|'dead'; meat: number;
        vx: number; vz: number; angle: number; anim: number; dieT: number;
      }

      function makeAnimalMesh(type: AnimalType): THREEType.Group {
        const g = new THREE.Group();
        const bodyMats: Record<AnimalType, number> = { deer: 0x8b6914, bear: 0x3a2a1a, turkey: 0x6a4a1a, moose: 0x4a3010 };
        const bodyColor = new THREE.Color(bodyMats[type]);
        const dark = bodyColor.clone().multiplyScalar(0.65);

        if (type === 'deer') {
          const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 8, 8), new THREE.MeshLambertMaterial({ color: bodyColor }));
          body.rotation.z = Math.PI / 2; body.position.y = 1.1; g.add(body);
          // Legs
          const legMat = new THREE.MeshLambertMaterial({ color: dark });
          [[-0.25, -0.45], [-0.25, 0.25], [0.25, -0.45], [0.25, 0.25]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.9, 6), legMat);
            leg.position.set(x, 0.45, z); g.add(leg);
          });
          // Neck
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.7, 8), new THREE.MeshLambertMaterial({ color: bodyColor }));
          neck.position.set(0, 1.55, -0.5); neck.rotation.x = -0.5; g.add(neck);
          // Head
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshLambertMaterial({ color: bodyColor }));
          head.position.set(0, 1.95, -0.78); head.scale.z = 1.4; g.add(head);
          // Antlers
          const antlerMat = new THREE.MeshLambertMaterial({ color: 0x4a3010 });
          const antlerGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.5, 5);
          [[-0.1, 2.15, -0.75], [0.1, 2.15, -0.75]].forEach(([x, y, z]) => {
            const a = new THREE.Mesh(antlerGeo, antlerMat);
            a.position.set(x, y, z); a.rotation.z = x * 0.8; g.add(a);
          });
        } else if (type === 'bear') {
          const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.9, 8, 8), new THREE.MeshLambertMaterial({ color: bodyColor }));
          body.rotation.z = Math.PI / 2; body.position.y = 0.85; g.add(body);
          const legMat2 = new THREE.MeshLambertMaterial({ color: dark });
          [[-0.35, -0.4], [-0.35, 0.3], [0.35, -0.4], [0.35, 0.3]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.65, 6), legMat2);
            leg.position.set(x, 0.32, z); g.add(leg);
          });
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), new THREE.MeshLambertMaterial({ color: bodyColor }));
          head.position.set(0, 1.35, -0.7); g.add(head);
          const snout = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshLambertMaterial({ color: new THREE.Color(0x5a3a18) }));
          snout.position.set(0, 1.28, -0.96); snout.scale.z = 1.4; g.add(snout);
          const earMat = new THREE.MeshLambertMaterial({ color: dark });
          [[-0.22, 1.66, -0.68], [0.22, 1.66, -0.68]].forEach(([x, y, z]) => {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), earMat);
            ear.position.set(x, y, z); g.add(ear);
          });
        } else if (type === 'turkey') {
          const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), new THREE.MeshLambertMaterial({ color: bodyColor }));
          body.position.y = 0.8; body.scale.z = 1.4; g.add(body);
          const legMat3 = new THREE.MeshLambertMaterial({ color: 0xa08040 });
          [[-0.12, 0.1], [0.12, 0.1]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.55, 5), legMat3);
            leg.position.set(x, 0.28, z); g.add(leg);
          });
          // Fan tail
          for (let fi = 0; fi < 7; fi++) {
            const fa = ((fi / 6) - 0.5) * Math.PI * 0.7;
            const fan = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.6), new THREE.MeshLambertMaterial({ color: 0x8a5a10, side: THREE.DoubleSide }));
            fan.position.set(Math.sin(fa) * 0.3, 0.9, Math.cos(fa) * 0.3 + 0.2);
            fan.rotation.y = -fa; g.add(fan);
          }
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), new THREE.MeshLambertMaterial({ color: 0x3a2a0a }));
          head.position.set(0, 1.12, -0.5); g.add(head);
          // Wattle
          const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), new THREE.MeshLambertMaterial({ color: 0xcc2222 }));
          wattle.position.set(0, 1.02, -0.6); g.add(wattle);
        } else { // moose
          const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.2, 8, 8), new THREE.MeshLambertMaterial({ color: bodyColor }));
          body.rotation.z = Math.PI / 2; body.position.y = 1.4; g.add(body);
          const legMat4 = new THREE.MeshLambertMaterial({ color: dark });
          [[-0.35, -0.6], [-0.35, 0.35], [0.35, -0.6], [0.35, 0.35]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 1.2, 6), legMat4);
            leg.position.set(x, 0.6, z); g.add(leg);
          });
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.9, 8), new THREE.MeshLambertMaterial({ color: bodyColor }));
          neck.position.set(0, 2.15, -0.7); neck.rotation.x = -0.6; g.add(neck);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.7), new THREE.MeshLambertMaterial({ color: bodyColor }));
          head.position.set(0, 2.65, -1.15); g.add(head);
          // Bell
          const bell = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.25, 4, 6), new THREE.MeshLambertMaterial({ color: dark }));
          bell.position.set(0, 2.38, -1.28); g.add(bell);
          // Antlers (palmate)
          const antMat = new THREE.MeshLambertMaterial({ color: 0x5a3a10 });
          ([-0.2, 0.2] as number[]).forEach(xSign => {
            const main = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.9, 5), antMat);
            main.position.set(xSign * 0.22, 3.05, -1.15); main.rotation.z = xSign * 0.4;
            g.add(main);
            const palm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.35), antMat);
            palm.position.set(xSign * 0.5, 3.42, -1.15);
            g.add(palm);
          });
        }
        return g;
      }

      const animals3D: Animal3D[] = [];
      const animalDefs: [AnimalType, number, number, number][] = [
        ['deer', 6, 80, 2], ['bear', 3, 300, 3], ['turkey', 6, 50, 1], ['moose', 3, 220, 4],
      ];
      animalDefs.forEach(([type, count, hp, meat]) => {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist  = 18 + Math.random() * 90;
          const x     = Math.cos(angle) * dist;
          const z     = Math.sin(angle) * dist;
          const ld    = Math.sqrt((x - 80) ** 2 + (z - 80) ** 2);
          if (ld < 35) continue;
          const group = makeAnimalMesh(type);
          group.position.set(x, 0, z);
          // Snap to terrain
          const ray2 = new THREE.Raycaster(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
          const h2 = ray2.intersectObject(terrain);
          if (h2.length > 0) group.position.y = h2[0].point.y;
          scene.add(group);
          animals3D.push({ type, group, hp, maxHp: hp, meat, state: 'idle', vx: 0, vz: 0,
            angle: Math.random() * Math.PI * 2, anim: Math.random() * 10, dieT: 0 });
        }
      });

      // HP bar sprites for animals
      const hpBarCanvas = document.createElement('canvas');
      hpBarCanvas.width = 128; hpBarCanvas.height = 16;

      // ── Campfire ──────────────────────────────────────────
      const campfireGroup = new THREE.Group();
      campfireGroup.position.set(5, 0, 5);
      campfireGroup.visible = false;
      // Logs
      const logMat = new THREE.MeshLambertMaterial({ color: 0x4a2808 });
      for (let i = 0; i < 4; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6), logMat);
        log.position.set(Math.cos(i/4*Math.PI*2)*0.3, 0.07, Math.sin(i/4*Math.PI*2)*0.3);
        log.rotation.z = Math.PI/2; campfireGroup.add(log);
      }
      // Fire (point light)
      const fireLight = new THREE.PointLight(0xff6620, 4, 8);
      fireLight.position.y = 0.5;
      campfireGroup.add(fireLight);
      scene.add(campfireGroup);

      // ── Tent ──────────────────────────────────────────────
      const tentGroup = new THREE.Group();
      tentGroup.visible = false;
      const tentMat = new THREE.MeshLambertMaterial({ color: 0x8a6040, side: THREE.DoubleSide });
      const tentGeo = new THREE.ConeGeometry(2, 2.5, 4);
      const tentMesh = new THREE.Mesh(tentGeo, tentMat);
      tentMesh.position.y = 1.25; tentGroup.add(tentMesh);
      scene.add(tentGroup);

      // ── Fishing rod ───────────────────────────────────────
      const rodGroup = new THREE.Group();
      rodGroup.visible = false;
      const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 2.2, 6), new THREE.MeshLambertMaterial({ color: 0x8a5020 }));
      rodMesh.rotation.x = Math.PI / 4; rodMesh.position.set(0.35, -0.5, -0.4);
      rodGroup.add(rodMesh);
      camera.add(rodGroup); scene.add(camera);

      // ── Weapon models (attached to camera) ───────────────
      const weaponGroup = new THREE.Group();
      scene.add(camera);
      camera.add(weaponGroup);

      function buildWeapon(type: string) {
        while (weaponGroup.children.length) weaponGroup.remove(weaponGroup.children[0]);
        const dark = 0x1a1a1a, wood = 0x5a3010;
        if (type === 'pistol') {
          const slide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.32), new THREE.MeshLambertMaterial({ color: dark }));
          slide.position.set(0.2, -0.18, -0.38);
          const grip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.12), new THREE.MeshLambertMaterial({ color: 0x3a3a3a }));
          grip.position.set(0.2, -0.26, -0.28); grip.rotation.x = 0.2;
          weaponGroup.add(slide, grip);
        } else if (type === 'rifle') {
          const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.55), new THREE.MeshLambertMaterial({ color: wood }));
          stock.position.set(0.18, -0.2, -0.2);
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8, 6), new THREE.MeshLambertMaterial({ color: dark }));
          barrel.rotation.x = Math.PI / 2; barrel.position.set(0.18, -0.18, -0.7);
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.085, 0.45), new THREE.MeshLambertMaterial({ color: dark }));
          body.position.set(0.18, -0.2, -0.5);
          weaponGroup.add(stock, barrel, body);
        } else if (type === 'shotgun') {
          const stock2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.5), new THREE.MeshLambertMaterial({ color: wood }));
          stock2.position.set(0.18, -0.2, -0.18);
          const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.65, 6), new THREE.MeshLambertMaterial({ color: dark }));
          b1.rotation.x = Math.PI / 2; b1.position.set(0.16, -0.17, -0.65);
          const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.65, 6), new THREE.MeshLambertMaterial({ color: dark }));
          b2.rotation.x = Math.PI / 2; b2.position.set(0.2, -0.17, -0.65);
          weaponGroup.add(stock2, b1, b2);
        } else { // sniper
          const stock3 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.55), new THREE.MeshLambertMaterial({ color: dark }));
          stock3.position.set(0.18, -0.2, -0.18);
          const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6), new THREE.MeshLambertMaterial({ color: dark }));
          brl.rotation.x = Math.PI / 2; brl.position.set(0.18, -0.18, -0.85);
          const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 8), new THREE.MeshLambertMaterial({ color: 0x111111 }));
          scope.rotation.x = Math.PI / 2; scope.position.set(0.18, -0.14, -0.55);
          weaponGroup.add(stock3, brl, scope);
        }
      }
      buildWeapon('pistol');

      // ── Game state ────────────────────────────────────────
      const gs = {
        pos: new THREE.Vector3(0, 1.7, 0),
        vel: new THREE.Vector3(),
        yaw: 0, pitch: 0,
        hp: 100, maxHp: 100,
        ammo: 18, maxAmmo: 18,
        weapon: 'pistol' as string,
        weapons: new Set<string>(['pistol']),
        quests: QUESTS.map(q => ({ ...q, prog: 0, done: false })),
        inventory: { deer: 0, bear: 0, turkey: 0, moose: 0, fish: 0, cooked: 0, wood: 0 },
        campfire: false, campfirePos: new THREE.Vector3(5, 0, 5),
        tent: false, tentPos: new THREE.Vector3(),
        fishing: false, fishTimer: 0, fishBite: false, fishBiteTimer: 0,
        keys: new Set<string>(),
        mouse: { dx: 0, dy: 0 },
        joy1: { on: false, sx: 0, sy: 0, cx: 0, cy: 0, id: -1 },
        joy2: { on: false, sx: 0, sy: 0, cx: 0, cy: 0, id: -1 },
        shotAnim: 0, recoil: 0,
        msg: '', msgTimer: 0,
        tod: 0.55,
        lastT: 0,
        locked: false,
      };
      gameState.current = gs;

      // ── Input ─────────────────────────────────────────────
      function shoot() {
        if (gs.ammo <= 0) { setMsg('No ammo!'); return; }
        gs.ammo--;
        gs.shotAnim = 0.35;
        gs.recoil = 0.18;
        const dmg: Record<string, number> = { pistol: 25, rifle: 60, shotgun: 80, sniper: 150 };
        const range: Record<string, number> = { pistol: 80, rifle: 200, shotgun: 50, sniper: 300 };
        const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(gs.pitch, gs.yaw, 0, 'YXZ'));
        const ray3 = new THREE.Raycaster(gs.pos.clone(), dir, 0.1, range[gs.weapon] || 100);
        let hit = false;
        animals3D.forEach(a => {
          if (a.state === 'dead') return;
          const hits2 = ray3.intersectObject(a.group, true);
          if (hits2.length > 0) {
            a.hp -= dmg[gs.weapon] || 25;
            a.state = a.type === 'bear' && a.hp > 0 ? 'aggro' : 'flee';
            hit = true;
            if (a.hp <= 0) {
              a.state = 'dead'; a.dieT = 3;
              gs.inventory[a.type]++;
              // Quest update
              const q = gs.quests.find(q => q.key === a.type);
              if (q && !q.done) { q.prog++; if (q.prog >= q.goal) { q.done = true; unlockReward(q); } }
              setMsg(`${capitalize(a.type)} downed! +${a.meat} meat 🍖`);
            }
          }
        });
      }

      function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

      function unlockReward(q: typeof gs.quests[0]) {
        if (q.id === 'q1' && !gs.weapons.has('rifle'))  { gs.weapons.add('rifle');   gs.weapon = 'rifle';   gs.ammo = gs.maxAmmo; buildWeapon('rifle');   setMsg('🎯 Hunting Rifle unlocked!'); }
        if (q.id === 'q2' && !gs.weapons.has('shotgun')) { gs.weapons.add('shotgun'); gs.weapon = 'shotgun'; gs.ammo = gs.maxAmmo; buildWeapon('shotgun'); setMsg('💥 Shotgun unlocked!'); }
        if (q.id === 'q3' && !gs.weapons.has('sniper'))  { gs.weapons.add('sniper');  gs.weapon = 'sniper';  gs.maxAmmo = 30; gs.ammo = 30; buildWeapon('sniper'); setMsg('🔭 Sniper unlocked!'); }
        if (q.id === 'q4') { gs.maxAmmo += 60; gs.ammo = Math.min(gs.ammo + 60, gs.maxAmmo); setMsg('📦 +60 Ammo!'); }
        if (q.id === 'q5') { gs.maxHp += 50; gs.hp = gs.maxHp; setMsg('🦺 Hunting Vest — +50 HP!'); }
      }

      function interact() {
        // Fishing
        const lakePos = new THREE.Vector3(80, 0, 80);
        if (gs.pos.distanceTo(lakePos) < 30) {
          gs.fishing = !gs.fishing;
          gs.fishTimer = 0; gs.fishBite = false;
          setMsg(gs.fishing ? '🎣 Fishing... wait for a bite! Press [E] again to reel.' : 'Stopped fishing.');
          return;
        }
        // Cook
        const fire3 = new THREE.Vector3(gs.campfirePos.x, 0, gs.campfirePos.z);
        if (gs.campfire && gs.pos.distanceTo(fire3) < 10) {
          const raw = gs.inventory.deer + gs.inventory.bear + gs.inventory.turkey + gs.inventory.moose;
          if (raw > 0) {
            gs.inventory.cooked += raw;
            gs.inventory.deer = gs.inventory.bear = gs.inventory.turkey = gs.inventory.moose = 0;
            setMsg(`🍖 Cooked ${raw} meat!`);
          } else { setMsg('Need raw meat to cook!'); }
          return;
        }
        // Eat
        if (gs.inventory.cooked > 0) { gs.inventory.cooked--; gs.hp = Math.min(gs.maxHp, gs.hp + 30); setMsg('🍖 Ate cooked meat +30 HP!'); return; }
      }

      function placeTent() {
        gs.tent = true;
        tentGroup.position.copy(gs.pos).add(new THREE.Vector3(Math.sin(gs.yaw) * -4, -1.7, Math.cos(gs.yaw) * -4));
        tentGroup.visible = true;
        setMsg('⛺ Tent placed!');
      }

      function lightFire() {
        gs.campfire = true;
        gs.campfirePos.copy(gs.pos).add(new THREE.Vector3(Math.sin(gs.yaw) * -3, -1.7, Math.cos(gs.yaw) * -3));
        campfireGroup.position.copy(gs.campfirePos);
        campfireGroup.visible = true;
        setMsg('🔥 Campfire lit!');
      }

      function setMsg(m: string) { gs.msg = m; gs.msgTimer = 3.5; }

      // Keyboard
      const onKD = (e: KeyboardEvent) => {
        gs.keys.add(e.code);
        if (e.code === 'KeyF') shoot();
        if (e.code === 'KeyE') interact();
        if (e.code === 'KeyT') placeTent();
        if (e.code === 'KeyC') lightFire();
        if (e.code === 'Tab') { e.preventDefault(); setShowPanel(p => p === 'none' ? 'quests' : 'none'); }
        if (e.code === 'KeyG') { // switch weapon
          const wArr = Array.from(gs.weapons);
          const ci = wArr.indexOf(gs.weapon);
          gs.weapon = wArr[(ci + 1) % wArr.length];
          buildWeapon(gs.weapon);
        }
      };
      const onKU = (e: KeyboardEvent) => gs.keys.delete(e.code);
      window.addEventListener('keydown', onKD);
      window.addEventListener('keyup', onKU);

      // Pointer lock mouse
      const onMM = (e: MouseEvent) => {
        if (document.pointerLockElement === renderer.domElement) {
          gs.mouse.dx += e.movementX * 0.002;
          gs.mouse.dy += e.movementY * 0.002;
        }
      };
      renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock());
      window.addEventListener('mousemove', onMM);
      window.addEventListener('mousedown', (e) => { if (e.button === 0 && document.pointerLockElement === renderer.domElement) shoot(); });

      // Touch
      const onTS = (e: TouchEvent) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (t.clientX < innerWidth * 0.45 && gs.joy1.id === -1) {
            gs.joy1 = { on: true, sx: t.clientX, sy: t.clientY, cx: t.clientX, cy: t.clientY, id: t.identifier };
          } else if (t.clientX > innerWidth * 0.55 && gs.joy2.id === -1) {
            gs.joy2 = { on: true, sx: t.clientX, sy: t.clientY, cx: t.clientX, cy: t.clientY, id: t.identifier };
          }
          // Fire button
          if (t.clientX > innerWidth * 0.82 && t.clientY > innerHeight * 0.72) shoot();
        }
      };
      const onTM = (e: TouchEvent) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === gs.joy1.id) { gs.joy1.cx = t.clientX; gs.joy1.cy = t.clientY; }
          if (t.identifier === gs.joy2.id) {
            gs.mouse.dx += (t.clientX - gs.joy2.cx) * 0.004;
            gs.mouse.dy += (t.clientY - gs.joy2.cy) * 0.004;
            gs.joy2.cx = t.clientX; gs.joy2.cy = t.clientY;
          }
        }
      };
      const onTE = (e: TouchEvent) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === gs.joy1.id) gs.joy1 = { on: false, sx: 0, sy: 0, cx: 0, cy: 0, id: -1 };
          if (t.identifier === gs.joy2.id) gs.joy2 = { on: false, sx: 0, sy: 0, cx: 0, cy: 0, id: -1 };
        }
      };
      renderer.domElement.addEventListener('touchstart', onTS, { passive: false });
      renderer.domElement.addEventListener('touchmove', onTM, { passive: false });
      renderer.domElement.addEventListener('touchend', onTE, { passive: false });
      renderer.domElement.addEventListener('touchcancel', onTE, { passive: false });

      // ── Update ────────────────────────────────────────────
      const raycasterGround = new THREE.Raycaster();
      const groundDir = new THREE.Vector3(0, -1, 0);

      function update(dt: number) {
        gs.tod = (gs.tod + dt / 120) % 1;

        // Camera rotation
        gs.yaw   -= gs.mouse.dx; gs.mouse.dx = 0;
        gs.pitch  = Math.max(-0.8, Math.min(0.6, gs.pitch - gs.mouse.dy)); gs.mouse.dy = 0;
        if (gs.keys.has('ArrowLeft'))  gs.yaw += dt * 0.002;
        if (gs.keys.has('ArrowRight')) gs.yaw -= dt * 0.002;

        // Movement
        const spd = 6 * (dt / 1000);
        const fwd = new THREE.Vector3(Math.sin(gs.yaw), 0, Math.cos(gs.yaw));
        const rgt = new THREE.Vector3().crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();

        if (gs.keys.has('KeyW') || gs.keys.has('ArrowUp'))   { gs.pos.addScaledVector(fwd, spd); }
        if (gs.keys.has('KeyS') || gs.keys.has('ArrowDown'))  { gs.pos.addScaledVector(fwd, -spd); }
        if (gs.keys.has('KeyA'))                               { gs.pos.addScaledVector(rgt, -spd); }
        if (gs.keys.has('KeyD'))                               { gs.pos.addScaledVector(rgt, spd); }

        // Touch joystick movement
        if (gs.joy1.on) {
          const jdx = gs.joy1.cx - gs.joy1.sx, jdy = gs.joy1.cy - gs.joy1.sy;
          const jd = Math.sqrt(jdx * jdx + jdy * jdy);
          if (jd > 8) {
            const nx = jdx / Math.max(jd, 55), ny = jdy / Math.max(jd, 55);
            gs.pos.addScaledVector(fwd, -ny * spd * 1.5);
            gs.pos.addScaledVector(rgt, nx * spd * 1.5);
          }
        }

        // Clamp world bounds
        gs.pos.x = Math.max(-180, Math.min(180, gs.pos.x));
        gs.pos.z = Math.max(-180, Math.min(180, gs.pos.z));

        // Snap to terrain height
        raycasterGround.set(new THREE.Vector3(gs.pos.x, 50, gs.pos.z), groundDir);
        const terrHits = raycasterGround.intersectObject(terrain);
        if (terrHits.length > 0) gs.pos.y = terrHits[0].point.y + 1.7;

        // Weapon sway
        const swayT = Date.now() * 0.001;
        weaponGroup.position.set(
          Math.sin(swayT * 1.1) * 0.005,
          Math.sin(swayT * 0.8) * 0.005 - gs.recoil,
          0
        );
        gs.recoil = Math.max(0, gs.recoil - dt * 0.0008);
        if (gs.shotAnim > 0) { gs.shotAnim = Math.max(0, gs.shotAnim - dt * 0.001); }

        // Update camera
        camera.position.copy(gs.pos);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = gs.yaw;
        camera.rotation.x = gs.pitch;

        // Sky color based on TOD
        const todColors = [
          { t: 0.0,  sky: [0x050e1e, 0x0a1832], fog: 0x0a1428, exp: 0.015 },
          { t: 0.15, sky: [0x1a1040, 0x2a1a20], fog: 0x201828, exp: 0.01  },
          { t: 0.25, sky: [0x2a1a50, 0xe07040], fog: 0x705030, exp: 0.008 },
          { t: 0.4,  sky: [0x1a4a9a, 0x7ab4e8], fog: 0x8aaa88, exp: 0.006 },
          { t: 0.65, sky: [0x1840a0, 0x60a0e0], fog: 0x7a9e7a, exp: 0.006 },
          { t: 0.78, sky: [0x180820, 0xe05020], fog: 0x704830, exp: 0.008 },
          { t: 0.88, sky: [0x08081a, 0x101428], fog: 0x101420, exp: 0.012 },
        ];
        let ci2 = 0;
        for (let i = todColors.length - 1; i >= 0; i--) { if (gs.tod >= todColors[i].t) { ci2 = i; break; } }
        const c1e = todColors[ci2], c2e = todColors[(ci2 + 1) % todColors.length];
        const tf = (gs.tod - c1e.t) / ((c2e.t <= c1e.t ? c2e.t + 1 : c2e.t) - c1e.t);
        scene.background = new THREE.Color(c1e.sky[1]).lerp(new THREE.Color(c2e.sky[1]), Math.max(0, Math.min(1, tf)));
        scene.fog = new THREE.FogExp2(
          new THREE.Color(c1e.fog).lerp(new THREE.Color(c2e.fog), Math.max(0, Math.min(1, tf))).getHex(),
          lerp(c1e.exp, c2e.exp, Math.max(0, Math.min(1, tf)))
        );

        // Dynamic light (sun position)
        const sunAngle = gs.tod * Math.PI * 2 - Math.PI / 2;
        sun.position.set(Math.cos(sunAngle) * 200, Math.sin(sunAngle) * 180, 60);
        sun.intensity = Math.max(0.05, Math.sin(gs.tod * Math.PI));
        ambientLight.intensity = 0.2 + Math.max(0, Math.sin(gs.tod * Math.PI)) * 0.6;

        // Campfire flicker
        if (gs.campfire) {
          fireLight.intensity = 3 + Math.sin(Date.now() * 0.012) * 1.5 + Math.random() * 0.5;
          fireLight.color.setHSL(0.06 + Math.random() * 0.04, 1, 0.5);
        }

        // Animal AI
        animals3D.forEach(a => {
          if (a.state === 'dead') {
            a.dieT = Math.max(0, a.dieT - dt * 0.001);
            if (a.dieT < 1.5) { a.group.rotation.z = Math.min(Math.PI / 2, a.group.rotation.z + dt * 0.003); a.group.position.y -= dt * 0.0005; }
            return;
          }
          a.anim += dt * 0.003;
          const dp = gs.pos.clone().sub(a.group.position); dp.y = 0;
          const dist3 = dp.length();

          if (a.state === 'aggro' && dist3 < 3) {
            gs.hp = Math.max(0, gs.hp - 15 * (dt / 1000));
          }

          const moveSpd = (a.state === 'flee' ? 4.5 : a.state === 'aggro' ? 5.5 : 0.6) * (dt / 1000);

          if (a.state === 'flee') {
            dp.normalize().negate();
            a.group.position.addScaledVector(dp, moveSpd);
            a.angle = Math.atan2(dp.x, dp.z);
          } else if (a.state === 'aggro') {
            dp.normalize();
            a.group.position.addScaledVector(dp, moveSpd);
            a.angle = Math.atan2(dp.x, dp.z);
          } else {
            if (Math.random() < 0.004) a.angle += (Math.random() - 0.5) * 1.2;
            a.group.position.x += Math.sin(a.angle) * moveSpd;
            a.group.position.z += Math.cos(a.angle) * moveSpd;
          }

          a.group.position.x = Math.max(-170, Math.min(170, a.group.position.x));
          a.group.position.z = Math.max(-170, Math.min(170, a.group.position.z));
          a.group.rotation.y = a.angle;

          // Snap animal to terrain
          raycasterGround.set(new THREE.Vector3(a.group.position.x, 50, a.group.position.z), groundDir);
          const ah = raycasterGround.intersectObject(terrain);
          if (ah.length > 0) a.group.position.y = ah[0].point.y;

          // Animal body bob
          a.group.children.forEach((child: any, i) => {
            if (child.isGroup) return;
            child.position.y += Math.sin(a.anim * 2 + i) * 0.002;
          });

          // Flee if player close
          if (dist3 < 25 && a.state === 'idle' && a.type !== 'bear') a.state = 'flee';
          if (dist3 > 50 && a.state === 'flee') a.state = 'idle';
          if (a.type === 'bear' && dist3 < 30 && a.hp < a.maxHp) a.state = 'aggro';
        });

        // Fishing
        if (gs.fishing) {
          gs.fishTimer += dt;
          if (!gs.fishBite && gs.fishTimer > 3000 + Math.random() * 4000) {
            gs.fishBite = true; gs.fishBiteTimer = 1800;
            setMsg('🎣 BITE! Press [E] to catch!');
          }
          if (gs.fishBite) {
            gs.fishBiteTimer -= dt;
            if (gs.fishBiteTimer <= 0) { gs.fishBite = false; gs.fishTimer = 0; setMsg('The fish got away...'); }
          }
          if (gs.fishBite && gs.keys.has('KeyE')) {
            gs.fishBite = false; gs.fishTimer = 0;
            gs.inventory.fish++;
            const q4 = gs.quests.find(q => q.id === 'q4');
            if (q4 && !q4.done) { q4.prog++; if (q4.prog >= q4.goal) { q4.done = true; unlockReward(q4); } }
            setMsg(`🐟 Caught a fish! (${gs.inventory.fish} total)`);
          }
        }

        // Timers
        if (gs.msgTimer > 0) gs.msgTimer = Math.max(0, gs.msgTimer - dt * 0.001);

        // Sync snapshot
        setSnapshot({
          hp: Math.round(gs.hp), ammo: gs.ammo, maxAmmo: gs.maxAmmo, weapon: gs.weapon,
          msg: gs.msg, msgTimer: gs.msgTimer,
          quests: gs.quests.map(q => ({ ...q })),
          inventory: { ...gs.inventory },
          campfire: gs.campfire, tent: gs.tent,
        });
      }

      function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

      // ── Resize ────────────────────────────────────────────
      function onResize() {
        renderer.setSize(innerWidth, innerHeight);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
      }
      window.addEventListener('resize', onResize);

      // ── HUD Canvas ────────────────────────────────────────
      const hud = hudRef.current!;
      const hctx = hud.getContext('2d')!;
      hud.width = innerWidth; hud.height = innerHeight;

      function drawHUD() {
        hctx.clearRect(0, 0, hud.width, hud.height);
        const W = hud.width, H = hud.height;

        // Crosshair
        const cx3 = W / 2, cy3 = H / 2, cs = 13;
        hctx.strokeStyle = 'rgba(255,255,255,0.88)'; hctx.lineWidth = 1.5; hctx.lineCap = 'round';
        hctx.beginPath(); hctx.moveTo(cx3 - cs, cy3); hctx.lineTo(cx3 - 3, cy3); hctx.moveTo(cx3 + 3, cy3); hctx.lineTo(cx3 + cs, cy3);
        hctx.moveTo(cx3, cy3 - cs); hctx.lineTo(cx3, cy3 - 3); hctx.moveTo(cx3, cy3 + 3); hctx.lineTo(cx3, cy3 + cs);
        hctx.stroke();
        hctx.beginPath(); hctx.arc(cx3, cy3, 2.5, 0, Math.PI * 2);
        hctx.fillStyle = 'rgba(255,255,255,0.5)'; hctx.fill();

        // HP (bottom left)
        const hpPct = gs.hp / gs.maxHp;
        hctx.fillStyle = 'rgba(0,0,0,0.55)'; hctx.fillRect(14, H - 48, 145, 20);
        const hpG = hctx.createLinearGradient(16, 0, 150, 0);
        hpG.addColorStop(0, '#ef4444'); hpG.addColorStop(0.5, '#f97316'); hpG.addColorStop(1, '#22c55e');
        hctx.fillStyle = hpG; hctx.fillRect(16, H - 46, 132 * hpPct, 16);
        hctx.fillStyle = 'white'; hctx.font = 'bold 11px monospace'; hctx.textAlign = 'left';
        hctx.fillText(`❤️  ${Math.ceil(gs.hp)} / ${gs.maxHp}`, 18, H - 32);

        // Ammo (bottom right)
        hctx.fillStyle = 'rgba(0,0,0,0.55)'; hctx.fillRect(W - 158, H - 48, 146, 20);
        hctx.fillStyle = '#fbbf24'; hctx.font = 'bold 13px monospace'; hctx.textAlign = 'right';
        hctx.fillText(`${gs.weapon.toUpperCase()}  ${gs.ammo}/${gs.maxAmmo}`, W - 16, H - 31);

        // Time of day indicator
        const todPct = gs.tod;
        const todEmoji = todPct < 0.22 ? '🌙' : todPct < 0.3 ? '🌅' : todPct < 0.72 ? '☀️' : todPct < 0.85 ? '🌇' : '🌙';
        hctx.fillStyle = 'rgba(0,0,0,.45)'; hctx.fillRect(W / 2 - 50, 8, 100, 22);
        hctx.fillStyle = 'rgba(255,255,255,0.8)'; hctx.font = '12px sans-serif'; hctx.textAlign = 'center';
        hctx.fillText(todEmoji + ' ' + (gs.tod < 0.5 ? '🌡️' : ''), W / 2, 23);

        // Controls hint
        hctx.fillStyle = 'rgba(0,0,0,.42)'; hctx.fillRect(14, H - 78, 200, 26);
        hctx.fillStyle = 'rgba(255,255,255,.55)'; hctx.font = '10px monospace'; hctx.textAlign = 'left';
        hctx.fillText('[F] Shoot · [E] Interact · [T] Tent · [C] Fire · [G] Weapon', 18, H - 60);

        // Quest notifications
        hctx.fillStyle = 'rgba(0,0,0,.48)'; hctx.fillRect(W - 202, 8, 190, 22);
        hctx.fillStyle = 'rgba(255,255,255,.65)'; hctx.font = '10px monospace'; hctx.textAlign = 'right';
        hctx.fillText('[TAB] Quests', W - 12, 23);

        // Message
        if (gs.msgTimer > 0) {
          const alpha = Math.min(1, gs.msgTimer);
          hctx.globalAlpha = alpha;
          hctx.fillStyle = 'rgba(0,0,0,0.6)'; hctx.fillRect(W / 2 - 220, H * 0.34 - 18, 440, 30);
          hctx.fillStyle = '#ffd700'; hctx.font = 'bold 15px sans-serif'; hctx.textAlign = 'center';
          hctx.fillText(gs.msg, W / 2, H * 0.34);
          hctx.globalAlpha = 1;
        }

        // Fishing indicator
        if (gs.fishing) {
          hctx.fillStyle = 'rgba(20,60,140,.75)'; hctx.fillRect(W / 2 - 145, H * 0.26 - 16, 290, 26);
          hctx.fillStyle = gs.fishBite ? '#ffd700' : '#7dd3fc'; hctx.font = 'bold 13px sans-serif'; hctx.textAlign = 'center';
          hctx.fillText(gs.fishBite ? '🎣 BITE! Press [E]!' : '🎣 Fishing — waiting for bite...', W / 2, H * 0.26);
        }

        // Lake proximity hint
        const lakeDist = gs.pos.distanceTo(new THREE.Vector3(80, 0, 80));
        if (lakeDist < 30 && !gs.fishing) {
          hctx.fillStyle = 'rgba(20,60,140,.65)'; hctx.fillRect(W / 2 - 120, H * 0.32 - 14, 240, 22);
          hctx.fillStyle = '#7dd3fc'; hctx.font = '12px sans-serif'; hctx.textAlign = 'center';
          hctx.fillText('[E] Start fishing', W / 2, H * 0.32);
        }

        // Touch controls
        if ('ontouchstart' in window) {
          hctx.globalAlpha = 0.35; hctx.fillStyle = 'white';
          hctx.beginPath(); hctx.arc(80, H - 90, 46, 0, Math.PI * 2); hctx.fill();
          hctx.globalAlpha = 0.55; hctx.font = '11px sans-serif'; hctx.textAlign = 'center';
          hctx.fillText('MOVE', 80, H - 88);
          hctx.fillStyle = 'rgba(200,0,0,.6)';
          hctx.beginPath(); hctx.arc(W - 60, H - 80, 38, 0, Math.PI * 2); hctx.fill();
          hctx.fillStyle = 'white'; hctx.font = 'bold 22px sans-serif';
          hctx.fillText('🔫', W - 60, H - 73);
          hctx.globalAlpha = 1;
        }
      }

      // ── Render loop ───────────────────────────────────────
      let lastTime = 0;
      function loop(time: number) {
        if (!alive) return;
        const dt = Math.min(time - lastTime, 80);
        lastTime = time;
        update(dt);
        renderer.render(scene, camera);
        drawHUD();
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);

      // ── Cleanup ───────────────────────────────────────────
      return () => {
        window.removeEventListener('keydown', onKD);
        window.removeEventListener('keyup', onKU);
        window.removeEventListener('mousemove', onMM);
        window.removeEventListener('resize', onResize);
      };
    }

    const cleanup = init();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      renderer?.dispose();
      if (renderer?.domElement && mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      cleanup.then(fn => fn?.());
    };
  }, []);

  const activeQuests = snapshot.quests.filter(q => !q.done);
  const doneQuests   = snapshot.quests.filter(q => q.done);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', background: '#000', userSelect: 'none' }}>
      {/* Three.js canvas mount */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* HUD overlay */}
      <canvas ref={hudRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }} />

      {/* Quests panel */}
      {showPanel === 'quests' && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(380px, 100vw)', background: 'rgba(10,15,8,0.94)', backdropFilter: 'blur(12px)', borderLeft: '1px solid rgba(80,120,60,.4)', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', zIndex: 10 }}>
          <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(80,120,60,.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 16 }}>🗺️ Quest Log</div>
            <button onClick={() => setShowPanel('none')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeQuests.map(q => (
              <div key={q.id} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(80,120,60,.3)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{q.icon}</span>
                  <div>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{q.name}</div>
                    <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>{q.desc}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,.12)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (q.prog / q.goal) * 100)}%`, background: 'linear-gradient(90deg,#16a34a,#4ade80)', borderRadius: 3, transition: 'width .4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#86efac' }}>{q.prog} / {q.goal}</span>
                  <span style={{ color: '#fbbf24' }}>Reward: {q.reward}</span>
                </div>
              </div>
            ))}
            {doneQuests.length > 0 && (
              <>
                <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 11, marginTop: 4 }}>COMPLETED</div>
                {doneQuests.map(q => (
                  <div key={q.id} style={{ background: 'rgba(22,163,74,.1)', border: '1px solid rgba(22,163,74,.3)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
                    <span style={{ fontSize: 18 }}>{q.icon}</span>
                    <div>
                      <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 12 }}>✓ {q.name}</div>
                      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>Reward earned: {q.reward}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          {/* Inventory */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(80,120,60,.3)' }}>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, marginBottom: 8, fontWeight: 'bold' }}>🎒 INVENTORY</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {[
                ['🦌', 'Deer', snapshot.inventory.deer],
                ['🐻', 'Bear', snapshot.inventory.bear],
                ['🦃', 'Turkey', snapshot.inventory.turkey],
                ['🫎', 'Moose', snapshot.inventory.moose],
                ['🐟', 'Fish', snapshot.inventory.fish],
                ['🍖', 'Cooked', snapshot.inventory.cooked],
              ].map(([icon, label, count]) => (
                <div key={label as string} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 6, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>{label}</span>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 'auto' }}>{count as number}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['pistol', 'rifle', 'shotgun', 'sniper'].filter(w => snapshot.weapon === w || gameState.current?.weapons?.has(w)).map(w => (
                <div key={w} style={{ background: snapshot.weapon === w ? 'rgba(251,191,36,.25)' : 'rgba(255,255,255,.06)', border: `1px solid ${snapshot.weapon === w ? 'rgba(251,191,36,.5)' : 'rgba(255,255,255,.15)'}`, borderRadius: 6, padding: '3px 8px', fontSize: 10, color: snapshot.weapon === w ? '#fbbf24' : 'rgba(255,255,255,.5)' }}>
                  {snapshot.weapon === w ? '▶ ' : ''}{w.toUpperCase()}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,.3)' }}>[G] to switch weapon · [E] near fire to cook · [E] near lake to fish</div>
          </div>
        </div>
      )}

      {/* Intro overlay (no pointer lock yet) */}
      <div id="intro-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 5, pointerEvents: 'none' }}
        onClick={(e) => { (e.currentTarget as HTMLDivElement).style.display = 'none'; }}>
        <div style={{ textAlign: 'center', color: 'white', padding: 32, pointerEvents: 'all' }}
          onClick={(e) => { e.stopPropagation(); (document.getElementById('intro-overlay') as HTMLDivElement).style.display = 'none'; }}>
          <div style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 'bold', marginBottom: 12, textShadow: '0 0 20px rgba(74,222,128,.5)' }}>🌲 WILDERNESS HUNT</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', marginBottom: 20, maxWidth: 380, lineHeight: 1.6 }}>First-person 3D open-world hunting. Hunt deer, bears, turkey & moose. Fish at the lake. Make camp and cook your meat. Complete quests for better weapons.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'rgba(255,255,255,.6)', marginBottom: 20, textAlign: 'left', maxWidth: 300, margin: '0 auto 20px' }}>
            {[['WASD', 'Move'], ['Mouse', 'Look'], ['F / Click', 'Shoot'], ['E', 'Interact/Fish'], ['T', 'Place Tent'], ['C', 'Light Fire'], ['G', 'Switch Gun'], ['TAB', 'Quests']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 6 }}>
                <span style={{ color: '#fbbf24', minWidth: 60 }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <button style={{ padding: '14px 44px', fontSize: 18, fontWeight: 'bold', background: 'linear-gradient(135deg,#16a34a,#4ade80)', color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer', boxShadow: '0 0 24px rgba(74,222,128,.4)' }}>
            🎯 Enter the Wild
          </button>
        </div>
      </div>
    </div>
  );
}
