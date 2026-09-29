import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadDailyContext} from '../scripts/daily-context.mjs';
const original=path.resolve(import.meta.dirname,'../content');
function setup(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'alderwick-context-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'content/world'),{recursive:true});
 fs.mkdirSync(path.join(root,'content/prompts'),{recursive:true});
 for(const relative of ['world/emerging-terms.v1.json','world/continuity.v1.json','prompts/daily-edition.v1.txt']) fs.copyFileSync(path.join(original,relative),path.join(root,'content',relative));
 return root;
}
const categories=[{slug:'field-reports',label:'Field Reports'},{slug:'world-news',label:'World News'}];
const article=i=>({id:`2026-09-24-report-${i}`,title:`Report ${i}`,tags:['surveying'],published_at:`2026-09-24T12:${String(i).padStart(2,'0')}:00Z`,category:'field-reports'});

test('context includes bounded newest headlines, section slugs, reviewed world notes and prompt version',t=>{
 const root=setup(t);
 const result=loadDailyContext(root,{date:'2026-09-25',categories,articles:Array.from({length:25},(_,i)=>article(i))});
 assert.equal(result.version,1);
 assert.equal(result.date,'2026-09-25');
 assert.equal(result.recent.length,20);
 assert.equal(result.recent[0].id,'2026-09-24-report-24');
 assert.deepEqual(result.categories.map(c=>c.slug),['field-reports','world-news']);
 assert.match(result.prompt,/Eidetic Stratum/);
 assert.ok(result.terms.some(x=>x.term==='Prime Referent'));
 assert.ok(result.continuity.facts.length>0);
 assert.equal(result.recent[0].body,undefined);
});

test('backdated edition does not see headlines published on later days',t=>{
 const root=setup(t);
 const later={...article(1),id:'2026-09-25-later',title:'Later News',published_at:'2026-09-25T10:00:00Z'};
 const result=loadDailyContext(root,{date:'2026-09-24',categories,articles:[article(0),later]});
 assert.deepEqual(result.recent.map(a=>a.id),['2026-09-24-report-0']);
});

test('context refuses unsupported versions, unsafe markup and future edition dates',t=>{
 const root=setup(t);
 const file=path.join(root,'content/world/emerging-terms.v1.json');
 const saved=fs.readFileSync(file,'utf8');
 fs.writeFileSync(file,JSON.stringify({version:2,terms:[]}));
 assert.throws(()=>loadDailyContext(root,{date:'2026-09-25',categories,articles:[]}),/version/i);
 fs.writeFileSync(file,saved);
 assert.throws(()=>loadDailyContext(root,{date:'2099-01-01',categories,articles:[]}),/future/i);
 fs.writeFileSync(path.join(root,'content/prompts/daily-edition.v1.txt'),'<script>bad</script>');
 assert.throws(()=>loadDailyContext(root,{date:'2026-09-25',categories,articles:[]}),/prompt|markup/i);
});
