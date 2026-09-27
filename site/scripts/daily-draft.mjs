import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import Ajv from 'ajv';
import {loadArchive,validateRecords} from './content.mjs';
import {loadDailyContext} from './daily-context.mjs';
import {validateStoredManifests,readBatch} from './batch.mjs';

const schema=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../content/daily-response.v1.schema.json',import.meta.url)),'utf8'));
const validateShape=new Ajv({allErrors:true}).compile(schema);
const unsafe=/<\/?[a-z][^>]*>|https?:\/\/|www\./i;
const slugify=title=>title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70).replace(/-$/,'');

function recordsFromResponse(raw,context,archive) {
 if(typeof raw!=='string' || raw.length>1_000_000) throw new Error('Invalid response size');
 const parsed=JSON.parse(raw);
 if(!validateShape(parsed)) throw new Error('Draft response did not match the versioned schema');
 const allowed=new Set(archive.articles.filter(a=>a.published_at.slice(0,10)<=context.date).map(a=>a.id));
 const today=new Date().toISOString().slice(0,10);
 const timestamp=context.date===today?new Date().toISOString().replace(/\.\d{3}Z$/,'Z'):`${context.date}T12:00:00Z`;
 const used=new Set(archive.articles.map(a=>a.slug));
 const records=parsed.stories.map(story=>{
  if ([story.title,story.summary,story.author,story.dateline||'',...story.paragraphs].some(value=>unsafe.test(value))) throw new Error('Draft prose must be plain text without links');
  if (story.related_ids.some(id=>!allowed.has(id))) throw new Error('Unknown related article ID');
  const base=slugify(story.title);
  if (!base) throw new Error('Draft title has no safe slug');
  let slug=base, index=2;while(used.has(slug)) slug=`${base}-${index++}`;
  used.add(slug);
  return {id:`${context.date}-${slug}`,slug,title:story.title,summary:story.summary,category:story.category,published_at:timestamp,author:story.author,...(story.dateline?{dateline:story.dateline}:{}),paragraphs:story.paragraphs,tags:story.tags,image:null,related_ids:story.related_ids};
 });
 const existingTerms=new Set(context.terms.map(x=>x.term.toLocaleLowerCase('en')));
 const proposed=new Set();
 for (const item of parsed.new_terms) {
  const name=item.term.toLocaleLowerCase('en');
  if (unsafe.test(item.term) || unsafe.test(item.meaning) || existingTerms.has(name) || proposed.has(name)) throw new Error('Invalid or repeated proposed term');
  if (!records.some(r=>[r.title,r.summary,...r.paragraphs].join(' ').toLocaleLowerCase('en').includes(name))) throw new Error('Proposed term does not appear in a draft');
  proposed.add(name);
 }
 const result=validateRecords([...archive.articles,...records],archive.categories,src=>fs.existsSync(path.join(context.root,'public',src.slice(1))));
 if(result.errors.length) throw new Error('Candidate archive failed validation');
 return {records,terms:parsed.new_terms,warnings:result.warnings};
}

// Drafting never calls ingestBatch. Publication still requires a separate editorial command.
export async function draftEdition(root,{date,request,skip=false}={}) {
 const runId=`${date}-daily-${crypto.randomUUID().replaceAll('-','')}`;
 const lockPath=path.join(root,'.daily-draft.lock');
 const lock=fs.openSync(lockPath,'wx');
 let temp;
 try {
  const drafts=path.join(root,'drafts');fs.mkdirSync(drafts,{recursive:true,mode:0o700});
  const archive=loadArchive(root);
  validateStoredManifests(root,archive.articles);
  const context=loadDailyContext(root,{date,categories:archive.categories,articles:archive.articles});
  context.root=root;
  if(fs.existsSync(path.join(root,'content/batches',`${date}.json`))) throw new Error('Edition already ingested');
  const raw=skip?'{"stories":[],"new_terms":[]}':await request(context);
  const {records,terms,warnings}=recordsFromResponse(raw,context,archive);
  temp=fs.mkdtempSync(path.join(drafts,'.stage-'));
  const batch=path.join(temp,'batch');fs.mkdirSync(path.join(batch,'articles'),{recursive:true});
  for(const record of records) fs.writeFileSync(path.join(batch,'articles',`${record.slug}.json`),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  const manifest={edition_date:date,run_id:runId,article_ids:records.map(r=>r.id),assets:[],validation:{status:'passed',article_count:records.length}};
  fs.writeFileSync(path.join(batch,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  readBatch(batch);
  fs.writeFileSync(path.join(temp,'proposed-terms.json'),JSON.stringify({version:1,terms},null,2)+'\n');
  fs.writeFileSync(path.join(temp,'REVIEW.md'),`# Unpublished edition ${date}\n\nRun: ${runId}\nStories: ${records.length}\n\nReview each article for period voice, local continuity, factual distinctions, and new terminology. Proposed terms in proposed-terms.json are NOT canonical; add approved meanings to content/world/emerging-terms.v1.json manually. Review near-duplicate headlines and known related links. Only attach an existing approved master PNG to a major story, and update its image metadata and manifest assets before accepting.\n\nEditorial warnings:\n${warnings.length?warnings.map(w=>`- ${w}`).join('\n'):'- None'}\n\nDo not ingest automatically. Once edited and reviewed, use npm run ingest:batch -- <this directory>/batch --accept-reviewed; then validate, build, check and preview locally. No deployment is configured.\n`);
  const destination=path.join(drafts,runId);fs.renameSync(temp,destination);temp=undefined;
  return {status:'staged',dir:destination,article_count:records.length};
 } catch {
  if(temp) {fs.rmSync(temp,{recursive:true,force:true});temp=undefined;}
  const quarantine=path.join(root,'quarantine');fs.mkdirSync(quarantine,{recursive:true,mode:0o700});
  const destination=path.join(quarantine,runId);fs.mkdirSync(destination,{mode:0o700});
  fs.writeFileSync(path.join(destination,'ERROR.txt'),`Draft ${runId} failed. No articles were ingested. Check provider configuration, model JSON schema, content validity and existing edition; retry after inspection. Prompt, response body, provider key and raw error are intentionally not logged.\n`,{mode:0o600});
  return {status:'quarantined',dir:destination,article_count:0};
 } finally {
  fs.closeSync(lock);fs.rmSync(lockPath,{force:true});
 }
}
