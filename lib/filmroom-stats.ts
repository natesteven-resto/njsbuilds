// Shared stat-entry types and helpers for the Film Room game page and its tiles.
// Single source of truth — the game page, the Tag Stat modal and the shot chart all import from here.
import type { Player } from '@/types/filmroom'

export const STAT_TYPES = ['2M', '3M', 'FTM', '2X', '3X', 'FTX', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'DEF', 'TO', 'FOUL'] as const
export type StatType = typeof STAT_TYPES[number]

// Legacy aliases for entries written before the current stat vocabulary
const LEGACY_STAT_MAP: Partial<Record<string, StatType>> = {
  PTS: '2M', REB: 'OREB', AST: 'AST', STL: 'STL', BLK: 'BLK', TO: 'TO', '3M': '3M', FT: 'FTM',
}

export function normaliseStatType(raw: string): StatType {
  if ((STAT_TYPES as readonly string[]).includes(raw)) return raw as StatType
  return (LEGACY_STAT_MAP[raw] ?? '2M') as StatType
}

export interface StatDef {
  key: StatType
  label: string
  short: string
  col: 'made' | 'miss' | 'other'
  redTint?: boolean
}

export const STAT_DEFS: StatDef[] = [
  { key: '2M',   label: '2PT Made',   short: '2PT ✓', col: 'made' },
  { key: '3M',   label: '3PT Made',   short: '3PT ✓', col: 'made' },
  { key: 'FTM',  label: 'FT Made',    short: 'FT ✓',  col: 'made' },
  { key: '2X',   label: '2PT Miss',   short: '2PT ✗', col: 'miss' },
  { key: '3X',   label: '3PT Miss',   short: '3PT ✗', col: 'miss' },
  { key: 'FTX',  label: 'FT Miss',    short: 'FT ✗',  col: 'miss' },
  { key: 'OREB', label: 'Off Reb',    short: 'OREB',  col: 'other' },
  { key: 'DREB', label: 'Def Reb',    short: 'DREB',  col: 'other' },
  { key: 'AST',  label: 'Assist',     short: 'AST',   col: 'other' },
  { key: 'STL',  label: 'Steal',      short: 'STL',   col: 'other' },
  { key: 'BLK',  label: 'Block',      short: 'BLK',   col: 'other' },
  { key: 'DEF',  label: 'Deflection', short: 'DEF',   col: 'other' },
  { key: 'TO',   label: 'Turnover',   short: 'TO',    col: 'other', redTint: true },
  { key: 'FOUL', label: 'Foul',       short: 'FOUL',  col: 'other', redTint: true },
]

export function statLabel(stat: string): string {
  return STAT_DEFS.find(d => d.key === stat)?.label ?? stat
}

/** Field-goal stat types that can carry a court location. Free throws are placed implicitly, never on the court. */
export const LOCATED_SHOT_TYPES: ReadonlySet<string> = new Set(['2M', '3M', '2X', '3X'])
/** Every shot type (used by the API payload guard and legacy shot-chart entries). */
export const SHOT_TYPES_SET: ReadonlySet<string> = new Set(['2M', '3M', 'FTM', '2X', '3X', 'FTX'])

export interface StatEntry {
  id: string
  player_id: string
  player_name: string
  player_number: string
  stat_type: StatType
  video_time_ms: number
  game_id: string
  created_at: string
  shot_x?: number | null
  shot_y?: number | null
}

// Raw entry from the API (includes the joined players object)
export interface RawStatEntry {
  id: string
  player_id: string
  stat_type: string
  video_time_ms: number
  game_id: string
  created_at: string
  players: { id: string; name: string; number: number | null } | null
  shot_x?: number | null
  shot_y?: number | null
}

export function rawToEntry(raw: RawStatEntry): StatEntry {
  return {
    id: raw.id,
    player_id: raw.player_id,
    player_name: raw.players?.name ?? 'Unknown',
    player_number: raw.players?.number != null ? String(raw.players.number) : '?',
    stat_type: normaliseStatType(raw.stat_type),
    video_time_ms: raw.video_time_ms,
    game_id: raw.game_id,
    created_at: raw.created_at,
    shot_x: raw.shot_x ?? null,
    shot_y: raw.shot_y ?? null,
  }
}

// Opponent pseudo-player (stored as player_id = null on the server)
export const OPP_ID = '__opp__'
export const OPP_PLAYER: Player = { id: OPP_ID, name: 'Opponent', number: null, position: null, team_id: '', parent_email: null, created_at: '' }

export function isOpponentEntry(e: Pick<StatEntry, 'player_id' | 'player_number'>): boolean {
  return e.player_id === OPP_ID || e.player_id === null || e.player_number === 'OPP'
}

/** "#23 Noah" / "Opponent" — compact who-label for strips and toasts. */
export function entryWho(e: Pick<StatEntry, 'player_id' | 'player_number' | 'player_name'>): string {
  return isOpponentEntry(e) ? 'Opponent' : `#${e.player_number} ${e.player_name.split(' ')[0]}`
}

export function entryPoints(e: Pick<StatEntry, 'stat_type'>): number {
  return e.stat_type === '2M' ? 2 : e.stat_type === '3M' ? 3 : e.stat_type === 'FTM' ? 1 : 0
}
