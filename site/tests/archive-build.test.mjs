import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
test('isolated 26-story build reaches the oldest story through home, category and tag page two', t => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'alderwick-archive-'));
  t.after(() => fs.rmSync(tmp,{recursive:true,force:true}));
  for (const name of ['src','scripts','astro.config.mjs']) fs.cpSync(path.join(root,name),path.join(tmp,name),{recursive:true});
  fs.mkdirSync(path.join(tmp,'content/articles/2026/09/23'),{recursive:true});
  fs.mkdirSync(path.join(tmp,'public'),{recursive:true});
  for (const name of ['categories.json','article.schema.json','batch.schema.json']) fs.copyFileSync(path.join(root,'content',name),path.join(tmp,'content',name));
  fs.symlinkSync(path.join(root,'node_modules'),path.join(tmp,'node_modules'),'dir');
  for (let i=0;i<26;i++) {
    const slug=`fixture-${String(i).padStart(2,'0')}`;
    const record={id:`2026-09-23-${slug}`,slug,title:`Fixture ${i}`,summary:'A sample report.',category:'world-news',
      published_at:`2026-09-23T00:${String(i).padStart(2,'0')}:00Z`,author:'Archive Desk',
      paragraphs:['First observation.','Second observation.','Third observation.','Fourth observation.'],
      tags:['fixture-subject'],image:null,related_ids:[]};
    fs.writeFileSync(path.join(tmp,'content/articles/2026/09/23',`${slug}.json`),JSON.stringify(record));
  }
  execFileSync('node',['scripts/prepare-content.mjs'],{cwd:tmp,stdio:'pipe'});
  execFileSync(path.join(tmp,'node_modules/.bin/astro'),['build'],{cwd:tmp,stdio:'pipe'});
  const read=relative => fs.readFileSync(path.join(tmp,'dist',relative),'utf8');
  assert.match(read('index.html'),/href="\/page\/2\/"/);
  assert.match(read('page/2/index.html'),/Fixture 0/);
  assert.match(read('category/world-news/index.html'),/Fixture 0/);
  assert.match(read('category/world-news/index.html'),/Fixture 25/);
  assert.match(read('tag/fixture-subject/index.html'),/href="\/tag\/fixture-subject\/page\/2\/"/);
  assert.match(read('tag/fixture-subject/page/2/index.html'),/Fixture 0/);
  assert.equal(fs.existsSync(path.join(tmp,'dist/page/3/index.html')),false);
  assert.equal(fs.existsSync(path.join(tmp,'dist/category/world-news/page/2/index.html')),false);
  assert.equal(fs.existsSync(path.join(tmp,'dist/tag/unknown/index.html')),false);
  assert.equal(fs.existsSync(path.join(tmp,'dist/category/unknown/index.html')),false);
  assert.equal(JSON.parse(read('indexes/search.json')).records.length,26);
});
