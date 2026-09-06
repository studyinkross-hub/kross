import { database } from '@/db';
import { checkpoints, words } from '@/lib/course';
const cookieName = 'kross_demo';
function identity(req: Request) {
  const existing = req.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(cookieName + '='))
    ?.slice(cookieName.length + 1);
  return existing && /^[a-f0-9-]{36}$/.test(existing)
    ? existing
    : crypto.randomUUID();
}
function response(req: Request, sid: string, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Set-Cookie':
        cookieName +
        '=' +
        sid +
        '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000' +
        (new URL(req.url).protocol === 'https:' ? '; Secure' : ''),
    },
  });
}
async function read(sid: string) {
  const r = await database()
    .prepare(
      'SELECT id, kind, payload, updated_at AS updatedAt FROM records WHERE session = ? ORDER BY updated_at ASC',
    )
    .bind(sid)
    .all<any>();
  return r.results.map((x) => ({ ...x, payload: JSON.parse(x.payload) }));
}
async function save(sid: string, id: string, kind: string, payload: unknown) {
  await database()
    .prepare(
      'INSERT INTO records (session,id,kind,payload,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(session,id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at',
    )
    .bind(sid, id, kind, JSON.stringify(payload), new Date().toISOString())
    .run();
}
async function activity(sid: string) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  await save(sid, 'activity:' + day, 'activity', { day });
}
const clean = (v: unknown, max = 2000) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';
export async function GET(req: Request) {
  const sid = identity(req);
  try {
    return response(req, sid, { entries: await read(sid) });
  } catch {
    return response(req, sid, { error: 'STORAGE_UNAVAILABLE' }, 503);
  }
}
export async function POST(req: Request) {
  const sid = identity(req);
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return response(req, sid, { error: 'ORIGIN' }, 403);
  if (Number(req.headers.get('content-length') || 0) > 32000)
    return response(req, sid, { error: 'TOO_LARGE' }, 413);
  try {
    const raw = await req.text();
    if (raw.length > 32000)
      return response(req, sid, { error: 'TOO_LARGE' }, 413);
    const b = JSON.parse(raw);
    const entries = await read(sid);
    const config = entries.find((x) => x.id === 'config')?.payload || {
      videoUrl: '/lesson-cafe.mp4',
      duration: 60,
    };
    const custom = entries
      .filter((x) => x.kind === 'checkpoint')
      .map((x) => x.payload);
    const all = [
      ...checkpoints.filter((p) => !custom.some((c) => c.id === p.id)),
      ...custom,
    ];
    if (b.action === 'progress') {
      const pos = Number(b.position);
      if (!Number.isFinite(pos) || pos < 0 || pos > config.duration + 1)
        return response(req, sid, { error: 'INVALID_PROGRESS' }, 400);
      const old = entries.find((x) => x.id === 'progress')?.payload;
      await save(sid, 'progress', 'progress', {
        position: pos,
        furthest: Math.max(pos, old?.furthest || 0),
      });
    } else if (b.action === 'attempt') {
      const cp = all.find((x) => x.id === b.id);
      if (
        !cp ||
        !Number.isInteger(b.answer) ||
        b.answer < 0 ||
        b.answer >= cp.options.length
      )
        return response(req, sid, { error: 'INVALID_ANSWER' }, 400);
      const prev = entries.find((x) => x.id === 'attempt:' + cp.id)?.payload;
      const correct = b.answer === cp.answer;
      await save(sid, 'attempt:' + cp.id, 'attempt', {
        checkpointId: cp.id,
        correct: correct || !!prev?.correct,
        attempts: (prev?.attempts || 0) + 1,
        lastAnswer: b.answer,
      });
      if (!correct) {
        const wordId =
          cp.id === 'cp3'
            ? 'takeout'
            : cp.id === 'cp1' || cp.id === 'cp2'
              ? 'cup'
              : null;
        if (wordId) {
          const prevWord = entries.find(
            (x) => x.id === 'vocab:' + wordId,
          )?.payload;
          await save(sid, 'vocab:' + wordId, 'vocab', {
            wordId,
            known: false,
            streak: 0,
            reviews: prevWord?.reviews || 0,
            due: new Date().toISOString(),
          });
        }
      }
      await activity(sid);
      return response(req, sid, {
        entries: await read(sid),
        correct,
        explanation: cp.explanation,
        explanationKo: cp.explanationKo,
      });
    } else if (b.action === 'vocab') {
      const word = words.find((x) => x.id === b.id);
      if (!word || typeof b.known !== 'boolean')
        return response(req, sid, { error: 'INVALID_WORD' }, 400);
      const prev = entries.find((x) => x.id === 'vocab:' + word.id)?.payload;
      const count = b.known ? (prev?.streak || 0) + 1 : 0;
      const days = b.known ? [1, 3, 7, 14][Math.min(count - 1, 3)] : 0;
      await save(sid, 'vocab:' + word.id, 'vocab', {
        wordId: word.id,
        known: b.known,
        streak: count,
        reviews: (prev?.reviews || 0) + 1,
        due: new Date(Date.now() + days * 86400000).toISOString(),
      });
    } else if (b.action === 'submit') {
      const body = clean(b.body);
      if (!body || !/[가-힣]/.test(body))
        return response(req, sid, { error: 'KOREAN_REQUIRED' }, 400);
      const prev = entries.find((x) => x.id === 'assignment')?.payload;
      await save(sid, 'assignment', 'assignment', {
        body,
        status: 'submitted',
        feedback: '',
        revision: (prev?.revision || 0) + 1,
      });
    } else if (b.action === 'feedback') {
      const feedback = clean(b.body);
      const prev = entries.find((x) => x.id === 'assignment');
      if (!prev || !feedback || !['approved', 'revise'].includes(b.status))
        return response(req, sid, { error: 'INVALID_FEEDBACK' }, 400);
      await save(sid, 'assignment', 'assignment', {
        ...prev.payload,
        feedback,
        status: b.status,
      });
    } else if (b.action === 'question') {
      const body = clean(b.body);
      const time = Number(b.time);
      if (!body || !Number.isFinite(time) || time < 0 || time > config.duration)
        return response(req, sid, { error: 'INVALID_QUESTION' }, 400);
      await save(sid, 'question:' + crypto.randomUUID(), 'question', {
        body,
        time,
        reply: '',
      });
    } else if (b.action === 'reply') {
      const prev = entries.find((x) => x.id === b.id && x.kind === 'question');
      const reply = clean(b.body);
      if (!prev || !reply)
        return response(req, sid, { error: 'INVALID_REPLY' }, 400);
      await save(sid, prev.id, 'question', { ...prev.payload, reply });
    } else if (b.action === 'moveCheckpoint') {
      const cp = all.find((p) => p.id === b.id),
        time = Number(b.time);
      if (
        !cp ||
        !Number.isFinite(time) ||
        time <= 0 ||
        time >= config.duration ||
        all.some((p) => p.id !== cp.id && Math.abs(p.time - time) < 1)
      )
        return response(req, sid, { error: 'INVALID_CHECKPOINT' }, 400);
      await database().batch([
        database()
          .prepare(
            'INSERT INTO records(session,id,kind,payload,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(session,id) DO UPDATE SET kind=excluded.kind,payload=excluded.payload,updated_at=excluded.updated_at',
          )
          .bind(
            sid,
            cp.id,
            'checkpoint',
            JSON.stringify({ ...cp, time }),
            new Date().toISOString(),
          ),
        database()
          .prepare('DELETE FROM records WHERE session=? AND id=?')
          .bind(sid, 'attempt:' + cp.id),
      ]);
    } else if (b.action === 'checkpoint') {
      const time = Number(b.time),
        prompt = clean(b.prompt, 300),
        explanation = clean(b.explanation, 1000);
      const options = Array.isArray(b.options)
        ? b.options.map((x: unknown) => clean(x, 200))
        : [];
      if (
        !Number.isFinite(time) ||
        time <= 0 ||
        time >= config.duration ||
        all.some((x) => Math.abs(x.time - time) < 1) ||
        all.length >= 20 ||
        !prompt ||
        !explanation ||
        options.length !== 3 ||
        options.some((x: string) => !x) ||
        new Set(options).size !== 3 ||
        !Number.isInteger(b.answer) ||
        b.answer < 0 ||
        b.answer > 2
      )
        return response(req, sid, { error: 'INVALID_CHECKPOINT' }, 400);
      const id = crypto.randomUUID();
      await save(sid, id, 'checkpoint', {
        id,
        time,
        prompt,
        promptKo: prompt,
        options,
        answer: b.answer,
        explanation,
        explanationKo: explanation,
      });
    } else if (b.action === 'config') {
      const url = clean(b.videoUrl, 2000);
      const duration = Number(b.duration);
      let valid = url === '/lesson-cafe.mp4';
      try {
        const u = new URL(url);
        valid =
          u.protocol === 'https:' &&
          /\.(mp4|webm)$/i.test(u.pathname) &&
          !u.username &&
          !u.password;
      } catch {}
      if (
        !valid ||
        !Number.isFinite(duration) ||
        duration < 50 ||
        duration > 14400 ||
        all.some((x) => x.time >= duration)
      )
        return response(req, sid, { error: 'INVALID_VIDEO' }, 400);
      await database().batch([
        database()
          .prepare(
            "DELETE FROM records WHERE session=? AND kind IN ('progress','attempt')",
          )
          .bind(sid),
        database()
          .prepare(
            "INSERT INTO records(session,id,kind,payload,updated_at) VALUES (?,'config','config',?,?) ON CONFLICT(session,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at",
          )
          .bind(
            sid,
            JSON.stringify({ videoUrl: url, duration }),
            new Date().toISOString(),
          ),
      ]);
    } else return response(req, sid, { error: 'UNKNOWN_ACTION' }, 400);
    if (['vocab', 'submit'].includes(b.action)) await activity(sid);
    return response(req, sid, { entries: await read(sid) });
  } catch (e) {
    console.error('KROSS API', e instanceof Error ? e.message : 'unknown');
    return response(req, sid, { error: 'SAVE_FAILED' }, 500);
  }
}
