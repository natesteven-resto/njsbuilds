export const FILMROOM_PLAN = {name:'Film Room Coach', monthlyCents:2500, currency:'usd', maxGames:50, maxStorageBytes:500_000_000_000} as const
export function subscriptionAllowsUploads(status:string|null, endsAt:string|null, now=Date.now()) {
 return status==='active' && !!endsAt && Date.parse(endsAt)>now
}
export function validUploadBytes(value:unknown):value is number {
 return typeof value==='number' && Number.isSafeInteger(value) && value>0 && value<=FILMROOM_PLAN.maxStorageBytes
}

export const FILMROOM_PART_BYTES=100*1024*1024
export function uploadPartBytes(total:number,part:number):number|null {
 if(!validUploadBytes(total)||!Number.isSafeInteger(part)||part<1||part>Math.ceil(total/FILMROOM_PART_BYTES))return null
 return Math.min(FILMROOM_PART_BYTES,total-(part-1)*FILMROOM_PART_BYTES)
}
