# AgriSolar

## 1) Présentation

**AgriSolar** est une Progressive Web App (PWA) destinée au **dimensionnement d’installations de pompage solaire** et de **bassins d’irrigation**.

Objectifs principaux :
- Aider à **sélectionner** et **dimensionner** les composants (panneaux PV, pompe, contrôleur/variateur, tuyauterie, bassin, accessoires).
- Produire des **résultats reproductibles** (hypothèses, paramètres, sorties) et des **scénarios comparatifs**.
- Permettre un **mode offline** pour travailler sur le terrain.
- Générer un **devis PDF** à partir d’un projet dimensionné.

> Remarque : ce dépôt contient volontairement **uniquement l’arborescence** et des **fichiers vides** (JS/JSX/CSS/Prisma/Dockerfile, etc.) afin de poser le cadre du projet avant d’implémenter la logique.

---

## 2) Stack technique

### Frontend (Client)
- **React.js** (via **Vite**)
- **Tailwind CSS**
- **PWA** : manifest + service worker
- **Offline** : stockage local via **IndexedDB**

### Backend (Server)
- **Node.js** + **Express**
- Architecture **par couches** (routes → controllers → services)
- Services dédiés à la **logique mathématique** (dimensionnement, hydraulique, PVGIS)

### Base de données
- **PostgreSQL**
- **Prisma ORM** (prévu via `server/prisma/schema.prisma`)

> Alternative possible (si vous préférez) : Sequelize. La structure peut être adaptée, mais Prisma est privilégié ici car un fichier `.prisma` est déjà prévu.

### Infrastructure
- **Docker**
- **Docker Compose** (orchestration des services : client, server, postgres)

---

## 3) Architecture du système

### Vue d’ensemble
- Le **client** fournit l’UI, gère la PWA, le cache offline, et consomme l’API.
- Le **server** expose une API REST (ou JSON) pour :
  - gérer le catalogue,
  - exécuter/valider certains calculs,
  - appeler l’API PVGIS,
  - générer des PDF,
  - synchroniser les données offline.
- PostgreSQL stocke le catalogue, les projets, les résultats et l’historique.

### Arborescence monorepo (client / server)

```
AgriSolar/
  client/
    Dockerfile
    .dockerignore
    vite.config.js
    tailwind.config.js
    postcss.config.js
    index.html
    public/
      manifest.webmanifest
      sw.js
    src/
      App.jsx
      main.jsx
      index.css
      components/
        index.js
        Layout.jsx
      hooks/
        index.js
        useSizing.js
        useCatalog.js
        useOfflineStorage.js
      services/
        apiClient.js
        catalogService.js
        pvgisService.js
        quoteService.js
        offlineService.js
      pages/
        CatalogPage.jsx
        SizingPage.jsx
        QuotePage.jsx
        OfflinePage.jsx
      pwa/
        registerServiceWorker.js
      db/
        indexedDb.js
      utils/
        constants.js
        math.js

  server/
    Dockerfile
    .dockerignore
    prisma/
      schema.prisma
      seed.js
    src/
      app.js
      server.js
      config/
        env.js
        db.js
      routes/
        index.js
        catalog.routes.js
        sizing.routes.js
        quotes.routes.js
      controllers/
        health.controller.js
        catalog.controller.js
        sizing.controller.js
        quotes.controller.js
      services/
        catalog.service.js
        sizing.service.js
        pvgis.service.js
        pdf.service.js
        offlineSync.service.js
      models/
        catalog.model.js
      middlewares/
        errorHandler.js
        notFound.js
      utils/
        http.js
        validators.js

  docker-compose.yml
  .env.example
  README.md
```

---

## 4) Détail des modules fonctionnels

### 4.1) Gestion Catalogue

**But** : centraliser le référentiel matériel et les paramètres techniques.

Contenu typique du catalogue (à adapter à votre contexte) :
- Panneaux photovoltaïques (puissance, rendement, Voc/Isc, dimensions, prix)
- Pompes (débit nominal, HMT max, courbes, puissance, type AC/DC, prix)
- Contrôleurs / variateurs / MPPT
- Tuyaux et accessoires (diamètres, rugosité, pertes)
- Bassins (géométrie, volumes, matériaux)

Fonctionnalités :
- CRUD (création, édition, suppression)
- Recherche/filtrage
- Import/export (CSV/JSON) (optionnel)
- Versioning simple (optionnel)

Front (exemples d’écrans) :
- Page Catalogue (liste + détail)
- Formulaires de saisie

Back (exemples) :
- Routes `GET/POST/PUT/DELETE /api/catalog`
- Contrôleur `catalog.controller.js`
- Service `catalog.service.js`

---

### 4.2) Moteur de dimensionnement (avec intégration PVGIS)

**But** : produire une configuration cohérente pour le pompage solaire et le besoin d’irrigation.

Entrées (exemples) :
- Localisation (latitude/longitude ou lieu)
- Besoins en eau (m³/jour, plage horaire, saison)
- Données hydrauliques :
  - Débit cible
  - Hauteur manométrique totale (HMT) (ou éléments pour la calculer)
  - Longueur/diamètre de tuyauterie
  - Pertes de charge estimées
- Contraintes : budget, disponibilité matériel, redondance

