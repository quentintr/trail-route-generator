// Service pour récupérer les altitudes depuis une API d'élévation
// Utilise Open Elevation API (gratuite et sans clé API)

import axios from 'axios'

interface ElevationPoint {
  latitude: number
  longitude: number
}

interface ElevationResponse {
  latitude: number
  longitude: number
  elevation: number
}

const OPEN_ELEVATION_API = 'https://api.open-elevation.com/api/v1/lookup'

/**
 * Récupère l'altitude pour un ensemble de coordonnées
 * @param coordinates Array de [longitude, latitude]
 * @returns Array d'altitudes en mètres
 */
export async function getElevations(
  coordinates: [number, number][]
): Promise<number[]> {
  if (coordinates.length === 0) {
    return []
  }

  try {
    // Limiter à 100 points par requête pour éviter les timeouts
    const batchSize = 100
    const allElevations: number[] = []

    for (let i = 0; i < coordinates.length; i += batchSize) {
      const batch = coordinates.slice(i, i + batchSize)
      
      try {
        const locations = batch.map(([lon, lat]) => ({
          latitude: lat,
          longitude: lon
        }))

        const response = await axios.post(OPEN_ELEVATION_API, {
          locations: locations
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 secondes de timeout
        })

        const data = response.data
        
        if (data.results && Array.isArray(data.results)) {
          const elevations = data.results.map((result: ElevationResponse) => {
            // L'API peut retourner null ou -32768 pour les données manquantes
            if (result.elevation === null || result.elevation === undefined || result.elevation < -1000) {
              console.warn(`[Elevation API] Valeur invalide pour (${result.latitude}, ${result.longitude}): ${result.elevation}, utilisation de 150m par défaut`);
              return 150 // Valeur par défaut pour zone urbaine
            }
            return result.elevation
          })
          
          // Log des premières valeurs pour debug
          if (batch.length <= 5) {
            console.log(`[Elevation API] Batch résultats:`, elevations.map((e, i) => 
              `(${batch[i][1].toFixed(4)}, ${batch[i][0].toFixed(4)}) => ${e.toFixed(1)}m`
            ).join(', '));
          }
          
          allElevations.push(...elevations)
        } else {
          console.warn('[Elevation API] Format de réponse inattendu, utilisation de valeurs par défaut')
          allElevations.push(...batch.map(() => 150))
        }
      } catch (batchError) {
        console.warn(`[Elevation API] Erreur pour le batch ${i}-${i + batchSize}, utilisation de valeurs par défaut:`, batchError instanceof Error ? batchError.message : String(batchError))
        // En cas d'erreur, retourner des altitudes par défaut (150m)
        allElevations.push(...batch.map(() => 150))
      }

      // Petite pause entre les requêtes pour éviter de surcharger l'API
      if (i + batchSize < coordinates.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return allElevations
  } catch (error) {
    console.error('[Elevation API] Erreur lors de la récupération des altitudes:', error)
    if (error instanceof Error) {
      console.error('[Elevation API] Message:', error.message)
      console.error('[Elevation API] Stack:', error.stack)
    }
    // En cas d'erreur, retourner des altitudes par défaut
    return coordinates.map(() => 150)
  }
}

/**
 * Calcule le dénivelé cumulé positif à partir d'une série d'altitudes
 * @param elevations Array d'altitudes en mètres
 * @returns Dénivelé cumulé positif en mètres
 */
export function calculateElevationGain(elevations: number[]): number {
  if (elevations.length < 2) {
    return 0
  }

  let cumulativeGain = 0

  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1]
    if (diff > 0) {
      cumulativeGain += diff
    }
  }

  return Math.round(cumulativeGain)
}

/**
 * Calcule le dénivelé cumulé négatif (descente)
 * @param elevations Array d'altitudes en mètres
 * @returns Dénivelé cumulé négatif en mètres
 */
export function calculateElevationLoss(elevations: number[]): number {
  if (elevations.length < 2) {
    return 0
  }

  let cumulativeLoss = 0

  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1]
    if (diff < 0) {
      cumulativeLoss += Math.abs(diff)
    }
  }

  return Math.round(cumulativeLoss)
}

/**
 * Trouve l'altitude minimale et maximale
 */
export function getElevationRange(elevations: number[]): { min: number; max: number } {
  if (elevations.length === 0) {
    return { min: 0, max: 0 }
  }

  return {
    min: Math.min(...elevations),
    max: Math.max(...elevations)
  }
}

