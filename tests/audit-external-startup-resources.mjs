import { readFile } from 'node:fs/promises';

const file = process.argv[2] || 'live.html';
const requireZero = process.argv.includes('--require-zero');
const html = await readFile(file, 'utf8');
const refs = [];
for (const m of html.matchAll(/<(script|link|img|iframe)\b[^>]*?\b(src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
  const tag = m[1].toLowerCase();
  const attr = m[2].toLowerCase();
  const url = m[3];
  if (/^https?:\/\//i.test(url) || /^\/\//.test(url)) refs.push({tag, attr, url, markup:m[0].slice(0,300)});
}
console.log(JSON.stringify({count:refs.length, refs}, null, 2));
if (requireZero && refs.length) throw new Error(`El HTML todavía depende de ${refs.length} recurso(s) externo(s) durante el arranque.`);
