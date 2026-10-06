/**
 * Clock service — injected so the developer harness can advance time instantly.
 * Production work uses real elapsed time. Advancing time resolves scheduled
 * events consistently and only once.
 */

export interface ClockService {
  now(): number; // epoch ms
  advanceTo(epochMs: number): void;
  advanceDays(days: number): void;
  advanceMinutes(minutes: number): void;
}

/** Real-time clock for production. */
export class WallClock implements ClockService {
  now(): number {
    return Date.now();
  }
  advanceTo(_epochMs: number): void {
    throw new Error('WallClock: cannot advance real time');
  }
  advanceDays(_days: number): void {
    throw new Error('WallClock: cannot advance real time');
  }
  advanceMinutes(_minutes: number): void {
    throw new Error('WallClock: cannot advance real time');
  }
}

/** Controllable dev-harness clock. Time starts at given epoch or now. */
export class DevClock implements ClockService {
  private _time: number;

  constructor(startMs?: number) {
    this._time = startMs ?? Date.now();
  }

  now(): number {
    return this._time;
  }

  advanceTo(epochMs: number): void {
    if (epochMs < this._time) {
      throw new Error(`DevClock: cannot go backwards (${epochMs} < ${this._time})`);
    }
    this._time = epochMs;
  }

  advanceDays(days: number): void {
    this._time += days * 24 * 60 * 60 * 1000;
  }

  advanceMinutes(minutes: number): void {
    this._time += minutes * 60 * 1000;
  }

  /** Serialize for campaign state persistence. */
  toEpochMs(): number {
    return this._time;
  }

  /** Restore from persisted epoch. */
  static fromEpochMs(ms: number): DevClock {
    return new DevClock(ms);
  }
}
