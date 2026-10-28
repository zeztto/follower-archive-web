import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {analyzeArchive,profileUrl} from '../src/app/utils/archiveAnalysis';
import {inspectZip,readZipEntry,ZIP_LIMITS,crc32,ArchiveError} from '../src/app/utils/zipReader';
async function bytes(content='[]'){const zip=new JSZip();zip.file('followers_1.json',content);zip.file('following.json','{"relationships_following":[]}');return new Uint8Array(await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}));}
const file=(data:Uint8Array)=>new File([new Uint8Array(data)],'guard.zip',{type:'application/zip'});
test('ZIP compressed, expanded, per-record, file count, ratio and encrypted-header guards run before inflate',async()=>{
 const data=await bytes();await assert.rejects(readZipEntry(data,inspectZip(data)[0],undefined,{...ZIP_LIMITS,entry:1}),error=>error instanceof ArchiveError&&error.code==='ENTRY_LIMIT');assert.throws(()=>inspectZip(data,{...ZIP_LIMITS,compressed:data.length-1}),error=>error instanceof ArchiveError&&error.code==='COMPRESSED_LIMIT');
 assert.throws(()=>inspectZip(data,{...ZIP_LIMITS,files:1}),error=>error instanceof ArchiveError&&error.code==='FILE_COUNT_LIMIT');
 const bomb=new Uint8Array(data),view=new DataView(bomb.buffer),central=view.getUint32(bomb.length-6,true);view.setUint32(central+24,ZIP_LIMITS.expanded+1,true);assert.throws(()=>inspectZip(bomb),error=>error instanceof ArchiveError&&error.code==='EXPANDED_LIMIT');
 const ratio=new Uint8Array(data),r=new DataView(ratio.buffer);r.setUint32(central+24,2*1024*1024,true);assert.throws(()=>inspectZip(ratio),error=>error instanceof ArchiveError&&error.code==='RATIO_LIMIT');
 const encrypted=new Uint8Array(data),v=new DataView(encrypted.buffer);v.setUint16(central+8,1,true);assert.throws(()=>inspectZip(encrypted));
 let reads=0;const oversized=file(data);Object.defineProperty(oversized,'size',{value:ZIP_LIMITS.compressed+1});Object.defineProperty(oversized,'arrayBuffer',{value:()=>{reads++;throw new Error('must not read');}});await assert.rejects(analyzeArchive(oversized));assert.equal(reads,0);
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
});
test('actual lying-size DEFLATE stream is cancelled before any JSON parse',async()=>{
 const data=await bytes(JSON.stringify(Array.from({length:10000},()=>({string_list_data:[{value:'unit_a'}]}))));const view=new DataView(data.buffer),central=view.getUint32(data.length-6,true),local=view.getUint32(central+42,true);view.setUint32(central+24,1,true);view.setUint32(local+22,1,true);
 const Native=DecompressionStream,parse=JSON.parse;let cancellations=0,parses=0;
 class Tracked extends Native{constructor(format:CompressionFormat){super(format);const get=this.readable.getReader.bind(this.readable);Object.defineProperty(this.readable,'getReader',{value:()=>{const reader=get();const cancel=reader.cancel.bind(reader);Object.defineProperty(reader,'cancel',{value:(reason?:unknown)=>{cancellations++;return cancel(reason);}});return reader;}});}}
 Object.defineProperty(globalThis,'DecompressionStream',{configurable:true,writable:true,value:Tracked});JSON.parse=(text,reviver)=>{parses++;return parse(text,reviver);};
 try{await assert.rejects(analyzeArchive(file(data)),error=>error instanceof ArchiveError&&error.code==='EXPANDED_LIMIT');assert.ok(cancellations>=1);assert.equal(parses,0);}finally{globalThis.DecompressionStream=Native;JSON.parse=parse;}
});
test('unknown prototype-like filename is not parsed; hostile href cannot change profile origin',async()=>{
 const zip=new JSZip();zip.file('followers_1.json','[]');zip.file('following.json',JSON.stringify({relationships_following:[{title:'unit_a',string_list_data:[{value:'unit_a',href:'javascript:alert(1)'}]}]}));zip.file('constructor','bad JSON');const data=await analyzeArchive(file(new Uint8Array(await zip.generateAsync({type:'uint8array'}))));assert.deepEqual(data.following,['unit_a']);assert.equal(profileUrl('unit_a'),'https://www.instagram.com/unit_a/');assert.equal(profileUrl('javascript:alert(1)'),null);assert.equal(profileUrl('//evil.test'),null);
});
