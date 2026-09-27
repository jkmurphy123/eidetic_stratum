import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const imagePath=/^\/images\/articles\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);

function masterPath(root,src) {
  if (!imagePath.test(src)) throw new Error(`Unsafe image path: ${src}`);
  let current=path.join(root,'public');
  for (const part of src.slice(1).split('/')) {
    current=path.join(current,part);
    if (!fs.existsSync(current) && !fs.existsSync(path.dirname(current))) throw new Error(`Missing image asset: ${src}`);
    // lstat sees symbolic links even if they lead outside the publication.
    let stat;
    try {stat=fs.lstatSync(current);} catch (error) {
      if (error.code==='ENOENT') throw new Error(`Missing image asset: ${src}`);
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Unsafe symbolic link in image asset: ${src}`);
  }
  if (!fs.statSync(current).isFile()) throw new Error(`Invalid image asset: ${src}`);
  return current;
}

export async function validateImageMasters(root,articles) {
  const dimensions={};
  for (const article of articles) {
    if (!article.image) continue;
    const src=article.image.src;
    const file=masterPath(root,src);
    const fd=fs.openSync(file,'r');
    const signature=Buffer.alloc(8);
    try {fs.readSync(fd,signature,0,8,0);} finally {fs.closeSync(fd);}
    if (!signature.equals(pngSignature)) throw new Error(`Invalid PNG image asset: ${src}`);
    try {
      const metadata=await sharp(file).metadata();
      if (metadata.format!=='png' || !metadata.width || !metadata.height || metadata.width>8192 || metadata.height>8192 || metadata.width*metadata.height>50_000_000) throw new Error('Unsupported PNG dimensions');
      await sharp(file).stats(); // Decode the pixels, not just the PNG header.
      dimensions[article.id]={width:metadata.width,height:metadata.height};
    } catch (error) {throw new Error(`Invalid PNG image asset ${src}: ${error.message}`);}
  }
  return dimensions;
}

// Only generated browser data receives derivative metadata; source JSON stays intact.
export async function prepareImages(root,articles) {
  const dimensions=await validateImageMasters(root,articles);
  const parent=path.join(root,'public/images');
  fs.mkdirSync(parent,{recursive:true});
  const stage=fs.mkdtempSync(path.join(parent,'.generated-stage-'));
  const generated=path.join(parent,'generated');
  const backup=path.join(parent,`.generated-backup-${process.pid}-${Date.now()}`);
  const prepared=[];
  try {
    for (const article of articles) {
      if (!article.image) {prepared.push(article);continue;}
      const filename=`${article.id}-card.webp`;
      await sharp(masterPath(root,article.image.src)).resize(640,427,{fit:'cover'}).webp({quality:78}).toFile(path.join(stage,filename));
      prepared.push({...article,image:{...article.image,...dimensions[article.id],cardSrc:`/images/generated/${filename}`,cardWidth:640,cardHeight:427}});
    }
    const old=fs.existsSync(generated);
    if (old) fs.renameSync(generated,backup);
    try {fs.renameSync(stage,generated);}
    catch (error) {if (old) fs.renameSync(backup,generated);throw error;}
    if (old) fs.rmSync(backup,{recursive:true,force:true});
    return prepared;
  } finally {
    if (fs.existsSync(stage)) fs.rmSync(stage,{recursive:true,force:true});
  }
}
