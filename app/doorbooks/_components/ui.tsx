'use client'

import { createContext, useContext } from 'react'
import type { Transaction } from '../_lib/types'

export type TxPrefill = Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>

export interface UIApi {
  /** Open the transaction sheet. Pass an existing transaction to edit, or a prefill for a new one. */
  openTx: (opts?: { edit?: Transaction; prefill?: TxPrefill }) => void
  toast: (message: string, action?: { label: string; onClick: () => void }) => void
}

export const UIContext = createContext<UIApi>({ openTx: () => {}, toast: () => {} })

export function useUI(): UIApi {
  return useContext(UIContext)
}
