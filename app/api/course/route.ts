import {env} from 'cloudflare:workers';
import {database} from '@/db';
import {isTeacher} from '@/lib/teacher-auth';

const group='__course_catalog__';
const levels=['기초+초급1','초급2','초급회화','중급1','중급2','중급회화','TOPIK1','TOPIK2 3·4급','TOPIK2 5·6급'];
const sameOrigin=(req:Request)=>!req.headers.get('origin')||req.headers.get('origin')===new URL(req.url).origin;
const media=()=> (env as unknown as {MEDIA:R2Bucket}).MEDIA;
type Video={id:string;title:string;level:string;videoUrl:string;duration:number};

export async function GET(){
  try{
    const r=await database().prepare("SELECT payload FROM records WHERE session=? AND kind='courseVideo' ORDER BY updated_at ASC").bind(group).all<{payload:string}>();
    return Response.json({videos:r.results.map(x=>JSON.parse(x.payload))},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'UNAVAILABLE'},{status:503});}
}

export async function POST(req:Request){
  if(!sameOrigin(req))return Response.json({error:'ORIGIN'},{status:403});
  try{
    if(!await isTeacher(req))return Response.json({error:'TEACHER_REQUIRED'},{status:403});
    const raw=await req.text();
    if(raw.length>4096)return Response.json({error:'INVALID'},{status:400});
    const b=JSON.parse(raw),internal=typeof b.videoUrl==='string'&&b.videoUrl.startsWith('/api/media?id=media%2F');
    if(typeof b.title!=='string'||!b.title.trim()||b.title.length>120||!levels.includes(b.level)||!internal||!Number.isInteger(b.duration)||b.duration<10||b.duration>14400)return Response.json({error:'INVALID'},{status:400});
    const item:Video={id:crypto.randomUUID(),title:b.title.trim(),level:b.level,videoUrl:b.videoUrl,duration:b.duration};
    await database().prepare("INSERT INTO records(session,id,kind,payload,updated_at) VALUES (?,?,'courseVideo',?,?)").bind(group,item.id,JSON.stringify(item),new Date().toISOString()).run();
    return Response.json({video:item});
  }catch{return Response.json({error:'INVALID'},{status:400});}
}

export async function DELETE(req:Request){
  if(!sameOrigin(req))return Response.json({error:'ORIGIN'},{status:403});
  try{
    if(!await isTeacher(req))return Response.json({error:'TEACHER_REQUIRED'},{status:403});
    const {id}=await req.json() as {id?:string};
    if(!id||!/^[a-f0-9-]{36}$/i.test(id))return Response.json({error:'INVALID'},{status:400});
    const row=await database().prepare("SELECT payload FROM records WHERE session=? AND id=? AND kind='courseVideo'").bind(group,id).first<{payload:string}>();
    if(!row)return Response.json({error:'NOT_FOUND'},{status:404});
    const video=JSON.parse(row.payload) as Video;
    await database().batch([
      database().prepare('DELETE FROM records WHERE session=? AND id=?').bind(group,id),
      database().prepare('DELETE FROM records WHERE session=?').bind('__lesson__:'+id),
    ]);
    const key=new URL(video.videoUrl,'https://local').searchParams.get('id');
    if(key&&/^media\/[a-f0-9-]{36}\.[a-z0-9]{1,6}$/i.test(key))await media().delete(key).catch(()=>{});
    return Response.json({deleted:true});
  }catch{return Response.json({error:'DELETE_FAILED'},{status:500});}
}
