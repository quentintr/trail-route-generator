# Configuration PostGIS pour Trail Route Generator

Ce document explique comment configurer PostgreSQL avec l'extension PostGIS pour les données géographiques.

## 🗄️ Prérequis

### 1. Installation de PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# macOS avec Homebrew
brew install postgresql

# Windows
# Télécharger depuis https://www.postgresql.org/download/windows/
```

### 2. Installation de PostGIS
```bash
# Ubuntu/Debian
sudo apt-get install postgis postgresql-14-postgis-3

# macOS avec Homebrew
brew install postgis

# Windows
# PostGIS est inclus dans l'installateur PostgreSQL
```

## 🚀 Configuration

### 1. Créer la base de données
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

### 2. Configuration des variables d'environnement
```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer le fichier .env
DATABASE_URL="postgresql://username:password@localhost:5432/trail_route_generator?schema=public"
```

### 3. Initialisation avec Prisma
```bash
# Générer le client Prisma
npm run db:generate

# Pousser le schéma vers la base de données
npm run db:push

# Initialiser PostGIS (optionnel, déjà fait manuellement)
npm run db:init-postgis
```

## 🧪 Tests

### 1. Tester la configuration PostGIS
```bash
# Tester les fonctions PostGIS
npm run db:test-postgis

# Lancer les tests unitaires
npm test
```

### 2. Vérifier la santé de l'application
```bash
# Démarrer le serveur
npm run dev

# Tester l'endpoint de santé
curl http://localhost:5000/health
```

## 📊 Structure des Données Géographiques

### Types de données PostGIS utilisés :
- **Geography(LineString, 4326)** : Pour les routes et segments
- **SRID 4326** : Système de coordonnées WGS84 (latitude/longitude)
- **Format GeoJSON** : [longitude, latitude] pour la compatibilité

### Exemple de données :
```json
{
  "type": "LineString",
  "coordinates": [
    [2.3522, 48.8566],  // [longitude, latitude] - Paris
    [2.2945, 48.8584], // [longitude, latitude] - Eiffel Tower
    [2.3200, 48.8700]  // [longitude, latitude] - Autre point
  ]
}
```

## 🔍 Requêtes Géographiques Supportées

### 1. Calcul de distance
```sql
SELECT ST_Distance(
  ST_GeogFromText('POINT(2.3522 48.8566)'),
  ST_GeogFromText('POINT(2.2945 48.8584)')
) as distance_meters;
```

### 2. Recherche dans une zone
```sql
SELECT * FROM routes 
WHERE ST_Contains(
  ST_MakeEnvelope(2.0, 48.0, 3.0, 49.0, 4326),
  geometry
);
```

### 3. Recherche par proximité
```sql
SELECT * FROM segments 
WHERE ST_DWithin(
  geometry,
  ST_GeogFromText('POINT(2.3522 48.8566)'),
  1000  -- 1000 mètres
);
```

## 🚨 Dépannage

### Problème : PostGIS non trouvé
```sql
-- Vérifier si PostGIS est installé
SELECT PostGIS_Version();

-- Si non installé, l'installer
CREATE EXTENSION postgis;
```

### Problème : Erreur de connexion
```bash
# Vérifier que PostgreSQL fonctionne
sudo systemctl status postgresql

# Vérifier la configuration
psql -U postgres -c "SELECT version();"
```

### Problème : Permissions
```sql
-- Donner les permissions à l'utilisateur
GRANT ALL PRIVILEGES ON DATABASE trail_route_generator TO username;
GRANT USAGE ON SCHEMA public TO username;
```

## 📈 Performance

### Index spatiaux automatiques
- Les index GIST sont créés automatiquement sur les colonnes géographiques
- Optimisation des requêtes spatiales
- Support des requêtes de proximité rapides

### Bonnes pratiques
- Utiliser `ST_DWithin` pour les recherches de proximité
- Limiter les résultats avec `LIMIT`
- Utiliser des bounding boxes pour les recherches étendues

## 🔧 Scripts Utiles

```bash
# Initialiser PostGIS
npm run db:init-postgis

# Tester PostGIS
npm run db:test-postgis

# Générer le client Prisma
npm run db:generate

# Pousser le schéma
npm run db:push

# Lancer les tests
npm test
```

## 📚 Ressources

- [Documentation PostGIS](https://postgis.net/documentation/)
- [Prisma avec PostGIS](https://www.prisma.io/docs/concepts/components/prisma-schema/data-sources#postgresql)
- [GeoJSON Specification](https://geojson.org/)
- [SRID 4326 (WGS84)](https://epsg.io/4326)
