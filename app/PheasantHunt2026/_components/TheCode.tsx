'use client'

import { motion } from 'framer-motion'
import { RULES, type Person } from '../_lib/data'
import type { Updater } from '../_lib/store'
import { Check, Reveal, Section, SectionHead } from './ui'

interface Props {
  people: Person[]
  rulesAck: Record<string, boolean>
  update: Updater
}

export default function TheCode({ people, rulesAck, update }: Props) {
  const allAck = people.every((p) => rulesAck[p.id])
  return (
    <Section id="code" className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(217,100,30,0.12),transparent_60%)]" />
      <SectionHead
        eyebrow="The Code"
        title={<>Ten rules.<br /><span className="ph-gold-text">Zero exceptions.</span></>}
        blurb="Read out loud at the tailgate, every morning, before a single shell goes in. Everybody signs below. Yes, Dad too."
      />

      <ol className="grid gap-3 sm:grid-cols-2">
        {RULES.map((r, i) => (
          <motion.li
            key={r.n}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: (i % 2) * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="ph-card group relative flex gap-4 overflow-hidden p-5"
          >
            <div className="ph-display shrink-0 text-6xl leading-none text-[var(--ph-gold)]/25 transition-colors group-hover:text-[var(--ph-gold)]/70 tabular-nums">
              {String(r.n).padStart(2, '0')}
            </div>
            <div>
              <div className="ph-display text-3xl leading-none text-[var(--ph-wheat)]">{r.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--ph-muted)]">{r.detail}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      <Reveal className="mt-8">
        <div className={`ph-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${allAck ? 'border-[var(--ph-gold)]/60' : ''}`}>
          <div>
            <div className="ph-display text-3xl leading-none text-[var(--ph-wheat)]">{allAck ? 'Code signed. Line is set.' : 'Sign the code'}</div>
            <div className="mt-1 text-sm text-[var(--ph-muted)]">{allAck ? 'Every hunter has read and agreed. Load up.' : 'Each hunter checks their own name once they can recite it.'}</div>
          </div>
          <div className="flex flex-wrap gap-4">
            {people.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm font-semibold text-[var(--ph-wheat)]">
                <Check
                  on={!!rulesAck[p.id]}
                  onToggle={() => update((s) => ({ ...s, rulesAck: { ...s.rulesAck, [p.id]: !s.rulesAck[p.id] } }))}
                  label={`${p.name} has read the code`}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
