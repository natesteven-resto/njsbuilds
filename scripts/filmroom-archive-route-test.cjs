const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..')+'/';
const ts=require(root+'node_modules/typescript');
const {NextRequest,NextResponse}=require(root+'node_modules/next/server');
let row,fail,authenticated,mutations;
function reset(){row={id:'player-a',owner_id:'coach',archived_at:null};fail=null;authenticated=true;mutations=[]}
const auth={getVerifiedUser:async()=>{if(!authenticated)throw NextResponse.json({error:'Unauthorized'},{status:401});return{user:{id:'coach'}}},assertOwner:(owner,user)=>{if(owner!==user)throw NextResponse.json({error:'Forbidden'},{status:403})},createServiceClient:()=>({from(table){assert.equal(table,'players');let updates,filters={}; const result=()=>{if(fail)return{data:null,error:{message:fail}};let match=row&&Object.entries(filters).every(([k,v])=>row[k]===v);if(updates&&match){mutations.push(updates);Object.assign(row,updates)}return{data:match?{...row}:null,error:null}};const q={select(){return q},eq(k,v){filters[k]=v;return q},single:async()=>result(),maybeSingle:async()=>result(),update(v){updates=v;return q},delete(){throw Error('Hard DELETE is forbidden')},then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}};return q}})};
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'app/api/filmroom/players/[playerId]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:out,require:n=>n==='@/lib/filmroom-supabase-server'?auth:n==='next/server'?{NextRequest,NextResponse}:require(n),Date});
const params={params:Promise.resolve({playerId:'player-a'})};const req=(method,body)=>new NextRequest('https://example.test/api/filmroom/players/player-a',{method,...(body?{body:JSON.stringify(body),headers:{'content-type':'application/json'}}:{})});
(async()=>{
 reset();assert.equal((await out.DELETE(req('DELETE'),params)).status,200);assert(row.archived_at);assert.equal(mutations.length,1);console.log('PASS real DELETE handler archives via UPDATE');
 assert.equal((await out.DELETE(req('DELETE'),params)).status,200);assert.equal(mutations.length,1);console.log('PASS archive is idempotent');
 assert.equal((await out.PATCH(req('PATCH',{restore:true}),params)).status,200);assert.equal(row.archived_at,null);console.log('PASS real PATCH restores');
 reset();row.owner_id='other';assert.equal((await out.DELETE(req('DELETE'),params)).status,403);assert.equal((await out.PATCH(req('PATCH',{restore:true}),params)).status,404);assert.equal(mutations.length,0);console.log('PASS foreign owner cannot archive or restore');
 reset();authenticated=false;assert.equal((await out.DELETE(req('DELETE'),params)).status,401);assert.equal((await out.PATCH(req('PATCH',{restore:true}),params)).status,401);assert.equal(mutations.length,0);console.log('PASS unauthenticated calls rejected');
 reset();fail='column archived_at does not exist';assert.notEqual((await out.DELETE(req('DELETE'),params)).status,200);assert.equal((await out.PATCH(req('PATCH',{restore:true}),params)).status,500);assert.equal(mutations.length,0);console.log('PASS missing migration fails closed without destructive fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
