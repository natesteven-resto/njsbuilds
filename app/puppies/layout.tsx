import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Silver Lab Puppies · Kansas',
  description: 'AKC registered Silver Lab puppies. Family raised. Arriving May 30, 2026.',
}

export default function PuppiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
