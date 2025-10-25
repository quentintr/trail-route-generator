/**
 * Configuration pour les services de cartographie OSM et de routage
 * 
 * Ce fichier contient les paramètres de configuration pour :
 * - API Overpass (OpenStreetMap)
 * - API OSRM (Open Source Routing Machine)
 * - Filtres pour les chemins de randonnée/course
 * - Limitation de taux et gestion des erreurs
 */

/**
 * Configuration de l'API Overpass
 */
export const OVERPASS_CONFIG = {
  /** URL de l'API Overpass */
  endpoint: 'https://overpass-api.de/api/interpreter',
  
  /** Timeout pour les requêtes (en millisecondes) */
  timeout: 30000,
  
  /** Taille maximale de la zone de recherche (en degrés) */
  maxAreaSize: 0.1,
  
  /** Nombre maximum de nœuds à récupérer */
  maxNodes: 10000
} as const

/**
 * Configuration de l'API OSRM
 */
export const OSRM_CONFIG = {
  /** URL de l'instance publique OSRM */
  endpoint: 'https://router.project-osrm.org',
  
  /** Timeout pour les requêtes de routage (en millisecondes) */
  timeout: 15000,
  
  /** Profil de routage pour la marche/course */
  profile: 'foot',
  
  /** Profil de routage pour le vélo */
  bikeProfile: 'bike'
} as const

/**
 * Tags OSM pour les chemins de randonnée et course
 * Basé sur la documentation OSM : https://wiki.openstreetmap.org/wiki/Key:highway
 */
export const RUNNING_PATH_TAGS = {
  /** Tags de chemins prioritaires pour la course/randonnée */
  primary: [
    'footway',      // Sentier piéton
    'path',         // Chemin général
    'track',        // Piste/chemin de terre
    'bridleway',    // Chemin équestre (souvent utilisable à pied)
    'cycleway',     // Piste cyclable (souvent utilisable à pied)
    'steps',        // Escaliers
    'pedestrian'    // Zone piétonne
  ],
  
  /** Tags de routes secondaires acceptables */
  secondary: [
    'residential', // Rue résidentielle
    'unclassified', // Route non classée
    'service',     // Route de service
    'living_street' // Rue de vie (zone 30)
  ],
  
  /** Tags à exclure (routes dangereuses) */
  exclude: [
    'motorway',     // Autoroute
    'trunk',        // Route nationale
    'primary',      // Route principale
    'secondary',    // Route secondaire
    'tertiary'      // Route tertiaire
  ]
} as const

/**
 * Types de surface pour les chemins
 * Basé sur la documentation OSM : https://wiki.openstreetmap.org/wiki/Key:surface
 */
export const SURFACE_TYPES = {
  /** Surfaces naturelles */
  natural: [
    'grass',        // Herbe
    'dirt',         // Terre
    'sand',         // Sable
    'gravel',       // Gravier
    'rock',         // Roche
    'mud',          // Boue
    'earth'         // Terre naturelle
  ],
  
  /** Surfaces artificielles */
  artificial: [
    'paved',        // Revêtu
    'asphalt',      // Asphalte
    'concrete',     // Béton
    'paving_stones', // Pavés
    'cobblestone',  // Pavés de pierre
    'brick',        // Briques
    'metal',        // Métal
    'wood',         // Bois
    'tartan'        // Tartan (sport)
  ],
  
  /** Surfaces mixtes */
  mixed: [
    'unpaved',      // Non revêtu
    'compacted',    // Compacté
    'fine_gravel',  // Gravier fin
    'pebblestone'   // Galets
  ]
} as const

/**
 * Configuration de limitation de taux
 */
export const RATE_LIMITING = {
  /** Nombre maximum de requêtes par minute */
  requestsPerMinute: 60,
  
  /** Délai entre les requêtes (en millisecondes) */
  delayBetweenRequests: 1000,
  
  /** Nombre maximum de tentatives en cas d'échec */
  maxRetries: 3,
  
  /** Délai d'attente entre les tentatives (en millisecondes) */
  retryDelay: 2000
} as const

/**
 * Configuration des formats de données
 */
export const DATA_FORMATS = {
  /** Format GeoJSON pour les chemins */
  geojson: {
    type: 'FeatureCollection',
    features: []
  },
  
  /** SRID pour les coordonnées géographiques */
  srid: 4326,
  
  /** Précision des coordonnées (nombre de décimales) */
  coordinatePrecision: 6
} as const

/**
 * Messages d'erreur personnalisés
 */
export const ERROR_MESSAGES = {
  OVERPASS_TIMEOUT: 'Timeout lors de la requête Overpass',
  OVERPASS_ERROR: 'Erreur lors de la récupération des données OSM',
  OSRM_TIMEOUT: 'Timeout lors du calcul de route OSRM',
  OSRM_ERROR: 'Erreur lors du calcul de route',
  INVALID_COORDINATES: 'Coordonnées invalides',
  NO_PATHS_FOUND: 'Aucun chemin trouvé dans la zone',
  RATE_LIMIT_EXCEEDED: 'Limite de taux dépassée',
  NETWORK_ERROR: 'Erreur de réseau'
} as const

/**
 * Configuration des zones de recherche par défaut
 */
export const DEFAULT_SEARCH_AREAS = {
  /** Zone de recherche par défaut (en degrés) */
  defaultRadius: 0.01, // ~1km
  
  /** Zone de recherche étendue (en degrés) */
  extendedRadius: 0.05, // ~5km
  
  /** Zone de recherche maximale (en degrés) */
  maxRadius: 0.1 // ~10km
} as const

/**
 * Types TypeScript pour la configuration
 */
export interface OverpassQuery {
  bbox: string
  timeout: number
  maxNodes: number
  query: string
}

export interface OSRMRequest {
  coordinates: [number, number][]
  profile: string
  alternatives?: boolean
  steps?: boolean
  geometries?: 'polyline' | 'geojson'
  overview?: 'simplified' | 'full' | 'false'
}

export interface RateLimitConfig {
  requestsPerMinute: number
  delayBetweenRequests: number
  maxRetries: number
  retryDelay: number
}

export interface SearchArea {
  north: number
  south: number
  east: number
  west: number
  radius?: number
}

/**
 * Utilitaires de configuration
 */
export const configUtils = {
  /**
   * Construit une requête Overpass pour une zone donnée
   */
  buildOverpassQuery: (area: SearchArea, tags: string[]): OverpassQuery => ({
    bbox: `${area.south},${area.west},${area.north},${area.east}`,
    timeout: OVERPASS_CONFIG.timeout,
    maxNodes: OVERPASS_CONFIG.maxNodes,
    query: `
      [out:json][timeout:${OVERPASS_CONFIG.timeout}];
      (
        way["highway"~"^(${tags.join('|')})$"](${area.south},${area.west},${area.north},${area.east});
      );
      out geom;
    `
  }),

  /**
   * Valide une zone de recherche
   */
  validateSearchArea: (area: SearchArea): boolean => {
    return (
      area.north > area.south &&
      area.east > area.west &&
      Math.abs(area.north - area.south) <= OVERPASS_CONFIG.maxAreaSize &&
      Math.abs(area.east - area.west) <= OVERPASS_CONFIG.maxAreaSize
    )
  },

  /**
   * Calcule le rayon d'une zone de recherche
   */
  calculateAreaRadius: (area: SearchArea): number => {
    const latDiff = area.north - area.south
    const lonDiff = area.east - area.west
    return Math.max(latDiff, lonDiff) / 2
  }
}
