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
  assert.match(css,/\.article-body\{font-size:22\.5px;line-height:2\}/);
  assert.match(css,/\.lead-story h2\{font:700 clamp\(1\.875rem,3\.15vw,3\.375rem\)\/1\.16 var\(--display\)/);
  assert.match(css,/\.article-card \.deck\{font-size:19\.5px;line-height:1\.8/);
  assert.match(css,/@media\(max-width:760px\).*\.lead-story h2\{font-size:clamp\(1\.65rem,6\.75vw,2\.7rem\)\}/s);
});

test('local build renders the masthead, dated article and all seven categories', () => {
  execFileSync('npm', ['run','build'], {cwd:root, stdio:'pipe'});
  const home=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  assert.match(home,/The Alderwick Correspondent/);
  assert.match(home,/News for the Serious Eidetician/);
  assert.match(home,/1882/);
  assert.match(home,/Field Reports/);
  assert.doesNotMatch(home,/Local News/);
  assert.ok(fs.existsSync(path.join(root,'dist/category/field-reports/index.html')));
  assert.equal(fs.existsSync(path.join(root,'dist/category/local-news/index.html')), false);
  const fieldReports=fs.readFileSync(path.join(root,'dist/category/field-reports/index.html'),'utf8');
  assert.match(fieldReports,/Dispatch BBA 1: A Bell Is Heard Beneath the Market Square/);
  assert.match(fieldReports,/The Bell Beneath Alderwick/);
  assert.match(fieldReports,/data-topic="The Bell Beneath Alderwick"/);
  // Field Reports sorts oldest-first, so Dispatch BBA 1 (oldest on page 1) should appear before Dispatch BBA 9 (newest on page 1)
  assert.ok(fieldReports.indexOf('Dispatch BBA 1:') < fieldReports.indexOf('Dispatch BBA 9:'));
  // Verify forward chaining: CSA 1 article page links to CSA 2
  const csa1 = fs.readFileSync(path.join(root,'dist/articles/2026-03-27-survey-party-returns-three-days-before-departure/index.html'),'utf8');
  assert.match(csa1,/href="\/articles\/2026-03-29-institute-will-send-second-calder-party-despite-warning\/"/);
  const csa9 = fs.readFileSync(path.join(root,'dist/articles/2026-04-12-calder-inquiry-names-four-survivors-and-three-lost-witnesses/index.html'),'utf8');
  assert.doesNotMatch(csa9,/href="\/articles\/2026-04-09-miss-quill-returns-alone-through-east-quay-door\/"/);
  // Unbuilt Railway articles also on Field Reports, sorted oldest-first
  assert.match(fieldReports,/Dispatch TUR 3: Engineer Reveals Missing Page in Westmere Plans/);
  assert.match(fieldReports,/The Unbuilt Railway/);
  assert.match(fieldReports,/data-topic="The Unbuilt Railway"/);
  assert.ok(fieldReports.indexOf('Dispatch TUR 3:') < fieldReports.indexOf('Dispatch TUR 9:'));
  const tur1 = fs.readFileSync(path.join(root,'dist/articles/2026-05-04-mail-arrives-from-stations-that-were-never-built/index.html'),'utf8');
  assert.match(tur1,/href="\/articles\/2026-05-07-a-timetable-for-a-railway-without-rails\/"/);
  const tur9 = fs.readFileSync(path.join(root,'dist/articles/2026-05-26-westmere-survivors-begin-life-before-their-birth/index.html'),'utf8');
  assert.doesNotMatch(tur9,/href="\/articles\/2026-05-22-last-westmere-train-arrives-twelve-years-early\/"/);
  // Orchard of Glass Fruit articles also on Field Reports, sorted oldest-first
  assert.match(fieldReports,/Dispatch OGF 1: Glass Fruit Draws Crowds to Alderwick Market/);
  assert.match(fieldReports,/The Orchard of Glass Fruit/);
  assert.match(fieldReports,/data-topic="The Orchard of Glass Fruit"/);
  assert.ok(fieldReports.indexOf('Dispatch OGF 1:') < fieldReports.indexOf('Dispatch OGF 9:'));
  const ogf1 = fs.readFileSync(path.join(root,'dist/articles/2026-07-03-glass-fruit-draws-crowds-to-alderwick-market/index.html'),'utf8');
  assert.match(ogf1,/href="\/articles\/2026-07-06-people-in-the-pears-demand-their-privacy\/"/);
  const ogf9 = fs.readFileSync(path.join(root,'dist/articles/2026-07-28-rill-orchard-reopens-without-its-glass-harvest/index.html'),'utf8');
  assert.doesNotMatch(ogf9,/href="\/articles\/2026-07-23-a-second-crack-sends-water-into-the-lower-quarter\/"/);
  // Bell Beneath Alderwick articles also on Field Reports, sorted oldest-first
  assert.match(fieldReports,/Dispatch BBA 1: A Bell Is Heard Beneath the Market Square/);
  assert.match(fieldReports,/The Bell Beneath Alderwick/);
  assert.match(fieldReports,/data-topic="The Bell Beneath Alderwick"/);
  assert.ok(fieldReports.indexOf('Dispatch BBA 1:') < fieldReports.indexOf('Dispatch BBA 9:'));
  const bba1 = fs.readFileSync(path.join(root,'dist/articles/2026-06-08-a-bell-is-heard-beneath-the-market-square/index.html'),'utf8');
  assert.match(bba1,/href="\/articles\/2026-06-10-new-dates-appear-in-old-hospital-register\/"/);
  const bba9 = fs.readFileSync(path.join(root,'dist/articles/2026-06-25-archive-preserves-names-of-the-st-oran-patients/index.html'),'utf8');
  assert.doesNotMatch(bba9,/href="\/articles\/2026-06-21-alderwick-bell-rings-one-final-time\/"/);
  const worldNews=fs.readFileSync(path.join(root,'dist/category/world-news/index.html'),'utf8');
  assert.match(worldNews,/Council Hears Petition on Western Bridge Toll/);
  assert.match(worldNews,/Reading Room to Open an Hour Earlier/);
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
  assert.match(home,/Marketplace<\/a><a href="\/category\/whos-who\/">Who&#39;s Who<\/a><\/nav>/);
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
  assert.match(worldNews,/<select id="topic-select">/);
  assert.match(worldNews,/<option value="World News">World News<\/option>/);
  assert.match(worldNews,/data-topic="World News"/);
  assert.doesNotMatch(home,/<select id="topic-select">/);
  const generated = JSON.parse(fs.readFileSync(path.join(root,'src/generated/articles.json'),'utf8'));
  assert.ok(generated.topicsByCategory);
  assert.ok(Array.isArray(generated.topicsByCategory['world-news']));
  assert.ok(generated.topicsByCategory['world-news'].includes('World News'));
});

test('agony column uses the Alderwick agony notices in source order', () => {
  execFileSync('npm', ['run','build'], {cwd:root, stdio:'pipe'});
  const agony=fs.readFileSync(path.join(root,'dist/category/agony-column/index.html'),'utf8');
  assert.match(agony,/A LOST KEY/);
  assert.match(agony,/To the lady who found a little brass key upon the receiving-hall steps on Tuesday/);
  assert.doesNotMatch(agony,/<a href="\/articles\/2026-09-21-a-lost-key\/">A LOST KEY/);
  assert.match(agony,/FINAL INSERTION/);
  assert.match(agony,/The lantern will burn in the upper window until the person it was meant for arrives/);
  assert.doesNotMatch(agony,/<a href="\/articles\/2026-09-21-final-insertion\/">FINAL INSERTION/);
  assert.doesNotMatch(agony,/Agony Column:|The following paid insertion|The Correspondent supplies no official explanation/);
  assert.doesNotMatch(agony,/A Small Silver Compass Found|Small Brass Case Missing from Quay Road|On a Book Promised and Never Sent|A Letter Concerning an Unanswered Invitation/);
  assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-21-a-lost-key/index.html')));
  assert.ok(fs.existsSync(path.join(root,'dist/articles/2026-09-21-final-insertion/index.html')));
  assert.equal(fs.existsSync(path.join(root,'dist/category/agony-column/page/2/index.html')), false);
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
  assert.equal(index.records.length,139);
  assert.ok(index.records.some(record => /prime referent/.test(record.text)));
  assert.ok(index.records.some(record => record.category === 'whos-who' && /yvette saint clair/.test(record.text)));
  assert.ok(index.records.some(record => record.category === 'common-enquiries' && /what is the eidetic stratum/.test(record.text)));
  assert.ok(index.records.some(record => record.category === 'agony-column' && /final insertion/.test(record.text)));
});
