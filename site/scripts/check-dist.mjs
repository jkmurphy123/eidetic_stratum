import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

function htmlFiles(dir) {
 if (!fs.existsSync(dir)) return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item => {
  const full=path.join(dir,item.name);
  return item.isDirectory() ? htmlFiles(full) : item.isFile() && full.endsWith('.html') ? [full] : [];
 });
}

export function checkDist(dir) {
 const problems=[];
 for (const file of htmlFiles(dir)) {
  const html=fs.readFileSync(file,'utf8');
  for (const [,url] of html.matchAll(/(?:href|src)="([^"\s]+)"/g)) {
   if (!url.startsWith('/') || url.startsWith('//')) continue;
   const pathname=decodeURIComponent(url.split(/[?#]/)[0]);
   if (pathname.split('/').includes('..')) {problems.push(`${file}: unsafe ${url}`);continue;}
   const target=path.join(dir,pathname.replace(/^\//,''));
   if (!fs.existsSync(target) && !fs.existsSync(path.join(target,'index.html'))) problems.push(`${file}: missing ${url}`);
  }
 }
 return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const dir=path.resolve(fileURLToPath(new URL('../dist',import.meta.url)));
 const problems=checkDist(dir);
 if (!fs.existsSync(dir) || problems.length) {
  console.error(problems.join('\n') || `Missing build directory: ${dir}`);
  process.exitCode=1;
 } else console.log(`Checked ${htmlFiles(dir).length} HTML pages: all local links and assets resolve`);
}
