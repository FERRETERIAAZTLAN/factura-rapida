import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const desktop = resolve(here, "..");
const repo = resolve(desktop, "..");
const source = resolve(repo, "index.html");
const targetDir = resolve(desktop, "dist");
const target = resolve(targetDir, "index.html");

let html = await readFile(source, "utf8");
if (!html.includes("Factura Rápida")) {
  throw new Error("El index.html del repositorio no parece ser Factura Rápida.");
}

const nativeCss = `
<style id="frNativeDesktopCss">
html.fr-native-desktop body{padding-top:34px}
#frNativeBar{display:none}
html.fr-native-desktop #frNativeBar{
 display:flex;position:fixed;left:0;right:0;top:0;height:34px;z-index:15000;
 align-items:center;justify-content:space-between;gap:12px;padding:0 12px;
 background:#171b21;color:#fff;font:600 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
 box-shadow:0 1px 0 rgba(255,255,255,.08)
}
#frNativeBar .frNativeLeft,#frNativeBar .frNativeRight{display:flex;align-items:center;gap:9px;min-width:0}
#frNativeBar .frNativeApp{font-weight:850;letter-spacing:.02em}
#frNativeBar .frNativeStatus{color:#c8d0d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#frNativeBar .frNativeDot{width:7px;height:7px;border-radius:50%;background:#62c77a;flex:none}
#frNativeBar .frNativeVersion{color:#aeb8c2}

#frDesktopSettings{display:none}
html.fr-native-desktop #frDesktopSettings{display:block}
.fr-settings-wrap{display:grid;gap:16px}
.fr-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.fr-settings-card{background:#fff;border:1px solid #dfe4e9;border-radius:16px;padding:18px;box-shadow:0 8px 28px rgba(16,24,32,.06)}
.fr-settings-card h2,.fr-settings-card h3{margin:0 0 6px}
.fr-settings-card p{margin:5px 0}
.fr-settings-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
.fr-setting-line{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 0;border-top:1px solid #edf0f2}
.fr-setting-line:first-of-type{border-top:0}
.fr-setting-value{font-weight:800;text-align:right}
.fr-update-box{border:1px solid #e3e7eb;border-radius:14px;padding:14px;background:#f8fafb;margin-top:12px}
.fr-update-box.available{border-color:#e9b96d;background:#fff8ec}
.fr-update-box.ok{border-color:#b9dfc7;background:#f3fff7}
.fr-update-box.error{border-color:#e9b7b7;background:#fff6f6}
.fr-update-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
.fr-update-progress{height:8px;border-radius:999px;background:#e6eaee;overflow:hidden;margin-top:12px;display:none}
.fr-update-progress>i{display:block;height:100%;width:0;background:#e97618;transition:width .2s ease}
.fr-switch-row{display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:700}
.fr-switch-row input{width:18px;height:18px}
.fr-confirm-update{display:none;margin-top:12px;padding:12px;border-radius:12px;background:#fff3df;border:1px solid #efc989}
.fr-confirm-update.show{display:block}
.fr-diagnostic{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;color:#57616c;word-break:break-all}
@media(max-width:850px){.fr-settings-grid{grid-template-columns:1fr}}
@media(max-width:700px){#frNativeBar .frNativeStatus{display:none}}
</style>
<div id="frNativeBar">
 <div class="frNativeLeft"><span class="frNativeDot"></span><span class="frNativeApp">SOLRAK · Registro Beta</span><span id="frNativeVersion" class="frNativeVersion"></span></div>
 <div class="frNativeRight"><span id="frNativeUpdate" class="frNativeStatus">En línea</span></div>
</div>
`;

