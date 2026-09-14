'use client';
import {useEffect,useState,type RefObject} from 'react';
import {Play,Pause} from 'lucide-react';
import {formatTime} from '@/lib/course';

/** Playback follows the real media; waveform peaks are decoded from the source. */
export function AudioStrip({target,src,start=0,duration,disabled=false,label,onPlay}:{target:RefObject<HTMLMediaElement|null>;src:string;start?:number;duration:number;disabled?:boolean;label:string;onPlay?:()=>void}) {
 const [playing,setPlaying]=useState(false),[position,setPosition]=useState(0),[peaks,setPeaks]=useState<number[]>([]),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const el=target.current;if(!el)return;
  const sync=()=>{setPlaying(!el.paused);setPosition(Math.max(0,el.currentTime-start));};
  ['play','pause','timeupdate','ended','loadedmetadata'].forEach(e=>el.addEventListener(e,sync));
  return ()=>{['play','pause','timeupdate','ended','loadedmetadata'].forEach(e=>el.removeEventListener(e,sync));};
 },[src,start,target]);
 useEffect(()=>{
  setPeaks([]);setFailed(false);if(!src || disabled || !src.startsWith('blob:'))return;
  const controller=new AbortController();let context:AudioContext|undefined;
  (async()=>{try {const bytes=await (await fetch(src,{signal:controller.signal})).arrayBuffer();context=new AudioContext();const buffer=await context.decodeAudioData(bytes);const channel=buffer.getChannelData(0);const slice=channel.subarray(Math.floor(start*buffer.sampleRate),Math.min(channel.length,Math.floor((start+duration)*buffer.sampleRate)));const bins=Array.from({length:48},(_,i)=>{const a=Math.floor(i*slice.length/48),b=Math.floor((i+1)*slice.length/48);let peak=0;for(let j=a;j<b;j++)peak=Math.max(peak,Math.abs(slice[j]));return peak;});if(!controller.signal.aborted)setPeaks(bins);}catch{}finally{void context?.close();}})();
  return ()=>controller.abort();
 },[src,start,duration,disabled]);
 async function toggle(){const el=target.current;if(!el || disabled)return;setFailed(false);if(!el.paused){el.pause();return;}if(el.currentTime<start || el.currentTime>=start+duration-.05)el.currentTime=start;try{if(onPlay)onPlay();else await el.play();}catch{setFailed(true);}}
 return <div className="audio-strip"><button type="button" className="audio-play" disabled={disabled} onClick={toggle} aria-label={label} aria-pressed={playing}>{playing?<Pause size={18}/>:<Play size={18} fill="currentColor"/>}</button><div className="audio-signal" aria-hidden="true">{peaks.length?<svg viewBox="0 0 240 40" preserveAspectRatio="none">{peaks.map((p,i)=><line key={i} x1={i*5+2} x2={i*5+2} y1={20-Math.max(1,p*18)} y2={20+Math.max(1,p*18)} stroke={i/48<=position/Math.max(duration,1)?'#1b5140':'#9cafa4'} strokeWidth="2"/>)}</svg>:<span className="audio-baseline"><i style={{width:Math.min(100,position/Math.max(duration,1)*100)+'%'}}/></span>}</div><time>{disabled?'—':formatTime(playing?position:duration)}</time>{failed&&<span role="alert">재생 오류</span>}</div>;
}
