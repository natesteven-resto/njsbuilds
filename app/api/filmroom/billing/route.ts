import {NextRequest, NextResponse} from 'next/server'
import {getVerifiedUser} from '@/lib/filmroom-supabase-server'
import {accountBilling, billingEnabled, billingFailure, verifyBillingOrigin, reconcileCustomer} from '@/lib/filmroom-billing'
import {cleanDetachedVideos} from '@/lib/filmroom-storage'
import {FILMROOM_PLAN} from '@/lib/filmroom-plan'

function summary(a:Awaited<ReturnType<typeof accountBilling>>) {
 return {enabled:true,plan:a.plan,canUpload:a.canUpload,usedBytes:a.usedBytes,gameCount:a.gameCount,
  status:a.subscription?.status||'none',paidUntil:a.subscription?.paid_until||null,
  complimentary:!!a.subscription?.complimentary,hasCustomer:!!a.subscription?.customer_id}
}
export async function GET(r:NextRequest) {
 try {
  const {user}=await getVerifiedUser(r)
  if(!billingEnabled())return NextResponse.json({enabled:false,plan:FILMROOM_PLAN})
  return NextResponse.json(summary(await accountBilling(user.id)))
 } catch(e) {return billingFailure(e)}
}
/** Explicit refresh reconciles only the verified user's stored customer mapping. */
export async function POST(r:NextRequest) {
 try {
  const {user}=await getVerifiedUser(r)
  if(!billingEnabled())return NextResponse.json({enabled:false,plan:FILMROOM_PLAN})
  verifyBillingOrigin(r)
  await cleanDetachedVideos(user.id)
  const account=await accountBilling(user.id)
  if(account.subscription?.customer_id)await reconcileCustomer(account.subscription.customer_id)
  return NextResponse.json(summary(await accountBilling(user.id)))
 } catch(e) {return billingFailure(e)}
}
