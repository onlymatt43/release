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

const LAST_UPDATED = "2026-09-10";

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
              <strong>release</strong> circule un accord entre plusieurs signataires, génère un PDF pour chacun, puis efface tout. Il ne possède pas de comptes.
              {operator ? ` Exploité par ${operator}.` : ""}
            </p>
            <h2>Identité et profils</h2>
            <p>
              L&apos;identité (identifiant, handle, nom d&apos;affichage, avatar) est fournie par un service externe à chaque connexion et conservée dans un cookie de session signé, durée <code>SESSION_TTL_HOURS</code> (24 h par défaut). Rien n&apos;est écrit en base à la connexion.
            </p>
            <h2>Pendant le transit</h2>
            <p>
              Pendant qu&apos;un accord est en transit, <strong>release</strong> conserve pour chaque partie qui a accepté :
            </p>
            <ul>
              <li>Une copie figée de son profil tel que transmis par le fournisseur (champs, images, pièces d&apos;identité incluses si le fournisseur les envoie) ;</li>
              <li>Les consentements cochés ;</li>
              <li>L&apos;adresse IP et le navigateur au moment de l&apos;acceptation ;</li>
              <li>La date d&apos;acceptation et la date de téléchargement de son PDF.</li>
            </ul>
            <h2>Suppression des données</h2>
            <p>
              Cette copie est supprimée à la fin de la fenêtre <code>AGREEMENT_DELIVERY_GRACE_MINUTES</code> (15 minutes par défaut) après que chaque partie a téléchargé son PDF, ou au plus tard <code>AGREEMENT_TTL_DAYS</code> (7 jours par défaut) après la demande. La suppression est effective au premier accès suivant la date limite, ou par une tâche planifiée horaire.
            </p>
            <h2>PDF</h2>
            <p>
              Le PDF est généré à la demande et n&apos;est jamais stocké. Chaque partie conserve elle-même son exemplaire. <strong>release</strong> n&apos;en garde aucun et ne peut pas le régénérer après suppression.
            </p>
            <h2>Contact</h2>
            <p>
              {contact ? (
                <>Pour toute question : <a href={`mailto:${contact}`}>{contact}</a>.</>
              ) : (
                "Coordonnées de contact fournies par l'exploitant."
              )}
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>release</strong> circulates an agreement between multiple parties, generates a PDF for each, then deletes everything. It holds no accounts.
              {operator ? ` Operated by ${operator}.` : ""}
            </p>
            <h2>Identity and profiles</h2>
            <p>
              Identity (subject id, handle, display name, avatar) is supplied by an external provider at each sign-in and held in a signed session cookie, lifetime <code>SESSION_TTL_HOURS</code> (24 hours by default). Nothing is written to the database at sign-in.
            </p>
            <h2>During transit</h2>
            <p>
              While an agreement is in transit, <strong>release</strong> keeps for each party that has accepted:
            </p>
            <ul>
              <li>A frozen snapshot of their profile as supplied by the provider (fields, images, identity documents if the provider sends them) ;</li>
              <li>The consents they checked ;</li>
              <li>The IP address and browser user-agent at the moment of acceptance ;</li>
              <li>The acceptance date and the PDF download date.</li>
            </ul>
            <h2>Data deletion</h2>
            <p>
              This snapshot is deleted at the end of the <code>AGREEMENT_DELIVERY_GRACE_MINUTES</code> window (15 minutes by default) after every party has downloaded their PDF, or no later than <code>AGREEMENT_TTL_DAYS</code> (7 days by default) after the request. Deletion takes effect on the first access past the deadline, or via an hourly scheduled task.
            </p>
            <h2>PDF</h2>
            <p>
              The PDF is generated on demand and is never stored. Each party keeps their own copy. <strong>release</strong> keeps none and cannot regenerate it after deletion.
            </p>
            <h2>Contact</h2>
            <p>
              {contact ? (
                <>For any question: <a href={`mailto:${contact}`}>{contact}</a>.</>
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
