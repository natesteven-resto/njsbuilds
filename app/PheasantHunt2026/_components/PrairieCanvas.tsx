'use client'

import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   PRAIRIE CANVAS — Kansas at legal light.
   Procedural sky, sun, stars, clouds, layered hills with parallax, swaying
   grass, drifting seed, a crew of silhouettes walking the far ridge, and a
   rooster that flushes every so often (or whenever you tap).
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PrairieHandle {
  flush: (xFrac?: number) => void
}

type Blade = { x: number; h: number; w: number; phase: number; flex: number; color: string; head: boolean; layer: number }
type Mote = { x: number; y: number; vx: number; vy: number; r: number; a: number; ph: number }
type Star = { x: number; y: number; r: number; ph: number }
type Cloud = { x: number; y: number; w: number; h: number; a: number; v: number }
type Bird = {
  sx: number; sy: number; born: number; dir: number; s0: number; flapSeed: number; dead: boolean
}
type Puff = { x: number; y: number; born: number }

type Layer = {
  base: number
  amps: number[]
  freqs: number[]
  phases: number[]
  color: string
  par: number
  scroll: number
}

const LAYERS: Layer[] = [
  { base: 0.665, amps: [0.030, 0.012, 0.005], freqs: [0.0030, 0.0085, 0.021], phases: [0.4, 2.1, 5.2], color: '#6b3f26', par: 0.08, scroll: 0.10 },
  { base: 0.715, amps: [0.036, 0.016, 0.006], freqs: [0.0036, 0.0097, 0.024], phases: [2.9, 0.7, 1.9], color: '#45281a', par: 0.16, scroll: 0.18 },
  { base: 0.775, amps: [0.040, 0.018, 0.007], freqs: [0.0041, 0.0110, 0.027], phases: [1.3, 4.0, 3.3], color: '#2b1911', par: 0.28, scroll: 0.28 },
  { base: 0.865, amps: [0.030, 0.014, 0.006], freqs: [0.0047, 0.0120, 0.031], phases: [4.4, 1.1, 0.2], color: '#160e09', par: 0.42, scroll: 0.42 },
]

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PrairieCanvas = forwardRef<PrairieHandle, { className?: string; onFlush?: () => void }>(
  function PrairieCanvas({ className, onFlush }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const flushRef = useRef<(xFrac?: number) => void>(() => {})
    const onFlushRef = useRef(onFlush)
    useEffect(() => {
      onFlushRef.current = onFlush
    }, [onFlush])

    useImperativeHandle(ref, () => ({ flush: (x?: number) => flushRef.current(x) }), [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) return

      const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const rand = mulberry(20261114)

      let W = 1, H = 1, dpr = 1
      let raf = 0
      let running = true
      let visible = true
      let lastT = performance.now()
      let t = 0
      let scrollY = 0
      const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }

      let blades: Blade[] = []
      let motes: Mote[] = []
      let stars: Star[] = []
      let clouds: Cloud[] = []
      const birds: Bird[] = []
      const puffs: Puff[] = []
      let nextFlush = 2.5 + rand() * 3
      const flock = { x: -0.2, y: 0.18, v: 0.011 }

      /* ── helpers ─────────────────────────────────────────────────────── */
      const hillY = (L: Layer, x: number, px: number) => {
        const xx = x + px
        let y = H * L.base
        for (let i = 0; i < L.amps.length; i++) {
          y += H * L.amps[i] * Math.sin(xx * L.freqs[i] + L.phases[i])
        }
        return y
      }
      const layerOffset = (L: Layer) => (mouse.x - 0.5) * -90 * L.par // x parallax (mouse)
      const layerLift = (L: Layer) => (mouse.y - 0.5) * -14 * L.par + scrollY * L.scroll * 0.35 // y parallax (mouse + scroll)

      const build = () => {
        blades = []
        const r2 = mulberry(7)
        const countFg = isMobile ? 120 : 300
        const countMid = isMobile ? 70 : 160
        for (let i = 0; i < countFg; i++) {
          const x = r2() * (W + 60) - 30
          blades.push({
            x, h: H * (0.09 + r2() * 0.16), w: 1.2 + r2() * 2.4, phase: r2() * 6.28, flex: 0.6 + r2() * 0.8,
            color: r2() < 0.78 ? '#0f0a06' : '#21150c', head: r2() < 0.14, layer: 3,
          })
        }
        for (let i = 0; i < countMid; i++) {
          const x = r2() * (W + 40) - 20
          blades.push({
            x, h: H * (0.04 + r2() * 0.08), w: 1 + r2() * 1.6, phase: r2() * 6.28, flex: 0.5 + r2() * 0.7,
            color: r2() < 0.7 ? '#2b1911' : '#3a2416', head: r2() < 0.1, layer: 2,
          })
        }
        blades.sort((a, b) => a.layer - b.layer)

        motes = []
        const mc = reduced ? 0 : isMobile ? 26 : 60
        for (let i = 0; i < mc; i++) {
          motes.push({ x: rand() * W, y: H * (0.3 + rand() * 0.65), vx: 8 + rand() * 18, vy: -(4 + rand() * 10), r: 0.8 + rand() * 1.8, a: 0.25 + rand() * 0.55, ph: rand() * 6.28 })
        }
        stars = []
        for (let i = 0; i < (isMobile ? 45 : 90); i++) {
          stars.push({ x: rand() * W, y: rand() * H * 0.42, r: 0.4 + rand() * 1.1, ph: rand() * 6.28 })
        }
        clouds = []
        for (let i = 0; i < 6; i++) {
          clouds.push({ x: rand() * W, y: H * (0.22 + rand() * 0.3), w: W * (0.18 + rand() * 0.3), h: H * (0.012 + rand() * 0.02), a: 0.08 + rand() * 0.1, v: 3 + rand() * 5 })
        }
      }

      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        W = Math.max(1, Math.round(rect.width))
        H = Math.max(1, Math.round(rect.height))
        dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)
        canvas.width = Math.round(W * dpr)
        canvas.height = Math.round(H * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        build()
      }

      /* ── silhouettes ─────────────────────────────────────────────────── */
      const drawHuman = (x: number, g: number, s: number, ph: number, gun: boolean) => {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const hipY = g - s * 0.5
        // legs
        ctx.lineWidth = s * 0.085
        for (const d of [1, -1]) {
          const a = Math.sin(ph) * 0.33 * d
          ctx.beginPath()
          ctx.moveTo(x, hipY)
          ctx.lineTo(x + Math.sin(a) * s * 0.42, g - (1 - Math.cos(a)) * s * 0.12)
          ctx.stroke()
        }
        // torso
        ctx.beginPath()
        ctx.moveTo(x - s * 0.11, g - s * 0.82)
        ctx.lineTo(x + s * 0.12, g - s * 0.82)
        ctx.lineTo(x + s * 0.11, hipY + s * 0.02)
        ctx.lineTo(x - s * 0.1, hipY + s * 0.02)
        ctx.closePath()
        ctx.fill()
        // head + cap
        ctx.beginPath()
        ctx.arc(x + s * 0.01, g - s * 0.905, s * 0.085, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(x - s * 0.06, g - s * 0.955, s * 0.21, s * 0.035)
        // arm + gun over shoulder
        ctx.lineWidth = s * 0.07
        ctx.beginPath()
        ctx.moveTo(x + s * 0.05, g - s * 0.78)
        ctx.lineTo(x + s * 0.13, g - s * 0.6)
        ctx.stroke()
        if (gun) {
          ctx.lineWidth = s * 0.045
          ctx.beginPath()
          ctx.moveTo(x + s * 0.02, g - s * 0.74)
          ctx.lineTo(x - s * 0.3, g - s * 1.08)
          ctx.stroke()
        }
      }

      const drawDog = (x: number, g: number, s: number, ph: number, pup: boolean) => {
        ctx.lineCap = 'round'
        const bob = Math.abs(Math.sin(ph)) * s * (pup ? 0.12 : 0.05)
        const by = g - s * 0.62 - bob
        // legs
        ctx.lineWidth = s * 0.09
        const legs: [number, number][] = [[-0.36, 1], [-0.28, -1], [0.3, -1], [0.38, 1]]
        for (const [ox, d] of legs) {
          const a = Math.sin(ph + (ox > 0 ? 0 : Math.PI)) * 0.4 * d
          ctx.beginPath()
          ctx.moveTo(x + ox * s, by + s * 0.1)
          ctx.lineTo(x + ox * s + Math.sin(a) * s * 0.3, g)
          ctx.stroke()
        }
        // body
        ctx.beginPath()
        ctx.ellipse(x, by, s * 0.55, s * 0.24, 0, 0, Math.PI * 2)
        ctx.fill()
        // neck + head
        ctx.lineWidth = s * 0.22
        ctx.beginPath()
        ctx.moveTo(x + s * 0.42, by - s * 0.05)
        ctx.lineTo(x + s * 0.62, by - s * 0.28)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x + s * 0.66, by - s * 0.32, s * 0.17, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(x + s * 0.84, by - s * 0.27, s * 0.15, s * 0.09, 0.15, 0, Math.PI * 2)
        ctx.fill()
        // ear
        ctx.beginPath()
        ctx.moveTo(x + s * 0.56, by - s * 0.4)
        ctx.lineTo(x + s * 0.5, by - s * 0.1)
        ctx.lineTo(x + s * 0.66, by - s * 0.2)
        ctx.closePath()
        ctx.fill()
        // tail
        ctx.lineWidth = s * 0.07
        ctx.beginPath()
        ctx.moveTo(x - s * 0.52, by - s * 0.05)
        ctx.quadraticCurveTo(x - s * 0.72, by - s * 0.2 - Math.sin(ph * 2) * s * 0.08, x - s * 0.78, by - s * 0.5)
        ctx.stroke()
      }

      const drawPheasant = (x: number, y: number, s: number, flap: number, dir: number, alpha: number) => {
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(x, y)
        ctx.scale(dir, 1)
        ctx.rotate(-0.18)
        ctx.fillStyle = '#14100c'
        ctx.strokeStyle = '#14100c'
        ctx.lineCap = 'round'
        // tail
        ctx.lineWidth = s * 0.07
        for (const sp of [-0.09, 0, 0.09]) {
          ctx.beginPath()
          ctx.moveTo(-s * 0.4, 0)
          ctx.quadraticCurveTo(-s * 0.95, s * 0.1 + sp * s, -s * 1.55, s * 0.22 + sp * s * 2.2)
          ctx.stroke()
        }
        // body
        ctx.beginPath()
        ctx.ellipse(0, 0, s * 0.5, s * 0.21, 0, 0, Math.PI * 2)
        ctx.fill()
        // neck + head
        ctx.lineWidth = s * 0.16
        ctx.beginPath()
        ctx.moveTo(s * 0.4, -s * 0.05)
        ctx.lineTo(s * 0.62, -s * 0.24)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(s * 0.68, -s * 0.28, s * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(s * 0.78, -s * 0.3)
        ctx.lineTo(s * 0.92, -s * 0.25)
        ctx.lineTo(s * 0.78, -s * 0.2)
        ctx.closePath()
        ctx.fill()
        // wings (both, offset slightly)
        const f = Math.sin(flap)
        for (const side of [1, -1]) {
          const lift = -s * (0.25 + 0.62 * f) * side
          ctx.beginPath()
          ctx.moveTo(s * 0.12, -s * 0.05)
          ctx.quadraticCurveTo(-s * 0.1, lift * 0.55, -s * 0.28, lift)
          ctx.quadraticCurveTo(-s * 0.3, lift * 0.45, -s * 0.34, -s * 0.02)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }

      /* ── crew on the ridge ───────────────────────────────────────────── */
      // offsets in units of u (= H*0.075); ground = far layer ridge
      const crew = [
        { kind: 'dog', off: 2.6, size: 0.46, pup: false, range: 0.9 },   // Sage ranging ahead
        { kind: 'human', off: 1.3, size: 1.0 },                         // Nate
        { kind: 'dog', off: 0.5, size: 0.44, pup: false, range: 0.4 },   // Duke
        { kind: 'human', off: -0.5, size: 0.88 },                       // Noah
        { kind: 'human', off: -1.6, size: 0.8 },                        // Nathan
        { kind: 'dog', off: -2.5, size: 0.3, pup: true, range: 0.5 },    // Ace bringing up the rear
      ] as const
      let crewX = 0.12 // in W fractions, lead position — on screen at load, walking right

      const flushBird = (xFrac?: number) => {
        if (reduced || birds.length > 3) return
        const dir = rand() < 0.5 ? -1 : 1
        const sx = (typeof xFrac === 'number' ? xFrac : 0.25 + rand() * 0.5) * W
        const sy = H * (0.8 + rand() * 0.1)
        const n = rand() < 0.3 ? 2 : 1
        for (let i = 0; i < n; i++) {
          birds.push({ sx: sx + i * 30 * dir, sy: sy + i * 12, born: t + i * 0.18, dir, s0: H * (0.07 + rand() * 0.02), flapSeed: rand() * 6, dead: false })
        }
        puffs.push({ x: sx, y: sy, born: t })
        onFlushRef.current?.()
      }
      flushRef.current = flushBird

      /* ── frame ───────────────────────────────────────────────────────── */
      const frame = (now: number) => {
        if (!running) return
        const dt = Math.min(0.05, (now - lastT) / 1000)
        lastT = now
        if (!visible || document.hidden) {
          raf = requestAnimationFrame(frame)
          return
        }
        t += reduced ? 0 : dt

        // ease mouse
        mouse.x += (mouse.tx - mouse.x) * 0.04
        mouse.y += (mouse.ty - mouse.y) * 0.04

        /* sky */
        const breathe = 0.5 + 0.5 * Math.sin(t * 0.25)
        const sky = ctx.createLinearGradient(0, 0, 0, H)
        sky.addColorStop(0, '#090a1c')
        sky.addColorStop(0.28, '#2a1730')
        sky.addColorStop(0.5, '#7a2f21')
        sky.addColorStop(0.62, '#c8561d')
        sky.addColorStop(0.7, `rgb(${235 + breathe * 10}, ${160 + breathe * 14}, 50)`)
        sky.addColorStop(0.8, '#3a2214')
        sky.addColorStop(1, '#0e0b08')
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, W, H)

        /* stars */
        for (const s of stars) {
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.ph))
          const fade = 1 - s.y / (H * 0.45)
          ctx.globalAlpha = tw * fade * 0.9
          ctx.fillStyle = '#ffe9c4'
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1

        /* sun */
        const sunX = W * (isMobile ? 0.72 : 0.79) + (mouse.x - 0.5) * -18
        const sunY = H * 0.615 + (mouse.y - 0.5) * -6 + scrollY * 0.05
        const sunR = H * 0.075
        const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.6, sunX, sunY, sunR * 7)
        glow.addColorStop(0, `rgba(255, 214, 120, ${0.55 + breathe * 0.1})`)
        glow.addColorStop(0.25, 'rgba(255, 170, 60, 0.28)')
        glow.addColorStop(0.6, 'rgba(255, 120, 40, 0.08)')
        glow.addColorStop(1, 'rgba(255, 120, 40, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, W, H)
        // rays
        if (!reduced) {
          ctx.save()
          ctx.translate(sunX, sunY)
          ctx.rotate(t * 0.03)
          for (let i = 0; i < 10; i++) {
            ctx.rotate((Math.PI * 2) / 10)
            const g = ctx.createLinearGradient(0, 0, sunR * 9, 0)
            g.addColorStop(0, 'rgba(255, 220, 140, 0.075)')
            g.addColorStop(1, 'rgba(255, 220, 140, 0)')
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.lineTo(sunR * 9, -sunR * 0.9)
            ctx.lineTo(sunR * 9, sunR * 0.9)
            ctx.closePath()
            ctx.fill()
          }
          ctx.restore()
        }
        const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR)
        disc.addColorStop(0, '#fff6d8')
        disc.addColorStop(0.7, '#ffd77a')
        disc.addColorStop(1, 'rgba(255, 190, 90, 0.85)')
        ctx.fillStyle = disc
        ctx.beginPath()
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2)
        ctx.fill()

        /* clouds */
        for (const c of clouds) {
          c.x += c.v * dt
          if (c.x - c.w > W) c.x = -c.w
          const cg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w)
          cg.addColorStop(0, `rgba(255, 200, 150, ${c.a})`)
          cg.addColorStop(1, 'rgba(255, 200, 150, 0)')
          ctx.fillStyle = cg
          ctx.save()
          ctx.scale(1, c.h / c.w)
          ctx.beginPath()
          ctx.arc(c.x, c.y * (c.w / c.h), c.w, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        /* distant flock */
        if (!reduced) {
          flock.x += flock.v * dt
          if (flock.x > 1.25) { flock.x = -0.25; flock.y = 0.12 + rand() * 0.14 }
          ctx.strokeStyle = 'rgba(20, 12, 8, 0.75)'
          ctx.lineWidth = 1.2
          for (let i = 0; i < 7; i++) {
            const row = Math.floor((i + 1) / 2)
            const side = i % 2 === 0 ? 1 : -1
            const bx = W * flock.x - row * 13
            const by = H * flock.y + row * 7 * side + Math.sin(t * 2 + i) * 1.5
            const w = Math.sin(t * 9 + i * 0.6) * 2.4
            ctx.beginPath()
            ctx.moveTo(bx - 4, by + w)
            ctx.lineTo(bx, by)
            ctx.lineTo(bx + 4, by + w)
            ctx.stroke()
          }
        }

        /* hills + crew + grass */
        for (let li = 0; li < LAYERS.length; li++) {
          const L = LAYERS[li]
          const px = layerOffset(L)
          const lift = layerLift(L)
          ctx.fillStyle = L.color
          ctx.beginPath()
          ctx.moveTo(-10, H + 10)
          for (let x = -10; x <= W + 10; x += 6) ctx.lineTo(x, hillY(L, x, px) + lift)
          ctx.lineTo(W + 10, H + 10)
          ctx.closePath()
          ctx.fill()
          // haze on far layers
          if (li === 0) {
            ctx.fillStyle = 'rgba(255, 150, 70, 0.14)'
            ctx.fill()
          }

          // crew walks the far ridge
          if (li === 0) {
            if (!reduced) crewX += dt * 0.0085
            if (crewX > 1.45) crewX = -0.45
            const u = H * 0.075
            ctx.fillStyle = '#1f120b'
            ctx.strokeStyle = '#1f120b'
            for (const m of crew) {
              const range = m.kind === 'dog' ? Math.sin(t * 0.9 + m.off) * m.range * u : 0
              const cx = crewX * W + m.off * u * 1.15 + range
              const g = hillY(L, cx, px) + lift + 1
              const ph = t * (m.kind === 'dog' ? (m.pup ? 11 : 8.5) : 5.5) + m.off
              if (m.kind === 'human') drawHuman(cx, g, u * m.size, ph, true)
              else drawDog(cx, g, u * m.size, ph, m.pup)
            }
          }

          // grass for this layer
          if (li === 2 || li === 3) {
            const gust = Math.sin(t * 0.45) * 0.55 + Math.sin(t * 0.95 + 1.3) * 0.3 + 0.35
            for (const b of blades) {
              if (b.layer !== li) continue
              const bx = b.x + px
              const by = hillY(L, b.x, px) + lift + 2
              const sway = (gust + Math.sin(t * 1.7 + b.phase + b.x * 0.012) * 0.45) * b.h * 0.28 * b.flex
              ctx.fillStyle = b.color
              ctx.beginPath()
              ctx.moveTo(bx - b.w, by)
              ctx.quadraticCurveTo(bx + sway * 0.25, by - b.h * 0.55, bx + sway, by - b.h)
              ctx.quadraticCurveTo(bx + sway * 0.25 + b.w * 0.4, by - b.h * 0.55, bx + b.w, by)
              ctx.closePath()
              ctx.fill()
              if (b.head) {
                ctx.beginPath()
                ctx.ellipse(bx + sway, by - b.h, b.w * 1.05, b.w * 2.4, sway * 0.004, 0, Math.PI * 2)
                ctx.fill()
              }
            }
          }
        }

        /* flushing birds */
        if (!reduced) {
          nextFlush -= dt
          if (nextFlush <= 0) {
            flushBird()
            nextFlush = 9 + rand() * 9
          }
        }
        for (const p of puffs) {
          const age = t - p.born
          if (age > 0.7) continue
          const k = age / 0.7
          ctx.fillStyle = `rgba(120, 90, 50, ${(1 - k) * 0.45})`
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(p.x + Math.cos(a) * k * 46, p.y + Math.sin(a) * k * 28 - k * 18, 3 + k * 7, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        for (const b of birds) {
          const u = t - b.born
          if (u < 0) continue
          const rise = 1 - Math.exp(-2.4 * u)
          const x = b.sx + b.dir * (W * 0.2 * u + W * 0.02 * u * u)
          const y = b.sy - H * 0.32 * rise + Math.sin(u * 3.2) * H * 0.012 + u * u * 4
          const s = b.s0 * (1 - 0.62 * Math.min(1, u / 3.6))
          const flapAmp = u < 1.6 ? 1 : Math.max(0.15, 1 - (u - 1.6) * 0.7)
          const flap = b.flapSeed + u * (u < 1.6 ? 42 : 24) * flapAmp
          const alpha = u > 3.2 ? Math.max(0, 1 - (u - 3.2) / 0.8) : 1
          if (alpha <= 0 || x < -200 || x > W + 200) { b.dead = true; continue }
          drawPheasant(x, y, s, flap, b.dir, alpha)
        }
        for (let i = birds.length - 1; i >= 0; i--) if (birds[i].dead) birds.splice(i, 1)
        for (let i = puffs.length - 1; i >= 0; i--) if (t - puffs[i].born > 0.8) puffs.splice(i, 1)

        /* motes */
        for (const m of motes) {
          m.x += (m.vx + Math.sin(t + m.ph) * 6) * dt
          m.y += (m.vy + Math.cos(t * 0.8 + m.ph) * 5) * dt
          if (m.x > W + 10) m.x = -10
          if (m.y < H * 0.2) m.y = H * 0.95
          const a = m.a * (0.6 + 0.4 * Math.sin(t * 2 + m.ph))
          ctx.fillStyle = `rgba(255, 220, 140, ${a})`
          ctx.beginPath()
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
          ctx.fill()
        }

        /* vignette + bottom blend into page */
        const vig = ctx.createRadialGradient(W * 0.5, H * 0.45, H * 0.2, W * 0.5, H * 0.45, Math.max(W, H) * 0.85)
        vig.addColorStop(0, 'rgba(0,0,0,0)')
        vig.addColorStop(1, 'rgba(0,0,0,0.55)')
        ctx.fillStyle = vig
        ctx.fillRect(0, 0, W, H)
        const bottom = ctx.createLinearGradient(0, H * 0.78, 0, H)
        bottom.addColorStop(0, 'rgba(14, 11, 8, 0)')
        bottom.addColorStop(1, 'rgba(14, 11, 8, 1)')
        ctx.fillStyle = bottom
        ctx.fillRect(0, H * 0.78, W, H * 0.22)

        raf = requestAnimationFrame(frame)
      }

      /* ── wiring ──────────────────────────────────────────────────────── */
      resize()
      const ro = new ResizeObserver(() => resize())
      ro.observe(canvas)
      const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true }, { threshold: 0.02 })
      io.observe(canvas)

      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return
        mouse.tx = e.clientX / window.innerWidth
        mouse.ty = e.clientY / window.innerHeight
      }
      const onScroll = () => { scrollY = Math.max(0, window.scrollY) }
      const onDown = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        flushBird((e.clientX - rect.left) / Math.max(1, rect.width))
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('scroll', onScroll, { passive: true })
      canvas.addEventListener('pointerdown', onDown)
      onScroll()
      raf = requestAnimationFrame(frame)

      return () => {
        running = false
        cancelAnimationFrame(raf)
        ro.disconnect()
        io.disconnect()
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('scroll', onScroll)
        canvas.removeEventListener('pointerdown', onDown)
      }
    }, [])

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />
  },
)

export default PrairieCanvas
