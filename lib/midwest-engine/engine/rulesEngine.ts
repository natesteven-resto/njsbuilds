/**
 * Rules engine — validates hiring, scheduling, knowledge transfer, orders
 * and state transitions. Separates private truth from player-facing projections.
 *
 * The simulation owns reality. AI (dialogue fixtures) supplies speech only.
 * Engine events may drive persona-specific radio lines; dialogue cannot create events.
 */

import {
  CampaignState,
  ContactId,
  TaskId,
  ScenarioPackage,
  CrewContract,
  ScheduledTask,
  MailMessage,
  AllowedCommand,
  PhaseId,
  AftermathRecord,
  RadioEntry,
  CommandEntry,
  DisclosedKnowledge,
  PlanVersion,
  NegotiationState,
} from '../domain/types';
import { ClockService } from './clock';
import { EventLog } from './eventLog';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

let _msgCounter = 0;
function genMsgId(): string {
  return `msg_${Date.now()}_${++_msgCounter}`;
}

function genRadioId(): string {
  return `radio_${Date.now()}_${++_msgCounter}`;
}

export type RulesResult<T> =
  | { ok: true; value: T; clarification?: undefined }
  | { ok: false; error: string; clarification?: string };

export class RulesEngine {
  constructor(
    private scenario: ScenarioPackage,
    private clock: ClockService,
    private log: EventLog
  ) {}

  // ─── Recruitment ──────────────────────────────────────────────────────────

