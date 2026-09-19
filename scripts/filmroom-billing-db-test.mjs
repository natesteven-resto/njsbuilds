import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
const root=new URL('../supabase/migrations/',import.meta.url).pathname;
const db=new PGlite();
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ids={ta:'11111111-1111-4111-8111-111111111111',tb:'22222222-2222-4222-8222-222222222222',ga:'33333333-3333-4333-8333-333333333333',gb:'44444444-4444-4444-8444-444444444444',pa:'55555555-5555-4555-8555-555555555555',pb:'66666666-6666-4666-8666-666666666666',ca:'77777777-7777-4777-8777-777777777777',cb:'88888888-8888-4888-8888-888888888888'};
await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${A}','natesteven@gmail.com',now()),('${B}','other@example.test',now());`);
let failures=0;
try {
  for(const f of ['007_filmroom.sql','008_stat_entries.sql',...readdirSync(root).filter(f=>/^\d{3}_/.test(f) && Number(f.slice(0,3))>=9).sort()]) {
    await db.exec(readFileSync(root+f,'utf8')); console.log('MIGRATION PASS',f);
  }
} catch(e) {console.log('MIGRATION FAIL',e.message); await db.close(); process.exit(1);}
await db.exec(`INSERT INTO coaches(id,email,name,auth_user_id) VALUES('${B}','other@example.test','B','${B}');
INSERT INTO teams(id,coach_id,name,owner_id) VALUES('${ids.ta}','00000000-0000-0000-0000-000000000001','A','${A}'),('${ids.tb}','${B}','B','${B}');
INSERT INTO games(id,team_id,opponent,game_date,owner_id) VALUES('${ids.ga}','${ids.ta}','A',current_date,'${A}'),('${ids.gb}','${ids.tb}','B',current_date,'${B}');
INSERT INTO players(id,team_id,name,owner_id) VALUES('${ids.pa}','${ids.ta}','A','${A}'),('${ids.pb}','${ids.tb}','B','${B}');
INSERT INTO clips(id,game_id,team_id,start_time_ms,end_time_ms,owner_id) VALUES('${ids.ca}','${ids.ga}','${ids.ta}',0,1000,'${A}'),('${ids.cb}','${ids.gb}','${ids.tb}',0,1000,'${B}');`);
async function as(role,user,sql){
  await db.exec('BEGIN');
  try {await db.exec(`SET LOCAL ROLE ${role}; SET LOCAL request.jwt.claim.sub='${user||''}';`); const result=await db.query(sql);await db.exec('ROLLBACK');return result;}
  catch(e){await db.exec('ROLLBACK');throw e;}
}
async function test(name,fn){try{await fn();console.log('PASS',name);}catch(e){failures++;console.log('FAIL',name,e.message);}}
function assert(v,msg){if(!v)throw Error(msg);}
async function denied(sql){try{const r=await as('authenticated',A,sql);assert(r.affectedRows===0,'unexpected write allowed');}catch(e){if(e.message==='unexpected write allowed')throw e; if(!/permission|row-level|constraint|ownership|owner|forbidden|mismatch|not allowed/i.test(e.message))throw e;}}
await test('server role can read owned resources and update upload attachment fields',async()=>{const r=await as('service_role','',`SELECT id FROM games WHERE id='${ids.ga}'`);assert(r.rows.length===1,'server table grant missing');await as('service_role','',`UPDATE games SET video_bytes=0 WHERE id='${ids.ga}'`);await as('service_role','',`SELECT id FROM upload_sessions LIMIT 1`)});
for(const table of ['coaches','teams','games','players','clips','clip_players','clip_comments','player_stats','stat_clips','stat_entries','upload_sessions']){
  await test('anonymous cannot read '+table,async()=>{try{const r=await as('anon','',`SELECT * FROM ${table}`);assert(r.rows.length===0,'data leaked');}catch(e){if(!/permission denied/.test(e.message))throw e;}});
}
await test('user A sees only own games',async()=>{const r=await as('authenticated',A,'SELECT id FROM games');assert(r.rows.some(x=>x.id===ids.ga),'own game inaccessible');assert(!r.rows.some(x=>x.id===ids.gb),'other game visible');});
await test('user B cannot read A game',async()=>assert((await as('authenticated',B,`SELECT * FROM games WHERE id='${ids.ga}'`)).rows.length===0,'data leaked'));
await test('cannot change owner',()=>denied(`UPDATE games SET owner_id='${B}' WHERE id='${ids.ga}'`));
await test('cannot attach game to other team',()=>denied(`UPDATE games SET team_id='${ids.tb}' WHERE id='${ids.ga}'`));
await test('cannot attach clip to other game',()=>denied(`UPDATE clips SET game_id='${ids.gb}' WHERE id='${ids.ca}'`));
await test('cannot link foreign player to own clip',()=>denied(`INSERT INTO clip_players(clip_id,player_id) VALUES('${ids.ca}','${ids.pb}')`));
await test('cannot forge upload session',()=>denied(`INSERT INTO upload_sessions(owner_id,game_id,r2_key,upload_id) VALUES('${A}','${ids.ga}','foreign/key','forged')`));
await test('cannot self-upgrade billing',()=>denied(`UPDATE coaches SET plan='paid' WHERE auth_user_id='${A}'`));
await test('cannot insert stat for foreign player',()=>denied(`INSERT INTO stat_entries(game_id,player_id,stat_type,owner_id) VALUES('${ids.ga}','${ids.pb}','AST','${A}')`));
await test('cannot mutate aggregate for foreign game',()=>denied(`INSERT INTO player_stats(game_id,player_id,pts) VALUES('${ids.gb}','${ids.pa}',99)`));
await test('cannot attach own team to foreign coach',()=>denied(`UPDATE teams SET coach_id='${B}' WHERE id='${ids.ta}'`));
await test('cannot forge stored video reference',()=>denied(`UPDATE games SET video_url='https://example.test/other-user-video' WHERE id='${ids.ga}'`));
await db.exec(`INSERT INTO player_stats(id,game_id,player_id) VALUES('99999999-9999-4999-8999-999999999999','${ids.gb}','${ids.pb}');`);
await test('cannot link foreign aggregate to own clip',()=>denied(`INSERT INTO stat_clips(stat_id,clip_id,stat_type) VALUES('99999999-9999-4999-8999-999999999999','${ids.ca}','AST')`));
await test('cannot INSERT team with foreign coach',()=>denied(`INSERT INTO teams(coach_id,name,owner_id) VALUES('${B}','forged','${A}')`));
await test('cannot INSERT forged video pointer',()=>denied(`INSERT INTO games(team_id,opponent,game_date,owner_id,video_url) VALUES('${ids.ta}','forged',current_date,'${A}','https://example.test/other-video')`));
await test('own game creation works',async()=>assert((await as('authenticated',A,`INSERT INTO games(team_id,opponent,game_date,owner_id) VALUES('${ids.ta}','allowed',current_date,'${A}') RETURNING id`)).rows.length===1,'owner create failed'));
await test('own stat creation works',async()=>assert((await as('authenticated',A,`INSERT INTO stat_entries(game_id,player_id,stat_type,owner_id) VALUES('${ids.ga}','${ids.pa}','AST','${A}') RETURNING id`)).rows.length===1,'owner stat failed'));
await test('own clip-player link works',async()=>assert((await as('authenticated',A,`INSERT INTO clip_players(clip_id,player_id) VALUES('${ids.ca}','${ids.pa}') RETURNING clip_id`)).rows.length===1,'owner link failed'));
await test('cannot impersonate comment author',()=>denied(`INSERT INTO clip_comments(clip_id,text,owner_id,author_id,author_role,author_name) VALUES('${ids.ca}','forged','${A}','${B}','coach','Other User')`));
await test('own player creation works',async()=>assert((await as('authenticated',A,`INSERT INTO players(team_id,name,number,owner_id) VALUES('${ids.ta}','Allowed',0,'${A}') RETURNING id`)).rows.length===1,'owner player failed'));
await test('own clip creation works',async()=>assert((await as('authenticated',A,`INSERT INTO clips(game_id,team_id,start_time_ms,end_time_ms,owner_id) VALUES('${ids.ga}','${ids.ta}',0,1000,'${A}') RETURNING id`)).rows.length===1,'owner clip failed'));
await test('own game edit works',async()=>assert((await as('authenticated',A,`UPDATE games SET notes='Allowed' WHERE id='${ids.ga}' RETURNING id`)).rows.length===1,'owner edit failed'));
await test('own player deletion works',async()=>assert((await as('authenticated',A,`DELETE FROM players WHERE id='${ids.pa}' RETURNING id`)).rows.length===1,'owner delete failed'));
const C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${C}','new@example.test',now())`);
await test('fresh account gets own coach and library idempotently',async()=>{
 await db.exec('BEGIN');
 try{
  await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${C}';`);
  const a=await db.query('SELECT public.provision_default_library() AS lib');
  const b=await db.query('SELECT public.provision_default_library() AS lib');
  assert(a.rows[0].lib.team_id===b.rows[0].lib.team_id,'duplicate library');
  const owned=await db.query(`SELECT t.id FROM teams t JOIN coaches c ON c.id=t.coach_id WHERE t.owner_id='${C}' AND c.auth_user_id='${C}'`);
  assert(owned.rows.length===1,'new account setup missing or wrong coach');
  assert((await db.query('SELECT id FROM games')).rows.length===0,'new account inherited games');
 }finally{await db.exec('ROLLBACK');}
});
await test('anonymous cannot provision library',async()=>{let denied=false;try{await as('anon','',`SELECT public.provision_default_library()`);}catch(e){denied=/permission denied|not authenticated/i.test(e.message);}assert(denied,'anonymous RPC allowed');});
const plA='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', plB='bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
await test('courtside migration exists',async()=>assert((await db.query("SELECT to_regclass('public.playlists') AS t")).rows[0].t,'playlists missing'));
await db.exec(`INSERT INTO playlists(id,owner_id,name) VALUES('${plA}','${A}','A teaching'),('${plB}','${B}','B teaching')`);
for(const t of ['playlists','playlist_clips']){
 await test('anonymous cannot read '+t,async()=>{try{const r=await as('anon','',`SELECT * FROM ${t}`);assert(r.rows.length===0,'data leaked');}catch(e){if(!/permission denied/.test(e.message))throw e;}});
}
await test('A sees only own playlist',async()=>{const r=await as('authenticated',A,'SELECT id FROM playlists');assert(r.rows.length===1 && r.rows[0].id===plA,'incorrect visibility');});
await test('A can create playlist',async()=>assert((await as('authenticated',A,`INSERT INTO playlists(owner_id,name) VALUES('${A}','New playlist') RETURNING id`)).rows.length===1,'owner create failed'));
await test('A can rename playlist',async()=>assert((await as('authenticated',A,`UPDATE playlists SET name='Updated' WHERE id='${plA}' RETURNING id`)).rows.length===1,'owner update failed'));
await test('A cannot rename B playlist',()=>denied(`UPDATE playlists SET name='Hacked' WHERE id='${plB}'`));
await test('A cannot transfer playlist ownership',()=>denied(`UPDATE playlists SET owner_id='${B}' WHERE id='${plA}'`));
await test('A cannot create B playlist',()=>denied(`INSERT INTO playlists(owner_id,name) VALUES('${B}','forged')`));
const pcCols=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='playlist_clips'")).rows.map(r=>r.column_name);
const ownCol=pcCols.includes('owner_id')?',owner_id':'';const ownVal=pcCols.includes('owner_id')?`, '${A}'`:'';
await test('A can add own clip',async()=>assert((await as('authenticated',A,`INSERT INTO playlist_clips(playlist_id,clip_id,position${ownCol}) VALUES('${plA}','${ids.ca}',0${ownVal}) RETURNING clip_id`)).rows.length===1,'own add denied'));
await test('A cannot add B clip to A playlist',()=>denied(`INSERT INTO playlist_clips(playlist_id,clip_id,position${ownCol}) VALUES('${plA}','${ids.cb}',0${ownVal})`));
await test('A cannot add A clip to B playlist',()=>denied(`INSERT INTO playlist_clips(playlist_id,clip_id,position${ownCol}) VALUES('${plB}','${ids.ca}',0${ownVal})`));
await db.exec(`INSERT INTO playlist_clips(playlist_id,clip_id,position${ownCol}) VALUES('${plA}','${ids.ca}',0${ownVal})`);
await test('B cannot read A playlist membership',async()=>assert((await as('authenticated',B,`SELECT * FROM playlist_clips WHERE playlist_id='${plA}'`)).rows.length===0,'membership leaked'));
await test('A cannot replace playlist clip with B clip',()=>denied(`UPDATE playlist_clips SET clip_id='${ids.cb}' WHERE playlist_id='${plA}'`));
await test('A cannot move membership into B playlist',()=>denied(`UPDATE playlist_clips SET playlist_id='${plB}' WHERE playlist_id='${plA}'`));
await test('A can remove own membership',async()=>assert((await as('authenticated',A,`DELETE FROM playlist_clips WHERE playlist_id='${plA}' RETURNING clip_id`)).rows.length===1,'own remove denied'));
const entryId=(await db.query(`SELECT id FROM playlist_clips WHERE playlist_id='${plA}'`)).rows[0].id;
await test('anonymous cannot execute definer reorder',async()=>{let rejected=false;try{await as('anon','',`SELECT reorder_playlist_clips('${plA}',ARRAY['${entryId}']::uuid[])`)}catch(e){rejected=/permission|not allowed|authenticated|owner/i.test(e.message)}assert(rejected,'anonymous definer call succeeded')});
await test('owner reorder succeeds',async()=>{await as('authenticated',A,`SELECT reorder_playlist_clips('${plA}',ARRAY['${entryId}']::uuid[])`)});
await test('foreign owner cannot execute reorder',async()=>{let rejected=false;try{await as('authenticated',B,`SELECT reorder_playlist_clips('${plA}',ARRAY['${entryId}']::uuid[])`)}catch(e){rejected=/permission|not allowed|owner/i.test(e.message)}assert(rejected,'foreign reorder succeeded')});
const clipCols=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='clips'")).rows.map(r=>r.column_name);
if(clipCols.includes('primary_player_id')){
 await test('A can assign own primary player',async()=>assert((await as('authenticated',A,`UPDATE clips SET primary_player_id='${ids.pa}' WHERE id='${ids.ca}' RETURNING id`)).rows.length===1,'own primary player denied'));
 await test('A cannot assign foreign primary player',()=>denied(`UPDATE clips SET primary_player_id='${ids.pb}' WHERE id='${ids.ca}'`));
}
const shotCols=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='stat_entries'")).rows.map(r=>r.column_name);
if(shotCols.includes('shot_x') && shotCols.includes('shot_y')){
 await test('valid shot coordinates persist',async()=>assert((await as('authenticated',A,`INSERT INTO stat_entries(game_id,player_id,stat_type,owner_id,shot_x,shot_y) VALUES('${ids.ga}','${ids.pa}','2M','${A}',0.2,0.7) RETURNING shot_x,shot_y`)).rows.length===1,'shot denied'));
 await test('out of range shot rejected',()=>denied(`INSERT INTO stat_entries(game_id,player_id,stat_type,owner_id,shot_x,shot_y) VALUES('${ids.ga}','${ids.pa}','2M','${A}',-0.1,1.1)`));
 await test('partial shot coordinate rejected',()=>denied(`INSERT INTO stat_entries(game_id,player_id,stat_type,owner_id,shot_x,shot_y) VALUES('${ids.ga}','${ids.pa}','2M','${A}',0.5,NULL)`));
 await test('non-shot event cannot hold shot coordinates',()=>denied(`INSERT INTO stat_entries(game_id,player_id,stat_type,owner_id,shot_x,shot_y) VALUES('${ids.ga}','${ids.pa}','AST','${A}',0.5,0.5)`));
}

