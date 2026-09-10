"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAppDict } from "@/lib/app-i18n";
import type { Locale } from "@/lib/locale";

interface Props {
  agreementId: string;
  handle: string;
  sent: number;
  total: number;
  lastAt: string | null;
  locale: Locale;
}

export default function RemindButton({ agreementId, handle, sent, total, lastAt, locale }: Props) {
  const router = useRouter();
  const t = getAppDict(locale).remind;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const remind = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/app/agreements/${agreementId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (typeof data.composeUrl === "string" && data.composeUrl) {
        window.open(data.composeUrl, "_blank", "noopener");
      } else if (typeof data.text === "string") {
        await navigator.clipboard.writeText(data.text);
        setNote(t.copied);
      }
      router.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }, [busy, agreementId, handle, router, t]);

  const exhausted = sent >= total;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={remind} disabled={busy || exhausted}>
        {exhausted ? t.exhausted : busy ? "…" : t.button(handle)}
      </Button>
      {(sent > 0 || note) && (
        <span className="text-xs text-muted-foreground">
          {note ?? t.counted(sent, total, lastAt ? new Date(lastAt).toLocaleDateString(locale) : null)}
        </span>
      )}
    </div>
  );
}
