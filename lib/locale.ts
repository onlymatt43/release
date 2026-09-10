// Locale selection for user-facing pages rendered in the visitor's own
// language (the legal pages). No user accounts exist here, so the browser's
// Accept-Language header IS the visitor's language setting; an explicit
// override (a ?lang= query param from an on-page FR/EN toggle) always wins.

export type Locale = 'fr' | 'en';

export const SUPPORTED_LOCALES: readonly Locale[] = ['fr', 'en'] as const;

// Site default when the visitor expresses no usable preference. An editorial
// identity choice (the site's primary audience), not deployment config.
export const DEFAULT_LOCALE: Locale = 'fr';

function matchSupported(tag: string): Locale | null {
  const lower = tag.trim().toLowerCase();
  return SUPPORTED_LOCALES.find((l) => lower === l || lower.startsWith(`${l}-`)) ?? null;
}

export function pickLocale(
  acceptLanguage: string | null | undefined,
  override?: string | null,
): Locale {
  if (override) {
    const matched = matchSupported(override);
    if (matched) return matched;
  }

  if (acceptLanguage) {
    const preferences = acceptLanguage
      .split(',')
      .map((part) => {
        const [tag, ...params] = part.split(';');
        const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
        const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
        return { tag, q: Number.isFinite(q) ? q : 0 };
      })
      .filter((p) => p.q > 0)
      .sort((a, b) => b.q - a.q);

    for (const { tag } of preferences) {
      const matched = matchSupported(tag);
      if (matched) return matched;
    }
  }

  return DEFAULT_LOCALE;
}
