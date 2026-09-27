import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadArchive} from './content.mjs';
import {validateImageMasters} from './images.mjs';
import {validateStoredManifests} from './batch.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
try {
  const {articles,categories,warnings}=loadArchive(root);
  validateStoredManifests(root,articles);
  await validateImageMasters(root,articles);
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  console.log(`Validated ${articles.length} articles across ${categories.length} categories`);
} catch (error) {
  console.error(error.message);
  process.exitCode=1;
}
