/**
 * Démonstration des fonctionnalités PostGIS pour Trail Route Generator
 * 
 * Ce script montre comment utiliser les fonctions géographiques
 * pour créer et interroger des données de randonnée.
 */

import { connectDatabase, getDatabase, geographicUtils } from '../db.js'

interface DemoRoute {
  name: string
  coordinates: [number, number][]
  distance: number
  elevation: number
}

interface DemoSegment {
  osm_id: string
  name: string
  coordinates: [number, number][]
  surface_type: string
  difficulty: string
}

const demoRoutes: DemoRoute[] = [
  {
    name: 'Sentier des Crêtes - Vercors',
    coordinates: [
      [5.7245, 45.1885], // Départ
      [5.7300, 45.1950], // Point intermédiaire
      [5.7350, 45.2000]  // Arrivée
    ],
    distance: 12.5,
    elevation: 850
  },
  {
    name: 'Tour du Mont Blanc - Segment',
    coordinates: [
      [6.8647, 45.8326], // Chamonix
      [6.9000, 45.8500], // Point intermédiaire
      [6.9500, 45.8700]  // Point suivant
    ],
    distance: 8.2,
    elevation: 1200
  }
]

const demoSegments: DemoSegment[] = [
  {
    osm_id: '12345',
    name: 'Sentier forestier populaire',
    coordinates: [
      [2.3522, 48.8566],
      [2.2945, 48.8584]
    ],
    surface_type: 'dirt',
    difficulty: 'medium'
  },
  {
    osm_id: '67890',
    name: 'Chemin pavé urbain',
    coordinates: [
      [2.3200, 48.8700],
      [2.3400, 48.8800]
    ],
    surface_type: 'paved',
    difficulty: 'easy'
  }
]

/**
 * Démonstration des calculs de distance
 */
async function demonstrateDistanceCalculations() {
  console.log('🗺️  Démonstration des calculs de distance')
  
  const paris = { lat: 48.8566, lng: 2.3522 }
  const eiffelTower = { lat: 48.8584, lng: 2.2945 }
  
  const distance = await geographicUtils.calculateDistance(
    paris.lat, paris.lng,
    eiffelTower.lat, eiffelTower.lng
  )
  
  console.log(`Distance Paris → Tour Eiffel: ${Math.round(distance)} mètres`)
  console.log(`Distance en km: ${(distance / 1000).toFixed(2)} km`)
}

/**
 * Démonstration de la création de routes
 */
async function demonstrateRouteCreation() {
  console.log('\n🛤️  Démonstration de la création de routes')
  
  const db = getDatabase()
  
  for (const route of demoRoutes) {
    try {
      const createdRoute = await db.route.create({
        data: {
          user_id: 'demo-user-id', // En production, utiliser un vrai user_id
          name: route.name,
          distance: route.distance,
          elevation_gain: route.elevation,
          duration: Math.round(route.distance * 12), // Estimation: 12 min/km
          terrain_type: 'mountain',
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates
          }
        }
      })
      
      console.log(`✅ Route créée: ${createdRoute.name} (${createdRoute.distance} km)`)
    } catch (error) {
      console.error(`❌ Erreur création route ${route.name}:`, error)
    }
  }
}

/**
 * Démonstration de la création de segments
 */
async function demonstrateSegmentCreation() {
  console.log('\n📍 Démonstration de la création de segments')
  
  const db = getDatabase()
  
  for (const segment of demoSegments) {
    try {
      const createdSegment = await db.segment.create({
        data: {
          osm_id: segment.osm_id,
          name: segment.name,
          surface_type: segment.surface_type,
          difficulty: segment.difficulty,
          popularity_score: Math.random() * 0.5 + 0.5, // Score entre 0.5 et 1.0
          geometry: {
            type: 'LineString',
            coordinates: segment.coordinates
          }
        }
      })
      
      console.log(`✅ Segment créé: ${createdSegment.name} (${createdSegment.surface_type})`)
    } catch (error) {
      console.error(`❌ Erreur création segment ${segment.name}:`, error)
    }
  }
}

/**
 * Démonstration des requêtes géographiques
 */
async function demonstrateGeographicQueries() {
  console.log('\n🔍 Démonstration des requêtes géographiques')
  
  const db = getDatabase()
  
  try {
    // Recherche de routes dans une zone (Paris et environs)
    const routesInParis = await geographicUtils.findRoutesInBounds(
      48.9, 48.8, 2.4, 2.2, 10
    )
    
    console.log(`📍 Routes trouvées dans la zone Paris: ${routesInParis.length}`)
    
    // Recherche de segments près d'un point
    const segmentsNearPoint = await geographicUtils.findSegmentsNearPoint(
      48.8566, 2.3522, 5000, 5
    )
    
    console.log(`📍 Segments trouvés près de Paris: ${segmentsNearPoint.length}`)
    
  } catch (error) {
    console.error('❌ Erreur requêtes géographiques:', error)
  }
}

/**
 * Démonstration des statistiques de routes
 */
async function demonstrateRouteStatistics() {
  console.log('\n📊 Démonstration des statistiques de routes')
  
  const db = getDatabase()
  
  try {
    // Récupérer toutes les routes
    const routes = await db.route.findMany({
      select: {
        id: true,
        name: true,
        distance: true,
        elevation_gain: true
      }
    })
    
    if (routes.length > 0) {
      const totalDistance = routes.reduce((sum, route) => sum + route.distance, 0)
      const totalElevation = routes.reduce((sum, route) => sum + route.elevation_gain, 0)
      const averageDistance = totalDistance / routes.length
      
      console.log(`📈 Statistiques des routes:`)
      console.log(`   - Nombre total: ${routes.length}`)
      console.log(`   - Distance totale: ${totalDistance.toFixed(2)} km`)
      console.log(`   - Dénivelé total: ${totalElevation.toFixed(0)} m`)
      console.log(`   - Distance moyenne: ${averageDistance.toFixed(2)} km`)
    } else {
      console.log('📈 Aucune route trouvée')
    }
    
  } catch (error) {
    console.error('❌ Erreur statistiques:', error)
  }
}

/**
 * Fonction principale de démonstration
 */
async function runGeographicDemo() {
  console.log('🌍 Démonstration des fonctionnalités PostGIS')
  console.log('===============================================')
  
  try {
    // Connecter à la base de données
    await connectDatabase()
    console.log('✅ Connexion à la base de données établie')
    
    // Exécuter les démonstrations
    await demonstrateDistanceCalculations()
    await demonstrateRouteCreation()
    await demonstrateSegmentCreation()
    await demonstrateGeographicQueries()
    await demonstrateRouteStatistics()
    
    console.log('\n🎉 Démonstration terminée avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur lors de la démonstration:', error)
  }
}

// Exécuter la démonstration si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runGeographicDemo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erreur fatale:', error)
      process.exit(1)
    })
}

export { runGeographicDemo }