await test('counts RPC scopes games to current user',async()=>{const r=await as('authenticated',A,'SELECT * FROM filmroom_clip_counts()');assert(r.rows.every(x=>x.game_id!==ids.gb),'B counts leaked');});
await test('anonymous cannot call counts RPC',async()=>{let blocked=false;try{await as('anon','','SELECT * FROM filmroom_clip_counts()')}catch{blocked=true}assert(blocked,'RPC exposed');});
await test('game review metadata added without changing ownership',async()=>{const r=await db.query(`SELECT review_meta,session_type FROM games WHERE id='${ids.ga}'`);assert(r.rows[0].session_type==='game'&&Array.isArray(r.rows[0].review_meta.bookmarks),'missing defaults');});

// Billing tests run only in this disposable in-memory database.
await db.exec(`UPDATE filmroom_billing_settings SET enabled=true,demo_video_url='https://test.r2.dev/demo/approved.mp4';`);
async function fails(sql,match){let blocked=false;try{await db.exec(sql)}catch(e){blocked=match.test(e.message)}assert(blocked,'expected rejection '+match)}
const makeGame=(owner,team)=>`INSERT INTO games(team_id,opponent,game_date,owner_id) VALUES('${team}','Billing test',current_date,'${owner}')`;
await test('free user cannot create via direct SQL',()=>fails(makeGame(A,ids.ta),/SUBSCRIPTION_REQUIRED/));
await test('free user cannot self-upgrade subscription',()=>denied(`INSERT INTO filmroom_subscriptions(owner_id,complimentary) VALUES('${A}',true)`));
await test('free user cannot disable enforcement',()=>denied(`UPDATE filmroom_billing_settings SET enabled=false`));
await test('free user cannot forge demo status',()=>denied(`UPDATE games SET is_demo=true WHERE id='${ids.ga}'`));
await test('free user cannot forge storage usage',()=>denied(`UPDATE games SET video_bytes=0 WHERE id='${ids.ga}'`));
await test('free user can still read own existing film',async()=>assert((await as('authenticated',A,`SELECT id FROM games WHERE id='${ids.ga}'`)).rows.length===1,'existing film inaccessible'));
await test('demo provisioning is private and idempotent',async()=>{await db.exec(`SET request.jwt.claim.sub='${A}';SELECT filmroom_provision_demo();SELECT filmroom_provision_demo();`);assert((await db.query(`SELECT id FROM games WHERE owner_id='${A}' AND is_demo`)).rows.length===1,'duplicate demo');assert((await as('authenticated',B,`SELECT id FROM games WHERE owner_id='${A}' AND is_demo`)).rows.length===0,'demo leaked')});
await test('demo cannot be deleted by its owner',()=>fails(`DELETE FROM games WHERE owner_id='${A}' AND is_demo`,/DEMO_CANNOT_BE_DELETED/));
await db.exec(`INSERT INTO filmroom_subscriptions(owner_id,customer_id,status,paid_until) VALUES('${A}','cus_A','active',now()+interval '30 days'),('${B}','cus_B','past_due',now()+interval '30 days');`);
await test('subscription details isolated to owner',async()=>assert((await as('authenticated',B,'SELECT * FROM filmroom_subscriptions')).rows.every(r=>r.owner_id===B),'subscription leaked'));
await test('past due user cannot create game',()=>fails(makeGame(B,ids.tb),/SUBSCRIPTION_REQUIRED/));
await test('paid user can create up to 50 games excluding demo',async()=>{while(Number((await db.query(`SELECT count(*) as n FROM games WHERE owner_id='${A}' AND NOT is_demo`)).rows[0].n)<50)await db.exec(makeGame(A,ids.ta));assert(Number((await db.query(`SELECT count(*) as n FROM games WHERE owner_id='${A}'`)).rows[0].n)===51,'demo counted against limit')});
await test('game 51 denied',()=>fails(makeGame(A,ids.ta),/GAME_LIMIT_REACHED/));
await test('expired active subscription denied',async()=>{await db.exec(`UPDATE filmroom_subscriptions SET status='active',paid_until=now()-interval '1 second' WHERE owner_id='${B}'`);await fails(makeGame(B,ids.tb),/SUBSCRIPTION_REQUIRED/)});
await test('complimentary owner can add game',async()=>{await db.exec(`UPDATE filmroom_subscriptions SET complimentary=true WHERE owner_id='${B}';`);await db.exec(makeGame(B,ids.tb))});
const asset=(key,bytes,game=ids.ga,owner=A)=>`INSERT INTO filmroom_video_assets(owner_id,game_id,r2_key,bytes) VALUES('${owner}','${game}','${key}',${bytes})`;
await test('500 GB reservation allowed at exact boundary',()=>db.exec(asset('games/test/full',500000000000)));
await test('one byte beyond limit denied',()=>fails(asset('games/test/extra',1),/STORAGE_LIMIT_REACHED/));
await test('other account cannot see storage ledger',async()=>assert((await as('authenticated',B,`SELECT * FROM filmroom_video_assets WHERE owner_id='${A}'`)).rows.length===0,'ledger leaked'));
await test('reservation cannot target foreign game',()=>fails(asset('games/test/foreign',10,ids.gb),/INVALID_UPLOAD_GAME/));
await test('cleanup storage stays charged until physically removed',async()=>{await db.exec(`UPDATE filmroom_video_assets SET state='cleanup' WHERE r2_key='games/test/full'`);await fails(asset('games/test/extra',1),/STORAGE_LIMIT_REACHED/)});
await test('released storage becomes available',async()=>{await db.exec(`DELETE FROM filmroom_video_assets WHERE r2_key='games/test/full'`);await db.exec(asset('games/test/new',100))});
await test('old webhook result cannot roll back new subscription state',async()=>{await db.exec(`SELECT filmroom_sync_subscription('${A}','cus_A','sub_A','active',now()+interval '30 days',now()); SELECT filmroom_sync_subscription('${A}','cus_A','sub_old','canceled',now(),now()-interval '1 minute')`);assert((await db.query(`SELECT status FROM filmroom_subscriptions WHERE owner_id='${A}'`)).rows[0].status==='active','old result overwrote new')});
await test('customer mapping cannot update another owner',async()=>{await db.exec(`SELECT filmroom_sync_subscription('${A}','cus_B','sub_bad','canceled',now(),now()+interval '1 hour')`);assert((await db.query(`SELECT status FROM filmroom_subscriptions WHERE owner_id='${A}'`)).rows[0].status==='active','customer mapping bypassed')});
await test('client cannot execute billing reconciliation',()=>denied(`SELECT filmroom_sync_subscription('${A}','cus_A','sub_bad','active',now()+interval '1 year',now()+interval '1 hour')`));

