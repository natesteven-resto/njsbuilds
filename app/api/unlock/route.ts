import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const UNLOCK_PIN = '4100'

// KV key for today's unlock status — resets naturally since key includes the date
function todayKey() {
  const now = new Date()
  // Use Central Time (UTC-5/6) for midnight reset
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const y = ct.getFullYear()
  const m = String(ct.getMonth() + 1).padStart(2, '0')
  const d = String(ct.getDate()).padStart(2, '0')
  return `unlock:${y}-${m}-${d}`
}

// GET — poll: is today unlocked?
export async function GET() {
  try {
    const val = await kv.get<string>(todayKey())
    const unlocked = val === 'true'
    return NextResponse.json({ unlocked, date: todayKey() })
  } catch (e) {
    return NextResponse.json({ unlocked: false, error: 'KV error' }, { status: 500 })
  }
}

// POST — unlock with PIN, or lock
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pin, action } = body as { pin?: string; action?: string }

    if (action === 'lock') {
      await kv.set(todayKey(), 'false', { ex: 60 * 60 * 25 }) // 25h TTL
      return NextResponse.json({ success: true, unlocked: false })
    }

    if (pin !== UNLOCK_PIN) {
      return NextResponse.json({ success: false, error: 'Wrong PIN' }, { status: 401 })
    }

    // Set unlock — expires in 25 hours (covers until next midnight + buffer)
    await kv.set(todayKey(), 'true', { ex: 60 * 60 * 25 })
    return NextResponse.json({ success: true, unlocked: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'KV error' }, { status: 500 })
  }
}
