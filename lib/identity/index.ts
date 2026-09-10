// The identity provider release talks to is chosen by configuration
// (IDENTITY_PROVIDER). Release itself holds no accounts and no profiles.

import type { IdentityProvider } from "./types";
import { httpJwtProvider } from "./http-jwt";

export * from "./types";

const PROVIDERS: Record<string, IdentityProvider> = {
  "http-jwt": httpJwtProvider,
};

export function getIdentityProvider(): IdentityProvider {
  const key = process.env.IDENTITY_PROVIDER?.trim() || "http-jwt";
  const provider = PROVIDERS[key];
  if (!provider) throw new Error(`Unknown IDENTITY_PROVIDER: ${key}`);
  return provider;
}
