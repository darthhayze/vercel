// Data loader for the document components. Reads src/content/docs/<doc>.json and <doc>.code.json at build time.
const all = import.meta.glob('/src/content/docs/*.json', { eager: true, import: 'default' }) as Record<string, any>;
const extracted = import.meta.glob('/src/content/docs/_extracted/*.code.json', { eager: true, import: 'default' }) as Record<string, any>;
export function loadDoc(doc: string) {
  return all[`/src/content/docs/${doc}.json`];
}
export function loadCode(doc: string) {
  return all[`/src/content/docs/${doc}.code.json`] ?? extracted[`/src/content/docs/_extracted/${doc}.code.json`];
}
