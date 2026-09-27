import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv from 'ajv';
import {loadArchive} from './content.mjs';
import {validateImageMasters} from './images.mjs';

const schema=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../content/batch.schema.json',import.meta.url)),'utf8'));
const shape=new Ajv({allErrors:true}).compile(schema);
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function exactDate(value) {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
}
function regular(file,kind='file') {
  const stats=fs.lstatSync(file);
  if (kind==='directory' ? !stats.isDirectory() : !stats.isFile()) throw new Error(`Unsafe ${kind}: ${file} (symlinks are not allowed)`);
}
function entries(dir) {
  if (!fs.existsSync(dir)) return [];
  regular(dir,'directory');
  const names=fs.readdirSync(dir).sort();
  for (const name of names) regular(path.join(dir,name));
  return names;
}
function assertTreeRegular(dir) {
  if (!fs.existsSync(dir)) return;
  regular(dir,'directory');
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if (entry.isDirectory()) assertTreeRegular(file);
    else regular(file);
  }
}
function sameList(left,right) {return JSON.stringify([...left].sort())===JSON.stringify([...right].sort());}

// Batch layout: manifest.json, articles/<slug>.json, images/<slug>.png.
export function readBatch(batchDir) {
  regular(batchDir,'directory');
  const top=fs.readdirSync(batchDir).sort();
  if (!sameList(top.filter(name => !['articles','images'].includes(name)),['manifest.json']) || top.some(name => !['articles','images','manifest.json'].includes(name))) throw new Error('Unexpected batch entries');
  regular(path.join(batchDir,'manifest.json'));
  const manifest=JSON.parse(fs.readFileSync(path.join(batchDir,'manifest.json'),'utf8'));
  if (!shape(manifest)) throw new Error(`Invalid manifest: ${shape.errors.map(e => `${e.instancePath} ${e.message}`).join('; ')}`);
  if (!exactDate(manifest.edition_date) || !manifest.run_id.startsWith(`${manifest.edition_date}-`)) throw new Error('Invalid manifest edition date or run ID');
  const filenames=entries(path.join(batchDir,'articles'));
  const articleIds=new Set(manifest.article_ids);
  const articles=filenames.map(name => {
    if (!name.endsWith('.json') || !slug.test(name.slice(0,-5))) throw new Error(`Unexpected article file ${name}`);
    const bytes=fs.readFileSync(path.join(batchDir,'articles',name));
    const record=JSON.parse(bytes.toString('utf8'));
    if (record.slug!==name.slice(0,-5) || !articleIds.has(record.id) || record.id!==`${manifest.edition_date}-${record.slug}` || record.published_at?.slice(0,10)!==manifest.edition_date) throw new Error(`Article does not match manifest: ${name}`);
    return {name,bytes,record};
  });
  if (!sameList(articles.map(item => item.record.id),manifest.article_ids) || manifest.validation.article_count!==articles.length) throw new Error('Manifest article_ids or article_count do not match batch');
  const declaredAssets=articles.filter(item => item.record.image != null).map(item => item.record.image.src);
  if (!sameList(declaredAssets,manifest.assets)) throw new Error('Manifest assets do not match article images');
  const assetNames=entries(path.join(batchDir,'images'));
  const assets=assetNames.map(name => {
    if (!name.endsWith('.png') || !slug.test(name.slice(0,-4))) throw new Error(`Unexpected image file ${name}`);
    const src=`/images/articles/${manifest.edition_date.replaceAll('-','/')}/${name}`;
    if (!manifest.assets.includes(src)) throw new Error(`Unlisted image asset ${name}`);
    return {src,bytes:fs.readFileSync(path.join(batchDir,'images',name))};
  });
  if (!sameList(assets.map(item => item.src),manifest.assets)) throw new Error('Missing manifest asset');
  return {manifest,articles,assets};
}

// Verify recorded editions when validating/building, not only on first ingest.
export function validateStoredManifests(root,articles) {
  const dir=path.join(root,'content/batches');
  const names=entries(dir);
  const byId=new Map(articles.map(article => [article.id,article]));
  const seen=new Set();
  for (const name of names) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) throw new Error(`Unexpected stored manifest: ${name}`);
    const manifest=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
    if (!shape(manifest) || !exactDate(manifest.edition_date) || name!==`${manifest.edition_date}.json` || !manifest.run_id.startsWith(`${manifest.edition_date}-`)) throw new Error(`Invalid stored manifest: ${name}`);
    if (manifest.article_ids.length!==manifest.validation.article_count) throw new Error(`Stored manifest article count mismatch: ${name}`);
    const sources=manifest.article_ids.map(id => {
      if (seen.has(id) || !byId.has(id) || byId.get(id).published_at.slice(0,10)!==manifest.edition_date) throw new Error(`Stored manifest article missing or duplicated: ${id}`);
      seen.add(id);
      return byId.get(id);
    });
    if (!sameList(sources.filter(article => article.image).map(article => article.image.src),manifest.assets)) throw new Error(`Stored manifest assets mismatch: ${name}`);
  }
  return names.length;
}

