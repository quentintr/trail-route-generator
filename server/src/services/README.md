# Services de Cartographie - Trail Route Generator

Ce dossier contient les services de cartographie pour l'application Trail Route Generator, incluant l'intégration avec OpenStreetMap (OSM) et OSRM pour le calcul d'itinéraires.

## 📁 Structure

```
services/
├── osm-service.ts          # Service OSM pour récupérer les données géographiques
├── routing-service.ts      # Service de routage utilisant OSRM
├── index.ts               # Export centralisé des services
└── README.md              # Cette documentation

config/
└── osm-config.ts          # Configuration des services OSM et OSRM

examples/
└── mapping-example.ts      # Exemples d'utilisation des services
```

## 🚀 Services Disponibles

### 1. Service OSM (`osm-service.ts`)

Récupère les données géographiques depuis OpenStreetMap via l'API Overpass.

**Fonctionnalités :**
- Récupération de chemins de randonnée/course
- Filtrage par type de surface et difficulté
- Extraction des points d'intérêt (POI)
- Données d'élévation
- Conversion en format GeoJSON

**Utilisation :**
```typescript
import { osmService, osmUtils } from './services'

// Recherche de sentiers
const searchArea = osmUtils.createSearchArea(48.8566, 2.3522, 2) // 2km de rayon
const trails = await osmService.getRunningPaths(searchArea, {
  includeSecondary: true,
  surfaceTypes: ['asphalt', 'dirt'],
  difficulty: ['easy', 'medium']
})

// Points d'intérêt
const pois = await osmService.getPointsOfInterest(searchArea)

// Données d'élévation
const elevation = await osmService.getElevationData(searchArea)
```

### 2. Service de Routage (`routing-service.ts`)

Calcule des itinéraires optimisés utilisant l'API OSRM.

**Fonctionnalités :**
- Calcul d'itinéraires entre deux points
- Itinéraires multi-points avec waypoints
- Matrice de distances
- Profils de routage (pied, vélo)
- Gestion des alternatives

**Utilisation :**
```typescript
import { routingService, routingUtils } from './services'

// Itinéraire simple
const route = await routingService.calculateRoute(
  [2.3522, 48.8566], // [longitude, latitude]
  [2.2945, 48.8584],
  { profile: 'foot', steps: true }
)

// Itinéraire avec waypoints
const waypoints: [number, number][] = [
  [2.3522, 48.8566],
  [2.3542, 48.8576],
  [2.3562, 48.8586]
]
const multiRoute = await routingService.calculateRouteWithWaypoints(waypoints)

// Matrice de distances
const matrix = await routingService.calculateDistanceMatrix(coordinates)
```

## ⚙️ Configuration

### Configuration OSM (`config/osm-config.ts`)

**Endpoints :**
- Overpass API : `https://overpass-api.de/api/interpreter`
- OSRM API : `https://router.project-osrm.org`

**Paramètres :**
- Timeout : 30s (Overpass), 15s (OSRM)
- Limitation de taux : 60 requêtes/minute
- Zone de recherche max : 0.1° (~10km)

**Tags de chemins :**
- **Primaires** : `footway`, `path`, `track`, `bridleway`, `cycleway`
- **Secondaires** : `residential`, `unclassified`, `service`
- **Exclus** : `motorway`, `trunk`, `primary`, `secondary`

## 🧪 Tests

Les tests sont disponibles dans `__tests__/` :

```bash
# Lancer tous les tests
npm test

# Tests spécifiques
npm test -- osm-service.test.ts
npm test -- routing-service.test.ts
npm test -- osm-config.test.ts
```

## 📊 Exemples d'Utilisation

### Recherche de Sentiers

```typescript
import { findTrailsNearLocation } from './examples/mapping-example'

// Recherche de sentiers près de Paris
const trails = await findTrailsNearLocation(48.8566, 2.3522, 2)
console.log(`Trouvé ${trails.features.length} sentiers`)
```

### Calcul d'Itinéraire

