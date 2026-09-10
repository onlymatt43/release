"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Contract } from "@/lib/contract";
import ConsentChecklist, { allRequiredChecked } from "./ConsentChecklist";

export default function AcceptForm({ agreementId, contract }: { agreementId: string; contract: Contract }) {
  const router = useRouter();
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
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }, [ready, busy, agreementId, checked, router]);

  return (
    <div className="flex flex-col gap-4">
      <ConsentChecklist consents={contract.consents} checked={checked} onToggle={toggle} />
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button onClick={accept} disabled={!ready || busy} className="w-full">
        {busy ? "Accepting…" : "Accept and sign"}
      </Button>
    </div>
  );
}
