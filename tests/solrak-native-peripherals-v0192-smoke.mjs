import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const js=fs.readFileSync("solrak-native-peripherals-v0192.js","utf8");
const rust=fs.readFileSync("desktop-native-v0192/main.rs","utf8");
assert.match(rust,/fn print_thermal_ticket/);
assert.match(rust,/fn raw_spool/);
assert.match(rust,/WritePrinter/);
assert.match(rust,/pDatatype=\"RAW\"/);
assert.match(rust,/0x1d,0x6b,0x49/);
assert.match(rust,/list_windows_printers/);
assert.match(rust,/scale_connect/);
assert.match(rust,/scale_read/);
assert.doesNotMatch(rust,/cfdi|finkok/i);
assert.match(js,/const VERSION = "0\.1\.92"/);
assert.match(js,/window\.SOLRAKDesktop = api/);
assert.match(js,/print_thermal_ticket/);
assert.match(js,/solrak:native:printer:v0192/);
assert.doesNotMatch(js,/\b(alert|confirm|prompt)\s*\(/);

const dom=new JSDOM(`<!doctype html><html><head></head><body><section id="tab-configuracion"></section><input id="posSearch"></body></html>`,{runScripts:"outside-only",url:"https://solrak.test"});
const {window}=dom;
let calls=[];
window.notice=()=>{};
window.__TAURI__={core:{invoke:async(command,args={})=>{
  calls.push({command,args});
  if(command==="desktop_info")return{native:true,hardwareBridge:true,directPrint:true};
  if(command==="list_windows_printers")return[{name:"THERMAL-80",driverName:"Generic",portName:"USB001",isDefault:true}];
  if(command==="list_serial_ports")return[{portName:"COM4",product:"Scale"}];
  if(command==="scale_connect")return{connected:true};
  if(command==="scale_read")return{connected:true,weight:1.25,unit:"kg",raw:"1.250 kg"};
  if(command==="scale_disconnect")return null;
  if(command==="print_thermal_ticket")return{ok:true,printerName:args.job.printerName,folio:args.job.folio,bytesWritten:128};
  throw new Error(`unexpected ${command}`);
}}};
window.eval(js);
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
await new Promise(r=>setTimeout(r,60));
assert.equal(window.SOLRAKNativePeripheralsV0192.version,"0.1.92");
assert.equal(typeof window.SOLRAKDesktop.printTicket,"function");
const printer=window.document.querySelector("#solrakN92Printer");
assert.ok(printer);
await new Promise(r=>setTimeout(r,60));
printer.value="THERMAL-80";
printer.dispatchEvent(new window.Event("change"));
const result=await window.SOLRAKNativePeripheralsV0192.printTicket({
 saleNumber:123,
 businessName:"SOLRAK",
 items:[{name:"Martillo",qty:2,unitPrice:50,total:100}],
 subtotal:86.21,tax:13.79,total:100,
 barcode:true,
});
assert.equal(result.ok,true);
const sent=calls.find(x=>x.command==="print_thermal_ticket");
assert.ok(sent);
assert.equal(sent.args.job.folio,"123");
assert.equal(sent.args.job.printerName,"THERMAL-80");
assert.equal(sent.args.job.barcode,true);
assert.match(sent.args.job.text,/TICKET DE VENTA #123/);
assert.doesNotMatch(sent.args.job.text,/TICKET DE VENTA #000123/);

window.close();
console.log("SOLRAK v0.1.92 native peripherals smoke: OK");
