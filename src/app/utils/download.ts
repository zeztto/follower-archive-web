export function saveReport(content:string,mimeType:string,format:'txt'|'html'|'json'){
 const blob=new Blob([content],{type:mimeType});const url=URL.createObjectURL(blob);const link=document.createElement('a');
 try{link.href=url;link.download=`follower-report-${new Date().toISOString().slice(0,10)}.${format}`;document.body.appendChild(link);link.click();}
 finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
