/** Extract a declared compatibility fragment; the parent remains its sole author. */
export function generatedSources(manifest, read) {
 const derived = new Map();
 for (const entry of manifest.mirrors.filter(entry => entry.generatedFrom)) {
  if (entry.nestedIn !== entry.generatedFrom || !entry.begin || !entry.end) throw Error('Invalid generated compatibility declaration');
  const parent = read(entry.generatedFrom).toString('utf8');
  if (parent.split(entry.begin).length !== 2 || parent.split(entry.end).length !== 2) throw Error('Generated compatibility boundaries must be unique');
  const start = parent.indexOf(entry.begin) + entry.begin.length;
  const end = parent.indexOf(entry.end);
  if (end <= start) throw Error('Invalid generated compatibility boundaries');
  derived.set(entry.source, Buffer.from(parent.slice(start, end).trim() + '\n'));
 }
 return derived;
}
export function checkGenerated(manifest, read) {
 for (const [source, bytes] of generatedSources(manifest, read)) {
  if (!read(source).equals(bytes)) throw Error('Generated compatibility stale: ' + source);
 }
}
