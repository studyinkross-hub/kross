export type Lang = 'vi' | 'ko';
export type Checkpoint = {
  id: string;
  time: number;
  prompt: string;
  promptKo: string;
  options: string[];
  answer: number;
  explanation: string;
  explanationKo: string;
  stage?: 'conversation' | 'vocab' | 'grammar';
};
// Lessons start empty. Teachers add every checkpoint themselves.
export const checkpoints: Checkpoint[] = [];
// Vocabulary is managed through the teacher library; no demo words are seeded.
export const words: Array<{id:string;ko:string;vi:string;example:string;meaning:string}> = [];
export type Entry = {
  id: string;
  kind: string;
  payload: any;
  updatedAt: string;
};
export const formatTime = (n: number) =>
  (n >= 3600
    ? Math.floor(n / 3600)
        .toString()
        .padStart(2, '0') + ':'
    : '') +
  Math.floor((n >= 3600 ? n % 3600 : n) / 60)
    .toString()
    .padStart(2, '0') +
  ':' +
  Math.floor(n % 60)
    .toString()
    .padStart(2, '0');

export const parseTime = (value: string): number => {
  const s = value.trim();
  if (!/^\d+(?::\d{1,2}){0,2}$/.test(s)) return NaN;
  const a = s.split(':').map(Number);
  if (a.length > 1 && a.slice(1).some((n) => n >= 60)) return NaN;
  return a.reduce((total, n) => total * 60 + n, 0);
};
