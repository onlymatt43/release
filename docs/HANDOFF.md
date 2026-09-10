# Plan de remise en cohérence du dépôt

Contexte vérifié le 2026-09-10 sur la branche `claude/busy-thompson-d0ubrs`
(commit après `eb6d7b7`).

Une seule chose vient de l'auteur, mot pour mot : **« on ne garde
aucunement les données des users »**. Tout le reste de ce document est une
déduction de l'agent qui l'a rédigé, à partir du code. Chaque phase peut être
confirmée, modifiée ou rayée par l'auteur avant exécution.

Le dépôt contient deux applications :

- le flux de transport `/app` (accords en transit, effacés après livraison),
  documenté dans `docs/INTEGRATION.md` et conforme au code ;
- un ancien flux (admin, formulaire de consentement, pièces d'identité
  téléversées vers Cloudflare R2, tables `shoots`/`contacts`/`participations`)
  qui contredit la décision ci-dessus.

La base Turso `release` ne contient que `agreements` et `agreement_parties`.
Les trois autres tables n'y ont jamais été créées.

L'auteur a confirmé le 2026-09-10 que **l'admin reste**. Il n'a pas dit à
quoi il servira ; c'est à lui de le définir, pas à l'agent de le deviner.

Ce plan propose de retirer le stockage permanent (formulaire `/consent`,
pages `/signed`, R2, tables `shoots`/`contacts`/`participations`), de garder
l'infrastructure admin en la déconnectant de ces tables, de corriger les
textes, et d'écrire la phrase de l'auteur là où les sessions suivantes la
liront. Le retrait du stockage permanent est une déduction (il stocke des
pièces d'identité sans date de suppression) ; l'auteur peut la rayer. Un commit par phase, `npm run lint`,
`npx tsc --noEmit` et `npm run build` verts avant chaque commit. Ne pas
sauter de phase, ne pas fusionner deux phases dans un commit.

---

## Phase 0 : préparation

```
git fetch origin claude/busy-thompson-d0ubrs
git checkout claude/busy-thompson-d0ubrs
npm ci
npx tsc --noEmit && npm run lint && npm run build
```

Les trois commandes doivent être vertes avant de commencer. Si l'une échoue,
s'arrêter et le signaler : ce n'est pas l'état attendu.

---

## Phase 1 : retirer le stockage permanent, garder l'admin

### 1.1 Supprimer ces fichiers et dossiers, exactement ceux-ci

```
app/consent/
app/signed/
app/api/consent/
app/admin/contacts/
app/admin/shoots/
app/admin/participations/
app/api/admin/shoots/
components/AddressAutocomplete.tsx
components/ConsentForm.tsx
components/FileUploadZone.tsx
components/SignaturePad.tsx
components/admin/NewShootForm.tsx
components/admin/PrintButton.tsx
components/admin/QRCodePanel.tsx
components/admin/QuickConsentLink.tsx
components/admin/ShootCard.tsx
lib/r2.ts
lib/types.ts
CORS-R2-SETUP.md
```

Justification, pour vérification :

- `app/consent`, `app/signed`, `app/api/consent` : le formulaire qui
  téléverse des pièces d'identité vers R2 et les pages qui les relisent.
- `app/admin/contacts`, `shoots`, `participations`, `app/api/admin/shoots`
  et les cinq composants admin listés : lisent `shoots`, `contacts`,
  `participations` ou R2. Ils n'ont plus de source de données.
- `lib/r2.ts`, `lib/types.ts` : n'existent que pour ces tables et ce bucket.
- `CORS-R2-SETUP.md` documente le bucket R2.

### 1.1b Garder, exactement ceci

```
app/admin/page.tsx              (à réécrire, voir 1.1c)
app/admin/login/page.tsx
app/api/admin/auth/login/route.ts
app/api/admin/auth/logout/route.ts
components/admin/LoginForm.tsx
components/admin/LogoutButton.tsx
middleware.ts
ADMIN_SECRET dans .env.example
```

Avant de supprimer `components/ui/dialog.tsx`, `separator.tsx`,
`table.tsx`, vérifier avec `grep -rl "components/ui/<nom>\"" app components`
qu'aucun fichier conservé ne les importe. Ne les supprimer que si le grep
est vide. `dialog.tsx` est le seul consommateur de `lucide-react` ; si
`dialog.tsx` reste, `lucide-react` reste aussi.

Ne pas supprimer non plus : `components/ui/badge.tsx`, `button.tsx`,
`card.tsx`, `input.tsx`, `label.tsx`, `lib/locale.ts`, `lib/utils.ts`,
`config/contract.example.json`.

### 1.1c `app/admin/page.tsx`

La page actuelle lit `shoots` et `participations`. La remplacer par une page
minimale qui compile : titre, `LogoutButton`, et rien d'autre. **Ce que
l'admin doit montrer est à définir par l'auteur** ; ne rien inventer. Laisser
un commentaire en tête du fichier : « Contenu à définir par l'auteur ».
Vérifier que `middleware.ts` protège toujours `/admin` et `/api/admin`.

### 1.2 `app/page.tsx`

Remplacer la redirection vers `/consent/demo` par `/app` :

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/app");
}
```

### 1.3 `app/api/health/route.ts`

Retirer les clés `r2_endpoint`, `r2_bucket`, `google_maps`. Ajouter à la
place, sur le même modèle `"set" | "MISSING"` : `session_secret`
(`SESSION_SECRET`), `identity_jwt_secret` (`IDENTITY_JWT_SECRET`),
`identity_profile_url` (`IDENTITY_PROFILE_URL`), `contract`
(`CONTRACT_URL` ou `CONTRACT_JSON`). Garder la vérification de connexion
Turso et la liste des tables.

### 1.4 `lib/site-config.ts`

Supprimer les fonctions `consentWebhookBaseUrl` et `sitePlatformExamples`
ainsi que le commentaire de section « External integrations » qui les
précède. Vérifier ensuite avec `grep -rn "consentWebhookBaseUrl\|sitePlatformExamples" app components lib`
que rien ne les référence. Corriger les deux commentaires qui mentionnent
« consent documents » et « consent-form QR code ».

### 1.5 `db/schema.sql`

Ne garder que la section « Transport flow » : les deux `CREATE TABLE`
(`agreements`, `agreement_parties`) et leurs trois index. Supprimer
`shoots`, `contacts`, `participations` et leurs index. Remplacer l'en-tête
par une note disant que `release` ne garde aucune donnée d'utilisateur et
que les lignes n'existent que pendant le transit.

### 1.6 `.env.example`

Supprimer les sections et variables suivantes :

- section « File storage (required) » : `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` ;
- section « Optional integrations » : `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`,
  `CONSENT_WEBHOOK_URL` ;
- dans « Site identity » : `SITE_PLATFORM_EXAMPLES` et son commentaire.

Corriger les commentaires de `SITE_LOCALE` et `SITE_TIMEZONE` qui parlent de
« consent documents » et « signature timestamps ». Garder tout le reste.

### 1.7 `package.json`

Retirer des `dependencies` : `@aws-sdk/client-s3`,
`@aws-sdk/s3-request-presigner`, `@googlemaps/js-api-loader`,
`browser-image-compression`, `react-qr-code`, `react-signature-canvas`.
Retirer `lucide-react` seulement si `components/ui/dialog.tsx` a été
supprimé en 1.1b. Retirer des `devDependencies` :
`@types/react-signature-canvas`. Renommer `"name"` en `"release"`.
Puis `npm install` pour régénérer `package-lock.json`. Ne pas éditer le
lockfile à la main.

`shadcn`, `tw-animate-css`, `@base-ui/react`, `class-variance-authority`,
`clsx`, `tailwind-merge` restent : ils sont utilisés par `app/globals.css`
et `components/ui/`.

### 1.8 `README.md`

Réécrire entièrement. Contenu attendu, sans autre affirmation :

- une phrase : `release` fait circuler un accord de release entre plusieurs
  personnes, produit un PDF pour chacune, puis efface tout ; il ne détient
  ni comptes, ni profils, ni documents ;
- l'identité et les profils viennent d'un fournisseur externe, voir
  `docs/INTEGRATION.md` ;
- démarrage : `npm ci`, copier `.env.example` en `.env.local`, appliquer
  `db/schema.sql` sur la base Turso, `npm run dev` ;
- vérification : `npx tsc --noEmit`, `npm run lint`, `npm run build` ;
- déploiement Vercel : le cron de `vercel.json` appelle `/api/cron/purge`
  avec `CRON_SECRET`.

### 1.9 Vérification de la phase

```
grep -rn "R2_\|lib/r2\|lib/types\|GOOGLE_MAPS\|CONSENT_WEBHOOK\|shoots\|participations" app components lib db .env.example README.md
```

Doit ne rien renvoyer. Puis `npx tsc --noEmit && npm run lint && npm run build`
verts. Commit : « Remove the permanent-storage consent flow, keep the admin shell ».

---

## Phase 2 : réécrire les textes qui décrivent l'ancien flux

Concerne `app/privacy/page.tsx` et `app/terms/page.tsx`. Conserver la
structure existante (toggle FR/EN par `?lang=`, `pickLocale`,
`siteOperatorName`, `siteContactEmail`, `LAST_UPDATED` à mettre à la date du
jour). Remplacer intégralement le contenu des deux langues.

Les seules affirmations permises sont celles que le code garantit. Ne rien
promettre d'autre.

### 2.1 `/privacy`, faits à énoncer

- `release` ne possède pas de comptes. L'identité (identifiant, handle, nom
  d'affichage, avatar) est fournie par un service externe à chaque
  connexion et tenue dans un cookie de session signé, durée
  `SESSION_TTL_HOURS` (24 h par défaut). Rien n'est écrit en base à la
  connexion.
- Pendant qu'un accord est en transit, `release` conserve pour chaque
  partie qui a accepté : une copie figée de son profil tel que transmis par
  le fournisseur (champs et images, pièces d'identité incluses si le
  fournisseur les envoie), les consentements cochés, l'adresse IP et le
  navigateur au moment de l'acceptation, la date d'acceptation, la date de
  téléchargement de son PDF.
- Cette copie est supprimée : à la fin de la fenêtre
  `AGREEMENT_DELIVERY_GRACE_MINUTES` (15 minutes par défaut) après que
  chaque partie a téléchargé son PDF ; ou au plus tard `AGREEMENT_TTL_DAYS`
  (7 jours par défaut) après la demande. La suppression est effective au
  premier accès suivant la date limite, ou par une tâche planifiée
  quotidienne.
- Le PDF est généré à la demande et n'est jamais stocké.
- Chaque partie conserve elle-même son exemplaire. `release` n'en garde
  aucun et ne peut pas le régénérer après suppression.
- Contact : `SITE_CONTACT_EMAIL` si défini.

Ne pas mentionner : Cloudflare R2, conservation « pour la durée minimale
exigée par la loi », 18 U.S.C. § 2257. Ne rien écrire sur l'admin tant que
l'auteur n'a pas dit ce qu'il montre.

### 2.2 `/terms`, faits à énoncer

- Objet : faire signer un accord entre les parties invitées et remettre à
  chacune son exemplaire.
- Les signataires attestent avoir 18 ans ou plus et fournir des informations
  exactes via leur fournisseur d'identité.
- Un accord expire s'il n'est pas complété et livré dans le délai ; il est
  alors supprimé sans recours.
- Un exemplaire téléchargé est la seule copie que `release` remet ; sa
  conservation incombe à la partie.
- Contact : `SITE_CONTACT_EMAIL` si défini.

Ne pas mentionner : liens signés, documents consultables. Ne rien écrire
sur l'admin tant que l'auteur n'a pas dit ce qu'il montre.

### 2.3 Vérification

`grep -n "R2\|Cloudflare\|2257" app/privacy/page.tsx app/terms/page.tsx`
ne renvoie rien. Build vert. Commit : « Rewrite privacy and terms for the
transit-only flow ».

---

## Phase 3 : figer la décision pour les sessions suivantes

### 3.1 `AGENTS.md`

Conserver le bloc `nextjs-agent-rules` existant. Ajouter dessous :

```markdown
# Invariants

