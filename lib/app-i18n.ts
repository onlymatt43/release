// User-facing strings for the transport flow (/app), in every supported
// locale. Server components pick the locale from the visitor's browser
// (Accept-Language, or an explicit ?lang= override) via pickLocale, then pass
// the resolved dictionary down to client components as a plain prop.
//
// INVARIANT: only the app's own chrome lives here. Data is NEVER translated —
// not profile field labels or values (names, addresses, dates), not handles,
// not the contract text, not the reminder messages. Translating any of those
// would make the document differ from what was signed. Data is always rendered
// verbatim; the dictionary is only ever looked up by fixed keys, never fed a
// value that came from a profile, the provider, or operator configuration.

import type { Locale } from "@/lib/locale";

export interface AppDict {
  signIn: {
    title: string;
    subtitle: (provider: string) => string;
    button: (provider: string) => string;
    notConfigured: string;
  };
  noProfile: {
    titleRequired: string;
    titleUnavailable: string;
    required: (provider: string) => string;
    unavailable: (provider: string) => string;
  };
  signOut: string;
  langLabel: string;
  request: {
    title: string;
    subtitle: string;
    theirHandle: string;
    handlePlaceholder: string;
    reference: string;
    referencePlaceholder: string;
    whoSigns: string;
    iSign: string;
    theySign: string;
    atLeastOne: string;
    onlyTheySign: string;
    onlyISign: string;
    autoRemind: string;
    submit: string;
    submitting: string;
    required: string;
  };
  inTransit: {
    heading: string;
    empty: string;
    waitingForYou: string;
    downloaded: string;
    readyToDownload: string;
    waitingFor: (who: string) => string;
    retention: (days: number) => string;
  };
  agreement: {
    sealed: string;
    pending: string;
    parties: string;
    you: string;
    receivesCopy: string;
    signedOn: (date: string) => string;
    notSignedYet: string;
    notYet: string;
    download: string;
    waitingToSign: (many: boolean) => string;
    autoRemindOn: string;
    expires: (date: string) => string;
    back: string;
    accept: string;
    accepting: string;
  };
  remind: {
    button: (handle: string) => string;
    exhausted: string;
    counted: (sent: number, total: number, lastDate: string | null) => string;
    copied: string;
  };
  pdf: {
    parties: string;
    receivesCopy: string;
    sealedOn: (date: string) => string;
    contract: string;
    consents: string;
    acceptance: string;
    acceptedOn: (date: string) => string;
    ip: string;
  };
}

const en: AppDict = {
  signIn: {
    title: "Sign in to continue",
    subtitle: (p) => `Your identity and profile come from ${p}.`,
    button: (p) => `Continue with ${p}`,
    notConfigured: "Sign-in is not configured for this deployment.",
  },
  noProfile: {
    titleRequired: "Profile required",
    titleUnavailable: "Temporarily unavailable",
    required: (p) => `Complete your profile on ${p} first, then come back.`,
    unavailable: (p) => `Could not reach ${p}. Try again in a moment.`,
  },
  signOut: "Sign out",
  langLabel: "Language",
  request: {
    title: "Request a consent",
    subtitle: "Your profile on file is used as is. The other party accepts with theirs.",
    theirHandle: "Their handle",
    handlePlaceholder: "@handle",
    reference: "Reference (optional)",
    referencePlaceholder: "Shoot name, date, anything useful",
    whoSigns: "Who signs",
    iSign: "I sign",
    theySign: "They sign",
    atLeastOne: "At least one side must sign.",
    onlyTheySign: "You will receive their signed document without signing yourself.",
    onlyISign: "They will receive your signed document without signing themselves.",
    autoRemind: "Send them reminders automatically until they sign",
    submit: "Send request",
    submitting: "Sending…",
    required: "required",
  },
  inTransit: {
    heading: "In transit",
    empty: "Nothing in transit.",
    waitingForYou: "Waiting for you",
    downloaded: "Downloaded",
    readyToDownload: "Ready to download",
    waitingFor: (who) => `Waiting for ${who}`,
    retention: (d) =>
      `Documents are deleted once every party has downloaded them, and in any case after ${d} days.`,
  },
  agreement: {
    sealed: "Sealed",
    pending: "Pending",
    parties: "Parties",
    you: "you",
    receivesCopy: "Receives a copy",
    signedOn: (date) => `Signed ${date}`,
    notSignedYet: "Not signed yet",
    notYet: "Not yet",
    download: "Download my copy (PDF)",
    waitingToSign: (many) => `Waiting for the other ${many ? "parties" : "party"} to sign.`,
    autoRemindOn: "Reminders are sent automatically.",
    expires: (date) => `Expires ${date}. Nothing is kept afterwards.`,
    back: "Back",
    accept: "Accept and sign",
    accepting: "Accepting…",
  },
  remind: {
    button: (h) => `Remind @${h}`,
    exhausted: "No reminders left",
    counted: (sent, total, last) =>
      `Reminded ${sent}/${total}${last ? `, last ${last}` : ""}`,
    copied: "Message copied. Paste it to them.",
  },
  pdf: {
    parties: "Parties",
    receivesCopy: "receives a copy",
    sealedOn: (d) => `Sealed on ${d}`,
    contract: "Contract",
    consents: "Consents",
    acceptance: "Electronic acceptance",
    acceptedOn: (d) => `Accepted on ${d}`,
    ip: "IP",
  },
};

