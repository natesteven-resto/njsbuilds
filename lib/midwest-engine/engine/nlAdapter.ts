/**
 * Natural-language adapter — deterministic fixture-based for offline slice.
 *
 * Input: player text + recipient's limited knowledge + permitted actions.
 * Returns: structured NLProposal (intent, recipient, task category, etc.)
 * Engine validates and commits. Adapter NEVER mutates world state.
 *
 * DOCUMENTED LIMITATIONS of this first harness:
 * - Intent detection is keyword-based, not NLP. Documented exactly below.
 * - Ambiguous or unsupported intents return clarification, no mutation.
 * - Prompt injection patterns are detected and rejected.
 * - No model API call in this offline slice.
 */

import {
  NLProposal,
  IntentType,
  ContactId,
  CampaignState,
  ScenarioPackage,
} from '../domain/types';

// ─── Keyword maps (explicit, not "arbitrary English") ─────────────────────────

const RECRUIT_KEYWORDS = ['join', 'crew', 'work', 'job', 'hired', 'interested', 'aboard', 'need you', 'come on', 'take this', 'opportunity'];
const NEGOTIATE_KEYWORDS = ['rate', 'pay', 'money', 'compensation', 'cut', 'how much', 'salary', 'fee'];
const QUERY_KEYWORDS = ['what', 'know', 'tell me', 'heard', 'seen', 'report', 'update', 'status', 'think'];
const TASK_OBSERVE_KEYWORDS = ['observe', 'watch', 'surveillance', 'patterns', 'town', 'look around', 'scout'];
const TASK_REVIEW_KEYWORDS = ['review', 'records', 'public', 'research', 'case', 'documents', 'filings'];
const TASK_ASSESS_KEYWORDS = ['assess', 'evaluate', 'challenge', 'technical', 'system', 'capability'];
const COMMAND_KEYWORDS: Record<string, string> = {
  'ask status': 'ask_status',
  'status': 'ask_status',
  'hold': 'hold',
  'stand by': 'hold',
  'continue': 'continue',
  'proceed': 'continue',
  'move': 'continue',
  'regroup': 'regroup',
  'fall back': 'regroup',
  'abort': 'abort',
  'pull out': 'abort',
  'stand down': 'abort',
};

// Prompt injection patterns (player text is untrusted input).
const INJECTION_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /reveal (secret|hidden|private|password|truth)/i,
  /print (all|private|hidden)/i,
  /system:/i,
  /jailbreak/i,
  /<script/i,
  /\[\[.*\]\]/,            // OpenClaw directives
  /expose.*world state/i,
  /show.*private/i,
];

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class NLAdapter {
  constructor(
    private scenario: ScenarioPackage,
    private campaign: CampaignState
  ) {}

  /**
   * Parse player text into a structured NLProposal.
   * Never mutates campaign state — engine does that after validation.
   *
   * @param playerText Raw player input.
   * @param recipientId The contact this is addressed to (if any).
   */
  parse(playerText: string, recipientId?: ContactId): NLProposal {
    // Security: reject injection attempts first.
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(playerText)) {
        return {
          intent: 'unknown',
          references: [],
          ambiguousFields: [],
          rejected: 'Invalid input.',
          clarification:
            'That message format is not supported. Please send a plain message.',
        };
      }
    }

    const lower = playerText.toLowerCase();
    const ambiguousFields: string[] = [];
    const references: string[] = [];

    // Extract any crew member references.
    for (const pub of this.scenario.contacts.public) {
      if (lower.includes(pub.handle.toLowerCase())) {
        references.push(pub.handle);
      }
    }

    // Extract any task references.
    for (const task of this.scenario.tasks) {
      if (lower.includes(task.title.toLowerCase().slice(0, 12))) {
        references.push(task.id);
      }
    }

    // Detect command intent (only during operation).
    if (this.campaign.operation.status === 'in_progress') {
      for (const [kw, cmd] of Object.entries(COMMAND_KEYWORDS)) {
        if (lower.includes(kw)) {
          return {
            intent: 'issue_command',
            references,
            ambiguousFields,
            suggestedReply: cmd,
          };
        }
      }
    }

    // Detect query intent toward crew.
    if (recipientId && this.campaign.crew.some((c) => c.contactId === recipientId)) {
      if (QUERY_KEYWORDS.some((kw) => lower.includes(kw))) {
        return {
          intent: 'query_crew',
          recipientId,
          references,
          ambiguousFields,
        };
      }
    }

    // Detect negotiation intent.
    if (recipientId && NEGOTIATE_KEYWORDS.some((kw) => lower.includes(kw))) {
      return {
        intent: 'negotiate',
        recipientId,
        references,
        ambiguousFields,
      };
    }

    // Detect recruitment intent.
    if (recipientId && RECRUIT_KEYWORDS.some((kw) => lower.includes(kw))) {
      return {
        intent: 'recruit',
        recipientId,
        references,
        ambiguousFields,
      };
    }

    // Detect task assignment.
    if (TASK_OBSERVE_KEYWORDS.some((kw) => lower.includes(kw))) {
      if (!recipientId) ambiguousFields.push('Who should perform this task?');
      return {
        intent: 'assign_task',
        recipientId,
        taskCategory: 'observe',
        references,
        ambiguousFields,
      };
    }
    if (TASK_REVIEW_KEYWORDS.some((kw) => lower.includes(kw))) {
      if (!recipientId) ambiguousFields.push('Who should perform this task?');
      return {
        intent: 'assign_task',
        recipientId,
        taskCategory: 'review',
        references,
        ambiguousFields,
      };
    }
    if (TASK_ASSESS_KEYWORDS.some((kw) => lower.includes(kw))) {
      if (!recipientId) ambiguousFields.push('Who should perform this task?');
      return {
        intent: 'assign_task',
        recipientId,
        taskCategory: 'assess',
        references,
        ambiguousFields,
      };
    }

    // Unknown / ambiguous.
    return {
      intent: 'unknown',
      recipientId,
      references,
      ambiguousFields: ['Could not determine intent. Please be more specific.'],
      clarification:
        'Supported actions: recruit a contact, assign an investigation task, query a crew member, or issue an operation command (ask_status / hold / continue / regroup / abort).',
    };
  }
}