Règle de l'auteur, prioritaire sur tout ce que le code laisse croire :

1. `release` ne conserve aucune donnée d'utilisateur.

Ce que le code fait aujourd'hui pour respecter cette règle, à ne pas
défaire sans l'accord de l'auteur :

2. L'identité et les profils viennent d'un fournisseur externe via
   `lib/identity/`. `release` affiche et imprime ce qu'il reçoit et ne
   définit pas ce qu'un profil contient.
3. Le contrat est une configuration (`CONTRACT_URL` / `CONTRACT_JSON`),
   figée dans chaque accord.
4. Un accord n'existe qu'en transit et a une date de mort (`expires_at`).
   Les seules tables sont `agreements` et `agreement_parties`.

Avant toute modification : `npm run check:invariants`. S'il échoue, le
faire passer est la première tâche. Ne pas modifier le script pour qu'il
passe.
```

### 3.2 `scripts/check-invariants.mjs`

Script Node sans dépendance qui échoue (code 1, message explicite) si :

- un des chemins de la liste 1.1 existe encore ;
- `package.json` contient une des dépendances retirées en 1.7 ;
- `db/schema.sql` contient `CREATE TABLE` pour autre chose que `agreements`
  et `agreement_parties` ;
- `.env.example` contient `R2_`, `GOOGLE_MAPS`, `CONSENT_WEBHOOK` ;
- `app/privacy/page.tsx` ou `app/terms/page.tsx` contient `R2` ou
  `Cloudflare`.

Ajouter dans `package.json` : `"check:invariants": "node scripts/check-invariants.mjs"`
et faire précéder le lint : `"lint": "npm run check:invariants && eslint"`.

### 3.3 Vérification

`npm run lint` vert. Commit : « Pin the transit-only invariants ».

---

## Phase 4 : corrections restantes de la revue de code

Toutes petites, un seul commit. Lignes valables au moment de la rédaction.

1. `lib/pdf/images.ts:54` : la regex `data:` n'accepte qu'un seul paramètre
   `;base64`. Remplacer par une analyse de l'en-tête jusqu'à la première
   virgule, découpage sur `;`, `base64` reconnu s'il est présent parmi les
   paramètres. Ne détecter le format que par les octets (`formatFromBytes`)
   et supprimer `formatFromMime`.
2. `lib/app-request.ts:16` : un `x-forwarded-for` présent mais vide donne
   `""`. Après `.trim()`, remplacer une chaîne vide par `null` avant le
   repli sur `x-real-ip`.
3. `app/app/enter/route.ts:50` : ne renvoyer `err.message` que pour
   `IdentityError` ; pour toute autre erreur, journaliser et renvoyer
   `{ error: "Sign-in failed" }` en 500.
4. `lib/identity/http-jwt.ts:146` : un handle inconnu renvoie 404 ; utiliser
   422 pour que le POST de création reste cohérent avec ses autres erreurs
   de validation.
5. `lib/session.ts:23` : ne mettre dans le cookie que `sub` et `handle`.
   Retirer `name` et `avatar` du cookie et de l'en-tête de `app/app/page.tsx`
   (afficher `@handle` seulement).
6. `lib/agreements.ts`, `listAgreementsFor` : remplacer la boucle
   `getAgreement` par une requête sur `agreements` avec
   `AND a.expires_at > :now`, puis une requête
   `SELECT * FROM agreement_parties WHERE agreement_id IN (...)`, regroupées
   en mémoire.
7. `lib/agreements.ts`, `purgeExpired` : un seul `db.batch` de deux
   `DELETE ... WHERE expires_at <= ?` (parties via sous-requête, puis
   accords), retourner `rowsAffected` du second.
8. `lib/contract.ts:67` et `lib/identity/http-jwt.ts:81` et
   `lib/pdf/images.ts:64` : ajouter `signal: AbortSignal.timeout(10_000)`
   à chaque `fetch`.
9. `vercel.json` : passer le cron de `0 3 * * *` à `0 * * * *` pour que la
   purge suive la fenêtre de grâce à une heure près.
10. `docs/INTEGRATION.md` §4 : mettre à jour la phrase sur le cron
    (horaire, plus quotidien) après le point 9.
11. Supprimer `db/migrations/2026-09-10-agreement-seats.sql` et la
    section 6 de `docs/INTEGRATION.md` qui y renvoie. La base `release` n'a
    jamais eu la colonne `invited_handles` (vérifié le 2026-09-10 : la
    table n'existait pas), donc cette migration ne sert à rien. Dans
    `lib/agreements.ts`, `parseInvited` : retirer la branche
    `typeof v === "string"` et garder `JSON.parse(json) as Invitee[]`.
12. `app/app/enter/route.ts`, `POST` : refuser la requête (403) si l'en-tête
    `Origin` est présent et diffère de l'origine renvoyée par
    `resolveBaseUrl()`. Sans cela, un site tiers peut soumettre un
    formulaire qui connecte le visiteur sur un autre compte.
13. `lib/agreements.ts`, `countInTransitRequestedBy` : ne compter que les
    accords encore réellement en transit, c'est-à-dire
    `status = 'pending'` ou ayant au moins une partie avec
    `downloaded_at IS NULL`. Aujourd'hui un accord entièrement livré
    compte pendant la fenêtre de grâce.
14. `lib/agreements.ts`, `createAgreement` : exécuter les deux `INSERT`
    (accord puis partie) dans un seul `db.batch(..., "write")`. Sans cela,
    un échec du second laisse un accord sans aucune partie.
15. `lib/agreements.ts`, `insertParty` : utiliser
    `INSERT OR IGNORE INTO agreement_parties (...) SELECT ... WHERE EXISTS
    (SELECT 1 FROM agreements WHERE id = ? AND expires_at > ?)` pour qu'un
    accord supprimé pendant l'appel au fournisseur ne reçoive pas de ligne
    orpheline. Ajouter aussi dans `purgeExpired` un
    `DELETE FROM agreement_parties WHERE agreement_id NOT IN (SELECT id FROM agreements)`.
16. `db/schema.sql` : ajouter
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_parties_handle ON agreement_parties(agreement_id, handle);`
    et l'appliquer sur la base `release`. Cela ferme la course où deux
    comptes portant le même handle remplissent un siège lié au handle.
    `INSERT OR IGNORE` absorbe alors le second.
