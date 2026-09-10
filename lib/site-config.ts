// Per-deployment site identity read from the environment, so this app can be
// redeployed for another operator by changing configuration only. Every value
// is optional: what is unset is omitted from <head> or from the legal pages,
// never replaced by a baked-in default or a placeholder.

import { headers } from "next/headers";

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

// Brand name: site name, og:site_name, and the document title.
export function siteBrandName(): string | null {
  return env('SITE_BRAND_NAME');
}

// Base URL of the brand favicon set (favicon.ico, favicon-32.png,
// favicon-16.png, apple-touch-icon.png live under it), no trailing slash.
export function siteFaviconBaseUrl(): string | null {
  const base = env('SITE_FAVICON_BASE_URL');
  return base ? base.replace(/\/$/, '') : null;
}

// Meta description and og:description.
export function siteDescription(): string | null {
  return env('SITE_DESCRIPTION');
}

// Open Graph share image (1200x630).
export function siteOgImageUrl(): string | null {
  return env('SITE_OG_IMAGE_URL');
}

// Canonical public origin (scheme + host, no path) used as Next's metadataBase.
export function siteUrl(): URL | null {
  const raw = env('SITE_URL');
  if (!raw) return null;
  try {
    return new URL(raw.replace(/\/$/, ''));
  } catch {
    return null;
  }
}

// BCP-47 locale tag (e.g. fr-CA). Drives <html lang> and og:locale.
export function siteLocale(): string | null {
  return env('SITE_LOCALE');
}

// IANA time zone (e.g. America/Toronto) used to format dates shown on
// consent documents. Null when unset, so formatting falls back to the
// runtime's own time zone instead of assuming one.
export function siteTimeZone(): string | null {
  return env('SITE_TIMEZONE');
}

// og:locale (language_TERRITORY) derived from the BCP-47 site locale, or null
// when the locale carries no region.
export function siteOpenGraphLocale(): string | null {
  const locale = siteLocale();
  if (!locale) return null;
  const parts = locale.split('-');
  if (parts.length < 2) return null;
  return `${parts[0].toLowerCase()}_${parts[1].toUpperCase()}`;
}

// Legal name (or brand) of the entity operating the site, shown on the legal
// pages. Null when unset so the pages omit the sentence entirely.
export function siteOperatorName(): string | null {
  return env('SITE_OPERATOR_NAME');
}

// Contact address for privacy requests and legal notices. Null when unset so
// the pages omit the contact line entirely.
export function siteContactEmail(): string | null {
  return env('SITE_CONTACT_EMAIL');
}

// Public base URL for this deployment (scheme + host, no trailing slash),
// used to build absolute links such as a consent-form QR code. Prefers the
// configured SITE_URL; otherwise derives it from the incoming request's own
// host, so it works on any domain (preview, production, custom) with no
// per-deployment configuration at all.
export async function resolveBaseUrl(): Promise<string> {
  const configured = siteUrl();
  if (configured) return configured.toString().replace(/\/$/, '');

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

// ── External integrations (all optional) ──────────────────────────────────

// Base URL of a webhook notified (HTTP PUT, JSON body) when a consent form is
// signed, with the shoot id appended as the last path segment. Null when
// unset, in which case no external notification is sent.
export function consentWebhookBaseUrl(): string | null {
  const raw = env('CONSENT_WEBHOOK_URL');
  if (!raw) return null;
  try {
    return new URL(raw).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

// Names of the content platforms mentioned in the consent form's legal text
// and publication-consent checkbox (e.g. "OnlyFans, Fansly"). Null when
// unset, in which case that text describes platforms generically instead of
// naming any by name.
export function sitePlatformExamples(): string[] | null {
  const raw = env('SITE_PLATFORM_EXAMPLES');
  if (!raw) return null;
  const names = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return names.length ? names : null;
}

// Metadata `icons` entry for the brand favicon set, or an empty object when the
// base URL is unset (so Next emits no icon tags rather than fake ones).
export function siteIconsMetadata() {
  const base = siteFaviconBaseUrl();
  if (!base) return {};
  return {
    icons: {
      icon: [
        { url: `${base}/favicon-32.png`, sizes: '32x32', type: 'image/png' },
        { url: `${base}/favicon-16.png`, sizes: '16x16', type: 'image/png' },
      ],
      shortcut: `${base}/favicon.ico`,
      apple: `${base}/apple-touch-icon.png`,
    },
  };
}
