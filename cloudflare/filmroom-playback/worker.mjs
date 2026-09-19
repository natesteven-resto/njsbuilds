// Only Film Room's server can renew a 60-second playback grant. A session's
// viewer/game identity is permanent so expired URLs can never be rebound.
export class PlaybackSession {
 constructor(ctx,env){this.ctx=ctx;this.env=env}
 async fetch(request){
  const url=new URL(request.url)
  if(request.method==='POST'&&url.pathname.startsWith('/session/')){
   if(!this.env.ADMIN_SECRET||request.headers.get('Authorization')!=='Bearer '+this.env.ADMIN_SECRET)return new Response('Forbidden',{status:403})
   const grant=await request.json()
   if(!grant.viewer||!grant.game||typeof grant.key!=='string'||!grant.key.startsWith('games/'))return new Response('Invalid grant',{status:400})
   const identity=await this.ctx.storage.get('identity')
   if(identity&&(identity.viewer!==grant.viewer||identity.game!==grant.game))return new Response('Session mismatch',{status:403})
   await this.ctx.storage.put({identity:{viewer:grant.viewer,game:grant.game},grant:{key:grant.key,expires:Date.now()+60000}})
   await this.ctx.storage.setAlarm(Date.now()+65000)
   return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405})
  const grant=await this.ctx.storage.get('grant')
  if(!grant||grant.expires<=Date.now())return new Response('Access expired',{status:403,headers:{'Cache-Control':'no-store'}})
  let object
  try{object=request.method==='HEAD'?await this.env.FILMROOM_VIDEOS.head(grant.key):await this.env.FILMROOM_VIDEOS.get(grant.key,{range:request.headers})}catch{return new Response('Invalid range',{status:416})}
  if(!object)return new Response('Not found',{status:404})
  const headers=new Headers({'Accept-Ranges':'bytes','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','Content-Type':'video/mp4','ETag':object.httpEtag})
  object.writeHttpMetadata(headers)
  headers.set('Cache-Control','private, no-store')
  let status=200
  if(request.method!=='HEAD'&&request.headers.has('Range')&&object.range){
   const offset=object.range.offset??Math.max(0,object.size-(object.range.suffix??object.size))
   const length=Math.min(object.range.length??object.range.suffix??object.size,object.size-offset)
   headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${object.size}`);headers.set('Content-Length',String(length));status=206
  }else headers.set('Content-Length',String(object.size))
  return new Response(request.method==='HEAD'?null:object.body,{status,headers})
 }
 async alarm(){const grant=await this.ctx.storage.get('grant');if(grant&&grant.expires<=Date.now())await this.ctx.storage.delete('grant')}
}
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname
  if(path==='/health')return Response.json({ok:true})
  const match=path.match(/^\/(?:session|video)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
  if(!match)return new Response('Not found',{status:404})
  if(path.startsWith('/session/')&&(request.method!=='POST'||!env.ADMIN_SECRET||request.headers.get('Authorization')!=='Bearer '+env.ADMIN_SECRET))return new Response('Forbidden',{status:403})
  if(path.startsWith('/video/')&&!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405})
  const id=env.PLAYBACK_SESSIONS.idFromName(match[1]);return env.PLAYBACK_SESSIONS.get(id).fetch(request)
 }
}
