import {useState} from 'react';
import {UserSearch} from 'lucide-react';
import {FileUploader} from './components/FileUploader';
import {AnalysisResults} from './components/AnalysisResults';
import {HowToUse} from './components/HowToUse';
import {useArchiveAnalysis} from './hooks/useArchiveAnalysis';
import {buildReport} from './utils/archiveAnalysis';
import {saveReport} from './utils/download';
export default function App(){
 const analysis=useArchiveAnalysis();const [downloadStatus,setDownloadStatus]=useState('');
 const upload=(file:File)=>{setDownloadStatus('');void analysis.upload(file);};
 const reset=()=>{setDownloadStatus('');analysis.reset();};
 const download=(format:'txt'|'html'|'json')=>{
  if(!analysis.data)return;
  try{const {content,mimeType}=buildReport(analysis.data,format);saveReport(content,mimeType,format);setDownloadStatus(`${format.toUpperCase()} 파일 다운로드를 시작했습니다.`);}
  catch{setDownloadStatus('파일 다운로드를 시작하지 못했습니다. 다시 시도해 주세요.');}
 };
 return <div className="min-h-screen bg-background py-8 px-4"><main className="max-w-6xl mx-auto space-y-8">
  <header className="space-y-3"><div className="flex items-center gap-3"><UserSearch className="h-8 w-8"/><h1>팔로워 기록 비교</h1></div><p>Meta에서 내보낸 JSON ZIP의 팔로워와 팔로잉을 비교합니다.</p></header>
  {analysis.error&&<p role="alert" className="border border-destructive rounded-md p-4 text-destructive">{analysis.error}</p>}
  {!analysis.data?<><FileUploader onFileUpload={upload} isLoading={analysis.loading}/><HowToUse/></>:<><AnalysisResults data={analysis.data} onDownload={download}/><button type="button" onClick={reset} className="underline">다른 ZIP 파일 선택</button></>}
  {downloadStatus&&<p role="status">{downloadStatus}</p>}
  <footer className="border-t pt-4 text-sm text-muted-foreground">파일과 결과는 브라우저 메모리에서 처리합니다. Meta·Instagram과 제휴하지 않은 독립 도구입니다.</footer>
 </main></div>;
}
