const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),{NextRequest,NextResponse}=require('next/server');
let player,clip,writes;
const client={from(table){let mutation,filters={};const result=()=>{if(mutation){writes.push({table,mutation});return{data:{id:'clip',...mutation},error:null}}return{data:table==='games'?{id:'game',owner_id:'coach',team_id:'team'}:table==='clips'?clip:player,error:null}};const q={select(){return q},eq(k,v){filters[k]=v;return q},single:async()=>result(),insert(v){mutation=v;return q},update(v){mutation=v;return q},then(a,b){return Promise.resolve(result()).then(a,b)}};return q}};
const auth={getVerifiedUser:async()=>({user:{id:'coach'},supabase:client}),createServiceClient:()=>client,assertOwner:(owner,id)=>{if(owner!==id)throw NextResponse.json({error:'Forbidden'},{status:403})}};
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>n==='@/lib/filmroom-supabase-server'?auth:require(n),URL,Set,Number,Object});return exports}
const post=load('app/api/filmroom/clips/route.ts').POST,patch=load('app/api/filmroom/clips/[clipId]/route.ts').PATCH;
function reset(){player={owner_id:'coach',team_id:'team',archived_at:null};clip={owner_id:'coach',team_id:'team',start_time_ms:0,end_time_ms:1000,primary_player_id:'old'};writes=[]}
async function call(method,value){const body=method==='POST'?{game_id:'game',start_time_ms:0,end_time_ms:1000,primary_player_id:value}:{primary_player_id:value};const req=new NextRequest('https://example.test/api/filmroom/clips',{method,body:JSON.stringify(body)});return method==='POST'?post(req):patch(req,{params:Promise.resolve({clipId:'clip'})})}
(async()=>{
for(const method of ['POST','PATCH']){
 for(const value of [false,42,{},[], '', '  ']){reset();assert.equal((await call(method,value)).status,400,method+' malformed primary');assert.equal(writes.length,0)}
 for(const key of ['owner_id','team_id']){reset();player[key]='foreign';assert.equal((await call(method,'new')).status,403);assert.equal(writes.length,0)}
 reset();player.archived_at='2026-01-01';assert.equal((await call(method,'new')).status,409);assert.equal(writes.length,0);
 reset();assert.equal((await call(method,'new')).status,method==='POST'?201:200);assert.equal(writes.length,1);
 reset();assert.equal((await call(method,null)).status,method==='POST'?201:200);
 console.log('PASS real '+method+' primary validation: types, owner, team, archive, active, null');
}
reset();player.archived_at='2026-01-01';assert.equal((await call('PATCH','old')).status,200);assert.equal(writes[0].mutation.primary_player_id,'old');console.log('PASS historical archived primary may be retained');
})().catch(e=>{console.error(e);process.exitCode=1});
