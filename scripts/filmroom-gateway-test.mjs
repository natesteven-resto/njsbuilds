import assert from 'node:assert/strict'
import {PlaybackSession} from '../cloudflare/filmroom-playback/worker.mjs'
const stored=new Map(),storage={get:async k=>stored.get(k),put:async obj=>Object.entries(obj).forEach(([k,v])=>stored.set(k,v)),setAlarm:async()=>{},delete:async k=>stored.delete(k)}
let reads=0
const session=new PlaybackSession({storage},{ADMIN_SECRET:'test-only',FILMROOM_VIDEOS:{get:async(key,{range})=>{reads++;assert.equal(key,'games/owned.mp4');assert.equal(range.get('range'),'bytes=10-19');return {body:new Uint8Array(10),size:100,range:{offset:10,length:10},httpEtag:'"test"',writeHttpMetadata:h=>h.set('Cache-Control','public')}},head:async()=>({size:100,httpEtag:'"test"',writeHttpMetadata:()=>{}})}})
const renew=(viewer='a',game='game-a',secret='test-only')=>session.fetch(new Request('https://worker.test/session/test',{method:'POST',headers:{Authorization:'Bearer '+secret},body:JSON.stringify({viewer,game,key:'games/owned.mp4'})}))
const video=()=>session.fetch(new Request('https://worker.test/video/test',{headers:{Range:'bytes=10-19'}}))
assert.equal((await video()).status,403);assert.equal(reads,0)
assert.equal((await renew('a','game-a','wrong')).status,403)
assert.equal((await renew()).status,200);assert(stored.get('grant').expires-Date.now()<=60000)
const r=await video();assert.equal(r.status,206);assert.equal(r.headers.get('Content-Range'),'bytes 10-19/100');assert.equal(r.headers.get('Content-Length'),'10');assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal((await r.arrayBuffer()).byteLength,10)
assert.equal((await renew('b')).status,403);assert.equal((await renew('a','other')).status,403)
stored.get('grant').expires=0;assert.equal((await video()).status,403);await session.alarm();assert(!stored.has('grant'));assert(stored.has('identity'));assert.equal((await renew('b')).status,403)
assert.equal((await renew()).status,200);assert.equal((await video()).status,206)
assert.equal((await session.fetch(new Request('https://worker.test/video/test',{method:'HEAD'}))).headers.get('Content-Length'),'100')
console.log('PASS: gateway authentication, immutable viewer/game, 60-second expiry, renewal, range bytes, private caching, cleanup and HEAD')
