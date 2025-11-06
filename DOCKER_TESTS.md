# Guide : Lancer les tests dans Docker

Ce guide explique comment exécuter les tests du projet dans des conteneurs Docker.

## 📋 Prérequis

- Docker et Docker Compose installés
- Les fichiers `docker-compose.test.yml` et `Dockerfile.dev` présents

## 🚀 Commandes rapides

### Tests Backend

```bash
# Lancer tous les tests backend
docker-compose -f docker-compose.test.yml --profile test-backend up --abort-on-container-exit

# Tests backend avec couverture
docker-compose -f docker-compose.test.yml --profile test-backend-coverage up --abort-on-container-exit

# Voir les logs uniquement
docker-compose -f docker-compose.test.yml --profile test-backend up --abort-on-container-exit server-test
```

### Tests Frontend

```bash
# Lancer tous les tests frontend
docker-compose -f docker-compose.test.yml --profile test-frontend up --abort-on-container-exit

# Tests frontend avec couverture
docker-compose -f docker-compose.test.yml --profile test-frontend-coverage up --abort-on-container-exit

# Voir les logs uniquement
docker-compose -f docker-compose.test.yml --profile test-frontend up --abort-on-container-exit client-test
```

### Tous les tests

```bash
# Lancer tous les tests (backend + frontend)
docker-compose -f docker-compose.test.yml --profile test-backend --profile test-frontend up --abort-on-container-exit
```

## 🔧 Commandes détaillées

### 1. Tests Backend avec Jest

```bash
# Lancer les tests backend
docker-compose -f docker-compose.test.yml --profile test-backend up --abort-on-container-exit server-test

# Mode watch (nécessite de modifier le docker-compose pour garder le conteneur actif)
docker-compose -f docker-compose.test.yml --profile test-backend run --rm server-test npm run test:watch

# Tests avec couverture
docker-compose -f docker-compose.test.yml --profile test-backend-coverage up --abort-on-container-exit server-test-coverage

# Accéder au conteneur pour exécuter des commandes manuelles
docker-compose -f docker-compose.test.yml --profile test-backend run --rm server-test sh
```

### 2. Tests Frontend avec Vitest

```bash
# Lancer les tests frontend
docker-compose -f docker-compose.test.yml --profile test-frontend up --abort-on-container-exit client-test

# Mode watch
docker-compose -f docker-compose.test.yml --profile test-frontend run --rm client-test npm run test:watch

# Tests avec couverture
docker-compose -f docker-compose.test.yml --profile test-frontend-coverage up --abort-on-container-exit client-test-coverage

# Interface UI de Vitest
docker-compose -f docker-compose.test.yml --profile test-frontend run --rm -p 51204:51204 client-test npm run test:ui
```

### 3. Tests E2E avec Playwright

```bash
# Installer Playwright dans le conteneur
docker-compose -f docker-compose.test.yml --profile test-frontend run --rm client-test npx playwright install

# Lancer les tests E2E
docker-compose -f docker-compose.test.yml --profile test-frontend run --rm client-test npm run test:e2e

# Lancer les tests E2E avec interface UI
docker-compose -f docker-compose.test.yml --profile test-frontend run --rm -p 9323:9323 client-test npx playwright test --ui
```

## 📊 Voir les résultats de couverture

Après avoir lancé les tests avec couverture, les rapports sont générés dans :

- **Backend** : `server/coverage/`
- **Frontend** : `client/coverage/`

Pour voir le rapport HTML :

```bash
# Backend
open server/coverage/lcov-report/index.html

# Frontend
open client/coverage/index.html
```

## 🛠️ Commandes utiles

### Nettoyer les conteneurs de test

```bash
# Arrêter et supprimer les conteneurs
docker-compose -f docker-compose.test.yml down

# Supprimer aussi les volumes (base de données de test)
docker-compose -f docker-compose.test.yml down -v
```

### Rebuild les images

```bash
# Rebuild les images avant de lancer les tests
docker-compose -f docker-compose.test.yml build

# Rebuild sans cache
docker-compose -f docker-compose.test.yml build --no-cache
```

### Voir les logs en temps réel

```bash
# Suivre les logs d'un service spécifique
docker-compose -f docker-compose.test.yml --profile test-backend logs -f server-test
```

### Exécuter une commande dans un conteneur

```bash
# Backend - Exécuter une commande spécifique
docker-compose -f docker-compose.test.yml --profile test-backend run --rm server-test npm test -- --testNamePattern="Loop Generator"

# Frontend - Exécuter un test spécifique
docker-compose -f docker-compose.test.yml --profile test-frontend run --rm client-test npm test SearchForm
```

## 🔍 Dépannage

### Problème : Les tests ne se lancent pas

```bash
# Vérifier que les conteneurs sont bien construits
docker-compose -f docker-compose.test.yml config

# Vérifier les logs
docker-compose -f docker-compose.test.yml --profile test-backend logs server-test
```

### Problème : Base de données non accessible

```bash
# Vérifier que PostgreSQL est bien démarré
docker-compose -f docker-compose.test.yml up postgres-test

# Vérifier la connexion
docker-compose -f docker-compose.test.yml exec postgres-test psql -U postgres -d trail_routes_test -c "SELECT 1;"
```

### Problème : Dépendances manquantes

```bash
# Reinstaller les dépendances dans le conteneur
docker-compose -f docker-compose.test.yml --profile test-backend run --rm server-test npm install
docker-compose -f docker-compose.test.yml --profile test-frontend run --rm client-test npm install
```

## 📝 Scripts npm pour simplifier

Ajoutez ces scripts dans votre `package.json` à la racine :

```json
{
  "scripts": {
    "test:docker:backend": "docker-compose -f docker-compose.test.yml --profile test-backend up --abort-on-container-exit server-test",
    "test:docker:frontend": "docker-compose -f docker-compose.test.yml --profile test-frontend up --abort-on-container-exit client-test",
    "test:docker:all": "docker-compose -f docker-compose.test.yml --profile test-backend --profile test-frontend up --abort-on-container-exit",
    "test:docker:coverage": "docker-compose -f docker-compose.test.yml --profile test-backend-coverage --profile test-frontend-coverage up --abort-on-container-exit"
  }
}
```

Ensuite vous pouvez simplement utiliser :

```bash
npm run test:docker:backend
npm run test:docker:frontend
npm run test:docker:all
npm run test:docker:coverage
```

## 🎯 Exemples d'utilisation

### Exemple 1 : Tests backend uniquement

```bash
docker-compose -f docker-compose.test.yml --profile test-backend up --abort-on-container-exit
```

### Exemple 2 : Tests avec couverture

```bash
# Backend
docker-compose -f docker-compose.test.yml --profile test-backend-coverage up --abort-on-container-exit

# Frontend
docker-compose -f docker-compose.test.yml --profile test-frontend-coverage up --abort-on-container-exit
```

### Exemple 3 : Mode watch pour développement

```bash
# Backend (dans un terminal)
docker-compose -f docker-compose.test.yml --profile test-backend run --rm server-test npm run test:watch

# Frontend (dans un autre terminal)
docker-compose -f docker-compose.test.yml --profile test-frontend run --rm client-test npm run test:watch
```

## ⚠️ Notes importantes

1. **Base de données de test** : Une base de données séparée (`trail_routes_test`) est utilisée pour les tests
2. **Ports** : PostgreSQL de test utilise le port `5433` pour éviter les conflits
3. **Volumes** : Les volumes montent le code source pour permettre le hot reload
4. **Réseaux** : Les services de test utilisent un réseau séparé (`trail-routes-test-network`)

