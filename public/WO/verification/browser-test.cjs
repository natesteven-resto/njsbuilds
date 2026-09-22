const {chromium}=require('/home/nate/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core');
const path=require('path'),fs=require('fs'),assert=require('assert');
(async()=>{
const root=path.resolve(__dirname,'..');const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+root+'/index.html');await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
assert.equal(await page.locator('#rest').inputValue(),'10');assert.equal(await page.locator('#total').textContent(),'17:20');
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.screenshot({path:root+'/verification/mobile.png',fullPage:true});
const media=[];
// Real browser decode/playback across a loop for every MP4, without a server.
for(let i=0;i<15;i++){
 await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
 const result=await page.evaluate(async()=>{const v=document.querySelector('video');v.playbackRate=8;v.currentTime=Math.max(0,v.duration-.3);let wrapped=false;await v.play();let prior=v.currentTime;await new Promise((resolve,reject)=>{const start=performance.now();const timer=setInterval(()=>{if(v.currentTime<prior){wrapped=true;clearInterval(timer);resolve();}else if(performance.now()-start>3000){clearInterval(timer);reject(Error('No loop'));}prior=v.currentTime;},10);});v.pause();v.playbackRate=1;return {file:v.currentSrc.split('/').pop(),duration:v.duration,loop:wrapped,muted:v.muted,width:v.videoWidth,height:v.videoHeight};});
 assert(result.loop&&result.muted&&result.width===660);media.push(result);
 if(i<14)await page.click('#next');
}
await page.click('#restart');
await page.clock.install({time:new Date('2026-09-22T18:00:00Z')});await page.clock.pauseAt(new Date('2026-09-22T18:00:01Z'));await page.reload();await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
await page.click('#start');await page.clock.fastForward(5000);assert.equal(await page.locator('#timer').textContent(),'0:55');await page.click('#pause');await page.clock.fastForward(20000);assert.equal(await page.locator('#timer').textContent(),'0:55');await page.click('#start');await page.clock.fastForward(55000);assert.equal(await page.locator('#phase').textContent(),'TRANSITION / REST');assert.equal(await page.locator('#timer').textContent(),'0:10');
await page.clock.fastForward(10000);assert.equal(await page.locator('#name').textContent(),'Body waves');
await page.click('#previous');assert.equal(await page.locator('#name').textContent(),'Lymphatic hops');await page.click('#next');assert.equal(await page.locator('#name').textContent(),'Body waves');await page.click('#restart');assert.equal(await page.locator('#timer').textContent(),'1:00');assert.equal(await page.locator('#counter').textContent(),'01 / 15');
await page.click('#start');
const phases=[];
for(let i=0;i<15;i++){
 assert.equal(await page.locator('#counter').textContent(),`${String(i+1).padStart(2,'0')} / 15`);
 await page.clock.fastForward(60000);
 if(i<14){assert.equal(await page.locator('#phase').textContent(),'TRANSITION / REST');assert.equal(await page.locator('#timer').textContent(),'0:10');phases.push('rest');await page.clock.fastForward(10000);}else assert.equal(await page.locator('#name').textContent(),'Workout complete');
}
assert.equal(phases.length,14);assert(await page.locator('#start').isDisabled());assert.equal(await page.locator('#timer').textContent(),'0:00');assert.equal(await page.locator('#progress').evaluate(e=>e.style.width),'100%');
await page.click('#restart');await page.fill('#rest','0');await page.locator('#rest').dispatchEvent('change');assert.equal(await page.locator('#total').textContent(),'15:00');await page.click('#start');await page.clock.fastForward(60000);assert.equal(await page.locator('#name').textContent(),'Body waves');assert.equal(await page.locator('#phase').textContent(),'MOVE AT YOUR PACE');
await page.click('#restart');await page.fill('#rest','20');await page.locator('#rest').dispatchEvent('change');await page.click('#start');await page.clock.fastForward(60000);assert.equal(await page.locator('#timer').textContent(),'0:20');await page.fill('#rest','7');await page.locator('#rest').dispatchEvent('change');assert.equal(await page.locator('#timer').textContent(),'0:20');await page.click('#pause');await page.clock.fastForward(10000);assert.equal(await page.locator('#timer').textContent(),'0:20');await page.click('#start');await page.clock.fastForward(20000);assert.equal(await page.locator('#name').textContent(),'Body waves');await page.clock.fastForward(60000);assert.equal(await page.locator('#timer').textContent(),'0:07');
await page.click('#restart');await page.fill('#rest','10');await page.locator('#rest').dispatchEvent('change');
await page.setViewportSize({width:1280,height:900});await page.screenshot({path:root+'/verification/desktop.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);fs.writeFileSync(root+'/verification/browser-checks.json',JSON.stringify({result:'pass',environment:'Headless Google Chrome; file://; 390x844 mobile viewport and 1280x900 desktop',media,checks:['All 15 clips played and looped in real browser','Local file operation without server','No horizontal overflow at mobile/desktop sizes','Start, pause, resume, restart, previous, next','Full 15-work/14-rest sequence with accelerated clock','Completion stops timer and playback','Zero-second rest skips transition','Custom rest and next-transition-only setting changes','Pause during rest','No JavaScript page errors'],physical_phone_tested:false},null,2));
await browser.close();console.log('PASS: media playback and complete workout flow.');
})().catch(e=>{console.error(e);process.exit(1)});
