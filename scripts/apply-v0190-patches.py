from pathlib import Path
import re


def replace_if_present(text, old, new):
    return text.replace(old, new, 1) if old in text else text


# POS: ocho tickets consistentes y confirmaciones seguras.
pos=Path('pos-module.js')
s=pos.read_text(encoding='utf-8')
s=s.replace('const MAX_TICKETS = 7;','const MAX_TICKETS = 8;',1)
new_close='''  async function closeTicket(id) {
    const t = posTickets.find((x) => x.id === id);
    if (!t) return;
    if (t.cart.length) {
      if (!window.SOLRAKDialog?.confirm) {
        notice("El diálogo seguro todavía no está listo.", true);
        return;
      }
      const accepted = await window.SOLRAKDialog.confirm(
        `¿Cerrar el Ticket #${id}? Se quitarán sus productos sin afectar inventario.`,
        { title: "Cerrar ticket", confirmLabel: "Cerrar ticket", danger: true },
      );
      if (!accepted) return;
    }'''
if 'async function closeTicket(id)' not in s:
    s,n=re.subn(r'  function closeTicket\(id\) \{\n    const t = posTickets\.find\(\(x\) => x\.id === id\);\n    if \(!t\) return;\n    if \(\n      t\.cart\.length &&\n      !confirm\(\n        `¿Cerrar el Ticket #\$\{id\}\? Se quitarán sus productos sin afectar inventario\.`,\n      \)\n    \)\n      return;',new_close,s,count=1)
    if n!=1: raise SystemExit('No se pudo parchear closeTicket')
new_clear='''    byId("posClear").onclick = async () => {
      if (posCart.length) {
        if (!window.SOLRAKDialog?.confirm) return notice("El diálogo seguro todavía no está listo.", true);
        const accepted = await window.SOLRAKDialog.confirm(
          `¿Limpiar el Ticket #${currentTicket().id}?`,
          { title: "Vaciar ticket", confirmLabel: "Vaciar", danger: true },
        );
        if (!accepted) return;
      }'''
if 'byId("posClear").onclick = async () =>' not in s:
    s,n=re.subn(r'    byId\("posClear"\)\.onclick = \(\) => \{\n      if \(\n        posCart\.length &&\n        !confirm\(`¿Limpiar el Ticket #\$\{currentTicket\(\)\.id\}\?`\)\n      \)\n        return;',new_clear,s,count=1)
    if n!=1: raise SystemExit('No se pudo parchear posClear')
pos.write_text(s,encoding='utf-8')

# Venta/cancelación/devolución: modal de impacto real, sin prompt/confirm nativos.
fiel=Path('solrak-sumapro-fiel-v0171.js')
s=fiel.read_text(encoding='utf-8')
cancel='''  async function cancelActiveSale() {
    const sale = activeSaleDetail?.sale;
    if (!sale) return;
    const ux = window.SOLRAKUXV0190;
    if (!ux?.confirmSaleVoid) return notify("El diálogo seguro todavía no está listo.", true);
    const reason = await ux.confirmSaleVoid(activeSaleDetail);
    if (!clean(reason)) return;
    try {
      await posApi("voidSale", { saleId: sale.id, reason: clean(reason) });
      notify(`Ticket #${sale.sale_number} cancelado.`);
      activeSaleDetail = await posApi("saleDetail", { saleId: sale.id });
      renderSaleDetail();
      await window.FacturaRapidaPOS?.refresh?.();
      await loadTicketList();
    } catch (error) {
      notify(error.message, true);
    }
  }'''
if 'confirmSaleVoid(activeSaleDetail)' not in s:
    s,n=re.subn(r'  async function cancelActiveSale\(\) \{.*?\n  \}\n\n  function receiptFromDetail',cancel+'\n\n  function receiptFromDetail',s,count=1,flags=re.S)
    if n!=1: raise SystemExit('No se pudo parchear cancelActiveSale')
