/**
 * Core domain types for The Midwest Job.
 * Private world state is kept separate from player-visible projections.
 */

// ─── Identifiers ──────────────────────────────────────────────────────────────

export type ContactId = string;
export type TaskId = string;
export type EventId = string;
export type CampaignId = string;
export type ScenarioId = string;
export type AttachmentId = string;
export type PhaseId = string;

// ─── Scenario (authored, stable, private) ────────────────────────────────────

export type CrewRole = 'observer' | 'technical' | 'driver' | 'coordinator' | 'support';

/** What crew members actually know about a relationship (private world state). */
export interface PrivateRelationship {
  betweenA: ContactId;
  betweenB: ContactId;
  /** Internal label — never shown to player. */
  label: string;
  /** Description of what happened — world state only. */
  history: string;
  /** Positive or negative valence drives reaction rules. */
  valence: 'positive' | 'negative';
  /** Which interactions this unlocks. */
  affectedInteractions: string[];
  /** Whether this has been surfaced to the player via dialogue. */
  discoverable: boolean;
}

export interface ContactPublicProfile {
  id: ContactId;
  handle: string;
  /** What is visible to any contact who can refer them. */
  reputationSummary: string;
  referredBy?: ContactId;
  knownRoles: CrewRole[];
}

export interface ContactPrivateProfile {
  id: ContactId;
  /** Full name — used in authored dialogue fixtures only. */
  realName: string;
  role: CrewRole;
  /** Minimum trust the player must establish before hire. */
  trustRequired: number; // 0-100
  /** Whether they'll accept on first ask (vs negotiate). */
  negotiates: boolean;
  /** Topics they refuse to discuss. */
  blindSpots: string[];
  /** What they know at scenario start (before any tasks). */
  initialKnowledge: string[];
  /** Authored personality traits for dialogue fixture selection. */
  traits: string[];
  /** Daily cost if hired. */
  dailyRate: number;
  stressLimit: number; // 0-100
}

export interface AuthoredDialogueFixture {
  id: string;
  contactId: ContactId;
  /** Trigger condition key — engine selects by matching campaign state. */
  trigger: DialogueTrigger;
  /** The mock response text — clearly labeled as authored. */
  lines: string[];
  /** Whether this fixture surfaces a hidden relationship. */
  revealsRelationship?: string;
}

export type DialogueTrigger =
  | 'recruitment_invite_polite'
  | 'recruitment_invite_direct'
  | 'recruitment_negotiate_rate'
  | 'recruitment_decline_low_trust'
  | 'recruitment_decline_conflict'
  | 'recruitment_negotiate_score_concern'    // Eli: score/payoff concern still unresolved
  | 'recruitment_negotiate_mack_concern'     // Eli: Mack separation concern still unresolved
  | 'recruitment_negotiate_repeated_intent'  // Eli: player repeating same message, no progress
  | 'recruitment_negotiate_mack_path'        // Eli: Mack already hired, conflict surfaces
  | 'query_unknown'
  | 'query_known_task'
  | 'conflict_mention_eli_mack'
  | 'exec_status_ok'
  | 'exec_status_complication'
  | 'exec_abort_acknowledged'
  | 'exec_regrouped'
  | 'post_op_consequence';

export interface ObservationResult {
  attachmentId: AttachmentId;
  title: string;
  /** What the observing crew member actually reports. */
  content: string;
  /** Whether this contains a misleading detail (engine tracks, player doesn't know). */
  containsMisleadingDetail: boolean;
  /** If misleading, what the real truth is (private world state). */
  privateCorrection?: string;
  /** Whether a later task can contradict this. */
  contradictedByTaskId?: TaskId;
}

export interface TaskDefinition {
  id: TaskId;
  title: string;
  category: 'observe' | 'review' | 'assess';
  durationDays: number;
  requiredRole?: CrewRole;
  /** Results when complete — ordered, one per assigned crew member. */
  observations: ObservationResult[];
  /** Another task that this contradicts. */
  contradictsTask?: TaskId;
  /** Whether this is a harmless distraction. */
  isDistraction: boolean;
}

