// Publication timestamps are real UTC instants; only the reader-facing year shifts.
export function editionDate(timestamp) {
  if (typeof timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(timestamp)) {
    throw new Error('Expected canonical UTC timestamp');
  }
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) + 'Z' !== timestamp) {
    throw new Error('Expected valid UTC timestamp');
  }
  const year = date.getUTCFullYear() - 144;
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (year < 1) throw new Error('UTC timestamp year is too early');
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const adjustedDay = month === 2 && day === 29 && !leap ? 28 : day;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
}

export function printEditionDate(timestamp) {
  const [year, month, day] = editionDate(timestamp).split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[month - 1]} ${day}, ${year}`;
}
