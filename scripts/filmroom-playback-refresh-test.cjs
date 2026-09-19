const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync('app/filmroom/components/usePrivatePlayback.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
async function test(){let effect,cleanup,calls=0,status=200,version='same',timerId=0;const timers=new Map(),listeners=new Map();const v={readyState:1,currentTime:0,duration:600,playbackRate:1,paused:true,error:null,loads:0,src:'',addEventListener:(name,fn,opts)=>{const a=listeners.get(name)||[];a.push({fn,once:opts?.once});listeners.set(name,a)},removeEventListener:(name,fn)=>listeners.set(name,(listeners.get(name)||[]).filter(x=>x.fn!==fn)),emit(name){for(const x of [...(listeners.get(name)||[])]){x.fn();if(x.once)this.removeEventListener(name,x.fn)}},pause(){this.paused=true;this.emit('pause')},play(){this.paused=false;return Promise.resolve()},removeAttribute(){this.src=''},canPlayType:()=>'',load(){this.loads++;this.pause();this.error=null}};
 const exports_={};vm.runInNewContext(compiled,{exports:exports_,require:n=>n==='react'?{useRef:v=>({current:v}),useState:v=>[v,()=>{}],useEffect:fn=>{effect=fn}}:n==='hls.js'?{default:{isSupported:()=>false},__esModule:true}:null,AbortController,Date,setTimeout:(fn)=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),fetch:async()=>({ok:status===200,status,json:async()=>({src:'session-url',sequence:++calls,sessionId:'session',sourceVersion:version,type:'r2-session',refreshAfterSeconds:40})})});
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 exports_.usePrivatePlayback({current:v},'game','original',()=>{});cleanup=effect();await tick();v.emit('loadedmetadata');assert.equal(v.loads,1);
 v.currentTime=80;v.playbackRate=1.5;v.paused=false;v.emit('timeupdate');
 for(let i=0;i<3;i++){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();await tick()}
 assert.equal(calls,4);assert.equal(v.loads,1);assert.equal(v.currentTime,80);assert.equal(v.paused,false);assert.equal(v.src,'session-url');
 v.error={code:2};v.emit('error');await tick();assert.equal(v.loads,2);assert.equal(v.src,'session-url');v.emit('loadedmetadata');assert.equal(v.currentTime,80);assert.equal(v.playbackRate,1.5);assert.equal(v.paused,false);
 version='replacement';let [id,fn]=timers.entries().next().value;timers.delete(id);fn();await tick();assert.equal(v.loads,3);v.emit('loadedmetadata');
 status=403;[id,fn]=timers.entries().next().value;timers.delete(id);fn();await tick();assert.equal(v.src,'');assert.equal(v.paused,true);assert.equal(timers.size,0);cleanup();
 console.log('PASS: access renewals do not reload video; expired-media recovery preserves position/speed/play state; source replacement reloads; revoked access stops playback');
}
test().catch(e=>{console.error(e);process.exitCode=1});