await test('checkout lease rejects simultaneous creation',async()=>{await db.exec(`SELECT filmroom_claim_checkout('${A}','99999999-9999-4999-8999-999999999991')`);await fails(`SELECT filmroom_claim_checkout('${A}','99999999-9999-4999-8999-999999999992')`,/CHECKOUT_BUSY/)});
await test('checkout lease recovery preserves idempotency key',async()=>{const before=(await db.query(`SELECT checkout_key FROM filmroom_subscriptions WHERE owner_id='${A}'`)).rows[0].checkout_key;await db.exec(`UPDATE filmroom_subscriptions SET checkout_locked_until=now()-interval '1 second' WHERE owner_id='${A}';SELECT filmroom_claim_checkout('${A}','99999999-9999-4999-8999-999999999993')`);assert((await db.query(`SELECT checkout_key FROM filmroom_subscriptions WHERE owner_id='${A}'`)).rows[0].checkout_key===before,'retry key changed')});
const sessionId='99999999-9999-4999-8999-999999999994';
await db.exec(`INSERT INTO upload_sessions(id,owner_id,game_id,r2_key,upload_id,expected_size) VALUES('${sessionId}','${A}','${ids.ga}','games/test/new','upload_test',100);UPDATE games SET active_upload_session='${sessionId}' WHERE id='${ids.ga}';`);
await test('attachment rejects actual byte mismatch without partial update',async()=>{await fails(`SELECT filmroom_attach_upload('${A}','${sessionId}',101,'https://test.r2.dev/games/test/new')`,/UPLOAD_SIZE_MISMATCH/);assert((await db.query(`SELECT state FROM filmroom_video_assets WHERE r2_key='games/test/new'`)).rows[0].state==='reserved','partial ledger update')});
await test('attachment cannot use another owner session',()=>fails(`SELECT filmroom_attach_upload('${B}','${sessionId}',100,'https://test.r2.dev/games/test/new')`,/INVALID_UPLOAD_SESSION/));
await test('verified attachment is atomic and replay-safe',async()=>{for(let i=0;i<2;i++)await db.exec(`SELECT filmroom_attach_upload('${A}','${sessionId}',100,'https://test.r2.dev/games/test/new')`);assert((await db.query(`SELECT video_bytes FROM games WHERE id='${ids.ga}'`)).rows[0].video_bytes===100,'bytes missing');assert((await db.query(`SELECT state FROM filmroom_video_assets WHERE r2_key='games/test/new'`)).rows[0].state==='stored','asset not finalized')});
await test('detached object cannot be reattached during cleanup',async()=>{await db.exec(`UPDATE filmroom_video_assets SET state='cleanup' WHERE r2_key='games/test/new'`);await fails(`SELECT filmroom_attach_upload('${A}','${sessionId}',100,'https://test.r2.dev/games/test/new')`,/INVALID_UPLOAD_ASSET/)});

