import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const write = (file, source) => fs.writeFileSync(file, source);
function once(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`No se encontró parche extra: ${label}`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`Parche extra ambiguo: ${label}`);
  return source.slice(0, first) + to + source.slice(first + from.length);
}

function noNativeAlert(file, variants) {
  let source = read(file);
  let changed = false;
  for (const [from, to] of variants) {
    if (source.includes(from)) {
      source = source.replace(from, to);
      changed = true;
    }
  }
  if (!changed) throw new Error(`No se encontró fallback alert en ${file}`);
  write(file, source);
}

noNativeAlert("solrak-caja-cortes-v0185.js", [[
  `function notice(message,error=false){if(typeof window.notice==="function")window.notice(message,error);else if(error)window.alert?.(message)}`,
  `function notice(message,error=false){if(typeof window.notice==="function")window.notice(message,error);else console[error?"error":"info"]("SOLRAK",message)}`,
]]);

let source = read("solrak-categorias-v0187.js");
source = once(source,
  `function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};if(error)window.alert?.(message)}`,
  `function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};console[error?"error":"info"]("SOLRAK",message)}`,
  "categorías fallback");
source = once(source,
  `    if(!active&&window.confirm?.(\`¿Desactivar la categoría #\${id} \${category.name}?\\n\\nNo se eliminará y su ID quedará reservado.\`)===false)return;`,
  `    if(!active){const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Desactivar categoría',message:\`¿Desactivar la categoría #\${id} \${category.name}?\`,detail:'No se eliminará. Su ID quedará reservado y el servidor impedirá desactivarla si conserva productos activos.',danger:true,confirmText:'Desactivar · Enter'});if(!accepted)return;}`,
  "desactivar categoría");
write("solrak-categorias-v0187.js", source);

source = read("solrak-clients-credit-v0181.js");
source = once(source,
  `function notify(message,error=false){try{if(typeof window.notice==="function")return window.notice(message,error)}catch{} if(error)window.alert?.(message)}`,
  `function notify(message,error=false){try{if(typeof window.notice==="function")return window.notice(message,error)}catch{} console[error?"error":"info"]("SOLRAK",message)}`,
  "clientes fallback");
source = once(source,
  `      if(!next&&window.confirm?.(\`¿Dar de baja a \${client?.name||'este cliente'}?\\n\\nSe conservará todo su historial.\`)===false)return;`,
  `      if(!next){const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Dar de baja cliente',message:\`¿Dar de baja a \${client?.name||'este cliente'}?\`,detail:'Se conservarán ventas, facturas, abonos y saldo. Solo se bloquearán nuevas operaciones que requieran un cliente activo.',danger:true,confirmText:'Dar de baja · Enter'});if(!accepted)return;}`,
  "baja lógica cliente");
write("solrak-clients-credit-v0181.js", source);

source = read("solrak-credit-accounts-v0182.js");
source = once(source,
  `function notify(message,error=false){try{if(typeof window.notice==="function")return window.notice(message,error)}catch{} if(error)window.alert?.(message)}`,
  `function notify(message,error=false){try{if(typeof window.notice==="function")return window.notice(message,error)}catch{} console[error?"error":"info"]("SOLRAK",message)}`,
  "créditos fallback");
