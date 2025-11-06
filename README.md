# Trail Route Generator

Une application web moderne pour générer des itinéraires de randonnée avec React, Node.js et PostgreSQL.

## 🚀 Technologies

### Frontend
- **React 18** avec TypeScript
- **Vite** comme outil de build
- **TailwindCSS** pour le styling
- **Leaflet** pour les cartes interactives
- **React Router** pour la navigation
- **Zustand** pour la gestion d'état

### Backend
- **Node.js** avec Express
- **TypeScript**
- **PostgreSQL** + **PostGIS** pour les données géographiques
- **Prisma** comme ORM
- **JWT** pour l'authentification

## 📁 Structure du Projet

```
trail-route-generator/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   ├── hooks/          # Hooks personnalisés
│   │   ├── stores/         # Stores Zustand
│   │   ├── utils/          # Utilitaires
│   │   └── types/          # Types TypeScript
│   ├── public/             # Assets statiques
│   └── package.json
├── server/                 # Backend Node.js
│   ├── src/
│   │   ├── controllers/    # Contrôleurs API
│   │   ├── middleware/     # Middleware Express
│   │   ├── models/         # Modèles Prisma
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Services métier
│   │   └── utils/          # Utilitaires
│   ├── prisma/             # Schémas et migrations
│   └── package.json
├── shared/                 # Types et utilitaires partagés
│   ├── src/
│   │   ├── types/          # Types partagés
│   │   └── utils/          # Utilitaires partagés
│   └── package.json
└── package.json            # Configuration monorepo
```

## 🛠️ Installation

### Prérequis
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 13 avec extension PostGIS

### 1. Cloner le projet
```bash
git clone <repository-url>
cd trail-route-generator
```

### 2. Installer les dépendances
```bash
npm run install:all
```

### 3. Configuration de la base de données

#### Installer PostgreSQL avec PostGIS
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib postgis

# macOS avec Homebrew
brew install postgresql postgis

# Windows
# Télécharger depuis https://www.postgresql.org/download/windows/
```

#### Créer la base de données
```sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Créer la base de données
CREATE DATABASE trail_route_generator;

-- Se connecter à la base de données
\c trail_route_generator;

-- Activer l'extension PostGIS
CREATE EXTENSION postgis;
```

#### Configurer les variables d'environnement
```bash
# Copier les fichiers d'exemple
cp server/env.example server/.env
cp client/env.example client/.env

# Éditer server/.env
DATABASE_URL="postgresql://user:password@localhost:5432/trail_route_generator"
JWT_SECRET="your-secret-key"
PORT=3001
```

### 4. Initialiser la base de données
```bash
cd server
npm run db:generate
npm run db:push
```

### 5. Lancer l'application
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

L'application sera accessible sur :
- Frontend : http://localhost:8181
- Backend : http://localhost:3001

## 🧪 Tests

### Backend

```bash
cd server
npm test                  # Tous les tests
npm run test:watch        # Mode watch
npm run test:coverage     # Avec couverture
```

**Tests disponibles :**
- `tests/unit/algorithms/loop-generator.test.ts` - Tests de l'algorithme de génération de boucles
- `tests/unit/algorithms/pathfinding.test.ts` - Tests des algorithmes de pathfinding
- `tests/unit/utils/geo-utils.test.ts` - Tests des utilitaires géographiques
- `tests/integration/routes.test.ts` - Tests d'intégration de l'API routes
- `tests/integration/osm-loader.test.ts` - Tests du chargement OSM

### Frontend

```bash
cd client
npm test                  # Tous les tests
npm run test:watch        # Mode watch
npm run test:coverage     # Avec couverture
npm run test:ui           # Interface graphique
npm run test:e2e          # Tests E2E (Playwright)
```

**Tests disponibles :**
- `tests/components/SearchForm.test.tsx` - Tests du formulaire de recherche
- `tests/components/MapView.test.tsx` - Tests de la carte
- `tests/components/RouteCard.test.tsx` - Tests de la carte de route
- `tests/integration/route-generation.test.tsx` - Tests d'intégration de génération
- `tests/e2e/full-workflow.test.ts` - Tests E2E du workflow complet

### Couverture minimale requise

- **Lignes** : 70%
- **Fonctions** : 70%
- **Branches** : 70%
- **Statements** : 70%

## 📚 Documentation

### API

L'API est documentée avec Swagger/OpenAPI. Accédez à la documentation sur :
- http://localhost:3001/api-docs (si configuré)

### Endpoints principaux

#### Génération de routes
```
POST /api/routes/generate
Body: {
  start_lat: number,
  start_lon: number,
  distance: number,      // en km
  pace: number,          // en min/km
  terrain_type: 'paved' | 'unpaved' | 'mixed',
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
}
```

#### Liste des routes
```
GET /api/routes
Query params: ?page=1&limit=10
```

## 🚀 Déploiement

### Production

```bash
# Build
cd server && npm run build
cd client && npm run build

# Démarrer
cd server && npm start
```

### Docker (optionnel)

```bash
docker-compose up -d
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT.
