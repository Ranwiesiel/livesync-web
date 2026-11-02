const JOIN_PATH = "/events/join";

function resolveOrigin(origin?: string): string {
  if (origin) return origin;

  return typeof window === "undefined" ? "" : window.location.origin;
}

/**
 * Membentuk URL halaman join yang bisa dipindai lewat QR code.
 * `origin` opsional agar helper tetap bisa diuji tanpa DOM.
 */
export function buildJoinUrl(code: string, origin?: string): string {
  const params = new URLSearchParams({ code: code.trim() });
  const base = resolveOrigin(origin);

  if (!base) return `${JOIN_PATH}?${params.toString()}`;

  return `${base.replace(/\/+$/, "")}${JOIN_PATH}?${params.toString()}`;
}

/** Mengambil PIN enam digit dari query string URL join. */
export function readJoinCode(search: string): string {
  const code = new URLSearchParams(search).get("code")?.trim() ?? "";

  return /^\d{6}$/.test(code) ? code : "";
}
