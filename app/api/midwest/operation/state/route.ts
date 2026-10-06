import { NextResponse } from 'next/server';
import { loadOrCreateSession, MIDWEST_BANK_SCENARIO } from '../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getCurrentPhaseInfo(phaseId?: string) {
  if (!phaseId) return null;
  const phase = MIDWEST_BANK_SCENARIO.executionPhases.find((p) => p.id === phaseId);
  if (!phase) return null;
  return { id: phase.id, name: phase.name, abstractChallenge: phase.abstractChallenge };
}

export async function GET() {
  try {
    const session = loadOrCreateSession();
    return NextResponse.json({
      ok: true,
      operation: session.campaign.operation,
      aftermath: session.campaign.aftermath,
      currentPhase: getCurrentPhaseInfo(session.campaign.operation.currentPhaseId),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