  /**
   * Validate and process a recruitment invitation mail.
   * Returns the crew response fixture text and updates campaign state.
   * Does NOT auto-hire — player must continue conversation.
   *
   * Negotiation state is tracked explicitly in campaign.negotiationStates.
   * No text-matching is used to infer negotiation progress.
   */
  processRecruitMail(
    campaign: CampaignState,
    recipientId: ContactId,
    playerMessage: MailMessage
  ): RulesResult<{ responseMail: MailMessage; hired: boolean }> {
    const pubProfile = this.scenario.contacts.public.find((c) => c.id === recipientId);
    const privProfile = this.scenario.contacts.private.find((c) => c.id === recipientId);

    if (!pubProfile || !privProfile) {
      return { ok: false, error: `Unknown contact: ${recipientId}` };
    }

    // Check if already hired.
    if (campaign.crew.some((c) => c.contactId === recipientId)) {
      return { ok: false, error: `${pubProfile.handle} is already on the crew.` };
    }

    // Check trust threshold — trust accrues via prior player-sent messages.
    const existingThread = campaign.mailThreads.find((t) => t.withContactId === recipientId);
    // +1 to include the current message being sent
    const priorPlayerMessages = existingThread
      ? existingThread.messages.filter((m) => m.from === 'player').length
      : 0;
    const exchangeCount = priorPlayerMessages + 1;
    const currentTrust = Math.min(exchangeCount * 15, 80);

    // Check for blocking conflict relationships.
    const conflict = this.scenario.relationships.find(
      (r) =>
        (r.betweenA === recipientId || r.betweenB === recipientId) &&
        r.valence === 'negative' &&
        campaign.crew.some((c) => {
          const other = r.betweenA === recipientId ? r.betweenB : r.betweenA;
          return c.contactId === other;
        })
    );

    // Select dialogue fixture — state transitions drive fixture selection.
    let triggerKey: string;
    let hired = false;
    let responseBody: string;

    // Eli's Eli-Mack conflict surfaces through the negotiation concern system (Clearwater path),
    // not as a flat decline. The player must acknowledge Clearwater and assign separate phases.
    // All other conflicts cause a flat decline.
    const isEliMackConflict =
      conflict !== undefined &&
      recipientId === 'eli' &&
      campaign.crew.some((c) => c.contactId === 'mack');

    if (conflict && !isEliMackConflict) {
      triggerKey = 'recruitment_decline_conflict';
      const fixture = this.getFixture(recipientId, 'recruitment_decline_conflict');
      responseBody = fixture ?? `[MOCK] I heard who else you're putting on this. I'm out.`;
      // Record decline event.
      this.log.append(
        'crew_declined',
        `${pubProfile.handle} declined — conflict with existing crew`,
        { recipientId, reason: 'conflict' },
        { timestamp: this.clock.now() }
      );
    } else if (currentTrust < privProfile.trustRequired) {
      triggerKey = 'recruitment_decline_low_trust';
      const fixture = this.getFixture(recipientId, 'recruitment_decline_low_trust');
      responseBody = fixture ?? `[MOCK] I don't know you well enough yet.`;
    } else if (privProfile.negotiates && !this.hasNegotiated(campaign, recipientId)) {
      // First time reaching trust threshold for a negotiating contact.
      // Engine explicitly starts a negotiation — NOT detected from mail text.
      triggerKey = 'recruitment_negotiate_rate';
      const fixture = this.getFixture(recipientId, 'recruitment_negotiate_rate');
      responseBody = fixture ?? `[MOCK] Interested. But the rate needs work.`;

      // Engine records the negotiation_started event and updates NegotiationState.
      this.startNegotiation(campaign, recipientId);
    } else if (privProfile.negotiates && this.isNegotiating(campaign, recipientId)) {
      // Negotiation is in progress — resolve it via engine state.
      // Capture fingerprint BEFORE advancing (to detect repeat).
      const prevFingerprint = campaign.negotiationStates[recipientId]?.lastFingerprint;
      const currentFingerprint = this.extractIntentFingerprintPublic(playerMessage.body.toLowerCase());
      const isRepeatMessage = prevFingerprint === currentFingerprint && currentFingerprint !== '';

      this.advanceNegotiation(campaign, recipientId, playerMessage);
      const negState = campaign.negotiationStates[recipientId];

      if (isRepeatMessage) {
        // Engine detected repeated intent — Eli calls it out.
        triggerKey = 'recruitment_negotiate_repeated_intent';
        const fixture = this.getFixture(recipientId, 'recruitment_negotiate_repeated_intent');
        responseBody = fixture ?? `[MOCK] You're not hearing me.`;
      } else if (negState.phase === 'accepted') {
        // All concerns resolved — hire.
        triggerKey = 'recruitment_invite_polite';
        const fixture = this.getFixture(recipientId, 'recruitment_invite_polite');
        responseBody = fixture ?? `[MOCK] Alright. We have a deal. I'm in.`;
        hired = true;
      } else if (negState.outstandingConcerns.includes('score_worth_time')) {
        // Score concern still unresolved.
        triggerKey = 'recruitment_negotiate_score_concern';
        const fixture = this.getFixture(recipientId, 'recruitment_negotiate_score_concern');
        responseBody = fixture ?? `[MOCK] I've heard promises before. Tell me this score is worth my time.`;
      } else if (negState.outstandingConcerns.includes('mack_separation')) {
        // Mack concern surfaced (score concern resolved, Mack still outstanding).
        const mackHired = campaign.crew.some((c) => c.contactId === 'mack');
        if (mackHired) {
          triggerKey = 'recruitment_negotiate_mack_path';
          const fixture = this.getFixture(recipientId, 'recruitment_negotiate_mack_path');
          responseBody = fixture ?? `[MOCK] I just heard Mack is on this. That changes things. Clearwater. You know about that?`;
        } else {
          triggerKey = 'recruitment_negotiate_mack_concern';
          const fixture = this.getFixture(recipientId, 'recruitment_negotiate_mack_concern');
          responseBody = fixture ?? `[MOCK] You haven't addressed the Mack situation. I need separate assignments.`;
        }
      } else {
        // Ongoing negotiation.
        triggerKey = 'recruitment_negotiate_rate';
        const fixture = this.getFixture(recipientId, 'recruitment_negotiate_rate');
        responseBody = fixture ?? `[MOCK] We're not there yet.`;
      }
    } else {
      // Trust is sufficient, not a negotiator (or negotiation already complete).
      const isPolite = this.detectPolite(playerMessage.body);
      triggerKey = isPolite ? 'recruitment_invite_polite' : 'recruitment_invite_direct';
      const fixture = this.getFixture(recipientId, isPolite ? 'recruitment_invite_polite' : 'recruitment_invite_direct');
      responseBody = fixture ?? `[MOCK] Alright. I'm in.`;
      hired = currentTrust >= privProfile.trustRequired;
    }

    const responseMail: MailMessage = {
      id: genMsgId(),
      from: recipientId,
      to: 'player',
      subject: `Re: ${playerMessage.subject}`,
      body: responseBody,
      timestamp: this.clock.now() + 30 * 60 * 1000, // 30 min response time
      attachments: [],
    };

    // Add to mail thread.
    let thread = campaign.mailThreads.find((t) => t.withContactId === recipientId);
    if (!thread) {
      thread = { id: `thread_${recipientId}`, withContactId: recipientId, messages: [] };
      campaign.mailThreads.push(thread);
    }
    thread.messages.push(playerMessage);
    thread.messages.push(responseMail);

    // Log mail events.
    this.log.append(
      'mail_sent',
      `Player sent recruitment mail to ${pubProfile.handle}`,
      { recipientId, trigger: triggerKey, hired },
      { timestamp: this.clock.now() }
    );
    this.log.append(
      'mail_received',
      `${pubProfile.handle} responded (trigger: ${triggerKey})`,
      { recipientId, trigger: triggerKey, hired, responseBody: '[fixture]' },
      { timestamp: responseMail.timestamp }
    );

    if (hired) {
      this.hireCrewMember(campaign, recipientId);
    }

    return { ok: true, value: { responseMail, hired } };
  }

  // ─── Negotiation State Management (engine-driven, not text-inferred) ─────────

