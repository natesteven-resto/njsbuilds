import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = createServiceClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('games')
    .update(body)
    .eq('id', gameId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = createServiceClient()

  const { error } = await supabase.from('games').delete().eq('id', gameId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