17. `app/app/page.tsx`, `describe` : ne renvoyer « Ready to download » que
    si `partyOf(a, me)` n'est pas null ; sinon « Closed ».
18. `lib/identity/types.ts`, `parseIdentity` : lire `sub` avant `id`
    (`asString(o.sub) ?? asString(o.id)`). `docs/INTEGRATION.md` définit
    `sub` comme identifiant du jeton d'entrée ; un jeton portant aussi un
    `id` différent donnerait une session avec le mauvais identifiant.
19. `lib/pdf/images.ts`, branche URL : lire `res.body` par morceaux et
    abandonner dès que le total dépasse `imageMaxBytes()`, au lieu de
    `res.arrayBuffer()` suivi d'une vérification. Sans `content-length`,
    le plafond ne borne pas la mémoire aujourd'hui.

Vérification : `tsc`, `lint`, `build` verts. Commit : « Close the remaining
review findings ».

---

## Hors dépôt, à faire par l'auteur

- Turso conserve un historique de restauration ponctuelle indépendant des
  `DELETE`. Régler la rétention de la base `release` au minimum dans le
  tableau de bord Turso, sinon les `profile_json` survivent à la suppression.
- Sur Vercel, projet `release` : retirer les variables `R2_*`,
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `CONSENT_WEBHOOK_URL`,
  `SITE_PLATFORM_EXAMPLES` si elles existent. Vérifier que
  `TURSO_DATABASE_URL` pointe sur `libsql://release-onlymatt43.aws-us-east-2.turso.io`.
