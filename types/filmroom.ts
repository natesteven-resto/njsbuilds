// Film Room — TypeScript types

export const TEST_COACH_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_TEAM_ID = '00000000-0000-0000-0000-000000000010'

export interface Coach {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Team {
  id: string
  coach_id: string
  name: string
  season: string
  sport: string
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  number: number | null
  position: string | null
  parent_email: string | null
  created_at: string
}

export interface Game {
  id: string
  team_id: string
  opponent: string
  game_date: string
  location: string | null
  video_url: string | null
  video_id: string | null
  thumbnail_url: string | null
  notes: string | null
  created_at: string
  // Courtside additions
  resume_position_ms?: number
  season_label?: string | null
  session_type?: 'game' | 'practice' | 'scouting'
  last_watched_at?: string | null
  review_meta?: { bookmarks: {id:string; label:string; period:string; clock:string; position_ms:number}[] }
}

export type ClipCategory = 'offense' | 'defense' | 'transition' | 'set_play'

// Courtside coaching quick-tags (stored in clips.tags text[])
export const PLAY_TYPES = [
  'Screening', 'Spacing', 'Closeout', 'Help rotation', 'Box-out',
  'Transition', 'Pick-and-roll', 'BLOB/SLOB', 'Good execution', 'Needs work',
  'Offense', 'Defense', 'Other',
] as const
export type PlayType = typeof PLAY_TYPES[number]

// Import the canonical DrawingData/DrawShape from the component so all consumers
// get the real definition. The local interfaces below that reference DrawingData
// use this import directly.
import type { DrawShape as _DrawShape, DrawingData as _DrawingData, DrawTool as _DrawTool } from '@/app/filmroom/components/DrawingOverlay'

// Re-export for convenience so callers can import from '@/types/filmroom'.
export type { DrawShape, DrawingData, DrawTool } from '@/app/filmroom/components/DrawingOverlay'

// Local alias used by interfaces in this file.
type DrawingData = _DrawingData
type DrawShape   = _DrawShape
type DrawTool    = _DrawTool

/**
 * Normalize a drawing payload that may be either:
 *  - Current format: { shapes, width, height }
 *  - Legacy format:  { objects: [...] }  (old DB rows pre-013)
 * Returns a valid DrawingData or null.
 */
export function normalizeDrawingData(raw: unknown): DrawingData | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  // Current format
  if (Array.isArray(r.shapes)) {
    return {
      shapes: r.shapes as DrawShape[],
      time_ms: typeof r.time_ms === 'number' && Number.isFinite(r.time_ms) ? r.time_ms : undefined,
      width:  Number(r.width)  || 1280,
      height: Number(r.height) || 720,
    }
  }

  // Legacy format: { objects: [{type, points, x, y, text, color, strokeWidth}] }
  if (Array.isArray(r.objects)) {
    const shapes: DrawShape[] = (r.objects as Record<string, unknown>[]).map((o, i) => ({
      id:          String(i),
      tool:        (['arrow','circle','text','line'].includes(String(o.type)) ? o.type : 'freehand') as DrawTool,
      color:       typeof o.color       === 'string' ? o.color       : '#FF3B30',
      strokeWidth: typeof o.strokeWidth === 'number' ? o.strokeWidth : 3,
      points:      Array.isArray(o.points) ? (o.points as number[]) : undefined,
      x1:          typeof o.x === 'number' ? o.x : undefined,
      y1:          typeof o.y === 'number' ? o.y : undefined,
      text:        typeof o.text === 'string' ? o.text : undefined,
    }))
    return { shapes, width: 1280, height: 720 }
  }

  return null
}

export interface Clip {
  id: string
  game_id: string
  team_id: string
  start_time_ms: number
  end_time_ms: number
  title: string
  tags: string[]
  category: ClipCategory
  is_highlight: boolean
  drawing_data: DrawingData | null
  created_at: string
  // Courtside additions
  coaching_note?: string | null
  play_type?: string | null
  primary_player_id?: string | null
  // joined
  players?: Player[]
  comments?: ClipComment[]
}

export interface ClipPlayer {
  clip_id: string
  player_id: string
}

export interface SessionPlan { objective: string; sections: {id:string; title:string; objective:string; clip_ids:string[]}[] }

export interface Playlist {
  session_plan?: SessionPlan
  id: string
  owner_id: string
  name: string
  created_at: string
  // joined
  clip_count?: number
  clips?: PlaylistClip[]
}

export interface PlaylistClip {
  id: string
  playlist_id: string
  clip_id: string
  position: number
  created_at: string
  // joined
  clip?: Clip & { game?: Game }
}

export interface ClipComment {
  id: string
  clip_id: string
  author_id: string | null
  author_role: 'coach' | 'player' | 'parent'
  author_name: string
  text: string
  drawing_data: DrawingData | null
  created_at: string
}

export interface PlayerStats {
  id: string
  game_id: string
  player_id: string
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  turnovers: number
  fg2m: number
  fg2a: number
  fg3m: number
  fg3a: number
  ftm: number
  fta: number
  // joined
  player?: Player
}

export interface StatClip {
  stat_id: string
  clip_id: string
  stat_type: string
}

export const CATEGORY_LABELS: Record<ClipCategory, string> = {
  offense: 'Offense',
  defense: 'Defense',
  transition: 'Transition',
  set_play: 'Set Play',
}

export const CATEGORY_COLORS: Record<ClipCategory, string> = {
  offense: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  defense: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  transition: 'bg-green-500/20 text-green-400 border-green-500/30',
  set_play: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

// Shot types that can carry coordinates
export const SHOT_STAT_TYPES = ['2M', '3M', '2X', '3X', 'FTM', 'FTX'] as const
export type ShotStatType = typeof SHOT_STAT_TYPES[number]
