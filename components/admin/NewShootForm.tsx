"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewShootForm() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: "",
    shootDate: today,
    location: "",
    category: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(<K extends keyof typeof form>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value })), []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/shoots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }, [form, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>New shoot</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. May 2026 Shoot – Paris Studio" required />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="shootDate">Shoot date *</Label>
              <Input id="shootDate" type="date" value={form.shootDate}
                onChange={(e) => set("shootDate", e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Studio, city…" />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="category">Category / Content type (optional)</Label>
              <Input id="category" value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. OnlyFans, Promo, Adult…" />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" value={form.notes}
                onChange={(e) => set("notes", e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}
                disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating…" : "Create shoot"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
