import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {draftEdition} from '../scripts/daily-draft.mjs';
import {readBatch} from '../scripts/batch.mjs';
import {loadArchive} from '../scripts/content.mjs';
const source=path.resolve(import.meta.dirname,'..');
function setup(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'alderwick-daily-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.cpSync(path.join(source,'content'),path.join(root,'content'),{recursive:true});
 return root;
}
const story=(overrides={})=>({title:'A Second Tram Timetable Is Proposed',summary:'The council weighs an additional service to the quay.',category:'local-news',author:'The Civic Correspondent',paragraphs:['The council heard a proposal for an additional tram service.','Inspectors reported that the existing route is busiest at dusk.','One member questioned whether the new timetable would strain the depot.','A further hearing is expected after the trial has been measured.'],tags:['transport'],related_ids:['2026-09-25-bridge-toll-hearing'],...overrides});
const response=(stories=[story()],new_terms=[])=>JSON.stringify({stories,new_terms});

test('valid draft stages an ingest-compatible batch, review checklist and proposed term without touching sources',async t=>{
 const root=setup(t);
 const result=await draftEdition(root,{date:'2026-09-25',request:async context=>{
  assert.equal(context.date,'2026-09-25');assert.ok(context.recent.some(a=>a.id==='2026-09-25-bridge-toll-hearing'));return response([story({paragraphs:[...story().paragraphs.slice(0,3),'A Transit Referent is proposed as a depot measure pending further study.']})],[{term:'Transit Referent',meaning:'A proposed depot measure.'}]);
 }});
 assert.equal(result.status,'staged');
 const batch=readBatch(path.join(result.dir,'batch'));
 assert.equal(batch.articles.length,1);
 assert.equal(batch.manifest.validation.status,'passed');
 assert.equal(batch.assets.length,0);
 assert.equal(batch.articles[0].record.image,null);
 assert.equal(batch.articles[0].record.id,`2026-09-25-${batch.articles[0].record.slug}`);
 assert.match(fs.readFileSync(path.join(result.dir,'REVIEW.md'),'utf8'),/editorial|continuity|ingest/i);
 assert.match(fs.readFileSync(path.join(result.dir,'proposed-terms.json'),'utf8'),/Transit Referent/);
 assert.equal(loadArchive(root).articles.length,57);
 assert.equal(fs.existsSync(path.join(root,'content/batches')),false);
});

test('skip day stages an empty valid batch without calling a model',async t=>{
 const root=setup(t);
 const result=await draftEdition(root,{date:'2026-09-25',skip:true,request:async()=>{throw new Error('must not run')}});
 assert.equal(result.status,'staged');
 const batch=readBatch(path.join(result.dir,'batch'));
 assert.deepEqual(batch.manifest.article_ids,[]);
 assert.equal(batch.manifest.validation.article_count,0);
});

test('invalid category, model-supplied image, malformed JSON and excess stories quarantine without ingest',async t=>{
 const root=setup(t);
 for(const raw of [response([story({category:'unknown'})]),response([story({image:{src:'/etc/passwd'}})]),'{',response(Array.from({length:4},()=>story()))]) {
  const result=await draftEdition(root,{date:'2026-09-25',request:async()=>raw});
  assert.equal(result.status,'quarantined');
  assert.equal(fs.existsSync(path.join(result.dir,'batch/manifest.json')),false);
 }
 assert.equal(loadArchive(root).articles.length,57);
 assert.equal(fs.existsSync(path.join(root,'content/batches')),false);
});

test('backdated draft cannot link to an article published on a later day',async t=>{
 const root=setup(t);
 const result=await draftEdition(root,{date:'2026-09-24',request:async()=>response([story({related_ids:['2026-09-25-bridge-toll-hearing']})])});
 assert.equal(result.status,'quarantined');
});

test('errors and secrets from provider are not printed in quarantine reason',async t=>{
 const root=setup(t);
 const result=await draftEdition(root,{date:'2026-09-25',request:async()=>{throw new Error('provider secret test-key')}});
 assert.equal(result.status,'quarantined');
 assert.doesNotMatch(fs.readFileSync(path.join(result.dir,'ERROR.txt'),'utf8'),/provider secret|test-key/);
});

test('an already ingested edition cannot create another draft for the same day',async t=>{
 const root=setup(t);
 fs.mkdirSync(path.join(root,'content/batches'));
 fs.writeFileSync(path.join(root,'content/batches/2026-09-25.json'),'{}');
 const result=await draftEdition(root,{date:'2026-09-25',request:async()=>{throw new Error('must not run')}});
 assert.equal(result.status,'quarantined');
});
