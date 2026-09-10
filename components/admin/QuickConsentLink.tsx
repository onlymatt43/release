"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QRCodePanel from "@/components/admin/QRCodePanel";

export default function QuickConsentLink({ baseUrl }: { baseUrl: string }) {
  const [handle, setHandle] = useState("");
  const [consentUrl, setConsentUrl] = useState<string | null>(null);

  const generate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const clean = handle.trim().replace(/^@/, "");
      if (!clean) return;
      setConsentUrl(`${baseUrl}/consent/${encodeURIComponent(clean)}`);
    },
    [handle, baseUrl]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick consent link</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={generate} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="quick-handle">Model handle or username</Label>
            <Input
              id="quick-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="e.g. janedoe"
            />
          </div>
          <Button type="submit">Generate</Button>
        </form>

        {consentUrl && <QRCodePanel consentUrl={consentUrl} />}
      </CardContent>
    </Card>
  );
}
