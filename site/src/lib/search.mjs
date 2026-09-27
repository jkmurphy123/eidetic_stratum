// Serializable index: no HTML, only fields needed to render safe search results.
export const normalize = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[-‐‑‒–—]/g,' ').toLocaleLowerCase('en');
export function createSearchIndex(articles) {
  const records = articles.map(({id,title,summary,category,tags,published_at,paragraphs}) => ({
    id,title,summary,category,tags,published_at,
    url:`/articles/${id}/`, text:normalize([title,summary,category.replaceAll('-',' '),...tags.map(tag => tag.replaceAll('-',' ')),...paragraphs].join(' '))
  }));
  records.sort((a,b) => b.published_at.localeCompare(a.published_at) || b.id.localeCompare(a.id));
  return {version:1,records};
}
export function searchRecords(records, {q='',category='',tag=''} = {}) {
  const terms = normalize(q).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return records.filter(item => (!category || item.category === category) && (!tag || item.tags.includes(tag)) && terms.every(term => item.text.includes(term)));
}
