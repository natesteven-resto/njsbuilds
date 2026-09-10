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
}

export type ClipCategory = 'offense' | 'defense' | 'transition' | 'set_play'

export interface DrawingObject {
  type: 'arrow' | 'circle' | 'freehand' | 'text'
  points?: number[]
  x?: number
  y?: number
  radius?: number
  text?: string
  color: string
  strokeWidth?: number
}

export interface DrawingData {
  objects: DrawingObject[]
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
  // joined
  players?: Player[]
  comments?: ClipComment[]
}

export interface ClipPlayer {
  clip_id: string
  player_id: string
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
