/**
 * Immutable event log with causation IDs, timestamps and knowledge-disclosure events.
 * Private debugging data is kept separate from player-visible transcripts.
 */

import { GameEvent, GameEventType, EventId } from '../domain/types';

let _counter = 0;

function genId(): EventId {
  return `evt_${Date.now()}_${++_counter}`;
}

export class EventLog {
  private _events: GameEvent[] = [];

  /** Append a new event — immutable once added. */
  append(
    type: GameEventType,
    summary: string,
    data: Record<string, unknown>,
    opts: {
      timestamp: number;
      causedBy?: EventId;
      playerVisible?: boolean;
    }
  ): GameEvent {
    const ev: GameEvent = {
      id: genId(),
      type,
      timestamp: opts.timestamp,
      causedBy: opts.causedBy,
      summary,
      data,
      playerVisible: opts.playerVisible ?? true,
    };
    // Freeze so it cannot be mutated after insertion.
    Object.freeze(ev);
    this._events.push(ev);
    return ev;
  }

  /** All events. */
  all(): GameEvent[] {
    return [...this._events];
  }

  /** Only events the player should see. */
  playerVisible(): GameEvent[] {
    return this._events.filter((e) => e.playerVisible);
  }

  /** Events by type. */
  ofType(...types: GameEventType[]): GameEvent[] {
    const set = new Set(types);
    return this._events.filter((e) => set.has(e.type));
  }

  /** Load from persisted array (restore). */
  loadFrom(events: GameEvent[]): void {
    this._events = events.map((e) => Object.freeze({ ...e }));
  }

  /** Serialize for persistence. */
  toJSON(): GameEvent[] {
    return this._events;
  }
}
