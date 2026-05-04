# Progress — AgriSolar

Date: 2026-05-04

Ce document décrit **ce qui est réellement implémenté dans le code actuel** (client + server + DB) par rapport à la description fonctionnelle des modules **A → D**.

---

## TL;DR (état actuel)

- ✅ **Infra dev stable via Docker**: `docker compose up` lance **Postgres + API + UI**.
- ✅ **Données “réelles” (Postgres)**: le backend lit maintenant **clients** + **produits** depuis la DB (seed Prisma).
- ✅ **Module B (Stepper UI)**: formulaire multi-étapes fonctionnel avec validation + GPS + appel API.
- ✅ **Module C (DataViz + export PDF)**: dashboard résultats + graphique ROI + export PDF (capture DOM).
- ⚠️ **Module A (Admin CRUD)**: affichage catalogue OK (lecture), mais **pas encore de CRUD** (ni API, ni UI admin).
- ❌ **PVGIS (réel)**: pas encore connecté.
- ❌ **Offline (PWA/IndexedDB/sync)**: structure présente mais non implémentée.
- ⚠️ **Devis “vrai”**: modèle Prisma existe + seed, mais pas de endpoints complets (création/persist/exports pro).

---

## Comment lancer (dev)

### Tout via Docker

```bash
docker compose up --build -d
```

- UI: http://localhost:5173
- API: http://localhost:3001
- DB: Postgres exposé sur `localhost:5432`

Endpoints utiles:
- `GET http://localhost:3001/api/health`
- `GET http://localhost:3001/api/clients`
- `GET http://localhost:3001/api/catalog`
- `POST http://localhost:3001/api/sizing/run`

---

## Module A — Gestion du Catalogue (Espace Admin)

### Réalisé

- ✅ **Base de données prête** (Postgres + Prisma): table `Product` avec `category`, `price`, `specifications` (JSON).
- ✅ **Lecture catalogue via API**: `GET /api/catalog` renvoie la liste des produits depuis Postgres.
- ✅ **UI “lecture” catalogue**: une page d’affichage existe (cartes produits + specs).

### Partiellement réalisé / à câbler

- ⚠️ La page catalogue **n’est pas l’écran principal** pour l’instant: l’app démarre sur le dimensionnement.

### Reste à faire (important)

- ❌ **CRUD complet** (Admin):
  - API: `POST /api/catalog`, `PUT /api/catalog/:id`, `DELETE /api/catalog/:id` (et validation).
  - UI Admin: formulaires (ajout/modif), table filtrable, suppression.
- ❌ **Gestion des marges**:
  - soit un champ “margin” global (settings)
  - soit marge par catégorie/produit.
- ❌ **Sécurité / accès admin**:
  - Auth (login), rôle `ADMIN`, protection routes.

---

## Module B — Moteur de Dimensionnement (cœur technique)

### Réalisé

- ✅ **Stepper React** (saisie assistée):
  - étapes + validations (latitude/longitude, culture, surface, profondeur, etc.)
  - bouton GPS (géolocalisation navigateur)
- ✅ **Backend sizing**: `POST /api/sizing/run` renvoie un résultat structuré.
- ✅ **Sélection automatique du matériel** (basique) dans le backend:
  - le calcul récupère les produits en DB (`PANEL`, `INVERTER`, `PUMP`, `ACCESSORY`) et calcule les coûts.

### Limites actuelles

- ⚠️ Les **algorithmes** sont encore **heuristiques** (règles simples) et pas un modèle hydraulique/énergétique complet.
- ⚠️ PVGIS non intégré: la saisie lat/long existe, mais il n’y a pas d’appel PVGIS réel.

### Reste à faire (ingénierie)

- ❌ **PVGIS réel**:
  - implémenter un service backend `pvgis.service.js` et un endpoint `GET /api/pvgis?...`
  - cache des réponses, gestion erreurs, traçabilité paramètres.
- ❌ **Calculs métier**:
  - besoin en eau selon culture/saison
  - HMT / pertes de charge / choix pompe (courbes)
  - sizing PV (strings série/parallèle, fenêtres horaires, rendement, pertes)
  - scénarios (coût/perf/dispo) + règles de sélection.

---

## Module C — Devis + DataViz

### Réalisé

- ✅ **Dashboard résultats** (UI): KPIs + tableau matériel + **courbe ROI** (Recharts).
- ✅ **Export PDF** côté client: `exportElementToPdf` (html2canvas + jsPDF) capture l’écran.

### Limites actuelles

- ⚠️ Le PDF est un **export visuel** (capture DOM). Il n’y a pas encore:
  - template “pro” (logo, en-têtes, pages maîtrisées)
  - génération serveur.
- ⚠️ **Devis/persistance**:
  - le modèle Prisma `Quote` existe et un exemple est seedé,
  - mais l’API `/api/quotes` est encore `501 Not Implemented`.

### Reste à faire

- ❌ **API devis**:
  - `POST /api/quotes` pour créer (persist) un devis + entrées + résultats
  - `GET /api/quotes` liste/filtre, `GET /api/quotes/:id`, etc.
- ❌ **PDF professionnel**:
  - soit serveur (PDFKit/puppeteer) pour un rendu stable,
  - soit un template client (mais multi-pages propre est plus difficile).

---

## Module D — Résilience & Offline (PWA)

### Réalisé

- ✅ La structure PWA existe (manifest, service worker “placeholder”).

### Non réalisé (à ce stade)

- ❌ Service Worker réel (cache stratégique: shell + API, stratégies SWR, etc.)
- ❌ IndexedDB (le fichier existe mais est vide)
- ❌ Synchronisation offline → Postgres (services/hooks vides)

### Reste à faire (roadmap suggérée)

1) Cacher l’app shell (assets) + fallback offline.
2) Cacher `GET /api/catalog` et `GET /api/clients` dans IndexedDB.
3) Stocker localement les runs sizing / devis.
4) Sync auto au retour réseau (queue + retries + conflits).

---

## Infra / Backend / DB

### Réalisé

- ✅ Docker Compose: services `db` (Postgres), `server` (Express), `client` (Vite).
- ✅ Prisma + seed automatique au boot server:
  - `prisma generate`
  - `prisma db push`
  - `node prisma/seed.js`

### Manques (qualité & prod)

- ❌ Migrations Prisma (au lieu de `db push`) pour une vraie gestion d’évolution de schéma.
- ❌ Auth + sécurité API + validation (zod/joi) + rate limiting.
- ❌ Tests (unit/integration) et CI.

---

## Ce que le code montre “en vrai” aujourd’hui

- L’app fonctionne en dev end-to-end avec:
  - **DB Postgres seedée** (clients + produits)
  - **UI dimensionnement** (Stepper)
  - **calcul backend** qui utilise les produits DB pour chiffrage
  - **dashboard ROI + export PDF**

Le gros du travail restant pour coller au descriptif: **Admin CRUD sécurisé**, **PVGIS + calculs métier**, **devis persistés + PDF pro**, **mode offline complet**.
