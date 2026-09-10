export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getR2Client, getR2Bucket } from "@/lib/r2";
import { siteBrandName, siteLocale, siteTimeZone, sitePlatformExamples } from "@/lib/site-config";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import PrintButton from "@/components/admin/PrintButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function presign(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    return await getSignedUrl(
      getR2Client(),
      new GetObjectCommand({ Bucket: getR2Bucket(), Key: key }),
      { expiresIn: 3600 }
    );
  } catch {
    return null;
  }
}

const DOC_LABELS: Record<string, string> = {
  passport: "Passport",
  drivers_license: "Driver's license",
  id_card: "ID card",
};

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        border: "2px solid #333",
        borderRadius: 3,
        marginRight: 8,
        verticalAlign: "middle",
        background: ok ? "#111" : "#fff",
        color: "#fff",
        textAlign: "center",
        lineHeight: "13px",
        fontSize: 12,
      }}
    >
      {ok ? "✓" : ""}
    </span>
  );
}

export default async function PrintParticipationPage({ params }: PageProps) {
  const { id } = await params;
  const db = getDb();

  const result = await db.execute({
    sql: `SELECT
            p.id AS p_id, p.category AS p_category, p.signature_data,
            p.consent_recording, p.consent_publication, p.consent_adult,
            p.ip_address, p.signed_at,
            c.legal_name, c.stage_name, c.main_url, c.birth_date,
            c.email, c.phone, c.address, c.doc_type,
            c.recto_id_key, c.verso_id_key, c.selfie_key,
            s.title AS shoot_title, s.shoot_date, s.photographer,
            s.location AS shoot_location, s.category AS shoot_category
          FROM participations p
          JOIN contacts c ON c.id = p.contact_id
          JOIN shoots s ON s.id = p.shoot_id
          WHERE p.id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) notFound();

  const raw = result.rows[0] as Record<string, unknown>;

  // Extract typed values once so JSX conditionals work without 'unknown' errors
  const participationId  = raw.p_id as string;
  const signatureData    = raw.signature_data as string | null;
  const consentRecording = Boolean(raw.consent_recording);
  const consentPub       = Boolean(raw.consent_publication);
  const consentAdult     = Boolean(raw.consent_adult);
  const ipAddress        = raw.ip_address as string | null;

  const legalName   = raw.legal_name as string;
  const stageName   = raw.stage_name as string;
  const mainUrl     = raw.main_url as string | null;
  const email       = raw.email as string;
  const phone       = raw.phone as string | null;
  const address     = raw.address as string;
  const docType     = raw.doc_type as string | null;

  const shootTitle       = raw.shoot_title as string;
  const shootPhotographer = raw.photographer as string;
  const shootLocation    = raw.shoot_location as string | null;
  const shootCategory    = raw.shoot_category as string | null;

  const [rectoUrl, versoUrl, selfieUrl] = await Promise.all([
    presign(raw.recto_id_key as string | null),
    presign(raw.verso_id_key as string | null),
    presign(raw.selfie_key as string | null),
  ]);

  const locale = siteLocale() ?? undefined;
  const timeZone = siteTimeZone() ?? undefined;
  const platforms = sitePlatformExamples();

  const signedAt = raw.signed_at
    ? new Date(raw.signed_at as string).toLocaleString(locale, { timeZone })
    : "—";

  const birthDate = raw.birth_date
    ? new Date(raw.birth_date as string).toLocaleDateString(locale)
    : "—";

  const shootDate = raw.shoot_date
    ? new Date(raw.shoot_date as string).toLocaleDateString(locale)
    : "—";

  const docLabel = docType ? (DOC_LABELS[docType] ?? docType) : "Not specified";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .page-break { page-break-before: always; }
        }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; }
        .container { max-width: 750px; margin: 0 auto; padding: 32px 40px; }
        .header { border-bottom: 3px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #666; }
        .title { font-size: 22px; font-weight: 700; margin: 4px 0 0; }
        .section { margin-bottom: 24px; }
        .section-title {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1.5px; color: #666; margin-bottom: 10px;
          border-bottom: 1px solid #ddd; padding-bottom: 4px;
        }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
        .field label { font-size: 10px; color: #888; display: block; margin-bottom: 2px; }
        .field span { font-weight: 500; font-size: 13px; }
        .consent-item { margin-bottom: 8px; font-size: 13px; display: flex; align-items: flex-start; gap: 8px; }
        .sig-box {
          border: 1px solid #ccc; border-radius: 6px; padding: 8px;
          background: #fafafa; display: inline-block;
        }
        .sig-box img { display: block; max-height: 120px; max-width: 400px; }
        .photos { display: flex; gap: 16px; flex-wrap: wrap; page-break-inside: avoid; break-inside: avoid; }
        .photo-item { page-break-inside: avoid; break-inside: avoid; }
        .photo-item label { font-size: 10px; color: #888; display: block; margin-bottom: 4px; }
        .photo-item img {
          max-width: 180px; width: 100%; height: auto;
          border: 1px solid #ccc; border-radius: 4px; display: block;
        }
        .footer {
          margin-top: 40px; border-top: 1px solid #ddd; padding-top: 12px;
          font-size: 10px; color: #999; display: flex; justify-content: space-between;
        }
        .print-btn-bar {
          display: flex; justify-content: flex-end;
          padding: 16px 40px 0; gap: 12px;
        }
      `}</style>

      <div className="print:hidden print-btn-bar no-print">
        <a
          href=".."
          style={{
            fontSize: 13,
            color: "#555",
            textDecoration: "none",
            padding: "8px 16px",
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        >
          ← Back
        </a>
        <PrintButton />
      </div>

      <div className="container">
        {/* En-tête */}
        <div className="header">
          <div className="logo">{siteBrandName() ? `${siteBrandName()} — Consent Form` : "Consent Form"}</div>
          <div className="title">Model Release</div>
        </div>

        {/* Shoot */}
        <div className="section">
          <div className="section-title">Shooting</div>
          <div className="grid2">
            <div className="field"><label>Title</label><span>{shootTitle}</span></div>
            <div className="field"><label>Date</label><span>{shootDate}</span></div>
            <div className="field"><label>Producer</label><span>{shootPhotographer}</span></div>
            {shootLocation && (
              <div className="field"><label>Location</label><span>{shootLocation}</span></div>
            )}
            {shootCategory && (
              <div className="field"><label>Category</label><span>{shootCategory}</span></div>
            )}
          </div>
        </div>

        {/* Modèle */}
        <div className="section">
          <div className="section-title">Model</div>
          <div className="grid2">
            <div className="field"><label>Legal name</label><span>{legalName}</span></div>
            <div className="field"><label>Stage name</label><span>{stageName}</span></div>
            <div className="field"><label>Date of birth</label><span>{birthDate}</span></div>
            <div className="field"><label>Email</label><span>{email}</span></div>
            {phone && <div className="field"><label>Phone</label><span>{phone}</span></div>}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Address</label>
              <span>{address}</span>
            </div>
            {mainUrl && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Main profile</label>
                <span>{mainUrl}</span>
              </div>
            )}
          </div>
        </div>

        {/* Texte du contrat */}
        <div className="section">
          <div className="section-title">Image Rights Assignment Contract and Informed Consent</div>
          <div style={{ fontSize: 11, color: "#333", lineHeight: 1.6 }}>
            <p>By signing this form, the undersigned (hereinafter "the Model") irrevocably authorizes the photographer/producer (hereinafter "the Producer") and their successors, assignees, and licensees to use, reproduce, modify, distribute, publish, and license the photographic and audiovisual works created during the session covered by this document.</p>
            <p style={{ marginTop: 8 }}>This authorization specifically includes commercial exploitation and distribution on any digital content platform, social networks, or adult platforms{platforms ? ` (including but not limited to ${platforms.join(", ")})` : ""} as well as any other digital or physical medium, present or future, without geographical or temporal restriction. The Model acknowledges that this assignment is granted definitively and does not entitle them to any subsequent compensation, royalties, or approval rights over the use of the material.</p>
            <p style={{ marginTop: 8, fontWeight: 600 }}>The Model certifies under penalty of perjury that:</p>
            <ul style={{ marginTop: 4, paddingLeft: 20, lineHeight: 1.7 }}>
              <li>They are at least 18 years of age at the date of the session and have full legal capacity.</li>
              <li>The identification documents provided are authentic, valid, and accurately represent them.</li>
              <li>They are acting freely, in an informed manner, without constraint, threat, or impairment by any substance.</li>
              <li>They have read, understood, and accepted this contract in its entirety before affixing their electronic signature.</li>
            </ul>
            <p style={{ marginTop: 8 }}>In accordance with international legal requirements applicable to adult content production (notably standards such as 18 U.S.C. § 2257 and equivalent record-keeping laws), the identity information, signatures, and verification documents provided will be retained in a strictly confidential and secure manner for the minimum duration required by law.</p>
            <p style={{ marginTop: 8 }}>This authorization is final, irrevocable, exclusive, and transferable. The Model expressly waives any claim, lawsuit, or recourse related to the use, modification, or publication of the works within the scope provided herein.</p>
          </div>
        </div>

        {/* Consentements */}
        <div className="section">
          <div className="section-title">Consents</div>
          <div className="consent-item">
            <Check ok={consentRecording} />
            <span>I authorize the recording of my participation.</span>
          </div>
          <div className="consent-item">
            <Check ok={consentPub} />
            <span>I authorize the publication of content on the specified platforms{platforms ? ` (${platforms.join(", ")}, etc.)` : ""}.</span>
          </div>
          <div className="consent-item">
            <Check ok={consentAdult} />
            <span>I certify that I am of legal age (18+) and consent freely and without constraint.</span>
          </div>
        </div>

        {/* Signature */}
        <div className="section">
          <div className="section-title">Electronic signature</div>
          {signatureData ? (
            <div className="sig-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signatureData} alt="Signature" />
            </div>
          ) : (
            <p style={{ color: "#999" }}>Signature not available</p>
          )}
          <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
            <strong>Signed on:</strong> {signedAt}
            {ipAddress && (
              <span style={{ marginLeft: 24 }}>
                <strong>IP:</strong> {ipAddress}
              </span>
            )}
          </div>
        </div>

        {/* Pièces d'identité */}
        {(rectoUrl || versoUrl || selfieUrl) && (
          <div className="section">
            <div className="section-title">
              ID Documents — {docLabel}
            </div>
            <div className="photos">
              {rectoUrl && (
                <div className="photo-item">
                  <label>Front</label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={rectoUrl} alt="ID front" />
                </div>
              )}
              {versoUrl && (
                <div className="photo-item">
                  <label>Back</label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={versoUrl} alt="ID back" />
                </div>
              )}
              {selfieUrl && (
                <div className="photo-item">
                  <label>Selfie with ID</label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selfieUrl} alt="Selfie" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pied de page */}
        <div className="footer">
          <span>Ref. participation: {participationId}</span>
          <span>Document generated on {new Date().toLocaleDateString(locale)}</span>
        </div>
      </div>
    </>
  );
}
