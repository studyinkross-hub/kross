import {adminRest, authRest, sha256, supabaseReady} from '@/lib/supabase-rest';
import {linkedAccess,crmStudent} from '@/lib/crm-bridge';
import {isTeacher} from '@/lib/teacher-auth';

const accessCookie = 'kross_access';
const refreshCookie = 'kross_refresh';
const clean = (v: unknown, n: number) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const json = (body: unknown, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
const cookieValue = (req: Request, name: string) => (req.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1) || '';
const cookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export async function profileFor(token: string) {
  const userRes = await authRest('/auth/v1/user', {headers: {Authorization: `Bearer ${token}`}});
  if (!userRes.ok) return null;
  const user = await userRes.json() as {id: string; email?: string};
  if (!await linkedAccess(user.id)) return null;
  const profileRes = await adminRest(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=display_name,role`);
  const profiles = profileRes.ok ? await profileRes.json() as Array<{display_name: string; role: string}> : [];
  const enrollmentRes = await adminRest(`/rest/v1/enrollments?student_id=eq.${encodeURIComponent(user.id)}&status=eq.active&select=courses(title,level)`);
  const enrollments = enrollmentRes.ok ? await enrollmentRes.json() as Array<{courses: {title: string; level: string} | null}> : [];
  return {id: user.id, email: user.email || '', name: profiles[0]?.display_name || '', role: profiles[0]?.role || 'student', course: enrollments[0]?.courses || null};
}

export async function GET(req: Request) {
  if (await isTeacher(req)) return json({authenticated: false, teacher: true});
  if (!supabaseReady()) return json({authenticated: false, error: 'NOT_CONFIGURED'}, 503);
  const access = cookieValue(req, accessCookie);
  let profile = access ? await profileFor(access) : null;
  if (profile) return json({authenticated: true, profile});
  const refresh = cookieValue(req, refreshCookie);
  if (!refresh) return json({authenticated: false});
  const refreshed = await authRest('/auth/v1/token?grant_type=refresh_token', {method: 'POST', body: JSON.stringify({refresh_token: refresh})});
  if (!refreshed.ok) return json({authenticated: false});
  const session = await refreshed.json() as {access_token: string; refresh_token: string; expires_in: number};
  profile = await profileFor(session.access_token);
  const response = json({authenticated: Boolean(profile), profile});
  response.headers.append('Set-Cookie', cookie(accessCookie, session.access_token, session.expires_in || 3600));
  response.headers.append('Set-Cookie', cookie(refreshCookie, session.refresh_token, 60 * 60 * 24 * 30));
  return response;
}

export async function POST(req: Request) {
  if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin) return json({error: 'ORIGIN'}, 403);
  if (!supabaseReady()) return json({error: 'NOT_CONFIGURED'}, 503);
  try {
    const text = await req.text();
    if (text.length > 4096) return json({error: 'INVALID'}, 400);
    const body = JSON.parse(text);
    const action = clean(body.action, 12);
    const email = clean(body.email, 254).toLowerCase();
    const password = clean(body.password, 128);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) return json({error: 'INVALID'}, 400);

    if (action === 'signup') {
      const name = clean(body.name, 80);
      const code = clean(body.code, 32).toUpperCase().replace(/\s/g, '');
      if (name.length < 2 || !/^[A-F0-9]{18}$/.test(code)) return json({error: 'INVALID'}, 400);
      const codeHash = await sha256(code);
      const invitationRes = await adminRest(`/rest/v1/invitations?code_hash=eq.${codeHash}&email=eq.${encodeURIComponent(email)}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,course_id,crm_student_id`);
      const invitations = invitationRes.ok ? await invitationRes.json() as Array<{id: string; course_id: string; crm_student_id?:string}> : [];
      if (!invitations[0]) return json({error: 'INVITE_INVALID'}, 400);
      if (invitations[0].crm_student_id && (await crmStudent(invitations[0].crm_student_id)).status !== 'active') return json({error:'STUDENT_INACTIVE'},403);
      const createRes = await adminRest('/auth/v1/admin/users', {method: 'POST', body: JSON.stringify({email, password, email_confirm: true, user_metadata: {display_name: name}})});
      if (!createRes.ok) {
        const detail = await createRes.text();
        return json({error: detail.includes('already') ? 'EMAIL_EXISTS' : 'SIGNUP_FAILED'}, 409);
      }
      const created = await createRes.json() as {id: string};
      const enrollRes = await adminRest('/rest/v1/rpc/complete_invitation', {method:'POST',body:JSON.stringify({invitation_id:invitations[0].id,user_id:created.id})});
      if (!enrollRes.ok) {
        // Remove only the user created by this attempt if atomic enrollment failed.
        await adminRest('/auth/v1/admin/users/'+created.id,{method:'DELETE'});
        return json({error:'ENROLL_FAILED'},409);
      }
    } else if (action !== 'login') return json({error: 'INVALID'}, 400);

    const loginRes = await authRest('/auth/v1/token?grant_type=password', {method: 'POST', body: JSON.stringify({email, password})});
    if (!loginRes.ok) return json({error: 'LOGIN_FAILED'}, 401);
    const session = await loginRes.json() as {access_token: string; refresh_token: string; expires_in: number};
    const profile = await profileFor(session.access_token);
    if (!profile) return json({error:'STUDENT_INACTIVE'},403);
    const response = json({authenticated: true, profile});
    response.headers.append('Set-Cookie', cookie(accessCookie, session.access_token, session.expires_in || 3600));
    response.headers.append('Set-Cookie', cookie(refreshCookie, session.refresh_token, 60 * 60 * 24 * 30));
    return response;
  } catch {
    return json({error: 'UNAVAILABLE'}, 503);
  }
}

export async function DELETE() {
  const response = json({authenticated: false});
  response.headers.append('Set-Cookie', cookie(accessCookie, '', 0));
  response.headers.append('Set-Cookie', cookie(refreshCookie, '', 0));
  return response;
}
