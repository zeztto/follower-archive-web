export interface ZipLimits {compressed:number;expanded:number;entry:number;files:number;ratio:number;}
export const ZIP_LIMITS:Readonly<ZipLimits> = Object.freeze({compressed:100*1024*1024, expanded:100*1024*1024, entry:20*1024*1024, files:2000, ratio:200});
export class ArchiveError extends Error { constructor(message:string,public readonly code='INVALID_ARCHIVE'){super(message);this.name='ArchiveError';} }
export interface ZipEntry {name:string;method:number;compressed:number;expanded:number;crc:number;offset:number;}
const fail=(message='지원하는 ZIP 구조가 아니거나 파일이 손상되었습니다.'):never=>{throw new ArchiveError(message);};

/** Validate directory and local records before any decompression; do not extract paths to disk. */
export function inspectZip(bytes:Uint8Array, limits:ZipLimits=ZIP_LIMITS):ZipEntry[]{
 if(bytes.byteLength>limits.compressed)throw new ArchiveError('ZIP 파일은 100MB 이하만 지원합니다.','COMPRESSED_LIMIT');
 if(bytes.length<22)fail();
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break;}
 if(end<0)fail();
 const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),start=view.getUint32(end+16,true);
 if(view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0||view.getUint16(end+8,true)!==count||count===65535||size===0xffffffff||start===0xffffffff)fail('암호화·분할 ZIP·ZIP64 형식은 지원하지 않습니다.');
 if(count>limits.files)throw new ArchiveError('ZIP 안의 파일 수가 지원 한도를 넘습니다.','FILE_COUNT_LIMIT');
 if(start+size!==end)fail();
 let cursor=start,total=0,totalCompressed=0;const entries:ZipEntry[]=[];const names=new Set<string>();
 for(let n=0;n<count;n++){
  if(cursor+46>end||view.getUint32(cursor,true)!==0x02014b50)fail();
  const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),crc=view.getUint32(cursor+16,true),compressed=view.getUint32(cursor+20,true),expanded=view.getUint32(cursor+24,true);
  const nameLength=view.getUint16(cursor+28,true),extraLength=view.getUint16(cursor+30,true),commentLength=view.getUint16(cursor+32,true),local=view.getUint32(cursor+42,true),recordEnd=cursor+46+nameLength+extraLength+commentLength;
  if(view.getUint16(cursor+6,true)>20)fail('ZIP64 또는 지원하지 않는 ZIP 버전입니다.');
  if((flags&0x41)!==0||![0,8].includes(method)||view.getUint16(cursor+34,true)!==0)fail('암호화되었거나 지원하지 않는 압축 방식입니다.');
  if(recordEnd>end||compressed===0xffffffff||expanded===0xffffffff||local===0xffffffff)fail();
  let name='';try{name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(cursor+46,cursor+46+nameLength));}catch{fail('파일명이 UTF-8 형식이 아닙니다.');}
  if(!name||name.startsWith('/')||name.includes('\\')||name.includes('\0')||name.split('/').some(part=>part==='..'||part==='.'))fail('지원하지 않는 ZIP 경로입니다.');
  if(names.has(name))fail('같은 경로의 파일이 중복된 ZIP은 지원하지 않습니다.');names.add(name);
  totalCompressed+=compressed;if(totalCompressed>limits.compressed)throw new ArchiveError('압축 데이터의 합이 지원 한도를 넘습니다.','COMPRESSED_LIMIT');
  total+=expanded;if(total>limits.expanded)throw new ArchiveError('ZIP의 전체 압축 해제 크기가 100MB를 넘습니다.','EXPANDED_LIMIT');
  if(expanded>1024*1024&&expanded>Math.max(1,compressed)*limits.ratio)throw new ArchiveError('압축률이 지나치게 높은 ZIP은 처리하지 않습니다.','RATIO_LIMIT');
  if(local+30>start||view.getUint32(local,true)!==0x04034b50||view.getUint16(local+6,true)!==flags||view.getUint16(local+8,true)!==method)fail();
  const localNameLength=view.getUint16(local+26,true),localExtraLength=view.getUint16(local+28,true),offset=local+30+localNameLength+localExtraLength;
  if(localNameLength!==nameLength||offset+compressed>start)fail();
  for(let i=0;i<nameLength;i++)if(bytes[local+30+i]!==bytes[cursor+46+i])fail();
  if(method===0&&compressed!==expanded)fail();
  if(!name.endsWith('/'))entries.push({name:name,method,compressed,expanded,crc,offset});
  cursor=recordEnd;
 }
 if(cursor!==start+size)fail();return entries;
}

export function crc32(bytes:Uint8Array):number{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}

/** Native streaming inflate with actual-byte bounds; cancellation propagates upstream. */
export async function readZipEntry(bytes:Uint8Array,entry:ZipEntry,signal?:AbortSignal,limits:ZipLimits=ZIP_LIMITS):Promise<Uint8Array>{
 signal?.throwIfAborted();
 if(entry.expanded>limits.entry)throw new ArchiveError('관계 JSON 파일은 각각 20MB 이하만 지원합니다.','ENTRY_LIMIT');
 const payload=bytes.subarray(entry.offset,entry.offset+entry.compressed);let output:Uint8Array;
 if(entry.method===0){if(payload.length>limits.entry)throw new ArchiveError('JSON 크기 한도를 넘습니다.','ENTRY_LIMIT');output=payload;}
 else {
  if(typeof DecompressionStream==='undefined')throw new ArchiveError('이 브라우저는 ZIP stream 처리를 지원하지 않습니다. 최신 브라우저를 이용해 주세요.','UNSUPPORTED_BROWSER');
  let offset=0;
  const source=new ReadableStream<BufferSource>({pull(controller){if(signal?.aborted){controller.error(signal.reason);return;}if(offset>=payload.length){controller.close();return;}const end=Math.min(offset+1024,payload.length);controller.enqueue(payload.slice(offset,end));offset=end;}});
  let decompressor:DecompressionStream;try{decompressor=new DecompressionStream('deflate-raw');}catch{throw new ArchiveError('이 브라우저는 ZIP stream 처리를 지원하지 않습니다.','UNSUPPORTED_BROWSER');}
  const reader=source.pipeThrough(decompressor,{signal}).getReader();const chunks:Uint8Array[]=[];let total=0;
  const cancel=()=>{void reader.cancel(signal?.reason).catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
  try{
   while(true){signal?.throwIfAborted();const {value,done}=await reader.read();signal?.throwIfAborted();if(done)break;
    total+=value.byteLength;if(total>limits.entry||total>entry.expanded)throw new ArchiveError('실제 압축 해제 크기가 선언 크기 또는 JSON 한도를 넘습니다.','EXPANDED_LIMIT');chunks.push(value);
   }
   output=new Uint8Array(total);let cursor=0;for(const chunk of chunks){output.set(chunk,cursor);cursor+=chunk.byteLength;}
  }catch(error){if(signal?.aborted)throw signal.reason;if(error instanceof ArchiveError)throw error;throw new ArchiveError('ZIP 압축 데이터가 손상되었습니다.','INVALID_DEFLATE');}finally{signal?.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 signal?.throwIfAborted();if(output.byteLength!==entry.expanded||crc32(output)!==entry.crc)fail('ZIP 파일의 크기 또는 무결성 검증에 실패했습니다.');return output;
}
