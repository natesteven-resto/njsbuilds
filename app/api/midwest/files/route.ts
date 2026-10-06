import { NextResponse } from 'next/server';
import { loadOrCreateSession, MIDWEST_BANK_SCENARIO } from '../lib/session';

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
        return {
          id: obs.attachmentId,
          title: obs.title,
          source: `Task: ${task.title}`,
          content: obs.content,
        };
      }
    }
  }
  return null;
}

export async function GET() {
  try {
    const session = loadOrCreateSession();
    const playerAttachments = session.campaign.knowledge.playerAttachments;

    const files = playerAttachments.map((aid) => {
      const content = getAttachmentContent(aid);
      return content
        ? { id: content.id, title: content.title, source: content.source }
        : { id: aid, title: `[Unknown: ${aid}]`, source: 'Unknown' };
    });

    return NextResponse.json({ ok: true, files });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
