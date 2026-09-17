const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
const publishable = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function supabaseReady() {
  return Boolean(url() && publishable() && secret());
}

export async function adminRest(path: string, init: RequestInit = {}) {
  const key = secret();
  return fetch(`${url()}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
}

export async function authRest(path: string, init: RequestInit = {}) {
  return fetch(`${url()}${path}`, {
    ...init,
    headers: {
      apikey: publishable(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (x) => x.toString(16).padStart(2, '0')).join('');
}
