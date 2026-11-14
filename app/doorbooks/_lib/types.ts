// Doorbooks domain model. Pure TypeScript — shared later by the iPhone app and the Supabase schema.

export type PropertyType = 'single' | 'multi' | 'condo' | 'commercial' | 'land' | 'other'

export interface Unit {
  id: string
  label: string
  /** Monthly expected rent in cents (0 = not set). */
  rent: number
  /** Tenant name; empty string = vacant. */
  tenant: string
  leaseStart?: string
  leaseEnd?: string
}

export interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  type: PropertyType
  units: Unit[]
  /** Cents. */
  purchasePrice?: number
  purchaseDate?: string
  /** Accent color used for chips, charts and cards. */
  color: string
  createdAt: number
  archived?: boolean
}

export type TxKind = 'income' | 'expense'

export interface Transaction {
  id: string
  /** YYYY-MM-DD (local). */
  date: string
  propertyId: string
  unitId?: string
  kind: TxKind
  categoryId: string
  /** Cents, always positive. Sign comes from kind. */
  amount: number
  payee: string
  memo: string
  /** Payment account label, e.g. "Checking ••1234". */
  account: string
  createdAt: number
  updatedAt: number
}

export interface Settings {
  businessName: string
  accounts: string[]
  lastPropertyId?: string
  lastAccount?: string
}

export interface DB {
  version: 1
  properties: Property[]
  transactions: Transaction[]
  settings: Settings
}

export const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: 'single', label: 'Single-family' },
  { id: 'multi', label: 'Multi-family' },
  { id: 'condo', label: 'Condo / Townhome' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'land', label: 'Land' },
  { id: 'other', label: 'Other' },
]

export const PROPERTY_COLORS = [
  '#f0b429', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf', '#facc15', '#f87171', '#c084fc',
]

export function emptyDB(): DB {
  return {
    version: 1,
    properties: [],
    transactions: [],
    settings: { businessName: 'My Rentals', accounts: ['Checking', 'Credit card', 'Cash'] },
  }
}