  /**
   * Start a negotiation for a contact. Engine fires a negotiation_started event.
   * Dialogue text is selected based on state, not the reverse.
   */
  startNegotiation(campaign: CampaignState, contactId: ContactId): void {
    const priv = this.scenario.contacts.private.find((c) => c.id === contactId);
    const outstandingConcerns = this.getContactConcernsForCampaign(contactId, campaign);

    const state: NegotiationState = {
      contactId,
      phase: 'negotiating',
      resolvedConcerns: [],
      outstandingConcerns,
      exchangeCount: 0,
      startedAt: this.clock.now(),
      lastTransitionAt: this.clock.now(),
    };

    campaign.negotiationStates = campaign.negotiationStates ?? {};
    campaign.negotiationStates[contactId] = state;

    this.log.append(
      'negotiation_started',
      `Negotiation started with ${contactId}`,
      { contactId, outstandingConcerns, trustRequired: priv?.trustRequired },
      { timestamp: this.clock.now() }
    );
  }

  /**
   * Advance negotiation state based on player message content.
   * The engine detects which concerns are addressed via keyword matching on
   * authored concern keys — not arbitrary text parsing.
   *
   * Repeated-intent detection: if the player sends the same keyword cluster
   * without addressing a new concern, the engine marks it as a repeat.
   */
  advanceNegotiation(
    campaign: CampaignState,
    contactId: ContactId,
    playerMessage: MailMessage
  ): void {
    const state = campaign.negotiationStates?.[contactId];
    if (!state || state.phase !== 'negotiating') return;

    state.exchangeCount += 1;
    const lower = playerMessage.body.toLowerCase();

    // Detect repeated intent: same fingerprint as last message, no new concerns addressed.
    const fingerprint = this.extractIntentFingerprint(lower);
    const isRepeat = state.lastFingerprint === fingerprint && fingerprint !== '';
    // Always update fingerprint so next call can detect its own repeat.
    state.lastFingerprint = fingerprint;

    if (isRepeat) {
      // Engine recognizes the repeat; no state advances.
      this.log.append(
        'crew_negotiated',
        `${contactId}: repeated intent detected — no new information`,
        { contactId, fingerprint, exchangeCount: state.exchangeCount },
        { timestamp: this.clock.now() }
      );
      return;
    }

    // If Mack is now hired and wasn't a concern before, add it now.
    if (contactId === 'eli') {
      const mackHired = campaign.crew.some((c) => c.contactId === 'mack');
      if (mackHired &&
          !state.outstandingConcerns.includes('mack_separation') &&
          !state.resolvedConcerns.includes('mack_separation')) {
        state.outstandingConcerns.push('mack_separation');
      }
    }

    // Check which outstanding concerns are addressed.
    const concernHandlers = this.getConcernAddressDetectors(contactId);

    for (const concernKey of [...state.outstandingConcerns]) {
      const detector = concernHandlers[concernKey];
      if (detector && detector(lower)) {
        state.resolvedConcerns.push(concernKey);
        state.outstandingConcerns = state.outstandingConcerns.filter((c) => c !== concernKey);
        state.lastTransitionAt = this.clock.now();

        this.log.append(
          'negotiation_concern_resolved',
          `Concern '${concernKey}' resolved with ${contactId}`,
          { contactId, concernKey, resolvedConcerns: [...state.resolvedConcerns] },
          { timestamp: this.clock.now() }
        );
      }
    }

    // Transition to accepted only when all concerns addressed.
    if (state.outstandingConcerns.length === 0) {
      state.phase = 'accepted';
      state.lastTransitionAt = this.clock.now();

      this.log.append(
        'negotiation_completed',
        `Negotiation with ${contactId} accepted — all concerns resolved`,
        { contactId, resolvedConcerns: state.resolvedConcerns },
        { timestamp: this.clock.now() }
      );
    }
  }

  /**
   * Public wrapper for intent fingerprint extraction.
   * Used by processRecruitMail to check for repeats before advanceNegotiation.
   */
  extractIntentFingerprintPublic(text: string): string {
    return this.extractIntentFingerprint(text);
  }

  /**
   * Extract a coarse intent fingerprint from message text.
   * Used to detect when the player repeats the same message.
   * Returns the sorted set of matched keyword groups.
   */
  private extractIntentFingerprint(text: string): string {
    const groups: Record<string, RegExp> = {
      score:    /score|vault|payoff|take|worth|cut|haul|value|amount|number/i,
      mack:     /mack|separate|phase|apart|different|away|split|not.{0,20}together/i,
      rate:     /rate|pay|money|compensation|salary|fee|bonus/i,
      generic:  /job|work|crew|join|hire|interested|come.on/i,
    };
    const hits = Object.entries(groups)
      .filter(([, re]) => re.test(text))
      .map(([key]) => key)
      .sort()
      .join(',');
    return hits;
  }

  /**
   * Contact-specific concern-address detectors.
   * Each entry maps a concern key to a function that checks if the player message
   * addresses it. Rules are engine-authored, not AI-inferred.
   */
  private getConcernAddressDetectors(
    contactId: ContactId
  ): Record<string, (text: string) => boolean> {
    if (contactId === 'eli') {
      return {
        score_worth_time: (text) =>
          /score|vault|payoff|take|worth|cut|haul|value|amount|number/i.test(text),
        mack_separation: (text) =>
          /mack|separate|phase|apart|different|away|split|not.{0,20}together/i.test(text),
      };
    }
    // Generic: any negotiating contact with no authored concerns accepts after one exchange.
    return {
      rate: (text) =>
        /rate|pay|money|compensation|cut|salary|fee|bonus|agreed|deal|accept/i.test(text),
    };
  }

