import { NextResponse } from 'next/server'

const POSITION_MAP: Record<string, string> = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', K: 'K', DST: 'DST'
}

export async function GET() {
  try {
    const res = await fetch('https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php', {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' },
      next: { revalidate: 3600 } // cache 1 hour
    })
    const html = await res.text()

    // Extract the players array from the embedded JSON
    const playersMatch = html.match(/"players"\s*:\s*(\[[\s\S]*?\])\s*,\s*"last_updated/)

    if (!playersMatch) {
      console.error('Could not find players array in FantasyPros response')
      return NextResponse.json({ error: 'Could not parse player data' }, { status: 500 })
    }

    const rawPlayers = JSON.parse(playersMatch[1])

    const players = rawPlayers
      .filter((p: any) => POSITION_MAP[p.player_position_id] && p.rank_ecr <= 250)
      .map((p: any, i: number) => ({
        id: p.player_id || i + 1,
        name: p.player_name,
        team: p.player_team_id || 'FA',
        position: p.player_position_id as 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST',
        bye: p.player_bye_week || 0,
        tier: p.tier || 5,
        adp: p.rank_ecr || 999,
        notes: generateNote(p),
        sleeper: (p.tier <= 5) && (p.rank_ecr > 80),
        taken: false,
        drafted: false,
      }))
      .sort((a: any, b: any) => a.adp - b.adp)

    return NextResponse.json({ players, fetchedAt: new Date().toISOString() })
  } catch (err) {
    console.error('Players fetch error:', err)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}

function generateNote(p: any): string {
  const pos = p.player_position_id
  const rank = p.rank_ecr
  const tier = p.tier
  const team = p.player_team_id || 'Unknown'

  if (pos === 'DST') return `${team} Defense — ranked #${rank} overall among DSTs.`
  if (pos === 'K') return `${team} Kicker — ranked #${rank} overall among kickers.`

  if (tier === 1) return `Elite ${pos}. Consensus top pick — experts love this one.`
  if (tier === 2) return `Solid ${pos} value. Consistent producer, good upside.`
  if (tier === 3) return `Reliable ${pos}. Strong bye-week and depth option.`
  if (tier <= 5) return `Depth ${pos}. Worth a late-round flier.`
  return `Late-round option. High variance, low floor.`
}
