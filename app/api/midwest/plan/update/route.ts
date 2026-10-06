import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save } from '../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = loadOrCreateSession();
    const { phases, fallbackOrders } = await req.json() as {
      phases: Array<{ phaseId: string; assignedCrew: string[]; notes: string }>;
      fallbackOrders: Record<string, string>;
    };

    if (!phases || !Array.isArray(phases)) {
      return NextResponse.json({ ok: false, error: 'Missing or invalid phases array.' }, { status: 400 });
    }

    const result = session.engine.draftPlan(session.campaign, phases, fallbackOrders ?? {});
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    save();
    return NextResponse.json({ ok: true, plan: result.value });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
