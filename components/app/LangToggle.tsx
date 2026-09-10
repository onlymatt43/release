import Link from "next/link";
import { SUPPORTED_LOCALES } from "@/lib/locale";

/**
 * FR / EN switch. The links are relative (?lang=), so they override the
 * browser's Accept-Language on the current page without needing its path.
 * Only rendered when more than one locale is supported.
 */
export default function LangToggle() {
  if (SUPPORTED_LOCALES.length < 2) return null;
  return (
    <div className="flex items-center gap-1 text-xs opacity-60">
      {SUPPORTED_LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>·</span>}
          <Link href={`?lang=${l}`} className="uppercase tracking-wide hover:underline">
            {l}
          </Link>
        </span>
      ))}
    </div>
  );
}
