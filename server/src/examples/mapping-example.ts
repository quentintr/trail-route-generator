/**
 * Exemple d'utilisation des services de cartographie
 * 
 * Ce fichier montre comment utiliser les services OSM et de routage
 * pour créer des fonctionnalités de cartographie dans l'application.
 */

import { 
  osmService, 
  routingService, 
  osmUtils, 
  routingUtils,
  initializeMappingServices,
  checkServicesHealth 
} from '../services'

/**
 * Exemple : Recherche de chemins de randonnée autour d'un point
 */
export async function findTrailsNearLocation(
  latitude: number,
  longitude: number,
  radiusKm: number = 2
) {
  try {
    console.log(`🔍 Recherche de sentiers près de ${latitude}, ${longitude}`)
    
    // Créer une zone de recherche
    const searchArea = osmUtils.createSearchArea(latitude, longitude, radiusKm)
    
    // Récupérer les chemins de randonnée
    const trails = await osmService.getRunningPaths(searchArea, {
      includeSecondary: true,
      surfaceTypes: ['asphalt', 'dirt', 'gravel'],
      difficulty: ['easy', 'medium']
    })
    
    console.log(`✅ Trouvé ${trails.features.length} sentiers`)
    
    // Afficher les détails des sentiers
    trails.features.forEach((trail, index) => {
      console.log(`   ${index + 1}. ${trail.properties.name || 'Sans nom'}`)
      console.log(`      - Type: ${trail.properties.highway}`)
      console.log(`      - Surface: ${trail.properties.surface || 'Non spécifiée'}`)
      console.log(`      - Difficulté: ${trail.properties.difficulty || 'Non spécifiée'}`)
      console.log(`      - Longueur: ${trail.properties.length?.toFixed(2)} km`)
    })
    
    return trails
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de sentiers:', error)
    throw error
  }
}

/**
 * Exemple : Calcul d'un itinéraire entre deux points
 */
export async function calculateRouteBetweenPoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  profile: 'foot' | 'bike' = 'foot'
) {
  try {
    console.log(`🗺️  Calcul d'itinéraire de ${startLat}, ${startLon} vers ${endLat}, ${endLon}`)
    
    const start: [number, number] = [startLon, startLat]
    const end: [number, number] = [endLon, endLat]
    
    // Calculer l'itinéraire
    const route = await routingService.calculateRoute(start, end, {
      profile,
      steps: true,
      overview: 'full'
    })
    
    console.log(`✅ Itinéraire calculé:`)
    console.log(`   - Distance: ${routingUtils.formatDistance(route.summary.totalDistance)}`)
    console.log(`   - Durée: ${routingUtils.formatDuration(route.summary.totalDuration)}`)
    console.log(`   - Vitesse moyenne: ${route.summary.averageSpeed.toFixed(1)} km/h`)
    console.log(`   - Difficulté: ${route.summary.difficulty}`)
    
    // Afficher les étapes
    route.legs.forEach((leg, index) => {
      console.log(`   Étape ${index + 1}: ${leg.instruction}`)
      console.log(`      - Distance: ${routingUtils.formatDistance(leg.distance)}`)
      console.log(`      - Durée: ${routingUtils.formatDuration(leg.duration)}`)
    })
    
    return route
  } catch (error) {
    console.error('❌ Erreur lors du calcul d\'itinéraire:', error)
    throw error
  }
}

/**
 * Exemple : Recherche de points d'intérêt pour la randonnée
 */
export async function findPointsOfInterest(
  latitude: number,
  longitude: number,
  radiusKm: number = 1
) {
  try {
    console.log(`📍 Recherche de points d'intérêt près de ${latitude}, ${longitude}`)
    
    const searchArea = osmUtils.createSearchArea(latitude, longitude, radiusKm)
    
    // Récupérer les points d'intérêt
    const pois = await osmService.getPointsOfInterest(searchArea)
    
    console.log(`✅ Trouvé ${pois.length} points d'intérêt`)
    
    // Grouper par type
    const poisByType = pois.reduce((acc, poi) => {
      const type = poi.properties.tourism || poi.properties.amenity || poi.properties.natural || 'autre'
      if (!acc[type]) acc[type] = []
      acc[type].push(poi)
      return acc
    }, {} as Record<string, typeof pois>)
    
    Object.entries(poisByType).forEach(([type, items]) => {
      console.log(`   ${type}: ${items.length} éléments`)
      items.forEach(item => {
        console.log(`      - ${item.properties.name || 'Sans nom'}`)
      })
    })
    
    return pois
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de POI:', error)
    throw error
  }
}

/**
 * Exemple : Calcul d'une matrice de distances
 */
export async function calculateDistanceMatrix(
  points: Array<{ lat: number; lon: number; name: string }>
) {
  try {
    console.log(`📊 Calcul de la matrice de distances pour ${points.length} points`)
    
    const coordinates: [number, number][] = points.map(p => [p.lon, p.lat])
    
    const matrix = await routingService.calculateDistanceMatrix(coordinates)
    
    console.log(`✅ Matrice calculée:`)
    console.log(`   - Durées: ${matrix.durations.length}x${matrix.durations[0]?.length || 0}`)
    console.log(`   - Distances: ${matrix.distances.length}x${matrix.distances[0]?.length || 0}`)
    
    // Afficher quelques exemples de distances
    for (let i = 0; i < Math.min(3, points.length); i++) {
      for (let j = 0; j < Math.min(3, points.length); j++) {
        if (i !== j && matrix.durations[i]?.[j]) {
          const duration = matrix.durations[i][j] / 60 // Convertir en minutes
          const distance = matrix.distances[i]?.[j] / 1000 // Convertir en km
          console.log(`   ${points[i].name} → ${points[j].name}: ${routingUtils.formatDistance(distance)}, ${routingUtils.formatDuration(duration)}`)
        }
      }
    }
    
    return matrix
  } catch (error) {
    console.error('❌ Erreur lors du calcul de la matrice:', error)
    throw error
  }
}

