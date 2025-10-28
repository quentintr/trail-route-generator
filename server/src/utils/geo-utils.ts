/**
 * Utilitaires géographiques pour les calculs de distance et de navigation
 * 
 * Ce module fournit des fonctions utilitaires pour :
 * - Calcul de distances (Haversine)
 * - Calcul de bearings (cap)
 * - Distance point-ligne
 * - Autres calculs géographiques
 */

/**
 * Calcule la distance entre deux points en utilisant la formule de Haversine
 * 
 * @param lat1 Latitude du premier point
 * @param lon1 Longitude du premier point
 * @param lat2 Latitude du deuxième point
 * @param lon2 Longitude du deuxième point
 * @returns Distance en kilomètres
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calcule le bearing (cap) entre deux points
 * 
 * @param lat1 Latitude du point de départ
 * @param lon1 Longitude du point de départ
 * @param lat2 Latitude du point d'arrivée
 * @param lon2 Longitude du point d'arrivée
 * @returns Bearing en degrés (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1)
  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  
  let bearing = Math.atan2(y, x)
  bearing = toDegrees(bearing)
  bearing = (bearing + 360) % 360
  
  return bearing
}

/**
 * Calcule la distance d'un point à une ligne (segment)
 * 
 * @param pointLat Latitude du point
 * @param pointLon Longitude du point
 * @param lineStartLat Latitude du début de la ligne
 * @param lineStartLon Longitude du début de la ligne
 * @param lineEndLat Latitude de la fin de la ligne
 * @param lineEndLon Longitude de la fin de la ligne
 * @returns Distance en kilomètres
 */
export function pointToLineDistance(
  pointLat: number,
  pointLon: number,
  lineStartLat: number,
  lineStartLon: number,
  lineEndLat: number,
  lineEndLon: number
): number {
  // Convertir en coordonnées cartésiennes pour le calcul
  const point = { lat: pointLat, lon: pointLon }
  const lineStart = { lat: lineStartLat, lon: lineStartLon }
  const lineEnd = { lat: lineEndLat, lon: lineEndLon }
  
  // Calculer la distance du point au segment
  const A = point.lat - lineStart.lat
  const B = point.lon - lineStart.lon
  const C = lineEnd.lat - lineStart.lat
  const D = lineEnd.lon - lineStart.lon
  
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  
  if (lenSq === 0) {
    // Le segment est un point
    return haversineDistance(pointLat, pointLon, lineStartLat, lineStartLon)
  }
  
  const param = dot / lenSq
  
  let closestLat: number
  let closestLon: number
  
  if (param < 0) {
    closestLat = lineStart.lat
    closestLon = lineStart.lon
  } else if (param > 1) {
    closestLat = lineEnd.lat
    closestLon = lineEnd.lon
  } else {
    closestLat = lineStart.lat + param * C
    closestLon = lineStart.lon + param * D
  }
  
  return haversineDistance(pointLat, pointLon, closestLat, closestLon)
}

/**
 * Calcule le centre géographique d'un ensemble de points
 * 
 * @param points Tableau de points {lat, lon}
 * @returns Centre géographique
 */
export function calculateCentroid(points: Array<{ lat: number; lon: number }>): {
  lat: number
  lon: number
} {
  if (points.length === 0) {
    throw new Error('Cannot calculate centroid of empty point array')
  }
  
  let sumLat = 0
  let sumLon = 0
  
  for (const point of points) {
    sumLat += point.lat
    sumLon += point.lon
  }
  
  return {
    lat: sumLat / points.length,
    lon: sumLon / points.length
  }
}

/**
 * Calcule la bounding box d'un ensemble de points
 * 
 * @param points Tableau de points {lat, lon}
 * @returns Bounding box {north, south, east, west}
 */
export function calculateBoundingBox(points: Array<{ lat: number; lon: number }>): {
  north: number
  south: number
  east: number
  west: number
} {
  if (points.length === 0) {
    throw new Error('Cannot calculate bounding box of empty point array')
  }
  
  let north = points[0].lat
  let south = points[0].lat
  let east = points[0].lon
  let west = points[0].lon
  
  for (const point of points) {
    north = Math.max(north, point.lat)
    south = Math.min(south, point.lat)
    east = Math.max(east, point.lon)
    west = Math.min(west, point.lon)
  }
  
  return { north, south, east, west }
}

