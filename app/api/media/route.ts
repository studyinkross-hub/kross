import {env} from 'cloudflare:workers';
import {isTeacher} from '@/lib/teacher-auth';

const allowed=new Set(['audio/mpeg','audio/mp4','audio/wav','audio/webm','video/mp4','video/webm']);
const media=()=> (env as unknown as {MEDIA:R2Bucket}).MEDIA;
const keyPattern=/^media\/[a-f0-9-]{36}\.[a-z0-9]{1,6}$/i;
const sameOrigin=(req:Request)=>!req.headers.get('origin')||req.headers.get('origin')===new URL(req.url).origin;

function cleanFile(input:unknown){
  if(!input||typeof input!=='object')return null;
  const value=input as {name?:unknown;type?:unknown;size?:unknown};
  const name=typeof value.name==='string'?value.name.slice(0,180):'';
  const type=typeof value.type==='string'?value.type:'';
  const size=Number(value.size);
  if(!name||!allowed.has(type)||!Number.isFinite(size)||size<1||size>8*1024*1024*1024)return null;
  const ext=name.split('.').pop()?.replace(/[^a-z0-9]/gi,'').slice(0,6)||'bin';
  return {name,type,size,key:`media/${crypto.randomUUID()}.${ext}`};
}

export async function POST(req:Request){
  if(!sameOrigin(req))return Response.json({error:'ORIGIN'},{status:403});
  if(!await isTeacher(req))return Response.json({error:'TEACHER_REQUIRED'},{status:403});
  const action=new URL(req.url).searchParams.get('action')||'single';
  try{
    if(action==='init'){
      const file=cleanFile(await req.json());
      if(!file)return Response.json({error:'INVALID_FILE'},{status:400});
      const upload=await media().createMultipartUpload(file.key,{httpMetadata:{contentType:file.type},customMetadata:{name:file.name}});
      return Response.json({key:file.key,uploadId:upload.uploadId,url:'/api/media?id='+encodeURIComponent(file.key)});
    }
    if(action==='part'){
      const url=new URL(req.url),key=url.searchParams.get('key')||'',uploadId=url.searchParams.get('uploadId')||'',partNumber=Number(url.searchParams.get('partNumber'));
      if(!keyPattern.test(key)||!uploadId||!Number.isInteger(partNumber)||partNumber<1||partNumber>10000||!req.body)return Response.json({error:'INVALID_PART'},{status:400});
      const part=await media().resumeMultipartUpload(key,uploadId).uploadPart(partNumber,req.body);
      return Response.json({partNumber:part.partNumber,etag:part.etag});
    }
    if(action==='complete'){
      const body=await req.json() as {key?:string;uploadId?:string;parts?:R2UploadedPart[]};
      if(!body.key||!keyPattern.test(body.key)||!body.uploadId||!Array.isArray(body.parts)||!body.parts.length)return Response.json({error:'INVALID_COMPLETE'},{status:400});
      await media().resumeMultipartUpload(body.key,body.uploadId).complete(body.parts);
      return Response.json({url:'/api/media?id='+encodeURIComponent(body.key)});
    }
    const form=await req.formData(),raw=form.get('file');
    if(!(raw instanceof File)||raw.size>90*1024*1024)return Response.json({error:'USE_MULTIPART'},{status:400});
    const file=cleanFile(raw);
    if(!file)return Response.json({error:'INVALID_FILE'},{status:400});
    await media().put(file.key,raw.stream(),{httpMetadata:{contentType:file.type},customMetadata:{name:file.name}});
    return Response.json({url:'/api/media?id='+encodeURIComponent(file.key),name:file.name,type:file.type,size:file.size});
  }catch{return Response.json({error:'UPLOAD_FAILED'},{status:500});}
}

export async function DELETE(req:Request){
  if(!sameOrigin(req))return Response.json({error:'ORIGIN'},{status:403});
  if(!await isTeacher(req))return Response.json({error:'TEACHER_REQUIRED'},{status:403});
  try{
    const body=await req.json() as {key?:string;uploadId?:string};
    if(!body.key||!keyPattern.test(body.key))return Response.json({error:'INVALID'},{status:400});
    if(body.uploadId)await media().resumeMultipartUpload(body.key,body.uploadId).abort();
    else await media().delete(body.key);
    return Response.json({deleted:true});
  }catch{return Response.json({error:'DELETE_FAILED'},{status:500});}
}

export async function GET(req:Request){
  try{
    const key=new URL(req.url).searchParams.get('id')||'';
    if(!keyPattern.test(key))return new Response('Not found',{status:404});
    const object=await media().get(key);
    if(!object)return new Response('Not found',{status:404});
    return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, max-age=3600','Accept-Ranges':'bytes'}});
  }catch{return new Response('Unavailable',{status:503});}
}