  /**
   * Returns the list of concern keys for a contact's negotiation.
   * Eli has authored concerns. If Mack is already hired, Eli's Mack concern
   * surfaces (Clearwater conflict path). If Mack is not hired, simpler path.
   * Others have a generic rate concern.
   */
  private getContactConcernsForCampaign(contactId: ContactId, campaign: CampaignState): string[] {
    if (contactId === 'eli') {
      const mackHired = campaign.crew.some((c) => c.contactId === 'mack');
      // Eli always cares about the score. He cares about Mack if Mack is on crew.
      return mackHired
        ? ['score_worth_time', 'mack_separation']
        : ['score_worth_time'];
    }
    return ['rate'];
  }

  /**
   * Returns the list of concern keys for a contact's negotiation (no campaign context).
   * Used when campaign state is unavailable. Defaults to full Eli concerns.
   */
  private getContactConcerns(contactId: ContactId): string[] {
    if (contactId === 'eli') {
      return ['score_worth_time'];
    }
    return ['rate'];
  }

  private hasNegotiated(campaign: CampaignState, contactId: ContactId): boolean {
    const state = campaign.negotiationStates?.[contactId];
    return state !== undefined;
  }

  private isNegotiating(campaign: CampaignState, contactId: ContactId): boolean {
    const state = campaign.negotiationStates?.[contactId];
    return state?.phase === 'negotiating';
  }

  private shouldHire(
    trust: number,
    required: number,
    negotiates: boolean,
    campaign: CampaignState,
    contactId: ContactId
  ): boolean {
    if (trust < required) return false;
    if (negotiates && !this.hasNegotiated(campaign, contactId)) return false;
    return true;
  }

  private hireCrewMember(campaign: CampaignState, contactId: ContactId): void {
    const priv = this.scenario.contacts.private.find((c) => c.id === contactId)!;
    const contract: CrewContract = {
      contactId,
      agreedRate: priv.dailyRate,
      hiredAt: this.clock.now(),
      playerPromises: [],
      trustLevel: 60,
      stressLevel: 0,
    };
    campaign.crew.push(contract);
    this.log.append(
      'crew_hired',
      `${contactId} joined the crew`,
      { contactId, agreedRate: priv.dailyRate },
      { timestamp: this.clock.now() }
    );
  }

  /** Directly hire crew member (for harness/test convenience — not player flow). */
  directHire(campaign: CampaignState, contactId: ContactId, promises: string[] = []): RulesResult<CrewContract> {
    const priv = this.scenario.contacts.private.find((c) => c.id === contactId);
    if (!priv) return { ok: false, error: `Unknown contact: ${contactId}` };
    if (campaign.crew.some((c) => c.contactId === contactId)) {
      return { ok: false, error: `${contactId} already hired` };
    }
    const contract: CrewContract = {
      contactId,
      agreedRate: priv.dailyRate,
      hiredAt: this.clock.now(),
      playerPromises: promises,
      trustLevel: 70,
      stressLevel: 0,
    };
    campaign.crew.push(contract);
    this.log.append(
      'crew_hired',
      `${contactId} direct-hired (harness)`,
      { contactId, agreedRate: priv.dailyRate },
      { timestamp: this.clock.now() }
    );
    return { ok: true, value: contract };
  }

  // ─── Task Scheduling ──────────────────────────────────────────────────────

  scheduleTask(
    campaign: CampaignState,
    taskId: TaskId,
    assignedCrewId: ContactId
  ): RulesResult<ScheduledTask> {
    const taskDef = this.scenario.tasks.find((t) => t.id === taskId);
    if (!taskDef) return { ok: false, error: `Unknown task: ${taskId}` };

    // Check not already scheduled or completed.
    if (campaign.knowledge.completedTaskIds.includes(taskId)) {
      return { ok: false, error: `Task ${taskId} already completed — cannot repeat.` };
    }
    if (campaign.scheduledTasks.some((t) => t.taskId === taskId && t.status === 'pending')) {
      return { ok: false, error: `Task ${taskId} already scheduled.` };
    }

    // Check role requirement.
    if (taskDef.requiredRole) {
      const priv = this.scenario.contacts.private.find((c) => c.id === assignedCrewId);
      if (!priv || priv.role !== taskDef.requiredRole) {
        return {
          ok: false,
          error: `Task ${taskId} requires ${taskDef.requiredRole} role; ${assignedCrewId} does not qualify.`,
        };
      }
    }

    // Check crew member is hired.
    if (!campaign.crew.some((c) => c.contactId === assignedCrewId)) {
      return { ok: false, error: `${assignedCrewId} is not on the crew.` };
    }

    const startedAt = this.clock.now();
    const completesAt = startedAt + taskDef.durationDays * MS_PER_DAY;

    const scheduled: ScheduledTask = {
      id: `sched_${taskId}_${Date.now()}`,
      taskId,
      assignedCrewId,
      startedAt,
      completesAt,
      status: 'pending',
      revealedAttachments: [],
    };

    campaign.scheduledTasks.push(scheduled);

    this.log.append(
      'task_started',
      `Task "${taskDef.title}" started by ${assignedCrewId}`,
      { taskId, assignedCrewId, completesAt },
      { timestamp: this.clock.now() }
    );

    return { ok: true, value: scheduled };
  }

