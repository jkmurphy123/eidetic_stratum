// The same selectors drive every feed route, including empty and paginated views.
export const PAGE_SIZE = 25;
export function createArchive(articles, categories) {
  const sorted = [...articles].sort((a,b) => b.published_at.localeCompare(a.published_at) || b.id.localeCompare(a.id));
  const categorySlugs = new Set(categories.map(item => item.slug));
  const tagSlugs = [...new Set(sorted.flatMap(article => article.tags))].sort();
  const tagSet = new Set(tagSlugs);
  const byId = new Map(sorted.map(article => [article.id,article]));

  function slice(items, number) {
    if (!Number.isSafeInteger(number) || number < 1) return null;
    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    if (number > Math.max(totalPages, 1)) return null;
    return {articles:items.slice((number-1)*PAGE_SIZE,number*PAGE_SIZE), number, totalPages, total:items.length};
  }
  const feed = (number=1) => slice(sorted,number);
  const category = (slug,number=1) => categorySlugs.has(slug) ? slice(sorted.filter(article => article.category === slug),number) : null;
  const tag = (slug,number=1) => tagSet.has(slug) ? slice(sorted.filter(article => article.tags.includes(slug)),number) : null;
  const pages = selector => {
    const first = selector(1);
    return first ? Array.from({length:first.totalPages}, (_,i) => selector(i+1)) : [];
  };
  return {feed,category,tag,tags:() => tagSlugs,feedPages:() => pages(feed),categoryPages:slug => pages(n => category(slug,n)),tagPages:slug => pages(n => tag(slug,n)),related:article => article.related_ids.map(id => byId.get(id)).filter(Boolean)};
}