source = once(source,
  `  async function voidPayment(movementId){\n    const reason=window.prompt?.("Motivo para cancelar este abono:","Abono capturado por error");if(!String(reason||"").trim())return;\n    if(window.confirm?.("La cancelación restaurará la deuda y, si fue efectivo, retirará ese importe de la caja abierta. ¿Continuar?")===false)return;\n    try{await api("voidPayment",{movementId,reason:String(reason).trim()});notify("Abono cancelado mediante movimiento compensatorio; no se borró el historial.");await loadSummary();if(state.selectedClientId)await selectClient(state.selectedClientId,document.querySelector(\`[data-solrak-credit-client="\${state.selectedClientId}"]\`))}catch(error){notify(error.message,true)}\n  }`,
  `  async function voidPayment(movementId){\n    const movement=(state.history?.movements||[]).find((row)=>row.id===movementId)||null;\n    const reason=await window.SOLRAKUXV0192?.prompt?.({title:'Cancelar abono',message:'La cancelación se registrará como movimiento compensatorio; el abono original permanecerá en el historial.',label:'Motivo',value:'Abono capturado por error',required:true,maxlength:240,confirmText:'Continuar · Enter'});if(!String(reason||'').trim())return;\n    const cash=movement?.payment_method==='cash';\n    const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Confirmar cancelación de abono',message:\`Importe del abono: \${money(movement?.amount||0)}.\`,detail:cash?'Se restaurará la deuda y el servidor validará que exista saldo suficiente para retirar el efectivo de la caja técnica abierta.':'Se restaurará la deuda mediante un movimiento compensatorio. El historial original no se borra.',danger:true,confirmText:'Cancelar abono · Enter'});if(!accepted)return;\n    try{await api("voidPayment",{movementId,reason:String(reason).trim()});notify("Abono cancelado mediante movimiento compensatorio; no se borró el historial.");await loadSummary();if(state.selectedClientId)await selectClient(state.selectedClientId,document.querySelector(\`[data-solrak-credit-client="\${state.selectedClientId}"]\`))}catch(error){notify(error.message,true)}\n  }`,
  "cancelación compensatoria de abono");
write("solrak-credit-accounts-v0182.js", source);

source = read("solrak-inventory-mode-v0188.js");
source = once(source,
  `function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};if(error)window.alert?.(message)}`,
  `function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};console[error?"error":"info"]("SOLRAK",message)}`,
  "modo inventario fallback");
source = once(source,
  `      const ok=window.confirm?.("¿Activar Modo sin Inventario?\\n\\nLas nuevas ventas NO descontarán stock hasta que vuelvas a activar el seguimiento. Las ventas seguirán siendo reales y quedarán registradas.");\n      if(ok===false){if(toggle)toggle.checked=true;return}`,
  `      const ok=await window.SOLRAKUXV0192?.confirm?.({title:'Activar Modo sin Inventario',message:'Las nuevas ventas seguirán siendo reales, pero NO descontarán existencias.',detail:'Cada renglón conservará inventory_applied=false para que cancelaciones y devoluciones futuras no inventen restauraciones de stock.',danger:true,confirmText:'Activar modo · Enter'});\n      if(!ok){if(toggle)toggle.checked=true;return}`,
  "modo sin inventario");
write("solrak-inventory-mode-v0188.js", source);

noNativeAlert("solrak-inventory-v0175.js", [[
  `    if (error) window.alert?.(message);`,
  `    console[error ? "error" : "info"]("SOLRAK", message);`,
]]);
noNativeAlert("solrak-permissions-v0179.js", [[
  `    if(error)window.alert?.(message);`,
  `    console[error?"error":"info"]("SOLRAK",message);`,
]]);

source = read("solrak-product-lifecycle-v0180.js");
source = once(source,
  `    if(error)window.alert?.(message);`,
  `    console[error?"error":"info"]("SOLRAK",message);`,
  "ciclo producto fallback");
source = once(source,
  `    const ok=window.confirm?.(\`¿Dar de baja \${name}?\\n\\nSi tiene historial, SOLRAK lo desactivará y conservará todas sus ventas y movimientos. Solo se eliminará físicamente si nunca tuvo historial.\`);\n    if(ok===false)return;`,
  `    const ok=await window.SOLRAKUXV0192?.confirm?.({title:'Dar de baja producto',message:\`¿Dar de baja \${name}?\`,detail:'Si tiene historial, SOLRAK lo desactivará y conservará ventas y movimientos. Solo se eliminará físicamente si el servidor verifica que nunca tuvo historial.',danger:true,confirmText:'Dar de baja · Enter'});\n    if(!ok)return;`,
  "baja lógica producto");
write("solrak-product-lifecycle-v0180.js", source);

noNativeAlert("solrak-ui-hardening-v0184.js", [[
  `    if(error) window.alert?.(message);`,
  `    console[error?"error":"info"]("SOLRAK",message);`,
]]);
noNativeAlert("solrak-ui-operativa-v0183.js", [[
  `    else if (error) window.alert?.(message);`,
  `    else console[error ? "error" : "info"]("SOLRAK", message);`,
]]);

console.log("SOLRAK_APPLY_UX_V0192_EXTRA_OK");
