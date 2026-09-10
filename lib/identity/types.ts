// Identity and profile as release receives them from the configured identity
// provider. Release never defines what a profile contains: it renders whatever
// sections, fields and images the provider sends, in the order received.

export interface Identity {
  /** Stable subject identifier assigned by the provider (e.g. an X user id). */
  id: string;
  /** Public handle, without a leading "@". */
  handle: string;
  name?: string;
  avatar?: string;
}

export interface ProfileField {
  label: string;
  value: string;
}

export interface ProfileImage {
  label: string;
  /** A data: URI or an absolute URL the provider allows release to fetch. */
  src: string;
}

export interface ProfileSection {
  title: string;
  fields?: ProfileField[];
  images?: ProfileImage[];
}

export interface Profile {
  subject: Identity;
  sections: ProfileSection[];
  /** Signature image applied to documents this subject accepts. */
  signature?: ProfileImage;
}

export interface IdentityProvider {
  /** Human-readable provider name shown on the sign-in prompt. */
  name: string;
  /** Absolute URL a visitor without a session is sent to, with a return URL. */
  loginUrl(returnTo: string): string | null;
  /** Verify a provider-issued entry token and return the identity it carries. */
  verifyEntryToken(token: string): Promise<Identity>;
  /** Fetch the subject's complete, already-filled profile. */
  getProfile(subject: Identity): Promise<Profile>;
  /**
   * Resolve a handle to the stable identity behind it, so an invitation binds
   * to the account rather than to a name that can change hands. Null when
   * the provider offers no such lookup; the invitation then binds to the
   * handle alone.
   */
  resolveHandle(handle: string): Promise<Identity | null>;
}

export class IdentityError extends Error {
  constructor(message: string, readonly status: number = 401) {
    super(message);
    this.name = "IdentityError";
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/** Validate an untrusted value as an Identity, throwing IdentityError otherwise. */
export function parseIdentity(raw: unknown): Identity {
  const o = (raw ?? {}) as Record<string, unknown>;
  const id = asString(o.sub) ?? asString(o.id);
  const handle = asString(o.handle);
  if (!id || !handle) throw new IdentityError("Identity must carry an id and a handle", 502);
  return {
    id,
    handle: normalizeHandle(handle),
    ...(asString(o.name) ? { name: asString(o.name) } : {}),
    ...(asString(o.avatar) ? { avatar: asString(o.avatar) } : {}),
  };
}

function parseImage(raw: unknown): ProfileImage | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const label = asString(o.label);
  const src = asString(o.src);
  if (!src) return null;
  return { label: label ?? "", src };
}

/** Validate an untrusted value as a Profile, dropping malformed entries. */
export function parseProfile(raw: unknown, fallbackSubject: Identity): Profile {
  const o = (raw ?? {}) as Record<string, unknown>;
  const subject = o.subject ? parseIdentity(o.subject) : fallbackSubject;

  const sections: ProfileSection[] = [];
  for (const s of Array.isArray(o.sections) ? o.sections : []) {
    const so = (s ?? {}) as Record<string, unknown>;
    const title = asString(so.title);
    if (!title) continue;
    const fields: ProfileField[] = [];
    for (const f of Array.isArray(so.fields) ? so.fields : []) {
      const fo = (f ?? {}) as Record<string, unknown>;
      const label = asString(fo.label);
      const value = fo.value == null ? undefined : String(fo.value).trim();
      if (label && value) fields.push({ label, value });
    }
    const images: ProfileImage[] = [];
    for (const i of Array.isArray(so.images) ? so.images : []) {
      const img = parseImage(i);
      if (img) images.push(img);
    }
    if (fields.length || images.length) sections.push({ title, fields, images });
  }

  const signature = o.signature ? parseImage(o.signature) : null;

  return { subject, sections, ...(signature ? { signature } : {}) };
}
