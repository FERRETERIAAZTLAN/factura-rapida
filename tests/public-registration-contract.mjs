import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  businessCodeCandidate,
  businessNameIsValid,
  emailIsValid,
  maskEmail,
  pinIsValid,
  safeHtml,
  usernameIsValid,
} from "../supabase/functions/tenant-public-signup/registration-core.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migrationPath = join(root, "migrations/20261115_public_business_registration.sql");
const edgePath = join(root, "supabase/functions/tenant-public-signup/index.ts");
const injectorPath = join(root, "beta/scripts/inject-registration.mjs");
const stableUiPath = join(root, "index.html");
const configPath = join(root, "beta/windows/src-tauri/tauri.conf.json");
const rustPath = join(root, "beta/windows/src-tauri/src/main.rs");
const workflowPath = join(root, ".github/workflows/windows-registration-beta.yml");

const [migration, edge, injector, stableBefore, configRaw, rust, workflow] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(edgePath, "utf8"),
  readFile(injectorPath, "utf8"),
  readFile(stableUiPath, "utf8"),
  readFile(configPath, "utf8"),
  readFile(rustPath, "utf8"),
  readFile(workflowPath, "utf8"),
]);

const config = JSON.parse(configRaw);
assert.equal(config.productName, "SOLRAK Registro Beta");
assert.equal(config.identifier, "com.facturarapida.desktop.registration-beta");
assert.notEqual(config.identifier, "com.facturarapida.desktop");
assert.match(config.version, /-beta\./);
assert.ok(rust.includes("registration-beta-latest.json"), "La beta no debe consultar el actualizador estable");
assert.ok(rust.includes("solrak-registration-beta-startup.log"));
assert.ok(rust.includes("report_beta_ui_ready"));

assert.match(workflow, /branches:\s*[\s\S]*codex\/windows-public-registration-isolated/);
assert.match(workflow, /permissions:\s*\n\s*contents: read/);
assert.ok(!/gh release create/i.test(workflow), "La beta no debe publicar una versión estable");
assert.ok(!/contents: write/i.test(workflow), "La beta no debe tener permiso de publicación");

for (const name of [
  "start_public_business_signup",
  "verify_public_business_signup",
  "complete_public_business_signup",
  "expire_public_business_signup",
]) {
  assert.ok(migration.includes(`function public.${name}`), `Falta ${name}`);
  assert.match(migration, new RegExp(`revoke execute on function public\\.${name}\\([\\s\\S]*?from public, anon, authenticated;`));
  assert.match(migration, new RegExp(`grant execute on function public\\.${name}\\([\\s\\S]*?to service_role;`));
}
assert.equal((migration.match(/security definer/g) || []).length, 4);
assert.equal((migration.match(/set search_path = ''/g) || []).length, 4);
assert.ok(migration.includes("enable row level security"));
assert.ok(migration.includes("v_recent_email >= 3"));
assert.ok(migration.includes("v_recent_ip >= 6"));
assert.ok(migration.includes("v_recent_global >= 100"));
assert.ok(migration.includes("where upper(code) = upper(v_request.business_code)"));
assert.ok(migration.includes("business_id, name, username, pin_hash"));
assert.ok(migration.includes("public.hash_app_pin(p_pin)"));
assert.ok(migration.includes("auto_send_cfdi_email"));
assert.ok(migration.includes("false"));
assert.match(migration, /cfdi_provider_config[\s\S]*?values \(v_business_id, 'sandbox'\)/);
assert.ok(!/AZTLAN|CASK850914HS9/i.test(migration), "El registro no debe contener datos de Ferretería Aztlán");

assert.ok(edge.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'));
assert.ok(edge.includes('Deno.env.get("PUBLIC_SIGNUP_RATE_LIMIT_SECRET")'));
assert.ok(edge.includes('raw.length > 20000'));
assert.ok(edge.includes('action === "start"'));
assert.ok(edge.includes('action === "verify"'));
assert.ok(edge.includes('action === "complete"'));
assert.ok(!/AZTLAN|CASK850914HS9/i.test(edge), "El endpoint no debe contener datos del negocio original");
assert.ok(!/json\s*\(\s*\{[^}]*serviceRole/s.test(edge), "La clave de servicio no debe incluirse en respuestas");

const syntax = spawnSync(process.execPath, ["--check", edgePath], { encoding: "utf8" });
assert.equal(syntax.status, 0, syntax.stderr || "El endpoint no tiene sintaxis válida");
const injectorSyntax = spawnSync(process.execPath, ["--check", injectorPath], { encoding: "utf8" });
assert.equal(injectorSyntax.status, 0, injectorSyntax.stderr || "El inyector no tiene sintaxis válida");

assert.equal(emailIsValid("Persona@Ejemplo.com"), true);
assert.equal(emailIsValid("correo-invalido"), false);
assert.equal(businessNameIsValid("Ferretería Centro"), true);
assert.equal(usernameIsValid("admin.ventas"), true);
assert.equal(usernameIsValid("A"), false);
assert.equal(pinIsValid("123456"), true);
assert.equal(pinIsValid("1234"), false);
assert.equal(maskEmail("persona@ejemplo.com"), "pe***@ejemplo.com");
assert.equal(safeHtml('<script>"&'), "&lt;script&gt;&quot;&amp;");
const codeA = businessCodeCandidate("Ferretería Centro", "17");
const codeB = businessCodeCandidate("Papelería Norte", "28");
assert.match(codeA, /^[A-Z0-9]{8,20}$/);
assert.match(codeB, /^[A-Z0-9]{8,20}$/);
assert.notEqual(codeA, codeB);

const temp = await mkdtemp(join(tmpdir(), "solrak-signup-"));
try {
  const tempUi = join(temp, "index.html");
  await writeFile(tempUi, stableBefore, "utf8");
  const result = spawnSync(process.execPath, [injectorPath, tempUi], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, FR_SIGNUP_API_URL: "https://example.supabase.co/functions/v1/tenant-public-signup" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const betaHtml = await readFile(tempUi, "utf8");
  assert.equal((betaHtml.match(/data-fr-public-signup="1"/g) || []).length, 2);
  for (const marker of ["frSignupOpen", "frSignupModal", "frSignupStart", "frSignupVerify", "frSignupComplete", "tenant-public-signup"]) {
    assert.ok(betaHtml.includes(marker), `La UI beta no contiene ${marker}`);
  }
  const scripts = [...betaHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let checked = 0;
  for (let index = 0; index < scripts.length; index += 1) {
    if (/\bsrc=["'][^"']+/i.test(scripts[index][1])) continue;
    new vm.Script(scripts[index][2], { filename: `registration-inline-${index + 1}.js` });
    checked += 1;
  }
  assert.ok(checked > 0);
} finally {
  await rm(temp, { recursive: true, force: true });
}

assert.equal(await readFile(stableUiPath, "utf8"), stableBefore, "La prueba modificó la interfaz estable");
assert.ok(injector.includes("Cada negocio conserva sus propios clientes, productos y facturas."));

console.log("PUBLIC_REGISTRATION_CONTRACT_OK: copia Windows separada, registro verificado, límites y aislamiento contractual presentes.");
