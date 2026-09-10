'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Pencil, Minus, Circle, Type, Trash2, Undo2, ArrowUpRight } from 'lucide-react'

export type DrawTool = 'freehand' | 'arrow' | 'line' | 'circle' | 'text'

export interface DrawShape {
  id: string
  tool: DrawTool
  color: string
  strokeWidth: number
  points?: number[]      // freehand: [x1,y1,x2,y2,...]
  x1?: number            // arrow/line/circle start
  y1?: number
  x2?: number            // arrow/line/circle end
  y2?: number
  text?: string          // text tool
}

export interface DrawingData {
  shapes: DrawShape[]
  width: number   // canvas natural width at save time (for scaling)
  height: number
}

interface DrawingOverlayProps {
  active: boolean                          // show/hide the overlay
  onDataChange: (data: DrawingData) => void
  initialData?: DrawingData | null
}

const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#FFFFFF']
const STROKE_WIDTHS = [2, 4, 7]

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export function DrawingOverlay({ active, onDataChange, initialData }: DrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<DrawTool>('freehand')
  const [color, setColor] = useState('#FF3B30')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [shapes, setShapes] = useState<DrawShape[]>(initialData?.shapes ?? [])
  const [drawing, setDrawing] = useState(false)
  const [current, setCurrent] = useState<Partial<DrawShape> | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null)

  // Redraw all shapes onto canvas
  const redraw = useCallback((shapesToDraw: DrawShape[], inProgress?: Partial<DrawShape>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const all = inProgress ? [...shapesToDraw, inProgress as DrawShape] : shapesToDraw
    for (const s of all) {
      ctx.save()
      ctx.strokeStyle = s.color || '#FF3B30'
      ctx.fillStyle = s.color || '#FF3B30'
      ctx.lineWidth = s.strokeWidth || 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (s.tool === 'freehand' && s.points && s.points.length >= 4) {
        ctx.beginPath()
        ctx.moveTo(s.points[0], s.points[1])
        for (let i = 2; i < s.points.length; i += 2) {
          ctx.lineTo(s.points[i], s.points[i + 1])
        }
        ctx.stroke()
      } else if (s.tool === 'line' && s.x1 != null && s.y1 != null && s.x2 != null && s.y2 != null) {
        ctx.beginPath()
        ctx.moveTo(s.x1, s.y1)
        ctx.lineTo(s.x2, s.y2)
        ctx.stroke()
      } else if (s.tool === 'arrow' && s.x1 != null && s.y1 != null && s.x2 != null && s.y2 != null) {
        const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1)
        const headLen = Math.min(20, (s.strokeWidth || 3) * 4)
        ctx.beginPath()
        ctx.moveTo(s.x1, s.y1)
        ctx.lineTo(s.x2, s.y2)
        ctx.stroke()
        // Arrowhead
        ctx.beginPath()
        ctx.moveTo(s.x2, s.y2)
        ctx.lineTo(s.x2 - headLen * Math.cos(angle - Math.PI / 6), s.y2 - headLen * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(s.x2 - headLen * Math.cos(angle + Math.PI / 6), s.y2 - headLen * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
      } else if (s.tool === 'circle' && s.x1 != null && s.y1 != null && s.x2 != null && s.y2 != null) {
        const rx = Math.abs(s.x2 - s.x1) / 2
        const ry = Math.abs(s.y2 - s.y1) / 2
        const cx = (s.x1 + s.x2) / 2
        const cy = (s.y1 + s.y2) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      } else if (s.tool === 'text' && s.text && s.x1 != null && s.y1 != null) {
        ctx.font = `bold ${14 + (s.strokeWidth || 3) * 2}px sans-serif`
        ctx.fillText(s.text, s.x1, s.y1)
      }
      ctx.restore()
    }
  }, [])

  // Redraw whenever shapes change
  useEffect(() => {
    redraw(shapes)
  }, [shapes, redraw])

  // Notify parent when shapes change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onDataChange({ shapes, width: canvas.width, height: canvas.height })
  }, [shapes, onDataChange])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = 'touches' in e ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }

  const onPointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const { x, y } = getPos(e)

    if (tool === 'text') {
      setTextInput({ x, y, value: '' })
      return
    }

    setDrawing(true)
    const shape: Partial<DrawShape> = {
      id: uid(), tool, color, strokeWidth,
      x1: x, y1: y, x2: x, y2: y,
      points: tool === 'freehand' ? [x, y] : undefined,
    }
    setCurrent(shape)
  }

  const onPointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing || !current) return
    e.preventDefault()
    const { x, y } = getPos(e)

    const updated: Partial<DrawShape> = {
      ...current,
      x2: x, y2: y,
      points: current.tool === 'freehand'
        ? [...(current.points ?? []), x, y]
        : current.points,
    }
    setCurrent(updated)
    redraw(shapes, updated)
  }

  const onPointerUp = () => {
    if (!drawing || !current) return
    setDrawing(false)
    const complete = current as DrawShape
    setShapes(prev => [...prev, complete])
    setCurrent(null)
  }

  const undo = () => setShapes(prev => prev.slice(0, -1))
  const clear = () => setShapes([])

  const commitText = () => {
    if (!textInput || !textInput.value.trim()) { setTextInput(null); return }
    const shape: DrawShape = {
      id: uid(), tool: 'text', color, strokeWidth,
      x1: textInput.x, y1: textInput.y, text: textInput.value,
    }
    setShapes(prev => [...prev, shape])
    setTextInput(null)
  }

  if (!active) return null

  return (
    <div className="absolute inset-0 z-20 flex flex-col">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />

      {/* Text input overlay */}
      {textInput && (
        <input
          autoFocus
          type="text"
          value={textInput.value}
          onChange={e => setTextInput(t => t ? { ...t, value: e.target.value } : null)}
          onBlur={commitText}
          onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setTextInput(null) }}
          className="absolute bg-transparent border-b border-white text-white font-bold outline-none z-30"
          style={{
            left: `${(textInput.x / 1280) * 100}%`,
            top: `${(textInput.y / 720) * 100}%`,
            fontSize: `${14 + strokeWidth * 2}px`,
            color,
            minWidth: '80px',
          }}
          placeholder="Type here..."
        />
      )}

      {/* Toolbar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2 shadow-xl">
        {/* Tools */}
        {([
          ['freehand', Pencil, 'Freehand'],
          ['arrow', ArrowUpRight, 'Arrow'],
          ['line', Minus, 'Line'],
          ['circle', Circle, 'Circle'],
          ['text', Type, 'Text'],
        ] as const).map(([t, Icon, label]) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            title={label}
            className={`p-2 rounded-xl transition-all ${tool === t ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Colors */}
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full transition-all border-2 ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
            style={{ background: c }}
          />
        ))}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Stroke width */}
        {STROKE_WIDTHS.map(w => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${strokeWidth === w ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            <div className="rounded-full bg-white" style={{ width: w * 2, height: w * 2 }} />
          </button>
        ))}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Undo / Clear */}
        <button onClick={undo} title="Undo" className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={clear} title="Clear all" className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
