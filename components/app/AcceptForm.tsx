"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Contract } from "@/lib/contract";
import ConsentChecklist, { allRequiredChecked } from "./ConsentChecklist";
import { getAppDict } from "@/lib/app-i18n";
import type { Locale } from "@/lib/locale";

export default function AcceptForm({ agreementId, contract, locale }: { agreementId: string; contract: Contract; locale: Locale }) {
  const router = useRouter();
  const t = getAppDict(locale).agreement;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((key: string, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      return next;
    });
  }, []);

  const ready = allRequiredChecked(contract.consents, checked);

  const accept = useCallback(async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/app/agreements/${agreementId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consents: Array.from(checked) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404 && typeof data.setupUrl === "string" && data.setupUrl) {
        window.location.assign(data.setupUrl);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }, [ready, busy, agreementId, checked, router]);

  return (
    <div className="flex flex-col gap-4">
      <ConsentChecklist consents={contract.consents} checked={checked} onToggle={toggle} locale={locale} />
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button onClick={accept} disabled={!ready || busy} className="w-full">
        {busy ? t.accepting : t.accept}
      </Button>
    </div>
  );
}
