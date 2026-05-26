import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { day, dayLabel, dayEmoji, tagline, reps, completedDrills, notes, date } = body

    // Build drill summary table rows
    const drillRows = Object.entries(completedDrills as Record<string, boolean>)
      .filter(([, done]) => done)
      .map(([drillId, done]) => {
        const repVal = (reps as Record<string, string>)[drillId]
        const repCell = repVal ? `<td style="padding:6px 0;">${repVal}</td>` : '<td style="padding:6px 0; color:#6B7280;">—</td>'
        return `<tr>
          <td style="padding:6px 0;">
            <span style="display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>
            ${drillId.replace(/_/g, ' ')}
          </td>
          ${repCell}
        </tr>`
      })
      .join('')

    const completedCount = Object.values(completedDrills as Record<string, boolean>).filter(Boolean).length

    await resend.emails.send({
      from: 'Addison Training <transfers@restoreports.com>',
      to: 'staticclark@gmail.com',
      subject: `⚽ Addison's Workout — ${dayEmoji} ${dayLabel} · ${date}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #F1F5F9; padding: 32px; border-radius: 12px;">
          <div style="margin-bottom: 24px;">
            <h2 style="color: #22c55e; margin: 0 0 4px;">${dayEmoji} ${dayLabel} Training</h2>
            <p style="color: #6B7280; margin: 0; font-size: 14px;">${tagline}</p>
            <p style="color: #9CA3AF; margin: 8px 0 0; font-size: 13px;">${date}</p>
          </div>

          <div style="background: #0f172a; border: 1px solid #166534; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">EXERCISES COMPLETED</p>
            <p style="margin: 0; font-size: 28px; font-weight: 900; color: #22c55e;">${completedCount} drills</p>
          </div>

          ${drillRows ? `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="text-align:left; padding: 6px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #1f2937;">Exercise</th>
                <th style="text-align:left; padding: 6px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #1f2937;">Logged</th>
              </tr>
            </thead>
            <tbody style="font-size: 14px;">
              ${drillRows}
            </tbody>
          </table>
          ` : ''}

          ${notes ? `
          <div style="background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Notes</p>
            <p style="margin: 0; font-size: 14px; color: #E2E8F0; line-height: 1.6;">${notes}</p>
          </div>
          ` : ''}

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1f2937;">
            <p style="margin: 0; font-size: 12px; color: #374151;">njsbuilds.com/addison</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Addison submit error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
