import {NextRequest,NextResponse} from 'next/server'
import {getVerifiedUser} from '@/lib/filmroom-supabase-server'
import {accountBilling,billingEnabled,billingFailure} from '@/lib/filmroom-billing'
import {cleanDetachedVideos} from '@/lib/filmroom-storage'
import {FILMROOM_PLAN} from '@/lib/filmroom-plan'
export async function GET(r:NextRequest){try{const {user}=await getVerifiedUser(r);if(!billingEnabled())return NextResponse.json({enabled:false,plan:FILMROOM_PLAN});await cleanDetachedVideos(user.id);const a=await accountBilling(user.id);return NextResponse.json({enabled:true,plan:a.plan,canUpload:a.canUpload,usedBytes:a.usedBytes,gameCount:a.gameCount,status:a.subscription?.status||'none',paidUntil:a.subscription?.paid_until||null,complimentary:!!a.subscription?.complimentary,hasCustomer:!!a.subscription?.customer_id})}catch(e){return billingFailure(e)}}
