# AgriSolar

## 1) Résumé exécutif

**AgriSolar** est une application web conçue pour le **dimensionnement d’installations de pompage solaire** et de **bassins d’irrigation**. Elle combine une interface Progressive Web App, une API métier et une base de données relationnelle pour proposer une expérience complète d’étude, de chiffrage et d’export.

L’objectif du projet est d’offrir un outil métier capable de transformer des besoins hydrauliques et des données de site en une solution technico-économique claire, reproductible et exportable.

---

## 2) Contexte et objectifs

### 2.1 Contexte
Les installations d’irrigation solaire sont de plus en plus demandées dans les zones agricoles isolées, où l’accès à l’électricité est limité ou coûteux. Le dimensionnement de ces installations nécessite des calculs précis, une bonne connaissance du matériel et la prise en compte des conditions locales.

### 2.2 Objectifs du projet

- Proposer un **outil d’aide à la décision** pour les bureaux d’études et installateurs.
- Faciliter le **dimensionnement des pompes solaires**, du champ PV et du bassin d’irrigation.
- Assurer la **traçabilité** des hypothèses, paramètres et résultats.
- Permettre la **comparaison de scénarios** techniques et économiques.
- Fournir un **devis exportable** pour le client.
- Supporter un **mode offline** pour une utilisation sur le terrain.

---

## 3) Idée du projet (explication détaillée)

### 3.1 Vision
AgriSolar est imaginé comme un outil métier qui réduit les risques de conception et accélère les décisions. Le projet vise à remplacer des processus papier ou des feuilles de calcul dispersées par une interface cohérente, qui relie directement:
- les besoins en eau,
- les caractéristiques du site,
- les données photovoltaïques,
- le catalogue produit,
- le chiffrage économique.

### 3.2 Cas d’usage

1. L’utilisateur saisit les caractéristiques du site : localisation, débit requis, saisonnalité, profondeur de puisage, longueur de tuyauterie, etc.
2. L’application calcule la hauteur manométrique totale, estime la puissance nécessaire et sélectionne les composants adaptés.
3. Le système propose un dimensionnement de champ PV, une configuration de pompe/variateur et un coût matériel.
4. Le résultat est présenté sous forme de tableau de synthèse, de KPI et de graphiques économiques.
5. Le projet peut être enregistré, exporté en PDF, ou synchronisé lorsque le réseau est disponible.

### 3.3 Enjeux techniques

- Intégrer des **données PV réalistes** (via PVGIS) pour dimensionner correctement le champ photovoltaïque.
- Gérer des **corrélations hydrauliques**, telles que la HMT, les pertes de charge et la plage de fonctionnement des pompes.
- Construire une **architecture modulable** pour séparer le catalogue, le dimensionnement, le devis et le mode offline.
- Fournir un **flux utilisateur fiable** même lorsque la connectivité manque.

---

## 4) Architecture technique

### 4.1 Frontend

- **React.js** avec **Vite** pour une application moderne et réactive.
- **Tailwind CSS** pour le design rapide et cohérent.
- **PWA** pour une installation possible sur mobile/tablette et une expérience offline.
- **IndexedDB** pour stocker localement les projets et permettre la continuité hors ligne.

### 4.2 Backend

- **Node.js** + **Express** pour l’API REST.
- Architecture **couches** : routes → contrôleurs → services.
- **Services métiers** spécifiques : catalogue, dimensionnement, PVGIS, PDF, synchronisation.
- **Prisma** comme ORM pour interagir avec PostgreSQL.

### 4.3 Base de données

- **PostgreSQL** comme moteur relationnel.
- Modèles prévisionnels : `CatalogItem`, `Project`, `SizingInput`, `SizingResult`, `Quote`, `QuoteItem`, `SyncEvent`.
- Fichier de configuration : `server/prisma/schema.prisma`.

### 4.4 Infrastructure

- **Docker Compose** pour lancer l’ensemble de la stack en développement.
- Services : `client`, `server`, `db`.
- Fichier principal : `docker-compose.yml`.

---

## 5) Modules fonctionnels détaillés

### 5.1 Gestion Catalogue

Le catalogue contient le matériel utilisé pour le dimensionnement : panneaux PV, pompes, contrôleurs, tuyauterie, accessoires et bassins.

