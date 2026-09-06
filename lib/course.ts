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
};
export const checkpoints: Checkpoint[] = [
  {
    id: 'cp1',
    time: 12,
    prompt: 'Bạn muốn gọi một ly cà phê. Chọn câu phù hợp.',
    promptKo: '커피 한 잔을 주문할 때 알맞은 표현은?',
    options: ['커피 한 잔 주세요.', '커피 한 명 주세요.', '커피 한 권 주세요.'],
    answer: 0,
    explanation:
      '잔 là đơn vị đếm đồ uống trong ly. 커피 한 잔 주세요 = Cho tôi một ly cà phê.',
    explanationKo: '음료를 셀 때는 ‘잔’을 사용해요. 커피 한 잔 주세요.',
  },
  {
    id: 'cp2',
    time: 30,
    prompt: 'Điền từ còn thiếu: 아메리카노 ___ 잔 주세요. (hai ly)',
    promptKo: '아메리카노 두 잔을 주문해 보세요. 빈칸에 들어갈 말은?',
    options: ['둘', '두', '이'],
    answer: 1,
    explanation: 'Trước đơn vị đếm, 둘 đổi thành 두: 두 잔 (hai ly).',
    explanationKo: '단위 명사 앞에서 ‘둘’은 ‘두’가 돼요. 두 잔.',
  },
  {
    id: 'cp3',
    time: 48,
    prompt: 'Nhân viên hỏi: “드시고 가세요?” Bạn muốn mang đi.',
    promptKo: '“드시고 가세요?”라는 질문에 포장한다고 대답해 보세요.',
    options: ['네, 여기서 마실게요.', '포장해 주세요.', '얼마예요?'],
    answer: 1,
    explanation:
      '포장해 주세요 = Cho tôi mang đi. 여기서 마실게요 = Tôi sẽ uống ở đây.',
    explanationKo:
      '‘포장해 주세요’는 가지고 나가겠다는 표현이에요. 매장에서 마실 때는 ‘여기서 마실게요’라고 해요.',
  },
];
export const words = [
  {
    id: 'coffee',
    ko: '커피',
    vi: 'cà phê',
    example: '커피 한 잔 주세요.',
    meaning: 'Cho tôi một ly cà phê.',
  },
  {
    id: 'cup',
    ko: '잔',
    vi: 'ly / tách',
    example: '두 잔 주세요.',
    meaning: 'Cho tôi hai ly.',
  },
  {
    id: 'give',
    ko: '주세요',
    vi: 'hãy cho tôi',
    example: '물 주세요.',
    meaning: 'Cho tôi nước.',
  },
  {
    id: 'order',
    ko: '주문하다',
    vi: 'gọi món / đặt hàng',
    example: '커피를 주문해요.',
    meaning: 'Tôi gọi cà phê.',
  },
  {
    id: 'takeout',
    ko: '포장',
    vi: 'mang đi / đóng gói',
    example: '포장해 주세요.',
    meaning: 'Cho tôi mang đi.',
  },
  {
    id: 'here',
    ko: '여기',
    vi: 'ở đây',
    example: '여기서 마실게요.',
    meaning: 'Tôi sẽ uống ở đây.',
  },
  {
    id: 'price',
    ko: '얼마예요?',
    vi: 'bao nhiêu tiền?',
    example: '커피는 얼마예요?',
    meaning: 'Cà phê bao nhiêu tiền?',
  },
  {
    id: 'water',
    ko: '물',
    vi: 'nước',
    example: '물 한 잔 주세요.',
    meaning: 'Cho tôi một ly nước.',
  },
];
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
