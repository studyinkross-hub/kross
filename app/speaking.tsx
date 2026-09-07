'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Play,
  Download,
  Volume2,
  Check,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { readClip, storeClip } from '@/lib/media';
import type { LessonActivity } from '@/lib/activities';
import { formatTime } from '@/lib/course';
export function SpeakingRecorder({
  activity,
  videoUrl,
  lang,
  onReady,
}: {
  activity: LessonActivity;
  videoUrl: string;
  lang: string;
  onReady: (ready: boolean, seconds: number) => void;
}) {
  const t = (v: string, k: string) => (lang === 'ko' ? k : v);
  const key = activity.id + ':' + activity.revision + ':' + videoUrl;
  const [url, setUrl] = useState(''),
    [requesting, setRequesting] = useState(false),
    [mime, setMime] = useState('audio/webm'),
    [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState(''),
    [heard, setHeard] = useState(false),
    [ownHeard, setOwnHeard] = useState(false),
    [compared, setCompared] = useState(false),
    [saved, setSaved] = useState(false);
  const currentBlob = useRef<Blob | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    original = useRef<HTMLVideoElement>(null),
    own = useRef<HTMLAudioElement>(null),
    started = useRef(0),
    alive = useRef(true),
    limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    alive.current = true;
    readClip(key)
      .then((b) => {
        if (b && alive.current) {
          currentBlob.current = b.blob;
          setUrl(URL.createObjectURL(b.blob));
          setSeconds(b.seconds);
          setMime(b.blob.type);
          setSaved(true);
        }
      })
      .catch(() => {});
    return () => {
      alive.current = false;
      if (limit.current) clearTimeout(limit.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [key]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    onReady(
      compared &&
        heard &&
        ownHeard &&
        !!url &&
        seconds >= 1 &&
        seconds <= 90 &&
        !recording,
      seconds,
    );
  }, [compared, heard, ownHeard, url, seconds, recording]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(
      () => setSeconds(Math.min(90, (Date.now() - started.current) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [recording]);
  async function accept(blob: Blob, duration = 0) {
    currentBlob.current = blob;
    setMime(blob.type);
    if (!blob.size) return;
    try {
      await storeClip(key, blob, duration);
      if (alive.current) setSaved(true);
    } catch {
      if (alive.current) {
        setSaved(false);
        setError(
          t(
            'Không lưu được vào thiết bị. Hãy tải bản thu xuống.',
            '기기 저장 공간이 부족합니다. 녹음을 내려받아 보관하세요.',
          ),
        );
      }
    }
    if (alive.current) {
      setUrl(URL.createObjectURL(blob));
      setOwnHeard(false);
      setCompared(false);
    }
  }
  async function start() {
    setError('');
    original.current?.pause();
    own.current?.pause();
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError(
        t(
          'Trình duyệt này chưa hỗ trợ thu âm. Hãy chọn tệp âm thanh.',
          '이 브라우저는 녹음을 지원하지 않습니다. 음성 파일을 선택해 주세요.',
        ),
      );
      return;
    }
    setRequesting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(
        (m) => MediaRecorder.isTypeSupported(m),
      );
      const r = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = r;
      const parts: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) parts.push(e.data);
      };
      r.onstop = () => {
        if (limit.current) clearTimeout(limit.current);
        media.getTracks().forEach((t) => t.stop());
        if (alive.current) {
          setRecording(false);
          setSeconds(Math.min(90, (Date.now() - started.current) / 1000));
          void accept(
            new Blob(parts, { type: r.mimeType || 'audio/webm' }),
            Math.min(90, (Date.now() - started.current) / 1000),
          );
        }
      };
      r.onerror = () => {
        media.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setError(
          t(
            'Thu âm bị gián đoạn. Hãy thử lại.',
            '녹음이 중단됐습니다. 다시 시도해 주세요.',
          ),
        );
      };
      started.current = Date.now();
      setRecording(true);
      setSeconds(0);
      setCompared(false);
      setSaved(false);
      r.start();
      limit.current = setTimeout(() => {
        if (r.state === 'recording') r.stop();
      }, 90000);
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      setError(
        t(
          'Cho phép micrô để thu âm, hoặc chọn tệp âm thanh.',
          '녹음하려면 마이크 접근을 허용하거나 음성 파일을 선택해 주세요.',
        ),
      );
    } finally {
      if (alive.current) setRequesting(false);
    }
  }
  function playOriginal() {
    own.current?.pause();
    if (!original.current) return;
    original.current.currentTime = activity.sourceStart;
    original.current
      .play()
      .catch(() =>
        setError(
          t(
            'Không phát được đoạn gốc. Kiểm tra địa chỉ video.',
            '원본 구간을 재생할 수 없습니다. 영상 주소를 확인해 주세요.',
          ),
        ),
      );
  }
  return (
    <div className="speaking-lab">
      <div className="comparison-grid">
        <section>
          <div className="row spread">
            <h3>{t('01 · Nghe bản gốc', '01 · 원본 듣기')}</h3>
            <span>
              {formatTime(activity.sourceStart)}–
              {formatTime(activity.sourceEnd)}
            </span>
          </div>
          <video
            ref={original}
            src={videoUrl}
            playsInline
            preload="metadata"
            controls
            aria-label={t('Đoạn video gốc', '비교할 원본 영상')}
            onTimeUpdate={() => {
              if (
                original.current &&
                original.current.currentTime >= activity.sourceEnd
              ) {
                original.current.pause();
                setHeard(true);
              }
            }}
            onEnded={() => setHeard(true)}
            onPlay={() => own.current?.pause()}
            onError={() =>
              setError(
                t(
                  'Không tải được video gốc.',
                  '원본 영상을 불러오지 못했습니다.',
                ),
              )
            }
          />
          <button
            className="secondary"
            onClick={playOriginal}
            disabled={recording}
          >
            <Volume2 size={17} />
            {t('Nghe đúng đoạn', '지정 구간 듣기')}
          </button>
          {videoUrl === '/lesson-cafe.mp4' && (
            <p className="fineprint">
              {t(
                'Video mẫu không có tiếng. Dùng video lớp học có âm thanh để so sánh phát âm.',
                '예제 영상에는 음성이 없습니다. 발음 비교에는 소리가 있는 수업 영상을 연결하세요.',
              )}
            </p>
          )}
        </section>
        <section>
          <div className="row spread">
            <h3>{t('02 · Giọng của tôi', '02 · 내 목소리')}</h3>
            <span>{formatTime(seconds)} / 01:30</span>
          </div>
          <div className={'record-area ' + (recording ? 'recording' : '')}>
            <Mic size={29} />
            <strong>
              {recording
                ? t('Đang thu âm…', '녹음 중…')
                : url
                  ? t('Bản thu của bạn', '나의 녹음')
                  : t('Đến lượt bạn nói', '이제 내가 말할 차례')}
            </strong>
            <p>{activity.reference || activity.prompt}</p>
            <button
              className={recording ? 'stop-record primary' : 'primary'}
              disabled={requesting}
              onClick={() => (recording ? recorder.current?.stop() : start())}
            >
              {recording ? <Square size={16} /> : <Mic size={16} />}{' '}
              {recording
                ? t('Dừng thu', '녹음 끝내기')
                : url
                  ? t('Thu lại', '다시 녹음')
                  : t('Bắt đầu thu âm', '녹음 시작')}
            </button>
          </div>
          {url && (
            <>
              <audio
                ref={own}
                src={url}
                controls
                aria-label={t('Bản thu của tôi', '내 녹음 듣기')}
                onPlay={() => {
                  original.current?.pause();
                }}
                onEnded={() => setOwnHeard(true)}
                onLoadedMetadata={() => {
                  const d = own.current?.duration;
                  if (d && Number.isFinite(d)) {
                    setSeconds(d);
                    if (currentBlob.current)
                      void storeClip(key, currentBlob.current, d).catch(() =>
                        setSaved(false),
                      );
                    if (d > 90)
                      setError(
                        t(
                          'Chọn bản thu không quá 90 giây.',
                          '90초 이하의 녹음을 선택해 주세요.',
                        ),
                      );
                  }
                }}
                onError={() =>
                  setError(
                    t(
                      'Tệp âm thanh không phát được.',
                      '음성 파일을 재생할 수 없습니다.',
                    ),
                  )
                }
              />
              <a
                className="text-button"
                href={url}
                download={
                  'KROSS-recording.' +
                  (mime.includes('mp4')
                    ? 'm4a'
                    : mime.includes('wav')
                      ? 'wav'
                      : mime.includes('mpeg')
                        ? 'mp3'
                        : mime.includes('ogg')
                          ? 'ogg'
                          : 'webm')
                }
              >
                <Download size={15} />
                {t('Tải bản thu', '녹음 내려받기')}
              </a>
            </>
          )}
          <label className="audio-import">
            <Upload size={15} />
            {t('Hoặc chọn tệp âm thanh', '또는 음성 파일 선택')}
            <input
              type="file"
              accept="audio/*"
              disabled={recording}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 15 * 1024 * 1024 || !f.type.startsWith('audio/')) {
                  setError(
                    t(
                      'Chọn tệp âm thanh dưới 15 MB.',
                      '15MB 이하의 음성 파일을 선택해 주세요.',
                    ),
                  );
                  return;
                }
                setError('');
                setSeconds(0);
                void accept(f);
              }}
            />
          </label>
        </section>
      </div>
      <div className="compare-check">
        <button
          className="secondary"
          aria-pressed={compared}
          disabled={!heard || !ownHeard || recording || seconds > 90}
          onClick={() => setCompared(!compared)}
        >
          <Check size={17} />
          {t(
            'Tôi đã nghe hai bản và tự so sánh',
            '두 녹음을 듣고 직접 비교했어요',
          )}
        </button>
        <p>
          {t(
            'Nghe hết đoạn gốc và bản thu. Chú ý phát âm, nhịp và phần kết câu.',
            '원본 구간과 내 녹음을 끝까지 듣고 발음·속도·문장 끝을 비교하세요.',
          )}
        </p>
      </div>
      <p className="fineprint">
        {t(
          'Bản thu chỉ lưu trên trình duyệt này, không gửi cho giáo viên. Không chấm điểm phát âm tự động.',
          '녹음은 이 브라우저에만 저장되며 선생님께 전송되지 않습니다. 자동 발음 점수는 제공하지 않습니다.',
        )}{' '}
        {saved ? t('Đã lưu trên thiết bị.', '기기에 저장됨.') : ''}
      </p>
      {error && (
        <p role="alert" className="activity-error">
          {error}
        </p>
      )}
    </div>
  );
}
