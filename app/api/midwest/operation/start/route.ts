import { NextResponse } from 'next/server';
import { loadOrCreateSession, save, MIDWEST_BANK_SCENARIO } from '../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getCurrentPhaseInfo(phaseId?: string) {
  if (!phaseId) return null;
  const phase = MIDWEST_BANK_SCENARIO.executionPhases.find((p) => p.id === phaseId);
  if (!phase) return null;
  return { id: phase.id, name: phase.name, abstractChallenge: phase.abstractChallenge };
}

export async function POST() {
  try {
    const session = loadOrCreateSession();
    const result = session.engine.startOperation(session.campaign);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    save();
    return NextResponse.json({
      ok: true,
      operation: session.campaign.operation,
      currentPhase: getCurrentPhaseInfo(session.campaign.operation.currentPhaseId),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
