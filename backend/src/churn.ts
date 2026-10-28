import { githubHeaders } from './github.js';

export const CHURN_MAX_FILES = 300;
export const CHURN_MAX_COMMITS = 5;
export interface ChurnFile { path: string; additions: number | null; deletions: number | null; changes: number | null }
export interface ChurnResult { available: boolean; files: ChurnFile[]; caveat: string | null; commitsExamined: number }
export interface ChurnOptions {
  owner: string; repo: string; revision: string; paths: readonly string[];
  source?: 'github' | 'zip'; fetch?: typeof globalThis.fetch;
}
const unavailable=(paths:readonly string[],caveat:string,commitsExamined=0):ChurnResult=>({available:false,files:paths.map(path=>({path,additions:null,deletions:null,changes:null})),caveat,commitsExamined});
/** Sum changed-line statistics for the analyzed commit and up to four first-parent commits.
 * The bounded window is explicitly reported; missing data never becomes a guessed zero. */
export async function getFileChurn(options:ChurnOptions):Promise<ChurnResult>{
 const paths=[...new Set(options.paths)];
 if(options.source==='zip')return unavailable(paths,'Churn is unavailable for ZIP uploads because they provide no Git history.');
 if(paths.length>CHURN_MAX_FILES)return unavailable(paths,`Requested ${paths.length} files; limit is ${CHURN_MAX_FILES}.`);
 if(!/^[A-Za-z0-9_.-]+$/.test(options.owner)||!/^[A-Za-z0-9_.-]+$/.test(options.repo)||!/^[0-9a-f]{7,64}$/i.test(options.revision))return unavailable(paths,'Invalid GitHub owner, repository, or revision SHA.');
 if(!paths.length)return {available:true,files:[],caveat:null,commitsExamined:0};
 const request=options.fetch??globalThis.fetch, totals=new Map<string,{additions:number,deletions:number}>();let current=options.revision,examined=0,truncated=false;
 for(let i=0;i<CHURN_MAX_COMMITS&&current;i++){
  let response:Response;try{response=await request(`https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/commits/${encodeURIComponent(current)}`,{headers:githubHeaders(),signal:AbortSignal.timeout(10000)})}catch{return unavailable(paths,'GitHub history request failed or timed out; churn was not inferred.',examined)}
  if(!response.ok)return unavailable(paths,response.status===403||response.status===429?'GitHub API rate limit or access restriction prevented churn retrieval; churn was not inferred.':`GitHub API returned HTTP ${response.status}; churn was not inferred.`,examined);
  let data:any;try{data=await response.json()}catch{return unavailable(paths,'GitHub API returned invalid JSON; churn was not inferred.',examined)}
  if(!data||!Array.isArray(data.files))return unavailable(paths,'GitHub did not provide complete per-file commit statistics; churn was not inferred.',examined);
  examined++;if(data.files.length>=CHURN_MAX_FILES)truncated=true;
  for(const file of data.files){if(!file||typeof file.filename!=='string'||typeof file.additions!=='number'||typeof file.deletions!=='number'||!Number.isFinite(file.additions)||!Number.isFinite(file.deletions)||file.additions<0||file.deletions<0)continue;const old=totals.get(file.filename)||{additions:0,deletions:0};old.additions+=file.additions;old.deletions+=file.deletions;totals.set(file.filename,old)}
  current=Array.isArray(data.parents)&&typeof data.parents[0]?.sha==='string'?data.parents[0].sha:'';
 }
 const files=paths.map(path=>{const value=totals.get(path);if(value)return {path,additions:value.additions,deletions:value.deletions,changes:value.additions+value.deletions};if(truncated)return {path,additions:null,deletions:null,changes:null};return {path,additions:0,deletions:0,changes:0}});
 const caveat=truncated?'GitHub capped at least one commit file list; unlisted files have unknown churn, not zero.':`Churn sums the analyzed revision and up to ${CHURN_MAX_COMMITS-1} first-parent commits (${examined} examined); it is a bounded recent-history measure.`;
 return {available:!truncated||files.every(file=>file.additions!==null),files,caveat,commitsExamined:examined};
}
