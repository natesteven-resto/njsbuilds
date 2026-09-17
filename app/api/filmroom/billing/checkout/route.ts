import {randomUUID} from 'crypto'
import {NextRequest,NextResponse} from 'next/server'
import {getVerifiedUser,createServiceClient} from '@/lib/filmroom-supabase-server'
import {billingEnabled,filmStripe,billingOrigin,verifyBillingOrigin,accountBilling,reconcileCustomer,billingFailure} from '@/lib/filmroom-billing'
export async function POST(r:NextRequest){
 let release:(()=>Promise<void>)|undefined
 try{
  const {user}=await getVerifiedUser(r)
  if(!billingEnabled())return NextResponse.json({error:'Subscriptions are not open yet.'},{status:503})
  verifyBillingOrigin(r)
  const db=createServiceClient(),stripe=filmStripe(),priceId=process.env.FILMROOM_STRIPE_PRICE_ID
  if(!priceId)throw Error('Missing price')
  const price=await stripe.prices.retrieve(priceId)
  if(!price.active||price.unit_amount!==2500||price.currency!=='usd'||price.recurring?.interval!=='month'||price.recurring.interval_count!==1||price.type!=='recurring')throw Error('Invalid Film Room price')
  let account=await accountBilling(user.id)
  if(account.canUpload)return NextResponse.json({error:'Your account already has access.'},{status:409})
  let customer=account.subscription?.customer_id
  if(!customer){
   const c=await stripe.customers.create({email:user.email,metadata:{app:'filmroom',owner_id:user.id}},{idempotencyKey:`filmroom-customer-${user.id}`})
   // Ignore a concurrent insert; update only a still-empty mapping and preserve owner access.
   const inserted=await db.from('filmroom_subscriptions').upsert({owner_id:user.id},{onConflict:'owner_id',ignoreDuplicates:true});if(inserted.error)throw inserted.error
   const mapped=await db.from('filmroom_subscriptions').update({customer_id:c.id}).eq('owner_id',user.id).is('customer_id',null);if(mapped.error)throw mapped.error
   account=await accountBilling(user.id);customer=account.subscription?.customer_id
   if(!customer)throw Error('Customer mapping failed')
  }
  const lease=randomUUID()
  const claimed=await db.rpc('filmroom_claim_checkout',{p_owner:user.id,p_lease:lease})
  if(claimed.error)return NextResponse.json({error:'Checkout is already opening. Please wait a moment and try again.'},{status:409})
  release=async()=>{await db.from('filmroom_subscriptions').update({checkout_locked_until:null,checkout_lease:null}).eq('owner_id',user.id).eq('checkout_lease',lease)}
  await reconcileCustomer(customer);account=await accountBilling(user.id)
  if(account.subscription?.subscription_id&&!['canceled','incomplete_expired','none'].includes(account.subscription.status))return NextResponse.json({error:'You already have a subscription. Use Manage subscription to update payment or change it.',code:'MANAGE_SUBSCRIPTION'},{status:409})
  if(account.canUpload)return NextResponse.json({error:'Your account already has access.'},{status:409})
  let key=claimed.data.checkout_key as string
  if(claimed.data.checkout_session_id){
   const existing=await stripe.checkout.sessions.retrieve(claimed.data.checkout_session_id)
   if(existing.status==='open'&&existing.url)return NextResponse.json({url:existing.url})
   if(existing.status==='complete'&&!(['canceled','incomplete_expired'].includes(account.subscription?.status)&&existing.subscription===account.subscription.subscription_id))return NextResponse.json({error:'Your payment is being confirmed. Refresh your subscription status shortly.'},{status:409})
   key=randomUUID()
   const rotated=await db.from('filmroom_subscriptions').update({checkout_key:key,checkout_session_id:null}).eq('owner_id',user.id).eq('checkout_lease',lease);if(rotated.error)throw rotated.error
  }
  const session=await stripe.checkout.sessions.create({mode:'subscription',customer,line_items:[{price:priceId,quantity:1}],client_reference_id:user.id,metadata:{app:'filmroom',owner_id:user.id,price_id:priceId},subscription_data:{metadata:{app:'filmroom',owner_id:user.id}},success_url:`${billingOrigin()}/filmroom/billing?checkout=complete`,cancel_url:`${billingOrigin()}/filmroom/billing`},{idempotencyKey:`filmroom-checkout-${key}`})
  const saved=await db.from('filmroom_subscriptions').update({checkout_session_id:session.id}).eq('owner_id',user.id).eq('checkout_lease',lease);if(saved.error)throw saved.error
  if(session.status!=='open'||!session.url)return NextResponse.json({error:'Checkout has finished. Refresh your subscription status.'},{status:409})
  return NextResponse.json({url:session.url})
 }catch(e){return billingFailure(e)}finally{if(release)await release().catch(()=>{})}
}
