"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  agreementId: string;
  handle: string;
  sent: number;
  total: number;
  lastAt: string | null;
}

export default function RemindButton({ agreementId, handle, sent, total, lastAt }: Props) {
  const router = useRouter();
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
        setNote("Message copied. Paste it to them.");
      }
      router.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }, [busy, agreementId, handle, router]);

  const exhausted = sent >= total;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={remind} disabled={busy || exhausted}>
        {exhausted ? "No reminders left" : busy ? "…" : `Remind @${handle}`}
      </Button>
      {(sent > 0 || note) && (
        <span className="text-xs text-muted-foreground">
          {note ?? `Reminded ${sent}/${total}${lastAt ? `, last ${new Date(lastAt).toLocaleDateString()}` : ""}`}
        </span>
      )}
    </div>
  );
}