export type ExecutionPhaseStatus = 'pending' | 'active' | 'complete' | 'aborted' | 'failed';

export interface ExecutionPhase {
  id: PhaseId;
  name: string;
  durationMinutes: number;
  assignedCrew: ContactId[];
  prerequisites: PhaseId[];
  /** Abstract challenge to resolve — no real-world bypass. */
  abstractChallenge?: string;
  /** Telegraphed complication that may activate. */
  complicationTrigger?: string;
}

export interface ScenarioPackage {
  id: ScenarioId;
  version: string;
  seed: number;
  title: string;
  targetName: string;
  location: string;
  /** The sparse dossier shown at campaign start. */
  openingDossier: string;
  /** The intro message from the unknown contact. */
  openingMessage: string;
  contacts: {
    public: ContactPublicProfile[];
    private: ContactPrivateProfile[];
  };
  relationships: PrivateRelationship[];
  tasks: TaskDefinition[];
  executionPhases: ExecutionPhase[];
  dialogueFixtures: AuthoredDialogueFixture[];
  attachmentManifest: AttachmentId[];
}

// ─── Campaign State (player progress) ────────────────────────────────────────

export interface CrewContract {
  contactId: ContactId;
  agreedRate: number;
  hiredAt: number; // epoch ms
  /** Promises the player made in writing during recruitment. */
  playerPromises: string[];
  trustLevel: number; // 0-100
  stressLevel: number; // 0-100
}

export interface ScheduledTask {
  id: string; // unique per instance
  taskId: TaskId;
  assignedCrewId: ContactId;
  startedAt: number; // epoch ms
  completesAt: number; // epoch ms
  status: 'pending' | 'complete';
  /** Which attachment IDs the player can see after completion. */
  revealedAttachments: AttachmentId[];
}

export interface DisclosedKnowledge {
  /** What each crew member has been told or discovered. */
  crewKnowledge: Record<ContactId, string[]>;
  /** Attachments the player has received. */
  playerAttachments: AttachmentId[];
  /** Tasks that have been completed (no duplicates). */
  completedTaskIds: TaskId[];
}

export interface PlanVersion {
  version: number;
  phases: Array<{
    phaseId: PhaseId;
    assignedCrew: ContactId[];
    notes: string;
  }>;
  /** Fallback orders per phase. */
  fallbackOrders: Record<PhaseId, string>;
  draftedAt: number; // epoch ms
}

export type OperationStatus =
  | 'not_started'
  | 'planning'
  | 'in_progress'
  | 'completed'
  | 'aborted';

export interface OperationState {
  status: OperationStatus;
  currentPhaseId?: PhaseId;
  completedPhases: PhaseId[];
  abortedAtPhase?: PhaseId;
  radioLog: RadioEntry[];
  commandLog: CommandEntry[];
  startedAt?: number;
  endedAt?: number;
}

export interface RadioEntry {
  id: string;
  timestamp: number; // epoch ms
  fromCrewId: ContactId;
  /** Only shown if the crew member could plausibly know this. */
  message: string;
  type: 'status' | 'complication' | 'relationship' | 'abort' | 'confirm';
  /** Whether this surfaces a private relationship. */
  revealsRelationship?: string;
}

export interface CommandEntry {
  id: string;
  timestamp: number; // epoch ms
  command: AllowedCommand;
  targetPhase?: PhaseId;
  playerText: string;
}

export type AllowedCommand = 'ask_status' | 'hold' | 'continue' | 'regroup' | 'abort';

export interface AftermathRecord {
  outcomeType: 'completed' | 'aborted';
  primaryConsequence: string;
  crewStatus: Record<ContactId, 'ok' | 'stressed' | 'unavailable'>;
  knowledgeLeaked: boolean;
  financesAfter: number;
  savedAt: number; // epoch ms
}

