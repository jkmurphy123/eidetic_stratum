import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {draftEdition} from './daily-draft.mjs';
import {requestEdition} from './daily-model.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const args=process.argv.slice(2);
if(args.includes('--help')) {console.log('Usage: npm run draft:daily -- [--date YYYY-MM-DD] [--skip]');process.exit(0);}
let date=new Date().toISOString().slice(0,10),skip=false;
for(let i=0;i<args.length;i++) {
 if(args[i]==='--date' && args[i+1]) date=args[++i];
 else if(args[i]==='--skip' && !skip) skip=true;
 else {console.error('Invalid arguments. Usage: npm run draft:daily -- [--date YYYY-MM-DD] [--skip]');process.exit(2);}
}
if(!skip && (!process.env.EIDETIC_MODEL_API_URL || !process.env.EIDETIC_MODEL_ID)) {
 console.error('Set EIDETIC_MODEL_API_URL and EIDETIC_MODEL_ID, or use --skip. No draft was created.');
 process.exit(2);
}
try {
 const result=await draftEdition(root,{date,skip,request:context=>requestEdition(context,{endpoint:process.env.EIDETIC_MODEL_API_URL,model:process.env.EIDETIC_MODEL_ID,key:process.env.EIDETIC_MODEL_API_KEY})});
 if(result.status==='staged') console.log(`Staged ${result.dir}/batch (${result.article_count} stories). Review ${result.dir}/REVIEW.md before any ingest.`);
 else {console.error(`Draft quarantined at ${result.dir}. No content was ingested.`);process.exitCode=1;}
} catch {
 console.error('Daily draft could not start (possibly an existing draft lock). No content was ingested.');
 process.exitCode=1;
}
