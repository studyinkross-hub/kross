'use client';
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
      <div className="row spread">
        <span className="light-pill">KROSS CLASSROOM</span>
        <span>한국어 01</span>
      </div>
      <div className="lesson-lettering">
        <span>오늘의 한국어</span>
        <h2>
          커피 한 잔<br />
          주세요.
        </h2>
        <p>Một ly cà phê, làm ơn.</p>
      </div>
      <span className="art-caption">
        <Play size={14} /> LEARN · PRACTICE · CONNECT
      </span>
    </div>
  );
}
function Dashboard({ lang, entries, go }: Props) {
  const t = (v: string, k: string) => (lang === 'vi' ? v : k);
  const points = getPoints(entries);
  const complete = points.filter((p) =>
    entries.some((e) => e.id === 'attempt:' + p.id && e.payload.correct),
  ).length;
  const progress = entries.find((e) => e.id === 'progress')?.payload;
  const config = entries.find((e) => e.id === 'config')?.payload || {
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
  const date = new Date();
  const dateText = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'ko-KR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
  const tzDay = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  const activity = new Set(
    entries.filter((e) => e.kind === 'activity').map((e) => e.payload.day),
  );
  const steps = [
    [
      t('Xem bài học & hoàn thành nhiệm vụ', '영상 수업과 미션 완료하기'),
      t(
        'Dừng đúng lúc để thực hành điều vừa học.',
        '배운 내용을 알맞은 시점에 바로 연습해요.',
      ),
      'lesson',
      complete === points.length,
    ],
    [
      t('Ghi nhớ từ vựng trong bài', '수업에서 만난 단어 기억하기'),
      t(
        'Thẻ từ, phát âm và ôn lại những từ còn khó.',
        '단어 카드, 발음, 어려운 단어를 다시 연습해요.',
      ),
      'vocab',
      known === words.length,
    ],
    [
      t('Gửi câu của bạn cho giáo viên', '나만의 문장을 선생님께 제출하기'),
      t(
        'Nhận góp ý, sửa lại và tiến bộ mỗi ngày.',
        '피드백을 받고 수정하며 매일 성장해요.',
      ),
      'feedback',
      assignment?.status === 'approved',
    ],
  ];
  return (
    <>
      <div className="greeting">
        <div className="eyebrow">{dateText.toUpperCase()}</div>
        <h1>
          {t('Chào Minh Anh, cùng học nhé', 'Minh Anh, 오늘도 함께 배워요')}{' '}
          <span className="green">↗</span>
        </h1>
        <p>
          {t(
            'Một chút mỗi ngày. Tự tin hơn trong từng câu nói.',
            '매일 조금씩. 말할 때마다 더 자신 있게.',
          )}
        </p>
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <h2>{t('Tiếp tục hành trình', '오늘의 수업 이어가기')}</h2>
            <span>{t('SƠ CẤP 1 · BÀI 04', '초급 1 · 04강')}</span>
          </div>
          <div className="continue-card">
            <Art />
            <div className="continue-body">
              <span className="eyebrow green">
                {t('HỌC BÙ · CÙNG LỚP CỦA BẠN', '보충 수업 · 우리 반과 함께')}
              </span>
              <h2>{t('Gọi món ở quán cà phê', '카페에서 주문하기')}</h2>
              <p>{t('카페에서 주문하기', 'Gọi món ở quán cà phê')}</p>
              <div className="lesson-meta">
                <span>
                  <Clock size={16} />
                  {formatTime(config.duration)} {t('video', '영상')}
                </span>
                <span>
                  <Sparkles size={16} />
                  {complete}/{points.length} {t('nhiệm vụ', '미션')}
                </span>
              </div>
              <Progress
                aria-label={t('Tiến độ xem video', '영상 시청 진도')}
                value={percent}
              />
              <div className="row spread progress-label">
                <span>
                  {percent > 0
                    ? t('Đã xem video', '영상 시청')
                    : t('Sẵn sàng bắt đầu', '시작할 준비가 됐어요')}
                </span>
                <span>{percent}%</span>
              </div>
              <button className="primary" onClick={() => go('lesson')}>
                <Play size={18} />
                {percent > 0
                  ? t('Tiếp tục học', '이어서 학습하기')
                  : t('Vào học ngay', '지금 수업 시작')}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="section-heading lower">
            <h2>{t('Lộ trình hôm nay', '오늘의 학습 순서')}</h2>
            <span>{t('3 bước nhỏ, 1 mục tiêu', '세 걸음, 하나의 목표')}</span>
          </div>
          {steps.map(([title, desc, v, done], i) => (
            <button
              className="journey-row"
              key={String(v)}
              onClick={() => go(String(v))}
            >
              <span className={'step-number ' + (done ? 'is-done' : '')}>
                {done ? <Check size={18} /> : '0' + (i + 1)}
              </span>
              <div>
                <strong>{String(title)}</strong>
                <p>{String(desc)}</p>
              </div>
              <ArrowUpRight />
            </button>
          ))}
        </section>
        <aside>
          <div className="section-heading">
            <h2>{t('Nhịp học của bạn', '나의 학습 리듬')}</h2>
          </div>
          <div className="week-card">
            <div className="row spread">
              <span className="icon-tile">
                <Sparkles />
              </span>
              <span className="eyebrow">
                {t('TỪNG NGÀY, TỪNG TIẾN BỘ', '하루하루, 차곡차곡')}
              </span>
            </div>
            <h3>
              {activity.size > 0
                ? t('Bạn đã bắt đầu.', '좋은 시작이에요.')
                : t('Xin chào,', '반가워요,')}
              <br />
              {activity.size > 0
                ? t('Cứ tiếp tục nhé.', '계속 이어 가요.')
                : t('thói quen mới.', '새로운 습관.')}
            </h3>
            <p>
              {t(
                'Mỗi nhiệm vụ hoàn thành là một dấu mốc trên hành trình học.',
                '완료한 미션 하나하나가 나의 학습 기록이 돼요.',
              )}
            </p>
            <div className="week-days">
              {Array.from({ length: 7 }, (_, i) => {
                const day = new Date(date.getTime() - (6 - i) * 86400000);
                const key = tzDay(day);
                return (
                  <div key={key}>
                    <span>
                      {new Intl.DateTimeFormat(
                        lang === 'vi' ? 'vi-VN' : 'ko-KR',
                        { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' },
                      ).format(day)}
                    </span>
                    <i
                      className={
                        activity.has(key) ? 'studied' : i === 6 ? 'today' : ''
                      }
                    >
                      {activity.has(key) ? (
                        <Check size={14} />
                      ) : i === 6 ? (
                        '•'
                      ) : (
                        '–'
                      )}
                    </i>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="vocab-teaser">
            <div className="row spread">
              <Layers size={24} />
              <span className="tiny-pill">
                {known}/8 {t('ĐÃ NHỚ', '기억 완료')}
              </span>
            </div>
            <h3>
              {t('Học trong bài.', '수업에서 배우고,')}
              <br />
              {t('Nhớ ngoài đời.', '일상에서 기억해요.')}
            </h3>
            <p>커피 · 주문하다 · 주세요</p>
            <button className="text-button" onClick={() => go('vocab')}>
              {t('Mở sổ từ vựng', '단어장 열기')}
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="mentor-note">
            <span className="avatar">K</span>
            <div>
              <strong>
                {t(
                  'Mỗi câu hỏi đều đáng được lắng nghe.',
                  '모든 질문은 소중해요.',
                )}
              </strong>
              <p>
                {t(
                  'Hỏi giáo viên ngay tại thời điểm bạn chưa hiểu.',
                  '이해가 안 되는 바로 그 시점에 선생님께 질문하세요.',
                )}
              </p>
            </div>
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
    <SidebarProvider>
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
            <span className="brand-icon">K</span>KROSS
            <span className="brand-dot">.</span>
          </a>
          <p className="brand-sub">CAMPUS · ĐÀ NẴNG</p>
        </SidebarHeader>
        <SidebarContent>
          <p className="nav-label">
            {t('KHÔNG GIAN HỌC TẬP', '나의 학습 공간')}
          </p>
          <SidebarNav lang={lang} view={view} go={go} />
          <div className="sidebar-note">
            <GraduationCap />
            <strong>
              {t('Từng bước đến Hàn Quốc', '한국을 향해 한 걸음씩')}
            </strong>
            <p>
              {t(
                'Bắt đầu từ một bài học nhỏ hôm nay.',
                '오늘의 작은 배움에서 시작해요.',
              )}
            </p>
            <span>KROSS 한국어 · 유학</span>
          </div>
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
        <main id="main-content" className="content" tabIndex={-1}>
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
            <Dashboard {...props} />
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
