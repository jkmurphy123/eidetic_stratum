import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createArchive} from '../src/lib/archive.mjs';
import {createSearchIndex, searchRecords} from '../src/lib/search.mjs';

const sample = (n, overrides = {}) => ({
  id:`2026-09-25-report-${String(n).padStart(2, '0')}`, slug:`report-${String(n).padStart(2, '0')}`,
  published_at:`2026-09-25T${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}:00Z`,
  title:`Report ${n}`, summary:'A short abstract.', category:'world-news',
  author:'Staff', paragraphs:['An observation from the northern platform.'],
  tags:['survey'], related_ids:[], image:null, ...overrides
});

const categories = [{slug:'world-news',label:'World News'}, {slug:'local-news',label:'Local News'}];

test('26 records produce exactly 25 on the first page and the oldest on page two', () => {
  const archive = createArchive(Array.from({length:26}, (_,i) => sample(i)), categories);
  assert.equal(archive.feed().totalPages, 2);
  assert.equal(archive.feed().articles.length, 25);
  assert.equal(archive.feed(2).articles.length, 1);
  assert.equal(archive.feed(2).articles[0].id, sample(0).id);
  assert.equal(archive.feed(3), null);
  assert.equal(archive.feed(0), null);
  assert.deepEqual(archive.feedPages().map(page => page.number), [1,2]);
});

test('category and tag feeds use identical pagination, unknown routes do not resolve', () => {
  const articles = Array.from({length:26}, (_,i) => sample(i, {category:'local-news',tags:['civic-record']}));
  const archive = createArchive(articles, categories);
  assert.equal(archive.category('local-news',2).articles.length, 1);
  assert.equal(archive.tag('civic-record',2).articles.length, 1);
  assert.equal(archive.category('unknown'), null);
  assert.equal(archive.tag('unknown'), null);
  assert.equal(archive.category('world-news').totalPages, 0);
  assert.equal(archive.category('world-news',2), null);
  assert.deepEqual(archive.tags(), ['civic-record']);
});

test('25 records do not emit empty page two; timestamp ties sort by descending id', () => {
  const tied = [sample(1,{published_at:'2026-09-25T12:00:00Z'}),sample(2,{published_at:'2026-09-25T12:00:00Z'})];
  assert.equal(createArchive(tied, categories).feed().articles[0].id, sample(2).id);
  assert.equal(createArchive(Array.from({length:25},(_,i) => sample(i)),categories).feed(2), null);
  assert.equal(createArchive([],categories).feed().totalPages, 0);
});

test('search matches normalized title, body and tag, AND terms, newest first, and filters', () => {
  const records = createSearchIndex([
    sample(1,{title:'The Méridian Archive',paragraphs:['An interstice was recorded.'],tags:['field-notes']}),
    sample(2,{title:'A New Survey',paragraphs:['The interstice opened.'],tags:['field-notes'],category:'local-news'}),
    sample(3,{title:'Ordinary News',paragraphs:['Unrelated report.'],tags:['civic-record']})
  ]);
  assert.equal(records.version, 1);
  assert.equal(searchRecords(records.records,{q:'meridian'})[0].id,sample(1).id);
  assert.equal(searchRecords(records.records,{q:'interstice survey'}).length,1);
  assert.equal(searchRecords(records.records,{q:'field notes'}).length,2);
  assert.equal(searchRecords(records.records,{q:'field-notes'}).length,2);
  assert.equal(searchRecords(records.records,{q:'interstice',category:'world-news'})[0].id,sample(1).id);
  assert.equal(searchRecords(records.records,{q:'interstice',tag:'field-notes'}).length,2);
  assert.deepEqual(searchRecords(records.records,{q:'absent'}),[]);
  assert.deepEqual(searchRecords(records.records,{q:''}),[]);
  assert.equal(searchRecords(records.records,{q:'interstice'})[0].id,sample(2).id);
});
