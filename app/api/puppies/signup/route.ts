import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, phone, sexPref, colorPref, notes } = body

    if (!firstName || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
    }

    const id = `signup:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`
    const signup = {
      id,
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      sexPref: sexPref || 'Either',
      colorPref: colorPref || 'No preference',
      notes: notes || '',
      status: 'new',
      createdAt: new Date().toISOString(),
    }

    // Store in KV
    await kv.set(id, signup)
    await kv.lpush('puppies:signups', id)

    // Email Nate
    await resend.emails.send({
      from: 'Puppy Signups <transfers@restoreports.com>',
      to: 'natesteven@gmail.com',
      subject: `🐾 New Puppy Signup — ${firstName} ${lastName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #07090D; color: #F1F3F5; padding: 32px; border-radius: 12px;">
          <h2 style="color: #FF5F04; margin-top: 0;">New Puppy Signup</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${firstName} ${lastName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #FF5F04;">${email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Phone</td><td style="padding: 8px 0;">${phone || '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Sex Pref</td><td style="padding: 8px 0;">${sexPref || 'Either'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Color Pref</td><td style="padding: 8px 0;">${colorPref || 'No preference'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Notes</td><td style="padding: 8px 0;">${notes || '—'}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="https://njsbuilds.com/puppies/admin" style="background: #FF5F04; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View All Signups →</a>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
