import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save, MIDWEST_BANK_SCENARIO } from '../../lib/session';
import type { MailMessage } from '@midwest/domain/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = loadOrCreateSession();
    const { to, subject, body } = await req.json() as { to: string; subject: string; body: string };

    if (!to || !subject || !body) {
      return NextResponse.json({ ok: false, error: 'Missing to, subject, or body.' }, { status: 400 });
    }

    const pub = MIDWEST_BANK_SCENARIO.contacts.public.find((c) => c.id === to);
    if (!pub) {
      return NextResponse.json({ ok: false, error: `Unknown contact: ${to}` }, { status: 400 });
    }

    const playerMsg: MailMessage = {
      id: `msg_player_${Date.now()}`,
      from: 'player',
      to,
      subject,
      body,
      timestamp: session.clock.now(),
      attachments: [],
    };

    const result = session.engine.processRecruitMail(session.campaign, to, playerMsg);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    // Engine tracks negotiation state explicitly — no text-matching workaround needed.
    save();

    return NextResponse.json({
      ok: true,
      sentMessage: playerMsg,
      response: result.value.responseMail,
      hired: result.value.hired,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