const nativeJs = `
<script id="frNativeDesktopJs">
(function(){
 if(!window.__TAURI__) return;
 document.documentElement.classList.add('fr-native-desktop');
 const invoke=window.__TAURI__.core.invoke;
 const versionBar=document.getElementById('frNativeVersion');
 const statusBar=document.getElementById('frNativeUpdate');
 let desktopInfo=null;
 let latestUpdate=null;

 const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const byId=(id)=>document.getElementById(id);

 function setBar(text){ if(statusBar) statusBar.textContent=text; }
 function settingsSection(){ return byId('frDesktopSettings'); }

 function mountSettings(){
   if(byId('frDesktopSettingsButton')) return;
   const nav=document.querySelector('.nav');
   if(!nav) return;

   const button=document.createElement('button');
   button.type='button';
   button.id='frDesktopSettingsButton';
   button.dataset.tab='fr-configuracion';
   button.textContent='Configuración';
   nav.appendChild(button);

   const section=document.createElement('section');
   section.id='frDesktopSettings';
   section.className='tab-panel hidden';
   section.innerHTML=\`
     <div class="fr-settings-wrap">
       <div>
         <p class="eyebrow">APLICACIÓN DE PRUEBAS PARA WINDOWS</p>
         <h2 style="margin:0">Configuración</h2>
         <p class="muted small">Esta copia se instala junto a SOLRAK y no reemplaza la versión estable.</p>
       </div>
       <div class="fr-settings-grid">
         <article class="fr-settings-card">
           <div class="fr-settings-head"><div><h3>Aplicación</h3><p class="muted small">Información de la aplicación.</p></div><span class="pill ok">Windows</span></div>
           <div class="fr-setting-line"><span>Versión instalada</span><span class="fr-setting-value" id="frSettingsVersion">—</span></div>
           <div class="fr-setting-line"><span>Canal</span><span class="fr-setting-value">Registro Beta</span></div>
           <div class="fr-setting-line"><span>Datos</span><span class="fr-setting-value">Sincronizados</span></div>
         </article>

         <article class="fr-settings-card">
           <div class="fr-settings-head"><div><h3>Actualizaciones</h3><p class="muted small">Mantén Factura Rápida al día con mejoras y correcciones.</p></div><span class="pill" id="frUpdaterBadge">Comprobando</span></div>
           <label class="fr-switch-row"><input type="checkbox" id="frAutoCheck"> Buscar actualizaciones automáticamente</label>
           <div id="frUpdateBox" class="fr-update-box">
             <strong id="frUpdateTitle">Comprobando actualizaciones…</strong>
             <p id="frUpdateText" class="muted small">Esto tomará solo un momento.</p>
             <div id="frUpdateProgress" class="fr-update-progress"><i></i></div>
             <div class="fr-update-actions">
               <button class="secondary compact" type="button" id="frCheckUpdate">Buscar actualizaciones</button>
               <button class="primary compact hidden" type="button" id="frInstallUpdate">Instalar actualización</button>
             </div>
             <div id="frConfirmUpdate" class="fr-confirm-update">
               <strong>¿Instalar ahora?</strong>
               <p class="muted small">Factura Rápida se cerrará durante unos segundos, instalará la versión nueva y podrás abrirla nuevamente.</p>
               <div class="fr-update-actions"><button class="primary compact" type="button" id="frConfirmInstall">Sí, actualizar</button><button class="secondary compact" type="button" id="frCancelInstall">Cancelar</button></div>
             </div>
           </div>
         </article>
       </div>
       <article class="fr-settings-card">
         <div class="fr-settings-head"><div><h3>Acerca de Factura Rápida</h3><p class="muted small">Información general de la aplicación instalada.</p></div></div>
         <div class="fr-setting-line"><span>Estado</span><span class="fr-setting-value" id="frUpdaterReady">—</span></div>
         <div class="fr-setting-line"><span>Canal de actualizaciones</span><span class="fr-setting-value">Desactivado en pruebas</span></div>
       </article>
     </div>\`;

   const shell=document.querySelector('main.shell')||document.querySelector('main')||document.body;
   shell.appendChild(section);

   button.addEventListener('click',()=>{
     document.querySelectorAll('.tab-panel').forEach(el=>el.classList.add('hidden'));
     document.querySelectorAll('.nav button').forEach(el=>el.classList.remove('active'));
     section.classList.remove('hidden');
     button.classList.add('active');
     window.scrollTo({top:0,behavior:'smooth'});
   });

   const auto=byId('frAutoCheck');
   const saved=localStorage.getItem('frDesktopAutoCheck');
   auto.checked=saved===null?true:saved==='1';
   auto.addEventListener('change',()=>localStorage.setItem('frDesktopAutoCheck',auto.checked?'1':'0'));
   byId('frCheckUpdate').addEventListener('click',()=>checkUpdate(true));
   byId('frInstallUpdate').addEventListener('click',()=>byId('frConfirmUpdate').classList.add('show'));
   byId('frCancelInstall').addEventListener('click',()=>byId('frConfirmUpdate').classList.remove('show'));
   byId('frConfirmInstall').addEventListener('click',installUpdate);
 }

 function setUpdateUi(kind,title,text){
   const box=byId('frUpdateBox');
   if(!box)return;
   box.classList.remove('available','ok','error');
   if(kind)box.classList.add(kind);
   byId('frUpdateTitle').textContent=title||'';
   byId('frUpdateText').textContent=text||'';
 }

 function setProgress(value){
   const wrap=byId('frUpdateProgress');
   if(!wrap)return;
   if(value===null||value===undefined){wrap.style.display='none';return;}
   wrap.style.display='block';
   const bar=wrap.querySelector('i');
   if(bar)bar.style.width=Math.max(0,Math.min(100,Number(value)||0))+'%';
 }

 async function loadDesktopInfo(){
   try{
     desktopInfo=await invoke('desktop_info');
     const version=desktopInfo?.version||'';
     if(versionBar)versionBar.textContent='v'+version;
     if(byId('frSettingsVersion'))byId('frSettingsVersion').textContent='v'+version;
     const ready=!!desktopInfo?.updaterConfigured;
     if(byId('frUpdaterReady'))byId('frUpdaterReady').textContent=ready?'Disponible':'No disponible';
     if(byId('frUpdaterBadge')){byId('frUpdaterBadge').textContent=ready?'Actualizado':'No disponible';byId('frUpdaterBadge').classList.toggle('ok',ready);}
     if(ready){
       setUpdateUi('ok', 'Actualizaciones activadas', 'Factura Rápida buscará nuevas versiones de forma segura.');
       setBar('En línea');
       const auto=byId('frAutoCheck');
       if(auto?.checked)setTimeout(()=>checkUpdate(false),1800);
     }else{
       setUpdateUi('', 'Actualizaciones no disponibles', 'No fue posible iniciar el servicio de actualizaciones. Puedes seguir usando Factura Rápida normalmente.');
       setBar('En línea');
     }
   }catch(error){
     setUpdateUi('error','No se pudo leer la configuración',String(error));
   }
 }

 async function checkUpdate(manual){
   if(!desktopInfo?.updaterConfigured){
     if(manual)setUpdateUi('', 'Actualizaciones no disponibles', 'No fue posible iniciar el servicio de actualizaciones. Intenta nuevamente más tarde.');
     return;
   }
   const btn=byId('frCheckUpdate');
   if(btn)btn.disabled=true;
   byId('frInstallUpdate')?.classList.add('hidden');
   setProgress(null);
   setUpdateUi('', 'Buscando actualizaciones…', 'Comprobando si hay una versión nueva disponible.');
   setBar('En línea');
   try{
     const result=await invoke('check_for_updates');
     latestUpdate=result;
     if(result?.available){
       setUpdateUi('available','Nueva versión v'+result.version+' disponible',result.notes||'Hay una actualización lista para instalar.');
       byId('frInstallUpdate')?.classList.remove('hidden');
       setBar('Nueva versión v'+result.version+' disponible');
     }else{
       setUpdateUi('ok','Factura Rápida está actualizada','Tienes la versión más reciente disponible.');
       setBar('En línea');
     }
   }catch(error){
     const msg=String(error||'No fue posible comprobar actualizaciones.');
     setUpdateUi(msg.includes('404')?'ok':'error', msg.includes('404')?'Factura Rápida está actualizada':'No se pudo comprobar', msg.includes('404')?'Tienes la versión más reciente disponible.':'Comprueba tu conexión a internet e inténtalo nuevamente.');
     setBar('En línea');
   }finally{if(btn)btn.disabled=false;}
 }

 async function installUpdate(){
   byId('frConfirmUpdate')?.classList.remove('show');
   const install=byId('frInstallUpdate');
   const check=byId('frCheckUpdate');
   if(install)install.disabled=true;
   if(check)check.disabled=true;
   setUpdateUi('available','Instalando actualización…','No cierres la computadora. Factura Rápida puede cerrarse automáticamente.');
   setProgress(0);
   try{
     await invoke('install_update');
   }catch(error){
     setProgress(null);
     setUpdateUi('error','La actualización no se pudo instalar',String(error));
     if(install)install.disabled=false;
     if(check)check.disabled=false;
   }
 }

 mountSettings();
 loadDesktopInfo();

 function reportBetaReady(){
   const auth=byId('authLayer');
   const login=byId('loginForm');
   const signup=byId('frSignupOpen');
   const modal=byId('frSignupModal');
   const ready=!!(auth&&login&&signup&&modal&&document.documentElement.dataset.frPublicSignup==='1');
   invoke('report_beta_ui_ready',{ready}).catch(()=>{});
 }
 setTimeout(reportBetaReady,500);

 if(window.__TAURI__.event?.listen){
   window.__TAURI__.event.listen('factura-update-state',event=>{
     const state=event?.payload||{};
     if(state.state==='checking')setBar('En línea');
     else if(state.state==='available')setBar('Nueva versión v'+(state.version||'')+' disponible');
     else if(state.state==='downloading'){
       const pct=state.progress;
       setBar('Actualizando a v'+(state.version||'')+(pct!==null&&pct!==undefined?' · '+pct+'%':''));
       setProgress(pct??0);
       setUpdateUi('available','Descargando v'+(state.version||''),state.message||'Descargando actualización…');
     }
     else if(state.state==='downloaded'){
       setProgress(100);setBar('Instalando actualización…');
       setUpdateUi('available','Descarga terminada','Instalando actualización…');
     }
     else if(state.state==='current')setBar('En línea');
     else if(state.state==='disabled')setBar('En línea');
     else if(state.state==='error')setBar('En línea');
   });
 }
})();
</script>
`;

if (!html.includes('id="frNativeBar"')) {
  html = html.replace("<body>", "<body>\n" + nativeCss, 1);
}
if (!html.includes('id="frNativeDesktopJs"')) {
  html = html.replace("</body>", nativeJs + "\n</body>", 1);
}

await mkdir(targetDir, { recursive: true });
await writeFile(target, html, "utf8");
console.log("Factura Rápida web sincronizada para Windows:", target);
