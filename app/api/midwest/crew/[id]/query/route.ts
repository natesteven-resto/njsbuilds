import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save } from '../../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = loadOrCreateSession();
    const { id } = await params;
    const q = req.nextUrl.searchParams.get('q');

    if (!q) {
      return NextResponse.json({ ok: false, error: 'Missing query parameter: q' }, { status: 400 });
    }

    const result = session.engine.queryCrewMember(session.campaign, id, q);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, clarification: result.clarification }, { status: 400 });
    }

    save();
    return NextResponse.json({ ok: true, crewId: id, question: q, answer: result.value });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
