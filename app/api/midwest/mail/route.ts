import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save, MIDWEST_BANK_SCENARIO } from '../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = loadOrCreateSession();
    const threads = session.campaign.mailThreads.map((thread) => {
      const pub = MIDWEST_BANK_SCENARIO.contacts.public.find((c) => c.id === thread.withContactId);
      return {
        id: thread.id,
        withContactId: thread.withContactId,
        contactLabel: pub?.handle ?? thread.withContactId,
        messageCount: thread.messages.length,
        lastMessage: thread.messages[thread.messages.length - 1] ?? null,
        unread: thread.messages.some((m) => m.from !== 'player'),
      };
    });
    return NextResponse.json({ ok: true, threads });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
