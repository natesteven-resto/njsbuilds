import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save } from '../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = loadOrCreateSession();
    return NextResponse.json({ ok: true, notes: session.campaign.playerNotes });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = loadOrCreateSession();
    const { notes } = await req.json() as { notes: string };

    if (typeof notes !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing notes field.' }, { status: 400 });
    }

    session.campaign.playerNotes = notes;
    save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
