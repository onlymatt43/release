export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";

/**
 * Page walk-in : crée automatiquement un shoot "Walk-in" et redirige
 * vers le formulaire de consentement correspondant.
 */
export default async function WalkInPage() {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  const result = await db.execute({
    sql: `INSERT INTO shoots (title, shoot_date, photographer)
          VALUES (:title, :shoot_date, :photographer)
          RETURNING id`,
    args: {
      title: `Walk-in – ${today}`,
      shoot_date: today,
      photographer: "—",
    },
  });

  const id = result.rows[0].id as string;
  redirect(`/consent/${id}`);
}