function planFile(destination,bytes) {
  if (!fs.existsSync(destination)) return true;
  regular(destination);
  if (!fs.readFileSync(destination).equals(bytes)) throw new Error(`Destination conflict: ${destination}`);
  return false;
}
function writeNew(destination,bytes) {
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,bytes,{flag:'wx'});
}

// The only mutation of live source directories occurs after full staged validation.
export async function ingestBatch(root,batchDir,{reviewed=false}={}) {
  if (!reviewed) throw new Error('Explicit editorial review is required (--accept-reviewed)');
  const lockPath=path.join(root,'.ingest.lock');
  const lock=fs.openSync(lockPath,'wx');
  let stage;
  try {
    const {manifest,articles,assets}=readBatch(batchDir);
    const manifestDest=path.join(root,'content/batches',`${manifest.edition_date}.json`);
    const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
    const pending=[];
    for (const item of articles) {
      const dest=path.join(root,'content/articles',...manifest.edition_date.split('-'),item.name);
      if (planFile(dest,item.bytes)) pending.push({dest,bytes:item.bytes});
    }
    for (const item of assets) {
      const dest=path.join(root,'public',item.src.slice(1));
      if (planFile(dest,item.bytes)) pending.push({dest,bytes:item.bytes});
    }
    if (planFile(manifestDest,manifestBytes)) pending.push({dest:manifestDest,bytes:manifestBytes});
    if (!pending.length) return {status:'unchanged',article_count:articles.length};

    // Copy to a sibling on the same filesystem, validate the entire candidate,
    // and discard it without modifying published sources if anything fails.
    assertTreeRegular(path.join(root,'content'));
    assertTreeRegular(path.join(root,'public/images/articles'));
    stage=fs.mkdtempSync(path.join(root,'.ingest-stage-'));
    fs.cpSync(path.join(root,'content'),path.join(stage,'content'),{recursive:true});
    const oldImages=path.join(root,'public/images/articles');
    const candidateImages=path.join(stage,'public/images/articles');
    if (fs.existsSync(oldImages)) fs.cpSync(oldImages,candidateImages,{recursive:true});
    else fs.mkdirSync(candidateImages,{recursive:true});
    for (const item of pending) {
      const relative=path.relative(root,item.dest);
      writeNew(path.join(stage,relative),item.bytes);
    }
    const candidate=loadArchive(stage);
    validateStoredManifests(stage,candidate.articles);
    await validateImageMasters(stage,candidate.articles);
    if (candidate.articles.length < articles.length) throw new Error('Incomplete candidate archive');

    const content=path.join(root,'content');
    const imageDir=oldImages;
    const stageContent=path.join(stage,'content');
    const backupContent=path.join(stage,'backup-content');
    const backupImages=path.join(stage,'backup-images');
    const newImages=assets.some(item => pending.some(p => p.dest===path.join(root,'public',item.src.slice(1))));
    let imageBacked=false, imageInstalled=false, contentBacked=false, contentInstalled=false;
    try {
      if (newImages) {
        fs.mkdirSync(path.dirname(imageDir),{recursive:true});
        if (fs.existsSync(imageDir)) {fs.renameSync(imageDir,backupImages);imageBacked=true;}
        fs.renameSync(candidateImages,imageDir);imageInstalled=true;
      }
      fs.renameSync(content,backupContent);contentBacked=true;
      fs.renameSync(stageContent,content);contentInstalled=true;
    } catch (error) {
      if (contentInstalled) fs.renameSync(content,stageContent);
      if (contentBacked) fs.renameSync(backupContent,content);
      if (imageInstalled) fs.renameSync(imageDir,candidateImages);
      if (imageBacked) fs.renameSync(backupImages,imageDir);
      throw error;
    }
    return {status:'ingested',article_count:articles.length};
  } finally {
    if (stage) fs.rmSync(stage,{recursive:true,force:true});
    fs.closeSync(lock);
    fs.rmSync(lockPath,{force:true});
  }
}
