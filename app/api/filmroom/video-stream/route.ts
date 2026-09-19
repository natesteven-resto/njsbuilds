import {NextRequest,NextResponse} from 'next/server'
import {GET as authorizeVideo} from '../video-token/route'

// A stable media URL lets each new byte-range request obtain fresh authorization
// without changing the video element's source. Video bytes travel directly from R2.
export async function GET(request:NextRequest){
 const url=new URL(request.url);url.pathname='/api/filmroom/video-token';url.searchParams.set('quality','original')
 const result=await authorizeVideo(new NextRequest(url,{headers:request.headers}))
 if(!result.ok)return result
 const data=await result.json()
 if(data.type!=='r2'||typeof data.src!=='string')return NextResponse.json({error:'Original video unavailable'},{status:404})
 const response=NextResponse.redirect(data.src,307)
 response.headers.set('Cache-Control','private, no-store, max-age=0')
 return response
}
