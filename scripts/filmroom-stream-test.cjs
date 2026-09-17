const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
process.env.FILMROOM_STREAM_ENABLED='true';process.env.CLOUDFLARE_STREAM_TOKEN='test-only';
let response,requests=[];
const exports1={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/filmroom-stream.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exports1,require:n=>n==='./filmroom-supabase-server'?{}:require(n),process,Date,AbortSignal,fetch:async(url,opts)=>{requests.push({url,opts});return {ok:response.ok??true,status:response.status??200,json:async()=>{if(response.empty)throw Error('empty body');return response}}},console});
const asset={id:'job',stream_id:'a'.repeat(32),state:'ready'},video={uid:asset.stream_id,creator:'job',meta:{app:'filmroom',job:'job'},readyToStream:true,requireSignedURLs:true};
(async()=>{
response={success:true,result:video};await assert.rejects(()=>exports1.streamToken({...asset,state:'processing'},60));assert.equal(requests.length,0);
response={success:true,result:{...video,requireSignedURLs:false}};await assert.rejects(()=>exports1.streamToken(asset,60));assert.equal(requests.length,1);
response={success:true,result:{...video,creator:'other'}};await assert.rejects(()=>exports1.streamToken(asset,60));assert.equal(requests.length,2);
// A successful read then a short-lived signing request.
let count=0;const successful={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/filmroom-stream.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:successful,require:()=>({}),process,Date,AbortSignal,fetch:async(url,opts)=>{count++;if(count%2===0){const body=JSON.parse(opts.body);assert.ok(body.exp-Math.floor(Date.now()/1000)<=60);assert.ok(!body.downloadable)}return {ok:true,status:200,json:async()=>({success:true,result:count%2?video:{token:'signed.test.token'}})}}});
assert.match(await successful.streamToken(asset,60),/\/signed.test.token\/manifest\/video.m3u8$/);
response={ok:false,status:403,success:false,errors:[{message:'secret source URL'}]};await assert.rejects(()=>exports1.streamRequest('/copy','POST',{}),e=>!e.message.includes('secret'));
response={ok:true,status:200,empty:true};await exports1.streamRequest('/'+asset.stream_id,'DELETE');console.log('PASS empty successful Stream deletion');
process.env.FILMROOM_STREAM_ENABLED='false';const before=requests.length;await assert.rejects(()=>exports1.streamRequest(''));assert.equal(requests.length,before);
console.log('PASS Stream privacy recheck, creator isolation, short token expiry, no downloads, disabled flag, sanitized errors');
})().catch(e=>{console.error(e);process.exitCode=1});
