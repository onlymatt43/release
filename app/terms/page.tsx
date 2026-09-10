import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { pickLocale } from "@/lib/locale";
import { siteOperatorName, siteContactEmail } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions · Terms",
  description: "Conditions d’utilisation · Terms of Service",
};

const LAST_UPDATED = "2026-09-03";

export default async function TermsPage({
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
        {fr ? "Conditions d’utilisation" : "Terms of Service"}
      </h1>
      <p className="mb-10 text-center text-xs opacity-60">
        {fr ? "Dernière mise à jour" : "Last updated"}: {LAST_UPDATED}
      </p>

      <div className="space-y-6 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:uppercase [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:underline">
        {fr ? (
          <>
            <p>
              Ces conditions régissent l&apos;utilisation de cet outil de
              formulaires de release et de consentement
              {operator ? `, exploité par ${operator}` : ""}.
            </p>
            <h2>1. Objet</h2>
            <p>
              L&apos;outil sert à signer et conserver des formulaires de
              consentement et de cession de droits pour la production de contenu
              pour adultes. Les signataires doivent avoir 18 ans ou plus.
            </p>
            <h2>2. Exactitude des informations</h2>
            <ul>
              <li>Les informations fournies (nom légal, pièces d&apos;identité, signature) doivent être exactes et vous appartenir.</li>
              <li>La soumission d&apos;informations fausses ou usurpées est interdite.</li>
            </ul>
            <h2>3. Accès</h2>
            <p>
              L&apos;espace d&apos;administration est réservé à l&apos;exploitant
              autorisé. La consultation des documents signés se fait par liens
              signés à durée limitée.
            </p>
            <h2>4. Nous joindre</h2>
            <p>
              {contact ? (
                <>Questions : <a href={`mailto:${contact}`}>{contact}</a>.</>
              ) : (
                "Les coordonnées sont fournies par l'exploitant."
              )}
            </p>
          </>
        ) : (
          <>
            <p>
              These terms govern the use of this model release and consent form
              tool
              {operator ? `, operated by ${operator}` : ""}.
            </p>
            <h2>1. Purpose</h2>
            <p>
              The tool is used to sign and retain consent and rights-assignment
              forms for adult content production. Signers must be 18 or older.
            </p>
            <h2>2. Accuracy of information</h2>
            <ul>
              <li>Information you provide (legal name, identity documents, signature) must be accurate and your own.</li>
              <li>Submitting false or impersonated information is prohibited.</li>
            </ul>
            <h2>3. Access</h2>
            <p>
              The admin area is restricted to the authorized operator. Signed
              documents are viewed through short-lived signed links.
            </p>
            <h2>4. Contact</h2>
            <p>
              {contact ? (
                <>Questions: <a href={`mailto:${contact}`}>{contact}</a>.</>
              ) : (
                "Contact details are provided by the operator."
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
