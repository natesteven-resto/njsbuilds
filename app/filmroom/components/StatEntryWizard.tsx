'use client'
import React, { useState, useEffect } from 'react'

const MADE = [
  { key: '2M', label: '2PT Made' },
  { key: '3M', label: '3PT Made' },
  { key: 'FTM', label: 'FT Made' },
]
const MISS = [
  { key: '2X', label: '2PT Miss' },
  { key: '3X', label: '3PT Miss' },
  { key: 'FTX', label: 'FT Miss' },
]
const OTHER = [
  { key: 'AST', label: 'Assist' },
  { key: 'OREB', label: 'Off Reb' },
  { key: 'DREB', label: 'Def Reb' },
  { key: 'STL', label: 'Steal' },
  { key: 'BLK', label: 'Block' },
  { key: 'TO', label: 'Turnover' },
  { key: 'FOUL', label: 'Foul' },
  { key: 'DEF', label: 'Deflection' },
]
const SHOT_TYPES = new Set(['2M','3M','FTM','2X','3X','FTX'])
const ALL_STATS = [...MADE, ...MISS, ...OTHER]
const statLabel = (k: string) => ALL_STATS.find(s => s.key === k)?.label ?? k
const msToTimecode = (ms: number) => {
  const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}
const OPP_ID = '__opp__'

const ZONES = [
  { id: 'left_corner_3', label: 'LC3', x: 2, y: 62, w: 15, h: 18 },
  { id: 'right_corner_3', label: 'RC3', x: 83, y: 62, w: 15, h: 18 },
  { id: 'left_wing_3', label: 'LW3', x: 2, y: 25, w: 20, h: 37 },
  { id: 'right_wing_3', label: 'RW3', x: 78, y: 25, w: 20, h: 37 },
  { id: 'top_key', label: 'Top Key', x: 32, y: 5, w: 36, h: 22 },
  { id: 'left_mid', label: 'L Mid', x: 16, y: 35, w: 20, h: 28 },
  { id: 'right_mid', label: 'R Mid', x: 64, y: 35, w: 20, h: 28 },
  { id: 'paint', label: 'Paint', x: 30, y: 45, w: 40, h: 25 },
  { id: 'free_throw', label: 'FT', x: 36, y: 68, w: 28, h: 14 },
]

interface WizardPlayer { id: string; name: string; number: string | null; position: string | null; team_id: string; parent_email: string | null; created_at: string }
interface WizardStatEntry { id: string; player_id: string | null; player_name: string; player_number: string; stat_type: string; video_time_ms: number; shot_location?: string | null; game_id?: string; team_id?: string; created_at?: string }

