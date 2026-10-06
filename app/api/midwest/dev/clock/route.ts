import { NextResponse } from 'next/server';
import { loadOrCreateSession } from '../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = loadOrCreateSession();
    return NextResponse.json({
      ok: true,
      gameTime: session.clock.now(),
      gameTimeFormatted: new Date(session.clock.now()).toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
