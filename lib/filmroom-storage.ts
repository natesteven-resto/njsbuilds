import {S3Client,AbortMultipartUploadCommand,DeleteObjectCommand} from '@aws-sdk/client-s3'
import {createServiceClient} from './filmroom-supabase-server'
/** Only assets already detached by a database transaction may be removed. */
export async function cleanDetachedVideos(owner:string){
 const db=createServiceClient();const {data,error}=await db.from('filmroom_video_assets').select('id,r2_key,upload_id').eq('owner_id',owner).eq('state','cleanup').limit(10);
 if(error)throw error;if(!data?.length)return;
 const client=new S3Client({region:'auto',endpoint:process.env.CLOUDFLARE_R2_ENDPOINT,credentials:{accessKeyId:process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,secretAccessKey:process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
 for(const asset of data){
  // This ledger never contains the shared demo object or another service's files.
  if(!/^games\/[0-9a-f-]{36}\//i.test(asset.r2_key))continue;
  try{
   if(asset.upload_id){try{await client.send(new AbortMultipartUploadCommand({Bucket:process.env.CLOUDFLARE_R2_BUCKET,Key:asset.r2_key,UploadId:asset.upload_id}))}catch(e){if((e as {name?:string}).name!=='NoSuchUpload')throw e}}
   await client.send(new DeleteObjectCommand({Bucket:process.env.CLOUDFLARE_R2_BUCKET,Key:asset.r2_key}));
   await db.from('filmroom_video_assets').delete().eq('id',asset.id).eq('owner_id',owner).eq('state','cleanup');
  }catch{ /* Retain the ledger charge and retry on the next account visit. */ }
 }
}
