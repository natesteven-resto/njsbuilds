import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { AppShell } from './_components/AppShell'
import './doorbooks.css'

export const metadata: Metadata = {
  title: 'Doorbooks \u2014 Bookkeeping built for landlords',
  description: 'Rental property bookkeeping with profit & loss by property, a Schedule E chart of accounts, and rent tracking. No classes, no accountant-speak.',
}

export const viewport: Viewport = {
  themeColor: '#0b0e13',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display', display: 'swap' })

export default function DoorbooksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={'db ' + inter.variable + ' ' + display.variable}>
      <AppShell>{children}</AppShell>
    </div>
  )
}