/**
 * Exemple : Création d'un itinéraire de randonnée complet
 */
export async function createCompleteHikingRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  options: {
    includePOIs?: boolean
    maxDistance?: number
    difficulty?: 'easy' | 'medium' | 'hard'
  } = {}
) {
  try {
    console.log(`🥾 Création d'un itinéraire de randonnée complet`)
    
    // 1. Calculer l'itinéraire principal
    const mainRoute = await calculateRouteBetweenPoints(
      startLat, startLon, endLat, endLon, 'foot'
    )
    
    // 2. Vérifier la distance maximale si spécifiée
    if (options.maxDistance && mainRoute.summary.totalDistance > options.maxDistance) {
      throw new Error(`Distance trop longue: ${mainRoute.summary.totalDistance}km > ${options.maxDistance}km`)
    }
    
    // 3. Rechercher des points d'intérêt le long du parcours
    let pois: any[] = []
    if (options.includePOIs) {
      const centerLat = (startLat + endLat) / 2
      const centerLon = (startLon + endLon) / 2
      const radius = mainRoute.summary.totalDistance / 2 // Rayon basé sur la distance
      
      pois = await findPointsOfInterest(centerLat, centerLon, radius)
    }
    
    // 4. Rechercher des sentiers alternatifs
    const alternativeTrails = await findTrailsNearLocation(
      (startLat + endLat) / 2,
      (startLon + endLon) / 2,
      mainRoute.summary.totalDistance / 2
    )
    
    const completeRoute = {
      mainRoute,
      pointsOfInterest: pois,
      alternativeTrails: alternativeTrails.features,
      summary: {
        totalDistance: mainRoute.summary.totalDistance,
        totalDuration: mainRoute.summary.totalDuration,
        difficulty: mainRoute.summary.difficulty,
        pointsOfInterestCount: pois.length,
        alternativeTrailsCount: alternativeTrails.features.length
      }
    }
    
    console.log(`✅ Itinéraire complet créé:`)
    console.log(`   - Distance totale: ${routingUtils.formatDistance(completeRoute.summary.totalDistance)}`)
    console.log(`   - Durée totale: ${routingUtils.formatDuration(completeRoute.summary.totalDuration)}`)
    console.log(`   - Points d'intérêt: ${completeRoute.summary.pointsOfInterestCount}`)
    console.log(`   - Sentiers alternatifs: ${completeRoute.summary.alternativeTrailsCount}`)
    
    return completeRoute
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'itinéraire complet:', error)
    throw error
  }
}

/**
 * Exemple : Démonstration complète des services
 */
export async function demonstrateMappingServices() {
  try {
    console.log('🌍 Démonstration des services de cartographie')
    console.log('===============================================')
    
    // Initialiser les services
    const services = initializeMappingServices()
    
    // Vérifier la santé des services
    const health = await checkServicesHealth()
    console.log('📊 État des services:', health)
    
    if (!health.osm || !health.routing) {
      throw new Error('Services non disponibles')
    }
    
    // Coordonnées de test (Paris)
    const paris = { lat: 48.8566, lon: 2.3522 }
    const eiffelTower = { lat: 48.8584, lon: 2.2945 }
    
    // 1. Recherche de sentiers
    console.log('\n1. Recherche de sentiers près de Paris')
    await findTrailsNearLocation(paris.lat, paris.lon, 1)
    
    // 2. Calcul d'itinéraire
    console.log('\n2. Calcul d\'itinéraire Paris → Tour Eiffel')
    await calculateRouteBetweenPoints(paris.lat, paris.lon, eiffelTower.lat, eiffelTower.lon)
    
    // 3. Points d'intérêt
    console.log('\n3. Recherche de points d\'intérêt')
    await findPointsOfInterest(paris.lat, paris.lon, 0.5)
    
    // 4. Matrice de distances
    console.log('\n4. Calcul de matrice de distances')
    const testPoints = [
      { lat: 48.8566, lon: 2.3522, name: 'Paris Centre' },
      { lat: 48.8584, lon: 2.2945, name: 'Tour Eiffel' },
      { lat: 48.8606, lon: 2.3376, name: 'Place de la Bastille' }
    ]
    await calculateDistanceMatrix(testPoints)
    
    // 5. Itinéraire complet
    console.log('\n5. Création d\'itinéraire de randonnée complet')
    await createCompleteHikingRoute(
      paris.lat, paris.lon, 
      eiffelTower.lat, eiffelTower.lon,
      { includePOIs: true, maxDistance: 10 }
    )
    
    console.log('\n🎉 Démonstration terminée avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur lors de la démonstration:', error)
    throw error
  }
}

// Les fonctions sont déjà exportées individuellement ci-dessus
