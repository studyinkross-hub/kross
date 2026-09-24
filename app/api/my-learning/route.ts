import {profileFor} from '@/app/api/auth/route';
import {adminRest} from '@/lib/supabase-rest';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
  const token=req.headers.get('cookie')?.split(';').map(item=>item.trim()).find(item=>item.startsWith('kross_access='))?.slice(13);
  if(!token)return reply({error:'LOGIN_REQUIRED'},401);
  try{
    const profile=await profileFor(token);
    if(!profile)return reply({error:'LOGIN_REQUIRED'},401);
    const response=await adminRest('/rest/v1/learning_records?student_id=eq.'+encodeURIComponent(profile.id)+'&select=lesson_key,kind,payload,updated_at&order=updated_at.desc&limit=1000');
    if(!response.ok)throw Error();
    const records=await response.json() as Array<{lesson_key:string;kind:string;payload:{furthest?:number;position?:number;status?:string};updated_at:string}>;
    return reply({records:records.filter(item=>item.lesson_key!=='demo')});
  }catch{return reply({error:'STORAGE_UNAVAILABLE'},503);}
}
