import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadArchive } from './content.mjs';
import { createSearchIndex } from '../src/lib/search.mjs';
import { prepareImages } from './images.mjs';
import { validateStoredManifests } from './batch.mjs';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
try {
  const {articles, categories, warnings} = loadArchive(root);
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  articles.sort((a,b) => b.published_at.localeCompare(a.published_at) || b.id.localeCompare(a.id));
  validateStoredManifests(root,articles);
  const prepared=await prepareImages(root,articles);
  const topicsByCategory = {};
  for (const category of categories) {
    const topics = [...new Set(articles.filter(a => a.category === category.slug).map(a => a.topic).filter(Boolean))];
    topics.sort((a,b) => a.localeCompare(b));
    topicsByCategory[category.slug] = topics;
  }
  const output = path.join(root, 'src/generated');
  fs.mkdirSync(output, {recursive:true});
  fs.writeFileSync(path.join(output, 'articles.json'), JSON.stringify({articles:prepared,categories,topicsByCategory}, null, 2) + '\n');
  const indexDir = path.join(root,'public/indexes');
  fs.mkdirSync(indexDir,{recursive:true});
  fs.writeFileSync(path.join(indexDir,'search.json'),JSON.stringify(createSearchIndex(articles)) + '\n');
  console.log(`Prepared ${articles.length} validated articles`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
