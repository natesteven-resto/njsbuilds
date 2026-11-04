'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { DEFAULT_DOGS, DEFAULT_PEOPLE, HUNT_DEFAULTS, type Dog, type Person } from './data'

export const STORAGE_KEY = 'njs:pheasanthunt2026:v1'

export interface CustomItem {
  id: string
  label: string
}

export interface DayLog {
  date: string
  roosters: Record<string, number>
  note?: string
}

export interface HuntState {
  v: 1
  huntDate: string
  locationName: string
  regionId: string
  people: Person[]
  dogs: Dog[]
  checks: Record<string, boolean>
  custom: Record<string, CustomItem[]>
  tally: {
    roosters: Record<string, number>
    shots: Record<string, number>
    dogs: Record<string, { flush: number; retrieve: number }>
  }
  log: DayLog[]
  rulesAck: Record<string, boolean>
}

export function defaultState(): HuntState {
  return {
    v: 1,
    huntDate: HUNT_DEFAULTS.huntDate,
    locationName: HUNT_DEFAULTS.locationName,
    regionId: HUNT_DEFAULTS.regionId,
    people: DEFAULT_PEOPLE.map((p) => ({ ...p })),
    dogs: DEFAULT_DOGS.map((d) => ({ ...d })),
    checks: {},
    custom: {},
    tally: { roosters: {}, shots: {}, dogs: {} },
    log: [],
    rulesAck: {},
  }
}

function merge(saved: Partial<HuntState> | null): HuntState {
  const d = defaultState()
  if (!saved || typeof saved !== 'object') return d
  return {
    ...d,
    ...saved,
    v: 1,
    people: Array.isArray(saved.people) && saved.people.length === 3 ? saved.people : d.people,
    dogs: Array.isArray(saved.dogs) && saved.dogs.length === 3 ? saved.dogs : d.dogs,
    checks: saved.checks && typeof saved.checks === 'object' ? saved.checks : {},
    custom: saved.custom && typeof saved.custom === 'object' ? saved.custom : {},
    tally: {
      roosters: saved.tally?.roosters ?? {},
      shots: saved.tally?.shots ?? {},
      dogs: saved.tally?.dogs ?? {},
    },
    log: Array.isArray(saved.log) ? saved.log : [],
    rulesAck: saved.rulesAck && typeof saved.rulesAck === 'object' ? saved.rulesAck : {},
  }
}

/* ── tiny external store backed by localStorage ──────────────────────────── */
const SERVER_STATE: HuntState = defaultState()
let cache: HuntState | null = null
let persistTimer: number | null = null
const listeners = new Set<() => void>()

function load(): HuntState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? merge(JSON.parse(raw)) : defaultState()
  } catch {
    return defaultState()
  }
}

function getSnapshot(): HuntState {
  if (!cache) cache = load()
  return cache
}

function getServerSnapshot(): HuntState {
  return SERVER_STATE
}

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return
    cache = load()
    emit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

function persist(s: HuntState) {
  if (persistTimer) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch {
      /* private mode / quota */
    }
  }, 120)
}

export type Updater = (fn: (s: HuntState) => HuntState) => void

const setExternal: Updater = (fn) => {
  cache = fn(getSnapshot())
  persist(cache)
  emit()
}

const subTrue = () => () => {}

export function useHuntStore(): [HuntState, Updater, boolean] {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const hydrated = useSyncExternalStore(subTrue, () => true, () => false)
  const update = useCallback<Updater>((fn) => setExternal(fn), [])
  return [state, update, hydrated]
}

export function checkKey(listId: string, itemId: string, ownerId: string): string {
  return `${listId}|${itemId}|${ownerId}`
}
