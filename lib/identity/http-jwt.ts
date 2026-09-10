// Identity provider reached over HTTP: the provider signs a short-lived entry
// token (HS256 JWT) when it sends a visitor to release, and exposes a profile
// endpoint release calls server-to-server with a shared bearer secret.
//
// Configuration (all read at call time):
//   IDENTITY_PROVIDER_NAME   label shown on the sign-in prompt
//   IDENTITY_LOGIN_URL       where a visitor without a session is sent; the
//                            return URL is appended as ?return_to=
//   IDENTITY_PROFILE_SETUP_URL  where a subject without a profile is sent to
//                            fill it in; the return URL is appended as
//                            ?return_to= and the provider sends them back
//                            there once done
//   IDENTITY_JWT_SECRET      HS256 secret the provider signs entry tokens with
//   IDENTITY_JWT_ISSUER      optional expected "iss" claim
//   IDENTITY_JWT_AUDIENCE    optional expected "aud" claim
//   IDENTITY_PROFILE_URL     profile endpoint; "{id}" and "{handle}" are
//                            replaced by the subject's values
//   IDENTITY_RESOLVE_URL     optional handle lookup; "{handle}" is replaced.
//                            Returns { id, handle, name?, avatar? } or 404.
//   IDENTITY_SHARED_SECRET   bearer sent to the profile and resolve endpoints
//                            and to any image URL on the same origin
//   IDENTITY_IMAGE_ORIGINS   optional comma-separated extra origins profile
//                            image URLs may point to (the provider's own
//                            origin is always allowed)

import { jwtVerify } from "jose";
import {
  IdentityError,
  parseIdentity,
  parseProfile,
  type Identity,
  type IdentityProvider,
  type Profile,
} from "./types";

function env(name: string): string | null {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new IdentityError(`Identity provider not configured: ${name} is unset`, 500);
  return v;
}

export function profileOrigin(): string | null {
  const url = env("IDENTITY_PROFILE_URL");
  if (!url) return null;
  try {
    return new URL(url.replace("{id}", "x").replace("{handle}", "x")).origin;
  } catch {
    return null;
  }
}

/** Origins release may fetch profile images from: the provider's, plus any configured extras. */
export function allowedImageOrigins(): Set<string> {
  const origins = new Set<string>();
  const provider = profileOrigin();
  if (provider) origins.add(provider);
  for (const raw of (env("IDENTITY_IMAGE_ORIGINS") ?? "").split(",")) {
    const t = raw.trim();
    if (!t) continue;
    try { origins.add(new URL(t).origin); } catch { /* ignore malformed */ }
  }
  return origins;
}

/** Authorization header for a URL served by the identity provider, if any. */
export function providerAuthHeaders(url: string): Record<string, string> {
  const origin = profileOrigin();
  const secret = env("IDENTITY_SHARED_SECRET");
  if (!origin || !secret) return {};
  try {
    return new URL(url).origin === origin ? { Authorization: `Bearer ${secret}` } : {};
  } catch {
    return {};
  }
}

async function fetchProviderJson(url: string): Promise<{ status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", ...providerAuthHeaders(url) },
      cache: "no-store",
    });
  } catch {
    throw new IdentityError("Identity provider unreachable", 502);
  }
  if (res.status === 404) return { status: 404, body: null };
  if (!res.ok) throw new IdentityError(`Identity provider returned ${res.status}`, 502);
  try {
    return { status: res.status, body: await res.json() };
  } catch {
    throw new IdentityError("Identity provider returned invalid JSON", 502);
  }
}

function withReturn(base: string | null, returnTo: string): string | null {
  if (!base) return null;
  try {
    const u = new URL(base);
    u.searchParams.set("return_to", returnTo);
    return u.toString();
  } catch {
    return null;
  }
}

export const httpJwtProvider: IdentityProvider = {
  get name() {
    return env("IDENTITY_PROVIDER_NAME") ?? "your account";
  },

  loginUrl(returnTo: string): string | null {
    return withReturn(env("IDENTITY_LOGIN_URL"), returnTo);
  },

  profileSetupUrl(returnTo: string): string | null {
    return withReturn(env("IDENTITY_PROFILE_SETUP_URL"), returnTo);
  },

  async verifyEntryToken(token: string): Promise<Identity> {
    const secret = new TextEncoder().encode(requireEnv("IDENTITY_JWT_SECRET"));
    const issuer = env("IDENTITY_JWT_ISSUER") ?? undefined;
    const audience = env("IDENTITY_JWT_AUDIENCE") ?? undefined;
    try {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
        ...(issuer ? { issuer } : {}),
        ...(audience ? { audience } : {}),
      });
      return parseIdentity(payload);
    } catch (err) {
      if (err instanceof IdentityError) throw err;
      throw new IdentityError("Invalid or expired entry token", 401);
    }
  },

  async getProfile(subject: Identity): Promise<Profile> {
    const template = requireEnv("IDENTITY_PROFILE_URL");
    const url = template
      .replace("{id}", encodeURIComponent(subject.id))
      .replace("{handle}", encodeURIComponent(subject.handle));
    const { status, body } = await fetchProviderJson(url);
    if (status === 404) throw new IdentityError("No profile on file for this account", 404);
    return parseProfile(body, subject);
  },

  async resolveHandle(handle: string): Promise<Identity | null> {
    const template = env("IDENTITY_RESOLVE_URL");
    if (!template) return null;
    const url = template.replace("{handle}", encodeURIComponent(handle));
    const { status, body } = await fetchProviderJson(url);
    if (status === 404) throw new IdentityError(`No account found for @${handle}`, 404);
    return parseIdentity(body);
  },
};