returned='''  async function confirmReturn() {
    if (!activeSaleDetail?.sale) return;
    const items = returnDraft().map(({ sale_item_id, qty }) => ({ sale_item_id, qty }));
    if (!items.length) return notify("Indica qué cantidad devolver.", true);
    const reason = clean(byId("fielReturnReason").value);
    if (!reason) return notify("Escribe el motivo de la devolución.", true);
    const refundMethod = byId("fielRefundMethod").value;
    const ux = window.SOLRAKUXV0190;
    if (!ux?.confirmReturnImpact) return notify("El diálogo seguro todavía no está listo.", true);
    if (!(await ux.confirmReturnImpact(activeSaleDetail, items, refundMethod, reason))) return;
    try {
      const result = await posApi("returnSale", {
        saleId: activeSaleDetail.sale.id,
        cashSessionId: window.FacturaRapidaPOS?.state?.openSession?.id || null,
        items,
        refundMethod,
        reason,
      });
      notify(`Devolución registrada por ${moneyMx(result.total)}.`);
      await loadReturnTicket();
      await window.FacturaRapidaPOS?.refresh?.();
    } catch (error) {
      notify(error.message, true);
    }
  }'''
if 'confirmReturnImpact(activeSaleDetail' not in s:
    s,n=re.subn(r'  async function confirmReturn\(\) \{.*?\n  \}\n\n  function ticketSettings',returned+'\n\n  function ticketSettings',s,count=1,flags=re.S)
    if n!=1: raise SystemExit('No se pudo parchear confirmReturn')
s=s.replace('window.alert(message)','window.SOLRAKDialog?.notice?.(message,{error:true})')
fiel.write_text(s,encoding='utf-8')

# Ticket: el código lineal contiene el folio numérico exacto de la venta.
tickets=Path('solrak-sumapro-tickets-v0169.js')
s=tickets.read_text(encoding='utf-8')
s=s.replace('const barcodeValue = `V${number}`;','const barcodeValue = String(receipt?.saleNumber || 0);',1)
s=s.replace('.replace(/[^V0-9]/g, "");','.replace(/[^0-9]/g, "");',1)
s=s.replace('normalized || "V000000"','normalized || "0"',1)
old='if (settings && settingsStorageKey === key) return settings;'
new='''if (settings && settingsStorageKey === key) {
      if (typeof window.SOLRAKUXV0190?.ticketBarcodeEnabled === "boolean") settings.showBarcode = window.SOLRAKUXV0190.ticketBarcodeEnabled;
      return settings;
    }'''
if old in s:s=s.replace(old,new,1)
marker='    settingsStorageKey = key;'
injected='''    if (typeof window.SOLRAKUXV0190?.ticketBarcodeEnabled === "boolean") settings.showBarcode = window.SOLRAKUXV0190.ticketBarcodeEnabled;
    settingsStorageKey = key;'''
if marker in s and 'settings.showBarcode = window.SOLRAKUXV0190.ticketBarcodeEnabled;\n    settingsStorageKey = key;' not in s:s=s.replace(marker,injected,1)
tickets.write_text(s,encoding='utf-8')

# Cotizaciones: correo y eliminación por modal profesional.
qe=Path('quotes-email-module.js')
s=qe.read_text(encoding='utf-8')
old="""      recipient=normalizeEmail(prompt('Correo del cliente','')||'');
      if(!recipient)return;
      if(!emailOk(recipient))return notice('Escribe un correo válido para enviar la cotización.',true);"""
new="""      if(!window.SOLRAKDialog?.prompt)return notice('El diálogo seguro todavía no está listo.',true);
      const entered=await window.SOLRAKDialog.prompt('Correo del cliente',{title:'Enviar cotización',confirmLabel:'Usar correo',maxlength:254});
      recipient=normalizeEmail(entered||'');
      if(!recipient)return;
      if(!emailOk(recipient))return notice('Escribe un correo válido para enviar la cotización.',true);"""
s=replace_if_present(s,old,new)
qe.write_text(s,encoding='utf-8')

