import {useRef,useState} from 'react';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from './ui/card';
import {Button} from './ui/button';
import {Upload} from 'lucide-react';
interface FileUploaderProps {onFileUpload:(file:File)=>void;isLoading:boolean;}
export function FileUploader({onFileUpload,isLoading}:FileUploaderProps){
 const input=useRef<HTMLInputElement>(null);const [dragging,setDragging]=useState(false);
 return <Card className="w-full max-w-2xl"><CardHeader><CardTitle>관계 데이터 ZIP 선택</CardTitle><CardDescription>JSON 형식의 followers·following 파일이 포함된 ZIP을 선택해 주세요. 최대100MB를 지원합니다.</CardDescription></CardHeader><CardContent>
  <div className={`border-2 border-dashed rounded-lg p-6 text-center ${dragging?'border-primary':'border-border'}`} onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);const file=event.dataTransfer.files[0];if(file)onFileUpload(file);}}>
   <Upload className="mx-auto h-8 w-8 mb-4"/><p className="mb-4" role="status">{isLoading?'ZIP을 분석하고 있습니다. 다른 파일을 선택하면 현재 작업을 취소합니다.':'ZIP을 놓거나 파일 선택 버튼을 누르세요.'}</p>
   <Button type="button" onClick={()=>input.current?.click()}>파일 선택</Button>
   <input ref={input} aria-label="관계 ZIP 파일" type="file" accept=".zip,application/zip" className="hidden" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)onFileUpload(file);}}/>
  </div>
 </CardContent></Card>;
}
