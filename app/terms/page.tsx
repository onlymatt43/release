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

const LAST_UPDATED = "2026-09-10";

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
              Ces conditions régissent l&apos;utilisation de <strong>release</strong>{operator ? `, exploité par ${operator}` : ""}.
            </p>
            <h2>Objet</h2>
            <p>
              <strong>release</strong> circule un accord entre plusieurs signataires, remet à chacun son exemplaire, puis efface tout.
            </p>
            <h2>Signataires</h2>
            <ul>
              <li>Les signataires attestent avoir 18 ans ou plus.</li>
              <li>Les informations fournies via le fournisseur d&apos;identité doivent être exactes.</li>
            </ul>
            <h2>Expiration</h2>
            <p>
              Un accord expire s&apos;il n&apos;est pas complété et livré dans le délai configuré. Il est alors supprimé sans recours.
            </p>
            <h2>Exemplaire</h2>
            <p>
              Un exemplaire téléchargé est la seule copie que <strong>release</strong> remet. Sa conservation vous incombe.
            </p>
            <h2>Contact</h2>
            <p>
              {contact ? (
                <>Contactez : <a href={`mailto:${contact}`}>{contact}</a>.</>
              ) : (
                "Coordonnées fournies par l'exploitant."
              )}
            </p>
          </>
        ) : (
          <>
            <p>
              These terms govern the use of <strong>release</strong>
              {operator ? `, operated by ${operator}` : ""}.
            </p>
            <h2>Purpose</h2>
            <p>
              <strong>release</strong> circulates an agreement between invited parties and delivers a copy to each, then deletes everything.
            </p>
            <h2>Signers</h2>
            <ul>
              <li>Signers attest that they are 18 years of age or older.</li>
              <li>Information supplied via the identity provider must be accurate.</li>
            </ul>
            <h2>Expiration</h2>
            <p>
              An agreement expires if it is not completed and delivered within the configured deadline. It is then deleted without recourse.
            </p>
            <h2>Copy</h2>
            <p>
              A downloaded copy is the only one <strong>release</strong> provides to you. You are responsible for keeping it.
            </p>
            <h2>Contact</h2>
            <p>
              {contact ? (
                <>Contact: <a href={`mailto:${contact}`}>{contact}</a>.</>
              ) : (
                "Contact details provided by the operator."
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
