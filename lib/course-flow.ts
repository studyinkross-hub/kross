export type SegmentType =
  | 'conversation-shadow'
  | 'vocab-practice'
  | 'conversation-analysis'
  | 'grammar-intro'
  | 'homework-listening'
  | 'homework-translate'
  | 'homework-vocab'
  | 'topik-listening'
  | 'topik-solution'
  | 'topik-analysis'
  | 'topik-vocab'
  | 'topik-application'
  | 'topik-application-solution'
  | 'custom';

type Option = { value: SegmentType; ko: string; vi: string };

export const regularSegments: Option[] = [
  { value: 'conversation-shadow', ko: '회화 쉐도잉', vi: 'Shadowing hội thoại' },
  { value: 'vocab-practice', ko: '단어 연습 · PADLET 영상', vi: 'Luyện từ vựng · video PADLET' },
  { value: 'conversation-analysis', ko: '회화 분석', vi: 'Phân tích hội thoại' },
  { value: 'grammar-intro', ko: '문법 소개', vi: 'Giới thiệu ngữ pháp' },
  { value: 'homework-listening', ko: '숙제 · 듣기', vi: 'Bài tập · nghe' },
  { value: 'homework-translate', ko: '숙제 · 베트남어 → 한국어', vi: 'Bài tập · Việt → Hàn' },
  { value: 'homework-vocab', ko: '숙제 · 단어 문제', vi: 'Bài tập · từ vựng' },
];

export const topikSegments: Option[] = [
  { value: 'topik-listening', ko: 'TOPIK · 듣기 문제', vi: 'TOPIK · câu hỏi nghe' },
  { value: 'topik-solution', ko: 'TOPIK · 문제 풀이', vi: 'TOPIK · hướng dẫn giải' },
  { value: 'topik-analysis', ko: 'TOPIK · 문항별 분석', vi: 'TOPIK · phân tích từng câu' },
  { value: 'topik-vocab', ko: 'TOPIK · 단어 연습', vi: 'TOPIK · luyện từ vựng' },
  { value: 'topik-application', ko: 'TOPIK · 응용 문제', vi: 'TOPIK · bài tập ứng dụng' },
  { value: 'topik-application-solution', ko: 'TOPIK · 응용 문제 풀이', vi: 'TOPIK · giải bài tập ứng dụng' },
];

export const segmentOptions = (level: string) =>
  level.startsWith('TOPIK') ? topikSegments : regularSegments;

export const segmentLabel = (value: string | undefined, lang: string) => {
  const option = [...regularSegments, ...topikSegments].find((item) => item.value === value);
  return option ? (lang === 'ko' ? option.ko : option.vi) : lang === 'ko' ? '직접 구성' : 'Tự thiết kế';
};

export const segmentTypes = new Set<SegmentType>([
  ...regularSegments.map((item) => item.value),
  ...topikSegments.map((item) => item.value),
  'custom',
]);
