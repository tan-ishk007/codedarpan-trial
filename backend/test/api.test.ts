import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { ZipFile } from 'yazl';
import { randomUUID } from 'node:crypto';

const port = 34127;
let server: ChildProcess;
let savedRunId='';
async function zip(entries: Record<string,string>): Promise<Buffer> {
  const z = new ZipFile();
  for (const [name, content] of Object.entries(entries)) z.addBuffer(Buffer.from(content), name);
  z.end();
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    z.outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    z.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
    z.outputStream.on('error', reject);
  });
}
async function ready() {
  for (let i=0;i<60;i++) {
    try { const r=await fetch(`http://127.0.0.1:${port}/api/health`); if(r.ok)return; } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('API server did not become ready');
}
describe('CodeDarpan API integration', () => {
  beforeAll(async () => {
    server=spawn(process.execPath,['--import','tsx','src/server.ts'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'ignore'});
    await ready();
  },10000);
  afterAll(() => { server?.kill('SIGTERM'); });
  it('analyzes a ZIP and returns resolved imports, source, and AST metrics', async () => {
    const archive=await zip({'src/main.ts':"import { helper } from './helper';\nexport function main(x: number) { if (x) return helper(); return 0; }\n",'src/helper.ts':'export function helper(){ return 1 }','src/unrelated.ts':'export function helper(){ return 99 }'});
    const form=new FormData();form.append('file',new Blob([archive]),'fixture.zip');
    const submitted=await fetch(`http://127.0.0.1:${port}/api/analyses`,{method:'POST',body:form});
    expect(submitted.status).toBe(202);const {runId}=await submitted.json() as {runId:string};
    savedRunId=runId;
    const graph=await (await fetch(`http://127.0.0.1:${port}/api/analyses/${runId}/graph`)).json() as any;
    expect(graph.nodes.filter((n:any)=>n.kind==='file')).toHaveLength(3);expect(graph.edges).toContainEqual(expect.objectContaining({source:'src/main.ts',target:'src/helper.ts',type:'import'}));
    expect(graph.nodes).toContainEqual(expect.objectContaining({id:'fn:src%2Fmain.ts:2:main',kind:'function',path:'src/main.ts'}));
    expect(graph.edges).toContainEqual(expect.objectContaining({source:'fn:src%2Fmain.ts:2:main',target:'fn:src%2Fhelper.ts:1:helper',type:'call',confidence:'medium',resolution:'lexical-binding'}));
    expect(graph.edges.filter((edge:any)=>edge.type==='call')).toHaveLength(1);
    const file=await (await fetch(`http://127.0.0.1:${port}/api/analyses/${runId}/files/src%2Fmain.ts`)).json() as any;
    expect(file.source).toContain('export function main');expect(file.imports).toEqual(['src/helper.ts']);expect(file.complexity).toBe(2);expect(file.warnings).toEqual([]);
  });
  it('rejects ZIP path traversal', async () => {
    const archive=await zip({'aa/escape.ts':'export const escaped = true'});
    const safe=Buffer.from('aa/escape.ts'), unsafe=Buffer.from('../escape.ts');
    for(let at=archive.indexOf(safe);at>=0;at=archive.indexOf(safe,at+unsafe.length)) unsafe.copy(archive,at);
    const form=new FormData();form.append('file',new Blob([archive]),'unsafe.zip');
    const response=await fetch(`http://127.0.0.1:${port}/api/analyses`,{method:'POST',body:form});
    expect(response.status).toBe(400);expect((await response.json()).message).toMatch(/relative path|Unsafe ZIP path/);
  });
  it('isolates analyses by account and returns evidence-backed onboarding and honest churn status', async () => {
    const email=`${randomUUID()}@example.test`;
    const account=await fetch(`http://127.0.0.1:${port}/api/auth/register`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'correct horse battery staple'})});
    expect(account.status).toBe(201);const {token}=await account.json() as {token:string};
    expect((await fetch(`http://127.0.0.1:${port}/api/analyses/${savedRunId}`,{headers:{authorization:`Bearer ${token}`}})).status).toBe(404);
    const archive=await zip({'src/README.md':'Contributor setup and overview.','src/main.ts':'export function run() { return 1 }'});
    const form=new FormData();form.append('file',new Blob([archive]),'owned.zip');
    const submitted=await fetch(`http://127.0.0.1:${port}/api/analyses`,{method:'POST',headers:{authorization:`Bearer ${token}`},body:form});
    expect(submitted.status).toBe(202);const {runId}=await submitted.json() as {runId:string};
    expect((await fetch(`http://127.0.0.1:${port}/api/analyses/${runId}`,{headers:{authorization:`Bearer ${token}`}})).status).toBe(200);
    expect((await fetch(`http://127.0.0.1:${port}/api/analyses/${runId}`)).status).toBe(404);
    const health=await (await fetch(`http://127.0.0.1:${port}/api/analyses/${runId}/health`,{headers:{authorization:`Bearer ${token}`}})).json() as any;
    expect(health.historyAvailable).toBe(false);expect(health.churn.files[0].additions).toBeNull();
    const route=await (await fetch(`http://127.0.0.1:${port}/api/analyses/${runId}/onboarding?role=backend%20developer`,{headers:{authorization:`Bearer ${token}`}})).json() as any;
    expect(route.steps.length).toBeGreaterThan(0);expect(route.steps.every((step:any)=>step.evidence.length>0)).toBe(true);
  });
  it('restores completed analyses from SQLite after a process restart', async () => {
    server.kill('SIGTERM');
    await new Promise(r=>setTimeout(r,150));
    server=spawn(process.execPath,['--import','tsx','src/server.ts'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'ignore'});
    await ready();
    const response=await fetch(`http://127.0.0.1:${port}/api/analyses/${savedRunId}`);
    expect(response.status).toBe(200);expect((await response.json()).status).toBe('ready');
  });
});
