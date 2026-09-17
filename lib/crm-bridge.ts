import {env} from 'cloudflare:workers';
import {adminRest} from './supabase-rest';

const origin = 'https://piymnwtmxilzcxeenbvh.supabase.co';
const publicKey = 'sb_publishable_xS5IKLMUULkLdVTBsTsIlA_fZjSgxvi';
export const crmOrigin = 'https://kross-flow-crm.studyinkross.workers.dev';
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function crmRead(path:string, token?:string) {
  const key = token ? publicKey : (env as unknown as {CRM_SUPABASE_SERVICE_ROLE_KEY?:string}).CRM_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw Error('CRM_NOT_CONFIGURED');
  const r = await fetch(origin+path,{headers:{apikey:key,Authorization:'Bearer '+(token||key)},signal:AbortSignal.timeout(10000)});
  if (!r.ok) throw Error('CRM_UNAVAILABLE');
  return r.json() as Promise<any>;
}
export async function authorizeCrm(req:Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /,'');
  if (!token) throw Error('STAFF_REQUIRED');
  const user = await crmRead('/auth/v1/user',token);
  if (!uuid.test(user.id||'')) throw Error('STAFF_REQUIRED');
  const staff = await crmRead('/rest/v1/staff_profiles?id=eq.'+user.id+'&select=id,role,active',token);
  if (!staff[0]?.active || !['master','manager','teacher','consultant'].includes(staff[0].role)) throw Error('STAFF_REQUIRED');
  return {token,id:user.id};
}
export async function crmStudent(id:string, token?:string) {
  if (!uuid.test(id)) throw Error('INVALID_STUDENT');
  const rows = await crmRead('/rest/v1/students?id=eq.'+id+'&select=id,full_name,student_code,status',token);
  if (!rows[0]) throw Error('STUDENT_NOT_FOUND');
  return rows[0];
}
export async function linkedAccess(studentId:string) {
  const r = await adminRest('/rest/v1/crm_student_links?student_id=eq.'+studentId+'&select=crm_student_id');
  if (!r.ok) throw Error('LINK_UNAVAILABLE');
  const links = await r.json() as {crm_student_id:string}[];
  if (!links[0]) return true;
  const student = await crmStudent(links[0].crm_student_id);
  return student.status==='active';
}
export const courseLevels:Record<string,string> = {
  'KOR-BEG-1':'기초+초급1','KOR-BEG-2':'초급2','KOR-INT-1':'중급1','KOR-INT-2':'중급2',
  'TOPIK-12':'TOPIK1','TOPIK-34':'TOPIK2 3·4급','TOPIK-56':'TOPIK2 5·6급',
};
export function mappedLevel(course:{code:string;name_ko:string}) {
  const name=course.name_ko.replace(/\s/g,'');
  const names:Record<string,string>={'초급1':'기초+초급1','기초+초급1':'기초+초급1','초급2':'초급2','중급1':'중급1','중급2':'중급2','초급회화':'초급회화','중급회화':'중급회화'};
  return courseLevels[course.code] || names[name] || null;
}
