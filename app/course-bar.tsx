'use client';
import {useEffect,useState} from 'react';
import {ChevronDown,ChevronLeft,ChevronRight,ListVideo,Plus,Trash2,Upload} from 'lucide-react';
import {formatTime,parseTime} from '@/lib/course';

type Video={id:string;title:string;level:string;duration:number;videoUrl:string};
type UploadSession={key:string;uploadId:string;url:string};
type UploadedPart={partNumber:number;etag:string};
const demo:Video={id:'',title:'카페에서 주문하기',level:'기초+초급1',duration:60,videoUrl:'/lesson-cafe.mp4'};
const levels=['기초+초급1','초급2','초급회화','중급1','중급2','중급회화','TOPIK1','TOPIK2 3·4급','TOPIK2 5·6급'];
const initialCourseVideo=(initial?:Partial<Video>&{isCatalog?:boolean}):Video=>initial&&!initial.isCatalog?{...demo,...initial,id:'',level:'기초+초급1'}:demo;

export function CourseBar({lang,teacher=false,initialVideo}:{lang:string;teacher?:boolean;initialVideo?:Partial<Video>&{isCatalog?:boolean}}){
  const [videos,setVideos]=useState<Video[]>(()=>[initialCourseVideo(initialVideo)]);
  const [open,setOpen]=useState(teacher),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[level,setLevel]=useState('기초+초급1'),[videoUrl,setVideoUrl]=useState('');
  const [selected,setSelected]=useState('');
  const t=(ko:string,vi:string)=>lang==='ko'?ko:vi;

  useEffect(()=>{
    fetch('/api/course').then(r=>{if(!r.ok)throw Error();return r.json() as Promise<{videos:Video[]}>;})
      .then(d=>{setSelected(new URLSearchParams(location.search).get('lesson')||'');setVideos(currentVideos=>[currentVideos[0],...d.videos]);})
      .catch(()=>setError(lang==='ko'?'영상 목록을 불러오지 못했어요.':'Không tải được danh sách video.'));
  },[lang]);

  const current=videos.find(v=>v.id===selected)||demo;
  const items=videos.filter(v=>v.level===(teacher?level:current.level));
  const index=items.findIndex(v=>v.id===selected);

  function go(id:string){
    const url=new URL(location.href);
    if(id)url.searchParams.set('lesson',id);else url.searchParams.delete('lesson');
    url.hash=teacher?'teacher':'lesson';
    location.assign(url.href);
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
      const partNumbers=Array.from({length:Math.ceil(file.size/chunkSize)},(_,index)=>index+1);
      for(const partNumber of partNumbers){
        const offset=(partNumber-1)*chunkSize;
        const chunk=file.slice(offset,Math.min(offset+chunkSize,file.size),type);
        const partUrl=`/api/media?action=part&key=${encodeURIComponent(session.key)}&uploadId=${encodeURIComponent(session.uploadId)}&partNumber=${partNumber}`;
        const response=await fetch(partUrl,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:chunk});
        const data=await response.json() as UploadedPart&{error?:string};
        if(!response.ok)throw Error(data.error||'PART_FAILED');
        parts.push({partNumber:data.partNumber,etag:data.etag});
        setProgress(Math.round(Math.min(file.size,offset+chunk.size)/file.size*100));
      }
      const complete=await fetch('/api/media?action=complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:session.key,uploadId:session.uploadId,parts})});
      const completed=await complete.json() as {url?:string;error?:string};
      if(!complete.ok||!completed.url)throw Error(completed.error||'COMPLETE_FAILED');
      setVideoUrl(completed.url);setProgress(100);
      setNotice(t('업로드가 완료됐습니다. 제목과 길이를 확인하고 영상 등록을 누르세요.','Tải lên hoàn tất. Kiểm tra tiêu đề, thời lượng rồi nhấn Thêm video.'));
    }catch{
      if(session)fetch('/api/media',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:session.key,uploadId:session.uploadId})}).catch(()=>{});
      setProgress(0);
      setError(t('업로드에 실패했습니다. 인터넷 연결을 확인한 뒤 다시 선택해 주세요.','Tải lên thất bại. Kiểm tra mạng rồi chọn lại tệp.'));
    }finally{setBusy(false);}
  }

  async function remove(video:Video){
    if(!video.id||!confirm(t(`‘${video.title}’ 영상과 이 영상의 활동·진도를 삭제할까요?`,`Xóa video “${video.title}” cùng hoạt động và tiến độ của video này?`)))return;
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/course',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:video.id})});
      if(!response.ok){if(response.status===403)window.dispatchEvent(new Event('kross-teacher-locked'));throw Error();}
      setVideos(list=>list.filter(item=>item.id!==video.id));
      if(selected===video.id)go('');
      else setNotice(t('영상이 삭제됐습니다.','Video đã được xóa.'));
    }catch{setError(t('영상을 삭제하지 못했습니다. 다시 시도해 주세요.','Không thể xóa video. Vui lòng thử lại.'));}
    finally{setBusy(false);}
  }

  return <section className="course-bar">
    <div className="course-bar-summary">
      <button className="course-bar-title" aria-expanded={open} onClick={()=>setOpen(!open)}><ListVideo size={18}/><strong>{current.level} · {t('전체 영상','Tất cả video')}</strong><span>{Math.max(0,index)+1} / {items.length}</span><ChevronDown size={16}/></button>
      <div className="course-step"><span>{current.title}</span><button disabled={index<=0} onClick={()=>go(items[index-1].id)} aria-label={t('이전 영상','Video trước')}><ChevronLeft size={18}/></button><button disabled={index<0||index>=items.length-1} onClick={()=>go(items[index+1].id)} aria-label={t('다음 영상','Video tiếp theo')}><ChevronRight size={18}/></button></div>
    </div>
    {open&&<div className="course-video-list">
      {items.map((video,i)=><article key={video.id} className={selected===video.id?'selected':''}>
        <button className="course-video-open" onClick={()=>go(video.id)} aria-current={selected===video.id?'page':undefined}><span>{String(i+1).padStart(2,'0')}</span><strong>{video.title}</strong><small>{formatTime(video.duration)}{!video.id?' · DEMO':''}</small></button>
        {teacher&&video.id&&<button className="course-video-delete" disabled={busy} onClick={()=>remove(video)} aria-label={t(`${video.title} 삭제`,`Xóa ${video.title}`)}><Trash2 size={15}/></button>}
      </article>)}
      {items.length===1&&<p>{t('현재 등록된 영상은 1개입니다. 강사 공간에서 추가하면 이 목록에 표시됩니다.','Hiện có 1 video. Video giáo viên thêm sẽ xuất hiện tại đây.')}</p>}
    </div>}
    {error&&<p role="alert" className="course-message error">{error}</p>}
    {notice&&<output className="course-message">{notice}</output>}
    {teacher&&<form className="course-add" onSubmit={async event=>{
      event.preventDefault();setError('');setNotice('');setBusy(true);
      const form=event.currentTarget,formData=new FormData(form);
      try{
        const durationValue=formData.get('duration');
        const duration=parseTime(typeof durationValue==='string'?durationValue:'');
        if(!Number.isInteger(duration)||duration<10)throw Error('DURATION');
        const response=await fetch('/api/course',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:formData.get('title'),level,videoUrl,duration})});
        const data=await response.json() as {video?:Video;error?:string};
        if(!response.ok||!data.video){if(response.status===403)window.dispatchEvent(new Event('kross-teacher-locked'));throw Error(data.error||'SAVE_FAILED');}
        setVideos(list=>[...list,data.video!]);form.reset();setVideoUrl('');setProgress(0);setNotice(t('영상이 과정에 저장됐습니다.','Video đã được lưu vào khóa học.'));
      }catch{setError(t('제목, 영상 업로드 상태와 영상 길이를 확인해 주세요.','Kiểm tra tiêu đề, trạng thái tải lên và thời lượng video.'));}
      finally{setBusy(false);}
    }}>
      <h3>{t('교육과정에 영상 추가','Thêm video vào khóa học')}</h3>
      <label>{t('과정','Khóa học')}<select value={level} onChange={event=>setLevel(event.target.value)}>{levels.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>{t('수업 제목','Tên bài học')}<input name="title" required maxLength={120}/></label>
      <label className="file-upload"><Upload size={16}/>{t('영상 파일 직접 올리기','Tải tệp video trực tiếp')}<input type="file" accept="video/mp4,video/webm" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);}}/><small>{busy?t(`업로드 중 ${progress}%`,`Đang tải lên ${progress}%`):videoUrl?t('업로드 완료 · 이제 영상 등록을 누르세요','Đã tải lên · Bây giờ nhấn Thêm video'):t('MP4 또는 WebM · 대용량 분할 업로드 지원','MP4 hoặc WebM · hỗ trợ tải tệp lớn')}</small>{busy&&<progress max="100" value={progress}/>}</label>
      <label>{t('길이 · 분:초 또는 시:분:초','Thời lượng · giờ:phút:giây')}<input name="duration" placeholder="01:00:00" required/></label>
      <button className="primary" disabled={busy||!videoUrl}><Plus size={16}/>{t('영상 등록','Thêm video')}</button>
      <p>{t('업로드 완료 후 영상 등록을 눌러야 과정 목록에 저장됩니다.','Sau khi tải lên, nhấn Thêm video để lưu vào danh sách khóa học.')}</p>
    </form>}
  </section>;
}
