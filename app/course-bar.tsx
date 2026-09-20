'use client';
import {useEffect,useState} from 'react';
import {ChevronDown,ChevronLeft,ChevronRight,ListVideo,Save,Trash2,Upload} from 'lucide-react';
import {formatTime,parseTime} from '@/lib/course';

type Video={id:string;title:string;level:string;lessonNumber:number;lessonTitle:string;duration:number;videoUrl:string};
type UploadSession={key:string;uploadId:string;url:string};
type UploadedPart={partNumber:number;etag:string};
const levels=['기초+초급1','초급2','초급회화','중급1','중급2','중급회화','TOPIK1','TOPIK2 3·4급','TOPIK2 5·6급'];

export function CourseBar({lang,teacher=false}:{lang:string;teacher?:boolean;initialVideo?:Partial<Video>&{isCatalog?:boolean}}){
  const [videos,setVideos]=useState<Video[]>([]),[open,setOpen]=useState(teacher),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[level,setLevel]=useState('기초+초급1'),[videoUrl,setVideoUrl]=useState('');
  const [lessonNumber,setLessonNumber]=useState('1'),[lessonTitle,setLessonTitle]=useState(''),[clipTitle,setClipTitle]=useState(''),[duration,setDuration]=useState('');
  const [selected,setSelected]=useState('');
  const t=(ko:string,vi:string)=>lang==='ko'?ko:vi;

  useEffect(()=>{
    fetch('/api/course').then(r=>{if(!r.ok)throw Error();return r.json() as Promise<{videos:Video[]}>;})
      .then(data=>{setSelected(new URLSearchParams(location.search).get('lesson')||'');setVideos(data.videos);})
      .catch(()=>setError(lang==='ko'?'영상 목록을 불러오지 못했어요.':'Không tải được danh sách video.'));
  },[lang]);

  const current=videos.find(video=>video.id===selected);
  const items=videos.filter(video=>teacher?video.level===level:current?video.level===current.level:true);
  const index=items.findIndex(video=>video.id===selected);
  const groups=items.reduce<Array<{key:string;number:number;title:string;videos:Video[]}>>((result,video)=>{
    const key=`${video.level}:${video.lessonNumber}:${video.lessonTitle}`;
    const group=result.find(item=>item.key===key);
    if(group)group.videos.push(video);else result.push({key,number:video.lessonNumber,title:video.lessonTitle,videos:[video]});
    return result;
  },[]).sort((a,b)=>a.number-b.number);

  function go(id:string){
    const url=new URL(location.href);url.searchParams.set('lesson',id);url.hash=teacher?'teacher':'lesson';location.assign(url.href);
  }

  async function upload(file:File){
    setError('');setNotice('');setBusy(true);setProgress(0);setVideoUrl('');
    let session:UploadSession|null=null;
    try{
      const type=file.type||(/\.webm$/i.test(file.name)?'video/webm':'video/mp4');
      const init=await fetch('/api/media?action=init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,type,size:file.size})});
      const initData=await init.json() as UploadSession&{error?:string};
      if(!init.ok){if(init.status===403)window.dispatchEvent(new Event('kross-teacher-locked'));throw Error(initData.error||'INIT_FAILED');}
      session=initData;
      const chunkSize=8*1024*1024,parts:UploadedPart[]=[];
      const partNumbers=Array.from({length:Math.ceil(file.size/chunkSize)},(_,partIndex)=>partIndex+1);
      for(const partNumber of partNumbers){
        const offset=(partNumber-1)*chunkSize,chunk=file.slice(offset,Math.min(offset+chunkSize,file.size),type);
        const partUrl=`/api/media?action=part&key=${encodeURIComponent(session.key)}&uploadId=${encodeURIComponent(session.uploadId)}&partNumber=${partNumber}`;
        let savedPart:UploadedPart|null=null,lastError='PART_FAILED';
        for(let attempt=1;attempt<=3&&!savedPart;attempt++){
          const response=await fetch(partUrl,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:chunk});
          const data=await response.json() as UploadedPart&{error?:string};
          if(response.ok)savedPart={partNumber:data.partNumber,etag:data.etag};
          else lastError=data.error||lastError;
        }
        if(!savedPart)throw Error(lastError);
        parts.push(savedPart);
        setProgress(Math.round(Math.min(file.size,offset+chunk.size)/file.size*100));
      }
      const complete=await fetch('/api/media?action=complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:session.key,uploadId:session.uploadId,parts})});
      const completed=await complete.json() as {url?:string;error?:string};
      if(!complete.ok||!completed.url)throw Error(completed.error||'COMPLETE_FAILED');
      setVideoUrl(completed.url);setProgress(100);
      setNotice(t('업로드 완료. 아래의 “이 영상 저장”을 누르면 1개 영상으로 저장됩니다.','Tải lên hoàn tất. Nhấn “Lưu video này” để lưu thành một video riêng.'));
    }catch{
      if(session)fetch('/api/media',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:session.key,uploadId:session.uploadId})}).catch(()=>{});
      setProgress(0);setError(t('업로드에 실패했습니다. 인터넷 연결을 확인한 뒤 다시 선택해 주세요.','Tải lên thất bại. Kiểm tra mạng rồi chọn lại tệp.'));
    }finally{setBusy(false);}
  }

  async function remove(video:Video){
    if(!confirm(t(`‘${video.title}’ 영상과 이 영상에 넣은 과제를 삭제할까요?`,`Xóa video “${video.title}” cùng các bài tập trong video này?`)))return;
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/course',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:video.id})});
      if(!response.ok){if(response.status===403)window.dispatchEvent(new Event('kross-teacher-locked'));throw Error();}
      setVideos(list=>list.filter(item=>item.id!==video.id));
      if(selected===video.id){const url=new URL(location.href);url.searchParams.delete('lesson');url.hash='teacher';location.assign(url.href);}
      else setNotice(t('영상 1개가 삭제됐습니다.','Đã xóa một video.'));
    }catch{setError(t('영상을 삭제하지 못했습니다. 다시 시도해 주세요.','Không thể xóa video. Vui lòng thử lại.'));}
    finally{setBusy(false);}
  }

  async function saveClip(event:React.SyntheticEvent<HTMLFormElement>){
    event.preventDefault();setError('');setNotice('');setBusy(true);
    try{
      const seconds=parseTime(duration),number=Number(lessonNumber);
      if(!videoUrl||!lessonTitle.trim()||!clipTitle.trim()||!Number.isInteger(number)||number<1||!Number.isInteger(seconds)||seconds<10)throw Error('INVALID');
      const response=await fetch('/api/course',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:clipTitle,level,lessonNumber:number,lessonTitle,videoUrl,duration:seconds})});
      const data=await response.json() as {video?:Video;error?:string};
      if(!response.ok||!data.video){if(response.status===403)window.dispatchEvent(new Event('kross-teacher-locked'));throw Error(data.error||'SAVE_FAILED');}
      setVideos(list=>[...list,data.video!]);setClipTitle('');setDuration('');setVideoUrl('');setProgress(0);
      setNotice(t(`제${number}과에 영상 1개를 저장했습니다. 같은 과의 다음 영상을 계속 올릴 수 있습니다.`,`Đã lưu một video vào Bài ${number}. Bạn có thể tiếp tục tải video tiếp theo của cùng bài.`));
    }catch{setError(t('과 번호·과 제목·영상 제목·영상 길이와 업로드 상태를 확인해 주세요.','Kiểm tra số bài, tên bài, tên video, thời lượng và trạng thái tải lên.'));}
    finally{setBusy(false);}
  }

  return <section className="course-bar">
    <div className="course-bar-summary">
      <button className="course-bar-title" aria-expanded={open} onClick={()=>setOpen(!open)}><ListVideo size={18}/><strong>{current?`${current.level} · 제${current.lessonNumber}과`:`${level} · ${t('수업 목록','Danh sách bài học')}`}</strong><span>{items.length?`${Math.max(0,index)+1} / ${items.length}`:'0'}</span><ChevronDown size={16}/></button>
      <div className="course-step"><span>{current?`${current.lessonTitle} · ${current.title}`:t('저장된 영상을 선택하세요','Chọn video đã lưu')}</span><button disabled={index<=0} onClick={()=>go(items[index-1].id)} aria-label={t('이전 영상','Video trước')}><ChevronLeft size={18}/></button><button disabled={index<0||index>=items.length-1} onClick={()=>go(items[index+1].id)} aria-label={t('다음 영상','Video tiếp theo')}><ChevronRight size={18}/></button></div>
    </div>
    {open&&<div className="course-lessons">
      {!groups.length&&<p className="course-empty">{t('아직 저장된 영상이 없습니다. 아래에서 첫 영상을 올려 주세요.','Chưa có video nào được lưu. Hãy tải video đầu tiên ở bên dưới.')}</p>}
      {groups.map(group=><section className="course-lesson-group" key={group.key}>
        <div className="course-lesson-heading"><strong>{t(`제${group.number}과`,`Bài ${group.number}`)} · {group.title}</strong><span>{group.videos.length}{t('개 영상',' video')}</span></div>
        <div className="course-video-list">{group.videos.map((video,videoIndex)=><article key={video.id} className={selected===video.id?'selected':''}>
          <button className="course-video-open" onClick={()=>go(video.id)} aria-current={selected===video.id?'page':undefined}><span>{String(videoIndex+1).padStart(2,'0')}</span><strong>{video.title}</strong><small>{formatTime(video.duration)}</small></button>
          {teacher&&<button className="course-video-delete" disabled={busy} onClick={()=>remove(video)} aria-label={t(`${video.title} 삭제`,`Xóa ${video.title}`)}><Trash2 size={15}/></button>}
        </article>)}</div>
      </section>)}
    </div>}
    {error&&<p role="alert" className="course-message error">{error}</p>}
    {notice&&<output className="course-message">{notice}</output>}
    {teacher&&<form className="course-add" onSubmit={saveClip}>
      <h3>{t('과에 영상 1개 추가','Thêm một video vào bài')}</h3>
      <p>{t('같은 1과에 영상이 3개라면 이 저장 절차를 3번 반복하세요. 각 영상마다 과제를 따로 설정할 수 있습니다.','Nếu Bài 1 có 3 video, hãy lưu 3 lần. Mỗi video có thể đặt bài tập riêng.')}</p>
      <label>{t('과정','Khóa học')}<select value={level} onChange={event=>setLevel(event.target.value)}>{levels.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>{t('과 번호','Số bài')}<input type="number" min="1" max="999" value={lessonNumber} onChange={event=>setLessonNumber(event.target.value)} required/></label>
      <label>{t('과 제목','Tên bài')}<input value={lessonTitle} onChange={event=>setLessonTitle(event.target.value)} placeholder={t('예: 자기소개','Ví dụ: Giới thiệu bản thân')} required maxLength={120}/></label>
      <label>{t('영상 제목','Tên video')}<input value={clipTitle} onChange={event=>setClipTitle(event.target.value)} placeholder={t('예: 회화 듣기 1','Ví dụ: Nghe hội thoại 1')} required maxLength={120}/></label>
      <label className="file-upload"><Upload size={16}/>{t('이 영상 파일 올리기','Tải tệp video này')}<input type="file" accept="video/mp4,video/webm" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);}}/><small>{busy?t(`업로드 중 ${progress}%`,`Đang tải lên ${progress}%`):videoUrl?t('업로드 완료 · 아래 저장 버튼을 누르세요','Đã tải lên · Nhấn nút lưu bên dưới'):t('MP4 또는 WebM · 영상마다 따로 업로드','MP4 hoặc WebM · tải riêng từng video')}</small>{busy&&<progress max="100" value={progress}/>}</label>
      <label>{t('이 영상의 길이 · 시:분:초','Thời lượng video · giờ:phút:giây')}<input value={duration} onChange={event=>setDuration(event.target.value)} placeholder="00:20:00" required/></label>
      <button className="primary" disabled={busy||!videoUrl}><Save size={16}/>{t('이 영상 저장','Lưu video này')}</button>
      <p>{t('저장된 영상 카드를 선택하면 그 영상에 정지 시점과 과제를 넣을 수 있습니다.','Chọn thẻ video đã lưu để thêm điểm dừng và bài tập cho video đó.')}</p>
    </form>}
  </section>;
}
