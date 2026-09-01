import { readFile } from 'node:fs/promises';

const desktop=process.argv[2]||'desktop';
const tauri=JSON.parse(await readFile(`${desktop}/src-tauri/tauri.conf.json`,'utf8'));
const html=await readFile(`${desktop}/dist/index.html`,'utf8');
const rust=await readFile(`${desktop}/src-tauri/src/main.rs`,'utf8');
const files=['quotes-module.js','quotes-email-module.js','product-images-module.js','pos-module.js','solrak-desktop-v0162.js'];
let bundled=html;
for(const file of files){try{bundled+='\n'+await readFile(`${desktop}/dist/${file}`,'utf8')}catch{}}

if(tauri.productName!=='SOLRAK')throw new Error(`productName incorrecto: ${tauri.productName}`);
if(tauri.identifier!=='com.facturarapida.desktop')throw new Error(`identifier cambió: ${tauri.identifier}`);
const main=(tauri.app?.windows||[]).find(w=>w?.label==='main');
if(!main)throw new Error('Falta ventana main');
if(main.title!=='SOLRAK')throw new Error(`Título de ventana incorrecto: ${main.title}`);
if(!bundled.includes('SOLRAK'))throw new Error('La UI empaquetada no contiene SOLRAK');
for(const oldName of ['Factura Rápida','Factura Rapida','FACTURA RÁPIDA','FACTURA RAPIDA']){
 if(bundled.includes(oldName))throw new Error(`Quedó marca visible anterior en el paquete: ${oldName}`);
}
const legacySolrak=/(?<![A-Za-z0-9_.-])Solrak(?![A-Za-z0-9_-])/;
if(legacySolrak.test(bundled))throw new Error('Quedó la palabra visible Solrak con capitalización antigua');
if(!html.includes('solrak-desktop-v0162.js?v=1'))throw new Error('Se alteró el filename técnico del shell');
if(!bundled.includes('SolrakDesktopV0162'))throw new Error('No llegó el namespace técnico del shell SOLRAK v0.1.62');
if(!rust.includes('https://github.com/FERRETERIAAZTLAN/factura-rapida/releases/latest/download/latest.json'))throw new Error('Cambió el endpoint técnico del updater');
if(!rust.includes('factura-rapida-startup.log'))throw new Error('Cambió el canal técnico de diagnóstico');
console.log('SOLRAK_V0162_BRAND_COMPATIBILITY_OK uppercase=true updaterCompatible=true technicalNamesPreserved=true');