/**
 * Calcule la longueur totale d'un chemin (array de points)
 * 
 * @param points Tableau de points {lat, lon}
 * @returns Longueur totale en kilomètres
 */
export function calculatePathLength(points: Array<{ lat: number; lon: number }>): number {
  if (points.length < 2) {
    return 0
  }
  
  let totalLength = 0
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    totalLength += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon)
  }
  
  return totalLength
}

/**
 * Trouve le point le plus proche d'un point donné dans un ensemble de points
 * 
 * @param targetPoint Point de référence
 * @param candidatePoints Points candidats
 * @returns Point le plus proche et sa distance
 */
export function findNearestPoint(
  targetPoint: { lat: number; lon: number },
  candidatePoints: Array<{ lat: number; lon: number }>
): { point: { lat: number; lon: number }; distance: number } | null {
  if (candidatePoints.length === 0) {
    return null
  }
  
  let nearestPoint = candidatePoints[0]
  let minDistance = haversineDistance(
    targetPoint.lat,
    targetPoint.lon,
    nearestPoint.lat,
    nearestPoint.lon
  )
  
  for (let i = 1; i < candidatePoints.length; i++) {
    const distance = haversineDistance(
      targetPoint.lat,
      targetPoint.lon,
      candidatePoints[i].lat,
      candidatePoints[i].lon
    )
    
    if (distance < minDistance) {
      minDistance = distance
      nearestPoint = candidatePoints[i]
    }
  }
  
  return { point: nearestPoint, distance: minDistance }
}

/**
 * Calcule l'angle entre deux bearings
 * 
 * @param bearing1 Premier bearing (0-360)
 * @param bearing2 Deuxième bearing (0-360)
 * @returns Angle en degrés (0-180)
 */
export function calculateAngleBetweenBearings(bearing1: number, bearing2: number): number {
  const diff = Math.abs(bearing1 - bearing2)
  return Math.min(diff, 360 - diff)
}

/**
 * Détermine si un point est à l'intérieur d'un polygone
 * 
 * @param point Point à tester
 * @param polygon Vertices du polygone
 * @returns true si le point est à l'intérieur
 */
export function isPointInPolygon(
  point: { lat: number; lon: number },
  polygon: Array<{ lat: number; lon: number }>
): boolean {
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]
    const pj = polygon[j]
    
    if (((pi.lat > point.lat) !== (pj.lat > point.lat)) &&
        (point.lon < (pj.lon - pi.lon) * (point.lat - pi.lat) / (pj.lat - pi.lat) + pi.lon)) {
      inside = !inside
    }
  }
  
  return inside
}

/**
 * Calcule le rayon de recherche optimal pour une distance cible
 * 
 * @param targetDistance Distance cible en km
 * @returns Rayon de recherche en km
 */
export function calculateSearchRadius(targetDistance: number): number {
  // Formule: sqrt(target_distance² / π) × 1.5 (pour avoir une marge)
  return Math.sqrt(targetDistance * targetDistance / Math.PI) * 1.5
}

/**
 * Convertit les degrés en radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Convertit les radians en degrés
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Valide des coordonnées géographiques
 * 
 * @param lat Latitude
 * @param lon Longitude
 * @returns true si les coordonnées sont valides
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

/**
 * Calcule la distance approximative en mètres pour 1 degré de latitude
 * 
 * @param latitude Latitude de référence
 * @returns Distance en mètres
 */
export function getLatitudeDegreeInMeters(_latitude: number): number {
  // Approximation: 1 degré de latitude ≈ 111 km
  return 111000
}

/**
 * Calcule la distance approximative en mètres pour 1 degré de longitude
 * 
 * @param latitude Latitude de référence
 * @returns Distance en mètres
 */
export function getLongitudeDegreeInMeters(latitude: number): number {
  // Approximation: 1 degré de longitude ≈ 111 km × cos(latitude)
  return 111000 * Math.cos(toRadians(latitude))
}