```typescript
import { calculateRouteBetweenPoints } from './examples/mapping-example'

// Itinéraire Paris → Tour Eiffel
const route = await calculateRouteBetweenPoints(
  48.8566, 2.3522,  // Paris
  48.8584, 2.2945,  // Tour Eiffel
  'foot'
)
```

### Itinéraire Complet

```typescript
import { createCompleteHikingRoute } from './examples/mapping-example'

// Création d'un itinéraire de randonnée complet
const hikingRoute = await createCompleteHikingRoute(
  48.8566, 2.3522,  // Départ
  48.8584, 2.2945,  // Arrivée
  {
    includePOIs: true,
    maxDistance: 10,
    difficulty: 'medium'
  }
)
```

## 🔧 Fonctionnalités Avancées

### Filtrage des Chemins

```typescript
const trails = await osmService.getRunningPaths(searchArea, {
  includeSecondary: true,           // Inclure routes secondaires
  surfaceTypes: ['asphalt', 'dirt'], // Types de surface
  difficulty: ['easy', 'medium'],   // Niveaux de difficulté
  maxLength: 5                      // Longueur max en km
})
```

### Profils de Routage

```typescript
// Profil piéton (par défaut)
const footRoute = await routingService.calculateRoute(start, end, {
  profile: 'foot',
  steps: true,
  overview: 'full'
})

// Profil vélo
const bikeRoute = await routingService.calculateRoute(start, end, {
  profile: 'bike',
  alternatives: true
})
```

### Gestion des Erreurs

```typescript
try {
  const route = await routingService.calculateRoute(start, end)
} catch (error) {
  if (error.message.includes('NoRoute')) {
    console.log('Aucun itinéraire trouvé')
  } else if (error.message.includes('InvalidInput')) {
    console.log('Coordonnées invalides')
  }
}
```

## 📈 Performance

### Limitation de Taux

- **Overpass API** : 60 requêtes/minute
- **OSRM API** : Pas de limite officielle, mais limitation interne
- **Délai entre requêtes** : 1 seconde

### Optimisations

- Cache des requêtes répétées
- Validation des coordonnées avant envoi
- Gestion des timeouts
- Retry automatique en cas d'échec

## 🗺️ Formats de Données

### GeoJSON

Tous les chemins sont retournés au format GeoJSON standard :

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[2.3522, 48.8566], [2.3542, 48.8576]]
      },
      "properties": {
        "id": 12345,
        "highway": "footway",
        "surface": "asphalt",
        "difficulty": "easy",
        "length": 1.2,
        "name": "Sentier de la Paix"
      }
    }
  ]
}
```

### Coordonnées

- **Format** : `[longitude, latitude]` (GeoJSON standard)
- **SRID** : 4326 (WGS84)
- **Précision** : 6 décimales

## 🚨 Gestion des Erreurs

### Types d'Erreurs

- `OVERPASS_TIMEOUT` : Timeout de l'API Overpass
- `OSRM_ERROR` : Erreur de calcul de route
- `INVALID_COORDINATES` : Coordonnées invalides
- `NO_PATHS_FOUND` : Aucun chemin trouvé
- `RATE_LIMIT_EXCEEDED` : Limite de taux dépassée
- `NETWORK_ERROR` : Erreur de réseau

### Bonnes Pratiques

1. **Valider les coordonnées** avant les requêtes
2. **Gérer les timeouts** avec des valeurs appropriées
3. **Implémenter le retry** pour les erreurs temporaires
4. **Limiter la taille des zones** de recherche
5. **Utiliser le cache** pour les requêtes répétées

## 📚 Documentation Externe

- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OSRM API](http://project-osrm.org/docs/v5.24.0/api/)
- [GeoJSON Specification](https://geojson.org/)
- [OpenStreetMap Wiki](https://wiki.openstreetmap.org/)

## 🤝 Contribution

Pour contribuer aux services de cartographie :

1. Ajouter des tests pour les nouvelles fonctionnalités
2. Documenter les nouvelles APIs
3. Respecter les conventions de nommage
4. Gérer les erreurs de manière appropriée
5. Optimiser les performances

---

**Développé avec ❤️ pour les amoureux de la randonnée**
