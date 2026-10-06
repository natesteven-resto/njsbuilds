import { NextResponse } from 'next/server';
import { loadOrCreateSession, save, MIDWEST_BANK_SCENARIO } from '../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = loadOrCreateSession();
    const campaign = session.campaign;

    session.engine.resolvePendingTasks(campaign);
    save();

    const tasks = MIDWEST_BANK_SCENARIO.tasks.map((taskDef) => {
      const scheduled = campaign.scheduledTasks.find((t) => t.taskId === taskDef.id);
      const completed = campaign.knowledge.completedTaskIds.includes(taskDef.id);
      return {
        id: taskDef.id,
        title: taskDef.title,
        category: taskDef.category,
        durationDays: taskDef.durationDays,
        requiredRole: taskDef.requiredRole ?? null,
        status: completed ? 'complete' : scheduled?.status === 'pending' ? 'in-progress' : 'available',
        assignedTo: scheduled?.assignedCrewId ?? null,
        completesAt: scheduled?.completesAt ?? null,
        startedAt: scheduled?.startedAt ?? null,
        revealedAttachments: completed ? (scheduled?.revealedAttachments ?? []) : [],
      };
    });

    return NextResponse.json({ ok: true, tasks });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
