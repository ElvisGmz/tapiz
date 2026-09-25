import { lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

/**
 * Fetches a remote image server-side so the browser can draw it on a canvas
 * without CORS tainting. Hardened because it takes arbitrary URLs:
 *  - only answers requests coming from Tapiz itself (Sec-Fetch-Site),
 *  - blocks private/internal addresses at *connect time* (no DNS-rebinding window),
 *  - validates every redirect hop, caps size and time, rejects SVG,
 *  - rate-limits per client IP.
 */

// Vercel caps serverless responses at ~4.5 MB; locally we can afford more.
const MAX_BYTES = process.env.VERCEL ? 4_400_000 : 20 * 1024 * 1024;
const TOO_BIG = `La imagen pesa más de ${Math.floor(MAX_BYTES / 1e6)} MB. Descárgala y súbela como archivo.`;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 4;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/bmp", "image/heic", "image/heif"]);

/* ---------- Address filtering ---------- */

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const)
  blocked.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96], // NAT64
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  blocked.addSubnet(net, prefix, "ipv6");

function isBlockedAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) {
    // IPv4-mapped IPv6 (::ffff:10.0.0.1) is judged by its IPv4 part.
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return blocked.check(mapped[1], "ipv4");
    return blocked.check(address, "ipv6");
  }
  return true;
}

/** DNS lookup used by the socket itself, so the address we validate is the one we connect to. */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as unknown as { address: string; family: number }[];
    if (!list.length || list.some((a) => isBlockedAddress(a.address))) return callback(new Error("Dirección no permitida"), "", 0);
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: typeof list) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function checkUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL no válida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Solo se permiten enlaces http(s)");
  if (url.username || url.password) throw new Error("Enlace no permitido");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Dirección no permitida");
  if (isIP(host) && isBlockedAddress(host)) throw new Error("Dirección no permitida");
  return url;
}

/* ---------- One request, pinned to validated addresses ---------- */

interface Fetched {
  status: number;
  location?: string;
  type: string;
  body?: Buffer;
}

function fetchOnce(url: URL, deadline: number): Promise<Fetched> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      {
        lookup: safeLookup,
        headers: { "user-agent": "Mozilla/5.0 (Tapiz wallpaper studio)", accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8" },
        timeout: Math.max(1, deadline - Date.now()),
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const type = (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location, type });
        }
        if (status < 200 || status >= 300 || !ALLOWED_TYPES.has(type)) {
          res.resume();
          return resolve({ status, type });
        }
        if (Number(res.headers["content-length"] ?? 0) > MAX_BYTES) {
          res.destroy();
          return reject(new Error(TOO_BIG));
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > MAX_BYTES) {
            res.destroy();
            reject(new Error(TOO_BIG));
          } else chunks.push(c);
        });
        res.on("end", () => resolve({ status, type, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("La imagen tardó demasiado en responder")));
    req.on("error", reject);
  });
}

/* ---------- Tiny per-IP rate limit (best effort; serverless instances are short-lived) ---------- */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

/* ---------- Handler ---------- */

const SAFE_HEADERS = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; sandbox",
  // Never let a CDN cache this: the same-origin check must run on every request.
  "cache-control": "private, no-store",
};

const fail = (message: string, status = 400) => Response.json({ error: message }, { status, headers: SAFE_HEADERS });

export async function GET(request: Request) {
  // Only serve Tapiz itself, so the endpoint can't be used as a free public image proxy.
  if (request.headers.get("sec-fetch-site") !== "same-origin") return fail("No permitido", 403);
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (rateLimited(ip)) return fail("Demasiadas imágenes seguidas. Espera un minuto.", 429);

  const target = new URL(request.url).searchParams.get("url");
  if (!target || target.length > 4096) return fail("Falta el parámetro url");

  try {
    const deadline = Date.now() + TIMEOUT_MS;
    let url = checkUrl(target);
    for (let hop = 0; ; hop++) {
      const res = await fetchOnce(url, deadline);
      if (res.location) {
        if (hop >= MAX_REDIRECTS) return fail("Demasiadas redirecciones");
        url = checkUrl(new URL(res.location, url).toString());
        continue;
      }
      if (res.status < 200 || res.status >= 300) return fail(`El servidor respondió ${res.status}`, 502);
      if (!res.body) {
        return fail(
          res.type === "image/svg+xml"
            ? "Las imágenes SVG no están soportadas; usa PNG, JPG o WebP."
            : "Ese enlace no es una imagen (¿copiaste el link de la página en vez del de la imagen?)",
          415,
        );
      }
      return new Response(new Uint8Array(res.body), { headers: { ...SAFE_HEADERS, "content-type": res.type } });
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo descargar la imagen", 400);
  }
}
