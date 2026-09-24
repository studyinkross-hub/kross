'use client';

import type {Lang} from '@/lib/course';

type Level={id:string;ko:string;vi:string};

export function NotebookRoadmap({levels,level,lang,count,onSelect}:{levels:Level[];level:string;lang:Lang;count:(id:string)=>number;onSelect:(id:string)=>void}){
  return <section className="notebook-roadmap" aria-label={lang==='ko'?'학습 경로':'Lộ trình học'}>
    <div className="roadmap-heading"><strong>{lang==='ko'?'학습 경로':'LỘ TRÌNH HỌC'}</strong><span>{lang==='ko'?'초급 → 중급 → TOPIK':'Sơ cấp → Trung cấp → TOPIK'}</span></div>
    <div className="roadmap-steps">{levels.map((item,index)=><button type="button" key={item.id} className={`${level===item.id?'selected ':''}${index<2?'beginner':index<4?'intermediate':'topik'}`} onClick={()=>onSelect(item.id)} aria-current={level===item.id?'step':undefined}>
      <span className="roadmap-number">{String(index+1).padStart(2,'0')}</span>
      <span className="roadmap-name">{lang==='ko'?item.ko:item.vi}</span>
      <span className="roadmap-meta">{level===item.id?(lang==='ko'?'↑ 지금 보는 과정':'↑ bạn đang xem'):`${count(item.id)} video`}</span>
    </button>)}</div>
  </section>;
}
