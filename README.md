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

### 4. Configuration des variables d'environnement

#### Backend
```bash
cp env.example .env
```

Éditer le fichier `.env` avec vos paramètres :
```env
DATABASE_URL="postgresql://username:password@localhost:5432/trail_route_generator?schema=public"
JWT_SECRET=your-super-secret-jwt-key-here
```

#### Frontend
```bash
cp client/env.example client/.env
```

Éditer le fichier `client/.env` :
```env
VITE_API_URL=http://localhost:5000/api
VITE_MAPBOX_TOKEN=your-mapbox-token-here
```

### 5. Initialiser la base de données
```bash
cd server
npm run db:generate
npm run db:push
```

## 🚀 Démarrage

### Mode développement
```bash
# Démarrer le frontend et le backend simultanément
npm run dev

# Ou démarrer séparément
npm run dev:client  # Frontend sur http://localhost:3000
npm run dev:server  # Backend sur http://localhost:5000
```

### Mode production
```bash
# Construire tous les projets
npm run build

# Démarrer le serveur
cd server
npm start
```

## 📝 Scripts Disponibles

### Racine
- `npm run dev` - Démarre le frontend et le backend en mode développement
- `npm run build` - Construit tous les projets
- `npm run install:all` - Installe toutes les dépendances
- `npm run clean` - Nettoie tous les node_modules et dist

### Frontend (client/)
- `npm run dev` - Serveur de développement Vite
- `npm run build` - Build de production
- `npm run preview` - Prévisualisation du build
- `npm run lint` - Linting ESLint

### Backend (server/)
- `npm run dev` - Serveur de développement avec hot reload
- `npm run build` - Build TypeScript
- `npm run start` - Serveur de production
- `npm run db:generate` - Génère le client Prisma
- `npm run db:push` - Pousse le schéma vers la DB
- `npm run db:migrate` - Exécute les migrations
- `npm run db:studio` - Interface Prisma Studio

## 🗄️ Base de Données

### Schéma Prisma
Le schéma Prisma définit les modèles pour :
- **Users** - Utilisateurs de l'application
- **Trails** - Sentiers de randonnée
- **Routes** - Itinéraires générés
- **Waypoints** - Points d'intérêt
- **Reviews** - Avis et notes

### Migrations
```bash
# Créer une nouvelle migration
npm run db:migrate

# Réinitialiser la base de données
npm run db:push --force-reset
```

## 🗺️ Fonctionnalités

### Frontend
- 🗺️ **Cartes interactives** avec Leaflet
- 🎨 **Interface moderne** avec TailwindCSS
- 📱 **Design responsive**
- 🔍 **Recherche de sentiers**
- 📍 **Génération d'itinéraires**
- ⭐ **Système de notation**
- 👤 **Authentification utilisateur**

### Backend
- 🔐 **Authentification JWT**
- 🗄️ **API REST complète**
- 📊 **Données géographiques PostGIS**
- 🛡️ **Sécurité avec Helmet et CORS**
- 📝 **Validation avec Zod**
- 🚀 **Performance optimisée**

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation
- Contacter l'équipe de développement

---

**Développé avec ❤️ pour les amoureux de la randonnée**
