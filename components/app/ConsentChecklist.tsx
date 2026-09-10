"use client";

import type { ContractConsent } from "@/lib/contract";
import { getAppDict } from "@/lib/app-i18n";
import type { Locale } from "@/lib/locale";

interface Props {
  consents: ContractConsent[];
  checked: Set<string>;
  onToggle: (key: string, on: boolean) => void;
  locale: Locale;
}

/** Checkboxes generated from the contract's own consent list. */
export default function ConsentChecklist({ consents, checked, onToggle, locale }: Props) {
  if (!consents.length) return null;
  const requiredLabel = getAppDict(locale).request.required;
  return (
    <div className="flex flex-col gap-2">
      {consents.map((c) => (
        <label key={c.key} className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            checked={checked.has(c.key)}
            onChange={(e) => onToggle(c.key, e.target.checked)}
          />
          <span>
            {c.label}
            {c.required ? ` (${requiredLabel})` : ""}
          </span>
        </label>
      ))}
    </div>
  );
}

export function allRequiredChecked(consents: ContractConsent[], checked: Set<string>): boolean {
  return consents.every((c) => !c.required || checked.has(c.key));
}
