import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save, MIDWEST_BANK_SCENARIO } from '../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = loadOrCreateSession();
    const campaign = session.campaign;

    const phases = MIDWEST_BANK_SCENARIO.executionPhases.map((p) => ({
      id: p.id,
      name: p.name,
      durationMinutes: p.durationMinutes,
      defaultAssignedCrew: p.assignedCrew,
    }));

    return NextResponse.json({
      ok: true,
      currentPlan: campaign.plan,
      availablePhases: phases,
      crew: campaign.crew.map((c) => {
        const pub = MIDWEST_BANK_SCENARIO.contacts.public.find((p) => p.id === c.contactId);
        return { id: c.contactId, handle: pub?.handle ?? c.contactId };
      }),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
