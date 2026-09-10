"use client";

import { useState, useCallback } from "react";
import QRCode from "react-qr-code";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Shoot } from "@/lib/types";

interface ShootCardProps {
  shoot: Shoot;
  baseUrl: string;
}

export default function ShootCard({ shoot, baseUrl }: ShootCardProps) {
  const consentUrl = `${baseUrl}/consent/${shoot.id}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(consentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [consentUrl]);

  return (
    <Card className="flex flex-col gap-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{shoot.title}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {shoot.contract_count ?? 0} contract{(shoot.contract_count ?? 0) !== 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date(shoot.shoot_date).toLocaleDateString("fr-CA")} · {shoot.photographer}
          {shoot.location ? ` · ${shoot.location}` : ""}
        </p>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Link href={`/admin/shoots/${shoot.id}`}>
          <Button variant="outline" size="sm">View contracts</Button>
        </Link>

        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "✓ Copied!" : "Copy link"}
        </Button>

        <Dialog>
          <DialogTrigger>
            <Button variant="outline" size="sm" type="button">QR Code</Button>
          </DialogTrigger>
          <DialogContent className="flex flex-col items-center gap-4">
            <DialogHeader>
              <DialogTitle>{shoot.title}</DialogTitle>
            </DialogHeader>
            <div className="rounded-lg border bg-white p-4">
              <QRCode value={consentUrl} size={220} />
            </div>
            <p className="break-all text-center text-xs text-muted-foreground">
              {consentUrl}
            </p>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "✓ Copied!" : "Copy link"}
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
