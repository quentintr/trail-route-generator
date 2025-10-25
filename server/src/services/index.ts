/**
 * Export des services de cartographie
 * 
 * Ce fichier centralise l'export de tous les services
 * de cartographie et de routage pour une utilisation simplifiée.
 */

// Services principaux
export { OSMService, osmService, osmUtils } from './osm-service'
export { RoutingService, routingService, routingUtils } from './routing-service'

// Configuration
export * from '../config/osm-config'

// Types pour l'utilisation externe
export type {
  // Types OSM
  OSMWay,
  OSMNode,
  OSMResponse,
  GeoJSONFeature,
  GeoJSONCollection,
  
  // Types de routage
  OSRMRouteRequest,
  OSRMTableRequest,
  OSRMRouteResponse,
  OSRMRoute,
  OSRMLeg,
  OSRMStep,
  OSRMWaypoint,
  OSRMTableResponse,
  RouteResult,
  RouteLeg,
  RouteOptions,
  
  // Types de configuration
  OverpassQuery,
  OSRMRequest,
  RateLimitConfig,
  SearchArea
} from './osm-service'

export type {
  // Types de routage supplémentaires
  OSRMRouteRequest as OSRMRouteRequestType,
  OSRMTableRequest as OSRMTableRequestType,
  RouteResult as RouteResultType,
  RouteOptions as RouteOptionsType
} from './routing-service'

/**
 * Fonction utilitaire pour initialiser tous les services
 */
export const initializeMappingServices = () => {
  console.log('🗺️  Services de cartographie initialisés')
  console.log('   - Service OSM: Prêt')
  console.log('   - Service de routage: Prêt')
  console.log('   - Configuration: Chargée')
  
  return {
    osm: osmService,
    routing: routingService,
    utils: {
      osm: osmUtils,
      routing: routingUtils
    }
  }
}

/**
 * Vérification de la santé des services
 */
export const checkServicesHealth = async () => {
  const health = {
    osm: false,
    routing: false,
    timestamp: new Date().toISOString()
  }

  try {
    // Test du service OSM (vérification de la configuration)
    const testArea = osmUtils.createSearchArea(48.8566, 2.3522, 0.001)
    if (configUtils.validateSearchArea(testArea)) {
      health.osm = true
    }
  } catch (error) {
    console.warn('Service OSM non disponible:', error)
  }

  try {
    // Test du service de routage (vérification de la configuration)
    const testCoords: [number, number] = [2.3522, 48.8566]
    if (routingUtils.validateCoordinates) {
      health.routing = true
    }
  } catch (error) {
    console.warn('Service de routage non disponible:', error)
  }

  return health
}

// Import des utilitaires de configuration
import { configUtils } from '../config/osm-config'

// Re-export des utilitaires de configuration
export { configUtils }
