import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecords } from '../scripts/content.mjs';

const categories = [{slug:'world-news',label:'World News'}, {slug:'agony-column',label:'Agony Column'}];
const record = (overrides={}) => ({
 id:'2026-09-25-sample', slug:'sample', title:'The Standard', summary:'A brief report.',
 category:'world-news', published_at:'2026-09-25T12:00:00Z', author:'Staff',
 paragraphs:['One.','Two.','Three.','Four.'], tags:['survey'], image:null, related_ids:[], ...overrides
});
const check = (articles) => validateRecords(articles, categories, () => true);

test('accepts a full story and a shorter notice with a warning', () => {
 assert.equal(check([record()]).errors.length, 0);
 const short = check([record({paragraphs:['One.','Two.']})]);
 assert.equal(short.errors.length, 0);
 assert.match(short.warnings.join(' '), /short/i);
 const agony = check([record({category:'agony-column',paragraphs:['A terse private notice.']})]);
 assert.equal(agony.errors.length, 0);
 assert.doesNotMatch(agony.warnings.join(' '), /short/i);
});

test('rejects duplicate ids and slugs', () => {
 const result=check([record(),record({id:'2026-09-26-sample'})]);
 assert.match(result.errors.join(' '), /slug/);
 assert.match(check([record(),record()]).errors.join(' '), /id/);
});

test('rejects invalid categories, related ids and paths', () => {
 assert.match(check([record({category:'not-real'})]).errors.join(' '), /category/);
 assert.match(check([record({related_ids:['missing']})]).errors.join(' '), /related/);
 assert.match(check([record({image:{src:'/images/articles/../bad.png',alt:'x',caption:'x',credit:'x'}})]).errors.join(' '), /image/);
});

test('rejects article markup and warns on repeated or near-identical headlines', () => {
 assert.match(check([record({title:'<script>bad</script>'})]).errors.join(' '), /plain text|markup/i);
 const twin=record({id:'2026-09-24-other',slug:'other',published_at:'2026-09-24T12:00:00Z'});
 assert.match(check([record(),twin]).warnings.join(' '), /headline/i);
});

test('rejects mismatched date, missing image and extra fields', () => {
 assert.match(check([record({published_at:'2026-02-30T12:00:00Z'})]).errors.join(' '), /timestamp/);
 assert.match(validateRecords([record({image:{src:'/images/articles/2026/09/25/x.png',alt:'x',caption:'x',credit:'x'}})], categories, () => false).errors.join(' '), /image/);
 assert.match(check([record({rogue:'oops'})]).errors.join(' '), /schema/);
});
