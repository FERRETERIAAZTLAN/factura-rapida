import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import nodemailer from "npm:nodemailer@6.9.16";
import {
  adminNameIsValid,
  businessCodeCandidate,
  businessNameIsValid,
  clean,
  clientIp,
  emailIsValid,
  maskEmail,
  normalizeEmail,
  pinIsValid,
  safeHtml,
  usernameIsValid,
  verificationCodeIsValid,
} from "./registration-core.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...cors,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
});

const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  serviceRole,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const encoder = new TextEncoder();
const hex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const sha256 = async (value) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

function randomDigits(length) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return [...values].map((value) => String(value % 10)).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function rpc(name, args = {}) {
  const result = await db.rpc(name, args);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

async function emailCredentials() {
  return await rpc("get_platform_email_credentials");
}

function mailTransport(config) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: String(config.email || config.from_email || ""),
      pass: String(config.app_password || ""),
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 25000,
    tls: { servername: "smtp.gmail.com" },
  });
}

async function sendVerificationEmail(email, code, businessName) {
  const config = await emailCredentials();
  if (!config?.ready || config?.provider !== "gmail" || !config?.app_password || !(config?.email || config?.from_email)) {
    throw new Error("EMAIL_DELIVERY_NOT_CONFIGURED");
  }
  const sender = String(config.email || config.from_email);
  const name = safeHtml(businessName);
  await mailTransport(config).sendMail({
    from: { name: String(config.from_name || "SOLRAK"), address: sender },
    to: email,
    replyTo: sender,
    subject: "Tu código para crear tu negocio en SOLRAK",
    html: `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;color:#20242a"><div style="font-size:12px;font-weight:800;letter-spacing:.14em;color:#b8520d">SOLRAK</div><h2 style="margin:8px 0">Verifica tu correo</h2><p>Estás creando la cuenta de <strong>${name}</strong>.</p><p>Tu código es:</p><div style="font-size:34px;letter-spacing:.18em;font-weight:800;padding:14px 0">${code}</div><p style="color:#697583">Vence en 10 minutos. Si no solicitaste este registro, ignora el mensaje.</p></div>`,
  });
}

function publicError(error) {
  const message = String(error?.message || error || "");
  if (message.includes("RATE_LIMIT")) return { status: 429, body: { error: "Se hicieron demasiados intentos. Espera un poco y vuelve a intentar." } };
  if (message.includes("EMAIL_ALREADY_REGISTERED")) return { status: 409, body: { error: "Ese correo ya tiene una cuenta." } };
  if (message.includes("BUSINESS_CODE_TAKEN")) return { status: 409, body: { error: "No se pudo reservar un código para el negocio. Intenta nuevamente." } };
  if (message.includes("SIGNUP_EXPIRED")) return { status: 410, body: { error: "El registro venció. Comienza nuevamente." } };
  if (message.includes("CODE_LOCKED")) return { status: 429, body: { error: "Se agotaron los intentos del código. Comienza nuevamente." } };
  if (message.includes("NOT_VERIFIED")) return { status: 400, body: { error: "Primero verifica tu correo." } };
  return { status: 400, body: { error: "No se pudo completar el registro. Revisa los datos e intenta nuevamente." } };
}

async function startSignup(req, body) {
  const businessName = clean(body.businessName, 120);
  const email = normalizeEmail(body.email);
  if (!businessNameIsValid(businessName) || !emailIsValid(email)) {
    return json({ error: "Escribe el nombre del negocio y un correo válido." }, 400);
  }

  const mail = await emailCredentials();
  if (!mail?.ready) return json({ error: "El registro por correo no está disponible en este momento." }, 503);

  const ipSalt = Deno.env.get("PUBLIC_SIGNUP_RATE_LIMIT_SECRET") || serviceRole;
  const ipHash = await sha256(`${clientIp(req.headers)}|${ipSalt}`);
  let signup = null;
  let token = "";
  let verificationCode = "";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    token = randomToken();
    verificationCode = randomDigits(6);
    const suffix = randomDigits(4);
    const businessCode = businessCodeCandidate(businessName, suffix);
    try {
      signup = await rpc("start_public_business_signup", {
        p_token_hash: await sha256(token),
        p_email: email,
        p_business_name: businessName,
        p_business_code: businessCode,
        p_email_code: verificationCode,
        p_ip_hash: ipHash,
      });
      break;
    } catch (error) {
      if (!String(error?.message || error).includes("BUSINESS_CODE_TAKEN") || attempt === 5) throw error;
    }
  }

  if (!signup) throw new Error("BUSINESS_CODE_TAKEN");
  try {
    await sendVerificationEmail(email, verificationCode, businessName);
  } catch (error) {
    await rpc("expire_public_business_signup", { p_token: token }).catch(() => null);
    console.error("public signup email failed", error);
    return json({ error: "No se pudo enviar el código. Intenta más tarde." }, 502);
  }

  return json({
    ok: true,
    token,
    businessCode: signup.business_code,
    emailMasked: maskEmail(email),
    expiresInSeconds: Number(signup.expires_in_seconds || 600),
  });
}

async function verifySignup(body) {
  const token = clean(body.token, 100);
  const email = normalizeEmail(body.email);
  const code = clean(body.code, 6);
  if (token.length < 40 || !emailIsValid(email) || !verificationCodeIsValid(code)) {
    return json({ error: "Código inválido." }, 400);
  }
  const result = await rpc("verify_public_business_signup", { p_token: token, p_email: email, p_code: code });
  if (!result?.verified) return json({ error: "Código incorrecto.", attemptsRemaining: result?.attempts_remaining ?? 0 }, 400);
  return json({ ok: true, verified: true, businessCode: result.business_code });
}

async function completeSignup(body) {
  const token = clean(body.token, 100);
  const email = normalizeEmail(body.email);
  const adminName = clean(body.adminName, 120);
  const username = clean(body.username, 50).toLowerCase();
  const pin = clean(body.pin, 8);
  if (token.length < 40 || !emailIsValid(email) || !adminNameIsValid(adminName) || !usernameIsValid(username) || !pinIsValid(pin)) {
    return json({ error: "Revisa el nombre, usuario y PIN de 6 a 8 dígitos." }, 400);
  }
  const result = await rpc("complete_public_business_signup", {
    p_token: token,
    p_email: email,
    p_admin_name: adminName,
    p_username: username,
    p_pin: pin,
  });
  return json({
    ok: true,
    business: { id: result.business_id, name: result.business_name, code: result.business_code },
    user: { id: result.admin_user_id, name: adminName, username: result.username, role: "admin" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
  const raw = await req.text();
  if (!raw || raw.length > 20000) return json({ error: "Solicitud inválida." }, 400);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "Solicitud inválida." }, 400); }
  const action = clean(body?.action, 30);
  try {
    if (action === "health") return json({ ok: true, service: "tenant-public-signup", version: 1, openRegistration: true, emailCodeRequired: true });
    if (action === "start") return await startSignup(req, body);
    if (action === "verify") return await verifySignup(body);
    if (action === "complete") return await completeSignup(body);
    return json({ error: "Acción no válida." }, 400);
  } catch (error) {
    console.error("tenant-public-signup", action, error);
    const mapped = publicError(error);
    return json(mapped.body, mapped.status);
  }
});
