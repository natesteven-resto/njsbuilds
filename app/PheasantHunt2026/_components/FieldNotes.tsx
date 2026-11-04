'use client'

import { motion } from 'framer-motion'
import { FIELD_TIPS } from '../_lib/data'
import { Section, SectionHead } from './ui'

function RoosterHen() {
  return (
    <div className="ph-card relative overflow-hidden p-5 sm:col-span-2">
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#d9641e] opacity-15 blur-3xl" />
      <div className="ph-eyebrow mb-3">Field ID · the one that matters</div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="ph-display text-4xl leading-none text-[var(--ph-gold)]">Rooster — shoot</div>
          <ul className="mt-3 space-y-1.5 text-[15px] text-[var(--ph-wheat)]/85">
            <li>• Long, pointed tail — up to 20&quot;+</li>
            <li>• White ring around the neck</li>
            <li>• Red face, iridescent green-black head</li>
            <li>• Copper and gold body, loud as a cowboy bar</li>
            <li>• <span className="font-semibold text-[var(--ph-wheat)]">Cackles</span> when he flushes</li>
          </ul>
        </div>
        <div>
          <div className="ph-display text-4xl leading-none text-[var(--ph-muted)]">Hen — never</div>
          <ul className="mt-3 space-y-1.5 text-[15px] text-[var(--ph-muted)]">
            <li>• Mottled tan and brown all over</li>
            <li>• Shorter tail, no neck ring, no red</li>
            <li>• Quiet flush — a whir, no cackle</li>
            <li>• Next year&apos;s birds. Let her go.</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-[var(--ph-border2)] bg-black/25 px-4 py-3 text-center">
        <span className="ph-display text-2xl text-[var(--ph-wheat)]">No color. No cackle. <span className="text-[var(--ph-gold)]">No shot.</span></span>
      </div>
    </div>
  )
}

export default function FieldNotes() {
  return (
    <Section id="field">
      <SectionHead
        eyebrow="Field Notes"
        title={<>How to find<br /><span className="ph-gold-text">a rooster.</span></>}
        blurb="The short version of twenty years of walking fields, for two guys who have fourteen and twelve."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RoosterHen />
        {FIELD_TIPS.slice(1).map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: (i % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className="ph-card p-5"
          >
            <div className="text-3xl">{t.icon}</div>
            <div className="ph-display mt-3 text-3xl leading-none text-[var(--ph-wheat)]">{t.title}</div>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--ph-muted)]">{t.body}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}
