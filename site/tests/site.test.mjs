import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');

test('section headings are compact and article body text is enlarged', () => {
  const css=fs.readFileSync(path.join(root,'src/styles/site.css'),'utf8');
  assert.match(css,/\.brand p\{font:600 22px var\(--sans\)/);
  assert.match(css,/\.section-heading\{padding:18px 0 24px;border-bottom:1px solid var\(--rule\)\}/);
  assert.match(css,/\.section-heading h1\{font:700 clamp\(1\.2rem,2\.25vw,2\.3rem\)\/1\.12 var\(--display\)/);
  assert.match(css,/\.article-body\{font-size:30px;line-height:2\}/);
  assert.match(css,/\.lead-story h2\{font:700 clamp\(1\.875rem,3\.15vw,3\.375rem\)\/1\.16 var\(--display\)/);
  assert.match(css,/\.article-card \.deck\{font-size:26px;line-height:1\.8/);
  assert.match(css,/@media\(max-width:760px\).*\.lead-story h2\{font-size:clamp\(1\.65rem,6\.75vw,2\.7rem\)\}/s);
});

test('local build renders the masthead, dated article and all seven categories', () => {
  execFileSync('npm', ['run','build'], {cwd:root, stdio:'pipe'});
  const home=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  assert.match(home,/The Alderwick Correspondent/);
  assert.match(home,/News for the Serious Eidetician/);
  assert.match(home,/1882/);
  const article=fs.readFileSync(path.join(root,'dist/articles/2026-09-25-prime-referent-drift/index.html'),'utf8');
  assert.match(article,/1882/);
  assert.match(article,/Prime Referent/);
  assert.match(article,/<p>/);
  assert.ok(fs.existsSync(path.join(root,'dist/category/agony-column/index.html')));
  assert.ok(fs.existsSync(path.join(root,'dist/category/common-enquiries/index.html')));
  assert.ok(fs.existsSync(path.join(root,'dist/category/whos-who/index.html')));
  const whosWho=fs.readFileSync(path.join(root,'dist/category/whos-who/index.html'),'utf8');
  assert.match(whosWho,/Who&#39;s Who/);
  assert.match(whosWho,/famous people/i);
  assert.match(whosWho,/Who&#39;s Who: Miriam Vale/);
  assert.match(whosWho,/Who&#39;s Who: Yvette Saint-Clair/);
  assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-23-miriam-vale/index.html')));
  assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-23-yvette-saint-clair/index.html')));
  assert.match(home,/Rare Books &amp; Items<\/a><a href="\/category\/whos-who\/">Who&#39;s Who<\/a><\/nav>/);
  const enquiries=fs.readFileSync(path.join(root,'dist/category/common-enquiries/index.html'),'utf8');
  assert.match(enquiries,/Common Enquiries/);
  assert.doesNotMatch(enquiries,/The Correspondent · Sections/);
  assert.doesNotMatch(enquiries,/<p class="overline">/);
  assert.match(enquiries,/frequently asked questions/i);
  assert.match(enquiries,/Enquirer’s Guide: What is the Eidetic Stratum\?/);
  assert.match(enquiries,/Enquirer’s Guide: Where should a new reader begin\?/);
  assert.ok(enquiries.indexOf('Enquirer’s Guide: What is the Eidetic Stratum?') < enquiries.indexOf('Enquirer’s Guide: Where should a new reader begin?'));
  assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-22-what-is-the-eidetic-stratum/index.html')));
  assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-22-where-should-a-new-reader-begin/index.html')));
  assert.equal(fs.existsSync(path.join(root,'dist/category/lost-and-found/index.html')), false);
  assert.match(home,/Common Enquiries/);
  assert.doesNotMatch(home,/Lost &amp; Found|Lost & Found/);
  assert.doesNotMatch(home,/The Daily Edition/);
  assert.doesNotMatch(home,/From the Front Page/);
  assert.doesNotMatch(home,/Observations, inquiries and the affairs of Alderwick\./);
  assert.match(home,/<main id="main" class="page-shell"><div class="lead-grid">/);
  assert.ok(fs.existsSync(path.join(root,'dist/about/index.html')));
});

test('former lost and found notices now appear under agony column', () => {
  execFileSync('npm', ['run','build'], {cwd:root, stdio:'pipe'});
  const agony=fs.readFileSync(path.join(root,'dist/category/agony-column/index.html'),'utf8');
  assert.match(agony,/A Small Silver Compass Found/);
  assert.match(agony,/Small Brass Case Missing from Quay Road/);
});

test('built discovery routes expose tag browsing, search and related links', () => {
  execFileSync('npm', ['run','build'], {cwd:root, stdio:'pipe'});
  const article=fs.readFileSync(path.join(root,'dist/articles/2026-09-25-prime-referent-drift/index.html'),'utf8');
  assert.match(article,/href="\/tag\/prime-referent\/"/);
  const relatedArticle=fs.readFileSync(path.join(root,'dist/articles/2026-09-25-southern-stations-agree/index.html'),'utf8');
  assert.match(relatedArticle,/href="\/articles\/2026-09-25-prime-referent-drift\/"/);
  const tag=fs.readFileSync(path.join(root,'dist/tag/prime-referent/index.html'),'utf8');
  assert.match(tag,/Surveyors Report a Drift/);
  const search=fs.readFileSync(path.join(root,'dist/search/index.html'),'utf8');
  assert.match(search,/Search requires JavaScript/);
  assert.match(search,/name="category"/);
  const index=JSON.parse(fs.readFileSync(path.join(root,'dist/indexes/search.json'),'utf8'));
  assert.equal(index.version,1);
  assert.equal(index.records.length,57);
  assert.ok(index.records.some(record => /prime referent/.test(record.text)));
  assert.ok(index.records.some(record => record.category === 'whos-who' && /yvette saint clair/.test(record.text)));
  assert.ok(index.records.some(record => record.category === 'common-enquiries' && /what is the eidetic stratum/.test(record.text)));
});
