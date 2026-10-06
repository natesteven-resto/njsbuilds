import { NextResponse } from 'next/server';
import { getStore, clearSession, setSession, save, MIDWEST_BANK_SCENARIO } from '../../lib/session';
import { DevClock } from '@midwest/engine/clock';
import { createCampaign } from '@midwest/engine/campaign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const store = getStore();
    const campaigns = store.listCampaigns();
    for (const c of campaigns) {
      store.devResetCampaign(c.id);
    }
    clearSession();

    const clock = new DevClock(Date.now());
    const session = createCampaign(MIDWEST_BANK_SCENARIO, clock, store);

    session.campaign.mailThreads.push({
      id: 'thread_opening',
      withContactId: 'unknown',
      messages: [
        {
          id: 'msg_opening_0',
          from: 'unknown',
          to: 'player',
          subject: 'Something worth your time',
          body: MIDWEST_BANK_SCENARIO.openingMessage,
          timestamp: clock.now() - 3600000,
          attachments: ['opening_dossier'],
        },
      ],
    });
    session.campaign.knowledge.playerAttachments.push('opening_dossier');

    setSession(session);
    save();

    return NextResponse.json({ ok: true, newCampaignId: session.campaign.id, message: 'Campaign reset.' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
