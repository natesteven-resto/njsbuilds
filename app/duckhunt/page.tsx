'use client'

import { useEffect, useRef } from 'react'

// ── Viewport: disable zoom for game ─────────────────────────────────
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

// ── Duck type definitions ────────────────────────────────────────────
interface DuckDef {
  name: string; pts: number; spd: number; sc: number; freq: number
  head: string; body: string; wing: string; belly: string
}
const DEFS: DuckDef[] = [
  { name:'Mallard', pts:100, spd:110, sc:1.00, freq:0.50, head:'#1a4a0a', body:'#8B6914', wing:'#5a3d0a', belly:'#c4a95a' },
  { name:'Teal',    pts:150, spd:170, sc:0.75, freq:0.35, head:'#0a5a5a', body:'#2a8a7a', wing:'#1a6a5a', belly:'#e8f0e8' },
  { name:'Pintail', pts:200, spd:230, sc:0.90, freq:0.15, head:'#7a5a30', body:'#d8d0c0', wing:'#9a8a6a', belly:'#f0ece0' },
]

// ── Pre-computed scene elements (stable, no per-frame Math.random) ───
const REEDS: [number, number][] = [
  [0.04,55],[0.08,70],[0.12,50],[0.16,80],[0.21,62],[0.26,45],[0.29,75],
  [0.57,58],[0.61,78],[0.65,52],[0.69,68],[0.73,48],[0.77,72],[0.81,56],
  [0.85,64],[0.89,44],[0.93,70],[0.97,52],
]
const CLOUDS: [number, number, number][] = [
  [0.14,0.09,55],[0.41,0.06,75],[0.60,0.17,45],[0.80,0.08,62],
]
const GRASS: [number, number, number][] = Array.from({length:40}, (_,i) => [
  (i * 0.026 + (i % 7) * 0.01) % 1.0,
  (i % 5) * 3 + 10,
  ((i * 7 + 3) % 11) - 5,
])

// ── Entity types ─────────────────────────────────────────────────────
interface Duck  { id:number; x:number; y:number; vx:number; vy:number; def:DuckDef; flap:number; fspd:number }
interface Drop  { x:number; y:number; vy:number; rot:number; rspd:number; a:number; def:DuckDef; pts:number }
interface Feath { x:number; y:number; vx:number; vy:number; rot:number; rspd:number; a:number; col:string }