// Parent access uses separate, least-privilege read RPCs; owner policies remain unchanged.
const P='dddddddd-dddd-4ddd-8ddd-dddddddddddd', I='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${P}','parent@example.test',now());
INSERT INTO filmroom_parent_invites(id,owner_id,team_id,email) VALUES('${I}','${A}','${ids.ta}','parent@example.test');
INSERT INTO filmroom_parent_shares(invite_id,game_id,film,stats) VALUES('${I}','${ids.ga}',true,true);`);
async function family(who){return (await as('authenticated',who,'SELECT filmroom_parent_library() AS data')).rows[0].data}
async function access(who,game,kind){return (await as('authenticated',who,`SELECT filmroom_parent_access('${game}','${kind}') AS allowed`)).rows[0].allowed}
await test('parent sees pending invitation but no games before acceptance',async()=>{const d=await family(P);assert(d.invitations.length===1&&d.games.length===0,'pending invitation leaked games');assert(!await access(P,ids.ga,'film'),'pending invitation grants playback')});
await test('wrong email cannot accept invitation',async()=>{let blocked=false;try{await as('authenticated',B,`SELECT filmroom_accept_parent_invite('${I}')`)}catch{blocked=true}assert(blocked,'wrong email accepted');assert((await family(B)).invitations.length===0,'invitation email leaked')});
await test('verified invited account can accept',async()=>{await as('authenticated',P,`SELECT filmroom_accept_parent_invite('${I}')`)});
await test('unverified email cannot accept or discover invites',async()=>{await db.exec(`UPDATE auth.users SET email_confirmed_at=null WHERE id='${P}'`);try{assert((await family(P)).invitations.length===0,'unverified invite visible');let blocked=false;try{await as('authenticated',P,`SELECT filmroom_accept_parent_invite('${I}')`)}catch{blocked=true}assert(blocked,'unverified acceptance')}finally{await db.exec(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${P}'`)}});
await test('expired pending invitation cannot be accepted',async()=>{await db.exec(`UPDATE filmroom_parent_invites SET expires_at=now()-interval '1 second' WHERE id='${I}'`);try{let blocked=false;try{await as('authenticated',P,`SELECT filmroom_accept_parent_invite('${I}')`)}catch{blocked=true}assert(blocked,'expired invite accepted')}finally{await db.exec(`UPDATE filmroom_parent_invites SET expires_at=now()+interval '14 days' WHERE id='${I}'`)}});
await db.exec(`UPDATE filmroom_parent_invites SET accepted_by='${P}',accepted_at=now() WHERE id='${I}'`);
await test('accepted parent receives only explicitly shared game and safe metadata',async()=>{const d=await family(P);assert(d.games.length===1&&d.games[0].id===ids.ga,'incorrect games');assert(!('video_url' in d.games[0])&&!('notes' in d.games[0])&&!('owner_id' in d.games[0]),'private fields leaked');assert(await access(P,ids.ga,'film'),'shared playback denied');assert(!await access(P,ids.gb,'film'),'unshared playback allowed')});
await test('parent cannot directly read private game, clips or roster',async()=>{for(const t of ['games','clips','players','stat_entries'])assert((await as('authenticated',P,`SELECT * FROM ${t}`)).rows.length===0,'private '+t+' exposed')});
await test('parent cannot modify coach game',async()=>{assert((await as('authenticated',P,`UPDATE games SET notes='forged' WHERE id='${ids.ga}' RETURNING id`)).rows.length===0,'parent edit allowed')});
await test('parent cannot forge invitation or sharing via direct tables',async()=>{for(const q of [`INSERT INTO filmroom_parent_invites(owner_id,team_id,email) VALUES('${P}','${ids.ta}','forged@example.test')`,`UPDATE filmroom_parent_shares SET film=true`,`SELECT * FROM filmroom_parent_invites`]){let blocked=false;try{await as('authenticated',P,q)}catch(e){blocked=/permission denied/.test(e.message)}assert(blocked,'direct access allowed')}});
await test('clips share by default, private clips are hidden, and only safe fields are returned',async()=>{
 const read=async()=> (await as('authenticated',P,`SELECT filmroom_parent_clips('${ids.ga}') AS clips`)).rows[0].clips;
 assert((await read()).length===1,'new clip not shared by default');
 await db.exec(`UPDATE clips SET parent_shared=false WHERE id='${ids.ca}'`);
 assert((await read()).length===0,'private clip exposed');
 await db.exec(`UPDATE clips SET parent_shared=true,title='Shared teaching clip',coaching_note='Private coaching notes' WHERE id='${ids.ca}'`);
 const clips=await read();assert(clips.length===1&&clips[0].id===ids.ca,'shared clip missing');
 assert(Object.keys(clips[0]).sort().join(',')==='category,end_time_ms,id,start_time_ms,title','private clip fields exposed');
 let blocked=false;try{await as('authenticated',B,`SELECT filmroom_parent_clips('${ids.ga}')`)}catch{blocked=true}assert(blocked,'uninvited clip access');
 await db.exec(`UPDATE filmroom_parent_shares SET film=false WHERE invite_id='${I}'`);
 blocked=false;try{await read()}catch{blocked=true}assert(blocked,'stats-only parent sees clips');
 await db.exec(`UPDATE filmroom_parent_shares SET film=true WHERE invite_id='${I}'; UPDATE clips SET parent_shared=false WHERE id='${ids.ca}'`);
 assert((await read()).length===0,'unshared clip still visible');
});
await test('parent box score includes zero-stat roster only for shared team',async()=>{
 const d=(await as('authenticated',P,`SELECT filmroom_parent_box_score('${ids.ga}') AS data`)).rows[0].data;
 assert(Array.isArray(d.entries),'missing entries');assert(d.players.some(p=>p.id===ids.pa),'zero-stat player omitted');assert(!d.players.some(p=>p.id===ids.pb),'foreign player leaked');
 assert(Object.keys(d.players[0]).sort().join(',')==='id,name,number','private roster fields leaked');
 await db.exec(`UPDATE filmroom_parent_shares SET stats=false WHERE invite_id='${I}'`);
 let blocked=false;try{await as('authenticated',P,`SELECT filmroom_parent_box_score('${ids.ga}')`)}catch{blocked=true}assert(blocked,'film-only parent got box score');
 await db.exec(`UPDATE filmroom_parent_shares SET stats=true WHERE invite_id='${I}'`);
});
await test('film and stats permissions are independent',async()=>{await db.exec(`UPDATE filmroom_parent_shares SET film=false WHERE invite_id='${I}'`);assert(!await access(P,ids.ga,'film'),'film not disabled');assert(await access(P,ids.ga,'stats'),'stats not retained');await as('authenticated',P,`SELECT filmroom_parent_stats('${ids.ga}')`);await db.exec(`UPDATE filmroom_parent_shares SET film=true,stats=false WHERE invite_id='${I}'`);let blocked=false;try{await as('authenticated',P,`SELECT filmroom_parent_stats('${ids.ga}')`)}catch{blocked=true}assert(blocked,'stats exposed after disable')});
await test('cross-team malformed share fails closed',async()=>{await db.exec(`INSERT INTO filmroom_parent_shares(invite_id,game_id,film) VALUES('${I}','${ids.gb}',true)`);assert(!await access(P,ids.gb,'film'),'foreign game exposed');assert((await family(P)).games.length===1,'foreign game listed')});
await test('changed email loses access',async()=>{await db.exec(`UPDATE auth.users SET email='changed@example.test' WHERE id='${P}'`);try{assert(!await access(P,ids.ga,'film'),'changed identity retained access')}finally{await db.exec(`UPDATE auth.users SET email='parent@example.test' WHERE id='${P}'`)}});
await test('revocation removes discovery, stats and future playback',async()=>{await db.exec(`DELETE FROM filmroom_parent_invites WHERE id='${I}'`);assert((await family(P)).games.length===0,'revoked game listed');assert(!await access(P,ids.ga,'film'),'revoked playback granted');assert((await db.query(`SELECT * FROM filmroom_parent_shares WHERE invite_id='${I}'`)).rows.length===0,'shares not cascaded')});
await test('anonymous cannot invoke family RPC',async()=>{let blocked=false;try{await as('anon','',`SELECT filmroom_parent_library()`)}catch{blocked=true}assert(blocked,'anonymous family access')});


