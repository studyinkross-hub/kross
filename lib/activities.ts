import type { Entry } from './course';
export type ActivityType = 'shadow' | 'fill' | 'translate' | 'padlet';
export type LessonStage = 'conversation' | 'vocab' | 'grammar';
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
  stage?: LessonStage;
  archived?: boolean;
};
export const lessonStages: LessonStage[] = ['conversation', 'vocab', 'grammar'];
export const stageLabels: Record<LessonStage, [string, string]> = {
  conversation: ['Hội thoại', '회화'],
  vocab: ['Từ vựng', '단어'],
  grammar: ['Ngữ pháp', '문법'],
};
export const stageForType = (type: ActivityType): LessonStage =>
  type === 'shadow' ? 'conversation' : type === 'translate' ? 'grammar' : 'vocab';
export const activityStage = (activity: Pick<LessonActivity, 'type' | 'stage'>) =>
  activity.stage || stageForType(activity.type);
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
