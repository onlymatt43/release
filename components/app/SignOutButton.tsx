"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await fetch("/api/app/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
