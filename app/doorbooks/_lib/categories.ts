import type { TxKind } from './types'

/**
 * Chart of accounts built around IRS Schedule E (Form 1040), Part I.
 * Every expense maps to a Schedule E line so tax time is a report, not a project.
 * Categories with pl=false are cash movements that are NOT on the P&L
 * (security deposits, mortgage principal, capital improvements that get depreciated).
 */
export interface Category {
  id: string
  name: string
  kind: TxKind
  /** Schedule E line number (3 = rents, 5-19 = expenses). Undefined = not on Schedule E. */
  line?: number
  /** Included in profit & loss. false = balance-sheet / cash-only item. */
  pl: boolean
  hint?: string
}

export const CATEGORIES: Category[] = [
  // ── Income ──────────────────────────────────────────────
  { id: 'rent', name: 'Rent', kind: 'income', line: 3, pl: true, hint: 'Monthly rent received' },
  { id: 'late_fees', name: 'Late fees', kind: 'income', line: 3, pl: true },
  { id: 'pet_fees', name: 'Pet rent / fees', kind: 'income', line: 3, pl: true },
  { id: 'app_fees', name: 'Application fees', kind: 'income', line: 3, pl: true },
  { id: 'other_income', name: 'Other income', kind: 'income', line: 3, pl: true, hint: 'Laundry, parking, storage, utility reimbursements' },
  { id: 'security_deposit', name: 'Security deposit received', kind: 'income', pl: false, hint: 'Tenant money held — not income' },
  { id: 'owner_contribution', name: 'Owner contribution', kind: 'income', pl: false, hint: 'Cash you put in — not income' },

  // ── Expenses (Schedule E lines 5–19) ───────────────────
  { id: 'advertising', name: 'Advertising', kind: 'expense', line: 5, pl: true, hint: 'Listings, signs, photos' },
  { id: 'auto_travel', name: 'Auto & travel', kind: 'expense', line: 6, pl: true, hint: 'Mileage, trips to the property' },
  { id: 'cleaning_maintenance', name: 'Cleaning & maintenance', kind: 'expense', line: 7, pl: true, hint: 'Lawn, snow, cleaning, pest control' },
  { id: 'commissions', name: 'Commissions', kind: 'expense', line: 8, pl: true, hint: 'Leasing / placement fees' },
  { id: 'insurance', name: 'Insurance', kind: 'expense', line: 9, pl: true },
  { id: 'legal_professional', name: 'Legal & professional', kind: 'expense', line: 10, pl: true, hint: 'Attorney, CPA, eviction filing' },
  { id: 'management_fees', name: 'Management fees', kind: 'expense', line: 11, pl: true },
  { id: 'mortgage_interest', name: 'Mortgage interest', kind: 'expense', line: 12, pl: true, hint: 'Interest only — principal is separate' },
  { id: 'other_interest', name: 'Other interest', kind: 'expense', line: 13, pl: true, hint: 'HELOC, credit card interest' },
  { id: 'repairs', name: 'Repairs', kind: 'expense', line: 14, pl: true, hint: 'Fixing what broke (not improvements)' },
  { id: 'supplies', name: 'Supplies', kind: 'expense', line: 15, pl: true },
  { id: 'taxes', name: 'Property taxes', kind: 'expense', line: 16, pl: true },
  { id: 'utilities', name: 'Utilities', kind: 'expense', line: 17, pl: true, hint: 'Water, trash, gas, electric you pay' },
  { id: 'depreciation', name: 'Depreciation', kind: 'expense', line: 18, pl: true, hint: 'Usually entered at year end by your CPA' },
  { id: 'hoa', name: 'HOA dues', kind: 'expense', line: 19, pl: true },
  { id: 'software_fees', name: 'Software & bank fees', kind: 'expense', line: 19, pl: true },
  { id: 'licenses', name: 'Licenses & permits', kind: 'expense', line: 19, pl: true },
  { id: 'other_expense', name: 'Other expense', kind: 'expense', line: 19, pl: true },

  // ── Cash-only (not on P&L) ──────────────────────────────
  { id: 'capital_improvement', name: 'Capital improvement', kind: 'expense', pl: false, hint: 'Roof, HVAC, remodel — depreciated, not expensed' },
  { id: 'mortgage_principal', name: 'Mortgage principal', kind: 'expense', pl: false, hint: 'Loan paydown — not deductible' },
  { id: 'deposit_return', name: 'Security deposit returned', kind: 'expense', pl: false },
  { id: 'owner_draw', name: 'Owner draw', kind: 'expense', pl: false, hint: 'Cash you took out — not an expense' },
]

export const SCHEDULE_E_LINES: { line: number; label: string }[] = [
  { line: 3, label: 'Rents received' },
  { line: 5, label: 'Advertising' },
  { line: 6, label: 'Auto and travel' },
  { line: 7, label: 'Cleaning and maintenance' },
  { line: 8, label: 'Commissions' },
  { line: 9, label: 'Insurance' },
  { line: 10, label: 'Legal and other professional fees' },
  { line: 11, label: 'Management fees' },
  { line: 12, label: 'Mortgage interest paid to banks, etc.' },
  { line: 13, label: 'Other interest' },
  { line: 14, label: 'Repairs' },
  { line: 15, label: 'Supplies' },
  { line: 16, label: 'Taxes' },
  { line: 17, label: 'Utilities' },
  { line: 18, label: 'Depreciation expense or depletion' },
  { line: 19, label: 'Other' },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function categoryById(id: string): Category {
  return BY_ID.get(id) ?? { id, name: id, kind: 'expense', pl: true }
}

export function categoriesFor(kind: TxKind): Category[] {
  return CATEGORIES.filter((c) => c.kind === kind)
}
