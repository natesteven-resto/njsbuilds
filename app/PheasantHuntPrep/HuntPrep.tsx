'use client'

import { useEffect, useId, useRef, useState, type ReactNode, type CSSProperties, type FormEvent } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Backpack, CalendarDays, Check, CheckCheck, ChevronRight, Compass, Download, Feather, Flag, Heart, MapPin, Minus, Mountain, PawPrint, Plus, Printer, Search, Settings2, ShieldCheck, Sparkles, Tent, Upload, Users, X, CheckCircle2, CircleHelp } from 'lucide-react'
import { CATEGORIES, DEFAULT_STATE, ITEMS, SOURCES, STORAGE_KEY, parseBackup, type PrepState, type Item, type Member } from './prep-data'
import styles from './hunt.module.css'

type Tab = 'basecamp' | 'packing' | 'crew' | 'dogs' | 'plan'
const TABS: { id: Tab; label: string; icon: typeof Compass }[] = [
  { id: 'basecamp', label: 'Basecamp', icon: Compass },
  { id: 'packing', label: 'Pack list', icon: Backpack },
  { id: 'crew', label: 'The crew', icon: Users },
  { id: 'dogs', label: 'The dogs', icon: PawPrint },
  { id: 'plan', label: 'Hunt plan', icon: MapPin },
]
const ICONS: Record<string, typeof Compass> = { paperwork: ShieldCheck, personal: Backpack, dogs: PawPrint, shared: Compass, travel: Tent, before: CalendarDays, field: Mountain }

function prettyDate(value: string) {
  if (!value) return 'Dates to be decided'
  return new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function daysAway(value: string) {
  if (!value) return null
  const now = new Date()
  const current = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const [year, month, day] = value.split('-').map(Number)
  return Math.round((Date.UTC(year, month - 1, day) - current) / 86400000)
}
function tripLength(start: string, end: string) {
  if (!start || !end) return 1
  return Math.max(1, Math.round((new Date(end + 'T12:00:00Z').getTime() - new Date(start + 'T12:00:00Z').getTime()) / 86400000) + 1)
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const el = dialog.current
    el?.showModal()
    return () => el?.close()
  }, [])
  return <dialog ref={dialog} aria-labelledby={titleId} className={styles.dialog} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.dialogHeader}><h2 id={titleId}>{title}</h2><button className={styles.iconButton} onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
    {children}
  </dialog>
}

function Ring({ done, total, large = false }: { done: number; total: number; large?: boolean }) {
  const percent = total ? Math.round(done / total * 100) : 0
  return <div className={styles.ring + (large ? ' ' + styles.ringLarge : '')} style={{ '--progress': percent + '%' } as CSSProperties}>
    <div><strong>{percent}<small>%</small></strong><span>PACKED & PREPPED</span></div>
  </div>
}

function ItemRow({ item, checked, ownerName, onToggle, onRemove }: { item: Item; checked: boolean; ownerName: string; onToggle: (item: Item) => void; onRemove?: () => void }) {
  return <div className={styles.itemWrapper}><label className={styles.itemRow + (checked ? ' ' + styles.itemChecked : '')}>
    <input type="checkbox" checked={checked} onChange={() => onToggle(item)} />
    <span className={styles.checkBox}>{checked && <Check size={14} strokeWidth={3} />}</span>
    <span className={styles.itemCopy}><strong>{item.label}</strong><span>{item.detail}</span></span>
    <span className={styles.itemMeta}><span>{ownerName}</span>{item.essential && <small>ESSENTIAL</small>}</span>
  </label>{onRemove && <button className={styles.removeItem} aria-label={'Remove custom item: ' + item.label} onClick={onRemove}>Remove item <X size={12} /></button>}</div>
}

