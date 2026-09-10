import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { pickLocale } from "@/lib/locale";
import { siteOperatorName, siteContactEmail } from "@/lib/site-config";

// Rendered per request: language from Accept-Language (or ?lang=), operator
// identity from the environment at request time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confidentialité · Privacy",
  description: "Politique de confidentialité · Privacy policy",
};

const LAST_UPDATED = "2026-09-03";

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const h = await headers();
  const locale = pickLocale(h.get("accept-language"), lang);
  const operator = siteOperatorName();
  const contact = siteContactEmail();
  const fr = locale === "fr";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed">
      <div className="mb-4 flex justify-center gap-3 text-xs opacity-60">
        <Link href="?lang=fr" className="uppercase tracking-wide hover:underline">FR</Link>
        <span>·</span>
        <Link href="?lang=en" className="uppercase tracking-wide hover:underline">EN</Link>
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold uppercase tracking-tight">
        {fr ? "Confidentialité" : "Privacy Policy"}
      </h1>
      <p className="mb-10 text-center text-xs opacity-60">
        {fr ? "Dernière mise à jour" : "Last updated"}: {LAST_UPDATED}
      </p>

      <div className="space-y-6 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:uppercase [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:underline">
        {fr ? (
          <>
            <p>
              Ce site sert à recueillir et gérer des formulaires de release et de
              consentement de modèles pour la production de contenu pour adultes.
              {operator ? ` Il est exploité par ${operator}.` : ""}
            </p>
            <h2>1. Données recueillies</h2>
            <ul>
              <li>Nom légal du modèle et signature.</li>
              <li>Pièces d&apos;identité (par ex. passeport) téléversées pour vérifier l&apos;identité et l&apos;âge.</li>
              <li>Les consentements donnés (plateformes de publication autorisées) et les informations de la séance.</li>
            </ul>
            <h2>2. Où les données sont stockées</h2>
            <ul>
              <li>Les enregistrements (nom légal, consentements, métadonnées de séance) sont conservés dans une base de données (Turso/libSQL).</li>
              <li>Les pièces d&apos;identité et les signatures sont stockées dans un stockage d&apos;objets Cloudflare R2, et ne sont consultables que via des URL signées à durée limitée.</li>
            </ul>
            <h2>3. Qui y a accès</h2>
            <p>
              L&apos;accès à ces documents est réservé à l&apos;exploitant
              authentifié (espace d&apos;administration protégé). Ils ne sont ni
              publiés ni partagés publiquement.
            </p>
            <h2>4. Finalité</h2>
            <p>
              Ces données sont recueillies pour respecter les obligations légales
              de tenue de registres applicables à la production de contenu pour
              adultes (notamment 18 U.S.C. § 2257 et lois équivalentes) et pour
              établir les droits sur les œuvres.
            </p>
            <h2>5. Conservation</h2>
            <p>
              Les informations d&apos;identité, signatures et documents de
              vérification sont conservés de façon confidentielle et sécurisée
              pour la durée minimale exigée par la loi applicable.
            </p>
            <h2>6. Nous joindre</h2>
            <p>
              {contact ? (
                <>Pour toute demande relative à vos données : <a href={`mailto:${contact}`}>{contact}</a>.</>
              ) : (
                "Les coordonnées pour les demandes relatives aux données sont fournies par l'exploitant."
              )}
            </p>
          </>
        ) : (
          <>
            <p>
              This site collects and manages model release and consent forms for
              adult content production.
              {operator ? ` It is operated by ${operator}.` : ""}
            </p>
            <h2>1. Information collected</h2>
            <ul>
              <li>The model&apos;s legal name and signature.</li>
              <li>Identity documents (e.g. a passport) uploaded to verify identity and age.</li>
              <li>The consents given (authorized publication platforms) and shoot information.</li>
            </ul>
            <h2>2. Where data is stored</h2>
            <ul>
              <li>Records (legal name, consents, shoot metadata) are kept in a database (Turso/libSQL).</li>
              <li>Identity documents and signatures are stored in Cloudflare R2 object storage and are reachable only through short-lived signed URLs.</li>
            </ul>
            <h2>3. Who has access</h2>
            <p>
              Access to these documents is restricted to the authenticated
              operator (a protected admin area). They are never published or
              shared publicly.
            </p>
            <h2>4. Purpose</h2>
            <p>
              This data is collected to meet the record-keeping obligations that
              apply to adult content production (notably 18 U.S.C. § 2257 and
              equivalent laws) and to establish rights in the works.
            </p>
            <h2>5. Retention</h2>
            <p>
              Identity information, signatures and verification documents are kept
              confidentially and securely for the minimum duration required by
              applicable law.
            </p>
            <h2>6. Contact</h2>
            <p>
              {contact ? (
                <>For any request about your data: <a href={`mailto:${contact}`}>{contact}</a>.</>
              ) : (
                "Contact details for data requests are provided by the operator."
              )}
            </p>
          </>
        )}
      </div>

      <Link href="/" className="mt-10 inline-block text-xs uppercase tracking-wide underline opacity-70 hover:opacity-100">
        {fr ? "Retour" : "Back"}
      </Link>
    </main>
  );
}
