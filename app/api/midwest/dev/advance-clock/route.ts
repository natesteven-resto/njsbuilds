import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save } from '../../lib/session';
import { DevClock } from '@midwest/engine/clock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = loadOrCreateSession();
    const { hours } = await req.json() as { hours: number };

    if (typeof hours !== 'number' || hours <= 0) {
      return NextResponse.json({ ok: false, error: 'Provide a positive number of hours.' }, { status: 400 });
    }

    const clock = session.clock as DevClock;
    clock.advanceMinutes(hours * 60);

    const resolved = session.engine.resolvePendingTasks(session.campaign);
    save();

    return NextResponse.json({
      ok: true,
      newTime: session.clock.now(),
      newTimeFormatted: new Date(session.clock.now()).toISOString(),
      tasksResolved: resolved.length,
      resolvedTasks: resolved.map((t) => ({ taskId: t.taskId, revealedAttachments: t.revealedAttachments })),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
