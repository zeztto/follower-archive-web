import {useState} from 'react';
import type {AnalysisData} from '../types';
import {profileUrl,REPORT_LABELS} from '../utils/archiveAnalysis';
import {Card,CardContent,CardHeader,CardTitle} from './ui/card';
import {Tabs,TabsContent,TabsList,TabsTrigger} from './ui/tabs';
import {Button} from './ui/button';
export type {AnalysisData} from '../types';
function UserList({users}:{users:string[]}){
 const [page,setPage]=useState(0);const pageSize=100;const current=Math.min(page,Math.max(0,Math.ceil(users.length/pageSize)-1));const visible=users.slice(current*pageSize,(current+1)*pageSize);
 if(!users.length)return <p className="py-6 text-muted-foreground">해당하는 계정이 없습니다.</p>;
 return <div className="space-y-3"><ul className="divide-y border rounded-md">{visible.map(user=>{const url=profileUrl(user);return <li key={user} className="p-3">{url?<a href={url} target="_blank" rel="noopener noreferrer" className="underline">@{user}</a>:user}</li>;})}</ul><div className="flex flex-wrap gap-3 items-center"><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>이전 목록</Button><span>{current*pageSize+1}–{Math.min((current+1)*pageSize,users.length)} / {users.length}명</span><Button variant="outline" disabled={(current+1)*pageSize>=users.length} onClick={()=>setPage(current+1)}>다음 목록</Button></div></div>;
}
interface Props {data:AnalysisData;onDownload:(format:'txt'|'html'|'json')=>void;}
export function AnalysisResults({data,onDownload}:Props){
 const categories=['mutual','notFollowingBack','notFollowedBack',...(data.provided??[])] as const;
 return <section className="space-y-6"><p>이 결과는 내보내기 시점의 기록을 비교합니다. 중복 계정은 하나로 집계하며 현재 프로필의 숫자와 다를 수 있습니다.</p>
  <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">{(['followers','following','mutual','notFollowingBack'] as const).map(key=><div key={key} className="border rounded-md p-4"><dt>{key==='notFollowingBack'?'팔로우백 안함':REPORT_LABELS[key]}</dt><dd className="text-2xl font-semibold">{data[key].length}</dd></div>)}</dl>
  <Card><CardHeader><div className="flex flex-wrap justify-between gap-4"><CardTitle>상세 비교</CardTitle><div className="flex flex-wrap gap-2">{(['txt','html','json'] as const).map(format=><Button key={format} variant="outline" onClick={()=>onDownload(format)}>{format.toUpperCase()} 다운로드</Button>)}</div></div></CardHeader><CardContent>
   <Tabs defaultValue="mutual"><TabsList className="w-full h-auto flex-wrap justify-start gap-1">{categories.map(key=><TabsTrigger key={key} value={key}>{key==='mutual'?'맞팔로우':key==='notFollowingBack'?'팔로우백 안함':key==='notFollowedBack'?'내가 팔로우 안함':REPORT_LABELS[key]} ({data[key]?.length??0})</TabsTrigger>)}</TabsList>{categories.map(key=><TabsContent key={key} value={key}><h2 className="my-4">{REPORT_LABELS[key]}</h2><UserList users={data[key]??[]}/></TabsContent>)}</Tabs>
  </CardContent></Card>
 </section>;
}