export function StatEntryWizard({
  gameId, players, currentMs, sessionEntries, userId,
  onLog, onUndo, onRedo, canUndo, canRedo,
  undoPending, redoPending, undoError, redoError, onClose,
}: {
  gameId: string; players: WizardPlayer[]; currentMs: number; sessionEntries: WizardStatEntry[]; userId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onLog: (entry: any) => void; onUndo: () => void; onRedo: () => void
  canUndo: boolean; canRedo: boolean; undoPending: boolean; redoPending: boolean
  undoError: string | null; redoError: string | null; onClose: () => void
}) {
  const [step, setStep] = useState<'stat'|'player'|'location'>('stat')
  const [selectedStat, setSelectedStat] = useState<string|null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<WizardPlayer|null>(null)
  const [logging, setLogging] = useState(false)
  const [toast, setToast] = useState<string|null>(null)
  const [visible, setVisible] = useState(false)
  const [hoveredZone, setHoveredZone] = useState<string|null>(null)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 20); return () => clearTimeout(t) }, [])

  const dismiss = () => { setVisible(false); setTimeout(onClose, 220) }

  const saveEntry = async (stat: string, player: WizardPlayer|null, location?: string) => {
    setLogging(true)
    const pid = player?.id ?? null
    const pname = !player ? 'Opponent' : player.name
    const pnum = !player ? '' : (player.number ?? '')
    try {
      const res = await fetch('/api/filmroom/stat-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: pid, stat_type: stat, video_time_ms: currentMs, shot_location: location ?? null }),
      })
      if (!res.ok) { setLogging(false); return }
      const raw = await res.json()
      const entry: WizardStatEntry = { id: raw.id ?? crypto.randomUUID(), player_id: pid, player_name: pname, player_number: pnum, stat_type: stat, video_time_ms: currentMs, shot_location: location }
      onLog(entry)
      setToast(`✓ ${statLabel(stat)}${player ? ` — ${pname.split(' ')[0]}${pnum ? ` #${pnum}` : ''}` : ' — OPP'}`)
      setVisible(false)
      setTimeout(() => { setToast(null); onClose() }, 1500)
    } catch { setLogging(false) }
  }

  const handleStat = (s: string) => { setSelectedStat(s); setStep('player') }
  const handlePlayer = async (p: WizardPlayer|null) => {
    setSelectedPlayer(p)
    if (!selectedStat) return
    if (SHOT_TYPES.has(selectedStat)) setStep('location')
    else await saveEntry(selectedStat, p)
  }
  const handleZone = async (zoneId: string) => {
    if (!selectedStat || logging) return
    await saveEntry(selectedStat, selectedPlayer, zoneId)
  }

  const backdrop: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.78)',
    backdropFilter: visible ? 'blur(18px)' : 'none',
    WebkitBackdropFilter: visible ? 'blur(18px)' : 'none',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    opacity: visible ? 1 : 0, transition: 'opacity 0.2s, backdrop-filter 0.2s',
  }
  const sheet: React.CSSProperties = {
    background: '#0d1117', borderRadius: '22px 22px 0 0',
    border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
    maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    transform: visible ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.24s cubic-bezier(0.32,0.72,0,1)',
    boxShadow: '0 -24px 80px rgba(0,0,0,0.7)',
  }
  const allPlayers = [{ id: OPP_ID, name: 'Opponent', number: null, position: null, team_id: '', parent_email: null, created_at: '' }, ...players]

  return (
    <div style={backdrop} onClick={e => { if (e.target === e.currentTarget) dismiss() }}>
      {toast && (
        <div style={{ position: 'fixed', top: 36, left: '50%', transform: 'translateX(-50%)',
          background: '#10b981', color: '#fff', borderRadius: 14, padding: '13px 26px',
          fontSize: 15, fontWeight: 800, zIndex: 9100, whiteSpace: 'nowrap',
          boxShadow: '0 6px 28px rgba(16,185,129,0.5)', letterSpacing: '0.01em' }}>
          {toast}
        </div>
      )}
      <div style={sheet}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
        </div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: 10 }}>
          {step !== 'stat' && (
            <button onClick={() => setStep(step === 'location' ? 'player' : 'stat')}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 20, lineHeight: 1, fontWeight: 300 }}>‹</button>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>
              {step === 'stat' ? 'Tag Stat' : step === 'player' ? statLabel(selectedStat!) : 'Shot Location'}
            </div>
            <div style={{ fontSize: 13, color: '#f97316', fontFamily: 'monospace', fontWeight: 700 }}>{msToTimecode(currentMs)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {step === 'stat' && (
              <>
                <button onClick={onUndo} disabled={!canUndo || undoPending}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: canUndo ? 'pointer' : 'not-allowed', color: canUndo ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.18)', fontSize: 12, fontWeight: 600 }}>Undo</button>
                <button onClick={onRedo} disabled={!canRedo || redoPending}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: canRedo ? 'pointer' : 'not-allowed', color: canRedo ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.18)', fontSize: 12, fontWeight: 600 }}>Redo</button>
              </>
            )}
            <button onClick={dismiss}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Step 1 — Stat Type */}
        {step === 'stat' && (
          <div style={{ padding: '14px 16px 24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#10b981', marginBottom: 9 }}>Made</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {MADE.map(s => (
                  <button key={s.key} onClick={() => handleStat(s.key)}
                    style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: '17px 8px', cursor: 'pointer', color: '#10b981', fontWeight: 800, fontSize: 15, minHeight: 66, letterSpacing: '0.01em' }}>{s.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 9 }}>Miss</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {MISS.map(s => (
                  <button key={s.key} onClick={() => handleStat(s.key)}
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '17px 8px', cursor: 'pointer', color: '#ef4444', fontWeight: 800, fontSize: 15, minHeight: 66 }}>{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 9 }}>Other</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                {OTHER.map(s => (
                  <button key={s.key} onClick={() => handleStat(s.key)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 4px', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 12, minHeight: 60 }}>{s.label}</button>
                ))}
              </div>
            </div>
            {(undoError || redoError) && <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{undoError || redoError}</div>}
          </div>
        )}

        {/* Step 2 — WizardPlayer */}
        {step === 'player' && (
          <div style={{ padding: '14px 16px 24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 10 }}>
              {allPlayers.map(p => (
                <button key={p.id} onClick={() => handlePlayer(p.id === OPP_ID ? null : p)} disabled={logging}
                  style={{ background: p.id === OPP_ID ? 'rgba(255,255,255,0.05)' : 'rgba(37,99,235,0.1)', border: `1.5px solid ${p.id === OPP_ID ? 'rgba(255,255,255,0.1)' : 'rgba(37,99,235,0.25)'}`, borderRadius: 14, padding: '14px 6px', cursor: logging ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minHeight: 94 }}>
                  <span style={{ fontSize: p.id === OPP_ID ? 18 : 44, fontWeight: 900, color: p.id === OPP_ID ? 'rgba(255,255,255,0.35)' : '#fff', lineHeight: 1 }}>{p.id === OPP_ID ? 'OPP' : (p.number ?? '?')}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Shot Location */}
        {step === 'location' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>Tap the shot location</div>
            <div style={{ width: '100%', maxWidth: 380 }}>
              <svg viewBox="0 0 100 88" style={{ width: '100%', display: 'block', borderRadius: 12, background: '#152030' }}>
                <rect x="1" y="1" width="98" height="86" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" rx="1"/>
                <rect x="30" y="45" width="40" height="43" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
                <circle cx="50" cy="45" r="10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
                <line x1="30" y1="45" x2="70" y2="45" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
                <path d="M 14,88 Q 14,28 50,22 Q 86,28 86,88" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
                <circle cx="50" cy="78" r="2.5" fill="none" stroke="#f97316" strokeWidth="1.2"/>
                <line x1="50" y1="75.5" x2="50" y2="88" stroke="rgba(249,115,22,0.4)" strokeWidth="0.5"/>
                {ZONES.map(z => (
                  <g key={z.id} onClick={() => { if (!logging) handleZone(z.id) }} style={{ cursor: logging ? 'not-allowed' : 'pointer' }}>
                    <rect x={z.x} y={z.y} width={z.w} height={z.h}
                      fill={hoveredZone === z.id ? 'rgba(37,99,235,0.42)' : 'rgba(37,99,235,0.1)'}
                      stroke={hoveredZone === z.id ? 'rgba(37,99,235,0.9)' : 'rgba(37,99,235,0.22)'}
                      strokeWidth="0.5" rx="1"
                      onMouseEnter={() => setHoveredZone(z.id)} onMouseLeave={() => setHoveredZone(null)}/>
                    <text x={z.x+z.w/2} y={z.y+z.h/2+1.5} textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.65)" style={{ pointerEvents:'none', userSelect:'none' }}>{z.label}</text>
                  </g>
                ))}
              </svg>
            </div>
            <button onClick={() => { if (!logging) handleZone('unspecified') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Skip location</button>
          </div>
        )}
      </div>
    </div>
  )
}

