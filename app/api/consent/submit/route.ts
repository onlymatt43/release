import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { siteOperatorName, consentWebhookBaseUrl } from "@/lib/site-config";

interface SubmitPayload {
  shootId: string;
  legalName: string;
  stageName: string;
  mainUrl: string;
  category?: string;
  birthDate: string;
  email: string;
  phone?: string;
  address: string;
  docType?: string;
  signatureData: string;
  rectoIdKey: string;
  versoIdKey: string;
  selfieKey: string;
  consentRecording: boolean;
  consentPublication: boolean;
  consentAdult: boolean;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function isValidR2Key(value: string): boolean {
  return typeof value === "string" && value.startsWith("contracts/") && value.length <= 512;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const p = body as Partial<SubmitPayload>;

  if (!p.shootId || typeof p.shootId !== "string")
    return NextResponse.json({ error: "shootId is required" }, { status: 422 });
  if (!p.legalName || typeof p.legalName !== "string" || p.legalName.trim().length < 2)
    return NextResponse.json({ error: "legalName is required" }, { status: 422 });
  if (!p.stageName || typeof p.stageName !== "string" || p.stageName.trim().length < 2)
    return NextResponse.json({ error: "stageName is required" }, { status: 422 });
  if (!p.mainUrl || typeof p.mainUrl !== "string" || p.mainUrl.trim().length < 5)
    return NextResponse.json({ error: "mainUrl is required" }, { status: 422 });
  if (!p.birthDate || !isValidDate(p.birthDate))
    return NextResponse.json({ error: "birthDate must be YYYY-MM-DD" }, { status: 422 });

  // Verify model is at least 18 years old
  const birthDate = new Date(p.birthDate);
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  if (birthDate > eighteenYearsAgo) {
    return NextResponse.json(
      { error: "Model must be at least 18 years old" },
      { status: 422 }
    );
  }

  if (!p.email || !isValidEmail(p.email))
    return NextResponse.json({ error: "A valid email is required" }, { status: 422 });
  if (!p.address || typeof p.address !== "string" || p.address.trim().length < 5)
    return NextResponse.json({ error: "address is required" }, { status: 422 });
  if (!p.signatureData || !p.signatureData.startsWith("data:image/"))
    return NextResponse.json({ error: "signatureData must be a valid image data-URL" }, { status: 422 });
  for (const keyField of ["rectoIdKey", "versoIdKey", "selfieKey"] as const) {
    if (!isValidR2Key(p[keyField] ?? ""))
      return NextResponse.json({ error: `${keyField} is invalid` }, { status: 422 });
  }
  if (!p.consentRecording || !p.consentPublication || !p.consentAdult)
    return NextResponse.json({ error: "All consents must be accepted" }, { status: 422 });

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;
  const now = new Date().toISOString();
  const email = p.email.toLowerCase().trim();

  try {
    const db = getDb();

    // 0. Auto-créer le shoot si inexistant (ex: shootId = username créateur)
    const today = new Date().toISOString().slice(0, 10);
    await db.execute({
      sql: `INSERT OR IGNORE INTO shoots (id, title, shoot_date, photographer)
            VALUES (:id, :title, :shootDate, :photographer)`,
      args: {
        id: p.shootId,
        title: `Consent - ${p.shootId}`,
        shootDate: today,
        photographer: siteOperatorName() ?? "—",
      },
    });

    // 1. Upsert contact (créer ou mettre à jour par email)
    await db.execute({
      sql: `INSERT INTO contacts
              (legal_name, stage_name, main_url, birth_date, email, phone, address,
               doc_type, recto_id_key, verso_id_key, selfie_key, updated_at)
            VALUES
              (:legalName, :stageName, :mainUrl, :birthDate, :email, :phone, :address,
               :docType, :rectoIdKey, :versoIdKey, :selfieKey, :now)
            ON CONFLICT(email) DO UPDATE SET
              legal_name   = excluded.legal_name,
              stage_name   = excluded.stage_name,
              main_url     = excluded.main_url,
              birth_date   = excluded.birth_date,
              phone        = excluded.phone,
              address      = excluded.address,
              doc_type     = excluded.doc_type,
              recto_id_key = excluded.recto_id_key,
              verso_id_key = excluded.verso_id_key,
              selfie_key   = excluded.selfie_key,
              updated_at   = excluded.updated_at`,
      args: {
        legalName:  p.legalName.trim(),
        stageName:  p.stageName.trim(),
        mainUrl:    p.mainUrl.trim(),
        birthDate:  p.birthDate,
        email,
        phone:      p.phone?.trim() ?? null,
        address:    p.address.trim(),
        docType:    p.docType ?? null,
        rectoIdKey: p.rectoIdKey!,
        versoIdKey: p.versoIdKey!,
        selfieKey:  p.selfieKey!,
        now,
      },
    });

    // 2. Récupérer l'id du contact
    const contactRow = await db.execute({
      sql: "SELECT id FROM contacts WHERE email = ?",
      args: [email],
    });
    const contactId = contactRow.rows[0].id as string;

    // 3. Créer la participation
    const partResult = await db.execute({
      sql: `INSERT INTO participations
              (contact_id, shoot_id, category, signature_data,
               consent_recording, consent_publication, consent_adult,
               ip_address, user_agent)
            VALUES
              (:contactId, :shootId, :category, :signatureData,
               :consentRecording, :consentPublication, :consentAdult,
               :ipAddress, :userAgent)
            RETURNING id`,
      args: {
        contactId,
        shootId:            p.shootId,
        category:           p.category?.trim() || null,
        signatureData:      p.signatureData,
        consentRecording:   p.consentRecording ? 1 : 0,
        consentPublication: p.consentPublication ? 1 : 0,
        consentAdult:       p.consentAdult ? 1 : 0,
        ipAddress,
        userAgent,
      },
    });
    const participationId = partResult.rows[0].id as string;

    // Notify an external creator-management system, if one is configured, that
    // consent was signed. shootId === creator username when coming from
    // /consent/[username]. Non-blocking — consent is saved in DB regardless.
    const webhookBase = consentWebhookBaseUrl();
    if (webhookBase) {
      try {
        await fetch(`${webhookBase}/${encodeURIComponent(p.shootId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consentStatus: "signed", consentSignedAt: now }),
        });
      } catch {
        // Non-blocking — consent is saved in DB regardless
      }
    }

    return NextResponse.json({ success: true, contactId, participationId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[consent/submit] error:", message);
    return NextResponse.json({ error: "Internal server error", detail: message }, { status: 500 });
  }
}
