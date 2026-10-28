import {useCallback,useEffect,useRef,useState} from 'react';
import type {AnalysisData} from '../types';
import {analyzeArchive} from '../utils/archiveAnalysis';
export function useArchiveAnalysis(){
 const [data,setData]=useState<AnalysisData|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false);
 const generation=useRef(0),abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>{generation.current++;abort.current?.abort();},[]);
 const reset=useCallback(()=>{generation.current++;abort.current?.abort();abort.current=null;setData(null);setError(null);setLoading(false);},[]);
 const upload=useCallback(async(file:File)=>{
  const request=++generation.current;abort.current?.abort();const controller=new AbortController();abort.current=controller;setData(null);setError(null);setLoading(true);
  try{const result=await analyzeArchive(file,controller.signal);if(request===generation.current&&!controller.signal.aborted)setData(result);}
  catch(error){if(request===generation.current&&!controller.signal.aborted)setError(error instanceof Error?error.message:'파일을 처리하지 못했습니다.');}
  finally{if(request===generation.current){setLoading(false);abort.current=null;}}
 },[]);
 return {data,error,loading,upload,reset};
}
