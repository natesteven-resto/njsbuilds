import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// Single-user forecaster state. No auth yet (Nate will add a PIN later).
// One KV key holds the whole document.
const KEY = 'forcast:data:v1'

export type OneOff = {
  id: string
  date: string // YYYY-MM-DD
  label: string
  amount: number // positive = income, negative = expense
}

export type Recurring = {
  id: string
  label: string
  amount: number // positive = income, negative = expense
  // cadence:
  //  monthly  -> on dayOfMonth (1-31; clamps to last day of short months)
  //  weekly   -> every week on weekday (0=Sun..6=Sat), anchored by startDate
  //  biweekly -> every 14 days from startDate
  cadence: 'monthly' | 'weekly' | 'biweekly'
  dayOfMonth?: number
  weekday?: number
  startDate?: string // YYYY-MM-DD anchor for weekly/biweekly
  endDate?: string // YYYY-MM-DD — last date this rule generates (inclusive). Past preserved.
}

// Move a single occurrence of a recurring item to a different date without
// touching the rule. Keyed by the recurring id + the date it *would* land on.
export type Override = {
  recId: string
  originalDate: string // YYYY-MM-DD the rule generated
  newDate: string // YYYY-MM-DD to show it on instead
}

// A bill entered but not yet placed on a date. Sits in the sidebar until
// the user is ready to schedule it onto a specific day.
export type PendingBill = {
  id: string
  label: string
  amount: number // stored as entered; typically negative (expense)
}

export type ForcastDoc = {
  startingBalance: number
  startingDate: string // YYYY-MM-DD — balance is "as of" this date
  oneOffs: OneOff[]
  recurring: Recurring[]
  overrides: Override[]
  pending: PendingBill[]
}

const EMPTY: ForcastDoc = {
  startingBalance: 0,
  startingDate: new Date().toISOString().slice(0, 10),
  oneOffs: [],
  recurring: [],
  overrides: [],
  pending: [],
}

export async function GET() {
  try {
    const doc = (await kv.get<ForcastDoc>(KEY)) ?? EMPTY
    return NextResponse.json({ ok: true, doc })
  } catch (e) {
    console.error('forcast GET error:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ForcastDoc>
    // Minimal validation / normalization
    const doc: ForcastDoc = {
      startingBalance: Number(body.startingBalance) || 0,
      startingDate:
        typeof body.startingDate === 'string' && body.startingDate
          ? body.startingDate
          : EMPTY.startingDate,
      oneOffs: Array.isArray(body.oneOffs)
        ? body.oneOffs
            .filter((o) => o && o.date && o.label != null)
            .map((o) => ({
              id: String(o.id),
              date: String(o.date),
              label: String(o.label),
              amount: Number(o.amount) || 0,
            }))
        : [],
      recurring: Array.isArray(body.recurring)
        ? body.recurring
            .filter((r) => r && r.label != null && r.cadence)
            .map((r) => ({
              id: String(r.id),
              label: String(r.label),
              amount: Number(r.amount) || 0,
              cadence: r.cadence,
              dayOfMonth: r.dayOfMonth != null ? Number(r.dayOfMonth) : undefined,
              weekday: r.weekday != null ? Number(r.weekday) : undefined,
              startDate: r.startDate ? String(r.startDate) : undefined,
              endDate: r.endDate ? String(r.endDate) : undefined,
            }))
        : [],
      overrides: Array.isArray(body.overrides)
        ? body.overrides
            .filter((o) => o && o.recId && o.originalDate && o.newDate)
            .map((o) => ({
              recId: String(o.recId),
              originalDate: String(o.originalDate),
              newDate: String(o.newDate),
            }))
        : [],
      pending: Array.isArray(body.pending)
        ? body.pending
            .filter((p) => p && p.label != null)
            .map((p) => ({
              id: String(p.id),
              label: String(p.label),
              amount: Number(p.amount) || 0,
            }))
        : [],
    }
    await kv.set(KEY, doc)
    return NextResponse.json({ ok: true, doc })
  } catch (e) {
    console.error('forcast POST error:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
