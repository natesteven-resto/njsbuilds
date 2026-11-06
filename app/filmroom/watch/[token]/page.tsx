import { notFound } from 'next/navigation'

// Dynamically import supabase to avoid server/client boundary issues
async function getGameByToken(token: string) {
  const { createServiceClient } = await import('@/lib/filmroom-supabase-server')
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('games')
    .select('id, opponent, game_date, video_url, team_id, teams(name)')
    .eq('share_token', token)
    .single()
  return data
}

async function getStatEntries(gameId: string) {
  const { createServiceClient } = await import('@/lib/filmroom-supabase-server')
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('stat_entries')
    .select('id, stat_type, player_id, video_time_ms, players(name, number)')
    .eq('game_id', gameId)
    .order('video_time_ms', { ascending: true })
  return data ?? []
}

export default async function WatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const game = await getGameByToken(token)
  if (!game) return notFound()

  const entries = await getStatEntries(game.id)
  const teamData = Array.isArray(game.teams) ? game.teams[0] : game.teams
  const teamName = (teamData as { name?: string } | null)?.name ?? 'Team'
  const gameDate = game.game_date
    ? new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div style={{ minHeight: '100vh', background: '#080b10', color: '#f1f5f9', fontFamily: 'Inter, Helvetica Neue, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f1419, #080b10)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, background: '#f97316', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {String.fromCodePoint(0x1F3C0)}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f97316', marginBottom: 2 }}>Film Room</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{teamName} vs {game.opponent}</div>
            {gameDate && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{gameDate}</div>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {game.video_url && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Game Film</div>
            <div style={{ background: '#000', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              <video src={game.video_url} controls playsInline style={{ width: '100%', display: 'block', maxHeight: 480 }} />
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Box Score</div>
            <BoxScore entries={entries} />
          </div>
        )}

        {!game.video_url && entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{String.fromCodePoint(0x1F3C0)}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Film coming soon</div>
          </div>
        )}
      </div>
    </div>
  )
}

type E = { id: string; stat_type: string; player_id: string | null; video_time_ms: number; players?: { name: string; number: string | null } | { name: string; number: string | null }[] | null }

function BoxScore({ entries }: { entries: E[] }) {
  const players: Record<string, { name: string; num: string | null; pts: number; reb: number; ast: number; stl: number; blk: number; to: number }> = {}
  for (const e of entries) {
    if (!e.player_id) continue
    const p = Array.isArray(e.players) ? e.players[0] : e.players
    if (!p) continue
    if (!players[e.player_id]) players[e.player_id] = { name: p.name, num: p.number, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0 }
    const r = players[e.player_id]
    if (e.stat_type === '2M') r.pts += 2
    else if (e.stat_type === '3M') r.pts += 3
    else if (e.stat_type === 'FTM') r.pts += 1
    else if (e.stat_type === 'OREB' || e.stat_type === 'DREB') r.reb += 1
    else if (e.stat_type === 'AST') r.ast += 1
    else if (e.stat_type === 'STL') r.stl += 1
    else if (e.stat_type === 'BLK') r.blk += 1
    else if (e.stat_type === 'TO') r.to += 1
  }
  const rows = Object.values(players).sort((a, b) => b.pts - a.pts)
  if (!rows.length) return null
  return (
    <div style={{ background: '#0f1419', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <th style={{ textAlign: 'left', padding: '10px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Player</th>
            {['PTS','REB','AST','STL','BLK','TO'].map(c => (
              <th key={c} style={{ textAlign: 'center', padding: '10px 10px', color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '12px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                {r.num && <span style={{ color: '#f97316', marginRight: 6, fontWeight: 800, fontSize: 11 }}>#{r.num}</span>}
                {r.name.split(' ')[0]}
              </td>
              {[r.pts, r.reb, r.ast, r.stl, r.blk, r.to].map((v, j) => (
                <td key={j} style={{ textAlign: 'center', padding: '12px 10px', fontWeight: v > 0 ? 700 : 400, color: v > 0 ? '#f1f5f9' : 'rgba(255,255,255,0.2)', fontSize: j === 0 ? 16 : 13 }}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
