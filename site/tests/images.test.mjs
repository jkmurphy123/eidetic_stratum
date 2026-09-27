import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {validateImageMasters, prepareImages} from '../scripts/images.mjs';

const record=(image=true) => ({
 id:'2026-09-25-test-engraving',slug:'test-engraving',title:'An Engraving',summary:'Illustrated report.',
 category:'world-news',published_at:'2026-09-25T12:00:00Z',author:'Staff',
 paragraphs:['First.','Second.','Third.','Fourth.'],tags:[],related_ids:[],
 image:image ? {src:'/images/articles/2026/09/25/test-engraving.png',alt:'Engraved surveying desk',caption:'Desk.',credit:'Engraving desk'} : null
});
function temp(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'alderwick-images-'));
 t.after(() => fs.rmSync(root,{recursive:true,force:true}));
 const file=path.join(root,'public/images/articles/2026/09/25/test-engraving.png');
 fs.mkdirSync(path.dirname(file),{recursive:true});
 return {root,file};
}
async function png(file) {
 // A synthetic image belongs only to the disposable test directory, not the publication.
 await sharp({create:{width:1200,height:800,channels:3,background:'#aaa9a7'}}).png().toFile(file);
}

test('image-free archive requires no image files or derivatives', async t => {
 const {root}=temp(t);
 assert.deepEqual(await validateImageMasters(root,[record(false)]),{});
 const prepared=await prepareImages(root,[record(false)]);
 assert.equal(prepared[0].image,null);
});

test('approved master is decoded and a 640×427 card WebP is generated without altering source', async t => {
 const {root,file}=temp(t);await png(file);
 const source=fs.readFileSync(file);
 const metadata=await validateImageMasters(root,[record()]);
 assert.equal(metadata[record().id].width,1200);
 const prepared=await prepareImages(root,[record()]);
 const image=prepared[0].image;
 assert.equal(image.src,record().image.src);
 assert.equal(image.width,1200);assert.equal(image.height,800);
 assert.equal(image.cardSrc,'/images/generated/2026-09-25-test-engraving-card.webp');
 assert.equal(image.cardWidth,640);assert.equal(image.cardHeight,427);
 const derivative=path.join(root,'public',image.cardSrc.slice(1));
 assert.deepEqual((({width,height,format})=>({width,height,format}))(await sharp(derivative).metadata()),{width:640,height:427,format:'webp'});
 assert.deepEqual(fs.readFileSync(file),source);
});

test('missing, mislabeled, truncated and symlinked masters fail rather than being substituted', async t => {
 const {root,file}=temp(t);
 await assert.rejects(validateImageMasters(root,[record()]),/missing|image/i);
 await sharp({create:{width:16,height:16,channels:3,background:'#888'}}).jpeg().toFile(file);
 await assert.rejects(validateImageMasters(root,[record()]),/PNG/i);
 fs.writeFileSync(file,Buffer.from('not a png'));
 await assert.rejects(prepareImages(root,[record()]),/PNG|image/i);
 fs.rmSync(file);
 const outside=path.join(root,'outside.png');await png(outside);
 fs.symlinkSync(outside,file);
 await assert.rejects(validateImageMasters(root,[record()]),/symbolic|symlink|unsafe/i);
});
