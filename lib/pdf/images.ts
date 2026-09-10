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

function formatFromMimeType(mimeType: string): ImageFormat | null {
  if (!mimeType) return null;
  const m = mimeType.toLowerCase();
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
      const match = /^data:([^;,]+)?((?:;[^;,=]+(?:=[^;,]*)?))*,([\s\S]*)$/.exec(src);
      if (!match) return null;
      const [, mimeType = "", params = "", payload] = match;
      const b64 = params.includes("base64");
      const data = b64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
      if (data.length > max) return null;
      const format = formatFromMimeType(mimeType) ?? formatFromBytes(data);
      return format ? { data, format } : null;
    }

    if (!urlAllowed(src)) return null;
    const res = await fetch(src, { headers: providerAuthHeaders(src), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const declared = Number.parseInt(res.headers.get("content-length") ?? "", 10);
    if (Number.isFinite(declared) && declared > max) return null;

    const chunks: Buffer[] = [];
    let totalSize = 0;
    if (res.body) {
      const reader = res.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalSize += value.length;
          if (totalSize > max) return null;
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
    }

    const data = Buffer.concat(chunks);
    const format = formatFromMimeType(res.headers.get("content-type") ?? "") ?? formatFromBytes(data);
    return format ? { data, format } : null;
  } catch {
    return null;
  }
}
