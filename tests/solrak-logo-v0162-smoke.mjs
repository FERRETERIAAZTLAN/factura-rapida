import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const code=fs.readFileSync('solrak-logo-v0162.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head><title>Solrak</title></head><body><div id="authLayer"><div class="card"><form id="loginForm"></form></div></div><nav class="nav"><div id="solrakAppMark">S</div></nav></body></html>`,{url:'https://example.test',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
window.eval(code);
await new Promise(r=>setTimeout(r,80));
const d=window.document;
const assert=(x,m)=>{if(!x)throw new Error(m)};
assert(d.querySelector('#solrakAppMark svg.solrakLogoSvg'),'El menú no recibió el logo vectorial');
assert(d.querySelector('#solrakLoginBrand svg.solrakLogoSvg'),'El login no recibió el logo vectorial');
assert(d.querySelector('#solrakStartupBrand svg.solrakLogoSvg'),'La pantalla de inicio no recibió el logo');
assert(d.title==='SOLRAK','El título visible no quedó en SOLRAK');
assert(code.includes('Punto de venta e inventario'),'Falta descriptor visible del producto');
assert(!/cfdi-api|finkok/i.test(code),'El módulo de logo no debe tocar CFDI/Finkok');
console.log('SOLRAK_LOGO_V0162_SMOKE_OK nav=ok login=ok splash=ok title=SOLRAK');
