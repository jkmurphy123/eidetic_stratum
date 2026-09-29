import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=path.resolve(import.meta.dirname,'..');
function run(root,command,args,env={}) {
 return new Promise(resolve=>{
  const child=spawn(command,args,{cwd:root,env:{...process.env,...env}});
  let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
  child.on('error',error=>resolve({code:-1,stdout,stderr:error.message}));
  child.on('close',code=>resolve({code,stdout,stderr}));
 });
}
function site(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'alderwick-assist-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const name of ['content','src','scripts','astro.config.mjs']) fs.cpSync(path.join(source,name),path.join(root,name),{recursive:true});
 fs.mkdirSync(path.join(root,'public'),{recursive:true});
 fs.symlinkSync(path.join(source,'node_modules'),path.join(root,'node_modules'),'dir');
 return root;
}
const story=title=>({title,summary:'The quay clerks examine a revised document.',category:'field-reports',author:'The Civic Correspondent',paragraphs:['The clerks examined a revised document at the quay.','Several witnesses compared its details with the earlier register.','An officer requested a second inspection before any change is agreed.','The council will receive the findings at its next meeting.'],tags:['quay'],related_ids:[]});

test('CLI drafts two local days from stub, ingests only after explicit review, then builds old and new URLs',async t=>{
 const root=site(t);let secondSawFirst=false;
 const server=http.createServer(async(req,res)=>{
  let body='';for await(const data of req) body+=data;
  assert.equal(req.headers.authorization,'Bearer fixture-key');
  assert.doesNotMatch(body,/fixture-key/);
  const user=JSON.parse(body).messages[1].content;
  const date=JSON.parse(user.slice(user.indexOf('{'))).edition_date;
  if(date==='2026-09-25') secondSawFirst=user.includes('The Quay Ledger Is Reviewed');
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({stories:[story(date==='2026-09-24'?'The Quay Ledger Is Reviewed':'The Quay Ledger Hearing Continues')],new_terms:[]})}}]}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const env={EIDETIC_MODEL_API_URL:`http://127.0.0.1:${server.address().port}/v1/chat/completions`,EIDETIC_MODEL_ID:'fixture-model',EIDETIC_MODEL_API_KEY:'fixture-key'};
 const empty=await run(root,'node',['scripts/draft-daily.mjs','--date','2026-09-23','--skip'],{EIDETIC_MODEL_API_URL:'',EIDETIC_MODEL_ID:''});
 assert.equal(empty.code,0,empty.stderr);
 assert.equal(fs.existsSync(path.join(root,'content/batches')),false);
 for(const date of ['2026-09-24','2026-09-25']) {
  const draft=await run(root,'node',['scripts/draft-daily.mjs','--date',date],env);
  assert.equal(draft.code,0,draft.stderr);
  assert.match(draft.stdout,/Staged .*batch/);
  assert.equal(fs.existsSync(path.join(root,'content/batches',`${date}.json`)),false);
  const dir=fs.readdirSync(path.join(root,'drafts')).find(name=>name.startsWith(`${date}-daily-`));
  assert.ok(dir);
  const batch=path.join(root,'drafts',dir,'batch');
  const denied=await run(root,'node',['scripts/ingest-batch.mjs',batch]);
  assert.notEqual(denied.code,0);
  const accepted=await run(root,'node',['scripts/ingest-batch.mjs',batch,'--accept-reviewed']);
  assert.equal(accepted.code,0,accepted.stderr);
 }
 assert.equal(secondSawFirst,true);
 assert.equal((await run(root,'node',['scripts/validate-content.mjs'])).code,0);
 assert.equal((await run(root,'node',['scripts/prepare-content.mjs'])).code,0);
 const build=await run(root,path.join(root,'node_modules/.bin/astro'),['build']);
 assert.equal(build.code,0,build.stderr);
 assert.equal((await run(root,'node',['scripts/check-dist.mjs'])).code,0);
 assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-24-the-quay-ledger-is-reviewed/index.html')));
 assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-25-the-quay-ledger-hearing-continues/index.html')));
 assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-25-prime-referent-drift/index.html')));
});

test('CLI rejects missing provider configuration without staging or leaking environment',async t=>{
 const root=site(t);
 const result=await run(root,'node',['scripts/draft-daily.mjs','--date','2026-09-25'],{EIDETIC_MODEL_API_URL:'',EIDETIC_MODEL_ID:'',EIDETIC_MODEL_API_KEY:'do-not-log'});
 assert.notEqual(result.code,0);
 assert.doesNotMatch(result.stdout+result.stderr,/do-not-log/);
 assert.equal(fs.existsSync(path.join(root,'drafts')),false);
});
