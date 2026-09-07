'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  ChevronRight,
  Check,
  MessageCircle,
  ArrowLeft,
  BookOpen,
  Volume2,
  RotateCcw,
  Send,
  Plus,
  Save,
  ExternalLink,
  Clock,
  CheckCircle2,
  CircleHelp,
  Layers,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  checkpoints,
  words,
  formatTime,
  parseTime,
  type Entry,
  type Lang,
  type Checkpoint,
} from '@/lib/course';
export type Props = {
  lang: Lang;
  entries: Entry[];
  mutate: (body: any) => Promise<any>;
  busy: boolean;
  go: (view: string) => void;
};
const tr = (lang: Lang, vi: string, ko: string) => (lang === 'vi' ? vi : ko);
export const getPoints = (entries: Entry[]) => {
  const custom = entries
    .filter((e) => e.kind === 'checkpoint')
    .map((e) => e.payload as Checkpoint);
  return [
    ...checkpoints.filter((p) => !custom.some((c) => c.id === p.id)),
    ...custom,
  ].sort((a, b) => a.time - b.time);
};
export function Lesson({ lang, entries, mutate, busy, go }: Props) {
  const t = (vi: string, ko: string) => tr(lang, vi, ko);
  const video = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(-1);
  const gate = useRef(false);
  const [time, setTime] = useState(0),
    [point, setPoint] = useState<Checkpoint | null>(null),
    [selected, setSelected] = useState<number | null>(null),
    [result, setResult] = useState<'correct' | 'wrong' | null>(null),
    [error, setError] = useState(false),
    [question, setQuestion] = useState(''),
    [activeTab, setActiveTab] = useState('overview');
  const points = getPoints(entries);
  const config = entries.find((e) => e.id === 'config')?.payload || {
    videoUrl: '/lesson-cafe.mp4',
    duration: 60,
  };
  const answered = (id: string) =>
    entries.some((e) => e.id === 'attempt:' + id && e.payload.correct);
  const done = points.filter((p) => answered(p.id)).length;
  useEffect(() => {
    if (point) {
      const target = document.getElementById('active-mission');
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [point?.id]);
  function openPoint(cp: Checkpoint) {
    video.current?.pause();
    gate.current = true;
    setPoint(cp);
    setSelected(null);
    setResult(null);
  }
  function savePosition(n: number) {
    if (Math.abs(n - lastSave.current) > 4) {
      lastSave.current = n;
      mutate({
        action: 'progress',
        position: Math.min(config.duration, n),
      }).catch(() => {
        lastSave.current = -1;
      });
    }
  }
  function update() {
    const v = video.current;
    if (!v) return;
    const n = v.currentTime;
    setTime(n);
    const cp = points.find((p) => p.time <= n && !answered(p.id));
    if (cp && !gate.current) {
      v.currentTime = cp.time;
      openPoint(cp);
    }
    savePosition(n);
  }
  function seek(n: number) {
    if (!video.current) return;
    gate.current = false;
    setPoint(null);
    setResult(null);
    const first = points.find((p) => p.time <= n && !answered(p.id));
    video.current.currentTime = first ? first.time : n;
    if (first) openPoint(first);
    setTime(video.current.currentTime);
  }
  async function check() {
    if (!point || selected === null) return;
    try {
      const r = await mutate({
        action: 'attempt',
        id: point.id,
        answer: selected,
      });
      setResult(r.correct ? 'correct' : 'wrong');
    } catch {}
  }
  function resume() {
    gate.current = false;
    setPoint(null);
    setResult(null);
    if (video.current) video.current.play().catch(() => setError(true));
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    try {
      await mutate({
        action: 'question',
        body: question,
        time: Math.min(time, config.duration),
      });
      setQuestion('');
    } catch {}
  }
  return (
    <>
      <div className="breadcrumb">
        <button className="text-button" onClick={() => go('lessons')}>
          <ArrowLeft size={16} />
          {t('Lớp học của tôi', '내 수업')}
        </button>
        <span>/ Bài 04</span>
      </div>
      <div className="view-title">
        <div>
          <div className="eyebrow green">
            {t('SƠ CẤP 1 · THỰC HÀNH GIAO TIẾP', '초급 1 · 실전 회화')}
          </div>
          <h1>{t('Gọi món ở quán cà phê', '카페에서 주문하기')}</h1>
          <p>
            {t(
              'Luyện tập tại từng điểm dừng và đặt câu hỏi ngay trong video.',
              '영상 속 미션을 풀고, 이해가 안 되는 부분은 바로 질문하세요.',
            )}
          </p>
        </div>
        <span className="status-chip">
          {done}/{points.length} {t('nhiệm vụ', '미션')}
        </span>
      </div>
      <div className="learning-grid">
        <section>
          <div className="video-wrap">
            <video
              key={config.videoUrl}
              ref={video}
              src={config.videoUrl}
              poster={
                config.videoUrl === '/lesson-cafe.mp4'
                  ? '/lesson-poster.jpg'
                  : undefined
              }
              controls
              playsInline
              preload="metadata"
              aria-label={t('Video bài học', '수업 영상')}
              onTimeUpdate={update}
              onSeeking={update}
              onPlay={() => {
                if (gate.current) video.current?.pause();
              }}
              onPause={() => {
                if (video.current) savePosition(video.current.currentTime);
              }}
              onLoadedMetadata={() => {
                setError(false);
                const pos =
                  entries.find((e) => e.id === 'progress')?.payload.position ||
                  0;
                seek(Math.min(pos, config.duration));
              }}
              onError={() => setError(true)}
              onEnded={() => savePosition(config.duration)}
            />
            {error && (
              <div className="video-error" role="alert">
                <strong>
                  {t('Chưa phát được video', '영상을 재생할 수 없어요')}
                </strong>
                <p>
                  {t(
                    'Kiểm tra kết nối hoặc địa chỉ video trong chế độ giáo viên.',
                    '연결 상태 또는 선생님 화면의 영상 주소를 확인해 주세요.',
                  )}
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setError(false);
                    video.current?.load();
                  }}
                >
                  {t('Thử lại', '다시 시도')}
                </button>
              </div>
            )}
          </div>
          <div className="video-caption">
            <span>
              <span className="live-dot" />{' '}
              {config.videoUrl === '/lesson-cafe.mp4'
                ? t(
                    'Video mẫu 1 phút · Không có âm thanh',
                    '1분 예제 영상 · 음성 없음',
                  )
                : t(
                    'Video do giáo viên thiết lập',
                    '선생님이 설정한 수업 영상',
                  )}
            </span>
            <button
              className="text-button"
              onClick={() => {
                video.current?.pause();
                setActiveTab('questions');
                document.getElementById('question-box')?.focus();
              }}
            >
              <MessageCircle size={15} />
              {t('Hỏi tại', '이 시점에 질문')} {formatTime(time)}
            </button>
          </div>
          {point && (
            <div
              id="active-mission"
              tabIndex={-1}
              className="mission-card"
              role="region"
              aria-label={t('Nhiệm vụ trong video', '영상 속 미션')}
            >
              <div className="row spread">
                <span className="eyebrow green">
                  {t('ĐẾN LƯỢT BẠN', '이제 내 차례')} · {formatTime(point.time)}
                </span>
                <span className="status-chip">
                  {points.findIndex((p) => p.id === point.id) + 1}/
                  {points.length}
                </span>
              </div>
              <h2>{lang === 'vi' ? point.prompt : point.promptKo}</h2>
              <RadioGroup
                value={selected === null ? '' : String(selected)}
                onValueChange={(value) => {
                  setSelected(Number(value));
                  setResult(null);
                }}
                aria-label={t('Chọn đáp án', '정답 선택')}
                className="answer-options"
              >
                {point.options.map((o, i) => (
                  <label
                    className={
                      'answer-option ' + (selected === i ? 'chosen' : '')
                    }
                    key={o}
                  >
                    <RadioGroupItem
                      value={String(i)}
                      disabled={result === 'correct' || busy}
                    />
                    <span className="option-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span lang="ko">{o}</span>
                  </label>
                ))}
              </RadioGroup>
              {result && (
                <div className={'answer-feedback ' + result} role="status">
                  <strong>
                    {result === 'correct'
                      ? t('Đúng rồi! Bạn đã hiểu.', '맞았어요! 잘 이해했네요.')
                      : t(
                          'Thử lại nhé. Đọc gợi ý bên dưới.',
                          '다시 도전해 봐요. 아래 설명을 읽어 보세요.',
                        )}
                  </strong>
                  <p>
                    {lang === 'vi' ? point.explanation : point.explanationKo}
                  </p>
                </div>
              )}
              <div className="row mission-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    gate.current = false;
                    setPoint(null);
                    video.current!.currentTime = Math.max(0, point.time - 10);
                    video.current?.play().catch(() => {});
                  }}
                >
                  <RotateCcw size={16} />
                  {t('Xem lại 10 giây', '10초 전 다시 보기')}
                </button>
                {result === 'correct' ? (
                  <button className="primary" onClick={resume}>
                    {t('Tiếp tục bài học', '수업 계속하기')}
                    <Play size={16} />
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={selected === null || busy}
                    onClick={check}
                  >
                    {t('Kiểm tra đáp án', '정답 확인')}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
          {!point && done === points.length && (
            <div className="success-panel">
              <CheckCircle2 />
              <div>
                <strong>
                  {t(
                    'Đã hoàn thành tất cả nhiệm vụ!',
                    '모든 미션을 완료했어요!',
                  )}
                </strong>
                <p>
                  {t(
                    'Bây giờ, viết một đoạn hội thoại và gửi giáo viên.',
                    '이제 짧은 대화를 작성해 선생님께 제출해 보세요.',
                  )}
                </p>
              </div>
              <button className="primary" onClick={() => go('feedback')}>
                {t('Làm bài cuối', '마무리 과제')}
              </button>
            </div>
          )}
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(String(v));
              if (v === 'questions') {
                video.current?.pause();
                setTimeout(
                  () => document.getElementById('question-box')?.focus(),
                  0,
                );
              }
            }}
            className="lesson-tabs"
          >
            <TabsList variant="line">
              <TabsTrigger value="overview">
                {t('Nội dung bài học', '수업 내용')}
              </TabsTrigger>
              <TabsTrigger value="words">
                {t('Từ vựng trong bài', '수업 단어')}
              </TabsTrigger>
              <TabsTrigger value="questions">
                {t('Hỏi giáo viên', '선생님께 질문')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="panel lesson-summary">
                <h2>{t('Sau bài này, bạn có thể…', '이 수업을 마치면…')}</h2>
                <ul className="check-list">
                  <li>
                    <Check />
                    {t(
                      'Gọi đồ uống bằng mẫu “주세요”.',
                      '‘주세요’를 사용해 음료를 주문할 수 있어요.',
                    )}
                  </li>
                  <li>
                    <Check />
                    {t(
                      'Dùng 한 잔, 두 잔 để nói số lượng.',
                      '한 잔, 두 잔으로 수량을 말할 수 있어요.',
                    )}
                  </li>
                  <li>
                    <Check />
                    {t(
                      'Phân biệt dùng tại chỗ và mang đi.',
                      '매장 이용과 포장을 구분해 말할 수 있어요.',
                    )}
                  </li>
                </ul>
                <div className="grammar-callout">
                  <span>문장 패턴</span>
                  <strong>음료 + 수량 + 주세요.</strong>
                  <p>
                    {t(
                      'Đồ uống + số lượng + 주세요.',
                      '음료 이름과 수량을 바꿔 나만의 문장을 만들어 보세요.',
                    )}
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="words">
              <div className="panel">
                <h2>{t('8 từ giúp bạn gọi món', '주문에 필요한 단어 8개')}</h2>
                <div className="word-chips">
                  {words.map((w) => (
                    <span key={w.id}>
                      {w.ko}
                      <small>{w.vi}</small>
                    </span>
                  ))}
                </div>
                <button className="primary" onClick={() => go('vocab')}>
                  <Layers size={18} />
                  {t('Luyện ngay những từ này', '이 단어들 연습하기')}
                </button>
              </div>
            </TabsContent>
            <TabsContent value="questions">
              <div className="panel">
                <h2>
                  {t('Bạn chưa hiểu chỗ nào?', '어떤 부분이 궁금한가요?')}
                </h2>
                <p className="muted">
                  {t(
                    'Câu hỏi sẽ gắn với thời điểm video đang dừng.',
                    '질문은 현재 영상 시점과 함께 저장돼요.',
                  )}
                </p>
                <form onSubmit={ask}>
                  <label htmlFor="question-box">
                    {t('Câu hỏi của bạn', '내 질문')} · {formatTime(time)}
                  </label>
                  <textarea
                    id="question-box"
                    value={question}
                    maxLength={2000}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t(
                      'Ví dụ: Tại sao dùng 두 mà không dùng 둘?',
                      '예: 왜 ‘둘 잔’이 아니라 ‘두 잔’이라고 하나요?',
                    )}
                    required
                  />
                  <button
                    className="primary"
                    disabled={busy || !question.trim()}
                  >
                    <Send size={16} />
                    {t('Gửi câu hỏi', '질문 보내기')}
                  </button>
                </form>
                {entries
                  .filter((e) => e.kind === 'question')
                  .map((e) => (
                    <div className="question-item" key={e.id}>
                      <button
                        className="timestamp"
                        onClick={() => seek(e.payload.time)}
                      >
                        {formatTime(e.payload.time)}
                      </button>
                      <p>{e.payload.body}</p>
                      <div className="reply">
                        {e.payload.reply ||
                          t(
                            'Đang chờ giáo viên phản hồi.',
                            '선생님의 답변을 기다리고 있어요.',
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>
        <aside className="lesson-outline">
          <div className="panel">
            <div className="section-heading">
              <h2>{t('Bản đồ bài học', '수업 목차')}</h2>
              <span>{formatTime(config.duration)}</span>
            </div>
            <Progress
              aria-label={t('Tiến độ nhiệm vụ', '미션 진도')}
              value={(done / points.length) * 100}
            />
            <p className="progress-label">
              {done}/{points.length} {t('nhiệm vụ đã hiểu', '미션 이해 완료')}
            </p>
            <button className="chapter" onClick={() => seek(0)}>
              <span className="chapter-symbol">
                <Play size={15} />
              </span>
              <div>
                <strong>{t('Bắt đầu gọi món', '주문 시작하기')}</strong>
                <p>00:00 · 주세요</p>
              </div>
            </button>
            {points.map((p, i) => (
              <button
                className={'chapter ' + (point?.id === p.id ? 'active' : '')}
                key={p.id}
                onClick={() => seek(p.time)}
              >
                <span
                  className={
                    'chapter-symbol ' + (answered(p.id) ? 'complete' : '')
                  }
                >
                  {answered(p.id) ? <Check size={15} /> : i + 1}
                </span>
                <div>
                  <strong>
                    {t('Nhiệm vụ', '미션')} {i + 1}
                  </strong>
                  <p>
                    {formatTime(p.time)} ·{' '}
                    {t('Kiểm tra hiểu bài', '이해도 확인')}
                  </p>
                </div>
              </button>
            ))}
            <button className="chapter" onClick={() => go('feedback')}>
              <span className="chapter-symbol">
                <Send size={15} />
              </span>
              <div>
                <strong>{t('Hội thoại của bạn', '나만의 주문 대화')}</strong>
                <p>{t('Giáo viên nhận xét', '선생님 피드백')}</p>
              </div>
            </button>
          </div>
          <div className="gentle-note">
            <CircleHelp size={22} />
            <strong>
              {t('Không cần đúng ngay lần đầu.', '처음부터 맞힐 필요 없어요.')}
            </strong>
            <p>
              {t(
                'Bạn có thể xem lại và thử lại. Mỗi lần thử là một lần hiểu hơn.',
                '다시 보고 다시 도전할 수 있어요. 시도할 때마다 조금 더 이해하게 돼요.',
              )}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function speak(text: string, lang: Lang, setNotice: (s: string) => void) {
  if (!('speechSynthesis' in window)) {
    setNotice(
      tr(
        lang,
        'Trình duyệt chưa hỗ trợ đọc từ.',
        '이 브라우저는 음성 읽기를 지원하지 않아요.',
      ),
    );
    return;
  }
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.startsWith('ko'));
  if (!voice) {
    setNotice(
      tr(
        lang,
        'Chưa có giọng tiếng Hàn trên thiết bị này.',
        '이 기기에 한국어 음성이 설치되어 있지 않아요.',
      ),
    );
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.voice = voice;
  u.rate = 0.8;
  u.onerror = () =>
    setNotice(
      tr(lang, 'Không phát được âm thanh.', '음성을 재생할 수 없어요.'),
    );
  window.speechSynthesis.speak(u);
}
export function Vocab({ lang, entries, mutate, busy }: Props) {
  const t = (vi: string, ko: string) => tr(lang, vi, ko);
  const [mode, setMode] = useState('cards'),
    [index, setIndex] = useState(0),
    [flipped, setFlipped] = useState(false),
    [input, setInput] = useState(''),
    [quizResult, setQuizResult] = useState<boolean | null>(null),
    [notice, setNotice] = useState(''),
    [filter, setFilter] = useState<'all' | 'weak'>('all'),
    [queue, setQueue] = useState(words),
    [ended, setEnded] = useState(false),
    [score, setScore] = useState(0);
  const due = words.filter((w) => {
    const r = entries.find((e) => e.id === 'vocab:' + w.id)?.payload;
    return !r || !r.known || new Date(r.due).getTime() <= Date.now();
  });
  const w = queue[index];
  const weak = words.filter((x) =>
    entries.some((e) => e.id === 'vocab:' + x.id && !e.payload.known),
  );
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);
  function start(selected: typeof words, m = mode) {
    setQueue(selected);
    setMode(m);
    setIndex(0);
    setFlipped(false);
    setInput('');
    setQuizResult(null);
    setEnded(false);
    setScore(0);
  }
  function next() {
    setInput('');
    setQuizResult(null);
    setFlipped(false);
    if (index + 1 >= queue.length) setEnded(true);
    else setIndex(index + 1);
  }
  async function rate(known: boolean) {
    try {
      await mutate({ action: 'vocab', id: w.id, known });
      next();
    } catch {}
  }
  async function answer(e: React.FormEvent) {
    e.preventDefault();
    const normalize = (s: string) =>
      s
        .normalize('NFC')
        .replace(/[\s.?!]/g, '')
        .toLowerCase();
    const correct = normalize(input) === normalize(w.ko);
    try {
      await mutate({ action: 'vocab', id: w.id, known: correct });
      setQuizResult(correct);
      if (correct) setScore((x) => x + 1);
    } catch {}
  }
  return (
    <>
      <div className="view-title">
        <div>
          <div className="eyebrow green">KROSS VOCAB · BÀI 04</div>
          <h1>{t('Sổ từ vựng của tôi', '나의 단어장')}</h1>
          <p>
            {t(
              'Ôn lại 8 từ vừa gặp trong bài học về quán cà phê.',
              '카페 수업에서 만난 8개 단어를 복습해요.',
            )}
          </p>
        </div>
        <a
          className="secondary"
          href="https://studyinkross-hub.github.io/kross/"
          target="_blank"
          rel="noreferrer"
        >
          {t('Mở công cụ gốc', '기존 단어 도구')}
          <ExternalLink size={15} />
        </a>
      </div>
      <div className="vocab-stats">
        <div>
          <strong>08</strong>
          <span>{t('Từ trong bài', '수업 단어')}</span>
        </div>
        <div>
          <strong>
            {words
              .filter((w) =>
                entries.some(
                  (e) => e.id === 'vocab:' + w.id && e.payload.known,
                ),
              )
              .length.toString()
              .padStart(2, '0')}
          </strong>
          <span>{t('Đã nhớ', '기억한 단어')}</span>
        </div>
        <div>
          <strong>{weak.length.toString().padStart(2, '0')}</strong>
          <span>{t('Cần ôn lại', '다시 볼 단어')}</span>
        </div>
      </div>
      <div className="row spread review-line">
        <p className="fineprint">
          {t('Lịch ôn hôm nay: ', '오늘 복습할 단어: ')}
          {due.length} / 8
        </p>
        <button
          className="secondary"
          disabled={due.length === 0}
          onClick={() => {
            setFilter('all');
            start(due, 'cards');
          }}
        >
          {t('Ôn theo lịch', '복습 일정대로 학습')}
        </button>
      </div>
      <Tabs
        value={mode}
        onValueChange={(v) =>
          start(filter === 'weak' ? weak : words, String(v))
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="cards">
            {t('Thẻ từ vựng', '단어 카드')}
          </TabsTrigger>
          <TabsTrigger value="quiz">
            {t('Tự kiểm tra', '직접 입력 퀴즈')}
          </TabsTrigger>
          <TabsTrigger value="weak">
            {t('Sổ từ khó', '어려운 단어장')} ({weak.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cards">
          <div className="study-center">
            {queue.length === 0 ? (
              <div className="empty-panel">
                {t('Không có từ nào cần ôn lại.', '다시 볼 단어가 없어요.')}
                <button
                  className="primary"
                  onClick={() => {
                    setFilter('all');
                    start(words);
                  }}
                >
                  {t('Học tất cả từ', '모든 단어 학습')}
                </button>
              </div>
            ) : ended ? (
              <div className="completion-card">
                <CheckCircle2 size={46} />
                <h2>
                  {t(
                    'Một vòng ôn tập, thêm một bước tiến.',
                    '한 바퀴 복습, 한 걸음 성장.',
                  )}
                </h2>
                <p>
                  {t(
                    'Các từ khó sẽ được ưu tiên ở lần ôn tiếp theo.',
                    '어려운 단어를 다음 복습에서 먼저 연습해 보세요.',
                  )}
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setFilter('all');
                    start(words, 'quiz');
                  }}
                >
                  {t('Thử kiểm tra', '퀴즈 도전')}
                </button>
              </div>
            ) : (
              <>
                <div className="row spread">
                  <span>
                    {filter === 'weak'
                      ? t('Từ cần ôn', '복습 단어')
                      : t('Toàn bộ từ trong bài', '수업 전체 단어')}
                  </span>
                  <span className="muted">
                    {index + 1} / {queue.length}
                  </span>
                </div>
                <Progress
                  aria-label={t('Tiến độ thẻ', '단어 카드 진도')}
                  value={(index / queue.length) * 100}
                />
                <button
                  className={'flashcard ' + (flipped ? 'flipped' : '')}
                  onClick={() => setFlipped(!flipped)}
                  aria-label={t('Lật thẻ từ vựng', '단어 카드 뒤집기')}
                >
                  <span className="eyebrow">
                    {flipped ? 'TIẾNG VIỆT' : '한국어'}
                  </span>
                  <strong lang={flipped ? 'vi' : 'ko'}>
                    {flipped ? w.vi : w.ko}
                  </strong>
                  <span className="flash-example" lang="ko">
                    {w.example}
                  </span>
                  {flipped && <p>{w.meaning}</p>}
                  <small>
                    <RotateCcw size={15} />
                    {t('Chạm để lật thẻ', '눌러서 뒤집기')}
                  </small>
                </button>
                <div className="row centered">
                  <button
                    className="text-button"
                    onClick={() => speak(w.ko, lang, setNotice)}
                  >
                    <Volume2 size={18} />
                    {t('Nghe phát âm', '발음 듣기')}
                  </button>
                </div>
                <div className="card-actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => rate(false)}
                  >
                    <RotateCcw size={17} />
                    {t('Cần ôn lại', '다시 볼게요')}
                  </button>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => rate(true)}
                  >
                    <Check size={18} />
                    {t('Mình nhớ rồi', '기억했어요')}
                  </button>
                </div>
                <p className="fineprint">
                  {t(
                    'Từ đã nhớ sẽ được hẹn ôn sau 1, 3, 7 rồi 14 ngày.',
                    '기억한 단어는 1일, 3일, 7일, 14일 뒤 복습하도록 기록해요.',
                  )}
                </p>
              </>
            )}
          </div>
        </TabsContent>
        <TabsContent value="quiz">
          <div className="study-center">
            {!w || ended ? (
              <div className="completion-card">
                <CheckCircle2 size={42} />
                <h2>
                  {score}/{queue.length} {t('câu chính xác', '문항 정답')}
                </h2>
                <p>
                  {t(
                    'Từ trả lời sai đã được thêm vào sổ từ khó.',
                    '틀린 단어는 어려운 단어장에 기록했어요.',
                  )}
                </p>
                <button
                  className="primary"
                  onClick={() => start(words, 'quiz')}
                >
                  {t('Thử lại', '다시 도전')}
                </button>
              </div>
            ) : (
              <form className="panel quiz-panel" onSubmit={answer}>
                <span className="eyebrow">
                  {t('VIẾT BẰNG TIẾNG HÀN', '한국어로 써 보세요')} · {index + 1}
                  /{queue.length}
                </span>
                <h2>{w.vi}</h2>
                <label htmlFor="vocab-answer">
                  {t('Từ tiếng Hàn', '한국어 단어')}
                </label>
                <input
                  id="vocab-answer"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoComplete="off"
                  required
                  maxLength={100}
                  readOnly={quizResult !== null}
                  placeholder={t(
                    'Nhập từ tiếng Hàn…',
                    '한국어 단어를 입력하세요…',
                  )}
                />
                {quizResult !== null ? (
                  <>
                    <div
                      className={
                        'answer-feedback ' + (quizResult ? 'correct' : 'wrong')
                      }
                      role="status"
                    >
                      <strong>
                        {quizResult
                          ? t('Chính xác!', '정확해요!')
                          : t('Cùng ghi nhớ lại nhé.', '다시 기억해 봐요.')}
                      </strong>
                      <p>
                        {w.ko} — {w.vi}
                      </p>
                    </div>
                    <button type="button" className="primary" onClick={next}>
                      {t('Từ tiếp theo', '다음 단어')}
                      <ChevronRight size={16} />
                    </button>
                  </>
                ) : (
                  <button className="primary" disabled={busy || !input.trim()}>
                    {t('Kiểm tra', '정답 확인')}
                  </button>
                )}
              </form>
            )}
          </div>
        </TabsContent>
        <TabsContent value="weak">
          <div className="panel">
            <div className="section-heading">
              <h2>
                {t(
                  'Chậm một chút cũng không sao.',
                  '조금 천천히 익혀도 괜찮아요.',
                )}
              </h2>
              {weak.length > 0 && (
                <button
                  className="primary"
                  onClick={() => {
                    setFilter('weak');
                    start(weak, 'cards');
                  }}
                >
                  {t('Ôn từ khó', '어려운 단어 복습')}
                </button>
              )}
            </div>
            {weak.length === 0 ? (
              <div className="empty-panel">
                <CheckCircle2 />
                <p>
                  {t(
                    'Chưa có từ khó. Hãy thử một vòng kiểm tra!',
                    '아직 어려운 단어가 없어요. 퀴즈로 확인해 보세요!',
                  )}
                </p>
                <button
                  className="secondary"
                  onClick={() => start(words, 'quiz')}
                >
                  {t('Tự kiểm tra', '퀴즈 시작')}
                </button>
              </div>
            ) : (
              weak.map((w) => (
                <div className="word-row" key={w.id}>
                  <strong>{w.ko}</strong>
                  <span>{w.vi}</span>
                  <button
                    className="text-button"
                    aria-label={t('Nghe ', '발음 듣기 ') + w.ko}
                    onClick={() => speak(w.ko, lang, setNotice)}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      {notice && (
        <div className="inline-notice" role="status">
          {notice}
          <button className="text-button" onClick={() => setNotice('')}>
            {t('Đóng', '닫기')}
          </button>
        </div>
      )}
    </>
  );
}
export function Feedback({ lang, entries, mutate, busy, go }: Props) {
  const t = (vi: string, ko: string) => tr(lang, vi, ko);
  const assignment = entries.find((e) => e.id === 'assignment')?.payload;
  const [body, setBody] = useState(assignment?.body || '');
  useEffect(() => {
    const draft = sessionStorage.getItem('kross-assignment-draft');
    if (draft) setBody(draft);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutate({ action: 'submit', body });
      sessionStorage.removeItem('kross-assignment-draft');
    } catch {}
  }
  return (
    <>
      <div className="view-title">
        <div>
          <div className="eyebrow green">
            {t('THỰC HÀNH & PHẢN HỒI', '연습과 피드백')}
          </div>
          <h1>{t('Bài tập & nhận xét', '과제와 피드백')}</h1>
          <p>
            {t(
              'Viết thử, nhận góp ý và làm tốt hơn ở lần tiếp theo.',
              '직접 써 보고, 피드백을 받고, 한 번 더 완성해 보세요.',
            )}
          </p>
        </div>
      </div>
      <div className="feedback-grid">
        <section className="panel">
          <span className="status-chip">
            {t('Bài cuối · Bài 04', '마무리 과제 · 04강')}
          </span>
          <h2 className="mt">
            {t('Bạn sẽ gọi món như thế nào?', '어떻게 주문할까요?')}
          </h2>
          <p>
            {t(
              'Viết 2–3 câu bằng tiếng Hàn: gọi hai ly cà phê, hỏi giá và yêu cầu mang đi.',
              '한국어로 2~3문장을 써 보세요. 커피 두 잔을 주문하고, 가격을 묻고, 포장을 요청해요.',
            )}
          </p>
          <div className="grammar-callout">
            <span>{t('GỢI Ý', '도움 표현')}</span>
            <strong>두 잔 · 얼마예요? · 포장</strong>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="assignment-body">
              {t('Đoạn hội thoại của bạn', '나의 주문 대화')}
            </label>
            <textarea
              id="assignment-body"
              rows={5}
              maxLength={2000}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                sessionStorage.setItem(
                  'kross-assignment-draft',
                  e.target.value,
                );
              }}
              placeholder="안녕하세요. …"
              required
            />
            <div className="row spread">
              <span className="fineprint">{body.length}/2000</span>
              <button
                className="primary"
                disabled={busy || !body.trim() || !/[가-힣]/.test(body)}
              >
                <Send size={16} />
                {assignment
                  ? t('Gửi bản sửa', '수정해서 다시 제출')
                  : t('Gửi giáo viên', '선생님께 제출')}
              </button>
            </div>
          </form>
        </section>
        <aside>
          <div className="panel">
            <h2>{t('Phản hồi của giáo viên', '선생님의 피드백')}</h2>
            {!assignment ? (
              <div className="empty-panel">
                <MessageCircle />
                <p>
                  {t(
                    'Gửi bài để bắt đầu trao đổi với giáo viên.',
                    '과제를 제출하면 선생님과 피드백을 주고받을 수 있어요.',
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className={'assignment-status ' + assignment.status}>
                  <CheckCircle2 size={20} />
                  {assignment.status === 'approved'
                    ? t('Đã hoàn thành', '과제 완료')
                    : assignment.status === 'revise'
                      ? t('Hãy sửa lại theo góp ý', '피드백을 보고 수정해요')
                      : t('Đã gửi · Đang chờ góp ý', '제출 완료 · 피드백 대기')}
                </div>
                <p className="fineprint">
                  {t('Lần nộp', '제출 횟수')} {assignment.revision}
                </p>
                <blockquote>
                  {assignment.feedback ||
                    t(
                      'Giáo viên sẽ xem và góp ý cho câu của bạn.',
                      '선생님이 문장을 확인하고 피드백을 남겨 줄 거예요.',
                    )}
                </blockquote>
              </>
            )}
            <p className="fineprint">
              {t(
                'Bản trải nghiệm: chuyển sang chế độ giáo viên để thử phản hồi cho bài này.',
                '체험판: 선생님 모드로 전환해 이 과제에 피드백을 남겨 보세요.',
              )}
            </p>
            <button className="text-button" onClick={() => go('teacher')}>
              {t('Thử vai trò giáo viên', '선생님 역할 체험')}
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="gentle-note">
            <BookOpen />
            <strong>
              {t('Cần xem lại một chút?', '조금 더 복습하고 싶나요?')}
            </strong>
            <button className="text-button" onClick={() => go('lesson')}>
              {t('Quay lại bài học', '수업으로 돌아가기')}
              <ChevronRight size={16} />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Teacher({ lang, entries, mutate, busy, go }: Props) {
  const t = (vi: string, ko: string) => tr(lang, vi, ko);
  const points = getPoints(entries),
    assignment = entries.find((e) => e.id === 'assignment')?.payload,
    config = entries.find((e) => e.id === 'config')?.payload || {
      videoUrl: '/lesson-cafe.mp4',
      duration: 60,
    };
  const teacherVideo = useRef<HTMLVideoElement>(null);
  const [teacherTime, setTeacherTime] = useState(0),
    [editTimes, setEditTimes] = useState<Record<string, string>>({}),
    [teacherVideoError, setTeacherVideoError] = useState(false);
  const [tab, setTab] = useState('inbox'),
    [feedback, setFeedback] = useState(''),
    [reply, setReply] = useState<Record<string, string>>({}),
    [videoUrl, setVideoUrl] = useState(config.videoUrl),
    [duration, setDuration] = useState(formatTime(config.duration)),
    [cpTime, setCpTime] = useState('00:40'),
    [prompt, setPrompt] = useState(''),
    [options, setOptions] = useState(['', '', '']),
    [answer, setAnswer] = useState('0'),
    [explanation, setExplanation] = useState(''),
    [saved, setSaved] = useState('');
  const pending =
    (assignment?.status === 'submitted' ? 1 : 0) +
    entries.filter((e) => e.kind === 'question' && !e.payload.reply).length;
  async function review(status: string) {
    try {
      await mutate({ action: 'feedback', body: feedback, status });
      setFeedback('');
      setSaved(
        t(
          'Đã lưu phản hồi cho học viên.',
          '학생에게 보여 줄 피드백을 저장했어요.',
        ),
      );
    } catch {}
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutate({
        action: 'checkpoint',
        time: parseTime(cpTime),
        prompt,
        options,
        answer: Number(answer),
        explanation,
      });
      setPrompt('');
      setOptions(['', '', '']);
      setExplanation('');
      setSaved(
        t(
          'Đã thêm nhiệm vụ. Mở bài học để kiểm tra.',
          '미션을 추가했어요. 학생 수업에서 확인해 보세요.',
        ),
      );
    } catch {}
  }
  return (
    <>
      <div className="view-title">
        <div>
          <div className="eyebrow green">KROSS TEACHING STUDIO</div>
          <h1>{t('Quản lý bài học', '수업 관리')}</h1>
          <p>
            {t(
              'Thêm nhiệm vụ đúng thời điểm. Theo sát điều học viên đã hiểu.',
              '알맞은 시점에 미션을 넣고, 학생이 이해한 내용을 확인하세요.',
            )}
          </p>
        </div>
        <button className="secondary" onClick={() => go('lesson')}>
          <Play size={17} />
          {t('Xem như học viên', '학생 화면 보기')}
        </button>
      </div>
      <div className="demo-explanation">
        {t(
          'Đang thử vai trò giáo viên trong cùng một lớp mẫu. Dữ liệu được lưu cho phiên trình duyệt này; chưa phải tài khoản giáo viên thực.',
          '같은 예제 반의 선생님 역할을 체험하고 있어요. 데이터는 이 브라우저 세션별로 저장되며 실제 교사 계정은 아닙니다.',
        )}
      </div>
      <div className="vocab-stats">
        <div>
          <strong>01</strong>
          <span>{t('Học viên mẫu', '체험 학생')}</span>
        </div>
        <div>
          <strong>{pending.toString().padStart(2, '0')}</strong>
          <span>{t('Cần phản hồi', '피드백 대기')}</span>
        </div>
        <div>
          <strong>
            {
              points.filter((p) =>
                entries.some(
                  (e) => e.id === 'attempt:' + p.id && e.payload.correct,
                ),
              ).length
            }
            /{points.length}
          </strong>
          <span>{t('Nhiệm vụ đã hiểu', '이해 완료 미션')}</span>
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="line">
          <TabsTrigger value="inbox">
            {t('Bài nộp & câu hỏi', '제출물과 질문')} ({pending})
          </TabsTrigger>
          <TabsTrigger value="editor">
            {t('Thiết kế bài học', '수업 만들기')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <div className="feedback-grid">
            <section className="panel">
              <div className="section-heading">
                <h2>{t('Bài viết của Minh Anh', 'Minh Anh의 작문')}</h2>
                <span className="status-chip">Bài 04</span>
              </div>
              {!assignment ? (
                <div className="empty-panel">
                  <Send />
                  <p>
                    {t(
                      'Chưa có bài nộp. Hãy thử gửi bài từ vai trò học viên.',
                      '아직 제출물이 없어요. 학생 역할에서 과제를 제출해 보세요.',
                    )}
                  </p>
                  <button className="secondary" onClick={() => go('feedback')}>
                    {t('Thử nộp bài', '과제 제출 체험')}
                  </button>
                </div>
              ) : (
                <>
                  <blockquote lang="ko">{assignment.body}</blockquote>
                  <p className="fineprint">
                    {t('Lần nộp', '제출 횟수')} {assignment.revision} ·{' '}
                    {assignment.status === 'submitted'
                      ? t('Chờ nhận xét', '피드백 대기')
                      : assignment.status === 'approved'
                        ? t('Đã hoàn thành', '완료')
                        : t('Đã yêu cầu sửa', '수정 요청됨')}
                  </p>
                  {assignment.feedback && (
                    <div className="reply">{assignment.feedback}</div>
                  )}
                  <label htmlFor="teacher-feedback">
                    {t('Góp ý cụ thể cho học viên', '학생에게 구체적인 피드백')}
                  </label>
                  <textarea
                    id="teacher-feedback"
                    maxLength={2000}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={t(
                      'Điểm làm tốt, câu cần sửa và một gợi ý nhỏ…',
                      '잘한 점, 고칠 문장, 다음 시도를 위한 짧은 힌트…',
                    )}
                  />
                  <div className="row wrap">
                    <button
                      className="secondary"
                      disabled={busy || !feedback.trim()}
                      onClick={() => review('revise')}
                    >
                      {t('Yêu cầu sửa lại', '수정 요청')}
                    </button>
                    <button
                      className="primary"
                      disabled={busy || !feedback.trim()}
                      onClick={() => review('approved')}
                    >
                      <Check size={16} />
                      {t('Xác nhận hoàn thành', '완료 확인')}
                    </button>
                  </div>
                </>
              )}
            </section>
            <aside className="panel">
              <h2>{t('Câu hỏi theo thời điểm', '시점별 학생 질문')}</h2>
              {entries.filter((e) => e.kind === 'question').length === 0 ? (
                <div className="empty-panel">
                  <MessageCircle />
                  <p>
                    {t(
                      'Các câu hỏi trong video sẽ xuất hiện ở đây.',
                      '영상에서 보낸 질문이 여기에 표시돼요.',
                    )}
                  </p>
                </div>
              ) : (
                entries
                  .filter((e) => e.kind === 'question')
                  .map((e) => (
                    <form
                      className="question-item"
                      key={e.id}
                      onSubmit={async (ev) => {
                        ev.preventDefault();
                        try {
                          await mutate({
                            action: 'reply',
                            id: e.id,
                            body: reply[e.id],
                          });
                          setReply({ ...reply, [e.id]: '' });
                        } catch {}
                      }}
                    >
                      <span className="timestamp">
                        {formatTime(e.payload.time)}
                      </span>
                      <p>{e.payload.body}</p>
                      {e.payload.reply && (
                        <div className="reply">{e.payload.reply}</div>
                      )}
                      <label htmlFor={e.id}>{t('Trả lời', '답변')}</label>
                      <textarea
                        id={e.id}
                        maxLength={2000}
                        value={reply[e.id] || ''}
                        onChange={(v) =>
                          setReply({ ...reply, [e.id]: v.target.value })
                        }
                        required
                      />
                      <button
                        className="primary"
                        disabled={busy || !reply[e.id]?.trim()}
                      >
                        {t('Lưu câu trả lời', '답변 저장')}
                      </button>
                    </form>
                  ))
              )}
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="editor">
          <div className="teacher-player panel">
            <div className="section-heading">
              <div>
                <h2>
                  {t(
                    'Chọn đúng khoảnh khắc để thực hành',
                    '연습할 순간을 직접 고르세요',
                  )}
                </h2>
                <p className="fineprint">
                  {t(
                    'Video dài một giờ cũng được. Tua video rồi dùng vị trí hiện tại, hoặc nhập phút:giây / giờ:phút:giây.',
                    '1시간 수업도 지원합니다. 영상을 이동한 뒤 현재 위치를 사용하거나 분:초 / 시:분:초를 입력하세요.',
                  )}
                </p>
              </div>
              <span className="status-chip">
                {formatTime(teacherTime)} / {formatTime(config.duration)}
              </span>
            </div>
            <video
              ref={teacherVideo}
              src={config.videoUrl}
              controls
              playsInline
              preload="metadata"
              poster={
                config.videoUrl === '/lesson-cafe.mp4'
                  ? '/lesson-poster.jpg'
                  : undefined
              }
              aria-label={t('Video thiết kế bài học', '미션 시점 설정용 영상')}
              onTimeUpdate={() =>
                setTeacherTime(teacherVideo.current?.currentTime || 0)
              }
              onLoadedMetadata={() => setTeacherVideoError(false)}
              onError={() => setTeacherVideoError(true)}
            />
            {teacherVideoError && (
              <p role="alert">
                {t(
                  'Không tải được video. Kiểm tra liên kết bên dưới.',
                  '영상을 불러오지 못했어요. 아래 주소를 확인하세요.',
                )}
              </p>
            )}
            <div
              className="teacher-timeline"
              aria-label={t('Các điểm dừng trong video', '영상 정지 시점')}
            >
              {points.map((p, i) => (
                <button
                  key={p.id}
                  className="timeline-marker"
                  style={{
                    left: Math.min(98, (p.time / config.duration) * 100) + '%',
                  }}
                  aria-label={
                    t('Xem nhiệm vụ ', '미션 보기 ') +
                    (i + 1) +
                    ' · ' +
                    formatTime(p.time)
                  }
                  title={formatTime(p.time)}
                  onClick={() => {
                    if (teacherVideo.current) {
                      teacherVideo.current.currentTime = p.time;
                      teacherVideo.current.pause();
                    }
                    setTeacherTime(p.time);
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="row spread">
              <div className="row">
                <label htmlFor="teacher-jump" className="fineprint">
                  {t('Đến thời điểm', '시점 이동')}
                </label>
                <input
                  id="teacher-jump"
                  aria-label={t('Đến thời điểm', '시점 이동')}
                  placeholder="12:30"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const n = parseTime(e.currentTarget.value);
                      if (
                        Number.isFinite(n) &&
                        n >= 0 &&
                        n <= config.duration &&
                        teacherVideo.current
                      ) {
                        teacherVideo.current.currentTime = n;
                        teacherVideo.current.pause();
                        setTeacherTime(n);
                      }
                    }
                  }}
                />
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(
                      'teacher-jump',
                    ) as HTMLInputElement;
                    const n = parseTime(el.value);
                    if (
                      Number.isFinite(n) &&
                      n >= 0 &&
                      n <= config.duration &&
                      teacherVideo.current
                    ) {
                      teacherVideo.current.currentTime = n;
                      teacherVideo.current.pause();
                      setTeacherTime(n);
                    } else
                      setSaved(
                        t(
                          'Nhập thời điểm trong thời lượng video.',
                          '영상 길이 안의 시점을 입력하세요.',
                        ),
                      );
                  }}
                >
                  {t('Đến', '이동')}
                </button>
              </div>
              <button
                className="primary"
                onClick={() => {
                  teacherVideo.current?.pause();
                  setCpTime(
                    formatTime(
                      Math.floor(
                        teacherVideo.current?.currentTime || teacherTime,
                      ),
                    ),
                  );
                  document.getElementById('cp-prompt')?.focus();
                }}
              >
                <Plus size={17} />
                {t('Thêm nhiệm vụ tại đây', '현재 위치에 미션 추가')}
              </button>
            </div>
          </div>
          <div className="feedback-grid">
            <section>
              <form
                className="panel"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await mutate({
                      action: 'config',
                      videoUrl,
                      duration: parseTime(duration),
                    });
                    setSaved(
                      t(
                        'Đã lưu video. Tiến độ xem và đáp án đã được đặt lại.',
                        '영상을 저장했어요. 영상 진도와 미션 답안을 초기화했어요.',
                      ),
                    );
                  } catch {}
                }}
              >
                <h2>{t('1. Chuẩn bị video', '1. 수업 영상 준비')}</h2>
                <p className="muted">
                  {t(
                    'Dùng liên kết HTTPS trực tiếp đến MP4/WebM. Video mẫu không có âm thanh.',
                    'MP4/WebM 파일의 HTTPS 직접 주소를 사용하세요. 예제 영상에는 음성이 없습니다.',
                  )}
                </p>
                <label htmlFor="video-url">
                  {t('Địa chỉ video', '영상 주소')}
                </label>
                <input
                  id="video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  required
                  maxLength={2000}
                />
                <label htmlFor="video-duration">
                  {t(
                    'Thời lượng · phút:giây hoặc giờ:phút:giây',
                    '영상 길이 · 분:초 또는 시:분:초',
                  )}
                </label>
                <input
                  id="video-duration"
                  type="text"
                  inputMode="text"
                  placeholder="01:00:00"
                  pattern="[0-9]+(:[0-9]{1,2}){0,2}"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
                <p className="fineprint">
                  {t(
                    'Đổi video sẽ đặt lại tiến độ xem và đáp án. Giữ các nhiệm vụ: hãy kiểm tra nội dung phù hợp với video mới.',
                    '영상을 바꾸면 시청 진도와 답안이 초기화됩니다. 기존 미션은 유지되므로 새 영상 내용과 맞는지 확인하세요.',
                  )}
                </p>
                <button className="primary" disabled={busy}>
                  <Save size={16} />
                  {t('Lưu video', '영상 저장')}
                </button>
              </form>
              <form className="panel mt" onSubmit={add}>
                <h2>
                  {t('2. Thêm một điểm thực hành', '2. 연습할 시점 추가')}
                </h2>
                <label htmlFor="cp-time">
                  {t(
                    'Điểm dừng · phút:giây hoặc giờ:phút:giây',
                    '멈출 시점 · 분:초 또는 시:분:초',
                  )}
                </label>
                <input
                  id="cp-time"
                  type="text"
                  placeholder="12:30"
                  pattern="[0-9]+(:[0-9]{1,2}){0,2}"
                  value={cpTime}
                  onChange={(e) => setCpTime(e.target.value)}
                  required
                />
                <p className="fineprint">
                  {t('Các thời điểm đã dùng', '이미 사용한 시점')}:{' '}
                  {points.map((p) => formatTime(p.time)).join(', ')}
                </p>
                <label htmlFor="cp-prompt">
                  {t(
                    'Câu hỏi (ngôn ngữ của học viên)',
                    '질문 (학생이 이해하는 언어로)',
                  )}
                </label>
                <input
                  id="cp-prompt"
                  maxLength={300}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                  placeholder={t(
                    'Ví dụ: 물 có nghĩa là gì?',
                    '예: 물은 베트남어로 무엇인가요?',
                  )}
                />
                <label>
                  {t(
                    '3 lựa chọn · Chọn đáp án đúng',
                    '선택지 3개 · 정답을 선택하세요',
                  )}
                </label>
                <RadioGroup
                  value={answer}
                  onValueChange={(v) => setAnswer(String(v))}
                  aria-label={t('Đáp án đúng', '미션 정답')}
                >
                  {options.map((o, i) => (
                    <div className="row" key={i}>
                      <RadioGroupItem
                        value={String(i)}
                        aria-label={
                          t('Đáp án đúng ', '정답 ') +
                          String.fromCharCode(65 + i)
                        }
                      />
                      <input
                        aria-label={
                          t('Lựa chọn ', '선택지 ') +
                          String.fromCharCode(65 + i)
                        }
                        value={o}
                        onChange={(e) =>
                          setOptions(
                            options.map((v, j) =>
                              i === j ? e.target.value : v,
                            ),
                          )
                        }
                        required
                        maxLength={200}
                      />
                    </div>
                  ))}
                </RadioGroup>
                <label htmlFor="cp-explanation">
                  {t('Giải thích sau khi trả lời', '답변 후 보여 줄 설명')}
                </label>
                <textarea
                  id="cp-explanation"
                  value={explanation}
                  maxLength={1000}
                  onChange={(e) => setExplanation(e.target.value)}
                  required
                />
                <button className="primary" disabled={busy}>
                  <Plus size={17} />
                  {t('Thêm vào bài học', '수업에 미션 추가')}
                </button>
              </form>
            </section>
            <aside className="panel editor-preview">
              <span className="eyebrow green">
                {t('CẤU TRÚC BÀI HỌC', '수업 구성')}
              </span>
              <h2>{t('Gọi món ở quán cà phê', '카페에서 주문하기')}</h2>
              <p className="muted">
                {formatTime(config.duration)} · {points.length}{' '}
                {t('nhiệm vụ', '미션')}
              </p>
              {points.map((p, i) => (
                <div className="editor-point" key={p.id}>
                  <span className="timestamp">{formatTime(p.time)}</span>
                  <strong>
                    {i + 1}. {lang === 'vi' ? p.prompt : p.promptKo}
                  </strong>
                  <p>
                    {t('Đáp án', '정답')}: {p.options[p.answer]}
                  </p>
                  <div className="row">
                    <input
                      aria-label={
                        t('Thời điểm nhiệm vụ ', '미션 시점 ') + (i + 1)
                      }
                      value={editTimes[p.id] ?? formatTime(p.time)}
                      onChange={(e) =>
                        setEditTimes({ ...editTimes, [p.id]: e.target.value })
                      }
                    />
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          await mutate({
                            action: 'moveCheckpoint',
                            id: p.id,
                            time: parseTime(
                              editTimes[p.id] ?? formatTime(p.time),
                            ),
                          });
                          setSaved(
                            t(
                              'Đã đổi điểm dừng. Học viên sẽ làm lại nhiệm vụ này.',
                              '정지 시점을 변경했어요. 학생은 이 미션을 다시 풀게 됩니다.',
                            ),
                          );
                        } catch {}
                      }}
                    >
                      {t('Đổi giờ', '시점 변경')}
                    </button>
                  </div>
                </div>
              ))}
              <button className="secondary" onClick={() => go('lesson')}>
                <Play size={16} />
                {t('Thử bài học', '수업 직접 체험')}
              </button>
            </aside>
          </div>
        </TabsContent>
      </Tabs>
      {saved && (
        <div className="inline-notice" role="status">
          <CheckCircle2 size={18} />
          {saved}
          <button className="text-button" onClick={() => setSaved('')}>
            {t('Đóng', '닫기')}
          </button>
        </div>
      )}
    </>
  );
}