qm=Path('quotes-module.js')
s=qm.read_text(encoding='utf-8')
old="if(action==='delete'){if(!confirm(`¿Eliminar ${quoteFolio(item.quote_number)}?`))return;busy(true);"
new="if(action==='delete'){if(!window.SOLRAKDialog?.confirm)return notice('El diálogo seguro todavía no está listo.',true);const accepted=await window.SOLRAKDialog.confirm(`¿Eliminar ${quoteFolio(item.quote_number)}?`,{title:'Eliminar cotización',confirmLabel:'Eliminar',danger:true});if(!accepted)return;busy(true);"
s=replace_if_present(s,old,new)
qm.write_text(s,encoding='utf-8')

# Fallbacks de avisos antiguos: nunca abrir alertas del navegador.
for name in [
    'solrak-flow-v0173.js',
    'solrak-held-tickets-v0176.js',
    'solrak-price-verifier-v0177.js',
    'solrak-reports-v0172.js',
    'solrak-sales-v0174.js',
]:
    p=Path(name)
    text=p.read_text(encoding='utf-8')
    text=text.replace('window.alert(message)','window.SOLRAKDialog?.notice?.(message,{error:true})')
    p.write_text(text,encoding='utf-8')

shifts=Path('solrak-shifts-v0189.js')
s=shifts.read_text(encoding='utf-8')
s=s.replace('function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};if(error)window.alert?.(message)}','function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};window.SOLRAKDialog?.notice?.(message,{error})}',1)
shifts.write_text(s,encoding='utf-8')

# HTML principal: reemplazar confirmaciones legacy por el servicio de diálogos.
index=Path('index.html')
s=index.read_text(encoding='utf-8')
s=s.replace("$('deleteProduct').onclick=async()=>{if(!editingProductId||!confirm('¿Eliminar este producto?'))return;", "$('deleteProduct').onclick=async()=>{if(!editingProductId)return;if(!(await window.SOLRAKDialog?.confirm?.('¿Eliminar este producto?',{title:'Eliminar producto',confirmLabel:'Eliminar',danger:true})))return;",1)
s=s.replace("if(!confirm('¿Eliminar este borrador?'))return;", "if(!(await window.SOLRAKDialog?.confirm?.('¿Eliminar este borrador?',{title:'Eliminar borrador',confirmLabel:'Eliminar',danger:true})))return;",1)
s=s.replace("if(!confirm(warning))return;", "if(!(await window.SOLRAKDialog?.confirm?.(warning,{title:'Eliminar cliente',confirmLabel:'Eliminar',danger:true})))return;",1)
s=s.replace("if(p.err&&!confirm('Hay '+p.err+' fila(s) con error. Se omitirán y se importarán '+p.valid.length+' válidas. ¿Continuar?'))return;", "if(p.err&&!(await window.SOLRAKDialog?.confirm?.('Hay '+p.err+' fila(s) con error. Se omitirán y se importarán '+p.valid.length+' válidas. ¿Continuar?',{title:'Importación parcial',confirmLabel:'Importar válidos',danger:true})))return;",1)
s=s.replace("if(excelPreview.errors&&!confirm('Hay '+excelPreview.errors+' fila(s) con error que serán omitidas. ¿Importar los '+count+' productos válidos?'))return;", "if(excelPreview.errors&&!(await window.SOLRAKDialog?.confirm?.('Hay '+excelPreview.errors+' fila(s) con error que serán omitidas. ¿Importar los '+count+' productos válidos?',{title:'Importar inventario',confirmLabel:'Importar válidos',danger:true})))return;",1)
tag='<script src="solrak-keyboard-ticket-ux-v0190.js"></script>'
if tag not in s:
    if '</body>' not in s: raise SystemExit('index.html no contiene </body>')
    s=s.replace('</body>',tag+'\n</body>',1)
index.write_text(s,encoding='utf-8')

print('v0.1.90 patches applied')
