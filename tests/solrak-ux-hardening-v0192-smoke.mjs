import fs from "node:fs";
import { JSDOM } from "jsdom";

const source = fs.readFileSync("solrak-ux-hardening-v0192.js", "utf8");
const dom = new JSDOM(`<!doctype html><html><head></head><body><section id="tab-pos"><input id="posSearch"></section></body></html>`, {
  runScripts: "outside-only",
  pretendToBeVisual: true,
  url: "https://solrak.local/",
});
const { window } = dom;
window.notice = () => {};
window.eval(source);

if (window.SOLRAKUXV0192?.version !== "0.1.92") throw new Error("No se expuso SOLRAKUXV0192 v0.1.92");
if (window.document.documentElement.dataset.solrakUx92 !== "1") throw new Error("No se montó la capa UX v0.1.92");
const style = window.document.getElementById("solrakUx92Style")?.textContent || "";
for (const marker of ["#tab-pos .frPosGrid", "#tab-pos .frPosResults", "solrakUx92Head", "Segoe UI"]) {
  if (!style.includes(marker)) throw new Error(`Falta regla de densidad/modal: ${marker}`);
}

const confirmPromise = window.SOLRAKUXV0192.confirm({ title: "Prueba", message: "Confirmar operación", danger: true });
await new Promise((resolve) => setTimeout(resolve, 0));
const dialog = window.document.getElementById("solrakUx92Dialog");
if (!dialog?.hasAttribute("open")) throw new Error("El diálogo de confirmación no abrió");
window.document.getElementById("solrakUx92Confirm").click();
if ((await confirmPromise) !== true) throw new Error("Confirmación no devolvió true");

const promptPromise = window.SOLRAKUXV0192.prompt({ title: "Correo", message: "Captura", label: "Correo", required: true });
await new Promise((resolve) => setTimeout(resolve, 0));
const input = window.document.getElementById("solrakUx92Input");
if (!input) throw new Error("Prompt seguro no creó campo");
input.value = "cliente@example.com";
window.document.getElementById("solrakUx92Confirm").click();
if ((await promptPromise) !== "cliente@example.com") throw new Error("Prompt seguro no devolvió el valor capturado");

const cancelPromise = window.SOLRAKUXV0192.confirm({ title: "Cancelar", message: "Escape" });
await new Promise((resolve) => setTimeout(resolve, 0));
dialog.dispatchEvent(new window.Event("cancel", { cancelable: true }));
if ((await cancelPromise) !== false) throw new Error("Cancelación segura debe devolver false en confirm()");

await new Promise((resolve) => setTimeout(resolve, 0));
if (window.document.activeElement?.id !== "posSearch") throw new Error("El foco no regresó al buscador POS después del modal");

console.log("SOLRAK_UX_HARDENING_V0192_SMOKE_OK confirm=1 prompt=1 escape=1 focus=1 density=1");