Fonctionnalités prévues :
- gestion des fiches produit,
- tri et filtrage,
- création/modification/suppression,
- stockage dans PostgreSQL,
- utilisation dans les calculs de chiffrage.

Fichiers clés :
- `client/src/services/catalogService.js`
- `server/src/controllers/catalog.controller.js`
- `server/src/services/catalog.service.js`
- `server/prisma/schema.prisma`

### 5.2 Dimensionnement solaire et irrigation

Ce module transforme les paramètres de site en une solution technique.

Inputs :
- localisation GPS,
- besoin en volume d’eau,
- période de pompage,
- hauteur de refoulement,
- longueur de canalisation,
- caractéristiques du bassin.

Outputs :
- sélection de pompe,
- puissance PV requise,
- configuration de modules PV,
- calculs de production,
- coût estimé.

Fichiers clés :
- `client/src/hooks/useSizing.js`
- `client/src/pages/SizingPage.jsx`
- `server/src/services/sizing.service.js`
- `server/src/services/pvgis.service.js`

### 5.3 Génération de devis PDF

L’outil doit pouvoir exporter un dossier commercial structuré.

Contenu :
- entête client/projet,
- liste produits,
- détails quantités/prix,
- totaux et marges,
- conditions et validité.

Fichier clé : `server/src/services/pdf.service.js`

### 5.4 Mode Offline

Le mode offline permet de continuer à travailler même sans connexion.

Principes :
- cache des ressources de l’application,
- stockage local des projets,
- mise en file d’attente des actions,
- synchronisation automatique au retour du réseau.

Fichiers clés :
- `client/src/db/indexedDb.js`
- `client/src/services/offlineService.js`
- `server/src/services/offlineSync.service.js`

---

## 6) État d’avancement réel

Le projet est en développement. Une première version fonctionnelle existe, mais plusieurs composants restent à finaliser.

### Fonctionnalités déjà implémentées

- ✅ Lancement de l'infrastructure dev par Docker Compose.
- ✅ Backend qui lit des données depuis PostgreSQL (clients, produits, matériaux spécifiques).
- ✅ Base de données enrichie avec des tables spécifiques (`Panneaux_Photovoltaiques`, `Pompes_Hydrauliques`, `Variateurs_Solaires`) et script de seed.
- ✅ Interface de saisie multi-étapes "Dimensionnement" (menus déroulants dynamiques connectés au catalogue matériel).
- ✅ Dashboard de résultats et export PDF visuel via `pdfkit` (mise en page des tableaux et totaux fiabilisée).

### Fonctionnalités partiellement implémentées ou manquantes

- ⚠️ Catalogue : lecture OK, intégration CRUD complet dans l'UI d'administration à finaliser.
- ⚠️ PVGIS : structure prévue, pas encore d'intégration réelle.
- ❌ Offline : PWA / IndexedDB / synchronisation non finalisés.
- ⚠️ Devis persistants : modèle existant, API pour sauvegarder les devis dans la base de données incomplète.

> Voir `progress.md` pour une analyse détaillée de l’avancement.

---

## 7) Installation et exécution

### Installation rapide avec Docker Compose

Pré-requis : Docker + Docker Compose.

```bash
docker compose up --build
```

Puis accéder à :
- UI : http://localhost:5173
- API : http://localhost:3001

### Exécution manuelle sans Docker

1. Installer les dépendances backend et frontend.
2. Configurer `.env` dans `server/`.
3. Démarrer PostgreSQL localement.
4. Lancer le backend puis le frontend.

---

## 8) Structure du dépôt

- `client/` : application front-end React + PWA.
- `server/` : API Express + services métiers + Prisma.
- `server/prisma/` : schéma de données et seed.
- `docker-compose.yml` : orchestration dev.
- `progress.md` : état d’avancement réel.

---

## 9) Roadmap recommandée

1. Finaliser le **CRUD catalogue** et les écrans admin.
2. Implémenter la **connexion PVGIS** et enrichir les calculs métier.
3. Valider et sauvegarder les **devis** dans la base.
4. Construire un **générateur PDF serveur** plus stable.
5. Terminer le **mode offline** avec synchronisation.
6. Ajouter des **tests**, de la **validation** et de la **sécurité**.

---

## 10) Notes générales

Ce document a été réorganisé pour donner à la fois une vue d’ensemble du projet et une description de l’état actuel du code. Il sert de base pour un rapport de suivi, tout en guidant les prochains développements.
