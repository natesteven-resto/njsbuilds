'use strict';
(()=>{
const data=window.WORKOUT, exercises=data.exercises, $=id=>document.getElementById(id), video=$('demo');
let index=0, phase='work', remaining=60, running=false, deadline=0, restSeconds=10, wakeLock=null, wakePending=false;
try { const saved=localStorage.getItem('dailyMovementRest'); if(saved!==null&&Number.isFinite(+saved))restSeconds=Math.min(300,Math.max(0,Math.round(+saved))); } catch {}
$('rest').value=restSeconds;
const fmt=n=>`${Math.floor(Math.max(0,Math.ceil(n))/60)}:${String(Math.max(0,Math.ceil(n))%60).padStart(2,'0')}`;
function announce(s){$('status').textContent=s;}
async function releaseWake(){if(wakeLock){const old=wakeLock;wakeLock=null;try{await old.release();}catch{}}}
async function acquireWake(){
 if(!running||document.visibilityState!=='visible'||wakeLock||wakePending)return;
 if(!('wakeLock' in navigator)){ $('wake').textContent='Screen wake lock not supported here';return; }
 wakePending=true;
 try {const lock=await navigator.wakeLock.request('screen');if(!running||document.visibilityState!=='visible'){await lock.release();return;}wakeLock=lock;$('wake').textContent='Screen kept awake';lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;$('wake').textContent='Screen wake lock released';});}
 catch{$('wake').textContent='Screen wake lock unavailable in this browser';}finally{wakePending=false;}
}
function play(){const promise=video.play();if(promise)promise.catch(error=>{if(error.name==='AbortError')return;if(running){pause();announce('Playback could not start. Press Start to retry.');}});}
function media(){const ex=exercises[index];video.src=ex.clip;video.poster=ex.thumbnail;video.load();$('mediaError').hidden=true;if(running)play();}
function draw(){
 const ex=exercises[index];$('name').textContent=phase==='done'?'Workout complete':ex.name;
 $('counter').textContent=`${String(index+1).padStart(2,'0')} / ${exercises.length}`;
 $('phase').textContent=phase==='done'?'SESSION FINISHED':phase==='rest'?'TRANSITION / REST':running?'MOVE AT YOUR PACE':'READY / PAUSED';
 $('timer').textContent=fmt(remaining);$('timer').setAttribute('aria-label',`${Math.ceil(remaining)} seconds remaining`);
 $('form').textContent=ex.form_instructions.join(' ');
 $('notes').replaceChildren(...ex.confidence_notes.map(n=>{let li=document.createElement('li');li.textContent=n;return li;}));
 $('restOverlay').hidden=phase!=='rest';$('nextName').textContent=exercises[index+1]?.name||'';
 $('start').disabled=running||phase==='done';$('start').textContent=remaining<60&&phase==='work'?'Resume':'Start';$('pause').disabled=!running;
 $('previous').disabled=index===0&&phase!=='done';$('next').disabled=phase==='done';
 $('total').textContent=fmt(900+14*restSeconds);
 $('queueCount').textContent=phase==='done'?'Complete':`${Math.max(0,14-index)} remaining`;
 $('upcoming').replaceChildren(...exercises.map((e,i)=>{const li=document.createElement('li');li.className=i<index||phase==='done'?'done':i===index?'current':'';const num=document.createElement('span');num.className='order';num.textContent=String(i+1).padStart(2,'0');const img=document.createElement('img');img.src=e.thumbnail;img.alt='';img.loading='lazy';const txt=document.createElement('div');const title=document.createElement('strong');title.textContent=e.name;const sub=document.createElement('small');sub.textContent=i<index||phase==='done'?'Passed':i===index?'Current · 1 min':'1 min';txt.append(title,sub);li.append(num,img,txt);return li;}));
 updateTime();
}
function updateTime(){ $('timer').textContent=fmt(remaining);const workDone=phase==='done'?900:index*60+(phase==='rest'?60:60-remaining);$('progress').style.width=`${Math.max(0,Math.min(100,workDone/900*100))}%`; }
function finish(){running=false;phase='done';remaining=0;video.pause();releaseWake();announce('Workout complete. 15 movements finished.');draw();}
function advance(){
 if(phase==='work'){
  if(index===exercises.length-1){finish();return;}
  if(restSeconds>0){phase='rest';remaining=restSeconds;video.pause();announce(`Transition. Up next: ${exercises[index+1].name}.`);}
  else{index++;remaining=60;media();announce(exercises[index].name);}
 }else{index++;phase='work';remaining=60;media();announce(exercises[index].name);}
 draw();
}
function tick(){if(!running)return;let now=Date.now();while(running&&now>=deadline){advance();if(running)deadline+=remaining*1000;}if(running){remaining=Math.max(0,(deadline-now)/1000);updateTime();}}
function start(){if(running||phase==='done')return;running=true;deadline=Date.now()+remaining*1000;if(phase==='work')play();acquireWake();announce(phase==='work'?`${exercises[index].name}. One minute of work.`:`Transition. Up next: ${exercises[index+1].name}.`);draw();}
function pause(){tick();if(!running)return;running=false;video.pause();releaseWake();$('wake').textContent='Screen wake lock off while paused';announce('Paused. Press Start to continue.');draw();}
function navigate(delta){tick();let wasRunning=running;index=Math.max(0,Math.min(exercises.length-1,index+delta));if(delta>0&&index===exercises.length-1&&phase==='done')return;phase='work';remaining=60;running=wasRunning;deadline=Date.now()+60000;media();draw();announce(`${exercises[index].name}. ${running?'Running.':'Ready.'}`);}
$('start').addEventListener('click',start);$('pause').addEventListener('click',pause);
$('previous').addEventListener('click',()=>navigate(-1));$('next').addEventListener('click',()=>{if(index===14)finish();else navigate(1);});
$('restart').addEventListener('click',()=>{running=false;index=0;phase='work';remaining=60;video.pause();releaseWake();media();draw();announce('Workout restarted. Press Start to begin.');});
$('rest').addEventListener('change',()=>{let value=Number($('rest').value);restSeconds=Number.isFinite(value)?Math.min(300,Math.max(0,Math.round(value))):10;$('rest').value=restSeconds;try{localStorage.setItem('dailyMovementRest',String(restSeconds));}catch{}draw();announce(`Website transition set to ${restSeconds} seconds. Applies to the next transition.`);});
video.addEventListener('error',()=>{$('mediaError').hidden=false;if(running)pause();});
document.addEventListener('visibilitychange',()=>{tick();if(document.visibilityState==='visible'&&running){acquireWake();if(phase==='work')play();}});
window.addEventListener('pagehide',releaseWake);setInterval(tick,100);media();draw();
})();
