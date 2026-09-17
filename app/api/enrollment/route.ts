import {database} from '@/db';
import {digest,isTeacher} from '@/lib/teacher-auth';
import {adminRest,sha256,supabaseReady} from '@/lib/supabase-rest';
const group='__enrollment__';
const levels=['기초+초급1','초급2','초급회화','중급1','중급2','중급회화','TOPIK1','TOPIK2 3·4급','TOPIK2 5·6급'];
const clean=(s:unknown,n:number)=>typeof s==='string'?s.trim().slice(0,n):'';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function member(req:Request){return {id:req.headers.get('oai-authenticated-user-id')||'',email:(req.headers.get('oai-authenticated-user-email')||'').toLowerCase()};}
export async function GET(req:Request){try{const teacher=await isTeacher(req);const u=member(req);const row=u.id?await database().prepare('SELECT payload FROM records WHERE session=? AND id=?').bind(group,'student:'+await digest(u.id)).first<{payload:string}>():null;return reply({teacher,profile:row?JSON.parse(row.payload):null,email:u.email});}catch{return reply({error:'UNAVAILABLE'},503);}}
export async function POST(req:Request){if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'ORIGIN'},403);try{const raw=await req.text();if(raw.length>1024)return reply({error:'INVALID'},400);const b=JSON.parse(raw);if(b.action==='create'){
  if(!await isTeacher(req))return reply({error:'TEACHER_REQUIRED'},403);
  const email=clean(b.email,254).toLowerCase(),level=clean(b.level,12);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!levels.includes(level))return reply({error:'INVALID'},400);
  const bytes=crypto.getRandomValues(new Uint8Array(9));const code=Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
  if(supabaseReady()){
    const courseRes=await adminRest(`/rest/v1/courses?level=eq.${encodeURIComponent(level)}&select=id`);
    const courses=courseRes.ok?await courseRes.json() as Array<{id:string}>:[];
    if(!courses[0])return reply({error:'COURSE_NOT_FOUND'},400);
    const expiresAt=new Date(Date.now()+7*86400000).toISOString();
    const inviteRes=await adminRest('/rest/v1/invitations',{method:'POST',body:JSON.stringify({email,course_id:courses[0].id,code_hash:await sha256(code),expires_at:expiresAt,created_by:null})});
    if(!inviteRes.ok)return reply({error:'UNAVAILABLE'},503);
    return reply({code,email,level,expires:Date.parse(expiresAt)});
  }
  const id='invite:'+await digest(code);const expires=Date.now()+7*86400000;
  await database().prepare("INSERT INTO records(session,id,kind,payload,updated_at) VALUES (?,?,'invite',?,?)").bind(group,id,JSON.stringify({email,level,expires,used:false}),new Date().toISOString()).run();
  return reply({code,email,level,expires});
}
if(b.action==='join'){
  const u=member(req),code=clean(b.code,32).toUpperCase(),name=clean(b.name,80);
  if(!u.id||!u.email)return reply({error:'SIGN_IN_REQUIRED'},401);
  if(!/^[A-F0-9]{18}$/.test(code)||name.length<2)return reply({error:'INVALID'},400);
  const studentId='student:'+await digest(u.id);
  const prior=await database().prepare('SELECT payload FROM records WHERE session=? AND id=?').bind(group,studentId).first();if(prior)return reply({error:'ALREADY_ENROLLED'},409);
  const inviteId='invite:'+await digest(code);
  const row=await database().prepare('SELECT payload FROM records WHERE session=? AND id=?').bind(group,inviteId).first<{payload:string}>();
  const invite=row?JSON.parse(row.payload):null;
  if(!invite||invite.used||invite.expires<Date.now()||invite.email!==u.email)return reply({error:'INVITE_INVALID'},400);
  const used=await database().prepare("UPDATE records SET payload=?,updated_at=? WHERE session=? AND id=? AND json_extract(payload,'$.used')=0").bind(JSON.stringify({...invite,used:true}),new Date().toISOString(),group,inviteId).run();
  if(!used.meta.changes)return reply({error:'INVITE_INVALID'},400);
  const profile={name,email:u.email,level:invite.level,joinedAt:new Date().toISOString()};
  await database().prepare("INSERT INTO records(session,id,kind,payload,updated_at) VALUES (?,?,'student',?,?)").bind(group,studentId,JSON.stringify(profile),profile.joinedAt).run();
  return reply({profile});
}
return reply({error:'INVALID'},400);
}catch{return reply({error:'UNAVAILABLE'},503);}}
