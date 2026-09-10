// Resolve profile image references (data: URIs or URLs) into bytes for the
// PDF renderer. Images are never stored by release: they are fetched at
// render time from what the profile carries.

import { allowedImageOrigins, providerAuthHeaders } from "@/lib/identity/http-jwt";

/** Largest image accepted, in bytes (PROFILE_IMAGE_MAX_BYTES, default 5 MB). */
export function imageMaxBytes(): number {
  const n = Number.parseInt(process.env.PROFILE_IMAGE_MAX_BYTES ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 5 * 1024 * 1024;
}

function urlAllowed(src: string): boolean {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return allowedImageOrigins().has(u.origin);
  } catch {
    return false;
  }
}

export type ImageFormat = "png" | "jpg";

export interface ResolvedImage {
  data: Buffer;
  format: ImageFormat;
}

function formatFromMime(mime: string): ImageFormat | null {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  return null;
}

function formatFromBytes(buf: Buffer): ImageFormat | null {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  return null;
}

/**
 * Resolve one image reference. Only data: URIs and URLs on an allowed origin
 * are honoured, so a profile can never make release fetch an arbitrary or
 * internal address. Anything else, or anything over the size cap, is null
 * and the document shows the image as unavailable.
 */
export async function resolveImage(src: string): Promise<ResolvedImage | null> {
  const max = imageMaxBytes();
  try {
    if (src.startsWith("data:")) {
      if (src.length > max * 1.4) return null; // base64 overhead bound
      const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(src);
      if (!match) return null;
      const [, mime = "", b64, payload] = match;
      const data = b64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
      if (data.length > max) return null;
      const format = formatFromMime(mime) ?? formatFromBytes(data);
      return format ? { data, format } : null;
    }

    if (!urlAllowed(src)) return null;
    const res = await fetch(src, { headers: providerAuthHeaders(src), cache: "no-store", redirect: "error" });
    if (!res.ok) return null;
    const declared = Number.parseInt(res.headers.get("content-length") ?? "", 10);
    if (Number.isFinite(declared) && declared > max) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > max) return null;
    const format = formatFromMime(res.headers.get("content-type") ?? "") ?? formatFromBytes(data);
    return format ? { data, format } : null;
  } catch {
    return null;
  }
}
