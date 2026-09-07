'use client';
import {
  BookOpen,
  Play,
  ArrowUpRight,
  Mic,
  Layers,
  Languages,
  PenLine,
  Check,
  Clock,
  ChevronRight,
} from 'lucide-react';
import type { Props } from './learning';
import { getPoints } from './learning';
import { formatTime } from '@/lib/course';
export const designNames = ['학습 데스크', '수업 여정', '수업 스튜디오'];
export function DesignPicker({
  value,
  onChange,
  lang,
}: {
  value: number;
  onChange: (n: number) => void;
  lang: string;
}) {
  return (
    <div className="design-picker">
      <div>
        <strong>{lang === 'ko' ? 'UI 시안 비교' : 'Chọn giao diện'}</strong>
        <span>
          {lang === 'ko'
            ? '같은 수업, 세 가지 구성'
            : 'Cùng bài học · 3 cách bố trí'}
        </span>
      </div>
      <div role="group" aria-label="UI 시안 선택">
        {designNames.map((s, i) => (
          <button
            key={s}
            aria-pressed={value === i}
            onClick={() => onChange(i)}
          >
            <small>{'ABC'[i]}</small>
            {lang === 'ko'
              ? s
              : ['Study desk', 'Learning path', 'Learning studio'][i]}
          </button>
        ))}
      </div>
    </div>
  );
}
export function LearningHome({
  lang,
  entries,
  go,
  design,
}: Props & { design: number }) {
  const t = (v: string, k: string) => (lang === 'ko' ? k : v);
  const cfg = entries.find((e) => e.id === 'config')?.payload || {
    duration: 60,
  };
  const points = getPoints(entries);
  const done = points.filter((p) =>
    entries.some((e) => e.id === 'attempt:' + p.id && e.payload.correct),
  ).length;
  const stages = [
    {
      icon: Mic,
      title: t('Nghe & nói', '듣고 따라 말하기'),
      desc: t('Thu âm và nghe đối chiếu', '내 목소리 녹음 · 원본 비교'),
      time: '00–10',
      v: 'lesson',
    },
    {
      icon: Layers,
      title: t('Đọc & từ vựng', '단어 읽기와 빈칸'),
      desc: t('Bảng từ · Điền vào chỗ trống', 'Padlet 활동 · 빈칸 채우기'),
      time: '10–20',
      v: 'lesson',
    },
    {
      icon: Languages,
      title: t('Ngữ pháp & dịch', '문법과 번역'),
      desc: t('Việt ↔ Hàn · Luyện câu', '베트남어 ↔ 한국어 문장 연습'),
      time: '20–45',
      v: 'lesson',
    },
    {
      icon: PenLine,
      title: t('Bài tập & nhận xét', '정리와 피드백'),
      desc: t('Viết câu và nhận góp ý', '내 문장 제출 · 선생님 피드백'),
      time: '45–60',
      v: 'feedback',
    },
  ];
  const course = (
    <article className="lesson-feature">
      <div className="lesson-photo">
        <img src="/course-cafe.jpg" alt="" />
        <span>{t('SƠ CẤP 1 · BÀI 04', '초급 1 · 04강')}</span>
        <h2>{t('Tiếng Hàn\ntrong quán cà phê', '카페에서 만나는\n한국어')}</h2>
      </div>
      <div className="feature-content">
        <div className="row spread">
          <span className="course-category">KOREAN COMMUNICATION</span>
          <span className="lesson-index">04</span>
        </div>
        <h2>{t('Gọi món, nói tự tin hơn', '커피 한 잔 주세요.')}</h2>
        <p>
          {t(
            'Xem một đoạn. Thử nói, viết và nhận phản hồi.',
            '한 구간을 보고, 직접 말하고 쓰며 익히세요.',
          )}
        </p>
        <div className="row feature-meta">
          <Clock size={16} />
          {formatTime(cfg.duration)}
          <span>·</span>
          {done}/{points.length} {t('nhiệm vụ', '미션')}
        </div>
        <button className="primary" onClick={() => go('lesson')}>
          <Play size={17} />
          {t('Tiếp tục bài học', '수업 이어보기')}
          <ArrowUpRight size={17} />
        </button>
      </div>
    </article>
  );
  const flow = (
    <section className="class-flow">
      <div className="row spread">
        <h2>{t('Một giờ học cùng KROSS', 'KROSS의 1시간 수업')}</h2>
        <span>{t('Mẫu lộ trình', '수업 구성 예시')}</span>
      </div>
      <div className="stage-list">
        {stages.map((s, i) => (
          <button key={s.time} onClick={() => go(s.v)}>
            <span className="stage-order">0{i + 1}</span>
            <span className="stage-icon">
              <s.icon size={23} />
            </span>
            <div>
              <small>{s.time} MIN</small>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
    </section>
  );
  const tools = (
    <div className="study-tools">
      <button onClick={() => go('vocab')}>
        <Layers />
        <span>
          <strong>{t('Sổ từ vựng', '나의 단어장')}</strong>
          <small>{t('Thẻ từ & ôn tập', '단어 카드와 복습')}</small>
        </span>
        <ArrowUpRight />
      </button>
      <button onClick={() => go('feedback')}>
        <PenLine />
        <span>
          <strong>{t('Bài tập của tôi', '과제와 피드백')}</strong>
          <small>{t('Trao đổi với giáo viên', '선생님과 문장 완성하기')}</small>
        </span>
        <ArrowUpRight />
      </button>
    </div>
  );
  return (
    <div className={'concept-home concept-' + design}>
      <header className="home-title">
        <div>
          <p>KROSS · LEARNING SPACE</p>
          <h1>{t('Chào Minh Anh.', 'Minh Anh님, 안녕하세요.')}</h1>
          <span>
            {t(
              'Hôm nay, bạn sẽ nói thêm được một câu.',
              '오늘 배운 표현을 내 말로 만들어 보세요.',
            )}
          </span>
        </div>
        <div className="class-label">
          <BookOpen size={19} />
          {t('Lớp sơ cấp 1', '초급 1 클래스')}
        </div>
      </header>
      {design === 0 ? (
        <div className="desk-layout">
          <div>
            {course}
            {tools}
          </div>
          <aside>{flow}</aside>
        </div>
      ) : design === 1 ? (
        <>
          {flow}
          <div className="path-bottom">
            {course}
            {tools}
          </div>
        </>
      ) : (
        <>
          <div className="classroom-intro">
            <div>
              <span>{t('LỚP HỌC CỦA BẠN', '나의 온라인 교실')}</span>
              <h2>
                {t(
                  'Nghe. Nói.\nHiểu bằng thực hành.',
                  '듣고, 말하고.\n연습하며 이해하는 수업.',
                )}
              </h2>
              <button className="primary" onClick={() => go('lesson')}>
                {t('Vào lớp học', '교실 들어가기')}
                <ArrowUpRight size={18} />
              </button>
            </div>
            <div className="classroom-paper">
              <span>오늘의 한국어</span>
              <strong>
                커피 두 잔<br />
                주세요.
              </strong>
              <p>Cho tôi hai ly cà phê.</p>
              <div>
                <Mic size={17} />
                {t('Đến lượt bạn nói', '이번에는 내가 말할 차례')}
              </div>
            </div>
          </div>
          {flow}
          {tools}
        </>
      )}
    </div>
  );
}
