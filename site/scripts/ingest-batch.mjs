import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ingestBatch} from './batch.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const [batchArg,approval,...extra]=process.argv.slice(2);
if (!batchArg || approval!=='--accept-reviewed' || extra.length) {
 console.error('Usage: npm run ingest:batch -- <batch-directory> --accept-reviewed');
 process.exitCode=2;
} else {
 try {
  const result=await ingestBatch(root,path.resolve(batchArg),{reviewed:true});
  console.log(`${result.status}: ${result.article_count} article(s); local source only (run validate/build/preview next)`);
 } catch(error) {console.error(error.message);process.exitCode=1;}
}
