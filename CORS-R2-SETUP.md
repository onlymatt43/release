# Configuration CORS pour Cloudflare R2

## 🎯 Problème
Les iPhones (et navigateurs) bloquent les uploads via presigned URLs si CORS n'est pas configuré sur le bucket R2.

## ✅ Solution: Configurer CORS sur R2

### 1. Accéder à Cloudflare Dashboard
1. Va sur https://dash.cloudflare.com
2. Clique sur **R2** dans le menu de gauche
3. Sélectionne ton bucket (celui configuré dans `R2_BUCKET_NAME`)

### 2. Configurer CORS
1. Clique sur l'onglet **Settings**
2. Scroll jusqu'à **CORS Policy**
3. Clique sur **Edit CORS Policy**
4. Colle cette configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://your-production-domain.example",
      "https://your-project.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. Sauvegarder
Clique sur **Save** et teste l'upload depuis ton iPhone!

## 🔍 Test
Après la config, ouvre la console du navigateur (Safari DevTools sur iPhone):
- Les logs détaillés vont maintenant apparaître
- Tu verras exactement où l'erreur se produit

## 📝 Notes
- `AllowedOrigins`: Liste tous tes domaines (production + dev)
- `AllowedMethods`: Inclut PUT pour les uploads
- `AllowedHeaders: ["*"]`: Permet tous les headers (Content-Type, etc.)
- `MaxAgeSeconds`: Cache la réponse CORS pendant 1h
