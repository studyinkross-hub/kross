'use client';
import { DesignPicker, LearningHome } from './designs';
import { StudioHome } from './studio-home';
import './interactive.css';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Play,
  ArrowUpRight,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Layers,
  ChevronRight,
  Clock,
  Sparkles,
  Check,
  CheckCircle2,
  Settings2,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import {
  Lesson,
  Vocab,
  Feedback,
  Teacher,
  getPoints,
  type Props,
} from './learning';
import { words, formatTime, type Entry, type Lang } from '@/lib/course';
const viewNames: Record<string, [string, string]> = {
  home: ['Góc học tập', '학습 홈'],
  lessons: ['Lớp học của tôi', '내 수업'],
  lesson: ['Lớp học của tôi', '내 수업'],
  vocab: ['Luyện từ vựng', '단어 연습'],
  feedback: ['Trao đổi với giáo viên', '과제와 피드백'],
  teacher: ['Không gian giáo viên', '선생님 공간'],
};
const icons = [LayoutDashboard, BookOpen, Layers, MessageCircle];
function SidebarNav({
  lang,
  view,
  go,
}: {
  lang: Lang;
  view: string;
  go: (v: string) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {['home', 'lessons', 'vocab', 'feedback'].map((v, i) => {
        const Icon = icons[i];
        return (
          <SidebarMenuItem key={v}>
            <SidebarMenuButton
              className="nav-button"
              isActive={view === v || (v === 'lessons' && view === 'lesson')}
              onClick={() => {
                setOpenMobile(false);
                go(v);
              }}
            >
              <Icon size={20} />
              <span>{viewNames[v][lang === 'vi' ? 0 : 1]}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
function RoleSwitch({
  view,
  go,
  lang,
}: {
  view: string;
  go: (v: string) => void;
  lang: Lang;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <button
      className={'teacher-toggle ' + (view === 'teacher' ? 'active' : '')}
      onClick={() => {
        setOpenMobile(false);
        go(view === 'teacher' ? 'home' : 'teacher');
      }}
    >
      <Settings2 size={17} />
      {view === 'teacher'
        ? lang === 'vi'
          ? 'Trở về vai trò học viên'
          : '학생 역할로 돌아가기'
        : lang === 'vi'
          ? 'Thử vai trò giáo viên'
          : '선생님 역할 체험'}
    </button>
  );
}
function Art() {
  return (
    <div className="lesson-art">
      <img className="course-photo" src="/course-cafe.jpg" alt="" />
      <div className="cover-shade" />
      <div className="cover-top">
        <span className="subject-tag">KOREAN · 01</span>
        <span className="lesson-number">LESSON 04</span>
      </div>
      <div className="lesson-lettering">
        <span>카페에서 주문하기</span>
        <h2>
          커피 한 잔<br />
          주세요.
        </h2>
        <p>Một ly cà phê, làm ơn.</p>
      </div>
      <span className="cover-play" aria-hidden="true">
        <Play size={22} fill="currentColor" />
      </span>
    </div>
  );
}
function Dashboard({ lang, entries, go }: Props) {
  const t = (v: string, k: string) => (lang === 'vi' ? v : k);
  const points = getPoints(entries),
    complete = points.filter((p) =>
      entries.some((e) => e.id === 'attempt:' + p.id && e.payload.correct),
    ).length;
  const progress = entries.find((e) => e.id === 'progress')?.payload,
    config = entries.find((e) => e.id === 'config')?.payload || {
      duration: 60,
    };
  const percent = Math.min(
    100,
    Math.round(((progress?.furthest || 0) / config.duration) * 100),
  );
  const assignment = entries.find((e) => e.id === 'assignment')?.payload;
  const known = words.filter((w) =>
    entries.some((e) => e.id === 'vocab:' + w.id && e.payload.known),
  ).length;
  const activities = new Set(
    entries.filter((e) => e.kind === 'activity').map((e) => e.payload.day),
  );
  const date = new Date(),
    dateText = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'ko-KR', {
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
  const doneSteps =
    Number(complete === points.length) +
    Number(known === 8) +
    Number(assignment?.status === 'approved');
  const ring = (complete / points.length) * 100;
  return (
    <>
      <div className="greeting">
        <div>
          <div className="eyebrow">
            {t('KHÔNG GIAN CỦA BẠN', '나의 학습 공간')}
          </div>
          <h1>{t('Chào Minh Anh.', '안녕하세요, Minh Anh님.')}</h1>
          <p>
            {t(
              'Tiếp tục bài học và hoàn thành mục tiêu hôm nay.',
              '이어서 학습하고, 오늘의 목표를 완성해 보세요.',
            )}
          </p>
        </div>
        <div className="greeting-date">
          <span>{dateText}</span>
          <strong>
            {t('Sơ cấp 1', '초급 1')}
            <GraduationCap size={18} />
          </strong>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="main-learning">
          <div className="section-heading">
            <h2>{t('Bài học đang học', '이어서 학습하기')}</h2>
            <button className="text-button" onClick={() => go('lessons')}>
              {t('Tất cả bài học', '전체 수업')}
              <ArrowUpRight size={16} />
            </button>
          </div>
          <article className="continue-card">
            <button
              className="cover-link"
              aria-label={t(
                'Mở bài Gọi món ở quán cà phê',
                '카페에서 주문하기 수업 열기',
              )}
              onClick={() => go('lesson')}
            >
              <Art />
            </button>
            <div className="continue-body">
              <div className="course-title-row">
                <div>
                  <span className="eyebrow">
                    {t('GIAO TIẾP HẰNG NGÀY', '일상 속 한국어')}
                  </span>
                  <h2>{t('Gọi món ở quán cà phê', '카페에서 주문하기')}</h2>
                </div>
                <span className="course-unit">04</span>
              </div>
              <div className="lesson-meta">
                <span>
                  <Clock size={16} />
                  {formatTime(config.duration)}
                </span>
                <span>
                  <CheckCircle2 size={16} />
                  {complete}/{points.length} {t('nhiệm vụ', '미션')}
                </span>
                <span>
                  <Layers size={16} />8 {t('từ vựng', '단어')}
                </span>
              </div>
              <div className="continue-bottom">
                <div className="course-progress">
                  <div className="row spread">
                    <span>{t('Tiến độ xem', '시청 진도')}</span>
                    <strong>{percent}%</strong>
                  </div>
                  <Progress
                    aria-label={t('Tiến độ xem video', '영상 시청 진도')}
                    value={percent}
                  />
                </div>
                <button className="primary" onClick={() => go('lesson')}>
                  <Play size={16} fill="currentColor" />
                  {percent > 0
                    ? t('Tiếp tục học', '이어서 학습하기')
                    : t('Bắt đầu học', '수업 시작하기')}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </article>
          <div className="section-heading lower">
            <h2>{t('Thực hành sau bài học', '배운 내용을 내 것으로')}</h2>
            <span>{t('Học xong, thử ngay', '배운 뒤 바로 연습해요')}</span>
          </div>
          <div className="practice-grid">
            <button
              className="practice-tile vocabulary-tile"
              onClick={() => go('vocab')}
            >
              <div className="row spread">
                <span className="practice-icon">
                  <Layers size={23} />
                </span>
                <ArrowUpRight size={20} />
              </div>
              <div>
                <span className="eyebrow">VOCABULARY</span>
                <h3>{t('Sổ từ vựng', '나의 단어장')}</h3>
                <p>
                  {t('8 từ trong bài · ', '수업 단어 8개 · ')}
                  {known}
                  {t(' từ đã nhớ', '개 기억 완료')}
                </p>
              </div>
              <div className="mini-word-line">
                <span>커피</span>
                <span>잔</span>
                <span>주세요</span>
              </div>
            </button>
            <button
              className="practice-tile feedback-tile"
              onClick={() => go('feedback')}
            >
              <div className="row spread">
                <span className="practice-icon">
                  <MessageCircle size={23} />
                </span>
                <ArrowUpRight size={20} />
              </div>
              <div>
                <span className="eyebrow">WITH YOUR TEACHER</span>
                <h3>{t('Câu của bạn', '나만의 주문 대화')}</h3>
                <p>
                  {t(
                    'Viết 2–3 câu. Nhận góp ý từ giáo viên.',
                    '2~3문장을 쓰고 선생님의 피드백을 받아요.',
                  )}
                </p>
              </div>
              <div className="assignment-mini">
                <span className="small-avatar">K</span>
                <span>
                  {assignment?.status === 'approved'
                    ? t('Đã hoàn thành', '과제 완료')
                    : assignment?.status === 'revise'
                      ? t('Có góp ý mới', '새 피드백이 있어요')
                      : assignment
                        ? t('Đang chờ góp ý', '피드백 대기 중')
                        : t('Sẵn sàng để thực hành', '지금 연습할 수 있어요')}
                </span>
              </div>
            </button>
          </div>
        </section>
        <aside className="dashboard-side">
          <div className="progress-panel">
            <div className="section-heading">
              <h2>{t('Mục tiêu hôm nay', '오늘의 학습 목표')}</h2>
              <span>{doneSteps}/3</span>
            </div>
            <div className="mastery-ring">
              <svg
                viewBox="0 0 140 140"
                aria-label={t('Tiến độ nhiệm vụ', '미션 이해 진도')}
                role="img"
              >
                <circle
                  cx="70"
                  cy="70"
                  r="57"
                  fill="none"
                  stroke="#edf0f5"
                  strokeWidth="9"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="57"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="358.14"
                  strokeDashoffset={358.14 * (1 - ring / 100)}
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div>
                <strong>
                  {complete}
                  <small>/{points.length}</small>
                </strong>
                <span>{t('nhiệm vụ đã hiểu', '미션 이해 완료')}</span>
              </div>
            </div>
            <div className="learning-checklist">
              {[
                [
                  t('Hoàn thành nhiệm vụ', '영상 미션 완료'),
                  complete === points.length,
                  'lesson',
                ],
                [t('Ôn 8 từ vựng', '단어 8개 복습'), known === 8, 'vocab'],
                [
                  t('Nhận nhận xét của giáo viên', '선생님 피드백 받기'),
                  assignment?.status === 'approved',
                  'feedback',
                ],
              ].map(([title, done, v], i) => (
                <button key={String(v)} onClick={() => go(String(v))}>
                  <span className={'task-indicator ' + (done ? 'is-done' : '')}>
                    {done ? <Check size={13} /> : i + 1}
                  </span>
                  <span>{String(title)}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </div>
          <div className="week-card">
            <div className="section-heading">
              <h2>{t('Tuần học của bạn', '나의 학습 기록')}</h2>
              <span>
                <Clock size={16} />
              </span>
            </div>
            <div className="week-days">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(date.getTime() - (6 - i) * 86400000);
                const key = new Intl.DateTimeFormat('en-CA', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                }).format(d);
                return (
                  <div key={key}>
                    <span>
                      {new Intl.DateTimeFormat(
                        lang === 'vi' ? 'vi-VN' : 'ko-KR',
                        { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' },
                      )
                        .format(d)
                        .replace('Thứ ', 'T')}
                    </span>
                    <i
                      className={
                        activities.has(key) ? 'studied' : i === 6 ? 'today' : ''
                      }
                    >
                      {activities.has(key) ? <Check size={14} /> : d.getDate()}
                    </i>
                  </div>
                );
              })}
            </div>
            <p>
              {t(
                'Một lần thực hành, một ngày tiến bộ.',
                '한 번의 연습이 하루의 기록으로 남아요.',
              )}
            </p>
          </div>
          <div className="teacher-message">
            <div className="row">
              <span className="mentor-avatar">K</span>
              <div>
                <strong>{t('Giáo viên KROSS', 'KROSS 선생님')}</strong>
                <span>{t('Đồng hành cùng bạn', '배움을 함께해요')}</span>
              </div>
            </div>
            <p>
              {t(
                'Bạn có thể hỏi ngay tại đoạn video chưa hiểu. Mình cùng tìm câu trả lời nhé.',
                '이해가 안 되는 영상 시점에 질문을 남겨 주세요. 함께 답을 찾아봐요.',
              )}
            </p>
            <button className="text-button" onClick={() => go('lesson')}>
              {t('Mở lớp học', '수업에서 질문하기')}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

function Lessons(props: Props) {
  const { lang, entries, go } = props;
  const t = (v: string, k: string) => (lang === 'vi' ? v : k);
  const points = getPoints(entries);
  return (
    <>
      <div className="view-title">
        <div>
          <div className="eyebrow green">
            {t('LỚP CỦA BẠN', '우리 반 수업')}
          </div>
          <h1>
            {t('Không bỏ lỡ một bước nào.', '놓친 수업도, 차근차근 함께.')}
          </h1>
          <p>
            {t(
              'Học bù hoặc ôn lại cùng nội dung trên lớp.',
              '결석한 수업을 보충하고, 배운 내용을 다시 익혀요.',
            )}
          </p>
        </div>
        <span className="status-chip">
          {t('Sơ cấp 1 · Lớp mẫu', '초급 1 · 예제 반')}
        </span>
      </div>
      <div className="course-banner">
        <GraduationCap size={32} />
        <div>
          <h2>
            {t(
              'Tiếng Hàn cho những ngày đầu tiên',
              '한국어로 시작하는 첫 일상',
            )}
          </h2>
          <p>
            {t(
              'Một bài học mẫu đã sẵn sàng để bạn trải nghiệm toàn bộ hành trình.',
              '수업부터 피드백까지 전체 학습 흐름을 경험할 수 있는 예제 수업입니다.',
            )}
          </p>
        </div>
        <span>01</span>
      </div>
      <div className="course-list">
        <div className="course-item">
          <Art />
          <div>
            <span className="eyebrow green">
              {t('BÀI 04 · GIAO TIẾP', '04강 · 실전 회화')}
            </span>
            <h2>{t('Gọi món ở quán cà phê', '카페에서 주문하기')}</h2>
            <p>
              {t(
                '주세요 · 한 잔, 두 잔 · 포장해 주세요',
                '주세요 · 한 잔, 두 잔 · 포장해 주세요',
              )}
            </p>
            <div className="lesson-meta">
              <span>
                <Sparkles size={16} />
                {points.length} {t('nhiệm vụ', '미션')}
              </span>
              <span>
                <Layers size={16} />8 {t('từ vựng', '단어')}
              </span>
              <span>
                <MessageCircle size={16} />
                {t('Giáo viên nhận xét', '선생님 피드백')}
              </span>
            </div>
            <button className="primary" onClick={() => go('lesson')}>
              <Play size={16} />
              {t('Vào bài học', '수업 입장')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
export default function Home() {
  const [lang, setLang] = useState<Lang>('vi'),
    [view, setView] = useState('home'),
    [entries, setEntries] = useState<Entry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [pending, setPending] = useState(0);
  const [design, setDesign] = useState(2);
  useEffect(() => {
    const n = Number(localStorage.getItem('kross-design-v2') ?? 2);
    if (n >= 0 && n <= 2) setDesign(n);
  }, []);
  function chooseDesign(n: number) {
    setDesign(n);
    localStorage.setItem('kross-design-v2', String(n));
  }
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const t = (v: string, k: string) => (lang === 'vi' ? v : k);
  useEffect(() => {
    const saved = localStorage.getItem('kross-campus-lang');
    if (saved === 'ko') setLang('ko');
    const change = () => {
      const v = window.location.hash.slice(1);
      setView(viewNames[v] ? v : 'home');
    };
    change();
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem('kross-campus-lang', lang);
  }, [lang]);
  function load() {
    setLoading(true);
    setError('');
    fetch('/api/state')
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = (await r.json()) as { entries: Entry[]; error?: string };
        setEntries(data.entries);
      })
      .catch(() => setError('load'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  function go(v: string) {
    if (!viewNames[v]) return;
    window.location.hash = v;
    setView(v);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function mutate(body: any): Promise<any> {
    setPending((n) => n + 1);
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        const r = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await r.json()) as { entries: Entry[]; error?: string };
        if (!r.ok) throw new Error(data.error || 'SAVE_FAILED');
        setEntries(data.entries);
        setError('');
        return data;
      })
      .catch((e: Error) => {
        setError(e.message);
        throw e;
      })
      .finally(() => setPending((n) => n - 1));
    queue.current = task.catch(() => {});
    return task;
  }
  const props: Props = { lang, entries, mutate, busy: pending > 0, go };
  const errorText =
    error === 'INVALID_CHECKPOINT'
      ? t(
          'Kiểm tra thời điểm (không trùng), 3 đáp án khác nhau và phần giải thích.',
          '시점 중복, 서로 다른 선택지 3개, 설명 입력을 확인해 주세요.',
        )
      : error === 'INVALID_VIDEO'
        ? t(
            'Cần URL HTTPS trực tiếp đến .mp4/.webm và thời lượng 50–14400 giây, dài hơn mọi nhiệm vụ.',
            'HTTPS .mp4/.webm 직접 주소와 50~14400초 길이를 입력하세요. 모든 미션보다 길어야 합니다.',
          )
        : error === 'KOREAN_REQUIRED'
          ? t(
              'Hãy viết ít nhất một từ bằng tiếng Hàn.',
              '한국어 단어를 포함해 작성해 주세요.',
            )
          : error === 'load'
            ? t(
                'Chưa tải được dữ liệu học tập. Hãy thử lại.',
                '학습 기록을 불러오지 못했어요. 다시 시도해 주세요.',
              )
            : t(
                'Chưa lưu được thay đổi. Nội dung đang nhập vẫn còn; hãy thử lại.',
                '변경 내용을 저장하지 못했어요. 입력한 내용을 확인하고 다시 시도해 주세요.',
              );
  return (
    <SidebarProvider className={'kross-theme theme-' + design}>
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="skip-link"
      >
        {t('Đến nội dung', '본문으로 이동')}
      </a>
      <Sidebar className="campus-sidebar">
        <SidebarHeader>
          <a className="brand" href="#home">
            <span className="logo-window">
              <img src="/kross-logo.png" alt="KROSS · From dream to goal" />
            </span>
          </a>
          <p className="brand-sub">CAMPUS</p>
        </SidebarHeader>
        <SidebarContent>
          <p className="nav-label">
            {t('KHÔNG GIAN HỌC TẬP', '나의 학습 공간')}
          </p>
          <SidebarNav lang={lang} view={view} go={go} />
          <RoleSwitch view={view} go={go} lang={lang} />
        </SidebarContent>
        <SidebarFooter>
          <div className="profile">
            <span className="avatar">{view === 'teacher' ? 'K' : 'MA'}</span>
            <div>
              <strong>
                {view === 'teacher'
                  ? t('Giáo viên KROSS', 'KROSS 선생님')
                  : 'Minh Anh'}
              </strong>
              <p>
                {t('Tài khoản trải nghiệm', '체험용 프로필')} ·{' '}
                {t('Sơ cấp 1', '초급 1')}
              </p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="workspace">
        <header className="topbar">
          <div className="row">
            <SidebarTrigger />
            <span>
              {t('Không gian học tập', '학습 공간')}{' '}
              <span className="muted">
                / {viewNames[view][lang === 'vi' ? 0 : 1]}
              </span>
            </span>
          </div>
          <div className="row">
            <span className="save-status" aria-live="polite">
              {loading ? (
                <LoaderCircle size={14} className="spin" />
              ) : pending > 0 ? (
                <>
                  <LoaderCircle size={14} className="spin" />
                  {t('Đang lưu', '저장 중')}
                </>
              ) : error ? (
                <AlertCircle size={14} />
              ) : (
                <>
                  <Check size={14} />
                  {t('Đã đồng bộ', '동기화됨')}
                </>
              )}
            </span>
            <span className="demo-badge">{t('Bản trải nghiệm', '체험판')}</span>
            <button
              className="text-button language-button"
              aria-label={
                lang === 'vi' ? '한국어로 전환' : 'Chuyển sang tiếng Việt'
              }
              onClick={() => setLang(lang === 'vi' ? 'ko' : 'vi')}
            >
              {lang === 'vi' ? 'VI / 한국어' : 'KO / Tiếng Việt'}
            </button>
          </div>
        </header>
        {design === 2 && (
          <nav
            className="studio-global-nav"
            aria-label={t('Điều hướng lớp học', '수업 메뉴')}
          >
            <a href="#home" className="brand">
              <span className="logo-window">
                <img src="/kross-logo.png" alt="KROSS" />
              </span>
            </a>
            <div>
              {['home', 'lessons', 'vocab', 'feedback', 'teacher'].map((v) => (
                <button
                  key={v}
                  aria-current={view === v ? 'page' : undefined}
                  onClick={() => go(v)}
                >
                  {viewNames[v][lang === 'ko' ? 1 : 0]}
                </button>
              ))}
            </div>
          </nav>
        )}
        <main id="main-content" className="content" tabIndex={-1}>
          <DesignPicker value={design} onChange={chooseDesign} lang={lang} />
          {error && (
            <div role="alert" className="error-banner">
              <AlertCircle size={19} />
              <span>{errorText}</span>
              {error === 'load' ? (
                <button className="secondary" onClick={load}>
                  {t('Thử lại', '다시 시도')}
                </button>
              ) : (
                <button className="text-button" onClick={() => setError('')}>
                  {t('Đóng', '닫기')}
                </button>
              )}
            </div>
          )}
          {loading ? (
            <div className="loading-panel">
              <LoaderCircle className="spin" />
              {t('Đang chuẩn bị góc học tập…', '학습 공간을 준비하고 있어요…')}
            </div>
          ) : error === 'load' ? null : view === 'home' ? (
            design === 2 ? (
              <StudioHome {...props} />
            ) : (
              <LearningHome {...props} design={design} />
            )
          ) : view === 'lessons' ? (
            <Lessons {...props} />
          ) : view === 'lesson' ? (
            <Lesson {...props} />
          ) : view === 'vocab' ? (
            <Vocab {...props} />
          ) : view === 'feedback' ? (
            <Feedback {...props} />
          ) : (
            <Teacher {...props} />
          )}
          <footer className="page-footer">
            KROSS CAMPUS{' '}
            <span>
              {t(
                'Học cùng nhau, tiến xa hơn.',
                '함께 배우고, 더 멀리 나아가요.',
              )}
            </span>
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}
