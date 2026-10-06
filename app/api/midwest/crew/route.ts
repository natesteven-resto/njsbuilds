import { NextResponse } from 'next/server';
import { loadOrCreateSession, MIDWEST_BANK_SCENARIO } from '../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = loadOrCreateSession();
    const campaign = session.campaign;

    const crew = campaign.crew.map((contract) => {
      const pub = MIDWEST_BANK_SCENARIO.contacts.public.find((c) => c.id === contract.contactId);
      const activeTasks = campaign.scheduledTasks.filter(
        (t) => t.assignedCrewId === contract.contactId && t.status === 'pending'
      );
      return {
        contactId: contract.contactId,
        handle: pub?.handle ?? contract.contactId,
        roles: pub?.knownRoles ?? [],
        reputationSummary: pub?.reputationSummary ?? '',
        agreedRate: contract.agreedRate,
        hiredAt: contract.hiredAt,
        status: activeTasks.length > 0 ? 'on-task' : 'available',
        activeTasks: activeTasks.map((t) => ({
          id: t.id,
          taskId: t.taskId,
          completesAt: t.completesAt,
        })),
      };
    });

    return NextResponse.json({ ok: true, crew });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
