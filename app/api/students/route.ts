import {isTeacher} from '@/lib/teacher-auth';
import {adminRest} from '@/lib/supabase-rest';

type Student={id:string;display_name:string;enrollments?:Array<{status:string;courses:{title:string;level:string}|null}>};
type RecordRow={student_id:string;lesson_key:string;kind:string;payload:{furthest?:number;position?:number;status?:string};updated_at:string};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
  if(!await isTeacher(req))return reply({error:'TEACHER_REQUIRED'},403);
  try{
    const [studentsRes,recordsRes]=await Promise.all([
      adminRest('/rest/v1/profiles?role=eq.student&select=id,display_name,enrollments(status,courses(title,level))&order=display_name.asc&limit=500'),
      adminRest('/rest/v1/learning_records?select=student_id,lesson_key,kind,payload,updated_at&order=updated_at.desc&limit=5000'),
    ]);
    if(!studentsRes.ok||!recordsRes.ok)throw Error();
    const students=await studentsRes.json() as Student[];
    const records=await recordsRes.json() as RecordRow[];
    return reply({students:students.map(student=>{
      const own=records.filter(item=>item.student_id===student.id);
      const progress=own.filter(item=>item.kind==='progress'&&item.lesson_key!=='demo');
      return {id:student.id,name:student.display_name,courses:(student.enrollments||[]).filter(item=>item.status==='active').map(item=>item.courses).filter(Boolean),videosStarted:new Set(progress.map(item=>item.lesson_key)).size,activitiesCompleted:own.filter(item=>item.kind==='activityResponse'&&['correct','completed','approved'].includes(item.payload?.status||'')).length,lastActivity:own[0]?.updated_at||null,progress:progress.map(item=>({lessonId:item.lesson_key,seconds:Number(item.payload?.furthest||item.payload?.position||0)}))};
    })});
  }catch{return reply({error:'STORAGE_UNAVAILABLE'},503);}
}
