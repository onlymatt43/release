"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Contract } from "@/lib/contract";
import ConsentChecklist, { allRequiredChecked } from "./ConsentChecklist";
import ContractText from "./ContractText";
import { getAppDict } from "@/lib/app-i18n";
import type { Locale } from "@/lib/locale";

export default function RequestForm({ contract, canAutoRemind, locale }: { contract: Contract; canAutoRemind: boolean; locale: Locale }) {
  const router = useRouter();
  const t = getAppDict(locale).request;
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("");
  const [iSign, setISign] = useState(true);
  const [theySign, setTheySign] = useState(true);
  const [autoRemind, setAutoRemind] = useState(false);
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

  const ready =
    handle.trim().replace(/^@/, "").length > 0 &&
    (iSign || theySign) &&
    (!iSign || allRequiredChecked(contract.consents, checked));

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, title, requesterSigns: iSign, invitedSign: theySign, autoRemind, consents: Array.from(checked) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404 && typeof data.setupUrl === "string" && data.setupUrl) {
        window.location.assign(data.setupUrl);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      router.push(`/app/a/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }, [ready, busy, handle, title, iSign, theySign, autoRemind, checked, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request a consent</CardTitle>
        <CardDescription>
          Your profile on file is used as is. The other party accepts with theirs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <Label htmlFor="req-handle">{t.theirHandle} *</Label>
            <Input
              id="req-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={t.handlePlaceholder}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="req-title">{t.reference}</Label>
            <Input
              id="req-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.referencePlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t.whoSigns}</Label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={iSign} onChange={(e) => setISign(e.target.checked)} />
              <span>{t.iSign}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={theySign} onChange={(e) => setTheySign(e.target.checked)} />
              <span>{t.theySign}</span>
            </label>
            {!iSign && !theySign && <p className="text-xs text-destructive">{t.atLeastOne}</p>}
            {!iSign && theySign && <p className="text-xs text-muted-foreground">{t.onlyTheySign}</p>}
            {iSign && !theySign && <p className="text-xs text-muted-foreground">{t.onlyISign}</p>}
          </div>

          {canAutoRemind && theySign && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={autoRemind} onChange={(e) => setAutoRemind(e.target.checked)} />
              <span>{t.autoRemind}</span>
            </label>
          )}

          <ContractText contract={contract} />
          {iSign && <ConsentChecklist consents={contract.consents} checked={checked} onToggle={toggle} locale={locale} />}

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={!ready || busy} className="w-full">
            {busy ? t.submitting : t.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