export default function HuntPrep() {
  const [state, setState] = useState<PrepState>(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState('Saved on this device')
  const [tab, setTab] = useState<Tab>('basecamp')
  const [category, setCategory] = useState('all')
  const [owner, setOwner] = useState('all')
  const [search, setSearch] = useState('')
  const [unpacked, setUnpacked] = useState(false)
  const [essentialOnly, setEssentialOnly] = useState(false)
  const [removing, setRemoving] = useState<Item | null>(null)
  const [modal, setModal] = useState<'trip' | 'custom' | 'backup' | null>(null)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [pendingImport, setPendingImport] = useState<PrepState | null>(null)
  const [toast, setToast] = useState('')
  const [motion, setMotion] = useState(true)
  const [days, setDays] = useState(1)
  const [daysEdited, setDaysEdited] = useState(false)
  const board = useRef<HTMLElement>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const hero = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setState(parseBackup(raw))
    } catch {
      setSaveStatus('Save unavailable — use a backup')
      setToast('Your saved plan could not be loaded. You can restore an exported backup.')
    }
    setLoaded(true)
    setMotion(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try { setState(parseBackup(event.newValue)) } catch { /* Ignore invalid data from another tab. */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!motion) return
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        if (hero.current) hero.current.style.setProperty('--parallax', Math.min(window.scrollY * .19, 160) + 'px')
        frame = 0
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [motion])

  const allItems = [...ITEMS, ...state.custom]
  const packed = allItems.filter(item => state.checked[item.id]).length
  const essential = allItems.filter(item => item.essential && !state.checked[item.id])
  const hunters = state.members.filter(member => member.kind === 'hunter')
  const dogs = state.members.filter(member => member.kind === 'dog')
  const countdown = daysAway(state.trip.start)
  const supplyDays = daysEdited ? days : tripLength(state.trip.start, state.trip.end)
  const remaining = allItems.length - packed
  const getName = (id: string) => id === 'shared' ? 'Shared kit' : state.members.find(member => member.id === id)?.name || id
  const personalCount = (id: string) => {
    const items = allItems.filter(item => item.owner === id)
    return { done: items.filter(item => state.checked[item.id]).length, total: items.length }
  }

  function update(transform: (old: PrepState) => PrepState) {
    setState(old => {
      const next = transform(old)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSaveStatus('Saved on this device') }
      catch { setSaveStatus('Save unavailable — export a backup') }
      return next
    })
  }
  function go(next: Tab, person = 'all', group = 'all') {
    setTab(next); setOwner(person); setCategory(group); setSearch(''); setUnpacked(false); setEssentialOnly(false)
    requestAnimationFrame(() => board.current?.scrollIntoView({ behavior: motion ? 'smooth' : 'instant', block: 'start' }))
  }
  function toggleItem(item: Item) {
    update(old => ({ ...old, checked: { ...old.checked, [item.id]: !old.checked[item.id] } }))
  }
  function exportPlan() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'field-and-feather-' + new Date().toISOString().slice(0, 10) + '.json'
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast('Backup downloaded. Import it on another device to bring your plan along.')
  }
  async function importPlan(file?: File) {
    if (!file) return
    try {
      if (file.size > 1000000) throw new Error('That file is too large. Choose a Field & Feather JSON backup.')
      setPendingImport(parseBackup(await file.text()))
      setModal(null)
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not read that backup.') }
    if (importInput.current) importInput.current.value = ''
  }
  function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (key: string) => String(data.get(key) || '').trim()
    if (field('end') && !field('start')) { setToast('Add a start date before choosing an end date.'); return }
    if (field('start') && field('end') && field('end') < field('start')) { setToast('Your end date needs to be on or after your start date.'); return }
    update(old => ({ ...old, trip: { destination: field('destination'), start: field('start'), end: field('end'), lodging: field('lodging'), emergency: field('emergency'), vet: field('vet'), notes: field('notes') } }))
    setDaysEdited(false); setModal(null); setToast('Trip updated. Let the countdown begin.')
  }
  function addCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.custom.length >= 250) { setToast('Your plan has reached the 250 custom-item limit.'); return }
    const data = new FormData(event.currentTarget)
    const label = String(data.get('label') || '').trim()
    if (!label) { setToast('Add a name for this item.'); return }
    const item: Item = { id: 'custom-' + crypto.randomUUID(), label, detail: String(data.get('detail') || '').trim(), category: String(data.get('category')), owner: String(data.get('owner')), essential: data.get('essential') === 'on' }
    update(old => ({ ...old, custom: [...old.custom, item] }))
    setModal(null); setToast('Added to the pack list.')
  }


  const visibleItems = allItems.filter(item =>
    (category === 'all' || item.category === category) &&
    (owner === 'all' || item.owner === owner) &&
    (!unpacked || !state.checked[item.id]) &&
    (!essentialOnly || item.essential) &&
    (!search || (item.label + ' ' + item.detail + ' ' + getName(item.owner)).toLowerCase().includes(search.toLowerCase()))
  )

  return <main className={styles.site + (!motion ? ' ' + styles.still : '')}>
    <a className={styles.skipLink} href="#basecamp">Skip to your planner</a>
    <header className={styles.header}>
      <a className={styles.logo} href="#top" aria-label="Field and Feather home"><Feather size={31} strokeWidth={1.4} /><span>FIELD <i>&</i> FEATHER<small>THE UPLAND FIELD GUIDE</small></span></a>
      <nav className={styles.topNav} aria-label="Main navigation">{TABS.filter(item => item.id !== 'basecamp').map(item => <button key={item.id} onClick={() => go(item.id)}>{item.label}</button>)}</nav>
      <button className={styles.headerButton} onClick={() => setModal('trip')}>YOUR NEXT ADVENTURE <ArrowUpRight size={16} /></button>
    </header>

    <section ref={hero} className={styles.hero} id="top" aria-label="Welcome to Field and Feather">
      <div className={styles.heroImage} role="img" aria-label="A ring-necked pheasant lifting from golden prairie grass" />
      <div className={styles.heroShade} /><div className={styles.grain} />
      <div className={styles.motes} aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</div>
      <div className={styles.heroContent}>
        <div className={styles.eyebrow}><span /> LESS SCRAMBLING. MORE MEMORIES.</div>
        <h1>THE GOOD DAYS<br />START <em>HERE.</em></h1>
        <p>Cold mornings. Wild birds. Your favorite people.<br />Get the whole crew ready for the kind of day<br className={styles.desktopBreak} /> you&rsquo;ll talk about all year.</p>
        <button className={styles.primaryButton} onClick={() => go('basecamp')}>LET&rsquo;S GET FIELD READY <ArrowRight size={18} /></button>
        <div className={styles.heroTagline}><ShieldCheck size={14} /> A little preparation. A lot of adventure.</div>
      </div>
      <div className={styles.fieldStamp}><Feather size={26} /><span>BUILT FOR THE<br /><strong>GOOD STUFF.</strong></span><small>FAMILY · FIELD · FEATHER</small></div>
      <div className={styles.heroBottom}>
        <div className={styles.heroStat}><strong>03</strong><span>HUNTERS<br /><small>One unforgettable crew</small></span></div>
        <div className={styles.heroStat}><strong>03</strong><span>BIRD DOGS<br /><small>All heart. All in.</small></span></div>
        <div className={styles.heroStat}><strong>01</strong><span>GREAT ADVENTURE<br /><small>Make the most of it</small></span></div>
        <button className={styles.scrollCue} onClick={() => go('basecamp')} aria-label="Scroll to basecamp"><span>EXPLORE YOUR BASECAMP</span><ArrowDown size={19} /></button>
      </div>
      <button className={styles.motionToggle} onClick={() => setMotion(!motion)} aria-pressed={!motion}>{motion ? 'Pause' : 'Enable'} motion</button>
    </section>

    <div className={styles.ribbon}><span><Feather size={14} /> GOOD DOGS.</span><span>GREAT COMPANY.</span><span>WIDE OPEN COUNTRY.</span><span className={styles.ribbonLast}>THAT&rsquo;S THE WHOLE POINT.</span></div>

    <section ref={board} id="basecamp" className={styles.basecamp}>
      <div className={styles.sectionIntro}>
        <div><div className={styles.kicker}><span /> YOUR ADVENTURE, ORGANIZED</div><h2>WELCOME TO <em>BASECAMP.</em></h2><p>Everything you need. Everyone accounted for. Nothing left in the driveway.</p></div>
        <button className={styles.tripChip} onClick={() => setModal('trip')}><CalendarDays size={20} /><span><strong>{countdown === null ? 'The next good day' : countdown > 0 ? countdown + ' days to the adventure' : countdown === 0 ? 'Today is the day!' : 'Your hunt journal'}</strong><small>{state.trip.start ? prettyDate(state.trip.start) : 'Set your hunt dates'} <ChevronRight size={13} /></small></span></button>
      </div>

      <div className={styles.tabBar}>
        <nav role="tablist" aria-label="Planner sections">{TABS.map(item => <button id={'tab-' + item.id} role="tab" tabIndex={tab === item.id ? 0 : -1} onKeyDown={event => {
          const index = TABS.findIndex(entry => entry.id === item.id)
          const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index - 1 + TABS.length) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : -1
          if (next < 0) return
          event.preventDefault(); setTab(TABS[next].id); document.getElementById('tab-' + TABS[next].id)?.focus()
        }} aria-selected={tab === item.id} aria-controls="planner-panel" className={tab === item.id ? styles.activeTab : ''} key={item.id} onClick={() => setTab(item.id)}><item.icon size={17} />{item.label}</button>)}</nav>
        <span className={styles.saved}><span />{loaded ? saveStatus : 'Loading your plan…'}</span>
      </div>

      <div id="planner-panel" role="tabpanel" aria-labelledby={'tab-' + tab} key={tab} className={styles.panel}>
        {tab === 'basecamp' && <>
          <div className={styles.overviewGrid}>
            <article className={styles.readinessCard}>
              <div className={styles.cardEyebrow}><span>THE BIG PICTURE</span><Compass size={19} /></div>
              <h3>A little prep.<br /><em>A better day.</em></h3>
              <Ring done={packed} total={allItems.length} large />
              <p><strong>{packed} of {allItems.length}</strong> essentials & to-dos ready</p>
              <button onClick={() => go('packing')}>KEEP THE PREP GOING <ArrowRight size={17} /></button>
            </article>
            <div className={styles.overviewRight}>
              <div className={styles.quickCards}>
                <button className={styles.quickCard} onClick={() => go('crew')}><div className={styles.quickIcon}><Users size={24} /><ArrowUpRight size={19} /></div><span className={styles.cardEyebrow}>THE PEOPLE WHO MATTER</span><h3>YOUR CREW.</h3><p>One dad. Two sons.<br />A thousand stories waiting.</p><div className={styles.avatars}>{hunters.map((member, i) => <span key={member.id}>{i === 0 ? 'D' : i === 1 ? '14' : '12'}</span>)}<small>3 hunters, individually packed</small></div></button>
                <button className={styles.quickCard + ' ' + styles.dogQuickCard} onClick={() => go('dogs')}><div className={styles.quickIcon}><PawPrint size={24} /><ArrowUpRight size={19} /></div><span className={styles.cardEyebrow}>THE FOUR-LEGGED MVPs</span><h3>THE BIRD DOGS.</h3><p>They bring the drive.<br />You bring everything they need.</p><div className={styles.dogFooter}><span><PawPrint size={15} /> 3 DOGS</span><small>Care. Comfort. Field readiness.</small></div></button>
              </div>
              <article className={styles.nextCard}>
                <div className={styles.nextIcon}><Flag size={25} /></div>
                <div><span className={styles.cardEyebrow}>FIRST THINGS FIRST</span><h3>{essential.length ? 'Small details. Big difference.' : 'The essentials are covered.'}</h3><p>{essential.length ? essential.length + ' essential checks still need a look. Licenses, safety, and dog care come first.' : 'Your essential checks are complete. Finish the rest, then go make some memories.'}</p></div>
                <button className={styles.roundButton} aria-label="View essential checks" onClick={() => { go('packing'); setUnpacked(true); setEssentialOnly(true) }}><ArrowRight size={22} /></button>
              </article>
            </div>
          </div>

          <div className={styles.sectionHeading}><div><span className={styles.kicker}>A SPOT FOR EVERYTHING</span><h3>PACK SMART. <em>GO FAR.</em></h3></div><button className={styles.textButton} onClick={() => go('packing')}>THE FULL PACK LIST <ArrowUpRight size={16} /></button></div>
          <div className={styles.categoryGrid}>{CATEGORIES.map((cat, i) => {
            const entries = allItems.filter(item => item.category === cat.id)
            const count = entries.filter(item => state.checked[item.id]).length
            const Icon = ICONS[cat.id] || Backpack
            return <button className={styles.categoryCard} key={cat.id} onClick={() => go('packing', 'all', cat.id)}><div><Icon size={23} /><small>{String(i + 1).padStart(2, '0')}</small></div><h4>{cat.label}</h4><p>{count} / {entries.length} ready <ArrowUpRight size={15} /></p><span className={styles.progressTrack}><i style={{ width: (entries.length ? count / entries.length * 100 : 0) + '%' }} /></span></button>
          })}</div>
          <div className={styles.fieldNote}><span className={styles.noteIcon}><Heart size={23} /></span><div><span className={styles.kicker}>A NOTE FROM BASECAMP</span><h3>The best thing you bring isn&rsquo;t in your pack.</h3><p>Leave room for snack breaks, muddy paws, and the stories on the drive home. The birds are a bonus.</p></div><Feather className={styles.noteFeather} size={83} strokeWidth={.8} /></div>
        </>}

        {tab === 'packing' && <>
          <div className={styles.panelHeading}><div><span className={styles.kicker}>PACK IT. CHECK IT. FORGET NOTHING.</span><h3>THE FIELD <em>CHECKLIST.</em></h3><p>{packed} packed & prepped · {remaining} to go</p></div><div className={styles.actions}><button className={styles.secondaryButton} onClick={() => window.print()}><Printer size={16} /> Print list</button><button className={styles.orangeButton} onClick={() => setModal('custom')}><Plus size={17} /> Add an item</button></div></div>
          <div className={styles.packingLayout}>
            <aside className={styles.filters} aria-label="Checklist categories"><button className={category === 'all' ? styles.selectedFilter : ''} onClick={() => setCategory('all')}><Backpack size={17} />Everything<span>{allItems.length}</span></button>{CATEGORIES.map(cat => { const Icon = ICONS[cat.id] || Backpack; return <button key={cat.id} className={category === cat.id ? styles.selectedFilter : ''} onClick={() => setCategory(cat.id)}><Icon size={17} />{cat.label}<span>{allItems.filter(item => item.category === cat.id).length}</span></button> })}<div className={styles.filterNote}><ShieldCheck size={22} /><strong>Good prep is a team sport.</strong><p>Walk through the list with the boys. Give everyone a part in getting ready.</p></div></aside>
            <div className={styles.checklist}>
              <div className={styles.searchTools}><label className={styles.search}><Search size={17} /><input aria-label="Search checklist" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find something in your kit…" /></label><select aria-label="Filter by crew member" value={owner} onChange={event => setOwner(event.target.value)}><option value="all">Everyone & shared</option><option value="shared">Shared kit</option>{state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
              <div className={styles.listStatus}><span>{visibleItems.length} items shown</span><label><input type="checkbox" checked={essentialOnly} onChange={event => setEssentialOnly(event.target.checked)} /> Essentials only</label><label><input type="checkbox" checked={unpacked} onChange={event => setUnpacked(event.target.checked)} /> Show only unfinished</label></div>
              {CATEGORIES.map(cat => {
                const items = visibleItems.filter(item => item.category === cat.id)
                if (!items.length) return null
                return <section key={cat.id} className={styles.checkGroup}><div className={styles.groupTitle}><h4>{cat.label}</h4><span>{items.filter(item => state.checked[item.id]).length} / {items.length} ready</span></div>{items.map(item => <ItemRow key={item.id} item={item} checked={!!state.checked[item.id]} ownerName={getName(item.owner)} onToggle={toggleItem} onRemove={state.custom.some(custom => custom.id === item.id) ? () => setRemoving(item) : undefined} />)}</section>
              })}
              {!visibleItems.length && <div className={styles.empty}><CheckCheck size={38} /><h4>{unpacked ? 'All clear in this view.' : 'Nothing in this patch of grass.'}</h4><p>{unpacked ? 'Everything matching your filters is ready.' : 'Try a different search or add your own item.'}</p><button className={styles.secondaryButton} onClick={() => { setCategory('all'); setOwner('all'); setSearch(''); setUnpacked(false); setEssentialOnly(false) }}>Show everything</button></div>}
            </div>
          </div>
        </>}

        {(tab === 'crew' || tab === 'dogs') && <>
          <div className={styles.panelHeading}><div><span className={styles.kicker}>{tab === 'crew' ? 'THREE HUNTERS. ONE TEAM.' : 'ALL HEART. ALL IN.'}</span><h3>{tab === 'crew' ? <>THE BEST <em>COMPANY.</em></> : <>GOOD DOGS. <em>GREAT DAYS.</em></>}</h3><p>{tab === 'crew' ? 'A personal pack list for every hunter. Use the edit button to make each profile yours.' : 'Three individual care kits. Water, rest, and a happy ride home for everyone.'}</p></div><span className={styles.smallBadge}>{tab === 'crew' ? <Users size={17} /> : <PawPrint size={17} />}{tab === 'crew' ? 'YOUR HUNTING CREW' : 'YOUR FIELD PARTNERS'}</span></div>
          <div className={styles.memberGrid}>{(tab === 'crew' ? hunters : dogs).map((member, i) => {
            const count = personalCount(member.id)
            return <article className={styles.memberCard} key={member.id}><div className={styles.memberBanner + ' ' + styles['memberBanner' + i]}><div className={styles.memberIllustration}>{tab === 'dogs' ? <PawPrint size={66} strokeWidth={.8} /> : <Mountain size={78} strokeWidth={.8} />}</div><span>FIELD PARTNER / 0{i + 1}</span><button onClick={() => setEditingMember(member)} aria-label={'Edit ' + member.name}><Settings2 size={18} /></button></div><div className={styles.memberBody}><span className={styles.kicker}>{member.role}{member.id === 'son14' ? ' · AGE 14' : member.id === 'son12' ? ' · AGE 12' : ''}</span><h4>{member.name}</h4><p>{member.note || (tab === 'dogs' ? 'Add feeding, care, or field notes for this dog.' : 'Their own kit. Their own part in the adventure.')}</p><div className={styles.memberProgress}><span>{count.done} of {count.total} ready</span><strong>{count.total ? Math.round(count.done / count.total * 100) : 0}%</strong></div><div className={styles.progressTrack}><i style={{ width: (count.total ? count.done / count.total * 100 : 0) + '%' }} /></div><button className={styles.memberPackLink} onClick={() => go('packing', member.id)}>OPEN {tab === 'dogs' ? 'CARE KIT' : 'PACK LIST'} <ArrowRight size={17} /></button></div></article>
          })}</div>
          <div className={styles.guidanceGrid}>{(tab === 'crew' ? [
            { icon: ShieldCheck, title: 'The right start.', text: 'Verify youth licensing, hunter education, minimum ages, and supervision rules with the destination wildlife agency. Confirm one adult can accompany both youths on your chosen hunt.' },
            { icon: Heart, title: 'Make it their day, too.', text: 'Check clothing and boot fit before leaving. Pack eye and hearing protection, easy snacks, warm layers, and a plan for a shorter day if anyone needs it.' },
            { icon: Compass, title: 'A crew check, every time.', text: 'Review safe handling with a qualified adult, visibility, boundaries, check-ins, and the stop signal before heading out. Keep the group together and the day unhurried.' },
          ] : [
            { icon: PawPrint, title: 'Fitness before enthusiasm.', text: 'Plan work and rest around each dog’s age, conditioning, health, and weather. Young or inexperienced dogs may need a supervised exposure day instead of hunting.' },
            { icon: Heart, title: 'Water. Rest. Repeat.', text: 'Bring ample familiar drinking water and bowls. Offer frequent water and rest breaks; watch for heat stress even in cool weather. Stop if a dog is struggling.' },
            { icon: ShieldCheck, title: 'A little care goes a long way.', text: 'Check paws, eyes, ears, coat, and skin for irritation, ticks, or seeds after the field. Save the nearest emergency vet and use first-aid supplies as your vet has shown you.' },
          ]).map(card => <article key={card.title}><card.icon size={22} /><h4>{card.title}</h4><p>{card.text}</p></article>)}</div>
        </>}

        {tab === 'plan' && <>
          <div className={styles.panelHeading}><div><span className={styles.kicker}>LESS GUESSWORK. MORE OPEN COUNTRY.</span><h3>MAKE A <em>GAME PLAN.</em></h3><p>Your dates, your destination, and the little things that keep the day running.</p></div><button className={styles.orangeButton} onClick={() => setModal('trip')}><Settings2 size={17} /> Edit hunt details</button></div>
          <div className={styles.planGrid}>
            <article className={styles.destinationCard}><div className={styles.topo} /><MapPin size={29} /><span className={styles.kicker}>THE NEXT ADVENTURE</span><h4>{state.trip.destination || 'SOMEWHERE\nWORTH WAKING UP FOR.'}</h4><p>{state.trip.start ? prettyDate(state.trip.start) + (state.trip.end ? ' — ' + prettyDate(state.trip.end) : '') : 'Pick the place. Choose the day. Make it happen.'}</p><button className={styles.lightButton} onClick={() => setModal('trip')}>{state.trip.destination ? 'UPDATE THE PLAN' : 'SET THE DESTINATION'}<ArrowUpRight size={16} /></button></article>
            <article className={styles.tripDetails}><span className={styles.kicker}>THE USEFUL DETAILS</span>{[
              { icon: Tent, title: 'Basecamp & lodging', value: state.trip.lodging },
              { icon: Users, title: 'Emergency contact & check-in', value: state.trip.emergency },
              { icon: PawPrint, title: 'Nearest emergency vet', value: state.trip.vet },
            ].map(detail => <div key={detail.title}><detail.icon size={20} /><span><strong>{detail.title}</strong><p>{detail.value || 'Not set yet — add it to your plan.'}</p></span></div>)}<button className={styles.textButton} onClick={() => setModal('trip')}>FILL IN THE DETAILS <ArrowUpRight size={16} /></button></article>
          </div>
          <div className={styles.planLower}><article className={styles.supplyCard}><span className={styles.kicker}>BASECAMP MATH</span><h4>Feed the adventure.</h4><p>A planning starting point for three people and three dogs.</p><div className={styles.dayPicker}><span>Days away <small>(calculator)</small></span><button aria-label="One fewer day" disabled={supplyDays <= 1} onClick={() => { setDays(Math.max(1, supplyDays - 1)); setDaysEdited(true) }}><Minus size={16} /></button><strong>{supplyDays}</strong><button aria-label="One more day" disabled={supplyDays >= 90} onClick={() => { setDays(Math.min(90, supplyDays + 1)); setDaysEdited(true) }}><Plus size={16} /></button></div><div className={styles.supplyNumbers}><div><strong>{supplyDays * 9}</strong><span>human meal portions<br />(3 meals × 3 people / day)</span></div><div><strong>{supplyDays * 3}</strong><span>dog daily rations<br />(use each dog&rsquo;s usual amount)</span></div></div><small>Set hunt dates to save your trip length; calculator adjustments are temporary. Plus snacks, travel-day food, and a reserve. Pack water for people and dogs, with extra for weather and activity; confirm refill access.</small></article><article className={styles.notesCard}><div><span className={styles.kicker}>FROM YOUR FIELD JOURNAL</span><Feather size={24} /></div><h4>The details worth remembering.</h4><p>{state.trip.notes || 'Meeting points. Favorite snacks. A reminder to bring the camera. Keep the notes that make this trip yours.'}</p><button className={styles.textButton} onClick={() => setModal('trip')}>EDIT FIELD NOTES <ArrowUpRight size={16} /></button></article></div>
          <div className={styles.timeline}><span className={styles.kicker}>A SIMPLE RHYTHM FOR A GREAT DAY</span><div>{[
            ['01', 'Before you leave', 'Check regulations, access, weather, route, and every crew member’s kit.', 'before'],
            ['02', 'At the field', 'Confirm conditions and boundaries. Brief the boys. Check the dogs.', 'field'],
            ['03', 'Back at basecamp', 'Dog checks, dry layers, food, water, and a check-in back home.', 'dogs'],
          ].map(([num, title, text, cat]) => <button key={num} onClick={() => go('packing', 'all', cat)}><span>{num}</span><h4>{title}<ArrowUpRight size={16} /></h4><p>{text}</p></button>)}</div></div>
          <div className={styles.sources}><CircleHelp size={19} /><div><strong>Know before you go.</strong><p>Season dates, youth requirements, ammunition restrictions, and access rules vary by location. Confirm current requirements for your destination and land before leaving.</p><div>{SOURCES.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<ArrowUpRight size={12} /></a>)}</div></div></div>
        </>}
      </div>

      <div className={styles.utilityBar}><span><CheckCircle2 size={16} /> Your plan stays in this browser. Export a backup to move it to another device.</span><div><button onClick={() => setModal('backup')}><Download size={15} /> Back up & restore</button><button onClick={() => window.print()}><Printer size={15} /> Print field guide</button></div></div>
    </section>

    <section className={styles.closing}><div className={styles.closingLandscape} /><Feather size={32} strokeWidth={1.3} /><span className={styles.kicker}>MAKE ROOM FOR WHAT MATTERS</span><h2>THEY WON&rsquo;T REMEMBER<br />WHAT YOU <em>FORGOT TO PACK.</em><br />THEY&rsquo;LL REMEMBER YOU WERE THERE.</h2><p>But let&rsquo;s pack the snacks anyway.</p><button className={styles.primaryButton} onClick={() => go('packing')}>GET THE CREW READY <ArrowRight size={17} /></button></section>
    <footer className={styles.footer}><a className={styles.logo} href="#top"><Feather size={24} /><span>FIELD <i>&</i> FEATHER<small>A LITTLE PREP. A LOT OF ADVENTURE.</small></span></a><span>MADE FOR YOUR KIND OF WEEKEND.<small>Photography: Tom Koerner / USFWS · Public domain</small></span><a href="#top">BACK TO TOP <ArrowUpRight size={15} /></a></footer>

    <div className={styles.printGuide}>
      <h1>Field & Feather — Hunt Field Guide</h1>
      <p>{state.trip.destination || 'Destination not set'} · {prettyDate(state.trip.start)}{state.trip.end ? ' – ' + prettyDate(state.trip.end) : ''}</p>
      <p>{state.members.map(member => member.name).join(' · ')} · {packed}/{allItems.length} ready</p>
      <p><b>Lodging:</b> {state.trip.lodging || '—'}<br /><b>Emergency / check-in:</b> {state.trip.emergency || '—'}<br /><b>Emergency vet:</b> {state.trip.vet || '—'}</p>
      {state.trip.notes && <p><b>Field notes:</b> {state.trip.notes}</p>}
      <h2>Crew & dog care notes</h2>
      {state.members.map(member => <p key={member.id}><b>{member.name}</b> · {member.role}{member.id === 'son14' ? ' · Age 14' : member.id === 'son12' ? ' · Age 12' : ''}{member.note && <><br />{member.note}</>}</p>)}
      {CATEGORIES.map(cat => <section key={cat.id}><h2>{cat.label}</h2>{allItems.filter(item => item.category === cat.id).map(item => <p key={item.id}>{state.checked[item.id] ? '☑' : '☐'} <b>{item.label}</b> — {getName(item.owner)}{item.essential ? ' · Essential' : ''}<br /><small>{item.detail}</small></p>)}</section>)}
      <h2>Know before you go</h2><p>Verify destination-specific youth, licensing, supervision, season, access, and ammunition rules. Plan each dog’s work around health, conditioning, and weather.</p>
      {SOURCES.map(source => <p key={source.url}>{source.label}: {source.url}</p>)}
    </div>

    <input ref={importInput} type="file" accept=".json,application/json" hidden onChange={event => importPlan(event.target.files?.[0])} />
    {modal === 'trip' && <Modal title="Plan your next good day." onClose={() => setModal(null)}><form onSubmit={saveTrip} className={styles.form}><p>Make the trip yours. These details stay on this device.</p><label>Destination<input name="destination" maxLength={160} defaultValue={state.trip.destination} placeholder="State, town, or favorite patch of country" /></label><div className={styles.formRow}><label>First day<input type="date" min="1900-01-01" max="9999-12-31" name="start" defaultValue={state.trip.start} /></label><label>Last day<input type="date" min="1900-01-01" max="9999-12-31" name="end" defaultValue={state.trip.end} /></label></div><label>Lodging / meeting point<input name="lodging" maxLength={300} defaultValue={state.trip.lodging} placeholder="Where you’re staying or meeting" /></label><label>Emergency contact & check-in plan<input name="emergency" maxLength={300} defaultValue={state.trip.emergency} placeholder="Name, phone, and when you’ll check in" /></label><label>Nearest emergency vet<input name="vet" maxLength={300} defaultValue={state.trip.vet} placeholder="Clinic, phone, address, and hours" /></label><label>Field notes<textarea name="notes" maxLength={4000} rows={4} defaultValue={state.trip.notes} placeholder="Meals, directions, weather notes, reminders…" /></label><button className={styles.orangeButton} type="submit">SAVE THE PLAN <Check size={17} /></button></form></Modal>}
    {editingMember && <Modal title={'Meet your field partner.'} onClose={() => setEditingMember(null)}><form className={styles.form} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name') || '').trim(); if (!name) { setToast('Enter a name for this field partner.'); return }; const note = String(data.get('note') || '').trim(); update(old => ({ ...old, members: old.members.map(member => member.id === editingMember.id ? { ...member, name, note } : member) })); setEditingMember(null); setToast('Field partner updated.') }}><p>{editingMember.role}{editingMember.id === 'son14' ? ' · Age 14' : editingMember.id === 'son12' ? ' · Age 12' : ''}</p><label>Name<input name="name" required maxLength={60} defaultValue={editingMember.name} /></label><label>{editingMember.kind === 'dog' ? 'Care, feeding & field notes' : 'Gear, comfort & other notes'}<textarea name="note" rows={4} maxLength={1000} defaultValue={editingMember.note} placeholder={editingMember.kind === 'dog' ? 'Age, usual food, conditioning, reminders…' : 'Sizes, favorite snacks, things to remember…'} /></label><button className={styles.orangeButton}>SAVE FIELD PARTNER <Check size={17} /></button></form></Modal>}
    {modal === 'custom' && <Modal title="Make room for one more thing." onClose={() => setModal(null)}><form onSubmit={addCustom} className={styles.form}><label>What are you bringing?<input name="label" required maxLength={140} placeholder="The lucky hunting hat…" /></label><label>A little detail<input name="detail" maxLength={500} placeholder="Quantity, size, where it’s stored…" /></label><div className={styles.formRow}><label>Category<select name="category" defaultValue={category === 'all' ? 'shared' : category}>{CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select></label><label>Who is it for?<select name="owner" defaultValue={owner === 'all' ? 'shared' : owner}><option value="shared">Shared kit</option>{state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div><label className={styles.checkboxLabel}><input type="checkbox" name="essential" /> Mark as essential</label><button className={styles.orangeButton}>ADD TO THE PACK LIST <Plus size={17} /></button></form></Modal>}
    {modal === 'backup' && <Modal title="Bring your basecamp along." onClose={() => setModal(null)}><div className={styles.form}><p>Your checklist is saved in this browser, not a shared account. Download a backup to keep it safe or move it to another device. The backup includes your trip notes and contact details.</p><button className={styles.orangeButton} onClick={exportPlan}><Download size={18} /> DOWNLOAD MY BACKUP</button><button className={styles.secondaryButton} onClick={() => importInput.current?.click()}><Upload size={18} /> Restore from a backup</button><small>On your other device, open this page and restore the downloaded JSON file. Plans do not automatically sync between devices.</small></div></Modal>}
    {pendingImport && <Modal title="Restore this field guide?" onClose={() => setPendingImport(null)}><div className={styles.form}><p>This replaces the plan currently saved on this device, including checked items, names, and trip details.</p><p><strong>{pendingImport.trip.destination || 'Untitled adventure'}</strong><br />{pendingImport.members.map(member => member.name).join(' · ')}</p><button className={styles.orangeButton} onClick={() => { update(() => pendingImport); setPendingImport(null); setDaysEdited(false); setToast('Field guide restored. Welcome back to basecamp.') }}>RESTORE THIS PLAN <Check size={17} /></button><button className={styles.secondaryButton} onClick={() => setPendingImport(null)}>Keep my current plan</button></div></Modal>}
    {removing && <Modal title="Remove this custom item?" onClose={() => setRemoving(null)}><div className={styles.form}><p>{removing.label}</p><button className={styles.orangeButton} onClick={() => { update(old => { const checked = { ...old.checked }; delete checked[removing.id]; return { ...old, custom: old.custom.filter(item => item.id !== removing.id), checked } }); setRemoving(null); setToast('Custom item removed.') }}>REMOVE ITEM <X size={17} /></button><button className={styles.secondaryButton} onClick={() => setRemoving(null)}>Keep this item</button></div></Modal>}
    {toast && <div className={styles.toast} role="status"><Sparkles size={17} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={16} /></button></div>}
  </main>
}