- Le projet Vercel `model-release-consent` pointe sur le même dépôt. Décider
  s'il doit être supprimé ou s'il sert à autre chose.

---

## Journal de session, 2026-09-10

Faits seulement, chacun avec sa trace.

- Revue de code du commit `eb6d7b7`, puis huit correctifs poussés
  (commit `98a788b`).
- Base Turso `release` (`libsql://release-onlymatt43.aws-us-east-2.turso.io`) :
  `PRAGMA table_info(agreements)` ne renvoyait rien. L'auteur a créé
  `agreements` et `agreement_parties` via `turso db shell release`.
  `.tables` ne liste que ces deux tables.
- L'auteur a écrit : « on ne garde aucunement les données des users ».
- L'auteur a confirmé que l'admin reste (réponse « exact. ta déduction est
  mauvaise » à la question « pourquoi tu delete l'admin »). Il n'a pas dit
  ce que l'admin montrera.
- La suppression de fichiers par l'agent a été refusée par le mode de
  permissions de la session. Rien n'a été supprimé.
- Ouvert : rôle de l'admin. Ouvert : retrait de `/consent`, `/signed`, R2 et
  des trois tables (déduction de l'agent, non confirmée par l'auteur).

---

## Critères de fin

- `git ls-files | grep -c "consent\|signed\|r2\|shoots\|participations"` renvoie 0.
- `app/admin/login`, `app/api/admin/auth`, `middleware.ts` existent encore.
- `npm run lint`, `npx tsc --noEmit`, `npm run build` verts.
- `/privacy` et `/terms` ne contiennent ni R2, ni durée légale.
- `db/schema.sql` ne crée que deux tables.
- `AGENTS.md` contient les invariants et le script les vérifie.
