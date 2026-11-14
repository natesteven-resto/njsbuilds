'use client'

import { useSyncExternalStore } from 'react'
import { emptyDB, type DB, type Property, type Settings, type Transaction } from './types'
import { buildSample } from './sample'

export const STORAGE_KEY = 'njs:doorbooks:v1'

const EMPTY = emptyDB()
let db: DB = EMPTY
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Quota or private mode — keep going in memory.
  }
}

function normalize(raw: unknown): DB | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<DB>
  if (!Array.isArray(r.properties) || !Array.isArray(r.transactions)) return null
  const base = emptyDB()
  return {
    version: 1,
    properties: r.properties.map((p) => ({ ...p, units: Array.isArray(p.units) ? p.units : [] })),
    transactions: r.transactions,
    settings: { ...base.settings, ...(r.settings ?? {}) },
  }
}

function loadOnce() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = normalize(JSON.parse(raw))
      if (parsed) db = parsed
    }
  } catch {
    // Corrupt JSON — start fresh rather than crash.
  }
}

function subscribe(l: () => void) {
  listeners.add(l)
  if (!hydrated && typeof window !== 'undefined') {
    loadOnce()
    // Notify on the next tick so the first client render swaps from the server snapshot.
    queueMicrotask(emit)
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    try {
      const parsed = normalize(JSON.parse(e.newValue))
      if (parsed) { db = parsed; emit() }
    } catch {
      // Ignore malformed cross-tab writes.
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

const getSnapshot = () => db
const getServerSnapshot = () => EMPTY
const getHydrated = () => hydrated
const getNotHydrated = () => false

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getHydrated, getNotHydrated)
}

function set(next: DB) {
  db = next
  persist()
  emit()
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Actions ─────────────────────────────────────────────────────

export function addProperty(p: Omit<Property, 'id' | 'createdAt'>): Property {
  const prop: Property = { ...p, id: uid(), createdAt: Date.now() }
  set({ ...db, properties: [...db.properties, prop] })
  return prop
}

export function updateProperty(id: string, patch: Partial<Property>) {
  set({ ...db, properties: db.properties.map((p) => (p.id === id ? { ...p, ...patch, id } : p)) })
}

export function deleteProperty(id: string) {
  set({
    ...db,
    properties: db.properties.filter((p) => p.id !== id),
    transactions: db.transactions.filter((t) => t.propertyId !== id),
  })
}

export function addTransaction(t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
  const now = Date.now()
  const tx: Transaction = { ...t, id: uid(), createdAt: now, updatedAt: now }
  set({
    ...db,
    transactions: [...db.transactions, tx],
    settings: { ...db.settings, lastPropertyId: t.propertyId, lastAccount: t.account || db.settings.lastAccount },
  })
  return tx
}

export function updateTransaction(id: string, patch: Partial<Transaction>) {
  set({ ...db, transactions: db.transactions.map((t) => (t.id === id ? { ...t, ...patch, id, updatedAt: Date.now() } : t)) })
}

export function deleteTransaction(id: string): Transaction | undefined {
  const tx = db.transactions.find((t) => t.id === id)
  set({ ...db, transactions: db.transactions.filter((t) => t.id !== id) })
  return tx
}

export function restoreTransaction(tx: Transaction) {
  set({ ...db, transactions: [...db.transactions, tx] })
}

export function updateSettings(patch: Partial<Settings>) {
  set({ ...db, settings: { ...db.settings, ...patch } })
}

export function replaceDB(next: DB) {
  set(next)
}

export function importJSON(text: string): { ok: true; properties: number; transactions: number } | { ok: false; error: string } {
  try {
    const parsed = normalize(JSON.parse(text))
    if (!parsed) return { ok: false, error: 'That file is not a Doorbooks export.' }
    set(parsed)
    return { ok: true, properties: parsed.properties.length, transactions: parsed.transactions.length }
  } catch {
    return { ok: false, error: 'Could not read that file as JSON.' }
  }
}

export function exportJSON(): string {
  return JSON.stringify(db, null, 2)
}

export function resetDB() {
  set(emptyDB())
}

export function loadSample() {
  set(buildSample())
}

/** `?demo=1` on any Doorbooks URL seeds the sample portfolio when the books are empty. */
export function loadSampleIfEmpty(): boolean {
  if (typeof window === 'undefined') return false
  loadOnce()
  if (db.properties.length > 0 || db.transactions.length > 0) return false
  set(buildSample())
  return true
}