  /**
   * Resolve any scheduled tasks whose completesAt <= clock.now().
   * Idempotent — calling multiple times doesn't duplicate completions.
   */
  resolvePendingTasks(campaign: CampaignState): ScheduledTask[] {
    const now = this.clock.now();
    const resolved: ScheduledTask[] = [];

    for (const sched of campaign.scheduledTasks) {
      if (sched.status !== 'pending') continue;
      if (now < sched.completesAt) continue;

      sched.status = 'complete';
      resolved.push(sched);

      const taskDef = this.scenario.tasks.find((t) => t.id === sched.taskId)!;

      // Record which attachments are revealed.
      const attachmentIds = taskDef.observations.map((o) => o.attachmentId);
      sched.revealedAttachments = attachmentIds;

      // Mark as completed (prevents re-scheduling).
      if (!campaign.knowledge.completedTaskIds.includes(sched.taskId)) {
        campaign.knowledge.completedTaskIds.push(sched.taskId);
      }

      // Add attachments to player knowledge.
      for (const aid of attachmentIds) {
        if (!campaign.knowledge.playerAttachments.includes(aid)) {
          campaign.knowledge.playerAttachments.push(aid);
        }
      }

      // Add observations to crew member knowledge.
      const crewKnow = campaign.knowledge.crewKnowledge[sched.assignedCrewId] ?? [];
      for (const obs of taskDef.observations) {
        if (!crewKnow.includes(obs.content)) {
          crewKnow.push(obs.content);
        }
      }
      campaign.knowledge.crewKnowledge[sched.assignedCrewId] = crewKnow;

      this.log.append(
        'task_completed',
        `Task "${taskDef.title}" completed by ${sched.assignedCrewId}`,
        {
          taskId: sched.taskId,
          assignedCrewId: sched.assignedCrewId,
          revealedAttachments: attachmentIds,
          containsMisleadingDetail: taskDef.observations.some((o) => o.containsMisleadingDetail),
        },
        { timestamp: now }
      );

      // Disclose knowledge to the crew member.
      this.log.append(
        'knowledge_disclosed',
        `${sched.assignedCrewId} now knows: ${taskDef.observations.map(o => o.title).join(', ')}`,
        { crewId: sched.assignedCrewId, taskId: sched.taskId },
        { timestamp: now, playerVisible: false }
      );
    }

    return resolved;
  }

  // ─── Crew Queries ─────────────────────────────────────────────────────────

  /**
   * A crew member answers a player query.
   * They respond only based on their disclosed knowledge.
   * If they don't know, they say so — no invention.
   */
  queryCrewMember(
    campaign: CampaignState,
    crewId: ContactId,
    playerQuestion: string
  ): RulesResult<string> {
    if (!campaign.crew.some((c) => c.contactId === crewId)) {
      return { ok: false, error: `${crewId} is not on the crew.` };
    }

    const knowledge = campaign.knowledge.crewKnowledge[crewId] ?? [];
    const question = playerQuestion.toLowerCase();

    // Sanitize: detect prompt injection attempts.
    if (this.looksLikePromptInjection(playerQuestion)) {
      return {
        ok: false,
        error: 'Invalid query.',
        clarification: 'That query format is not supported. Ask a plain question.',
      };
    }

    // Check if question touches any known topic.
    const relevantFacts = knowledge.filter((fact) =>
      this.questionRelatesToFact(question, fact)
    );

    if (relevantFacts.length === 0) {
      // Check if question mentions a relationship.
      const relationshipMention = this.detectRelationshipMention(crewId, question, campaign);
      if (relationshipMention) {
        const fixture = this.getFixture(crewId, 'conflict_mention_eli_mack');
        return {
          ok: true,
          value: fixture ?? `[MOCK] ${crewId}: I'd rather not get into that.`,
        };
      }

      const unknownFixture = this.getFixture(crewId, 'query_unknown');
      return {
        ok: true,
        value: unknownFixture ?? `[MOCK] ${crewId}: I don't know anything about that. You'd have to check.`,
      };
    }

    const knownFixture = this.getFixture(crewId, 'query_known_task');
    if (knownFixture) {
      return { ok: true, value: knownFixture };
    }

    return {
      ok: true,
      value: `[MOCK] ${crewId}: Based on what I've seen — ${relevantFacts[0]}`,
    };
  }

