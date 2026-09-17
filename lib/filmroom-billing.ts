import Stripe from 'stripe'
import {NextRequest,NextResponse} from 'next/server'
import {createServiceClient} from './filmroom-supabase-server'
import {selectFilmRoomSubscription} from './filmroom-subscription-selection'
import {FILMROOM_PLAN,subscriptionAllowsUploads} from './filmroom-plan'
export function billingEnabled(){return process.env.FILMROOM_BILLING_ENABLED==='true'}
export function filmStripe(){const key=process.env.FILMROOM_STRIPE_SECRET_KEY;if(!key)throw Error('Film Room billing is not configured');return new Stripe(key)}
export function billingOrigin(){const url=process.env.FILMROOM_SITE_URL;if(!url)throw Error('Film Room site URL is not configured');const u=new URL(url);if(u.protocol!=='https:'&&u.hostname!=='localhost')throw Error('Invalid site URL');return u.origin}
export function verifyBillingOrigin(request:NextRequest){if(request.headers.get('origin')!==billingOrigin())throw NextResponse.json({error:'Invalid request origin'},{status:403})}
export async function accountBilling(owner:string){
 const db=createServiceClient();const [sub,assets,games]=await Promise.all([db.from('filmroom_subscriptions').select('*').eq('owner_id',owner).maybeSingle(),db.from('filmroom_video_assets').select('bytes,state').eq('owner_id',owner),db.from('games').select('id',{count:'exact',head:true}).eq('owner_id',owner).eq('is_demo',false)]);
 if(sub.error||assets.error||games.error)throw Error('Could not load billing');
 return {subscription:sub.data,canUpload:!!sub.data?.complimentary||subscriptionAllowsUploads(sub.data?.status,sub.data?.paid_until),usedBytes:(assets.data||[]).reduce((n,a)=>n+Number(a.bytes),0),gameCount:games.count||0,plan:FILMROOM_PLAN}
}
export async function requirePaid(owner:string){if(!billingEnabled())return;const {canUpload}=await accountBilling(owner);if(!canUpload)throw NextResponse.json({error:'Subscribe to add games and upload film.',code:'SUBSCRIPTION_REQUIRED'},{status:402})}
export async function reconcileCustomer(customer:string){
 const db=createServiceClient();const observed=new Date().toISOString();const {data:row,error}=await db.from('filmroom_subscriptions').select('owner_id').eq('customer_id',customer).maybeSingle();if(error)throw error;if(!row)return;
 const price=process.env.FILMROOM_STRIPE_PRICE_ID;if(!price)throw Error('Missing Film Room price');
 const list=await filmStripe().subscriptions.list({customer,status:'all',limit:100});if(list.has_more)throw Error('Too many subscriptions to reconcile safely');
 const {current,until}=selectFilmRoomSubscription(list.data,price,row.owner_id);
 const result=await db.rpc('filmroom_sync_subscription',{p_owner:row.owner_id,p_customer:customer,p_subscription:current?.id||null,p_status:current?.status||'none',p_until:until?new Date(until*1000).toISOString():null,p_observed:observed});if(result.error)throw result.error;
}
export function billingFailure(e:unknown){if(e instanceof NextResponse)return e;return NextResponse.json({error:'Billing is temporarily unavailable. Please try again.'},{status:503})}
