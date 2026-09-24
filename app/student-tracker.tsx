'use client';
import {useEffect,useState} from 'react';
import {Users,RefreshCw} from 'lucide-react';
type Student={id:string;name:string;courses:Array<{title:string;level:string}>;videosStarted:number;activitiesCompleted:number;lastActivity:string|null;progress:Array<{lessonId:string;seconds:number}>};
export function StudentTracker({lang}:{lang:string}){
  const [students,setStudents]=useState<Student[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[selected,setSelected]=useState('');
  const t=(ko:string,vi:string)=>lang==='ko'?ko:vi;
  function load(){setLoading(true);setError(false);fetch('/api/students').then(async response=>{if(!response.ok)throw Error();return await response.json() as {students:Student[]};}).then(data=>setStudents(data.students)).catch(()=>setError(true)).finally(()=>setLoading(false));}
  useEffect(load,[]);
  const current=students.find(item=>item.id===selected);
  return <section className="student-tracker"><div className="tracker-heading"><div><Users size={20}/><h2>{t('학생별 학습 현황','Tiến độ từng học viên')}</h2></div><button onClick={load} aria-label={t('새로고침','Làm mới')}><RefreshCw size={17}/></button></div>{loading?<p>{t('불러오는 중…','Đang tải…')}</p>:error?<p role="alert">{t('학생 기록을 불러오지 못했습니다.','Không tải được dữ liệu học viên.')}</p>:students.length===0?<p>{t('가입한 학생이 아직 없습니다.','Chưa có học viên đăng ký.')}</p>:<div className="tracker-list">{students.map(item=><button className={selected===item.id?'selected':''} key={item.id} onClick={()=>setSelected(item.id)}><span><strong>{item.name}</strong><small>{item.courses.map(course=>course.title).join(' · ')||t('과정 미배정','Chưa có khóa học')}</small></span><span>{item.videosStarted} {t('영상','video')}</span></button>)}</div>}{current&&<div className="tracker-detail"><h3>{current.name}</h3><div><span>{t('시작한 영상','Video đã bắt đầu')}<strong>{current.videosStarted}</strong></span><span>{t('완료한 연습','Bài tập hoàn thành')}<strong>{current.activitiesCompleted}</strong></span></div><p>{t('최근 학습','Học gần đây')}: {current.lastActivity?new Date(current.lastActivity).toLocaleString(lang==='ko'?'ko-KR':'vi-VN'):t('기록 없음','Chưa có')}</p>{current.progress.length>0&&<ul>{current.progress.map(item=><li key={item.lessonId}>{t('영상','Video')} {item.lessonId.slice(0,8)} · {Math.floor(item.seconds/60)}{t('분 학습',' phút đã học')}</li>)}</ul>}</div>}</section>;
}
