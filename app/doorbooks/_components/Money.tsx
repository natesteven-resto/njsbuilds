import { fmtMoney } from '../_lib/money'

export function Money({ cents, colored, sign, noCents, className }: { cents: number; colored?: boolean; sign?: boolean; noCents?: boolean; className?: string }) {
  const cls = ['db-num', className ?? '']
  if (colored) cls.push(cents > 0 ? 'db-income' : cents < 0 ? 'db-expense' : 'db-muted')
  return <span className={cls.join(' ').trim()}>{fmtMoney(cents, { sign, cents: !noCents })}</span>
}
