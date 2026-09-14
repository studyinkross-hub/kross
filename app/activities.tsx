'use client';
import { useState } from 'react';
import {
  Mic,
  Layers,
  Languages,
  ExternalLink,
  Plus,
  Save,
  Play,
  Check,
  Archive,
  RotateCcw,
} from 'lucide-react';
import {
  getActivities,
  activityLabels,
  activityCompleted,
  type LessonActivity,
  type ActivityType,
} from '@/lib/activities';
import { formatTime, parseTime } from '@/lib/course';
import type { Props } from './learning';
import { SpeakingRecorder } from './speaking';
const icons = {
  shadow: Mic,
  fill: Layers,
  translate: Languages,
  padlet: ExternalLink,
};
export function ActivityTask({
  activity,
  videoUrl,
  onContinue,
  ...props
}: Props & {
  activity: LessonActivity;
  videoUrl: string;
  onContinue: () => void;
}) {
  const { lang, entries, mutate, busy } = props;
  const t = (v: string, k: string) => (lang === 'ko' ? k : v);
  const existing = entries.find(
    (e) =>
      e.id === 'response:' + activity.id &&
      e.payload.revision === activity.revision,
  )?.payload;
  const [body, setBody] = useState(existing?.body || ''),
    [ready, setReady] = useState(false),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState('');
  const Icon = icons[activity.type];
  async function submit(continueAfter = false) {
    setError('');
    try {
      const response = await mutate({
        action: 'respondActivity',
        id: activity.id,
        revision: activity.revision,
        body,
        recorded: ready,
        compared: ready,
        seconds,
      });
      if (continueAfter && activityCompleted(activity,response.entries || [])) onContinue();
    } catch {
      setError(
        t(
          'Không lưu được. Hãy thử lại.',
          '저장하지 못했습니다. 다시 시도해 주세요.',
        ),
      );
    }
  }
  const status = existing?.status;
  return (
    <section
      className="activity-task"
      id="active-activity"
      tabIndex={-1}
      aria-label={t('Hoạt động trong video', '영상 속 활동')}
    >
      <div className="activity-heading">
        <span>
          <Icon size={18} />
          {activityLabels[activity.type][lang === 'ko' ? 1 : 0]}
        </span>
        <time>{formatTime(activity.time)}</time>
      </div>
      <h2>{activity.type === 'shadow' ? t('Nghe, rồi nói bằng giọng của mình.','듣고, 내 목소리로.') : activity.title}</h2>
      <p className="activity-prompt">{activity.type==='shadow'?t('Nghe bản gốc rồi nói theo.','원본을 듣고 따라 말해 보세요.'):activity.prompt}</p>
      {activity.type === 'shadow' ? (
        <SpeakingRecorder
          key={activity.id + activity.revision}
          activity={activity}
          videoUrl={videoUrl}
          lang={lang}
          onReady={(r, s) => {
            setReady(r);
            setSeconds(s);
          }}
        />
      ) : (
        <>
          {activity.type === 'translate' && (
            <span className="direction-label">
              {activity.direction === 'vi-ko'
                ? 'Tiếng Việt → 한국어'
                : '한국어 → Tiếng Việt'}
            </span>
          )}
          {activity.type === 'padlet' && (
            <div className="padlet-callout">
              <ExternalLink size={22} />
              <div>
                <strong>{t('Bảng đọc của lớp', '우리 반 읽기 게시판')}</strong>
                <p>
                  {t(
                    'Mở Padlet, đọc theo hướng dẫn rồi quay lại ghi các từ đã luyện.',
                    'Padlet에서 안내된 단어를 읽고 돌아와 연습한 단어를 적어 주세요.',
                  )}
                </p>
                <a
                  href={activity.padletUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary"
                >
                  {t('Mở Padlet', 'Padlet 열기')}
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
          )}
          <label htmlFor={'answer-' + activity.id}>
            {activity.type === 'fill'
              ? t('Từ còn thiếu', '빈칸에 들어갈 단어')
              : activity.type === 'translate'
                ? t('Bản dịch của bạn', '내가 번역한 문장')
                : t('Các từ đã luyện và ghi chú', '연습한 단어와 메모')}
          </label>
          <textarea
            id={'answer-' + activity.id}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            placeholder={
              activity.type === 'translate'
                ? activity.direction === 'vi-ko'
                  ? '한국어로 써 보세요.'
                  : 'Viết bằng tiếng Việt.'
                : '…'
            }
          />
        </>
      )}
      {status && (
        <div className={'activity-result ' + status} role="status">
          <strong>
            {status === 'wrong'
              ? t(
                  'Chưa đúng. Hãy thử lại.',
                  '아직 맞지 않아요. 다시 풀어 보세요.',
                )
              : status === 'pending'
                ? t('Đã gửi giáo viên xem xét', '선생님께 확인을 요청했어요')
                : status === 'revise'
                  ? t('Giáo viên yêu cầu sửa lại', '선생님이 수정을 요청했어요')
                  : t('Đã hoàn thành hoạt động', '활동을 완료했어요')}
          </strong>
          {status === 'pending' && activity.type === 'translate' && (
            <p>
              {t(
                'Bản dịch có thể có nhiều cách đúng. Giáo viên sẽ kiểm tra câu của bạn.',
                '번역은 여러 답이 가능하므로 선생님이 문장을 확인합니다.',
              )}
            </p>
          )}
          {activity.reference && <p>{activity.reference}</p>}
          {['correct', 'pending', 'approved'].includes(status) &&
            activity.answer && (
              <p>
                <b>{t('Câu tham khảo', '참고 답안')}: </b>
                {activity.answer.split('|')[0]}
              </p>
            )}
          {existing.feedback && <blockquote>{existing.feedback}</blockquote>}
        </div>
      )}
      {error && (
        <p role="alert" className="activity-error">
          {error}
        </p>
      )}
      <div className="activity-actions">
        <button
          className="secondary"
          disabled={
            busy || (activity.type === 'shadow' ? !ready : !body.trim())
          }
          onClick={()=>submit()}
          hidden={activity.type==='shadow'}
        >
          <Save size={17} />
          {status
            ? t('Gửi lại', '다시 제출')
            : activity.type === 'fill'
              ? t('Kiểm tra', '정답 확인')
              : t('Hoàn thành & gửi', '활동 제출')}
        </button>
        <button
          className="primary"
          disabled={busy || (!activityCompleted(activity, entries) && !(activity.type==='shadow' && ready))}
          onClick={()=>activityCompleted(activity,entries)?onContinue():submit(true)}
        >
          {t('Hoàn thành và tiếp tục', '완료하고 수업 계속')}
          <Play size={17} />
        </button>
      </div>
    </section>
  );
}
function ResponseReview({
  entry,
  activity,
  ...props
}: Props & { entry: any; activity?: LessonActivity }) {
  const t = (v: string, k: string) => (props.lang === 'ko' ? k : v);
  const [feedback, setFeedback] = useState('');
  return (
    <article className="activity-review">
      <div className="row spread">
        <h3>{activity?.title || t('Hoạt động đã lưu', '저장된 활동')}</h3>
        <span>{entry.payload.status}</span>
      </div>
      <blockquote>
        {entry.payload.type === 'shadow'
          ? t(
              'Tự luyện nói · bản thu ở thiết bị học viên',
              '말하기 자가 연습 · 녹음은 학생 기기에 저장',
            )
          : entry.payload.body}
      </blockquote>
      {entry.payload.feedback && <p>{entry.payload.feedback}</p>}
      <label htmlFor={'review-' + entry.id}>
        {t('Nhận xét của giáo viên', '활동 피드백')}
      </label>
      <textarea
        id={'review-' + entry.id}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        maxLength={2000}
      />
      <div className="row">
        <button
          className="secondary"
          disabled={!feedback.trim() || props.busy}
          onClick={() =>
            props
              .mutate({
                action: 'reviewActivity',
                id: entry.id,
                status: 'revise',
                feedback,
              })
              .then(() => setFeedback(''))
              .catch(() => {})
          }
        >
          {t('Yêu cầu sửa', '수정 요청')}
        </button>
        <button
          className="primary"
          disabled={!feedback.trim() || props.busy}
          onClick={() =>
            props
              .mutate({
                action: 'reviewActivity',
                id: entry.id,
                status: 'approved',
                feedback,
              })
              .then(() => setFeedback(''))
              .catch(() => {})
          }
        >
          {t('Xác nhận', '완료 확인')}
        </button>
      </div>
    </article>
  );
}
export function ActivityStudio(props: Props) {
  const { lang, entries, mutate, busy } = props;
  const t = (v: string, k: string) => (lang === 'ko' ? k : v);
  const config = entries.find((e) => e.id === 'config')?.payload || {
    videoUrl: '/lesson-cafe.mp4',
    duration: 60,
  };
  const activities = getActivities(entries);
  const blank = (): LessonActivity => ({
    id: '',
    type: 'shadow',
    time: Math.min(600, Math.floor(config.duration * 0.13)),
    title: t('Luyện nói', '듣고 따라 말하기'),
    prompt: '커피 한 잔 주세요.',
    answer: '',
    reference: '커피 한 잔 주세요.',
    sourceStart: 0,
    sourceEnd: Math.min(10, config.duration),
    padletUrl: '',
    direction: 'vi-ko',
    revision: 1,
  });
  const [form, setForm] = useState<LessonActivity>(blank),
    [time, setTime] = useState(formatTime(blank().time)),
    [start, setStart] = useState('00:00'),
    [end, setEnd] = useState('00:10'),
    [message, setMessage] = useState(''),
    [preview, setPreview] = useState<LessonActivity | null>(null),
    [saving, setSaving] = useState(false);
  const field = (key: keyof LessonActivity, value: any) =>
    setForm((p) => ({ ...p, [key]: value }));
  function edit(a: LessonActivity) {
    setForm(a);
    setTime(formatTime(a.time));
    setStart(formatTime(a.sourceStart));
    setEnd(formatTime(a.sourceEnd));
    setPreview(null);
    document
      .getElementById('activity-builder')
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      await mutate({
        ...form,
        action: 'saveActivity',
        time: parseTime(time),
        sourceStart: parseTime(start),
        sourceEnd: parseTime(end),
      });
      setMessage(t('Đã lưu hoạt động.', '활동을 저장했습니다.'));
      setForm(blank());
      setTime(formatTime(blank().time));
    } catch {
      setMessage(
        t(
          'Kiểm tra thời điểm, câu hỏi, đáp án và liên kết. Thời điểm không được trùng nhiệm vụ khác.',
          '시점·문제·정답·링크를 확인해 주세요. 다른 미션이나 활동과 시점이 겹치면 안 됩니다.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  async function addSamples() {
    setSaving(true);
    setMessage('');
    try {
      const long = config.duration >= 3600;
      const samples = [
        {
          ...blank(),
          type: 'shadow',
          time: long ? 600 : 8,
          title: t('Gọi món · nghe và nói', '회화 · 듣고 따라 말하기'),
          sourceStart: 0,
          sourceEnd: long ? 20 : 6,
        },
        {
          ...blank(),
          type: 'fill',
          time: long ? 1200 : 22,
          title: t('Từ vựng · điền từ', '단어 · 빈칸 채우기'),
          prompt: '커피 ___ 잔 주세요. (hai ly / 두 잔)',
          answer: '두',
          reference: t(
            'Trước 잔, 둘 đổi thành 두.',
            '단위 명사 ‘잔’ 앞에서는 둘 → 두가 됩니다.',
          ),
        },
        {
          ...blank(),
          type: 'translate',
          time: long ? 1800 : 38,
          title: t(
            'Bất quy tắc ㅂ · Việt → Hàn',
            'ㅂ 불규칙 · 베트남어 → 한국어',
          ),
          prompt: 'Hôm nay trời lạnh.',
          answer: '오늘은 추워요.|오늘 날씨가 추워요.|오늘 추워요.',
          reference: t(
            '춥다 → 추워요. ㅂ chuyển thành 우 trước 어요.',
            '춥다 → 추워요. ㅂ이 우로 바뀌어 어요와 결합합니다.',
          ),
        },
        {
          ...blank(),
          type: 'translate',
          time: long ? 2700 : 54,
          title: t(
            'Bất quy tắc ㅂ · Hàn → Việt',
            'ㅂ 불규칙 · 한국어 → 베트남어',
          ),
          direction: 'ko-vi',
          prompt: '이 음식은 매워요.',
          answer: 'Món ăn này cay.|Món này cay.',
          reference: t('맵다 → 매워요.', '맵다 → 매워요.'),
        },
      ];
      let count = 0;
      for (const s of samples) {
        if (activities.some((a) => a.title === s.title)) continue;
        await mutate({ ...s, id: '', action: 'saveActivity' });
        count++;
      }
      setMessage(
        t(
          `Đã thêm ${count} hoạt động. Thêm Padlet bằng liên kết lớp của bạn.`,
          `${count}개 활동을 추가했습니다. Padlet은 실제 우리 반 링크를 입력해 추가하세요.`,
        ),
      );
    } catch {
      setMessage(
        t(
          'Một thời điểm đã được sử dụng. Hãy đổi thời điểm trong biểu mẫu.',
          '겹치는 시점이 있습니다. 아래에서 시점을 바꿔 추가해 주세요.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="activity-studio">
      <div className="studio-intro">
        <div>
          <h2>{t('Thiết kế hoạt động theo video', '영상에 활동 붙이기')}</h2>
          <p>
            {t(
              'Chọn thời điểm dừng, nội dung và cách thực hành.',
              '멈출 시점과 학생이 직접 할 활동을 정하세요.',
            )}
          </p>
        </div>
        <button
          className="secondary"
          disabled={busy || saving}
          onClick={addSamples}
        >
          <Plus size={17} />
          {t('Thêm 4 hoạt động mẫu', '활동 예제 4개 추가')}
        </button>
      </div>
      <p className="fineprint">
        {t('Video hiện tại', '현재 영상')}: {formatTime(config.duration)} ·{' '}
        {t(
          'Thay video ở tab “Tạo bài học”.',
          '영상은 ‘수업 만들기’ 탭에서 변경할 수 있습니다.',
        )}{' '}
        {t(
          'Mẫu ngữ pháp dùng bất quy tắc ㅂ.',
          '문법 예제는 ㅂ 불규칙으로 구성했습니다.',
        )}
      </p>
      {message && (
        <p role="status" className="studio-message">
          {message}
        </p>
      )}
      <div className="studio-layout">
        <form id="activity-builder" className="panel" onSubmit={submit}>
          <h3>
            {form.id
              ? t('Sửa hoạt động', '활동 수정')
              : t('Hoạt động mới', '새 활동')}
          </h3>
          <div
            className="activity-type-picker"
            role="group"
            aria-label={t('Loại hoạt động', '활동 종류')}
          >
            {(Object.keys(activityLabels) as ActivityType[]).map((type) => {
              const Icon = icons[type];
              return (
                <button
                  type="button"
                  key={type}
                  aria-pressed={form.type === type}
                  onClick={() => field('type', type)}
                >
                  <Icon size={18} />
                  {activityLabels[type][lang === 'ko' ? 1 : 0]}
                </button>
              );
            })}
          </div>
          <label htmlFor="activity-time">
            {t(
              'Thời điểm dừng · mm:ss / hh:mm:ss',
              '멈출 시점 · 분:초 / 시:분:초',
            )}
          </label>
          <input
            id="activity-time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="10:00"
          />
          <label htmlFor="activity-title">
            {t('Tên hoạt động', '활동 이름')}
          </label>
          <input
            id="activity-title"
            value={form.title}
            required
            maxLength={120}
            onChange={(e) => field('title', e.target.value)}
          />
          <label htmlFor="activity-prompt">
            {t('Hướng dẫn / câu cần luyện', '학생 안내 / 연습할 문장')}
          </label>
          <textarea
            id="activity-prompt"
            value={form.prompt}
            required
            maxLength={2000}
            onChange={(e) => field('prompt', e.target.value)}
          />
          {form.type === 'shadow' && (
            <>
              <div className="source-range">
                <div>
                  <label htmlFor="source-start">
                    {t('Bắt đầu bản gốc', '원본 구간 시작')}
                  </label>
                  <input
                    id="source-start"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="source-end">
                    {t('Kết thúc bản gốc', '원본 구간 끝')}
                  </label>
                  <input
                    id="source-end"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              <p className="fineprint">
                {t(
                  'Đoạn gốc tối đa 2 phút. Bản thu tối đa 90 giây.',
                  '원본 구간은 최대 2분, 학생 녹음은 최대 90초입니다.',
                )}
              </p>
            </>
          )}
          {form.type === 'translate' && (
            <div
              className="direction-choice"
              role="group"
              aria-label={t('Hướng dịch', '번역 방향')}
            >
              {(['vi-ko', 'ko-vi'] as const).map((d) => (
                <button
                  className="secondary"
                  type="button"
                  key={d}
                  aria-pressed={form.direction === d}
                  onClick={() => field('direction', d)}
                >
                  {d === 'vi-ko'
                    ? 'Tiếng Việt → 한국어'
                    : '한국어 → Tiếng Việt'}
                </button>
              ))}
            </div>
          )}
          {['fill', 'translate'].includes(form.type) && (
            <>
              <label htmlFor="activity-answer">
                {t(
                  'Đáp án tham khảo · dùng | cho nhiều đáp án',
                  '정답 / 참고 답안 · 여러 답은 | 로 구분',
                )}
              </label>
              <textarea
                id="activity-answer"
                value={form.answer}
                onChange={(e) => field('answer', e.target.value)}
                required
                maxLength={2000}
              />
              <p className="fineprint">
                {t(
                  'Điền từ: chấm tự động. Dịch khác mẫu: gửi giáo viên kiểm tra.',
                  '빈칸은 정답을 비교하고, 번역이 참고 답안과 다르면 선생님이 확인합니다.',
                )}
              </p>
            </>
          )}
          {form.type === 'padlet' && (
            <>
              <label htmlFor="padlet-link">
                {t('Liên kết Padlet của lớp', '우리 반 Padlet 링크')}
              </label>
              <input
                id="padlet-link"
                type="url"
                value={form.padletUrl}
                onChange={(e) => field('padletUrl', e.target.value)}
                placeholder="https://padlet.com/…"
                required
              />
              <p className="fineprint">
                {t(
                  'Mở ở tab mới. Không đồng bộ bài đăng hay tài khoản Padlet.',
                  '새 탭으로 열립니다. Padlet 게시물과 계정은 자동 동기화되지 않습니다.',
                )}
              </p>
            </>
          )}
          <label htmlFor="activity-reference">
            {form.type === 'shadow'
              ? t('Câu gốc để đối chiếu', '비교할 원문')
              : t('Giải thích sau khi làm', '활동 후 설명')}
          </label>
          <textarea
            id="activity-reference"
            value={form.reference}
            onChange={(e) => field('reference', e.target.value)}
            maxLength={2000}
          />
          <div className="row">
            <button className="primary" disabled={busy || saving}>
              <Save size={17} />
              {t('Lưu hoạt động', '활동 저장')}
            </button>
            {form.id && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setForm(blank());
                  setTime(formatTime(blank().time));
                }}
              >
                {t('Hủy sửa', '수정 취소')}
              </button>
            )}
          </div>
        </form>
        <aside className="activity-list-panel panel">
          <h3>
            {t('Hoạt động trong bài', '수업 활동 목록')}{' '}
            <small>{activities.length}</small>
          </h3>
          {!activities.length && (
            <p>
              {t(
                'Thêm mẫu hoặc tự tạo hoạt động đầu tiên.',
                '예제를 추가하거나 첫 활동을 직접 만들어 보세요.',
              )}
            </p>
          )}
          {activities.map((a) => {
            const Icon = icons[a.type];
            return (
              <article key={a.id} className="studio-activity">
                <span>
                  <Icon size={16} />
                  {formatTime(a.time)} ·{' '}
                  {activityLabels[a.type][lang === 'ko' ? 1 : 0]}
                </span>
                <h4>{a.title}</h4>
                <p>{a.prompt}</p>
                <div className="row wrap">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => edit(a)}
                  >
                    {t('Sửa', '수정')}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setPreview(a)}
                  >
                    <Play size={14} />
                    {t('Thử', '체험')}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      mutate({
                        action: 'archiveActivity',
                        id: a.id,
                        archived: true,
                      }).catch(() => {})
                    }
                  >
                    <Archive size={14} />
                    {t('Ẩn', '숨기기')}
                  </button>
                </div>
              </article>
            );
          })}
          {entries
            .filter((e) => e.kind === 'lessonActivity' && e.payload.archived)
            .map((e) => (
              <div key={e.id} className="archived-activity">
                <span>{e.payload.title}</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    mutate({
                      action: 'archiveActivity',
                      id: e.id,
                      archived: false,
                    }).catch(() => {})
                  }
                >
                  <RotateCcw size={14} />
                  {t('Khôi phục', '복원')}
                </button>
              </div>
            ))}
        </aside>
      </div>
      {preview && (
        <div className="activity-preview">
          <div className="row spread">
            <h2>{t('Trải nghiệm như học viên', '학생 활동 체험')}</h2>
            <button className="text-button" onClick={() => setPreview(null)}>
              {t('Đóng', '닫기')}
            </button>
          </div>
          <ActivityTask
            key={preview.id + preview.revision}
            {...props}
            activity={preview}
            videoUrl={config.videoUrl}
            onContinue={() => setPreview(null)}
          />
        </div>
      )}
      <section className="activity-submissions">
        <h2>{t('Bài làm từ các hoạt động', '활동별 제출 답안')}</h2>
        <p className="fineprint">
          {t(
            'Câu dịch và ghi chú được lưu. Bản thu âm chỉ có trên thiết bị học viên.',
            '번역과 활동 메모를 확인할 수 있습니다. 음성 녹음은 학생 기기에만 저장됩니다.',
          )}
        </p>
        {entries
          .filter((e) => e.kind === 'activityResponse')
          .map((e) => (
            <ResponseReview
              key={e.id + e.payload.revision}
              {...props}
              entry={e}
              activity={activities.find((a) => a.id === e.payload.activityId)}
            />
          ))}
        {!entries.some((e) => e.kind === 'activityResponse') && (
          <p>{t('Chưa có bài làm.', '아직 제출된 활동이 없습니다.')}</p>
        )}
      </section>
    </div>
  );
}
