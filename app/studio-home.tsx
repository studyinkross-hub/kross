'use client';
import { useState } from 'react';
import {
  Play,
  ArrowUpRight,
  Mic,
  Languages,
  Layers,
  ChevronRight,
  Headphones,
  BookOpen,
  PenLine,
  LoaderCircle,
} from 'lucide-react';
import type { Props } from './learning';
import {
  getActivities,
  sampleActivities,
  activityLabels,
  activityCompleted,
} from '@/lib/activities';
import { formatTime } from '@/lib/course';
export function StudioHome({ lang, entries, mutate, busy, go }: Props) {
  const t = (v: string, k: string) => (lang === 'ko' ? k : v);
  const [starting, setStarting] = useState(false),
    [error, setError] = useState('');
  const config = entries.find((e) => e.id === 'config')?.payload || {
    duration: 60,
    videoUrl: '/lesson-cafe.mp4',
  };
  const actual = getActivities(entries);
  const schedule = actual.length ? actual : sampleActivities(config.duration);
  async function start() {
    if (actual.length) {
      go('lesson');
      return;
    }
    setStarting(true);
    setError('');
    try {
      for (const a of schedule) await mutate({ ...a, action: 'saveActivity' });
      go('lesson');
    } catch {
      setError(
        t(
          'Một thời điểm bị trùng. Đổi thời điểm trong không gian giáo viên.',
          '기존 미션과 시점이 겹칩니다. 선생님 공간에서 시점을 조정해 주세요.',
        ),
      );
    } finally {
      setStarting(false);
    }
  }
  return (
    <div className="studio-home">
      <header className="studio-home-heading">
        <div>
          <span>KROSS / KOREAN LAB</span>
          <h1>
            {t('Không gian thực hành', '나의 수업 스튜디오')}
            <i>.</i>
          </h1>
        </div>
        <p>
          {t('Sơ cấp 1', '초급 1')}
          <b>04</b>
        </p>
      </header>
      <div className="studio-canvas">
        <section className="source-desk">
          <div className="desk-tab">
            <span>
              <span className="live-dot" />
              {t('BÀI HỌC ĐANG HỌC', '지금 배우는 수업')}
            </span>
            <small>{formatTime(config.duration)}</small>
          </div>
          <button
            className="studio-source"
            onClick={start}
            disabled={starting || busy}
            aria-label={t('Bắt đầu bài học tương tác', '쌍방향 수업 시작')}
          >
            <img src="/course-cafe.jpg" alt="" />
            <div>
              <span>카페에서 주문하기</span>
              <h2>
                커피 한 잔<br />
                주세요.
              </h2>
              <p>Một ly cà phê, làm ơn.</p>
            </div>
            <span className="large-play">
              {starting ? (
                <LoaderCircle className="spin" />
              ) : (
                <Play fill="currentColor" size={26} />
              )}
            </span>
          </button>
          <div className="source-desk-bottom">
            <div>
              <Headphones size={19} />
              <span>
                {t('Xem → Thực hành → Tiếp tục', '시청 → 직접 연습 → 이어보기')}
              </span>
            </div>
            <button onClick={start} disabled={starting || busy}>
              {t('Vào bài học', '수업 시작')}
              <ArrowUpRight size={20} />
            </button>
          </div>
        </section>
        <section className="practice-desk">
          <div className="desk-tab">
            <span>{t('ĐẾN LƯỢT BẠN', '내가 연습할 차례')}</span>
            <Languages size={19} />
          </div>
          <div className="translation-paper">
            <div className="language-pair">
              <span>VI</span>
              <span>↗</span>
              <span>KO</span>
            </div>
            <span className="exercise-label">ㅂ 불규칙</span>
            <h2>
              Hôm nay
              <br />
              trời lạnh.
            </h2>
            <p>
              {t(
                'Bạn sẽ nói câu này bằng tiếng Hàn như thế nào?',
                '이 문장을 한국어로 어떻게 말할까요?',
              )}
            </p>
            <button className="notebook-line" onClick={start}>
              <span>{t('Viết câu của bạn', '내 문장으로 써 보기')}</span>
              <PenLine size={19} />
            </button>
            <div className="grammar-note">
              <span>춥다</span>
              <span>→</span>
              <strong>추워요</strong>
            </div>
          </div>
          <button className="desk-bottom-link" onClick={() => go('teacher')}>
            {t(
              'Giáo viên thiết kế từng hoạt động',
              '선생님이 활동을 직접 설계합니다',
            )}
            <ArrowUpRight size={18} />
          </button>
        </section>
      </div>
      <section className="session-track">
        <div className="track-title">
          <span>CLASS SEQUENCE</span>
          <h2>{t('Lộ trình thực hành', '이 수업의 활동')}</h2>
          <p>
            {actual.length
              ? t('Theo thiết lập của giáo viên', '선생님이 설정한 순서')
              : t(
                  '4 hoạt động mẫu khi bắt đầu',
                  '시작하면 예제 활동 4개가 추가됩니다.',
                )}
          </p>
        </div>
        <div className="track-stations">
          {schedule.map((a, i) => {
            const Icon =
              a.type === 'shadow'
                ? Mic
                : a.type === 'fill'
                  ? Layers
                  : Languages;
            return (
              <button
                key={a.id || i}
                onClick={start}
                disabled={starting || busy}
                className={activityCompleted(a, entries) ? 'complete' : ''}
              >
                <span className="station-pin">
                  <Icon size={20} />
                </span>
                <time>{formatTime(a.time)}</time>
                <strong>{activityLabels[a.type][lang === 'ko' ? 1 : 0]}</strong>
                <small>
                  {a.type === 'translate'
                    ? a.direction === 'ko-vi'
                      ? 'KO → VI'
                      : 'VI → KO'
                    : a.type === 'shadow'
                      ? t('Thu & đối chiếu', '녹음하고 비교')
                      : t('Tự điền đáp án', '직접 답 채우기')}
                </small>
              </button>
            );
          })}
        </div>
      </section>
      <div className="studio-shortcuts">
        <button onClick={() => go('vocab')}>
          <Layers />
          <div>
            <span>VOCABULARY</span>
            <strong>{t('Từ mới trong bài', '수업에서 만난 단어')}</strong>
          </div>
          <span className="shortcut-count">08</span>
          <ArrowUpRight />
        </button>
        <button onClick={() => go('feedback')}>
          <BookOpen />
          <div>
            <span>FEEDBACK</span>
            <strong>
              {t('Cùng giáo viên hoàn thiện câu', '선생님과 완성하는 문장')}
            </strong>
          </div>
          <ArrowUpRight />
        </button>
      </div>
      {error && (
        <p role="alert" className="activity-error">
          {error}
        </p>
      )}
    </div>
  );
}
