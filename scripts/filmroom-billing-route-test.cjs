const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const req=createRequire(require('node:path').resolve(__dirname,'../package.json')),ts=req('typescript'),{NextRequest,NextResponse}=req('next/server'),Stripe=req('stripe');
const root=require('node:path').resolve(__dirname,'..')+'/';
function load(file,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require:name=>mocks[name]||req(name),process,console,Date,URL,Set});return exports}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
(async()=>{
const plan=load('lib/filmroom-plan.ts');
await test('active entitlement ends at paid period boundary',()=>{assert(plan.subscriptionAllowsUploads('active','2026-09-17',Date.parse('2026-09-16')));assert(!plan.subscriptionAllowsUploads('active','2026-09-16',Date.parse('2026-09-16')));for(const s of ['trialing','past_due','unpaid','canceled','none'])assert(!plan.subscriptionAllowsUploads(s,'2099-01-01'))});
await test('upload size validation rejects invalid and oversized inputs',()=>{for(const v of [-1,0,1.5,NaN,Infinity,'100',500000000001])assert(!plan.validUploadBytes(v));assert(plan.validUploadBytes(500000000000))});
await test('part sizing cannot exceed the declared reservation',()=>{assert.equal(plan.uploadPartBytes(105000000,1),104857600);assert.equal(plan.uploadPartBytes(105000000,2),142400);assert.equal(plan.uploadPartBytes(105000000,3),null);assert.equal(plan.uploadPartBytes(1,1),1);assert.equal(plan.uploadPartBytes(1,0),null)});
let enabled=true,authorized=true,account={canUpload:false,subscription:{customer_id:'cus_A',status:'none'}},created=0,portalCustomer=null,reconciled=[];
let price={active:true,unit_amount:2500,currency:'usd',recurring:{interval:'month',interval_count:1},type:'recurring'};
const stripe={prices:{retrieve:async()=>price},checkout:{sessions:{list:async()=>({data:[]}),create:async body=>{created++;assert.equal(body.customer,'cus_A');assert.equal(body.line_items[0].price,'price_film');assert.equal(body.line_items[0].quantity,1);return {id:'cs_test',status:'open',url:'https://checkout.stripe.com/test'}}}},billingPortal:{sessions:{create:async body=>{portalCustomer=body.customer;assert.equal(body.configuration,'bpc_film');return {url:'https://billing.stripe.com/test'}}}}};
const billing={billingEnabled:()=>enabled,filmStripe:()=>stripe,billingOrigin:()=> 'https://www.njsbuilds.com',verifyBillingOrigin:r=>{if(r.headers.get('origin')!=='https://www.njsbuilds.com')throw NextResponse.json({error:'origin'},{status:403})},accountBilling:async()=>account,reconcileCustomer:async c=>reconciled.push(c),billingFailure:e=>e instanceof NextResponse?e:NextResponse.json({error:'unavailable'},{status:503})};
const auth={getVerifiedUser:async()=>{if(!authorized)throw NextResponse.json({error:'auth'},{status:401});return {user:{id:'owner_A',email:'a@example.test'}}},createServiceClient:()=>({rpc:async()=>({data:{checkout_key:'key_A',checkout_session_id:null}}),from:()=>({update:()=>({eq:()=>({eq:async()=>({error:null})})})})})};
process.env.FILMROOM_STRIPE_PRICE_ID='price_film';process.env.FILMROOM_STRIPE_PORTAL_CONFIG_ID='bpc_film';
const mocks={'@/lib/filmroom-billing':billing,'@/lib/filmroom-supabase-server':auth};
const checkout=load('app/api/filmroom/billing/checkout/route.ts',mocks),portal=load('app/api/filmroom/billing/portal/route.ts',mocks);
const request=(origin='https://www.njsbuilds.com')=>new NextRequest('https://www.njsbuilds.com/api/filmroom/billing/checkout',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({price:'attacker_price',customer:'cus_other',owner_id:'other'})});
await test('checkout rejects unauthenticated request',async()=>{authorized=false;assert.equal((await checkout.POST(request())).status,401);authorized=true});
await test('checkout closed until explicitly enabled',async()=>{enabled=false;assert.equal((await checkout.POST(request())).status,503);enabled=true});
await test('checkout rejects cross-origin request',async()=>assert.equal((await checkout.POST(request('https://evil.test'))).status,403));
await test('checkout rejects wrong configured price',async()=>{price.unit_amount=5000;assert.equal((await checkout.POST(request())).status,503);price.unit_amount=2500});
await test('checkout ignores client-supplied price and customer',async()=>{assert.equal((await checkout.POST(request())).status,200);assert.equal(created,1);assert.equal(reconciled[0],'cus_A')});
await test('existing unpaid subscription cannot create duplicate',async()=>{account.subscription.status='past_due';account.subscription.subscription_id='sub_A';assert.equal((await checkout.POST(request())).status,409);assert.equal(created,1)});
await test('portal binds to authenticated customer and dedicated configuration',async()=>{assert.equal((await portal.POST(request())).status,200);assert.equal(portalCustomer,'cus_A')});
const realStripe=new Stripe('sk_test_placeholder_for_signature_test');const secret='whsec_local_disposable_test';process.env.FILMROOM_STRIPE_WEBHOOK_SECRET=secret;
const webhook=load('app/api/filmroom/billing/webhook/route.ts',{'@/lib/filmroom-billing':{...billing,filmStripe:()=>realStripe}});
const payload=JSON.stringify({id:'evt_local',object:'event',type:'invoice.paid',data:{object:{customer:'cus_A'}}});
const signed=()=>new NextRequest('https://www.njsbuilds.com/api/filmroom/billing/webhook',{method:'POST',headers:{'stripe-signature':realStripe.webhooks.generateTestHeaderString({payload,secret})},body:payload});
await test('webhook rejects forged signature',async()=>assert.equal((await webhook.POST(new NextRequest('https://www.njsbuilds.com/api/filmroom/billing/webhook',{method:'POST',headers:{'stripe-signature':'invalid'},body:payload}))).status,400));
await test('valid webhook and replay reconcile owned customer',async()=>{reconciled=[];assert.equal((await webhook.POST(signed())).status,200);assert.equal((await webhook.POST(signed())).status,200);assert.deepEqual(reconciled,['cus_A','cus_A'])});
console.log(`${passed} billing unit/route tests passed; no network or customer data used.`);
})().catch(e=>{console.error(e);process.exitCode=1});
