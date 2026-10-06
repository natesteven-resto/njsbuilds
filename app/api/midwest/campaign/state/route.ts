import { NextResponse } from 'next/server';
import { loadOrCreateSession, save } from '../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = loadOrCreateSession();
    session.engine.resolvePendingTasks(session.campaign);
    save();
    const view = session.engine.exportPlayerView(session.campaign);
    return NextResponse.json({ ok: true, state: view, gameTime: session.clock.now() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
