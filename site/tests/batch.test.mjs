import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readBatch, ingestBatch} from '../scripts/batch.mjs';
import {loadArchive} from '../scripts/content.mjs';

const source=path.resolve(import.meta.dirname,'..');
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'alderwick-ingest-'));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'content/articles/2026/09/24'),{recursive:true});
  fs.mkdirSync(path.join(root,'public/images/articles'),{recursive:true});
  fs.copyFileSync(path.join(source,'content/categories.json'),path.join(root,'content/categories.json'));
  fs.copyFileSync(path.join(source,'content/article.schema.json'),path.join(root,'content/article.schema.json'));
  const old={id:'2026-09-24-old-report',slug:'old-report',title:'Old report',summary:'Original.',category:'world-news',published_at:'2026-09-24T12:00:00Z',author:'Staff',paragraphs:['One.','Two.','Three.','Four.'],tags:['archive'],image:null,related_ids:[]};
  const oldPath=path.join(root,'content/articles/2026/09/24/old-report.json');
  fs.writeFileSync(oldPath,JSON.stringify(old)+'\n');
  const batch=path.join(root,'incoming');
  fs.mkdirSync(path.join(batch,'articles'),{recursive:true});
  const article={...old,id:'2026-09-25-new-report',slug:'new-report',title:'New report',published_at:'2026-09-25T12:00:00Z',related_ids:[old.id]};
  const manifest={edition_date:'2026-09-25',run_id:'2026-09-25-manual-01',article_ids:[article.id],assets:[],validation:{status:'passed',article_count:1}};
  const write=() => {
    fs.writeFileSync(path.join(batch,'manifest.json'),JSON.stringify(manifest)+'\n');
    fs.writeFileSync(path.join(batch,'articles/new-report.json'),JSON.stringify(article)+'\n');
  };
  write();
  return {root,batch,oldPath,article,manifest,write};
}

test('reviewed batch ingests once and reruns as a byte-identical no-op', async t => {
  const {root,batch,oldPath,article}=fixture(t);
  const old=fs.readFileSync(oldPath);
  assert.equal((await ingestBatch(root,batch,{reviewed:true})).status,'ingested');
  assert.equal((await ingestBatch(root,batch,{reviewed:true})).status,'unchanged');
  assert.deepEqual(fs.readFileSync(oldPath),old);
  assert.equal(loadArchive(root).articles.length,2);
  assert.equal(loadArchive(root).articles.find(a => a.id===article.id).related_ids[0],'2026-09-24-old-report');
  assert.ok(fs.existsSync(path.join(root,'content/batches/2026-09-25.json')));
});

test('explicit editorial acceptance is required and conflicts write nothing', async t => {
  const {root,batch,oldPath,article}=fixture(t);
  await assert.rejects(ingestBatch(root,batch),/review/i);
  assert.equal(fs.existsSync(path.join(root,'content/batches')),false);
  await ingestBatch(root,batch,{reviewed:true});
  const existing=fs.readFileSync(path.join(root,'content/articles/2026/09/25/new-report.json'));
  const old=fs.readFileSync(oldPath);
  fs.writeFileSync(path.join(batch,'articles/new-report.json'),JSON.stringify({...article,title:'Altered'})+'\n');
  await assert.rejects(ingestBatch(root,batch,{reviewed:true}),/conflict/i);
  assert.deepEqual(fs.readFileSync(path.join(root,'content/articles/2026/09/25/new-report.json')),existing);
  assert.deepEqual(fs.readFileSync(oldPath),old);
});

test('malformed, incomplete and unsafe batches cannot write sources', async t => {
  const {root,batch,manifest,write}=fixture(t);
  fs.writeFileSync(path.join(batch,'articles/new-report.json'),'{broken');
  await assert.rejects(ingestBatch(root,batch,{reviewed:true}),/JSON|parse|Unexpected/i);
  assert.equal(fs.existsSync(path.join(root,'content/batches')),false);
  write();
  manifest.article_ids=[];
  write();
  await assert.rejects(ingestBatch(root,batch,{reviewed:true}),/manifest|article_ids/i);
  manifest.article_ids=['2026-09-25-new-report'];
  write();
  fs.writeFileSync(path.join(batch,'articles/unlisted.json'),'{}');
  await assert.rejects(ingestBatch(root,batch,{reviewed:true}),/unexpected|unlisted/i);
  fs.rmSync(path.join(batch,'articles/unlisted.json'));
  fs.rmSync(path.join(batch,'articles/new-report.json'));
  fs.symlinkSync(path.join(root,'content/articles/2026/09/24/old-report.json'),path.join(batch,'articles/new-report.json'));
  await assert.rejects(ingestBatch(root,batch,{reviewed:true}),/symlink|unsafe/i);
  assert.equal(loadArchive(root).articles.length,1);
});

test('invalid article and missing related target fail before publication', async t => {
  const {root,batch,article}=fixture(t);
  fs.writeFileSync(path.join(batch,'articles/new-report.json'),JSON.stringify({...article,related_ids:['missing']})+'\n');
  await assert.rejects(ingestBatch(root,batch,{reviewed:true}),/related/i);
  assert.equal(loadArchive(root).articles.length,1);
});

test('future-dated records are rejected during reviewed ingest', async t => {
  const {root,batch,article,manifest}=fixture(t);
  const date=new Date(Date.now()+86_400_000).toISOString().slice(0,10);
  const updated={...article,id:`${date}-new-report`,published_at:`${date}T12:00:00Z`};
  manifest.edition_date=date;manifest.run_id=`${date}-manual-01`;manifest.article_ids=[updated.id];
  fs.writeFileSync(path.join(batch,'manifest.json'),JSON.stringify(manifest)+'\n');
  fs.writeFileSync(path.join(batch,'articles/new-report.json'),JSON.stringify(updated)+'\n');
  await assert.rejects(ingestBatch(root,batch,{reviewed:true}),/future/i);
  assert.equal(loadArchive(root).articles.length,1);
});

test('malformed PNG batch fails before source directories change', async t => {
  const {root,batch,article,manifest}=fixture(t);
  const src='/images/articles/2026/09/25/new-report.png';
  const illustrated={...article,image:{src,alt:'A desk',caption:'Desk.',credit:'Staff'}};
  manifest.assets=[src];
  fs.mkdirSync(path.join(batch,'images'));
  fs.writeFileSync(path.join(batch,'images/new-report.png'),'not a PNG');
  fs.writeFileSync(path.join(batch,'manifest.json'),JSON.stringify(manifest)+'\n');
  fs.writeFileSync(path.join(batch,'articles/new-report.json'),JSON.stringify(illustrated)+'\n');
  await assert.rejects(ingestBatch(root,batch,{reviewed:true}),/PNG/i);
  assert.equal(fs.existsSync(path.join(root,'content/batches')),false);
  assert.equal(fs.existsSync(path.join(root,'public',src.slice(1))),false);
  assert.equal(loadArchive(root).articles.length,1);
});

test('zero-story skipped day records one manifest and repeats without duplication', async t => {
  const {root,batch,manifest}=fixture(t);
  manifest.article_ids=[];manifest.validation.article_count=0;
  fs.writeFileSync(path.join(batch,'manifest.json'),JSON.stringify(manifest)+'\n');
  fs.rmSync(path.join(batch,'articles/new-report.json'));
  assert.equal(readBatch(batch).articles.length,0);
  assert.equal((await ingestBatch(root,batch,{reviewed:true})).status,'ingested');
  assert.equal((await ingestBatch(root,batch,{reviewed:true})).status,'unchanged');
  assert.equal(loadArchive(root).articles.length,1);
});