export interface CampaignState {
  id: CampaignId;
  scenarioId: ScenarioId;
  seed: number;
  startedAt: number; // epoch ms
  /** Last known wall-clock time (for dev harness time injection). */
  currentTime: number; // epoch ms
  crew: CrewContract[];
  scheduledTasks: ScheduledTask[];
  knowledge: DisclosedKnowledge;
  playerNotes: string;
  plan: PlanVersion | null;
  operation: OperationState;
  finances: number;
  aftermath: AftermathRecord | null;
  /** Immutable event log. */
  events: GameEvent[];
  /** Mail thread between player and contacts. */
  mailThreads: MailThread[];
  /** Per-contact negotiation state (engine-tracked, not inferred from text). */
  negotiationStates: Record<ContactId, NegotiationState>;
}

// ─── Events (immutable log) ───────────────────────────────────────────────────

// ─── Negotiation State ───────────────────────────────────────────────────────

/**
 * Explicit negotiation state tracked by the engine per contact.
 * State transitions are driven by rules, not by text matching.
 */
export type NegotiationPhase = 'initial' | 'negotiating' | 'accepted' | 'rejected';

export interface NegotiationState {
  contactId: ContactId;
  phase: NegotiationPhase;
  /** Concern keys that have been addressed by the player (engine-tracked). */
  resolvedConcerns: string[];
  /** Concern keys still outstanding. */
  outstandingConcerns: string[];
  /** Number of exchanges in this negotiation. */
  exchangeCount: number;
  /** Timestamp when negotiation started. */
  startedAt: number;
  /** Timestamp of last state transition. */
  lastTransitionAt: number;
  /** Intent fingerprint of the last player message (for repeat-detection). */
  lastFingerprint?: string;
}

export type GameEventType =
  | 'campaign_started'
  | 'mail_sent'
  | 'mail_received'
  | 'crew_invited'
  | 'crew_negotiated'
  | 'negotiation_started'
  | 'negotiation_concern_resolved'
  | 'negotiation_completed'
  | 'crew_hired'
  | 'crew_declined'
  | 'task_started'
  | 'task_completed'
  | 'knowledge_disclosed'
  | 'plan_drafted'
  | 'operation_started'
  | 'command_issued'
  | 'phase_started'
  | 'phase_completed'
  | 'complication_triggered'
  | 'relationship_surfaced'
  | 'operation_completed'
  | 'operation_aborted'
  | 'aftermath_saved';

export interface GameEvent {
  id: EventId;
  type: GameEventType;
  timestamp: number; // epoch ms
  causedBy?: EventId;
  /** Player-visible summary. */
  summary: string;
  /** Full data — may contain private info for developer debugging. */
  data: Record<string, unknown>;
  /** Whether this event's data is safe for player export. */
  playerVisible: boolean;
}

// ─── Mail ─────────────────────────────────────────────────────────────────────

export interface MailMessage {
  id: string;
  from: 'player' | ContactId;
  to: 'player' | ContactId;
  subject: string;
  body: string;
  timestamp: number; // epoch ms
  attachments: AttachmentId[];
}

export interface MailThread {
  id: string;
  withContactId: ContactId;
  messages: MailMessage[];
}

// ─── Natural Language Proposal ────────────────────────────────────────────────

export type IntentType =
  | 'recruit'
  | 'negotiate'
  | 'query_crew'
  | 'assign_task'
  | 'draft_plan'
  | 'issue_command'
  | 'unknown';

export interface NLProposal {
  intent: IntentType;
  recipientId?: ContactId;
  taskCategory?: 'observe' | 'review' | 'assess';
  references: string[];
  ambiguousFields: string[];
  suggestedReply?: string;
  /** Whether this was rejected and why. */
  rejected?: string;
  /** Clarification request — no world mutation happened. */
  clarification?: string;
}
