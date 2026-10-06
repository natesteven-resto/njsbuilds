import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, MIDWEST_BANK_SCENARIO } from '../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const session = loadOrCreateSession();
    const { threadId } = await params;
    const thread = session.campaign.mailThreads.find((t) => t.id === threadId);
    if (!thread) {
      return NextResponse.json({ ok: false, error: 'Thread not found' }, { status: 404 });
    }
    const pub = MIDWEST_BANK_SCENARIO.contacts.public.find((c) => c.id === thread.withContactId);
    return NextResponse.json({
      ok: true,
      thread: { ...thread, contactLabel: pub?.handle ?? thread.withContactId },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