export default function DuckHunt() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current!
    const cx = cv.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    let raf = 0
    let ac: AudioContext | null = null

    // ── Resize handling ──────────────────────────────────────────────
    function resize() {
      const w = innerWidth, h = innerHeight
      cv.width = w * dpr; cv.height = h * dpr
      cv.style.width = w + 'px'; cv.style.height = h + 'px'
      cx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    addEventListener('resize', resize)
    const W = () => innerWidth, H = () => innerHeight

    // ── Web Audio ────────────────────────────────────────────────────
    function getAC() { return ac ?? (ac = new (window.AudioContext || (window as any).webkitAudioContext)()) }

    function playShot() {
      try {
        const a = getAC()
        const buf = a.createBuffer(1, a.sampleRate * 0.18, a.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 1.5)
        const src = a.createBufferSource(), g = a.createGain()
        src.buffer = buf; g.gain.setValueAtTime(0.45, a.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18)
        src.connect(g); g.connect(a.destination); src.start()
      } catch {}
    }

    function playQuack(delay = 0) {
      try {
        const a = getAC(), o = a.createOscillator(), g = a.createGain()
        o.type = 'sawtooth'
        o.frequency.setValueAtTime(390, a.currentTime + delay)
        o.frequency.exponentialRampToValueAtTime(185, a.currentTime + delay + 0.18)
        g.gain.setValueAtTime(0, a.currentTime + delay)
        g.gain.linearRampToValueAtTime(0.16, a.currentTime + delay + 0.01)
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + delay + 0.22)
        o.connect(g); g.connect(a.destination)
        o.start(a.currentTime + delay); o.stop(a.currentTime + delay + 0.25)
      } catch {}
    }

    function playReload() {
      try {
        const a = getAC(), o = a.createOscillator(), g = a.createGain()
        o.type = 'square'
        o.frequency.setValueAtTime(140, a.currentTime)
        o.frequency.linearRampToValueAtTime(360, a.currentTime + 0.13)
        g.gain.setValueAtTime(0.10, a.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.16)
        o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.16)
      } catch {}
    }

    // ── Game state ───────────────────────────────────────────────────
    type GS = 'menu' | 'play' | 'over'
    let gs: GS = 'menu'
    let score = 0, best = +(localStorage.getItem('dh_best2') || 0)
    let time = 180, shots = 2, reloading = false
    let callCD = 0, spawnT = 1.5, uid = 0
    let ducks: Duck[] = [], drops: Drop[] = [], feaths: Feath[] = []
    let flash = { t: '', a: 0 }, prev = 0

    // ── Spawn logic ──────────────────────────────────────────────────
    function pickDef(): DuckDef {
      let r = Math.random(), c = 0
      for (const d of DEFS) { c += d.freq; if (r < c) return d }
      return DEFS[0]
    }

    function spawn(called = false) {
      if (ducks.length >= 6) return
      const w = W(), h = H(), def = pickDef()
      const left = Math.random() < 0.5
      const spd = def.spd * (0.8 + Math.random() * 0.4)
      const minY = called ? h * 0.30 : h * 0.06
      const maxY = called ? h * 0.60 : h * 0.50
      ducks.push({
        id: uid++,
        x: left ? -60 : w + 60,
        y: minY + Math.random() * (maxY - minY),
        vx: left ? spd : -spd,
        vy: (Math.random() - 0.5) * 40,
        def, flap: Math.random() * Math.PI * 2, fspd: 5 + Math.random() * 3,
      })
    }

    // ── Drawing helpers ──────────────────────────────────────────────
    // Rounded rect path helper (compatible with older browsers)
    function rr(x: number, y: number, w: number, h: number, r: number) {
      cx.moveTo(x + r, y); cx.lineTo(x + w - r, y); cx.quadraticCurveTo(x + w, y, x + w, y + r)
      cx.lineTo(x + w, y + h - r); cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      cx.lineTo(x + r, y + h); cx.quadraticCurveTo(x, y + h, x, y + h - r)
      cx.lineTo(x, y + r); cx.quadraticCurveTo(x, y, x + r, y); cx.closePath()
    }

    // ── Background ───────────────────────────────────────────────────
    function drawBG() {
      const w = W(), h = H()

      // Sky gradient (dawn/dusk)
      const sk = cx.createLinearGradient(0, 0, 0, h * 0.65)
      sk.addColorStop(0,    '#150c30')
      sk.addColorStop(0.25, '#3d1850')
      sk.addColorStop(0.55, '#b04515')
      sk.addColorStop(0.80, '#e07810')
      sk.addColorStop(1,    '#e8b830')
      cx.fillStyle = sk; cx.fillRect(0, 0, w, h * 0.65)

      // Sun glow + disc
      const sx = w * 0.72, sy = h * 0.54
      const sg = cx.createRadialGradient(sx, sy, 0, sx, sy, 90)
      sg.addColorStop(0,   'rgba(255,215,40,0.85)')
      sg.addColorStop(0.3, 'rgba(255,160,20,0.3)')
      sg.addColorStop(1,   'rgba(255,100,0,0)')
      cx.fillStyle = sg; cx.fillRect(sx - 90, sy - 90, 180, 180)
      cx.fillStyle = '#ffe030'; cx.beginPath(); cx.arc(sx, sy, 28, 0, Math.PI * 2); cx.fill()

      // Clouds
      cx.fillStyle = 'rgba(255,255,255,0.12)'
      for (const [cpx, cpy, sz] of CLOUDS) {
        const ccx = cpx * w, ccy = cpy * h
        cx.beginPath()
        cx.arc(ccx,          ccy,          sz * 0.50, 0, Math.PI * 2)
        cx.arc(ccx + sz*0.4, ccy - sz*0.1, sz * 0.38, 0, Math.PI * 2)
        cx.arc(ccx + sz*0.78, ccy,         sz * 0.32, 0, Math.PI * 2)
        cx.fill()
      }

      // Water / lake
      const wt = cx.createLinearGradient(0, h * 0.65, 0, h)
      wt.addColorStop(0,   '#356080')
      wt.addColorStop(0.4, '#1a3f5a')
      wt.addColorStop(1,   '#08152a')
      cx.fillStyle = wt; cx.fillRect(0, h * 0.65, w, h * 0.35)

      // Sun reflection strip on water
      cx.save(); cx.globalAlpha = 0.22
      const rg = cx.createLinearGradient(sx - 25, h * 0.65, sx + 25, h)
      rg.addColorStop(0, '#ffe030'); rg.addColorStop(1, 'rgba(255,220,48,0)')
      cx.fillStyle = rg; cx.fillRect(sx - 28, h * 0.65, 56, h - h * 0.65); cx.restore()

      // Ground strip / marsh
      const gy = h * 0.62
      cx.fillStyle = '#162210'; cx.fillRect(0, gy, w, h * 0.08)

      // Cattail reeds
      for (const [px, ph] of REEDS) {
        const rx = px * w, ry = gy + 4
        cx.strokeStyle = '#243a12'; cx.lineWidth = 2.5
        cx.beginPath(); cx.moveTo(rx, ry + 8); cx.lineTo(rx, ry - ph); cx.stroke()
        cx.fillStyle = '#4a1a05'
        cx.beginPath(); cx.ellipse(rx, ry - ph + 13, 3.5, 11, 0, 0, Math.PI * 2); cx.fill()
      }

      // Grass tufts
      cx.fillStyle = '#1e3410'
      for (const [gpx, gph, gdx] of GRASS) {
        const gx = gpx * w, gy2 = gy + 10
        cx.beginPath()
        cx.moveTo(gx,       gy2 + 8)
        cx.lineTo(gx + gdx - 3, gy2 - gph)
        cx.lineTo(gx + 2,   gy2 + 2)
        cx.lineTo(gx + gdx + 3, gy2 - gph + 5)
        cx.closePath(); cx.fill()
      }
    }

    // ── Draw a duck ──────────────────────────────────────────────────
    function drawDuck(d: Duck) {
      const { x, y, vx, def, flap } = d
      const sm = W() < 420 ? 0.85 : 1
      const s = def.sc * sm
      cx.save(); cx.translate(x, y)
      if (vx < 0) cx.scale(-1, 1)
      const wv = Math.sin(flap) * 9 * s

      // Drop shadow
      cx.save(); cx.globalAlpha = 0.12; cx.fillStyle = '#000'
      cx.beginPath(); cx.ellipse(3*s, 14*s, 20*s, 5*s, 0, 0, Math.PI*2); cx.fill(); cx.restore()

      // Body
      cx.fillStyle = def.body
      cx.beginPath(); cx.ellipse(0, 0, 22*s, 11*s, -0.15, 0, Math.PI*2); cx.fill()
      // Belly highlight
      cx.fillStyle = def.belly
      cx.beginPath(); cx.ellipse(6*s, 2*s, 12*s, 6.5*s, 0.1, 0, Math.PI*2); cx.fill()
      // Flapping wing
      cx.fillStyle = def.wing
      cx.beginPath(); cx.ellipse(-2*s, -3*s + wv, 17*s, 7*s, -0.25, 0, Math.PI*2); cx.fill()
      // Head
      cx.fillStyle = def.head
      cx.beginPath(); cx.arc(21*s, -8*s, 9*s, 0, Math.PI*2); cx.fill()
      // Eye white
      cx.fillStyle = '#fff'
      cx.beginPath(); cx.arc(24*s, -10*s, 2.2*s, 0, Math.PI*2); cx.fill()
      // Pupil
      cx.fillStyle = '#111'
      cx.beginPath(); cx.arc(24.7*s, -10*s, 1.1*s, 0, Math.PI*2); cx.fill()
      // Beak
      cx.fillStyle = '#d09020'
      cx.beginPath(); cx.moveTo(29*s, -7.5*s); cx.lineTo(38*s, -6*s); cx.lineTo(29*s, -4*s); cx.closePath(); cx.fill()
      // Pintail long tail
      if (def.name === 'Pintail') {
        cx.fillStyle = def.wing
        cx.beginPath(); cx.moveTo(-19*s, 0); cx.lineTo(-34*s, -10*s); cx.lineTo(-21*s, 2*s); cx.closePath(); cx.fill()
      }
      cx.restore()
    }

    // ── HUD ──────────────────────────────────────────────────────────
    function drawHUD() {
      const w = W(), h = H(), sm = w < 420

      // Score panel (top right)
      cx.fillStyle = 'rgba(0,0,0,0.48)'
      cx.beginPath(); rr(w - 148, 8, 138, 64, 8); cx.fill()
      cx.fillStyle = '#fff'; cx.font = `bold ${sm ? 25 : 30}px Arial`; cx.textAlign = 'right'
      cx.fillText(score.toLocaleString(), w - 14, 44)
      cx.fillStyle = 'rgba(255,255,255,0.6)'; cx.font = `${sm ? 11 : 13}px Arial`
      cx.fillText(`Best: ${best.toLocaleString()}`, w - 14, 63)

      // Timer (top center)
      const mm = Math.floor(time / 60), ss = Math.floor(time % 60).toString().padStart(2, '0')
      cx.fillStyle = time < 30 ? 'rgba(180,30,30,0.88)' : 'rgba(0,0,0,0.48)'
      cx.beginPath(); rr(w/2 - 52, 8, 104, 46, 8); cx.fill()
      cx.fillStyle = time < 30 ? '#ff7070' : '#fff'
      cx.font = `bold ${sm ? 25 : 30}px Arial`; cx.textAlign = 'center'
      cx.fillText(`${mm}:${ss}`, w/2, 44)

      // Shotgun shells (bottom left)
      const shX = 18, shY = h - 86, shW = 16, shH = 34
      for (let i = 0; i < 2; i++) {
        const loaded = i < shots && !reloading
        cx.fillStyle = loaded ? '#b89020' : 'rgba(50,50,50,0.82)'
        cx.beginPath(); rr(shX + i*(shW+8), shY, shW, shH, 4); cx.fill()
        if (loaded) { cx.fillStyle = '#dd1a1a'; cx.fillRect(shX + i*(shW+8), shY, shW, 7) }
      }
      if (reloading) {
        cx.fillStyle = '#ffaa00'; cx.font = `bold ${sm ? 13 : 15}px Arial`
        cx.textAlign = 'left'; cx.fillText('RELOAD!', shX, shY - 8)
      }

      // Duck Call button (bottom center)
      const bW = sm ? 110 : 130, bH = 46, bX = w/2 - bW/2, bY = h - 72
      cx.fillStyle = callCD > 0 ? 'rgba(50,50,50,0.88)' : 'rgba(185,60,12,0.94)'
      cx.beginPath(); rr(bX, bY, bW, bH, 13); cx.fill()
      cx.fillStyle = '#fff'; cx.font = `bold ${sm ? 13 : 15}px Arial`; cx.textAlign = 'center'
      cx.fillText(callCD > 0 ? `🦆 ${Math.ceil(callCD)}s` : '🦆 Duck Call', w/2, bY + 29)

      // Flash text (BANG! / +pts)
      if (flash.a > 0) {
        cx.save(); cx.globalAlpha = Math.min(1, flash.a)
        cx.fillStyle = '#fff'; cx.font = `bold ${sm ? 30 : 42}px Arial`; cx.textAlign = 'center'
        cx.shadowColor = '#000'; cx.shadowBlur = 12
        cx.fillText(flash.t, w/2, h * 0.42); cx.restore()
      }
    }

    // ── Menu screen ──────────────────────────────────────────────────
    function drawMenu() {
      const w = W(), h = H()
      const cW = Math.min(320, w - 40), cH = 415
      const cX = w/2 - cW/2, cY = h/2 - cH/2 - 20

      cx.fillStyle = 'rgba(0,0,0,0.74)'
      cx.beginPath(); rr(cX, cY, cW, cH, 18); cx.fill()

      cx.font = '50px serif'; cx.textAlign = 'center'; cx.fillText('🦆', w/2, cY + 65)

      cx.fillStyle = '#f0c040'; cx.font = `bold ${Math.min(30, w*0.068)}px Arial`
      cx.fillText('Duck Hunt', w/2, cY + 108)

      cx.fillStyle = 'rgba(255,255,255,0.55)'; cx.font = `${Math.min(13, w*0.031)}px Arial`
      cx.fillText('Dawn Patrol at Mallard Lake', w/2, cY + 133)

      const rules = [
        '🎯  Tap ducks to shoot them',
        '💥  Double-barrel — 2 shots then reload',
        '🦆  Duck Call lures ducks in close',
        '⏱️  3 minutes to bag as many as you can',
        '🏆  Pintail 200 › Teal 150 › Mallard 100',
      ]
      cx.textAlign = 'left'; cx.fillStyle = 'rgba(255,255,255,0.82)'
      cx.font = `${Math.min(13, w*0.029)}px Arial`
      rules.forEach((r, i) => cx.fillText(r, cX + 22, cY + 173 + i * 30))

      if (best > 0) {
        cx.textAlign = 'center'; cx.fillStyle = '#f0c040'
        cx.font = `bold ${Math.min(13, w*0.030)}px Arial`
        cx.fillText(`🏆 Best: ${best.toLocaleString()}`, w/2, cY + 352)
      }

      // Start Hunt button
      cx.fillStyle = '#cc4510'
      cx.beginPath(); rr(cX + 50, cY + 364, cW - 100, 44, 12); cx.fill()
      cx.fillStyle = '#fff'; cx.textAlign = 'center'
      cx.font = `bold ${Math.min(17, w*0.038)}px Arial`
      cx.fillText('Start Hunt', w/2, cY + 393)
    }

    // ── Game Over screen ─────────────────────────────────────────────
    function drawOver() {
      const w = W(), h = H()
      const cW = Math.min(300, w - 40), cH = 310
      const cX = w/2 - cW/2, cY = h/2 - cH/2

      cx.fillStyle = 'rgba(0,0,0,0.78)'
      cx.beginPath(); rr(cX, cY, cW, cH, 18); cx.fill()

      cx.fillStyle = '#f0c040'; cx.font = `bold ${Math.min(27, w*0.062)}px Arial`
      cx.textAlign = 'center'; cx.fillText('Hunt Over!', w/2, cY + 52)

      cx.fillStyle = '#fff'; cx.font = `bold ${Math.min(58, w*0.12)}px Arial`
      cx.fillText(score.toLocaleString(), w/2, cY + 128)
      cx.fillStyle = 'rgba(255,255,255,0.55)'; cx.font = `${Math.min(13, w*0.030)}px Arial`
      cx.fillText('points', w/2, cY + 152)

      if (score > 0 && score >= best) {
        cx.fillStyle = '#f0c040'; cx.font = `bold ${Math.min(15, w*0.035)}px Arial`
        cx.fillText('🏆 New High Score!', w/2, cY + 188)
      } else if (best > 0) {
        cx.fillStyle = 'rgba(255,255,255,0.55)'; cx.font = `${Math.min(13, w*0.030)}px Arial`
        cx.fillText(`Best: ${best.toLocaleString()}`, w/2, cY + 188)
      }

      // Hunt Again button
      cx.fillStyle = '#cc4510'
      cx.beginPath(); rr(cX + 50, cY + 230, cW - 100, 44, 12); cx.fill()
      cx.fillStyle = '#fff'; cx.font = `bold ${Math.min(17, w*0.038)}px Arial`
      cx.fillText('Hunt Again', w/2, cY + 259)
    }

    // ── Hit detection ────────────────────────────────────────────────
    function hitDuck(px: number, py: number): number {
      for (let i = ducks.length - 1; i >= 0; i--) {
        const dk = ducks[i]
        const hr = dk.def.sc * (W() < 420 ? 0.85 : 1) * 40
        if ((px - dk.x)**2 + (py - dk.y)**2 < hr*hr) return i
      }
      return -1
    }

    // ── Input handler ────────────────────────────────────────────────
    function tap(px: number, py: number) {
      const w = W(), h = H()

      if (gs === 'menu') {
        const cW = Math.min(320, w-40), cX = w/2 - cW/2, cY = h/2 - 415/2 - 20
        if (px >= cX+50 && px <= cX+cW-50 && py >= cY+364 && py <= cY+408) start()
        return
      }
      if (gs === 'over') {
        const cW = Math.min(300, w-40), cX = w/2 - cW/2, cY = h/2 - 310/2
        if (px >= cX+50 && px <= cX+cW-50 && py >= cY+230 && py <= cY+274) start()
        return
      }
      if (gs !== 'play' || reloading) return

      // Duck Call button area
      const bW = w < 420 ? 110 : 130, bH = 46, bX = w/2 - bW/2, bY = h - 72
      if (px >= bX && px <= bX+bW && py >= bY && py <= bY+bH) {
        if (callCD <= 0) {
          callCD = 15
          playQuack(0); playQuack(0.15); playQuack(0.32)
          for (let i = 0; i < 3; i++) setTimeout(() => { if (gs === 'play') spawn(true) }, i * 500)
        }
        return
      }

      if (shots <= 0) return
      shots--
      playShot()

      const hi = hitDuck(px, py)
      if (hi >= 0) {
        const dk = ducks[hi]
        score += dk.def.pts
        if (score > best) { best = score; localStorage.setItem('dh_best2', String(best)) }
        // Feather burst
        for (let f = 0; f < 9; f++) {
          feaths.push({
            x: dk.x, y: dk.y,
            vx: (Math.random()-0.5)*180, vy: -Math.random()*120 - 40,
            rot: Math.random()*Math.PI*2, rspd: (Math.random()-0.5)*12,
            a: 1, col: dk.def.wing,
          })
        }
        drops.push({ x: dk.x, y: dk.y, vy: 60, rot: 0, rspd: (Math.random()-0.5)*10, a: 1, def: dk.def, pts: dk.def.pts })
        flash.t = `+${dk.def.pts}`; flash.a = 2
        ducks.splice(hi, 1)
      } else {
        flash.t = 'BANG!'; flash.a = 1.2
      }

      if (shots <= 0) {
        reloading = true
        setTimeout(() => { reloading = false; shots = 2; playReload() }, 1200)
      }
    }

    // ── Start / reset game ───────────────────────────────────────────
    function start() {
      score = 0; time = 180; shots = 2; reloading = false
      callCD = 0; spawnT = 1.5; uid = 0
      ducks = []; drops = []; feaths = []
      flash = { t: '', a: 0 }
      gs = 'play'
      setTimeout(() => { if (gs === 'play') spawn() }, 600)
      setTimeout(() => { if (gs === 'play') spawn() }, 1400)
    }

    // ── Main game loop ───────────────────────────────────────────────
    function loop(ts: number) {
      const dt = Math.min((ts - prev) / 1000, 0.1)
      prev = ts
      const w = W(), h = H()

      cx.clearRect(0, 0, w, h)
      drawBG()

      if (gs === 'menu') {
        drawMenu()
      } else if (gs === 'over') {
        drawOver()
      } else {
        // ── Update ──
        time -= dt
        if (time <= 0) { time = 0; gs = 'over' }
        if (callCD > 0) callCD -= dt

        // Spawn timer
        spawnT -= dt
        if (spawnT <= 0) {
          const iv = Math.max(1.0, 2.5 - score / 2000)
          spawnT = iv * (0.6 + Math.random() * 0.8)
          spawn()
        }

        // Update ducks
        for (let i = ducks.length - 1; i >= 0; i--) {
          const dk = ducks[i]
          dk.x += dk.vx * dt; dk.y += dk.vy * dt
          dk.vy += 18 * dt; dk.vy = Math.max(-80, Math.min(80, dk.vy))
          dk.flap += dk.fspd * dt
          if (dk.x < -100 || dk.x > w + 100) ducks.splice(i, 1)
        }

        // Update falling drops
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i]
          d.y += d.vy * dt; d.vy += 220 * dt
          d.rot += d.rspd * dt; d.a -= 0.7 * dt
          if (d.a <= 0 || d.y > h + 80) drops.splice(i, 1)
        }

        // Update feathers
        for (let i = feaths.length - 1; i >= 0; i--) {
          const f = feaths[i]
          f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 130 * dt
          f.rot += f.rspd * dt; f.a -= 1.3 * dt
          if (f.a <= 0) feaths.splice(i, 1)
        }

        // Decay flash
        if (flash.a > 0) flash.a -= 2 * dt

        // ── Draw drops (fallen ducks + score popup) ──
        for (const d of drops) {
          cx.save(); cx.globalAlpha = Math.max(0, d.a)
          cx.translate(d.x, d.y); cx.rotate(d.rot)
          cx.fillStyle = d.def.body
          cx.beginPath(); cx.ellipse(0, 0, 16, 9, 0, 0, Math.PI*2); cx.fill()
          cx.restore()
          cx.save(); cx.globalAlpha = Math.max(0, d.a)
          cx.fillStyle = '#fff'; cx.font = 'bold 18px Arial'; cx.textAlign = 'center'
          cx.shadowColor = '#000'; cx.shadowBlur = 6
          cx.fillText(`+${d.pts}`, d.x, d.y - 26); cx.restore()
        }

        // ── Draw feathers ──
        for (const f of feaths) {
          cx.save(); cx.globalAlpha = Math.max(0, f.a)
          cx.fillStyle = f.col; cx.translate(f.x, f.y); cx.rotate(f.rot)
          cx.beginPath(); cx.ellipse(0, 0, 3, 9, 0, 0, Math.PI*2); cx.fill(); cx.restore()
        }

        // ── Draw live ducks ──
        for (const dk of ducks) drawDuck(dk)

        drawHUD()
      }

      raf = requestAnimationFrame(loop)
    }

    // ── Event listeners ──────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => tap(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.changedTouches[0]; tap(t.clientX, t.clientY)
    }
    cv.addEventListener('click', onMouse)
    cv.addEventListener('touchend', onTouch, { passive: false })

    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      cv.removeEventListener('click', onMouse)
      cv.removeEventListener('touchend', onTouch)
      removeEventListener('resize', resize)
      ac?.close().catch(() => {})
    }
  }, [])

  return (
    <main style={{
      margin: 0, padding: 0, overflow: 'hidden',
      background: '#0a0a1a', width: '100vw', height: '100dvh',
      position: 'fixed', top: 0, left: 0,
    }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor: 'crosshair',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        } as React.CSSProperties}
      />
    </main>
  )
}
