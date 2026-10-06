import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, MIDWEST_BANK_SCENARIO } from '../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPENING_DOSSIER = {
  id: 'opening_dossier',
  title: 'TARGET DOSSIER — HARTWELL BRANCH',
  source: 'anonymous.relay@pm.me',
  content: MIDWEST_BANK_SCENARIO.openingDossier,
};

function getAttachmentContent(attachmentId: string) {
  if (attachmentId === 'opening_dossier') return OPENING_DOSSIER;
  for (const task of MIDWEST_BANK_SCENARIO.tasks) {
    for (const obs of task.observations) {
      if (obs.attachmentId === attachmentId) {
        return { id: obs.attachmentId, title: obs.title, source: `Task: ${task.title}`, content: obs.content };
      }
    }
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = loadOrCreateSession();
    const { id } = await params;

    if (!session.campaign.knowledge.playerAttachments.includes(id)) {
      return NextResponse.json({ ok: false, error: 'Attachment not available.' }, { status: 403 });
    }

    const content = getAttachmentContent(id);
    if (!content) {
      return NextResponse.json({ ok: false, error: 'Attachment not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, file: content });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
