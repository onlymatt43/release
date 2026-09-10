# Intégration du flux de transport (`/app`)

`release` ne détient ni comptes, ni profils, ni documents. Il reçoit une
identité vérifiée et un profil déjà rempli d'un **fournisseur d'identité**
externe, fait circuler un accord entre les parties, génère le PDF final pour
chacune, puis efface tout.

Tout ce qui suit est réglé par variables d'environnement. Aucune valeur
n'est écrite dans le code.

## 1. Entrée d'un visiteur

Le fournisseur envoie le visiteur vers `/app/enter`, de préférence en
**POST** (formulaire auto-soumis ou JSON), pour que le jeton ne passe ni
dans l'URL, ni dans l'historique, ni dans les logs :

```
POST {SITE_URL}/app/enter
Content-Type: application/x-www-form-urlencoded

token=<JWT>&return_to=/app
```

Le GET `…/app/enter?token=<JWT>&return_to=/app` est accepté pour un
fournisseur qui ne peut que rediriger. Dans les deux cas, donnez au jeton
une durée de vie très courte (une à deux minutes) : il est rejouable
jusqu'à son expiration.

- `token` : JWT signé **HS256** avec `IDENTITY_JWT_SECRET`. Claims attendus :

  | claim    | obligatoire | contenu                                  |
  | -------- | ----------- | ---------------------------------------- |
  | `sub`    | oui         | identifiant stable du sujet (ex. id X)   |
  | `handle` | oui         | handle public, avec ou sans `@`          |
  | `name`   | non         | nom d'affichage                          |
  | `avatar` | non         | URL d'avatar                             |
  | `exp`    | oui         | expiration courte (quelques minutes)     |
  | `iss`    | si configuré | doit égaler `IDENTITY_JWT_ISSUER`       |
  | `aud`    | si configuré | doit égaler `IDENTITY_JWT_AUDIENCE`     |

- `return_to` : chemin relatif sur `release` où continuer (par défaut `/app`).

`release` ouvre une session (cookie signé, durée `SESSION_TTL_HOURS`,
24 h par défaut) et redirige. Rien n'est écrit en base.

Un visiteur sans session voit un bouton « Continue with {IDENTITY_PROVIDER_NAME} »
qui pointe vers `IDENTITY_LOGIN_URL?return_to=<URL absolue>`. Le fournisseur
authentifie, puis renvoie vers `/app/enter` comme ci-dessus.

## 2. Profil d'un sujet

Quand un sujet crée ou accepte un accord, `release` appelle :

```
GET {IDENTITY_PROFILE_URL}        avec {id} et {handle} remplacés
Authorization: Bearer {IDENTITY_SHARED_SECRET}
Accept: application/json
```

Réponse attendue (`200`) :

```json
{
  "subject": { "id": "123", "handle": "jane", "name": "Jane", "avatar": "https://…" },
  "sections": [
    {
      "title": "Identity",
      "fields": [
        { "label": "Legal name", "value": "Jane Doe" },
        { "label": "Date of birth", "value": "1990-01-01" }
      ]
    },
    {
      "title": "ID document",
      "images": [
        { "label": "Front",  "src": "https://…/front.jpg" },
        { "label": "Back",   "src": "https://…/back.jpg" },
        { "label": "Selfie", "src": "data:image/jpeg;base64,…" }
      ]
    }
  ],
  "signature": { "src": "data:image/png;base64,…" }
}
```

- `release` affiche et imprime **exactement** ces sections, dans cet ordre.
  Il ne connaît aucun nom de champ. Ajouter, retirer ou renommer un champ
  côté fournisseur ne demande aucun changement ici.
- `src` : URI `data:` ou URL absolue. Seules les URL sur l'origine de
  `IDENTITY_PROFILE_URL` (appelées avec le même bearer) ou sur une origine
  listée dans `IDENTITY_IMAGE_ORIGINS` sont récupérées ; toute autre URL est
  ignorée et le document affiche « Image unavailable ». Taille maximale par
  image : `PROFILE_IMAGE_MAX_BYTES` (5 Mo par défaut). Les URI `data:` sont
  le choix le plus sûr : rien n'expire, rien n'est refusé.
- `404` signifie « pas de profil » : `release` refuse l'action et le dit.

## 2b. Résolution d'un handle (recommandé)

Si `IDENTITY_RESOLVE_URL` est configuré, `release` l'appelle au moment de
la demande pour chaque handle invité :

```
GET {IDENTITY_RESOLVE_URL}        avec {handle} remplacé
Authorization: Bearer {IDENTITY_SHARED_SECRET}
```

Réponse `200` : `{ "id": "456", "handle": "bob", "name": "…", "avatar": "…" }`.
Réponse `404` : aucun compte, la demande est refusée.

L'invitation est alors liée à l'**identifiant** du compte : la personne
peut changer de handle et rejoindre quand même, et quelqu'un qui
récupérerait l'ancien handle ne le peut pas. Sans cette URL, l'invitation
est liée au handle seul.

## 3. Contrat

Le texte du contrat vient de `CONTRACT_URL` (JSON) ou de `CONTRACT_JSON`
(inline). Voir `config/contract.example.json`. Il est **figé dans l'accord au
moment de la demande** : ce que les parties acceptent est ce que le PDF montre.

Les cases à cocher sont générées depuis `consents`; `required` vaut `true`
par défaut.

## 4. Cycle de vie d'un accord

1. A, connecté, saisit le handle de B (ou plusieurs). Le profil de A est
   récupéré et figé. L'accord est `pending`.
2. B ouvre `/app/a/{id}` (ou le voit dans « In transit » à sa connexion),
   se connecte, coche les consentements, accepte. Son profil est récupéré et
   figé. Quand tous les handles invités ont accepté : `sealed`.
3. Chaque partie télécharge `/api/app/agreements/{id}/pdf`.
4. Dès que toutes les parties ont téléchargé, l'accord est **supprimé** à
   la fin de la fenêtre `AGREEMENT_DELIVERY_GRACE_MINUTES` (15 minutes par
   défaut, pour permettre de reprendre un téléchargement interrompu ; `0`
   supprime immédiatement). Sinon, tout accord dont `expires_at` est passé
   (`AGREEMENT_TTL_DAYS`, 7 par défaut) est supprimé au premier accès, et
   au plus tard par le cron horaire `/api/cron/purge` (`vercel.json`).

Un compte ne peut avoir que `AGREEMENT_MAX_IN_TRANSIT` demandes en cours
à la fois (10 par défaut), et une demande ne peut inviter plus de 10 handles.

Aucune notification n'est envoyée par `release`.

## 5. Variables d'environnement

Voir `.env.example`, section « Transport flow ».
