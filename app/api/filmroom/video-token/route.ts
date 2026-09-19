/** Private original/optimized playback. Always authorizes the viewer before signing. */
import {createHash} from 'node:crypto'
import {streamEnabled,streamToken} from '@/lib/filmroom-stream'
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

const R2_BUCKET   = process.env.CLOUDFLARE_R2_BUCKET!
const R2_KEY_ID   = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
const R2_SECRET   = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT!

const SIGNED_URL_TTL = 900 // 15 minutes

function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_KEY_ID, secretAccessKey: R2_SECRET },
    forcePathStyle: false,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('r2.cloudflarestorage.com')) {
      return u.hostname.startsWith('filmroom-videos.')
        ? u.pathname.replace(/^\//, '')
        : u.pathname.replace(/^\/filmroom-videos\//, '')
    }
    if (u.hostname.includes('r2.dev')) return u.pathname.replace(/^\//, '')
    return null
  } catch { return null }
}

function isStreamUrl(url: string): boolean {
  return url.includes('videodelivery.net') || url.includes('cloudflarestream.com')
}

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 })

    const svc = createServiceClient()
    const { data: game, error } = await svc
      .from('games')
      .select('owner_id, video_url, video_id')
      .eq('id', gameId)
      .single()

    if (error || !game) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isParent = game.owner_id !== user.id
    if (isParent) {
      const {data:allowed,error:accessError}=await supabase.rpc('filmroom_parent_access',{p_game:gameId,p_kind:'film'})
      if(accessError || allowed !== true) return NextResponse.json({error:'Forbidden'},{status:403})
    }
    // Parent URLs expire quickly after sharing is revoked. Existing downloaded bytes cannot be recalled.
    const ttl = isParent ? 60 : SIGNED_URL_TTL
    const sourceVersion=createHash('sha256').update(game.video_url||'').digest('hex')
    if (!game.video_url) return NextResponse.json({ error: 'No video attached to this game' }, { status: 404 })

    if(searchParams.get('quality')==='auto') {
      if(!streamEnabled())return NextResponse.json({error:'Auto is unavailable. Choose Original.'},{status:503})
      const {data:asset,error:assetError}=await svc.from('filmroom_playback_assets').select('*').eq('game_id',gameId).eq('source_url',game.video_url).eq('state','ready').maybeSingle()
      if(assetError||!asset)return NextResponse.json({error:'Auto is not ready. Choose Original.'},{status:409})
      try {
        const src=await streamToken(asset,ttl)
        return NextResponse.json({type:'hls',src,sourceVersion:sourceVersion+':'+asset.id,expiresInSeconds:ttl,refreshAfterSeconds:isParent?40:720},{headers:{'Cache-Control':'private, no-store'}})
      } catch {return NextResponse.json({error:'Auto is unavailable. Choose Original.'},{status:503})}
    }

    // Cloudflare Stream URLs: we do NOT return raw permanent manifest URLs.
    // Stream requires signed playback tokens (requireSignedURLs) to be private.
    // Until signed Stream tokens are implemented, fail closed rather than
    // returning an unsigned URL that exposes the video to anyone with the link.
    if (isStreamUrl(game.video_url)) {
      return NextResponse.json({
        error: 'Stream video delivery not yet configured for private playback. Re-upload via R2.',
      }, { status: 501 })
    }

    // R2 — generate short-lived presigned GET URL
    const key = extractR2Key(game.video_url)
    if (!key) {
      // Unrecognized URL format — fail closed; never return raw URL
      return NextResponse.json({ error: 'Unsupported video storage format' }, { status: 400 })
    }

    const signedUrl = await getSignedUrl(
      r2Client(),
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
      { expiresIn: ttl }
    )

    return NextResponse.json({
      type: 'r2',
      sourceVersion,
      src: signedUrl,
      expiresInSeconds: ttl,
      refreshAfterSeconds: isParent ? 40 : 720, // refresh at 12 min
    }, {headers:{'Cache-Control':'private, no-store'}})
  } catch (e) {
    if (e instanceof NextResponse) return e
    console.error('[video-token]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
