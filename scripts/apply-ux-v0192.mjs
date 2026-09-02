import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, value) { fs.writeFileSync(file, value); }
function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`No se encontró parche: ${label}`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`Parche ambiguo: ${label}`);
  return source.slice(0, first) + to + source.slice(first + from.length);
}
function replaceRegexOnce(source, regex, to, label) {
  const matches = [...source.matchAll(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g"))];
  if (matches.length !== 1) throw new Error(`Parche ${label}: se esperó 1 coincidencia y hubo ${matches.length}`);
  return source.replace(regex, to);
}

function patchIndex() {
  const file = "index.html";
  let s = read(file);
  s = replaceOnce(
    s,
    `$('deleteProduct').onclick=async()=>{if(!editingProductId||!confirm('¿Eliminar este producto?'))return;busy(true);try{await api('deleteProduct',{id:editingProductId});$('productDialog').close();editingProductId=null;await loadAll();notice('Producto eliminado.')}catch(err){notice(err.message,true)}finally{busy(false)}};`,
    `$('deleteProduct').onclick=async()=>{if(!editingProductId)return;const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Eliminar producto',message:'Se solicitará al servidor retirar este producto del catálogo operativo.',detail:'Las reglas de integridad e historial se validarán antes de aplicar el cambio.',danger:true,confirmText:'Eliminar · Enter'});if(!accepted)return;busy(true);try{await api('deleteProduct',{id:editingProductId});$('productDialog').close();editingProductId=null;await loadAll();notice('Producto eliminado.')}catch(err){notice(err.message,true)}finally{busy(false)}};`,
    "confirmación eliminar producto",
  );
  s = replaceOnce(
    s,
    `document.querySelectorAll('[data-deldraft]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Eliminar este borrador?'))return;busy(true);try{await api('deleteDraft',{id:b.dataset.deldraft});await loadAll();notice('Borrador eliminado.')}catch(err){notice(err.message,true)}finally{busy(false)}})`,
    `document.querySelectorAll('[data-deldraft]').forEach(b=>b.onclick=async()=>{const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Eliminar borrador',message:'¿Eliminar este borrador de factura?',detail:'Esta acción no timbra CFDI ni modifica inventario.',danger:true,confirmText:'Eliminar · Enter'});if(!accepted)return;busy(true);try{await api('deleteDraft',{id:b.dataset.deldraft});await loadAll();notice('Borrador eliminado.')}catch(err){notice(err.message,true)}finally{busy(false)}})`,
    "confirmación eliminar borrador",
  );
  s = replaceOnce(
    s,
    `btn.onclick=async()=>{const name=c?.name||'este cliente',warning='¿Eliminar a '+name+'?'+String.fromCharCode(10)+String.fromCharCode(10)+'Si tiene historial de facturación, el sistema no permitirá borrarlo.';if(!confirm(warning))return;busy(true);try{await clientDeleteApi(id);if(editingClientId===id)resetClient();if($('invoiceClient').value===id)$('invoiceClient').value='';await loadAll();notice('Cliente eliminado. Se guardó una copia interna de seguridad.')}catch(err){if(err.data?.code==='CLIENT_HAS_HISTORY')notice('No se puede eliminar: este cliente tiene '+Number(err.data.drafts||0)+' borrador(es) y '+Number(err.data.invoices||0)+' factura(s) asociadas.',true);else notice(err.message,true)}finally{busy(false)}};`,
    `btn.onclick=async()=>{const name=c?.name||'este cliente';const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Eliminar cliente',message:'¿Eliminar a '+name+'?',detail:'Si tiene historial, el servidor bloqueará el borrado para conservar la integridad.',danger:true,confirmText:'Eliminar · Enter'});if(!accepted)return;busy(true);try{await clientDeleteApi(id);if(editingClientId===id)resetClient();if($('invoiceClient').value===id)$('invoiceClient').value='';await loadAll();notice('Cliente eliminado. Se guardó una copia interna de seguridad.')}catch(err){if(err.data?.code==='CLIENT_HAS_HISTORY')notice('No se puede eliminar: este cliente tiene '+Number(err.data.drafts||0)+' borrador(es) y '+Number(err.data.invoices||0)+' factura(s) asociadas.',true);else notice(err.message,true)}finally{busy(false)}};`,
    "confirmación eliminar cliente",
  );
  s = replaceOnce(
    s,
    `if(save)save.onclick=async()=>{const p=preview();if(!p.valid.length)return notice('No hay productos válidos para importar.',true);if(p.err&&!confirm('Hay '+p.err+' fila(s) con error. Se omitirán y se importarán '+p.valid.length+' válidas. ¿Continuar?'))return;busy(true);`,
    `if(save)save.onclick=async()=>{const p=preview();if(!p.valid.length)return notice('No hay productos válidos para importar.',true);if(p.err){const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Importar productos válidos',message:'Hay '+p.err+' fila(s) con error que se omitirán.',detail:'Se importarán '+p.valid.length+' fila(s) válidas. Revisa la vista previa antes de continuar.',confirmText:'Importar · Enter'});if(!accepted)return}busy(true);`,
    "confirmación carga masiva",
  );
  s = replaceOnce(
    s,
    `$('frExcelImport').onclick=async()=>{if(!excelPreview?.valid?.length)return;const count=excelPreview.valid.length;if(excelPreview.errors&&!confirm('Hay '+excelPreview.errors+' fila(s) con error que serán omitidas. ¿Importar los '+count+' productos válidos?'))return;busy(true);`,
    `$('frExcelImport').onclick=async()=>{if(!excelPreview?.valid?.length)return;const count=excelPreview.valid.length;if(excelPreview.errors){const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Confirmar importación',message:'Hay '+excelPreview.errors+' fila(s) con error que serán omitidas.',detail:'Se importarán '+count+' productos válidos.',confirmText:'Importar · Enter'});if(!accepted)return}busy(true);`,
    "confirmación Excel",
  );
  s = replaceOnce(
    s,
    `<script src="solrak-peripherals-v0191.js"></script>`,
    `<script src="solrak-peripherals-v0191.js"></script>\n<script src="solrak-ux-hardening-v0192.js"></script>`,
    "carga v0.1.92",
  );
  write(file, s);
}

function patchPos() {
  const file = "pos-module.js";
  let s = read(file);
  s = replaceOnce(
    s,
    `<div class="actions"><span id="posCashState" class="frPosState">Caja cerrada</span><button id="posOpenCash" class="primary compact" type="button">Abrir caja</button><button id="posCloseCash" class="secondary compact hidden" type="button">Cerrar caja</button></div>`,
    ``,
    "controles manuales de caja",
  );
  s = replaceOnce(s, `<button id="posCharge" class="primary full" type="button">Abrir caja para cobrar</button>`, `<button id="posCharge" class="primary full" type="button">Finalizar venta</button>`, "texto cobro");
  s = replaceRegexOnce(
    s,
    /    const openDlg = document\.createElement\("dialog"\);[\s\S]*?    document\.body\.appendChild\(closeDlg\);\n/,
    "",
    "diálogos manuales de caja",
  );
  s = replaceOnce(
    s,
    `  function closeTicket(id) {\n    const t = posTickets.find((x) => x.id === id);\n    if (!t) return;\n    if (\n      t.cart.length &&\n      !confirm(\n        \`¿Cerrar el Ticket #\${id}? Se quitarán sus productos sin afectar inventario.\`,\n      )\n    )\n      return;`,
    `  async function closeTicket(id) {\n    const t = posTickets.find((x) => x.id === id);\n    if (!t) return;\n    if (t.cart.length) {\n      const total = ticketTotals(t).total;\n      const accepted = await window.SOLRAKUXV0192?.confirm?.({\n        title: \`Cerrar Ticket #\${id}\`,\n        message: \`Se quitarán \${t.cart.length} renglón(es) del ticket en espera.\`,\n        detail: \`Importe visible \${mx(total)}. No se ha cobrado: inventario, caja y crédito no cambian.\`,\n        danger: true,\n        confirmText: "Cerrar ticket · Enter",\n      });\n      if (!accepted) return;\n    }`,
    "cerrar ticket seguro",
  );
  s = replaceOnce(
    s,
    `    if (!posState.openSession) {\n      b.textContent = "Abrir caja para cobrar";\n      b.classList.add("frSaleDisabled");\n      return;\n    }`,
    `    if (!posState.openSession) {\n      b.textContent = "Preparar cobro";\n      b.classList.remove("frSaleDisabled");\n      return;\n    }`,
    "estado preparar cobro",
  );
  s = replaceOnce(
    s,
    `  function openPayment() {\n    if (!posState.openSession) {\n      notice("Abre la caja antes de cobrar.", true);\n      return;\n    }`,
    `  async function openPayment() {\n    if (!posState.openSession) {\n      try {\n        await window.SOLRAKFlowV0173?.ensureOperationalSession?.();\n      } catch (error) {\n        notice(error?.message || "No se pudo preparar la sesión técnica de caja.", true);\n        return;\n      }\n    }\n    if (!posState.openSession) {\n      notice("No se pudo preparar la sesión técnica de caja.", true);\n      return;\n    }`,
    "sesión técnica al cobrar",
  );
  s = s.replace(`    byId("posOpenCash")?.classList.toggle("hidden", !!open);\n    byId("posCloseCash")?.classList.toggle("hidden", !open);\n`, "");
  s = replaceOnce(
    s,
    `    byId("posClear").onclick = () => {\n      if (\n        posCart.length &&\n        !confirm(\`¿Limpiar el Ticket #\${currentTicket().id}?\`)\n      )\n        return;\n      posCart = [];\n      currentTicket().cart = posCart;\n      renderCart();\n      renderTickets();\n      renderProductPreview(null);\n    };`,
    `    byId("posClear").onclick = async () => {\n      if (posCart.length) {\n        const accepted = await window.SOLRAKUXV0192?.confirm?.({\n          title: \`Vaciar Ticket #\${currentTicket().id}\`,\n          message: \`Se quitarán \${posCart.length} renglón(es) del ticket actual.\`,\n          detail: \`Importe visible \${mx(totals().total)}. No se modificará inventario porque la venta no está finalizada.\`,\n          danger: true,\n          confirmText: "Vaciar ticket · Enter",\n        });\n        if (!accepted) return;\n      }\n      posCart = [];\n      currentTicket().cart = posCart;\n      renderCart();\n      renderTickets();\n      renderProductPreview(null);\n      setTimeout(() => byId("posSearch")?.focus(), 0);\n    };`,
    "vaciar ticket seguro",
  );
  s = replaceRegexOnce(
    s,
    /    byId\("posOpenCash"\)\.onclick = \(\) => byId\("posOpenDialog"\)\.showModal\(\);\n    byId\("posCloseCash"\)\.onclick = \(\) => byId\("posCloseDialog"\)\.showModal\(\);\n    byId\("posConfirmOpen"\)\.onclick = async \(\) => \{[\s\S]*?    byId\("posConfirmClose"\)\.onclick = async \(\) => \{[\s\S]*?    \};\n/,
    "",
    "bindings manuales de caja",
  );
  write(file, s);
}

function patchQuotes() {
  let s = read("quotes-email-module.js");
  s = replaceOnce(
    s,
    `recipient=normalizeEmail(prompt('Correo del cliente','')||'');`,
    `recipient=normalizeEmail((await window.SOLRAKUXV0192?.prompt?.({title:'Enviar cotización',message:'La cotización no tiene un correo guardado.',label:'Correo del cliente',type:'email',placeholder:'cliente@correo.com',required:true,confirmText:'Usar correo · Enter'}))||'');`,
    "correo de cotización",
  );
  write("quotes-email-module.js", s);

  s = read("quotes-module.js");
  s = replaceOnce(
    s,
    `if(action==='delete'){if(!confirm(\`¿Eliminar \${quoteFolio(item.quote_number)}?\`))return;busy(true);`,
    `if(action==='delete'){const accepted=await window.SOLRAKUXV0192?.confirm?.({title:'Eliminar cotización',message:\`¿Eliminar \${quoteFolio(item.quote_number)}?\`,detail:'La cotización se retirará del listado según las reglas del servidor. No afecta existencias.',danger:true,confirmText:'Eliminar · Enter'});if(!accepted)return;busy(true);`,
    "eliminar cotización",
  );
  write("quotes-module.js", s);
}

function patchLegacyFallbacks() {
  for (const file of [
    "solrak-flow-v0173.js",
    "solrak-held-tickets-v0176.js",
    "solrak-price-verifier-v0177.js",
    "solrak-sales-v0174.js",
  ]) {
    let s = read(file);
    s = s.replace(`else if (error && typeof window.alert === "function") window.alert(message);`, `else console[error ? "error" : "info"]("SOLRAK", message);`);
    write(file, s);
  }
  let s = read("solrak-reports-v0172.js");
  s = s.replace(`else if (error) window.alert(message);`, `else console[error ? "error" : "info"]("SOLRAK", message);`);
  write("solrak-reports-v0172.js", s);

  s = read("solrak-shifts-v0189.js");
  s = s.replace(`if(error)window.alert?.(message)`, `console[error?"error":"info"]("SOLRAK",message)`);
  write("solrak-shifts-v0189.js", s);

  s = read("solrak-sumapro-fiel-v0171.js");
  s = s.replace(`else if (error) window.alert(message);`, `else console[error ? "error" : "info"]("SOLRAK", message);`);
  s = replaceRegexOnce(
    s,
    /  async function cancelActiveSale\(\) \{[\s\S]*?\n  \}\n\n  function receiptFromDetail/,
    `  async function cancelActiveSale() {\n    if (typeof window.SOLRAKUXV0190?.cancelSelectedSale === "function") {\n      return window.SOLRAKUXV0190.cancelSelectedSale();\n    }\n    notify("La confirmación segura de cancelación todavía no está disponible.", true);\n  }\n\n  function receiptFromDetail`,
    "cancelación legado",
  );
  write("solrak-sumapro-fiel-v0171.js", s);
}

patchIndex();
patchPos();
patchQuotes();
patchLegacyFallbacks();
console.log("SOLRAK_APPLY_UX_V0192_OK");
