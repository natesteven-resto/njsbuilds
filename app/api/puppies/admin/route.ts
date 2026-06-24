import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// POST — login + fetch signups
export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ids = await kv.lrange('puppies:signups', 0, -1) as string[]
  const signups = ids.length
    ? await Promise.all(ids.map(id => kv.get(id)))
    : []

  // Sort newest first
  const sorted = (signups.filter(Boolean) as object[]).sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return NextResponse.json({ signups: sorted })
}

// PATCH — update status and/or collar assignment
export async function PATCH(req: NextRequest) {
  const { id, status, collar, password } = await req.json()
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const signup = await kv.get(id) as any
  if (!signup) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (status !== undefined) signup.status = status
  if (collar !== undefined) signup.collar = collar
  await kv.set(id, signup)

  return NextResponse.json({ success: true })
}
