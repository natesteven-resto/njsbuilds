import type Stripe from 'stripe'
/** Never import another app's subscriptions from the shared Stripe account. */
export function selectFilmRoomSubscription(subscriptions:Stripe.Subscription[],price:string,owner:string,now=Date.now()) {
 const relevant=subscriptions.filter(s=>s.metadata.app==='filmroom'&&s.metadata.owner_id===owner&&s.items.data.some(i=>i.price.id===price))
 const paidUntil=(s:Stripe.Subscription)=>Math.max(0,...s.items.data.filter(i=>i.price.id===price).map(i=>i.current_period_end))
 const rank=(s:Stripe.Subscription)=>s.status==='active'&&paidUntil(s)*1000>now?2:!['canceled','incomplete_expired'].includes(s.status)?1:0
 relevant.sort((a,b)=>rank(b)-rank(a)||b.created-a.created)
 const current=relevant[0]
 return {current,until:current?paidUntil(current):0}
}
