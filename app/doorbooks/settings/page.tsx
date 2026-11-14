'use client'

import { useRef, useState } from 'react'
import { Cloud, Download, Plus, RotateCcw, Smartphone, Sparkles, Trash2, Upload } from 'lucide-react'
import { useUI } from '../_components/ui'
import { downloadText } from '../_lib/csv'
import { today } from '../_lib/dates'
import { exportJSON, importJSON, loadSample, resetDB, updateSettings, useDB, useHydrated } from '../_lib/store'

export default function SettingsPage() {
  const db = useDB()
  const hydrated = useHydrated()
  const { toast } = useUI()
  const [newAccount, setNewAccount] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSample, setConfirmSample] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!hydrated) return <div className="db-skel" style={{ height: 300 }} />

  const addAccount = () => {
    const a = newAccount.trim()
    if (!a || db.settings.accounts.includes(a)) return
    updateSettings({ accounts: [...db.settings.accounts, a] })
    setNewAccount('')
  }
  const removeAccount = (a: string) => updateSettings({ accounts: db.settings.accounts.filter((x) => x !== a) })

  const onImport = async (file: File) => {
    const text = await file.text()
    const res = importJSON(text)
    if (res.ok) toast('Imported ' + res.properties + ' properties and ' + res.transactions + ' transactions')
    else toast(res.error)
    if (fileRef.current) fileRef.current.value = ''
  }

  const hasData = db.properties.length > 0 || db.transactions.length > 0
  const bytes = typeof window !== 'undefined' ? (window.localStorage.getItem('njs:doorbooks:v1')?.length ?? 0) : 0

  return (
    <div className="db-page" style={{ maxWidth: 720 }}>
      <div>
        <h1 className="db-h1 db-display">Settings</h1>
        <div className="db-sub">Business, accounts and your data.</div>
      </div>

      <div className="db-card db-card-pad" style={{ display: 'grid', gap: 12 }}>
        <h2 className="db-h2">Business</h2>
        <div className="db-field">
          <label className="db-label" htmlFor="s-name">Business name</label>
          <input id="s-name" className="db-input" value={db.settings.businessName} onChange={(e) => updateSettings({ businessName: e.target.value })} placeholder="NJS Properties LLC" />
          <div className="db-help" style={{ marginTop: 6 }}>Shown on the dashboard and printed reports.</div>
        </div>
      </div>

      <div className="db-card db-card-pad" style={{ display: 'grid', gap: 12 }}>
        <div>
          <h2 className="db-h2">Payment accounts</h2>
          <div className="db-sub">Where money comes from or goes to. Bank feeds will connect here later.</div>
        </div>
        <div className="db-chips">
          {db.settings.accounts.map((a) => (
            <span key={a} className="db-chip" style={{ cursor: 'default' }}>{a}<button type="button" onClick={() => removeAccount(a)} aria-label={'Remove ' + a} style={{ background: 'none', border: 0, color: 'var(--db-faint)', cursor: 'pointer', padding: 0, display: 'inline-flex' }}><Trash2 size={14} /></button></span>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); addAccount() }} style={{ display: 'flex', gap: 8 }}>
          <input className="db-input" value={newAccount} onChange={(e) => setNewAccount(e.target.value)} placeholder={'Add account (e.g. Chase \u2022\u2022 4412)'} aria-label="New account" />
          <button type="submit" className="db-btn" disabled={!newAccount.trim()}><Plus /> Add</button>
        </form>
      </div>

      <div className="db-card db-card-pad" style={{ display: 'grid', gap: 12 }}>
        <div>
          <h2 className="db-h2">Your data</h2>
          <div className="db-sub db-num">{db.properties.length} properties &middot; {db.transactions.length} transactions &middot; {(bytes / 1024).toFixed(1)} KB, stored in this browser only.</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="db-btn" onClick={() => { downloadText('doorbooks-backup-' + today() + '.json', exportJSON(), 'application/json'); toast('Backup downloaded') }} disabled={!hasData}><Download /> Export backup</button>
          <button type="button" className="db-btn" onClick={() => fileRef.current?.click()}><Upload /> Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f) }} />
        </div>
        <div className="db-help">Export before switching devices or clearing browser data. Import replaces everything here with the file.</div>
        <hr style={{ border: 0, borderTop: '1px solid var(--db-line)', margin: '4px 0' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {!confirmSample ? (
            <button type="button" className="db-btn" onClick={() => (hasData ? setConfirmSample(true) : (loadSample(), toast('Sample portfolio loaded')))}><Sparkles /> Load sample portfolio</button>
          ) : (
            <button type="button" className="db-btn db-btn-danger" onClick={() => { loadSample(); setConfirmSample(false); toast('Sample portfolio loaded') }}>Replace my data with the sample?</button>
          )}
          {!confirmReset ? (
            <button type="button" className="db-btn db-btn-ghost" onClick={() => setConfirmReset(true)} disabled={!hasData}><RotateCcw /> Erase everything</button>
          ) : (
            <button type="button" className="db-btn db-btn-danger" onClick={() => { resetDB(); setConfirmReset(false); toast('All data erased') }}>Yes, erase all {db.transactions.length} transactions</button>
          )}
        </div>
      </div>

      <div className="db-card db-card-pad" style={{ display: 'grid', gap: 10 }}>
        <h2 className="db-h2">What&rsquo;s next</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><Cloud size={18} className="db-brandc" style={{ marginTop: 2, flex: 'none' }} /><div><b>Accounts &amp; sync</b><div className="db-sub">Sign in once, same books on every device. Share read-only with your CPA.</div></div></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><Smartphone size={18} className="db-brandc" style={{ marginTop: 2, flex: 'none' }} /><div><b>iPhone app</b><div className="db-sub">Snap a receipt at Home Depot, tag the property, done.</div></div></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><Download size={18} className="db-brandc" style={{ marginTop: 2, flex: 'none' }} /><div><b>Bank import</b><div className="db-sub">Pull transactions from your bank and categorize with one tap per row.</div></div></div>
        </div>
      </div>
    </div>
  )
}
