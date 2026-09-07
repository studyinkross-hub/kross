import type { Entry } from './course';
export type ActivityType = 'shadow' | 'fill' | 'translate' | 'padlet';
export type LessonActivity = {
  id: string;
  type: ActivityType;
  time: number;
  title: string;
  prompt: string;
  answer: string;
  reference: string;
  sourceStart: number;
  sourceEnd: number;
  padletUrl: string;
  direction: 'vi-ko' | 'ko-vi';
  revision: number;
  archived?: boolean;
};
export const activityLabels = {
  shadow: ['Nghe & thu âm', '듣고 말하기'],
  fill: ['Điền từ', '단어 빈칸'],
  translate: ['Dịch câu', '문장 번역'],
  padlet: ['Đọc trên Padlet', 'Padlet 읽기'],
};
export const getActivities = (entries: Entry[]): LessonActivity[] =>
  entries
    .filter((e) => e.kind === 'lessonActivity' && !e.payload.archived)
    .map((e) => e.payload)
    .sort((a, b) => a.time - b.time);
export const activityCompleted = (a: LessonActivity, entries: Entry[]) =>
  entries.some(
    (e) =>
      e.id === 'response:' + a.id &&
      e.payload.revision === a.revision &&
      ['correct', 'completed', 'pending', 'approved'].includes(
        e.payload.status,
      ),
  );
export const normalizeAnswer = (s: string) =>
  s
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[.,!?。？！]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
export const matchesAnswer = (body: string, answers: string) =>
  answers.split('|').some((a) => normalizeAnswer(a) === normalizeAnswer(body));
export function validateActivity(
  b: any,
  duration: number,
  others: LessonActivity[],
): string | null {
  if (!['shadow', 'fill', 'translate', 'padlet'].includes(b.type))
    return 'TYPE';
  if (!Number.isInteger(b.time) || b.time <= 0 || b.time >= duration)
    return 'TIME';
  if (others.some((a) => a.id !== b.id && a.time === b.time))
    return 'DUPLICATE';
  if (
    typeof b.title !== 'string' ||
    !b.title.trim() ||
    b.title.length > 120 ||
    typeof b.prompt !== 'string' ||
    !b.prompt.trim() ||
    b.prompt.length > 2000
  )
    return 'TEXT';
  if (
    b.type === 'shadow' &&
    (!Number.isFinite(b.sourceStart) ||
      !Number.isFinite(b.sourceEnd) ||
      b.sourceStart < 0 ||
      b.sourceEnd <= b.sourceStart ||
      b.sourceEnd > duration ||
      b.sourceEnd - b.sourceStart > 120)
  )
    return 'SOURCE';
  if (
    ['fill', 'translate'].includes(b.type) &&
    (typeof b.answer !== 'string' || !b.answer.trim() || b.answer.length > 2000)
  )
    return 'ANSWER';
  if (b.type === 'translate' && !['vi-ko', 'ko-vi'].includes(b.direction))
    return 'DIRECTION';
  if (b.type === 'padlet') {
    try {
      const u = new URL(b.padletUrl);
      if (
        u.protocol !== 'https:' ||
        !['padlet.com', 'www.padlet.com'].includes(u.hostname) ||
        u.username ||
        u.password
      )
        return 'PADLET';
    } catch {
      return 'PADLET';
    }
  }
  return null;
}
export function sampleActivities(duration: number) {
  const long = duration >= 3600;
  const base = {
    id: '',
    revision: 1,
    sourceStart: 0,
    sourceEnd: Math.min(6, duration),
    direction: 'vi-ko',
    padletUrl: '',
    answer: '',
    reference: '',
  };
  return [
    {
      ...base,
      type: 'shadow',
      time: long ? 600 : 8,
      title: '회화 · 듣고 따라 말하기',
      prompt: '커피 한 잔 주세요.',
      reference: '커피 한 잔 주세요.',
    },
    {
      ...base,
      type: 'fill',
      time: long ? 1200 : 22,
      title: '단어 · 빈칸 채우기',
      prompt: '커피 ___ 잔 주세요. (hai ly)',
      answer: '두',
      reference: '둘 → 두: 두 잔',
    },
    {
      ...base,
      type: 'translate',
      time: long ? 1800 : 38,
      title: 'ㅂ 불규칙 · 베트남어 → 한국어',
      prompt: 'Hôm nay trời lạnh.',
      answer: '오늘은 추워요.|오늘 날씨가 추워요.|오늘 추워요.',
      reference: '춥다 → 추워요.',
    },
    {
      ...base,
      type: 'translate',
      time: long ? 2700 : 54,
      title: 'ㅂ 불규칙 · 한국어 → 베트남어',
      direction: 'ko-vi',
      prompt: '이 음식은 매워요.',
      answer: 'Món ăn này cay.|Món này cay.',
      reference: '맵다 → 매워요.',
    },
  ] as LessonActivity[];
}
