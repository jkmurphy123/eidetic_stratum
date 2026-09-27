import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {checkDist} from '../scripts/check-dist.mjs';

test('reports a missing internal link and permits a valid page link', () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alderwick-links-'));
 try {
  fs.mkdirSync(path.join(dir,'about'));
  fs.writeFileSync(path.join(dir,'about/index.html'),'About');
  fs.writeFileSync(path.join(dir,'index.html'),'<a href="/about/">About</a><img src="/absent.png">');
  assert.match(checkDist(dir).join(' '), /absent\.png/);
  fs.writeFileSync(path.join(dir,'absent.png'),'x');
  assert.deepEqual(checkDist(dir),[]);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
