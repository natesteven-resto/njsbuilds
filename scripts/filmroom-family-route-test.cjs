const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),{NextRequest,NextResponse}=require('next/server')
let signedIn=false,rpcError=null,calls=[]
const exports_={}
const mocks={'next/server':{NextRequest,NextResponse},'@/lib/filmroom-supabase-server':{getVerifiedUser:async()=>{
 if(!signedIn)throw NextResponse.json({error:'Unauthorized'},{status:401})
 return {user:{id:'parent',email:'parent@example.test'},supabase:{rpc:async(name,args)=>{calls.push({name,args});return {data:name==='filmroom_parent_library'?{games:[],invitations:[]}:[],error:rpcError}}}}
}}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/filmroom/family/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exports_,require:n=>{assert(n in mocks,'Unexpected dependency: '+n);return mocks[n]}})
const id='00000000-0000-4000-8000-000000000001'
const get=query=>new NextRequest('https://example.test/api/filmroom/family'+(query||''))
const post=()=>new NextRequest('https://example.test/api/filmroom/family',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
;(async()=>{
 assert.equal((await exports_.GET(get())).status,401);assert.equal((await exports_.POST(post())).status,401);assert.equal(calls.length,0)
 signedIn=true;let response=await exports_.GET(get());assert.equal(response.status,200);assert.equal((await response.json()).email,'parent@example.test');assert.equal(calls.at(-1).name,'filmroom_parent_library')
 assert.equal(response.headers.get('cache-control'),'private, no-store')
 rpcError={message:'Not shared'};assert.equal((await exports_.GET(get('?game_id='+id))).status,403);assert.equal(calls.at(-1).name,'filmroom_parent_stats');assert.equal(calls.at(-1).args.p_game,id)
 assert.equal((await exports_.GET(get('?game_id='+id+'&view=clips'))).status,403);assert.equal(calls.at(-1).name,'filmroom_parent_clips')
 rpcError=null;assert.equal((await exports_.GET(get('?game_id='+id+'&view=clips'))).status,200);rpcError={message:'Not shared'}
 assert.equal((await exports_.POST(post())).status,403);assert.equal(calls.at(-1).name,'filmroom_accept_parent_invite')
 rpcError=null;assert.equal((await exports_.POST(post())).status,200)
 console.log('PASS: authenticated parent library, private caching, own email, forbidden stats, verified invitation acceptance, no legacy database')
})().catch(e=>{console.error(e);process.exitCode=1})
