/**
 * Campaign factory — creates new campaigns and wires up all engine components.
 * One unfinished campaign survives app closure via PersistenceStore.
 */

import {
  CampaignState,
  ScenarioPackage,
  DisclosedKnowledge,
  OperationState,
} from '../domain/types';
import { ClockService } from './clock';
import { EventLog } from './eventLog';
import { RulesEngine } from './rulesEngine';
import { PersistenceStore } from './persistence';

export interface CampaignSession {
  campaign: CampaignState;
  engine: RulesEngine;
  log: EventLog;
  store: PersistenceStore;
  clock: ClockService;
}

let _idCounter = 0;
function genCampaignId(): string {
  return `campaign_${Date.now()}_${++_idCounter}`;
}

export function createCampaign(
  scenario: ScenarioPackage,
  clock: ClockService,
  store: PersistenceStore,
  overrideSeed?: number
): CampaignSession {
  const log = new EventLog();
  const engine = new RulesEngine(scenario, clock, log);

  const seed = overrideSeed ?? scenario.seed;

  const emptyKnowledge: DisclosedKnowledge = {
    crewKnowledge: {},
    playerAttachments: [],
    completedTaskIds: [],
  };

  const emptyOperation: OperationState = {
    status: 'not_started',
    completedPhases: [],
    radioLog: [],
    commandLog: [],
  };

  const campaign: CampaignState = {
    id: genCampaignId(),
    scenarioId: scenario.id,
    seed,
    startedAt: clock.now(),
    currentTime: clock.now(),
    crew: [],
    scheduledTasks: [],
    knowledge: emptyKnowledge,
    playerNotes: '',
    plan: null,
    operation: emptyOperation,
    finances: 0,
    aftermath: null,
    events: [],
    mailThreads: [],
    negotiationStates: {},
  };

  // Record campaign start event.
  log.append(
    'campaign_started',
    `Campaign started — scenario: ${scenario.title}`,
    { scenarioId: scenario.id, seed, startedAt: campaign.startedAt },
    { timestamp: clock.now() }
  );

  // Initial save.
  store.saveCampaign(campaign);

  return { campaign, engine, log, store, clock };
}

export function restoreCampaign(
  campaignId: string,
  scenario: ScenarioPackage,
  clock: ClockService,
  store: PersistenceStore
): CampaignSession | null {
  const saved = store.loadCampaign(campaignId);
  if (!saved) return null;

  const log = new EventLog();
  log.loadFrom(saved.events);

  // Restore clock to campaign's last known time.
  // (DevClock will be advanced by harness; wall clock stays real.)
  const engine = new RulesEngine(scenario, clock, log);

  return { campaign: saved, engine, log, store, clock };
}

/** Save campaign and sync events to store. */
export function saveCampaign(session: CampaignSession): void {
  // Sync events into campaign state for JSON persistence.
  session.campaign.events = session.log.toJSON();
  session.campaign.currentTime = session.clock.now();
  session.store.saveCampaign(session.campaign);
  // Also write each new event to the log table.
  for (const event of session.campaign.events) {
    session.store.appendEvent(session.campaign.id, event);
  }
}
