import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  try {
    const cmd = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: key,
    })
    const obj = await r2.send(cmd)
    if (!obj.Body) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const headers = new Headers()
    headers.set('Content-Type', obj.ContentType ?? 'video/mp4')
    headers.set('Cache-Control', 'private, max-age=3600')
    if (obj.ContentLength) headers.set('Content-Length', String(obj.ContentLength))

    // Support range requests for video seeking
    const range = req.headers.get('range')
    if (range && obj.ContentLength) {
      const parts = range.replace('bytes=', '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : obj.ContentLength - 1
      const chunkSize = end - start + 1
      headers.set('Content-Range', `bytes ${start}-${end}/${obj.ContentLength}`)
      headers.set('Content-Length', String(chunkSize))
      headers.set('Accept-Ranges', 'bytes')
      // Fetch with range
      const rangeCmd = new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
        Key: key,
        Range: range,
      })
      const rangeObj = await r2.send(rangeCmd)
      const body = rangeObj.Body as ReadableStream
      return new NextResponse(body, { status: 206, headers })
    }

    headers.set('Accept-Ranges', 'bytes')
    const body = obj.Body as ReadableStream
    return new NextResponse(body, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 })
  }
}