const fr: AppDict = {
  signIn: {
    title: "Connectez-vous pour continuer",
    subtitle: (p) => `Votre identité et votre profil proviennent de ${p}.`,
    button: (p) => `Continuer avec ${p}`,
    notConfigured: "La connexion n'est pas configurée pour ce déploiement.",
  },
  noProfile: {
    titleRequired: "Profil requis",
    titleUnavailable: "Temporairement indisponible",
    required: (p) => `Complétez d'abord votre profil sur ${p}, puis revenez.`,
    unavailable: (p) => `Impossible de joindre ${p}. Réessayez dans un moment.`,
  },
  signOut: "Se déconnecter",
  langLabel: "Langue",
  request: {
    title: "Demander un consentement",
    subtitle: "Votre profil enregistré est utilisé tel quel. L'autre partie accepte avec le sien.",
    theirHandle: "Son handle",
    handlePlaceholder: "@handle",
    reference: "Référence (facultatif)",
    referencePlaceholder: "Nom de séance, date, ce qui est utile",
    whoSigns: "Qui signe",
    iSign: "Je signe",
    theySign: "Il ou elle signe",
    atLeastOne: "Au moins une partie doit signer.",
    onlyTheySign: "Vous recevrez son document signé sans signer vous-même.",
    onlyISign: "Elle recevra votre document signé sans signer elle-même.",
    autoRemind: "Lui envoyer des rappels automatiquement jusqu'à la signature",
    submit: "Envoyer la demande",
    submitting: "Envoi…",
    required: "obligatoire",
  },
  inTransit: {
    heading: "En transit",
    empty: "Rien en transit.",
    waitingForYou: "En attente de vous",
    downloaded: "Téléchargé",
    readyToDownload: "Prêt à télécharger",
    waitingFor: (who) => `En attente de ${who}`,
    retention: (d) =>
      `Les documents sont supprimés dès que chaque partie les a téléchargés, et dans tous les cas après ${d} jours.`,
  },
  agreement: {
    sealed: "Scellé",
    pending: "En attente",
    parties: "Parties",
    you: "vous",
    receivesCopy: "Reçoit une copie",
    signedOn: (date) => `Signé le ${date}`,
    notSignedYet: "Pas encore signé",
    notYet: "Pas encore",
    download: "Télécharger ma copie (PDF)",
    waitingToSign: (many) => `En attente de la signature de l'autre ${many ? "parties" : "partie"}.`,
    autoRemindOn: "Des rappels sont envoyés automatiquement.",
    expires: (date) => `Expire le ${date}. Rien n'est conservé ensuite.`,
    back: "Retour",
    accept: "Accepter et signer",
    accepting: "Acceptation…",
  },
  remind: {
    button: (h) => `Relancer @${h}`,
    exhausted: "Plus de rappels",
    counted: (sent, total, last) =>
      `Relancé ${sent}/${total}${last ? `, dernier ${last}` : ""}`,
    copied: "Message copié. Collez-le pour l'envoyer.",
  },
  pdf: {
    parties: "Parties",
    receivesCopy: "reçoit une copie",
    sealedOn: (d) => `Scellé le ${d}`,
    contract: "Contrat",
    consents: "Consentements",
    acceptance: "Acceptation électronique",
    acceptedOn: (d) => `Accepté le ${d}`,
    ip: "IP",
  },
};

const DICTS: Record<Locale, AppDict> = { en, fr };

export function getAppDict(locale: Locale): AppDict {
  return DICTS[locale] ?? en;
}
