import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const { key } = await req.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  try {
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET!, Key: key }),
      { expiresIn: 3600 }
    )
    return NextResponse.json({ url })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500 })
  }
}