await test('optimized copies are private, claimed once, and detached with the source',async()=>{
 await db.exec('BEGIN');
 try{
  await db.exec(`UPDATE games SET video_url='https://example.test/original.mp4' WHERE id='${ids.ga}';`);
  let q=await db.query(`SELECT * FROM filmroom_claim_playback('${ids.ga}','${A}','https://example.test/original.mp4')`);assert(q.rows.length===1,'first claim failed');
  q=await db.query(`SELECT * FROM filmroom_claim_playback('${ids.ga}','${A}','https://example.test/original.mp4')`);assert(q.rows.length===0,'duplicate claim');
  await db.exec(`UPDATE games SET video_url='https://example.test/replacement.mp4' WHERE id='${ids.ga}';`);
  q=await db.query(`SELECT state FROM filmroom_playback_assets WHERE game_id='${ids.ga}'`);assert(q.rows[0].state==='cleanup','old rendition not detached');
  await db.exec(`UPDATE filmroom_playback_assets SET state='ready' WHERE game_id='${ids.ga}'`);
  q=await db.query(`SELECT state FROM filmroom_playback_assets WHERE game_id='${ids.ga}'`);assert(q.rows[0].state==='cleanup','late encoder revived stale copy');
  await db.exec(`DELETE FROM games WHERE id='${ids.ga}'`);
  q=await db.query(`SELECT state,game_id FROM filmroom_playback_assets WHERE owner_id='${A}'`);assert(q.rows[0].state==='cleanup'&&q.rows[0].game_id===null,'deleted copy lost cleanup ledger');
 }finally{await db.exec('ROLLBACK')}
});
await test('clients cannot forge renditions or claim processing',async()=>{
 for(const sql of [`SELECT * FROM filmroom_playback_assets`,`SELECT * FROM filmroom_claim_playback('${ids.ga}','${A}','forged')`]){
  try{await as('authenticated',A,sql);throw Error('unexpected access')}catch(e){assert(/permission denied/.test(e.message),'client access permitted')}
 }
});
console.log(JSON.stringify({failures}));await db.close();process.exitCode=failures?1:0;