  private detectRelationshipMention(crewId: ContactId, question: string, campaign: CampaignState): boolean {
    // Look for references to other crew members by handle or ID.
    const otherCrew = campaign.crew.filter((c) => c.contactId !== crewId);
    for (const other of otherCrew) {
      const pub = this.scenario.contacts.public.find((p) => p.id === other.contactId);
      if (pub && question.includes(pub.handle.toLowerCase())) {
        // Check if there's a negative relationship.
        const rel = this.scenario.relationships.find(
          (r) =>
            ((r.betweenA === crewId && r.betweenB === other.contactId) ||
              (r.betweenA === other.contactId && r.betweenB === crewId)) &&
            r.valence === 'negative'
        );
        if (rel) return true;
      }
    }
    return false;
  }

  private looksLikePromptInjection(text: string): boolean {
    const suspiciousPatterns = [
      /ignore (previous|above|all) instructions/i,
      /you are now/i,
      /reveal (secret|hidden|private|password|truth)/i,
      /print (all|private|hidden)/i,
      /system:/i,
      /jailbreak/i,
      /<script/i,
    ];
    return suspiciousPatterns.some((p) => p.test(text));
  }

  private questionRelatesToFact(question: string, fact: string): boolean {
    // Simple keyword overlap — not NLP.
    const qWords = question.split(/\W+/).filter((w) => w.length > 3);
    const fWords = fact.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    return qWords.some((w) => fWords.includes(w));
  }

  // ─── Plan ─────────────────────────────────────────────────────────────────

  draftPlan(
    campaign: CampaignState,
    phases: Array<{ phaseId: PhaseId; assignedCrew: ContactId[]; notes: string }>,
    fallbackOrders: Record<PhaseId, string>
  ): RulesResult<PlanVersion> {
    // Validate each phase.
    for (const phase of phases) {
      const phaseDef = this.scenario.executionPhases.find((p) => p.id === phase.phaseId);
      if (!phaseDef) {
        return { ok: false, error: `Unknown phase: ${phase.phaseId}` };
      }
      for (const crewId of phase.assignedCrew) {
        if (!campaign.crew.some((c) => c.contactId === crewId)) {
          return { ok: false, error: `${crewId} is not on the crew.` };
        }
      }
    }

    const version = campaign.plan ? campaign.plan.version + 1 : 1;
    const plan: PlanVersion = {
      version,
      phases,
      fallbackOrders,
      draftedAt: this.clock.now(),
    };

    campaign.plan = plan;

    this.log.append(
      'plan_drafted',
      `Plan v${version} drafted`,
      { version, phaseCount: phases.length },
      { timestamp: this.clock.now() }
    );

    return { ok: true, value: plan };
  }

  // ─── Operation ───────────────────────────────────────────────────────────

  startOperation(campaign: CampaignState): RulesResult<void> {
    if (!campaign.plan) {
      return { ok: false, error: 'No plan drafted. Draft a plan before launching.' };
    }
    if (campaign.crew.length === 0) {
      return { ok: false, error: 'No crew. Recruit at least one person.' };
    }
    if (campaign.operation.status !== 'not_started' && campaign.operation.status !== 'planning') {
      return { ok: false, error: 'Operation already in progress or concluded.' };
    }

    campaign.operation.status = 'in_progress';
    campaign.operation.startedAt = this.clock.now();

    // Set first phase from plan if available, else first scenario phase.
    const planPhaseIds = campaign.plan?.phases.map((p) => p.phaseId);
    const firstPhaseId = planPhaseIds?.[0] ?? this.scenario.executionPhases[0]?.id;
    if (firstPhaseId) {
      campaign.operation.currentPhaseId = firstPhaseId;
    }

    this.log.append(
      'operation_started',
      'Operation launched',
      { planVersion: campaign.plan.version, crewCount: campaign.crew.length },
      { timestamp: this.clock.now() }
    );

    return { ok: true, value: undefined };
  }

