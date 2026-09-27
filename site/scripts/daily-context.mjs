import fs from 'node:fs';
import path from 'node:path';

const markup=/<\/?[a-z][^>]*>/i;
function readVersioned(file,key) {
 const raw=fs.readFileSync(file,'utf8');
 if (raw.length>16_000) throw new Error(`${key} context exceeds 16 KB`);
 const value=JSON.parse(raw);
 if (value?.version!==1 || !Array.isArray(value[key])) throw new Error(`Unsupported ${key} context version or shape`);
 if (value[key].some(item => key==='facts' ? typeof item!=='string' || !item.trim() || markup.test(item) : !item || typeof item.term!=='string' || !item.term.trim() || markup.test(item.term) || typeof item.meaning!=='string' || !item.meaning.trim() || markup.test(item.meaning) || !['established premise','emerging'].includes(item.status))) throw new Error(`Invalid ${key} context`);
 return value[key];
}

export function loadDailyContext(root,{date,categories,articles}) {
 const today=new Date().toISOString().slice(0,10);
 if(typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date) throw new Error('Invalid UTC edition date');
 if(date>today) throw new Error('Future edition dates are not allowed');
 const world=path.join(root,'content/world');
 const terms=readVersioned(path.join(world,'emerging-terms.v1.json'),'terms');
 const facts=readVersioned(path.join(world,'continuity.v1.json'),'facts');
 const prompt=fs.readFileSync(path.join(root,'content/prompts/daily-edition.v1.txt'),'utf8');
 if (!prompt.trim() || prompt.length>16_000 || markup.test(prompt)) throw new Error('Invalid prompt text or markup');
 const recent=[...articles].filter(a=>a.published_at.slice(0,10)<=date).sort((a,b)=>b.published_at.localeCompare(a.published_at)||b.id.localeCompare(a.id)).slice(0,20).map(a=>({id:a.id,title:a.title,tags:a.tags,category:a.category}));
 return {version:1,date,categories:categories.map(c=>({slug:c.slug,label:c.label})),recent,terms,continuity:{version:1,facts},prompt};
}
