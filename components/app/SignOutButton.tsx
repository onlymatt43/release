"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAppDict } from "@/lib/app-i18n";
import type { Locale } from "@/lib/locale";

export default function SignOutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const label = getAppDict(locale).signOut;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await fetch("/api/app/logout", { method: "POST" });
        router.refresh();
      }}
    >
      {label}
    </Button>
  );
}
