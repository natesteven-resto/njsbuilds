import {S3Client, CompleteMultipartUploadCommand, HeadObjectCommand, type CompleteMultipartUploadCommandInput} from '@aws-sdk/client-s3'
/** Recover a lost completion response only when R2 confirms the object exists. */
export async function completeUpload(client:S3Client,input:CompleteMultipartUploadCommandInput) {
 try {await client.send(new CompleteMultipartUploadCommand(input))}
 catch(error) {
  if((error as {name?:string}).name!=='NoSuchUpload')throw error
  // R2 removes the multipart session after completion. A retry may therefore
  // report NoSuchUpload even though the completed object is safely stored.
  // The caller still verifies actual size and ownership before attachment.
  try {await client.send(new HeadObjectCommand({Bucket:input.Bucket,Key:input.Key}))}
  catch {throw error}
 }
}
