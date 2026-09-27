import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { editionDate } from '../src/lib/dates.mjs';

const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const schema = JSON.parse(fs.readFileSync(path.join(siteRoot, 'content/article.schema.json'), 'utf8'));
const validateShape = new Ajv({allErrors:true}).compile(schema);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const imagePattern = /^\/images\/articles\/(\d{4})\/(\d{2})\/(\d{2})\/[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;
const markup=/<\/?[a-z][^>]*>/i;
const headlineWords=value => new Set(value.toLocaleLowerCase('en').match(/[a-z0-9]+/g) || []);

// Pure semantic validation is shared by both the CLI and preparation script.
export function validateRecords(articles, categories, imageExists = () => false) {
  const errors = [];
  const warnings = [];
  const categorySlugs = new Set();
  for (const category of categories) {
    if (!category || !slugPattern.test(category.slug || '') || typeof category.label !== 'string' || !category.label.trim() || markup.test(category.label) || (category.description !== undefined && (typeof category.description !== 'string' || !category.description.trim() || markup.test(category.description))) || categorySlugs.has(category.slug)) {
      errors.push('Invalid or duplicate category entry');
    } else categorySlugs.add(category.slug);
  }
  const ids = new Set();
  const slugs = new Set();
  const titles=[];
  for (const article of articles) {
    if (!validateShape(article)) {
      errors.push(`schema ${article?.id ?? '(unknown)'}: ${validateShape.errors.map(error => `${error.instancePath || '/'} ${error.message}`).join('; ')}`);
      continue;
    }
    const {id, slug, category, published_at, image, related_ids, paragraphs} = article;
    if (ids.has(id)) errors.push(`Duplicate id: ${id}`);
    if (slugs.has(slug)) errors.push(`Duplicate slug: ${slug}`);
    ids.add(id); slugs.add(slug);
    if (!categorySlugs.has(category)) errors.push(`${id}: unknown category ${category}`);
    let realDate;
    try { editionDate(published_at); realDate = published_at.slice(0,10); }
    catch { errors.push(`${id}: invalid timestamp`); }
    if (realDate && Date.parse(published_at) > Date.now()) errors.push(`${id}: future-dated publication is not authorized`);
    if (realDate && id !== `${realDate}-${slug}`) errors.push(`${id}: id must match UTC timestamp date and slug`);
    if (paragraphs.length < 4) warnings.push(`${id}: short notice (${paragraphs.length} paragraphs); review editorially`);
    if (paragraphs.length > 6) warnings.push(`${id}: long article (${paragraphs.length} paragraphs); review editorially`);
    const plain=[article.title,article.summary,article.author,article.dateline || '',...paragraphs];
    if (image) plain.push(image.alt,image.caption,image.credit);
    if (plain.some(value => markup.test(value))) errors.push(`${id}: fields must be plain text, not markup`);
    const words=headlineWords(article.title);
    for (const prior of titles) {
      const shared=[...words].filter(word => prior.words.has(word)).length;
      const union=new Set([...words,...prior.words]).size;
      if (article.title.toLocaleLowerCase('en')===prior.title.toLocaleLowerCase('en') || (words.size>=4 && prior.words.size>=4 && shared/union>=0.85)) warnings.push(`${id}: near-duplicate headline with ${prior.id}; review editorially`);
    }
    titles.push({id,title:article.title,words});
    if (image !== null) {
      const match = imagePattern.exec(image.src);
      if (!match || (realDate && `${match[1]}-${match[2]}-${match[3]}` !== realDate) || !imageExists(image.src)) {
        errors.push(`${id}: invalid or missing image asset`);
      }
    }
    if (related_ids.includes(id)) errors.push(`${id}: related link cannot point to itself`);
  }
  for (const article of articles) {
    if (validateShape(article)) {
      for (const id of article.related_ids) if (!ids.has(id)) errors.push(`${article.id}: missing related id ${id}`);
    }
  }
  return {errors, warnings};
}

function walkJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkJson(full) : entry.isFile() && entry.name.endsWith('.json') ? [full] : [];
  }).sort();
}

export function loadArchive(root = siteRoot) {
  const categories = JSON.parse(fs.readFileSync(path.join(root, 'content/categories.json'), 'utf8'));
  const files = walkJson(path.join(root, 'content/articles'));
  const articles = files.map(file => {
    const article = JSON.parse(fs.readFileSync(file, 'utf8'));
    const expected = path.join(root, 'content/articles', ...article.published_at?.slice(0,10).split('-') ?? [], `${article.slug}.json`);
    if (file !== expected) throw new Error(`${file}: file path must match UTC date and slug`);
    return article;
  });
  const result = validateRecords(articles, categories, src => fs.existsSync(path.join(root, 'public', src.slice(1))));
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  return {articles, categories, warnings:result.warnings};
}
