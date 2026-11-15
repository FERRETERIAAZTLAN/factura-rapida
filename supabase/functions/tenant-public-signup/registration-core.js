export function clean(value, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizeEmail(value) {
  return clean(value, 254).toLowerCase();
}

export function emailIsValid(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function businessNameIsValid(value) {
  const name = clean(value, 120);
  return name.length >= 3 && /[\p{L}\p{N}]/u.test(name);
}

export function adminNameIsValid(value) {
  return clean(value, 120).length >= 2;
}

export function usernameIsValid(value) {
  return /^[a-z0-9][a-z0-9._-]{2,49}$/.test(clean(value, 50).toLowerCase());
}

export function pinIsValid(value) {
  return /^\d{6,8}$/.test(clean(value, 8));
}

export function verificationCodeIsValid(value) {
  return /^\d{6}$/.test(clean(value, 6));
}

export function businessCodeCandidate(name, suffix) {
  const stem = clean(name, 120)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  const base = stem.length >= 4 ? stem : `NEGOCIO${stem}`.slice(0, 12);
  return `${base}${String(suffix).replace(/\D/g, "").padStart(4, "0").slice(-4)}`;
}

export function maskEmail(value) {
  const email = normalizeEmail(value);
  const at = email.indexOf("@");
  if (at < 1) return "***";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}

export function safeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[char]);
}

export function clientIp(headers) {
  const forwarded = clean(headers.get("x-forwarded-for"), 300).split(",")[0].trim();
  return forwarded || clean(headers.get("cf-connecting-ip"), 80) || "unknown";
}
