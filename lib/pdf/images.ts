// Resolve profile image references (data: URIs or URLs) into bytes for the
// PDF renderer. Images are never stored by release: they are fetched at
// render time from what the profile carries.

import { providerAuthHeaders } from "@/lib/identity/http-jwt";

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

export async function resolveImage(src: string): Promise<ResolvedImage | null> {
  try {
    if (src.startsWith("data:")) {
      const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(src);
      if (!match) return null;
      const [, mime = "", b64, payload] = match;
      const data = b64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
      const format = formatFromMime(mime) ?? formatFromBytes(data);
      return format ? { data, format } : null;
    }

    const res = await fetch(src, { headers: providerAuthHeaders(src), cache: "no-store" });
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    const format = formatFromMime(res.headers.get("content-type") ?? "") ?? formatFromBytes(data);
    return format ? { data, format } : null;
  } catch {
    return null;
  }
}
