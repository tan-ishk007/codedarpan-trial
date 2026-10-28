import { ZipFile } from 'yazl';
const base=process.env.CODEDARPAN_API||'http://127.0.0.1:3001';
const count=Number(process.env.BENCH_FILES||500),fanout=Number(process.env.BENCH_FANOUT||5);
const z=new ZipFile();
for(let i=0;i<count;i++){
 const imports=[];for(let j=1;j<=fanout;j++)imports.push(`import { value as v${j} } from './module-${String((i+j)%count).padStart(4,'0')}';`);
 const code=[...imports,`export function module${i}(x: number) { if (x > 0) return ${imports.map((_,j)=>`v${j+1}(x - 1)`).join(' + ')}; return ${i}; }`].join('\n')+'\n';
 z.addBuffer(Buffer.from(code),`src/module-${String(i).padStart(4,'0')}.ts`);
}
z.end();const archive=await new Promise((resolve,reject)=>{const chunks=[];z.outputStream.on('data',x=>chunks.push(x));z.outputStream.on('end',()=>resolve(Buffer.concat(chunks)));z.outputStream.on('error',reject)});
const form=new FormData();form.append('file',new Blob([archive]),'benchmark.zip');
const start=performance.now();const submit=await fetch(`${base}/api/analyses`,{method:'POST',body:form});if(!submit.ok)throw Error(`Analysis submit failed ${submit.status}: ${await submit.text()}`);const result=await submit.json();const accepted=performance.now();const snapshot=await (await fetch(`${base}/api/analyses/${result.runId}`)).json();const graphStart=performance.now();const graph=await (await fetch(`${base}/api/analyses/${result.runId}/graph`)).json();const graphDone=performance.now();
console.log(JSON.stringify({generatedAt:new Date().toISOString(),nodeVersion:process.version,baseUrl:base,filesRequested:count,fanout,archiveBytes:archive.length,filesIndexed:snapshot.fileCount,nodes:graph.nodes.length,edges:graph.edges.length,zipUploadAndAnalysisResponseMs:Math.round(accepted-start),serverAnalysisMs:snapshot.durationMs,graphFetchMs:Math.round(graphDone-graphStart),totalThroughGraphMs:Math.round(graphDone-start),notes:'Single local run; timings are environment-specific, not a general performance guarantee. This measures API response/graph fetch, not browser graph rendering.'},null,2));
