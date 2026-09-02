from pathlib import Path
import re

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
fiel.write_text(s,encoding='utf-8')

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

shifts=Path('solrak-shifts-v0189.js')
s=shifts.read_text(encoding='utf-8')
s=s.replace('function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};if(error)window.alert?.(message)}','function notify(message,error=false){try{if(typeof notice==="function")return notice(message,error)}catch{};window.SOLRAKDialog?.notice?.(message,{error})}',1)
shifts.write_text(s,encoding='utf-8')

index=Path('index.html')
s=index.read_text(encoding='utf-8')
tag='<script src="solrak-keyboard-ticket-ux-v0190.js"></script>'
if tag not in s:
    if '</body>' not in s: raise SystemExit('index.html no contiene </body>')
    s=s.replace('</body>',tag+'\n</body>',1)
    index.write_text(s,encoding='utf-8')

print('v0.1.90 patches applied')
