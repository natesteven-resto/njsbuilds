'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Building2, ChartColumn, DoorOpen, LayoutDashboard, Plus, Settings } from 'lucide-react'
import { loadSampleIfEmpty, useDB } from '../_lib/store'
import type { Transaction } from '../_lib/types'
import { TransactionForm } from './TransactionForm'
import { UIContext, type TxPrefill, type UIApi } from './ui'

const NAV = [
  { href: '/doorbooks', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/doorbooks/properties', label: 'Properties', icon: Building2 },
  { href: '/doorbooks/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/doorbooks/reports', label: 'Reports', icon: ChartColumn },
  { href: '/doorbooks/settings', label: 'Settings', icon: Settings },
]

interface ToastState { id: number; message: string; action?: { label: string; onClick: () => void } }

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const db = useDB()
  const [tx, setTx] = useState<{ open: boolean; edit?: Transaction; prefill?: TxPrefill }>({ open: false })
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openTx = useCallback<UIApi['openTx']>((opts) => {
    setTx({ open: true, edit: opts?.edit, prefill: opts?.prefill })
  }, [])
  const closeTx = useCallback(() => setTx({ open: false }), [])

  const showToast = useCallback<UIApi['toast']>((message, action) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    const id = Date.now()
    setToast({ id, message, action })
    toastTimer.current = setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), action ? 6000 : 3200)
  }, [])

  const api = useMemo<UIApi>(() => ({ openTx, toast: showToast }), [openTx, showToast])

  // Deep links: ?demo=1 seeds the sample portfolio into empty books; ?new=1 opens the transaction sheet
  // (handy for a home-screen shortcut or the iPhone app's quick action).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.has('demo')) loadSampleIfEmpty()
    if (!sp.has('new')) return
    const prefill: TxPrefill | undefined = sp.get('new') === 'rent' ? { kind: 'income', categoryId: 'rent' } : undefined
    const t = setTimeout(() => openTx({ prefill }), 0)
    return () => clearTimeout(t)
  }, [openTx])

  // Keyboard: "n" opens a new transaction anywhere (outside inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      if (tx.open) return
      e.preventDefault()
      openTx()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openTx, tx.open])

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + '/'))
  const canAdd = db.properties.length > 0

  return (
    <UIContext.Provider value={api}>
      <div className="db-shell">
        <nav className="db-nav" aria-label="Main">
          <Link href="/doorbooks" className="db-brand">
            <span className="db-brand-mark"><DoorOpen size={20} /></span>
            <span>
              <span className="db-brand-name db-display">Doorbooks</span>
              <span className="db-brand-sub" style={{ display: 'block' }}>Books for every door</span>
            </span>
          </Link>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="db-navlink" aria-current={isActive(n.href, n.exact) ? 'page' : undefined}>
              <n.icon /> {n.label}
            </Link>
          ))}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" className="db-btn db-btn-primary" onClick={() => openTx()} disabled={!canAdd} style={{ height: 44 }}>
              <Plus /> New transaction <span className="db-kbd" style={{ marginLeft: 4, color: 'inherit', borderColor: 'rgba(0,0,0,.25)', background: 'rgba(0,0,0,.1)' }}>N</span>
            </button>
            <div className="db-faint" style={{ fontSize: 11.5, padding: '0 6px', lineHeight: 1.4 }}>
              {db.settings.businessName}<br />Data stays on this device.
            </div>
          </div>
        </nav>

        <main className="db-main">
          <div className="db-topbar">
            <Link href="/doorbooks" className="db-brand" style={{ padding: 0 }}>
              <span className="db-brand-mark" style={{ width: 30, height: 30 }}><DoorOpen size={18} /></span>
              <span className="db-brand-name db-display" style={{ fontSize: 17 }}>Doorbooks</span>
            </Link>
            <span className="db-sub" style={{ fontSize: 12.5, maxWidth: '50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{db.settings.businessName}</span>
          </div>
          <div className="db-wrap">{children}</div>
        </main>

        <nav className="db-tabbar" aria-label="Main">
          {NAV.slice(0, 2).map((n) => (
            <Link key={n.href} href={n.href} className="db-tab" aria-current={isActive(n.href, n.exact) ? 'page' : undefined}><n.icon />{n.label}</Link>
          ))}
          <div className="db-tab-add">
            <button type="button" onClick={() => openTx()} aria-label="New transaction" disabled={!canAdd} style={canAdd ? undefined : { opacity: .45 }}><Plus /></button>
          </div>
          {NAV.slice(2, 4).map((n) => (
            <Link key={n.href} href={n.href} className="db-tab" aria-current={isActive(n.href, n.exact) ? 'page' : undefined}><n.icon />{n.label}</Link>
          ))}
        </nav>

        {tx.open && <TransactionForm edit={tx.edit} prefill={tx.prefill} onClose={closeTx} />}

        {toast && (
          <div className="db-toast" role="status">
            {toast.message}
            {toast.action && <button type="button" onClick={() => { toast.action?.onClick(); setToast(null) }}>{toast.action.label}</button>}
          </div>
        )}
      </div>
    </UIContext.Provider>
  )
}
