import { pad2, daysInMonth, lastNMonths, today } from './dates'
import type { DB, Property, Transaction } from './types'

/** Deterministic PRNG so the sample portfolio looks the same every time. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildSample(): DB {
  const rand = rng(20261113)
  const now = Date.now()
  const months = lastNMonths(14)

  const maple: Property = {
    id: 'p_maple', name: 'Maple St Duplex', address: '412 Maple St', city: 'Wichita', state: 'KS', zip: '67203',
    type: 'multi', color: '#f0b429', createdAt: now, purchasePrice: 18500000, purchaseDate: '2021-06-15',
    units: [
      { id: 'u_maple_a', label: 'Unit A', rent: 115000, tenant: 'Dana Whitfield', leaseStart: '2026-03-01', leaseEnd: '2027-02-28' },
      { id: 'u_maple_b', label: 'Unit B', rent: 109500, tenant: 'Marcus Lee', leaseStart: '2025-09-01', leaseEnd: '2026-08-31' },
    ],
  }
  const oak: Property = {
    id: 'p_oak', name: 'Oak Ave House', address: '1808 Oak Ave', city: 'Derby', state: 'KS', zip: '67037',
    type: 'single', color: '#34d399', createdAt: now, purchasePrice: 16200000, purchaseDate: '2019-10-02',
    units: [{ id: 'u_oak', label: 'Main', rent: 165000, tenant: 'The Alvarez family', leaseStart: '2025-07-01', leaseEnd: '2026-06-30' }],
  }
  const river: Property = {
    id: 'p_river', name: 'Riverside 4-plex', address: '2290 Riverside Blvd', city: 'Wichita', state: 'KS', zip: '67203',
    type: 'multi', color: '#60a5fa', createdAt: now, purchasePrice: 31000000, purchaseDate: '2023-04-20',
    units: [
      { id: 'u_r1', label: '#1', rent: 89500, tenant: 'J. Okafor' },
      { id: 'u_r2', label: '#2', rent: 89500, tenant: 'Priya Natarajan' },
      { id: 'u_r3', label: '#3', rent: 92500, tenant: '' },
      { id: 'u_r4', label: '#4', rent: 89500, tenant: 'Tom & Erin Blake' },
    ],
  }

  const txs: Transaction[] = []
  let seq = 0
  const add = (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    seq += 1
    txs.push({ ...t, id: 's_' + seq, createdAt: now - (1000 - seq) * 1000, updatedAt: now })
  }
  const current = months[months.length - 1]
  const todayDay = parseInt(today().slice(8, 10), 10)
  const day = (m: string, d: number) => {
    const dim = daysInMonth(parseInt(m.slice(0, 4), 10), parseInt(m.slice(5, 7), 10))
    const dd = m === current ? Math.min(d, todayDay, dim) : Math.min(d, dim)
    return m + '-' + pad2(dd)
  }

  months.forEach((m, i) => {
    const isCurrent = m === current
    // Rent — every occupied unit, with a straggler now and then.
    for (const p of [maple, oak, river]) {
      for (const u of p.units) {
        if (u.id === 'u_r3') {
          // #3 was occupied by a previous tenant until 3 months ago, then turned over.
          if (i < months.length - 3) add({ date: day(m, 1 + Math.floor(rand() * 4)), propertyId: p.id, unitId: u.id, kind: 'income', categoryId: 'rent', amount: u.rent, payee: 'Sam Reyes', memo: '', account: 'Checking' })
          continue
        }
        if (!u.tenant) continue
        if (isCurrent && u.id === 'u_r4') continue // not paid yet this month
        const late = rand() < 0.12
        add({ date: day(m, late ? 8 + Math.floor(rand() * 6) : 1 + Math.floor(rand() * 4)), propertyId: p.id, unitId: u.id, kind: 'income', categoryId: 'rent', amount: u.rent, payee: u.tenant, memo: late ? 'Paid late' : '', account: 'Checking' })
        if (late) add({ date: day(m, 14), propertyId: p.id, unitId: u.id, kind: 'income', categoryId: 'late_fees', amount: 5000, payee: u.tenant, memo: 'Late fee', account: 'Checking' })
      }
    }
    // Mortgage — interest + principal, monthly.
    add({ date: day(m, 1), propertyId: maple.id, kind: 'expense', categoryId: 'mortgage_interest', amount: 61240 - i * 180, payee: 'Emprise Bank', memo: 'Mortgage interest', account: 'Checking' })
    add({ date: day(m, 1), propertyId: maple.id, kind: 'expense', categoryId: 'mortgage_principal', amount: 28760 + i * 180, payee: 'Emprise Bank', memo: 'Mortgage principal', account: 'Checking' })
    add({ date: day(m, 1), propertyId: river.id, kind: 'expense', categoryId: 'mortgage_interest', amount: 131500 - i * 210, payee: 'Fidelity Bank', memo: 'Mortgage interest', account: 'Checking' })
    add({ date: day(m, 1), propertyId: river.id, kind: 'expense', categoryId: 'mortgage_principal', amount: 48500 + i * 210, payee: 'Fidelity Bank', memo: 'Mortgage principal', account: 'Checking' })
    // Utilities the landlord pays (4-plex water/trash).
    add({ date: day(m, 12), propertyId: river.id, kind: 'expense', categoryId: 'utilities', amount: 21800 + Math.floor(rand() * 6000), payee: 'City of Wichita Water', memo: 'Water & trash', account: 'Credit card' })
    // Lawn care in season, snow in winter.
    const mon = parseInt(m.slice(5, 7), 10)
    if (mon >= 4 && mon <= 10) {
      add({ date: day(m, 20), propertyId: river.id, kind: 'expense', categoryId: 'cleaning_maintenance', amount: 9000, payee: 'GreenEdge Lawn', memo: 'Mowing', account: 'Credit card' })
      add({ date: day(m, 20), propertyId: maple.id, kind: 'expense', categoryId: 'cleaning_maintenance', amount: 6500, payee: 'GreenEdge Lawn', memo: 'Mowing', account: 'Credit card' })
    }
    // Random repairs.
    if (rand() < 0.45) {
      const p = [maple, oak, river][Math.floor(rand() * 3)]
      const jobs: [string, number, string][] = [['Ace Plumbing', 18500, 'Kitchen faucet leak'], ['Home Depot', 4320, 'Door hardware + paint'], ['Reliable HVAC', 24000, 'Furnace service call'], ['Lowe\u2019s', 7680, 'Garbage disposal'], ['Mike\u2019s Appliance', 12900, 'Dryer repair']]
      const j = jobs[Math.floor(rand() * jobs.length)]
      add({ date: day(m, 5 + Math.floor(rand() * 20)), propertyId: p.id, kind: 'expense', categoryId: 'repairs', amount: j[1] + Math.floor(rand() * 3000), payee: j[0], memo: j[2], account: 'Credit card' })
    }
    // Software
    add({ date: day(m, 3), propertyId: river.id, kind: 'expense', categoryId: 'software_fees', amount: 1500, payee: 'Doorbooks', memo: 'Bookkeeping', account: 'Credit card' })
  })

  // Annual / semiannual items in the window.
  const y = parseInt(current.slice(0, 4), 10)
  const thisYear = (mm: string) => y + '-' + mm
  add({ date: thisYear('01-18'), propertyId: maple.id, kind: 'expense', categoryId: 'insurance', amount: 184000, payee: 'State Farm', memo: 'Annual landlord policy', account: 'Checking' })
  add({ date: thisYear('02-02'), propertyId: oak.id, kind: 'expense', categoryId: 'insurance', amount: 142000, payee: 'State Farm', memo: 'Annual landlord policy', account: 'Checking' })
  add({ date: thisYear('03-11'), propertyId: river.id, kind: 'expense', categoryId: 'insurance', amount: 296000, payee: 'Farmers', memo: 'Annual policy', account: 'Checking' })
  for (const [p, amt] of [[maple, 231400], [oak, 198600], [river, 412800]] as [Property, number][]) {
    add({ date: thisYear('05-10'), propertyId: p.id, kind: 'expense', categoryId: 'taxes', amount: Math.round(amt / 2), payee: 'Sedgwick County Treasurer', memo: 'Property tax (1st half)', account: 'Checking' })
    if (current >= thisYear('11')) add({ date: thisYear('11-05'), propertyId: p.id, kind: 'expense', categoryId: 'taxes', amount: Math.round(amt / 2), payee: 'Sedgwick County Treasurer', memo: 'Property tax (2nd half)', account: 'Checking' })
  }
  add({ date: thisYear('02-20'), propertyId: oak.id, kind: 'expense', categoryId: 'legal_professional', amount: 65000, payee: 'Bright & Co CPA', memo: 'Tax prep', account: 'Checking' })
  add({ date: thisYear('06-24'), propertyId: maple.id, kind: 'expense', categoryId: 'capital_improvement', amount: 842000, payee: 'Summit Roofing', memo: 'New roof \u2014 depreciate 27.5 yr', account: 'Checking' })
  add({ date: thisYear('08-14'), propertyId: river.id, kind: 'expense', categoryId: 'advertising', amount: 4900, payee: 'Zillow Rentals', memo: 'Listing #3', account: 'Credit card' })
  add({ date: thisYear('08-30'), propertyId: river.id, kind: 'expense', categoryId: 'cleaning_maintenance', amount: 27500, payee: 'Spotless Turnovers', memo: 'Unit #3 turnover clean', account: 'Credit card' })
  add({ date: thisYear('09-01'), propertyId: river.id, unitId: 'u_r3', kind: 'expense', categoryId: 'deposit_return', amount: 92500, payee: 'Sam Reyes', memo: 'Deposit refund #3', account: 'Checking' })
  add({ date: thisYear('04-02'), propertyId: river.id, kind: 'expense', categoryId: 'supplies', amount: 8650, payee: 'Home Depot', memo: 'Smoke detectors, filters', account: 'Credit card' })
  add({ date: thisYear('07-15'), propertyId: oak.id, kind: 'income', categoryId: 'pet_fees', amount: 3500, payee: 'The Alvarez family', memo: 'Pet rent', account: 'Checking' })
  add({ date: thisYear('10-03'), propertyId: maple.id, kind: 'expense', categoryId: 'licenses', amount: 7500, payee: 'City of Wichita', memo: 'Rental registration', account: 'Checking' })

  return {
    version: 1,
    properties: [maple, oak, river],
    transactions: txs.sort((a, b) => (a.date < b.date ? -1 : 1)),
    settings: { businessName: 'Sample Portfolio LLC', accounts: ['Checking', 'Credit card', 'Cash'], lastPropertyId: maple.id, lastAccount: 'Checking' },
  }
}
