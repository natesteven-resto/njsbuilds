import { NextResponse } from 'next/server';
import { MIDWEST_BANK_SCENARIO } from '../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const contacts = MIDWEST_BANK_SCENARIO.contacts.public.map((pub) => ({
      id: pub.id,
      handle: pub.handle,
      reputationSummary: pub.reputationSummary,
      knownRoles: pub.knownRoles,
      referredBy: pub.referredBy ?? null,
    }));
    return NextResponse.json({ ok: true, contacts });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