  issueCommand(
    campaign: CampaignState,
    command: AllowedCommand,
    targetPhase: PhaseId | undefined,
    playerText: string
  ): RulesResult<RadioEntry[]> {
    if (campaign.operation.status !== 'in_progress') {
      return { ok: false, error: 'No operation in progress.' };
    }

    // Reject prompt injection.
    if (this.looksLikePromptInjection(playerText)) {
      return { ok: false, error: 'Invalid command text.', clarification: 'Use the allowed command set: ask_status, hold, continue, regroup, abort.' };
    }

    const cmd: CommandEntry = {
      id: genMsgId(),
      timestamp: this.clock.now(),
      command,
      targetPhase,
      playerText,
    };
    campaign.operation.commandLog.push(cmd);

    const radioEntries: RadioEntry[] = [];
    const currentPhase = campaign.operation.currentPhaseId;

    this.log.append(
      'command_issued',
      `Command: ${command}`,
      { command, targetPhase, playerText: '[player input]' },
      { timestamp: this.clock.now() }
    );

    if (command === 'ask_status') {
      radioEntries.push(...this.generateStatusRadio(campaign, currentPhase));
    } else if (command === 'hold') {
      radioEntries.push(this.buildRadio(campaign, 'danny', 'Copy that. We sit tight.', 'status'));
    } else if (command === 'continue') {
      const advanced = this.advancePhase(campaign);
      if (advanced) {
        radioEntries.push(this.buildRadio(campaign, 'danny', `Moving to next phase.`, 'confirm'));
      } else {
        // All phases done.
        radioEntries.push(...this.concludeOperation(campaign, 'completed'));
      }
    } else if (command === 'regroup') {
      // Relationship-dependent reaction — Danny and Nora trust each other.
      const dannyOnCrew = campaign.crew.some((c) => c.contactId === 'danny');
      const noraOnCrew = campaign.crew.some((c) => c.contactId === 'nora');
      const regroupFixture = this.getFixture('danny', 'exec_regrouped');
      const msg = regroupFixture ?? '[MOCK] Danny: Nora, fall back to secondary. We regroup.';
      radioEntries.push({ id: genRadioId(), timestamp: this.clock.now(), fromCrewId: 'danny', message: msg, type: 'status' });
      if (dannyOnCrew && noraOnCrew) {
        // Surfaces trust relationship through dialogue.
        const noraMsg = `[MOCK] Nora: Already on it — Danny called the move, I trust it.`;
        radioEntries.push({
          id: genRadioId(),
          timestamp: this.clock.now() + 30000,
          fromCrewId: 'nora',
          message: noraMsg,
          type: 'relationship',
          revealsRelationship: 'danny_nora_trust',
        });
      }
    } else if (command === 'abort') {
      radioEntries.push(...this.concludeOperation(campaign, 'aborted'));
    }

    for (const entry of radioEntries) {
      campaign.operation.radioLog.push(entry);
    }

    return { ok: true, value: radioEntries };
  }

  private generateStatusRadio(campaign: CampaignState, currentPhase?: PhaseId): RadioEntry[] {
    const entries: RadioEntry[] = [];
    const assignedCrew = campaign.crew.slice(0, 2);

    for (const member of assignedCrew) {
      const priv = this.scenario.contacts.private.find((c) => c.id === member.contactId);
      const knowledge = campaign.knowledge.crewKnowledge[member.contactId] ?? [];
      // Only report what they could know.
      const canReport = knowledge.length > 0;
      const fixture = this.getFixture(member.contactId, 'exec_status_ok');
      const msg = fixture ??
        (canReport
          ? `[MOCK] ${member.contactId}: Phase ${currentPhase ?? '?'} — looks clear on my end.`
          : `[MOCK] ${member.contactId}: In position. Nothing to report yet.`);

      entries.push({
        id: genRadioId(),
        timestamp: this.clock.now(),
        fromCrewId: member.contactId,
        message: msg,
        type: 'status',
      });
    }

    // Telegraphed complication — Eli mentions something off.
    const eliOnCrew = campaign.crew.some((c) => c.contactId === 'eli');
    if (eliOnCrew && currentPhase) {
      const complicationFixture = this.getFixture('eli', 'exec_status_complication');
      const complicationMsg = complicationFixture ??
        `[MOCK] Eli: I'm seeing something that doesn't match the public record. Might be nothing. Might not.`;
      entries.push({
        id: genRadioId(),
        timestamp: this.clock.now() + 60000,
        fromCrewId: 'eli',
        message: complicationMsg,
        type: 'complication',
      });
    }

    return entries;
  }

  private advancePhase(campaign: CampaignState): boolean {
    // Use plan phases if available, else fall back to scenario phases.
    const planPhaseIds = campaign.plan?.phases.map((p) => p.phaseId) ?? null;
    const allPhases = this.scenario.executionPhases;
    const phases = planPhaseIds
      ? allPhases.filter((p) => planPhaseIds.includes(p.id))
      : allPhases;

    const currentIdx = phases.findIndex((p) => p.id === campaign.operation.currentPhaseId);

    if (currentIdx >= 0 && !campaign.operation.completedPhases.includes(phases[currentIdx].id)) {
      campaign.operation.completedPhases.push(phases[currentIdx].id);
      this.log.append(
        'phase_completed',
        `Phase completed: ${phases[currentIdx].name}`,
        { phaseId: phases[currentIdx].id },
        { timestamp: this.clock.now() }
      );
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx < phases.length) {
      campaign.operation.currentPhaseId = phases[nextIdx].id;
      this.log.append(
        'phase_started',
        `Phase started: ${phases[nextIdx].name}`,
        { phaseId: phases[nextIdx].id },
        { timestamp: this.clock.now() }
      );
      return true;
    }
    return false;
  }

