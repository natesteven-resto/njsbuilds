import { NextRequest, NextResponse } from 'next/server';
import { loadOrCreateSession, save, MIDWEST_BANK_SCENARIO } from '../../lib/session';
import type { AllowedCommand } from '@midwest/domain/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_COMMANDS: AllowedCommand[] = ['ask_status', 'hold', 'continue', 'regroup', 'abort'];

function getCurrentPhaseInfo(phaseId?: string) {
  if (!phaseId) return null;
  const phase = MIDWEST_BANK_SCENARIO.executionPhases.find((p) => p.id === phaseId);
  if (!phase) return null;
  return { id: phase.id, name: phase.name, abstractChallenge: phase.abstractChallenge };
}

export async function POST(req: NextRequest) {
  try {
    const session = loadOrCreateSession();
    const { command, targetPhase, playerText } = await req.json() as {
      command: AllowedCommand;
      targetPhase?: string;
      playerText: string;
    };

    if (!ALLOWED_COMMANDS.includes(command)) {
      return NextResponse.json({
        ok: false,
        error: `Invalid command. Allowed: ${ALLOWED_COMMANDS.join(', ')}`,
      }, { status: 400 });
    }

    const result = session.engine.issueCommand(
      session.campaign,
      command,
      targetPhase,
      playerText ?? command
    );

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error,
        clarification: result.clarification,
      }, { status: 400 });
    }

    save();
    return NextResponse.json({
      ok: true,
      radioEntries: result.value,
      operation: session.campaign.operation,
      aftermath: session.campaign.aftermath,
      currentPhase: getCurrentPhaseInfo(session.campaign.operation.currentPhaseId),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
