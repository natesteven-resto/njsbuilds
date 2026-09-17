const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),{NextRequest,NextResponse}=require('next/server');
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require:n=>mocks[n]||require(n),process,console,Date,URL,Set});return exports}
let allowed=false,error=null,owner='coach',calls=0,ttl=0;
const auth={getVerifiedUser:async()=>({user:{id:'parent'},supabase:{rpc:async(name,args)=>{assert.equal(name,'filmroom_parent_access');assert.equal(args.p_kind,'film');return {data:allowed,error}}}}),createServiceClient:()=>({from:()=>({select:()=>({eq:()=>({single:async()=>({data:{owner_id:owner,video_url:'https://filmroom-videos.example.r2.cloudflarestorage.com/games/test.mp4'}})})})})})};
const token=load('app/api/filmroom/video-token/route.ts',{'@/lib/filmroom-supabase-server':auth,'@aws-sdk/client-s3':{S3Client:class{},GetObjectCommand:class{}},'@aws-sdk/s3-request-presigner':{getSignedUrl:async(a,b,o)=>{calls++;ttl=o.expiresIn;return 'https://example.test/signed'}}});
const request=()=>new NextRequest('https://example.test/api/filmroom/video-token?gameId=game');
(async()=>{
assert.equal((await token.GET(request())).status,403);assert.equal(calls,0);
allowed=true;error={message:'db failed'};assert.equal((await token.GET(request())).status,403);assert.equal(calls,0);
error=null;let r=await token.GET(request());assert.equal(r.status,200);assert.equal(ttl,60);assert.equal((await r.json()).refreshAfterSeconds,40);assert.equal(r.headers.get('cache-control'),'private, no-store');
allowed=false;assert.equal((await token.GET(request())).status,403);assert.equal(calls,1);
owner='parent';assert.equal((await token.GET(request())).status,200);assert.equal(ttl,900);
const safe=load('lib/filmroom-auth-next.ts',{}).safeFilmroomNext;
for(const bad of ['//evil.test','https://evil.test','/filmroom\\evil','/filmroomx','/filmroom/\nwrong'])assert.equal(safe(bad),'/filmroom');assert.equal(safe('/filmroom/family'),'/filmroom/family');
console.log('PASS parent playback authorization, fail-closed errors, revocation, short expiry, owner regression and safe auth redirects');
})().catch(e=>{console.error(e);process.exitCode=1});
