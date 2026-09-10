import { NextResponse } from 'next/server'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

/**
 * GET /api/filmroom/upload
 * Returns a one-time direct upload URL from Cloudflare Stream.
 * The client uploads the video file directly to Cloudflare — no bandwidth
 * goes through our server.
 */
export async function GET() {
  if (!ACCOUNT_ID || !API_TOKEN) {
    return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 14400, // 4 hours max — full game
          requireSignedURLs: false,
          allowedOrigins: ['njsbuilds.com', 'localhost:3000', '*.vercel.app'],
        }),
      }
    )

    const data = await res.json()
    if (!data.success) {
      return NextResponse.json({ error: data.errors?.[0]?.message ?? 'Stream API error' }, { status: 500 })
    }

    return NextResponse.json({
      uploadUrl: data.result.uploadURL,
      videoId: data.result.uid,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get upload URL' }, { status: 500 })
  }
}