  private concludeOperation(campaign: CampaignState, outcome: 'completed' | 'aborted'): RadioEntry[] {
    const entries: RadioEntry[] = [];

    if (outcome === 'completed') {
      campaign.operation.status = 'completed';
      campaign.operation.endedAt = this.clock.now();

      // Mark final phase complete.
      if (campaign.operation.currentPhaseId &&
          !campaign.operation.completedPhases.includes(campaign.operation.currentPhaseId)) {
        campaign.operation.completedPhases.push(campaign.operation.currentPhaseId);
      }

      entries.push({ id: genRadioId(), timestamp: this.clock.now(), fromCrewId: 'danny', message: '[MOCK] Danny: We\'re out. Clear.', type: 'confirm' });
      entries.push({ id: genRadioId(), timestamp: this.clock.now() + 30000, fromCrewId: 'nora', message: '[MOCK] Nora: Package secured. Moving to extraction.', type: 'confirm' });

      const aftermath: AftermathRecord = {
        outcomeType: 'completed',
        primaryConsequence: 'The operation concluded without incident. Local accounts flagged an anomaly two days later.',
        crewStatus: Object.fromEntries(campaign.crew.map((c) => [c.contactId, 'ok' as const])),
        knowledgeLeaked: false,
        financesAfter: campaign.finances + 45000,
        savedAt: this.clock.now(),
      };
      campaign.aftermath = aftermath;
      campaign.finances = aftermath.financesAfter;

      this.log.append('operation_completed', 'Operation completed', { outcome }, { timestamp: this.clock.now() });
      this.log.append('aftermath_saved', 'Aftermath recorded', { aftermath }, { timestamp: this.clock.now(), playerVisible: false });

    } else {
      campaign.operation.status = 'aborted';
      campaign.operation.endedAt = this.clock.now();
      campaign.operation.abortedAtPhase = campaign.operation.currentPhaseId;

      const abortFixture = this.getFixture('danny', 'exec_abort_acknowledged');
      const msg = abortFixture ?? '[MOCK] Danny: Abort confirmed. Pulling everyone back. We\'re not clean — someone saw Eli.';
      entries.push({ id: genRadioId(), timestamp: this.clock.now(), fromCrewId: 'danny', message: msg, type: 'abort' });

      // Partial consequences — not binary failure.
      const eliSeen = campaign.crew.some((c) => c.contactId === 'eli');
      const aftermath: AftermathRecord = {
        outcomeType: 'aborted',
        primaryConsequence: eliSeen
          ? 'Eli was spotted on approach. He needs to lay low. The target is aware something was attempted.'
          : 'Abort went clean. No one was seen. The target is unaware, but the window may close.',
        crewStatus: {
          ...Object.fromEntries(campaign.crew.map((c) => [c.contactId, 'ok' as const])),
          ...(eliSeen ? { eli: 'stressed' as const } : {}),
        },
        knowledgeLeaked: eliSeen,
        financesAfter: campaign.finances - 3000, // Expenses, no gain.
        savedAt: this.clock.now(),
      };
      campaign.aftermath = aftermath;
      campaign.finances = aftermath.financesAfter;

      this.log.append('operation_aborted', 'Operation aborted', { abortedAtPhase: campaign.operation.currentPhaseId }, { timestamp: this.clock.now() });
      this.log.append('aftermath_saved', 'Aftermath recorded', { aftermath }, { timestamp: this.clock.now(), playerVisible: false });
    }

    return entries;
  }

  private buildRadio(
    _campaign: CampaignState,
    fromCrewId: ContactId,
    message: string,
    type: RadioEntry['type']
  ): RadioEntry {
    return {
      id: genRadioId(),
      timestamp: this.clock.now(),
      fromCrewId,
      message,
      type,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getFixture(contactId: ContactId, trigger: string): string | null {
    const fixture = this.scenario.dialogueFixtures.find(
      (f) => f.contactId === contactId && f.trigger === trigger
    );
    if (!fixture) return null;
    // Fixtures include [AUTHORED] label in their lines — return as-is.
    return fixture.lines.join(' ');
  }

  private detectPolite(body: string): boolean {
    const politeWords = ['please', 'would you', 'i hope', 'appreciate', 'thank', 'wondering if'];
    return politeWords.some((w) => body.toLowerCase().includes(w));
  }

  /** Safe player-facing export — strips private world state. */
  exportPlayerView(campaign: CampaignState): Partial<CampaignState> {
    const safe: Partial<CampaignState> = {
      id: campaign.id,
      scenarioId: campaign.scenarioId,
      startedAt: campaign.startedAt,
      currentTime: campaign.currentTime,
      crew: campaign.crew.map((c) => ({
        ...c,
        // Strip internal numeric scores from player view.
        trustLevel: undefined as unknown as number,
        stressLevel: undefined as unknown as number,
      })),
      scheduledTasks: campaign.scheduledTasks.map((t) => ({
        ...t,
        // Don't expose which tasks contain misleading details.
        revealedAttachments: t.revealedAttachments,
      })),
      knowledge: {
        crewKnowledge: campaign.knowledge.crewKnowledge,
        playerAttachments: campaign.knowledge.playerAttachments,
        completedTaskIds: campaign.knowledge.completedTaskIds,
      },
      playerNotes: campaign.playerNotes,
      plan: campaign.plan,
      operation: campaign.operation,
      finances: campaign.finances,
      aftermath: campaign.aftermath,
      // Only player-visible events.
      events: this.log.playerVisible(),
      mailThreads: campaign.mailThreads,
    };
    return safe;
  }
}
