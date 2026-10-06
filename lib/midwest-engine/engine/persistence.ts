/**
 * Durable local persistence using better-sqlite3.
 * Saves every accepted state transition. One campaign survives app closure.
 * Identifiers and versions defined for future backend authority without rewriting domain logic.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CampaignState, GameEvent } from '../domain/types';

const SCHEMA_VERSION = 1;

export class PersistenceStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? path.join(process.cwd(), 'midwest-job.db');
    // Ensure directory exists.
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT ${SCHEMA_VERSION},
        state_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS event_log (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        caused_by TEXT,
        summary TEXT NOT NULL,
        data_json TEXT NOT NULL,
        player_visible INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      );

      INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
    `);
  }

  /** Save or update campaign state atomically. */
  saveCampaign(campaign: CampaignState): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO campaigns (id, scenario_id, version, state_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      campaign.id,
      campaign.scenarioId,
      SCHEMA_VERSION,
      JSON.stringify(campaign),
      Date.now()
    );
  }

  /** Load campaign by ID. Returns null if not found. */
  loadCampaign(campaignId: string): CampaignState | null {
    const row = this.db
      .prepare('SELECT state_json FROM campaigns WHERE id = ?')
      .get(campaignId) as { state_json: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.state_json) as CampaignState;
  }

  /** List all campaign IDs and their scenario. */
  listCampaigns(): Array<{ id: string; scenarioId: string; updatedAt: number }> {
    const rows = this.db
      .prepare('SELECT id, scenario_id, updated_at FROM campaigns ORDER BY updated_at DESC')
      .all() as Array<{ id: string; scenario_id: string; updated_at: number }>;
    return rows.map((r) => ({ id: r.id, scenarioId: r.scenario_id, updatedAt: r.updated_at }));
  }

  /** Append event to log table (in addition to inline campaign JSON). */
  appendEvent(campaignId: string, event: GameEvent): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO event_log (id, campaign_id, event_type, timestamp, caused_by, summary, data_json, player_visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      campaignId,
      event.type,
      event.timestamp,
      event.causedBy ?? null,
      event.summary,
      JSON.stringify(event.data),
      event.playerVisible ? 1 : 0
    );
  }

  /** Load events for a campaign (from log table — private debugging). */
  loadEvents(campaignId: string): GameEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM event_log WHERE campaign_id = ? ORDER BY timestamp ASC')
      .all(campaignId) as Array<{
        id: string;
        campaign_id: string;
        event_type: string;
        timestamp: number;
        caused_by: string | null;
        summary: string;
        data_json: string;
        player_visible: number;
      }>;

    return rows.map((r) => ({
      id: r.id,
      type: r.event_type as GameEvent['type'],
      timestamp: r.timestamp,
      causedBy: r.caused_by ?? undefined,
      summary: r.summary,
      data: JSON.parse(r.data_json),
      playerVisible: r.player_visible === 1,
    }));
  }

  /** Delete all data for a campaign (developer reset only). */
  devResetCampaign(campaignId: string): void {
    this.db.prepare('DELETE FROM event_log WHERE campaign_id = ?').run(campaignId);
    this.db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  }

  close(): void {
    this.db.close();
  }
}
