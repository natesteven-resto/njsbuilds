import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { done, notes, date, day, mode, exercises } = body as {
      done: Record<string, boolean>
      notes: string
      date: string
      day: string
      mode: string
      exercises: Array<{ id: string; label: string; section: string }>
    }

    const completedExercises = exercises.filter(e => done[e.id])
    const skippedExercises = exercises.filter(e => !done[e.id])
    const completedCount = completedExercises.length
    const totalCount = exercises.length
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    const modeColor = mode === 'Strength & Plyometrics' ? '#3b82f6' : '#22c55e'
    const modeEmoji = mode === 'Strength & Plyometrics' ? '💪' : '🏀'

    // Group completed exercises by section
    const sectionMap: Record<string, string[]> = {}
    for (const ex of completedExercises) {
      if (!sectionMap[ex.section]) sectionMap[ex.section] = []
      sectionMap[ex.section].push(ex.label)
    }

    const sectionRows = Object.entries(sectionMap).map(([section, labels]) => `
      <div style="margin-bottom: 16px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${section}</p>
        ${labels.map(label => `
          <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #111827;">
            <span style="display: inline-block; width: 8px; height: 8px; background: ${modeColor}; border-radius: 50%; flex-shrink: 0;"></span>
            <span style="font-size: 14px; color: #E2E8F0;">${label}</span>
          </div>
        `).join('')}
      </div>
    `).join('')

    const skippedRows = skippedExercises.length > 0
      ? `<div style="margin-bottom: 16px;">
          ${skippedExercises.map(ex => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #111827;">
              <span style="display: inline-block; width: 8px; height: 8px; background: #374151; border-radius: 50%; flex-shrink: 0;"></span>
              <span style="font-size: 14px; color: #4B5563; text-decoration: line-through;">${ex.label}</span>
            </div>
          `).join('')}
        </div>`
      : ''

    const isBirthday = day.includes('14th') || day.toLowerCase().includes('birthday')

    await resend.emails.send({
      from: 'Nathan Training <transfers@restoreports.com>',
      to: 'natesteven@gmail.com',
      subject: `${isBirthday ? '🎂' : modeEmoji} Nathan's Workout — ${day} · ${date}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #F1F5F9; padding: 32px; border-radius: 12px;">
          ${isBirthday ? `
          <div style="background: linear-gradient(135deg, #92400e, #78350f); border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0; font-size: 28px;">🎂</p>
            <p style="margin: 4px 0 0; font-size: 20px; font-weight: 900; color: #fef3c7;">Happy 14th Birthday, Nathan!</p>
          </div>
          ` : ''}

          <div style="margin-bottom: 24px;">
            <h2 style="color: ${modeColor}; margin: 0 0 4px;">${modeEmoji} ${mode}</h2>
            <p style="color: #6B7280; margin: 0; font-size: 14px;">${day}</p>
            <p style="color: #9CA3AF; margin: 6px 0 0; font-size: 13px;">${date}</p>
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <div style="flex: 1; background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">COMPLETED</p>
              <p style="margin: 0; font-size: 32px; font-weight: 900; color: ${modeColor};">${completedCount}</p>
            </div>
            <div style="flex: 1; background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">TOTAL</p>
              <p style="margin: 0; font-size: 32px; font-weight: 900; color: #F1F5F9;">${totalCount}</p>
            </div>
            <div style="flex: 1; background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">DONE</p>
              <p style="margin: 0; font-size: 32px; font-weight: 900; color: ${pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'};">${pct}%</p>
            </div>
          </div>

          ${completedExercises.length > 0 ? `
          <div style="background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px; font-size: 12px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">✅ COMPLETED</p>
            ${sectionRows}
          </div>
          ` : ''}

          ${skippedExercises.length > 0 ? `
          <div style="background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 12px; font-size: 12px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">⏭️ SKIPPED</p>
            ${skippedRows}
          </div>
          ` : ''}

          ${notes ? `
          <div style="background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">📝 NOTES</p>
            <p style="margin: 0; font-size: 14px; color: #E2E8F0; line-height: 1.6;">${notes}</p>
          </div>
          ` : ''}

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1f2937;">
            <p style="margin: 0; font-size: 12px; color: #374151;">njsbuilds.com/nathan</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Nathan submit error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