Calculs (logique à implémenter progressivement) :
- Estimation énergie quotidienne nécessaire
- Estimation puissance pompe et sélection dans le catalogue
- Dimensionnement champ PV (puissance crête, nombre de modules, séries/parallèles)
- Scénarios (optimisé coût / optimisé performance / optimisé disponibilité)

#### Intégration API PVGIS
Rôle de PVGIS :
- Fournir des données d’irradiation/production PV estimée selon la localisation et l’inclinaison.

Bonnes pratiques prévues :
- **Mise en cache** des réponses (pour limiter les appels)
- **Tolérance aux pannes** : fallback sur valeurs moyennes si l’API est indisponible
- **Traçabilité** : stocker les paramètres d’appel (tilt, azimuth, pertes, etc.) associés au résultat

Back (exemples) :
- Service `pvgis.service.js` (appel HTTP PVGIS)
- Service `sizing.service.js` (orchestration des calculs)
- Route `POST /api/sizing/run` (à créer lors de l’implémentation)

---

### 4.3) Générateur de Devis PDF

**But** : générer un devis PDF à partir d’un projet dimensionné et du catalogue.

Contenu du devis :
- En-tête (client, projet, date, référence)
- Liste matériel (désignation, quantité, prix unitaire, sous-total)
- Main d’œuvre/transport (optionnel)
- Totaux (HT/TVA/TTC)
- Notes (conditions, validité)

Approches possibles (à décider au moment de l’implémentation) :
- Génération via un moteur PDF (ex : pdfkit)
- Génération HTML → PDF (ex : Puppeteer)

Back (exemples) :
- Service `pdf.service.js`
- Route `POST /api/quotes/pdf`

---

### 4.4) Mode Offline (PWA + IndexedDB)

**But** : pouvoir travailler en zone à faible connectivité.

Principes :
- Le **service worker** gère le cache des assets et (éventuellement) certaines réponses API.
- **IndexedDB** stocke localement :
  - catalogue (ou partie),
  - projets, inputs, résultats,
  - une file d’attente d’actions à synchroniser.

Synchronisation (idées de flux) :
- Mode offline : création/édition locale → journalisation (queue) → affichage état “à synchroniser”.
- Mode online : envoi des actions → résolution de conflits (stratégie à définir) → mise à jour DB.

Front (emplacements prévus) :
- `client/src/db/indexedDb.js` (abstraction IndexedDB)
- `client/src/services/offlineService.js`
- Hooks dédiés : `useOfflineStorage.js`

Back (emplacements prévus) :
- `server/src/services/offlineSync.service.js`

---

## 5) API (proposition de découpage)

Les routes ci-dessous sont **indicatives** (à confirmer lors de l’implémentation) :
- `GET /api/health` : statut du service
- `GET /api/catalog` : liste
- `POST /api/catalog` : créer
- `PUT /api/catalog/:id` : modifier
- `DELETE /api/catalog/:id` : supprimer
- `POST /api/sizing/run` : lancer un dimensionnement
- `POST /api/pvgis/query` : proxy PVGIS (si nécessaire)
- `POST /api/quotes/pdf` : générer un PDF
- `POST /api/offline/sync` : synchronisation offline

---

## 6) Base de données (modèles prévisionnels)

Modèles possibles (à affiner) :
- `CatalogItem` (type, specs techniques, prix)
- `Project` (métadonnées, localisation, contraintes)
- `SizingInput` (paramètres d’entrée)
- `SizingResult` (résultats, scénarios, hypothèses)
- `Quote` / `QuoteItem` (devis et lignes)
- `SyncEvent` (optionnel) : journal de synchronisation offline

Le schéma Prisma sera à écrire dans :
- `server/prisma/schema.prisma`

---

## 7) Installation (Docker Compose)

### Pré-requis
- Docker installé
- Docker Compose (plugin `docker compose`)

### Démarrage (structure fournie, fichiers à compléter)
Les fichiers Docker existent mais sont **vides** pour l’instant :
- `docker-compose.yml`
- `client/Dockerfile`
- `server/Dockerfile`

Étapes recommandées :
1. Copier le fichier d’exemple d’environnement :
   - dupliquer `.env.example` en `.env` puis le compléter.
2. Renseigner `docker-compose.yml` pour définir au minimum :
   - `db` (PostgreSQL),
   - `server` (Express),
   - `client` (Vite/React).
3. Compléter les Dockerfiles `client/` et `server/`.
4. Lancer :
   - `docker compose up --build`

### Variables d’environnement (exemples)
- `DATABASE_URL` (Prisma) : URL PostgreSQL
- `PORT` : port du serveur
- `CLIENT_ORIGIN` : origine autorisée (CORS)
- `PVGIS_BASE_URL` : base URL PVGIS (optionnel si appel direct)

---

## 8) Prochaines étapes (après la structure)

- Initialiser réellement le client via Vite (React) + config Tailwind.
- Initialiser le serveur Express + routage + middlewares.
- Écrire le schéma Prisma + migrations.
- Implémenter le module Catalogue (CRUD) en premier.
- Ajouter le moteur de dimensionnement + intégration PVGIS.
- Ajouter génération PDF.
- Finaliser PWA + offline + synchronisation.
