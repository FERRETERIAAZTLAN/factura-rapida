import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const path = process.argv[2] || 'desktop/dist/index.html';
const html = await readFile(path, 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
console.log(`PARSER_ANALYSIS scripts=${scripts.length}`);
for (let i=0;i<scripts.length;i++) {
  const attrs=scripts[i][1]||'';
  const body=scripts[i][2]||'';
  const id=attrs.match(/\bid=["']([^"']+)["']/i)?.[1]||'';
  const marker=(attrs.match(/data-fr-[\w-]+=["'][^"']+["']/gi)||[]).join(' ');
  const src=attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1]||'';
  let compiles=true, compileError='';
  if(!src && body.trim()) {
    try { new vm.Script(body,{filename:`parser-${String(i+1).padStart(2,'0')}.js`}); }
    catch(e){compiles=false;compileError=String(e?.message||e)}
  }
  const lines=body.split(/\r?\n/);
  const hits=[];
  for(let n=0;n<lines.length;n++) {
    if(/localStorage|sessionStorage|indexedDB|caches\.|document\.cookie|document\.write|XMLHttpRequest|Atomics\.wait/.test(lines[n])) {
      hits.push(`${n+1}:${lines[n].trim().slice(0,320)}`);
    }
  }
  console.log(`SCRIPT ${String(i+1).padStart(2,'0')} id=${id||'-'} src=${src||'-'} marker=${marker||'-'} bytes=${body.length} compiles=${compiles}`);
  if(compileError) console.log(`  COMPILE_ERROR ${compileError}`);
  for(const h of hits) console.log(`  BLOCKING_API ${h}`);
}
console.log('PARSER_ANALYSIS_END');
