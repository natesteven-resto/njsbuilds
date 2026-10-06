import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save } from '../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = loadOrCreateSession();
    const { taskId, crewId } = await req.json() as { taskId: string; crewId: string };

    if (!taskId || !crewId) {
      return NextResponse.json({ ok: false, error: 'Missing taskId or crewId.' }, { status: 400 });
    }

    const result = session.engine.scheduleTask(session.campaign, taskId, crewId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    save();
    return NextResponse.json({ ok: true, scheduledTask: result.value });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
