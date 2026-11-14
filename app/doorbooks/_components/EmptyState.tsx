'use client'

import { useState } from 'react'
import { Building2, ChartColumn, DoorOpen, FileSpreadsheet, Plus, Sparkles } from 'lucide-react'
import { loadSample } from '../_lib/store'
import { PropertyForm } from './PropertyForm'

export function EmptyState() {
  const [adding, setAdding] = useState(false)
  return (
    <div className="db-hero">
      <div className="db-hero-mark"><DoorOpen /></div>
      <h1 className="db-display">Books for every door.</h1>
      <p>Rental bookkeeping without the accountant-speak. Every dollar gets a property, so profit &amp; loss by property and your Schedule E just fall out.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="db-btn db-btn-primary" style={{ height: 46, paddingInline: 20 }} onClick={() => setAdding(true)}><Plus /> Add your first property</button>
        <button type="button" className="db-btn" style={{ height: 46 }} onClick={() => loadSample()}><Sparkles /> Try it with sample data</button>
      </div>
      <div className="db-features">
        <div className="db-card db-feature"><Building2 className="db-brandc" size={20} /><b>Property, not &ldquo;class&rdquo;</b><span>Tap a property on every entry. Units and tenants live right on it.</span></div>
        <div className="db-card db-feature"><ChartColumn className="db-brandc" size={20} /><b>P&amp;L by property</b><span>One report, one column per door, NOI and cash flow side by side.</span></div>
        <div className="db-card db-feature"><FileSpreadsheet className="db-brandc" size={20} /><b>Schedule E, done</b><span>Categories are the IRS lines. Tax time is an export, not a project.</span></div>
      </div>
      {adding && <PropertyForm onClose={() => setAdding(false)} />}
    </div>
  )
}
