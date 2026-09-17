import {authorizeCrm,crmStudent,crmRead,crmOrigin,uuid,mappedLevel} from '@/lib/crm-bridge';
import {adminRest,sha256} from '@/lib/supabase-rest';
const headers={'Access-Control-Allow-Origin':crmOrigin,'Vary':'Origin','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
export function OPTIONS(req:Request){return new Response(null,{status:req.headers.get('origin')===crmOrigin?204:403,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}});}
async function rows(path:string){const r=await adminRest(path);if(!r.ok)throw Error('STORAGE_UNAVAILABLE');return r.json() as Promise<any[]>;}
export async function GET(req:Request){return handle(req);}
export async function POST(req:Request){return handle(req);}
async function handle(req:Request){
 if(req.headers.get('origin')!==crmOrigin)return reply({error:'ORIGIN'},403);
 try{
  const staff=await authorizeCrm(req);
  const raw=req.method==='POST'?await req.text():'';
  if(raw.length>2048)return reply({error:'INVALID'},400);
  const body=raw?JSON.parse(raw):{};
  const id=req.method==='GET'?new URL(req.url).searchParams.get('student_id'):body.student_id;
  if(typeof id!=='string'||!uuid.test(id))return reply({error:'INVALID_STUDENT'},400);
  const student=await crmStudent(id,staff.token);
  const enrollments=await crmRead('/rest/v1/enrollments?student_id=eq.'+id+'&status=eq.active&select=course_id,courses(id,code,name_ko)',staff.token);
  const eligible=enrollments.filter((x:any)=>x.courses&&mappedLevel(x.courses)).map((x:any)=>({crm_course_id:x.course_id,title:x.courses.name_ko,level:mappedLevel(x.courses)}));
  const links=await rows('/rest/v1/crm_student_links?crm_student_id=eq.'+id+'&select=student_id,email');
  const link=links[0];
  if(req.method==='GET'){
   const record=link?.student_id?await rows('/rest/v1/learning_records?student_id=eq.'+link.student_id+'&select=kind,payload,updated_at&order=updated_at.desc&limit=1000'):[];
   const invites=await rows('/rest/v1/invitations?crm_student_id=eq.'+id+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=expires_at&order=created_at.desc&limit=1');
   return reply({student:{id:student.id,name:student.full_name,status:student.status},courses:eligible,account:link?.student_id?'linked':invites[0]?'invited':'not_linked',email:link?.email||'',expires_at:invites[0]?.expires_at||null,summary:{last_activity:record[0]?.updated_at||null,lessons_started:record.filter((x:any)=>x.kind==='progress').length,submitted:record.filter((x:any)=>['assignment','activityResponse'].includes(x.kind)).length,word_reviews:record.filter((x:any)=>x.kind==='vocab').reduce((s:number,x:any)=>s+(Number(x.payload.reviews)||0),0),record_count:record.length,limited:record.length===1000}});
  }
  if(body.action!=='invite')return reply({error:'INVALID'},400);
  if(student.status!=='active')return reply({error:'STUDENT_INACTIVE'},409);
  if(link?.student_id)return reply({error:'ALREADY_LINKED'},409);
  const chosen=eligible.find((x:any)=>x.crm_course_id===body.course_id);
  if(!chosen)return reply({error:'ACTIVE_COURSE_REQUIRED'},409);
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'INVALID_EMAIL'},400);
  if(link&&link.email!==email)return reply({error:'EMAIL_CHANGE_REQUIRES_REVIEW'},409);
  const course=(await rows('/rest/v1/courses?level=eq.'+encodeURIComponent(chosen.level)+'&active=eq.true&select=id'))[0];
  if(!course)return reply({error:'COURSE_NOT_FOUND'},409);
  if(!link){const created=await adminRest('/rest/v1/crm_student_links',{method:'POST',body:JSON.stringify({crm_student_id:id,email,created_by:staff.id})});if(!created.ok)return reply({error:'EMAIL_OR_STUDENT_ALREADY_LINKED'},409);}
  // Expire prior invitations before issuing another; no invitation is emailed automatically.
  const expired=await adminRest('/rest/v1/invitations?crm_student_id=eq.'+id+'&used_at=is.null',{method:'PATCH',body:JSON.stringify({expires_at:new Date().toISOString()})});
  if(!expired.ok)throw Error('STORAGE_UNAVAILABLE');
  const code=Array.from(crypto.getRandomValues(new Uint8Array(9)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
  const expires_at=new Date(Date.now()+7*86400000).toISOString();
  const invite=await adminRest('/rest/v1/invitations',{method:'POST',body:JSON.stringify({email,course_id:course.id,crm_student_id:id,code_hash:await sha256(code),expires_at,created_by:null})});
  if(!invite.ok)throw Error('STORAGE_UNAVAILABLE');
  return reply({code,email,expires_at,url:new URL(req.url).origin,level:chosen.level});
 }catch(e){const key=e instanceof Error?e.message:'UNAVAILABLE';return reply({error:key==='STAFF_REQUIRED'?'STAFF_REQUIRED':'UNAVAILABLE'},key==='STAFF_REQUIRED'?403:503);}
}
