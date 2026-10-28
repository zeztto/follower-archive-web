import type {AnalysisData,OptionalCategory} from '../types';
import {ArchiveError,ZIP_LIMITS,inspectZip,readZipEntry} from './zipReader';
export {ArchiveError} from './zipReader';
const USERNAME=/^[a-zA-Z0-9._]{1,30}$/;
type Category='followers'|'following'|OptionalCategory;
const optional:Record<string,{category:OptionalCategory;key:string}>={
 'pending_follow_requests.json':{category:'pendingFollowRequests',key:'relationships_follow_requests_sent'},
 'recent_follow_requests.json':{category:'recentFollowRequests',key:'relationships_permanent_follow_requests'},
 'blocked_profiles.json':{category:'blockedProfiles',key:'relationships_blocked_users'},
 'recently_unfollowed_profiles.json':{category:'recentlyUnfollowed',key:'relationships_unfollowed_users'},
 'removed_suggestions.json':{category:'removedSuggestions',key:'relationships_dismissed_suggested_users'},
};
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
export function parseUsers(value:unknown,key:string):string[]{
 const rows=Array.isArray(value)?value:object(value)&&Array.isArray(value[key])?value[key]:null;
 if(!rows)throw new ArchiveError('관계 JSON의 구조가 올바르지 않습니다.','INVALID_SCHEMA');
 if(rows.length>100000)throw new ArchiveError('관계 파일의 계정 수가 지원 한도를 넘습니다.','ROW_LIMIT');
 return rows.map((row:unknown)=>{
  if(!object(row)||!Array.isArray(row.string_list_data)||row.string_list_data.length!==1||!object(row.string_list_data[0]))throw new ArchiveError('관계 JSON에 올바르지 않은 계정 항목이 있습니다.','INVALID_SCHEMA');
  const data=row.string_list_data[0];const candidate=typeof row.title==='string'&&row.title.trim()?row.title:data.value;
  if(typeof candidate!=='string'||!USERNAME.test(candidate.trim()))throw new ArchiveError('지원하지 않는 계정 이름이 포함되어 있습니다.','INVALID_USERNAME');
  return candidate.trim().toLowerCase();
 });
}
export async function analyzeArchive(file:File,signal?:AbortSignal):Promise<AnalysisData>{
 if(!file.name.toLowerCase().endsWith('.zip'))throw new ArchiveError('ZIP 파일을 선택해 주세요.');
 if(file.size>ZIP_LIMITS.compressed)throw new ArchiveError('ZIP 파일은 100MB 이하만 지원합니다.','COMPRESSED_LIMIT');
 if(!['','application/zip','application/x-zip-compressed','application/octet-stream'].includes(file.type))throw new ArchiveError('ZIP 파일 형식을 확인해 주세요.');
 signal?.throwIfAborted();let buffer:ArrayBuffer;try{buffer=await file.arrayBuffer();}catch{throw new ArchiveError('ZIP 파일을 읽지 못했습니다.','READ_FAILED');}signal?.throwIfAborted();const bytes=new Uint8Array(buffer);const entries=inspectZip(bytes);
 const sets:Record<Category,Set<string>>={followers:new Set(),following:new Set(),pendingFollowRequests:new Set(),recentFollowRequests:new Set(),blockedProfiles:new Set(),recentlyUnfollowed:new Set(),removedSuggestions:new Set()};
 const seen=new Set<Category>();let actualTotal=0;
 for(const entry of entries){
  const name=entry.name.split('/').at(-1)!;let spec:{category:Category;key:string}|undefined;
  if(/^followers(?:_[1-9]\d*)?\.json$/.test(name))spec={category:'followers',key:'relationships_followers'};
  else if(name==='following.json')spec={category:'following',key:'relationships_following'};
  else spec=Object.hasOwn(optional,name)?optional[name]:undefined;
  if(!spec)continue;const raw=await readZipEntry(bytes,entry,signal);actualTotal+=raw.length;
  if(actualTotal>ZIP_LIMITS.expanded)throw new ArchiveError('실제 압축 해제 크기가 전체 한도를 넘습니다.','EXPANDED_LIMIT');
  let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw new ArchiveError('관계 JSON 파일이 손상되었거나 UTF-8 형식이 아닙니다.','INVALID_JSON');}
  for(const user of parseUsers(parsed,spec.key))sets[spec.category].add(user);seen.add(spec.category);
 }
 if(!seen.has('followers')||!seen.has('following'))throw new ArchiveError('followers_1.json과 following.json을 찾을 수 없습니다. JSON 형식의 관계 데이터 ZIP인지 확인해 주세요.','MISSING_FILES');
 const followers=[...sets.followers].sort(),following=[...sets.following].sort();
 const result:AnalysisData={followers,following,mutual:followers.filter(user=>sets.following.has(user)),notFollowingBack:following.filter(user=>!sets.followers.has(user)),notFollowedBack:followers.filter(user=>!sets.following.has(user)),provided:[]};
 for(const {category} of Object.values(optional))if(seen.has(category)){result[category]=[...sets[category]].sort();result.provided!.push(category);}
 return result;
}
export function profileUrl(username:string):string|null{return USERNAME.test(username)?`https://www.instagram.com/${encodeURIComponent(username)}/`:null;}
export function escapeHtml(value:string):string{return value.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));}
export const REPORT_LABELS:Record<keyof Omit<AnalysisData,'provided'>,string>={followers:'팔로워',following:'팔로잉',mutual:'맞팔로우',notFollowingBack:'내가 팔로우하지만 나를 팔로우하지 않는 계정',notFollowedBack:'나를 팔로우하지만 내가 팔로우하지 않는 계정',pendingFollowRequests:'대기 중 요청',recentFollowRequests:'최근 팔로우 요청',blockedProfiles:'차단한 계정',recentlyUnfollowed:'최근 팔로우 취소',removedSuggestions:'제거된 추천'};
export function buildReport(data:AnalysisData,format:'txt'|'html'|'json'):{content:string;mimeType:string}{
 if(format==='json')return {content:JSON.stringify(data,null,2),mimeType:'application/json;charset=utf-8'};
 const sections=Object.entries(REPORT_LABELS).filter(([key])=>Array.isArray(data[key as keyof AnalysisData])).map(([key,label])=>({label,users:data[key as keyof Omit<AnalysisData,'provided'>] as string[]}));
 if(format==='txt')return {content:'팔로워 기록 비교\n\n'+sections.map(({label,users})=>`${label} (${users.length})\n${users.length?users.map((user,index)=>`${index+1}. ${user}`).join('\n'):'계정 없음'}`).join('\n\n'),mimeType:'text/plain;charset=utf-8'};
 return {content:`<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>팔로워 기록 비교</title><style>body{max-width:960px;margin:32px auto;padding:0 20px;font-family:system-ui,sans-serif;line-height:1.65;word-break:keep-all;overflow-wrap:anywhere}section{border-top:1px solid #ddd;margin-top:24px}a{color:#1649a8}</style></head><body><h1>팔로워 기록 비교</h1>${sections.map(({label,users})=>`<section><h2>${escapeHtml(label)} (${users.length})</h2>${users.length?`<ul>${users.map(user=>{const url=profileUrl(user);return `<li>${url?`<a href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(user)}</a>`:escapeHtml(user)}</li>`;}).join('')}</ul>`:'<p>계정 없음</p>'}</section>`).join('')}</body></html>`,mimeType:'text/html;charset=utf-8'};
}
