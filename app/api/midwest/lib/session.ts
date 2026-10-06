/**
 * Midwest Job — Next.js session manager.
 * Holds one CampaignSession in module-level memory (survives warm Lambda invocations).
 * SQLite DB at /tmp/midwest-job.db (resets on cold starts — acceptable for testing).
 *
 * IMPORTANT: This is an in-process singleton. On Vercel, each serverless function
 * invocation may get a fresh module scope on cold start. The DB at /tmp persists
 * between warm invocations on the same instance but is not shared across instances.
 * For multi-instance or production use, replace with a proper database.
 */
import path from 'path';
import { CampaignSession } from '@midwest/engine/campaign';
import { PersistenceStore } from '@midwest/engine/persistence';
import { DevClock } from '@midwest/engine/clock';
import { MIDWEST_BANK_SCENARIO } from '@midwest/scenario/midwest-bank';
import {
  createCampaign,
  restoreCampaign,
  saveCampaign,
} from '@midwest/engine/campaign';

const DB_PATH = process.env.MIDWEST_DB_PATH ?? '/tmp/midwest-job.db';

let _store: PersistenceStore | null = null;
let _session: CampaignSession | null = null;

export function getStore(): PersistenceStore {
  if (!_store) {
    _store = new PersistenceStore(DB_PATH);
  }
  return _store;
}

export function getSession(): CampaignSession | null {
  return _session;
}

export function setSession(session: CampaignSession): void {
  _session = session;
}

export function clearSession(): void {
  _session = null;
}

export function loadOrCreateSession(): CampaignSession {
  if (_session) return _session;

  const store = getStore();
  const campaigns = store.listCampaigns();

  if (campaigns.length > 0) {
    const latest = campaigns[0];
    const restored = restoreCampaign(
      latest.id,
      MIDWEST_BANK_SCENARIO,
      new DevClock(Date.now()),
      store
    );
    if (restored) {
      const savedTime = restored.campaign.currentTime;
      const clock = DevClock.fromEpochMs(savedTime);
      restored.clock = clock;
      _session = restored;
      return restored;
    }
  }

  // Create fresh campaign.
  const clock = new DevClock(Date.now());
  const session = createCampaign(MIDWEST_BANK_SCENARIO, clock, store);
  _session = session;
  injectOpeningState(session);
  save();

  return session;
}

function injectOpeningState(session: CampaignSession): void {
  const scenario = MIDWEST_BANK_SCENARIO;
  session.campaign.mailThreads.push({
    id: 'thread_opening',
    withContactId: 'unknown',
    messages: [
      {
        id: 'msg_opening_0',
        from: 'unknown',
        to: 'player',
        subject: 'Something worth your time',
        body: scenario.openingMessage,
        timestamp: session.clock.now() - 3600000,
        attachments: ['opening_dossier'],
      },
    ],
  });
  session.campaign.knowledge.playerAttachments.push('opening_dossier');
}

export function save(): void {
  if (_session) {
    saveCampaign(_session);
  }
}

// Re-export scenario for convenience
export { MIDWEST_BANK_SCENARIO };
