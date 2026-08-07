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
    const key = todayKey()
    const val = await kv.get<string>(key)
    console.log('GET unlock check:', key, '=> val:', val, 'KV_URL:', process.env.KV_URL?.slice(0, 20))
    const unlocked = val === 'true'
    return NextResponse.json({ unlocked, date: key, raw: val })
  } catch (e) {
    console.error('GET KV error:', e)
    return NextResponse.json({ unlocked: false, error: String(e) }, { status: 500 })
  }
}

// POST — unlock with PIN, or lock
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pin, action } = body as { pin?: string; action?: string }

    if (action === 'lock') {
      const key = todayKey()
      await kv.set(key, 'false', { ex: 60 * 60 * 25 })
      const verify = await kv.get<string>(key)
      console.log('LOCK set, verify read back:', verify)
      return NextResponse.json({ success: true, unlocked: false })
    }

    if (pin !== UNLOCK_PIN) {
      return NextResponse.json({ success: false, error: 'Wrong PIN' }, { status: 401 })
    }

    const key = todayKey()
    await kv.set(key, 'true', { ex: 60 * 60 * 25 })
    const verify = await kv.get<string>(key)
    console.log('UNLOCK set key:', key, '=> verify read back:', verify)
    return NextResponse.json({ success: true, unlocked: true, verify })
  } catch (e) {
    console.error('POST KV error:', e)
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
