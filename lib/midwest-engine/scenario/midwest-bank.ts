/**
 * Scenario Package: Midwest Bank, Hartwell NE (fictional).
 * All targets, photos, maps, people and systems are fictional.
 * Abstract invented challenge mechanics only — no real security data.
 */

import { ScenarioPackage } from '../domain/types';

export const MIDWEST_BANK_SCENARIO: ScenarioPackage = {
  id: 'midwest-bank-v1',
  version: '1.0.0',
  seed: 20240912,
  title: 'Midwest Bank',
  targetName: 'Midwest Community Bank — Hartwell Branch',
  location: 'Hartwell, NE (fictional)',

  // ─── Opening ──────────────────────────────────────────────────────────────

  openingMessage: `From: anonymous.relay@pm.me
Subject: Something worth your time

Heard you were between jobs. There's a window in a small-town bank in
Nebraska. Nothing glamorous. Quiet town, complacent branch, decent vault.
Dossier attached. Think on it.

The window doesn't stay open.

— A friend`,

  openingDossier: `TARGET DOSSIER — HARTWELL BRANCH (MIDWEST COMMUNITY BANK)
[Sparse — incomplete intelligence follows]

Location: 412 Crane Street, Hartwell, NE (fictional town, fictional bank)
Type: Community branch, single-story
Known staff: Approx. 8-12 (unverified)
Hours: Mon-Fri 09:00-17:00, Sat 09:00-13:00 (unverified)
Vault: Present. Type unknown.
Security: Present. Configuration unknown.
Notable: Annual Hartwell Founders Day — town unusually active late September.

THIS IS INCOMPLETE INTELLIGENCE. DO NOT ACT ON ASSUMPTIONS.
Verify before planning.`,

  // ─── Contacts ─────────────────────────────────────────────────────────────

  contacts: {
    public: [
      {
        id: 'mack',
        handle: 'Mack',
        reputationSummary: 'Reliable observer. Never misses a pattern. Can be difficult to work with.',
        knownRoles: ['observer'],
      },
      {
        id: 'eli',
        handle: 'Eli',
        reputationSummary: 'Technical specialist. Excellent with abstract challenge work. Has a reputation.',
        knownRoles: ['technical'],
        referredBy: undefined,
      },
      {
        id: 'danny',
        handle: 'Danny',
        reputationSummary: 'Driver. Calm, methodical. Referred by Nora. Long history together.',
        knownRoles: ['driver'],
        referredBy: 'nora',
      },
      {
        id: 'nora',
        handle: 'Nora',
        reputationSummary: 'Coordinator. Very organized. Works well with Danny. Skeptical of new people.',
        knownRoles: ['coordinator'],
        referredBy: 'danny',
      },
      {
        id: 'jules',
        handle: 'Jules',
        reputationSummary: 'Support. Good with people, maybe too good. Known to improvise.',
        knownRoles: ['support'],
      },
    ],

    private: [
      {
        id: 'mack',
        realName: 'Marcus Boyle',
        role: 'observer',
        trustRequired: 30,
        negotiates: false,
        blindSpots: ['eli', 'technical work'],
        initialKnowledge: [],
        traits: ['perceptive', 'stubborn', 'patient'],
        dailyRate: 800,
        stressLimit: 70,
      },
      {
        id: 'eli',
        realName: 'Elias Vance',
        role: 'technical',
        trustRequired: 45,
        negotiates: true, // Will negotiate rate upward.
        blindSpots: ['mack', 'team dynamics'],
        initialKnowledge: [],
        traits: ['capable', 'arrogant', 'precise'],
        dailyRate: 1200,
        stressLimit: 60,
      },
      {
        id: 'danny',
        realName: 'Daniel Osei',
        role: 'driver',
        trustRequired: 20,
        negotiates: false,
        blindSpots: [],
        initialKnowledge: [],
        traits: ['calm', 'cautious', 'reliable'],
        dailyRate: 600,
        stressLimit: 80,
      },
      {
        id: 'nora',
        realName: 'Nora Castillo',
        role: 'coordinator',
        trustRequired: 35,
        negotiates: true,
        blindSpots: ['impulsive decisions'],
        initialKnowledge: [],
        traits: ['methodical', 'skeptical', 'precise'],
        dailyRate: 900,
        stressLimit: 75,
      },
      {
        id: 'jules',
        realName: 'Jules Marchand',
        role: 'support',
        trustRequired: 15,
        negotiates: false,
        blindSpots: ['long-form planning'],
        initialKnowledge: [],
        traits: ['sociable', 'impulsive', 'adaptive'],
        dailyRate: 500,
        stressLimit: 65,
      },
    ],
  },

  // ─── Relationships (private world state) ──────────────────────────────────

  relationships: [
    {
      betweenA: 'eli',
      betweenB: 'mack',
      label: 'Clearwater Fallout',
      history: `Three years ago, Eli and Mack worked a job in Clearwater together.
The technical phase ran long because Eli skipped a verification step to save time.
Mack had warned him. The delay exposed them to an unplanned patrol.
They got out, but a support player (not in this game) got caught.
Mack holds Eli directly responsible. Eli believes Mack is exaggerating his fault.
Neither has spoken about it openly. Both assume the other remembers exactly.`,
      valence: 'negative',
      affectedInteractions: [
        'eli_on_crew_blocks_mack_hire',
        'mack_on_crew_blocks_eli_hire',
        'eli_mack_regroup_breakdown',
        'mack_query_eli',
        'exec_conflict_complication',
      ],
      discoverable: true,
    },
    {
      betweenA: 'danny',
      betweenB: 'nora',
      label: 'Old Partnership',
      history: `Danny and Nora worked three jobs together over four years.
They have an efficient shorthand and genuine mutual trust.
Nora trusts Danny's judgment on timing; Danny trusts Nora's read on people.
During the Saltmarsh job, Nora's call to abort at phase two saved both of them.
Danny has never second-guessed her since. Nora knows this and takes it seriously.`,
      valence: 'positive',
      affectedInteractions: [
        'danny_nora_regroup_efficiency',
        'nora_vouches_danny',
        'danny_vouches_nora',
        'danny_nora_exec_coordination',
      ],
      discoverable: true,
    },
  ],

  // ─── Tasks ────────────────────────────────────────────────────────────────

  tasks: [
    // Task 1: Observe town activity (observer role, 2 days)
    {
      id: 'task_observe_town',
      title: 'Observe Hartwell Town Activity',
      category: 'observe',
      durationDays: 2,
      requiredRole: 'observer',
      isDistraction: false,
      observations: [
        {
          attachmentId: 'obs_town_patterns',
          title: 'Hartwell Behavioral Patterns',
          content: `Hartwell is quiet most of the week. Traffic peaks Tuesday and Friday mornings
(market day delivery trucks). The bank block sees low foot traffic outside business hours.
Staff arrive between 08:30-08:50. Two employees smoke outside at ~10:15 and ~14:30.
One patrol car makes a visible pass roughly every 40 minutes on Crane Street.
NOTE: Founders Day weekend (last Saturday of September) brings unusually high town activity —
could complicate or assist an approach. Observed one unmarked grey sedan parked across
from the bank on Tuesday afternoon for approx. 90 minutes. Could be nothing.`,
          containsMisleadingDetail: true,
          privateCorrection: `The patrol interval is actually 55 minutes, not 40. Mack miscounted because
he was watching across two days with different officers. The Tuesday grey sedan was
a visiting insurance adjuster, unrelated to bank security.`,
          contradictedByTaskId: undefined,
        },
      ],
    },

    // Task 2: Review public case material (any role, 1 day)
    {
      id: 'task_review_public',
      title: 'Review Fictional Public Case Material',
      category: 'review',
      durationDays: 1,
      requiredRole: undefined,
      isDistraction: false,
      contradictsTask: undefined,
      observations: [
        {
          attachmentId: 'obs_public_records',
          title: 'Hartwell Branch — Public Record Review',
          content: `Hartwell Community Bank incorporated 1987. Publicly listed assets: mid-tier.
Planning records show the branch was last renovated 2019. Permit filings reference
a "security system upgrade" in the renovation scope.
Local business license records: 8 staff names on file (public registry).
No public record of vault type or capacity.
GAPS: Security configuration, current access protocols, and staffing schedule are
not publicly available. The 2019 security upgrade scope is vague — could be cameras,
alarms, or access control. Cannot determine from public record alone.
One local news item from 2021: bank sponsored Founders Day parade. The manager
at that time was referenced as "Gerald Parr." Current management unverified.`,
          containsMisleadingDetail: false,
        },
      ],
    },

    // Task 3: Assess abstract scenario challenge (technical role, 1 day)
    // This CONTRADICTS the public record assumption about the security upgrade being minor.
    {
      id: 'task_assess_challenge',
      title: 'Assess Abstract Scenario Challenge',
      category: 'assess',
      durationDays: 1,
      requiredRole: 'technical',
      isDistraction: false,
      contradictsTask: 'task_review_public',
      observations: [
        {
          attachmentId: 'obs_challenge_assessment',
          title: 'Abstract Challenge Assessment',
          content: `Reviewed the scenario challenge parameters against current capability.
The 2019 "security upgrade" referenced in public filings appears to be substantially
more sophisticated than the permit language suggests. Cross-referencing the equipment
footprint (publicly visible mounting points, cable conduit runs on exterior) with
known challenge profiles: this matches a Tier 3 abstract system configuration,
not the Tier 1 the public filing language implies.
This CONTRADICTS the earlier assumption from public records that the upgrade was routine.
Capability assessment: the abstract challenge is solvable but will require additional
preparation time and the right equipment. Current loadout is insufficient.
Confidence: Medium. Could not confirm vendor or full scope without closer access.`,
          containsMisleadingDetail: false,
          contradictedByTaskId: 'task_review_public',
        },
      ],
    },

    // Task 4: Harmless distraction — review old news (any role, 1 day)
    {
      id: 'task_founders_day_research',
      title: 'Research Founders Day History',
      category: 'review',
      durationDays: 1,
      requiredRole: undefined,
      isDistraction: true,
      observations: [
        {
          attachmentId: 'obs_founders_day',
          title: 'Hartwell Founders Day — Historical Notes',
          content: `Founders Day has been celebrated since 1952. The 2022 parade drew ~800 people.
Local businesses donate prizes. The bank has been a consistent sponsor.
A 1998 newspaper mentions a cash delivery to the bank the Friday before Founders Day
for the parade prize fund — this pattern may or may not still occur.
ASSESSMENT: Interesting local color. The Friday cash delivery note is old and unverified.
Do not treat this as actionable intelligence without current confirmation.
This task was a distraction from more useful investigation.`,
          containsMisleadingDetail: false,
        },
      ],
    },
  ],

  // ─── Execution Phases ─────────────────────────────────────────────────────

  executionPhases: [
    {
      id: 'phase_approach',
      name: 'Approach',
      durationMinutes: 20,
      assignedCrew: ['danny', 'jules'],
      prerequisites: [],
      abstractChallenge: 'Navigate to target without drawing attention during active hours.',
      complicationTrigger: 'elevated_patrol_frequency',
    },
    {
      id: 'phase_entry',
      name: 'Entry',
      durationMinutes: 15,
      assignedCrew: ['eli'],
      prerequisites: ['phase_approach'],
      abstractChallenge: 'Resolve Tier 3 abstract challenge system.',
      complicationTrigger: 'secondary_system_active',
    },
    {
      id: 'phase_interior',
      name: 'Interior',
      durationMinutes: 25,
      assignedCrew: ['nora', 'eli'],
      prerequisites: ['phase_entry'],
      abstractChallenge: 'Navigate interior, locate vault access, handle staff response.',
    },
    {
      id: 'phase_extraction',
      name: 'Extraction',
      durationMinutes: 10,
      assignedCrew: ['danny'],
      prerequisites: ['phase_interior'],
      abstractChallenge: 'Exit cleanly within window.',
    },
  ],

  // ─── Authored Dialogue Fixtures ───────────────────────────────────────────
  // All marked [AUTHORED] by the engine prefix. Clearly labeled as mock dialogue.

  dialogueFixtures: [
    // Mack recruitment
    {
      id: 'mack_recruit_polite',
      contactId: 'mack',
      trigger: 'recruitment_invite_polite',
      lines: [
        `[AUTHORED] You're polite. I'll give you that.`,
        `Nebraska's quiet enough. Tell me the specifics — what do you need on the ground`,
        `and for how long. I don't do open-ended commitments.`,
      ],
    },
    {
      id: 'mack_recruit_direct',
      contactId: 'mack',
      trigger: 'recruitment_invite_direct',
      lines: [
        `[AUTHORED] Direct. I can work with that. What's the role, what's the window,`,
        `and who else is on this? That last part matters more than the rate.`,
      ],
    },
    {
      id: 'mack_decline_conflict',
      contactId: 'mack',
      trigger: 'recruitment_decline_conflict',
      lines: [
        `[AUTHORED] I saw who you've got on the technical side.`,
        `That's a hard no from me. We don't work together. Don't ask me to explain it.`,
      ],
    },
    {
      id: 'mack_decline_low_trust',
      contactId: 'mack',
      trigger: 'recruitment_decline_low_trust',
      lines: [
        `[AUTHORED] I don't know you. Send me something worth reading`,
        `and maybe we talk. Right now you're a cold call.`,
      ],
    },
    {
      id: 'mack_query_unknown',
      contactId: 'mack',
      trigger: 'query_unknown',
      lines: [
        `[AUTHORED] I don't have that. Whatever you're looking for,`,
        `it wasn't in my brief. You'd need to run another look.`,
      ],
    },
    {
      id: 'mack_query_known',
      contactId: 'mack',
      trigger: 'query_known_task',
      lines: [
        `[AUTHORED] Based on what I watched — the pattern holds Tuesday and Friday.`,
        `That patrol interval I clocked, I'm fairly confident on. Don't quote me on the sedan though.`,
        `That could be anybody.`,
      ],
    },
    {
      id: 'mack_conflict_eli',
      contactId: 'mack',
      trigger: 'conflict_mention_eli_mack',
      lines: [
        `[AUTHORED] That name's not something I discuss on a job.`,
        `If you've hired him, I need to know before we go further. There's history.`,
        `It's not personal in the way people mean when they say that.`,
        `It's professional, which is worse.`,
      ],
      revealsRelationship: 'Clearwater Fallout',
    },

    // Eli recruitment
    {
      id: 'eli_recruit_negotiate',
      contactId: 'eli',
      trigger: 'recruitment_negotiate_rate',
      lines: [
        `[AUTHORED] The job sounds workable. The rate doesn't.`,
        `I've seen what Tier 3 challenge systems cost to solve — in time, in gear, in risk.`,
        `There are two things I need before we go further. Tell me the score is worth my time.`,
        `And tell me how you're handling the crew roster. Specifically Mack.`,
      ],
    },
    {
      id: 'eli_recruit_score_concern',
      contactId: 'eli',
      trigger: 'recruitment_negotiate_score_concern',
      lines: [
        `[AUTHORED] I've heard promises before. Tell me this score is worth my time.`,
        `Not 'trust me.' Give me something concrete — numbers, take, what's in the vault.`,
        `Then we'll talk about the other thing.`,
      ],
    },
    {
      id: 'eli_recruit_mack_concern',
      contactId: 'eli',
      trigger: 'recruitment_negotiate_mack_concern',
      lines: [
        `[AUTHORED] You haven't addressed the Mack situation.`,
        `I need separate assignments. Different phases, no overlap, no shared comms during.`,
        `That's not a preference. That's a condition.`,
      ],
    },
    {
      id: 'eli_recruit_mack_path',
      contactId: 'eli',
      trigger: 'recruitment_negotiate_mack_path',
      lines: [
        `[AUTHORED] I just found out Mack is already on this.`,
        `Then I need to hear you say it out loud — Clearwater wasn't my fault alone.`,
        `You know what happened. He knows. You're asking me to work adjacent to someone`,
        `who blames me for a job that went sideways because we both made calls.`,
        `Assign us to separate phases, non-overlapping, and acknowledge the history. That's the deal.`,
      ],
      revealsRelationship: 'Clearwater Fallout',
    },
    {
      id: 'eli_recruit_repeated',
      contactId: 'eli',
      trigger: 'recruitment_negotiate_repeated_intent',
      lines: [
        `[AUTHORED] You're not hearing me.`,
        `I said what I said. Same answer twice doesn't move this forward.`,
        `Try actually addressing what I asked.`,
      ],
    },
    {
      id: 'eli_recruit_polite',
      contactId: 'eli',
      trigger: 'recruitment_invite_polite',
      lines: [
        `[AUTHORED] Alright. You addressed what I needed to hear.`,
        `I'm in. Get me the technical brief and I'll handle the Tier 3 system.`,
      ],
    },
    {
      id: 'eli_decline_low_trust',
      contactId: 'eli',
      trigger: 'recruitment_decline_low_trust',
      lines: [
        `[AUTHORED] You're asking me to walk into a Nebraska bank based on a cold message.`,
        `I don't do that. Get me a referral or a track record. Then ask again.`,
      ],
    },
    {
      id: 'eli_query_unknown',
      contactId: 'eli',
      trigger: 'query_unknown',
      lines: [
        `[AUTHORED] That's not something I have. You want me to speculate? Fine.`,
        `But I'll label it as speculation. I don't invent facts on a job — that's how people get caught.`,
      ],
    },
    {
      id: 'eli_status_complication',
      contactId: 'eli',
      trigger: 'exec_status_complication',
      lines: [
        `[AUTHORED] There's a secondary response layer that wasn't in the public assessment.`,
        `I'm not surprised — I flagged the gap in my report. This matches the Tier 3 footprint.`,
        `I can route around it but I need five more minutes. Just keep the approach window open.`,
      ],
    },

    // Danny recruitment
    {
      id: 'danny_recruit_polite',
      contactId: 'danny',
      trigger: 'recruitment_invite_polite',
      lines: [
        `[AUTHORED] Nora mentioned you might reach out.`,
        `Nebraska's a clean run. I'll hear the brief. Send me the window and extraction route.`,
        `I don't like surprises on the drive out.`,
      ],
    },
    {
      id: 'danny_recruit_direct',
      contactId: 'danny',
      trigger: 'recruitment_invite_direct',
      lines: [
        `[AUTHORED] Alright. What's the timeline and the exit?`,
        `If Nora's involved I'm already half in. Just need the details.`,
      ],
    },
    {
      id: 'danny_query_unknown',
      contactId: 'danny',
      trigger: 'query_unknown',
      lines: [
        `[AUTHORED] I don't know that. I know the roads and I know the window.`,
        `Anything else you're asking me is outside what I've seen.`,
      ],
    },
    {
      id: 'danny_exec_ok',
      contactId: 'danny',
      trigger: 'exec_status_ok',
      lines: [
        `[AUTHORED] Approach is clean. Sitting at the secondary point. No change.`,
      ],
    },
    {
      id: 'danny_abort',
      contactId: 'danny',
      trigger: 'exec_abort_acknowledged',
      lines: [
        `[AUTHORED] Abort confirmed. Pulling everyone back now. We're not fully clean —`,
        `Eli was visible on approach. He needs to stay off Crane Street for a while.`,
        `We move in the next ninety seconds or we walk anyway.`,
      ],
    },
    {
      id: 'danny_regroup',
      contactId: 'danny',
      trigger: 'exec_regrouped',
      lines: [
        `[AUTHORED] Nora, fall back to the Elm Street secondary. I'm calling the regroup.`,
        `Everyone hold until I say move.`,
      ],
    },

    // Nora recruitment
    {
      id: 'nora_recruit_negotiate',
      contactId: 'nora',
      trigger: 'recruitment_negotiate_rate',
      lines: [
        `[AUTHORED] I coordinate, which means I'm managing everyone else's problems`,
        `in addition to my own. The rate needs to reflect that.`,
        `Come up on the number and I'll draft you a proper timeline.`,
      ],
    },
    {
      id: 'nora_recruit_polite',
      contactId: 'nora',
      trigger: 'recruitment_invite_polite',
      lines: [
        `[AUTHORED] You've done your homework — Danny vouched for you, which counts for something.`,
        `I have questions about the scope before I commit. Who else is on the crew,`,
        `and what's the investigation timeline? I don't walk into underprepared jobs.`,
      ],
    },
    {
      id: 'nora_decline_low_trust',
      contactId: 'nora',
      trigger: 'recruitment_decline_low_trust',
      lines: [
        `[AUTHORED] I don't know enough about you yet. Danny might vouch but`,
        `I make my own calls. Give it another exchange and we'll see.`,
      ],
    },
    {
      id: 'nora_query_unknown',
      contactId: 'nora',
      trigger: 'query_unknown',
      lines: [
        `[AUTHORED] That's outside what I have. I can tell you what I know,`,
        `not what I don't. You're looking for something specific — tell me`,
        `and I'll tell you if I've seen it or not.`,
      ],
    },

    // Jules recruitment
    {
      id: 'jules_recruit_polite',
      contactId: 'jules',
      trigger: 'recruitment_invite_polite',
      lines: [
        `[AUTHORED] Oh, Nebraska! I've never been. Count me in.`,
        `I'm good with people and I'm good at improvising. What do you need?`,
      ],
    },
    {
      id: 'jules_recruit_direct',
      contactId: 'jules',
      trigger: 'recruitment_invite_direct',
      lines: [
        `[AUTHORED] Yeah, I'm available. When and where?`,
        `I move fast and I adapt. Just tell me the cover story.`,
      ],
    },
    {
      id: 'jules_query_unknown',
      contactId: 'jules',
      trigger: 'query_unknown',
      lines: [
        `[AUTHORED] Honestly? No idea. I know my piece of this.`,
        `Anything outside the approach side — you'd want Nora or Mack for that.`,
      ],
    },
  ],

  attachmentManifest: [
    'obs_town_patterns',
    'obs_public_records',
    'obs_challenge_assessment',
    'obs_founders_day',
  ],
};
