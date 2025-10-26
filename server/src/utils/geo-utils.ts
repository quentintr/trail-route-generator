/**
 * Geographic utility functions for loop generation
 * 
 * Provides efficient geographic calculations including:
 * - Distance calculations (Haversine formula)
 * - Bearing calculations between points
 * - Point-to-line distance calculations
 * - Coordinate transformations
 * - Bounding box operations
 */

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * Calculate the bearing from point 1 to point 2
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Bearing in degrees (0-360)
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
  const x = 
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  
  let bearing = Math.atan2(y, x)
  bearing = toDegrees(bearing)
  bearing = (bearing + 360) % 360
  
  return bearing
}

/**
 * Calculate the distance from a point to a line segment
 * @param pointLat Latitude of the point
 * @param pointLon Longitude of the point
 * @param lineLat1 Latitude of line start
 * @param lineLon1 Longitude of line start
 * @param lineLat2 Latitude of line end
 * @param lineLon2 Longitude of line end
 * @returns Distance in meters
 */
export function pointToLineDistance(
  pointLat: number,
  pointLon: number,
  lineLat1: number,
  lineLon1: number,
  lineLat2: number,
  lineLon2: number
): number {
  // Convert to Cartesian coordinates for easier calculation
  const A = haversineDistance(pointLat, pointLon, lineLat1, lineLon1)
  const B = haversineDistance(pointLat, pointLon, lineLat2, lineLon2)
  const C = haversineDistance(lineLat1, lineLon1, lineLat2, lineLon2)
  
  // If line segment has zero length
  if (C === 0) return A
  
  // Calculate using the formula for point-to-line distance
  const s = (A + B + C) / 2
  const area = Math.sqrt(Math.max(0, s * (s - A) * (s - B) * (s - C)))
  
  return (2 * area) / C
}

/**
 * Calculate the midpoint between two points
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Midpoint coordinates [lat, lon]
 */
export function calculateMidpoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): [number, number] {
  return [
    (lat1 + lat2) / 2,
    (lon1 + lon2) / 2
  ]
}

/**
 * Calculate the bounding box for a set of points
 * @param points Array of [lat, lon] coordinates
 * @returns Bounding box {north, south, east, west}
 */
export function calculateBoundingBox(
  points: Array<[number, number]>
): { north: number; south: number; east: number; west: number } {
  if (points.length === 0) {
    throw new Error('Cannot calculate bounding box for empty point array')
  }
  
  let north = points[0][0]
  let south = points[0][0]
  let east = points[0][1]
  let west = points[0][1]
  
  for (const [lat, lon] of points) {
    north = Math.max(north, lat)
    south = Math.min(south, lat)
    east = Math.max(east, lon)
    west = Math.min(west, lon)
  }
  
  return { north, south, east, west }
}

/**
 * Calculate the radius needed to cover a target distance
 * Uses the formula: radius = sqrt(target_distance² / π) × 1.5
 * @param targetDistance Target distance in meters
 * @returns Radius in meters
 */
export function calculateSearchRadius(targetDistance: number): number {
  return Math.sqrt(targetDistance * targetDistance / Math.PI) * 1.5
}

/**
 * Check if a point is within a bounding box
 * @param lat Latitude of the point
 * @param lon Longitude of the point
 * @param bbox Bounding box
 * @returns True if point is within bounds
 */
export function isPointInBounds(
  lat: number,
  lon: number,
  bbox: { north: number; south: number; east: number; west: number }
): boolean {
  return lat >= bbox.south && lat <= bbox.north && 
         lon >= bbox.west && lon <= bbox.east
}

/**
 * Calculate the angular diversity between two bearings
 * @param bearing1 First bearing in degrees
 * @param bearing2 Second bearing in degrees
 * @returns Angular difference in degrees (0-180)
 */
export function calculateAngularDiversity(bearing1: number, bearing2: number): number {
  const diff = Math.abs(bearing1 - bearing2)
  return Math.min(diff, 360 - diff)
}

/**
 * Calculate the center point of a polygon
 * @param points Array of [lat, lon] coordinates forming a polygon
 * @returns Center point [lat, lon]
 */
export function calculatePolygonCenter(
  points: Array<[number, number]>
): [number, number] {
  if (points.length === 0) {
    throw new Error('Cannot calculate center for empty polygon')
  }
  
  let totalLat = 0
  let totalLon = 0
  
  for (const [lat, lon] of points) {
    totalLat += lat
    totalLon += lon
  }
  
  return [totalLat / points.length, totalLon / points.length]
}

/**
 * Calculate the total distance of a path
 * @param points Array of [lat, lon] coordinates
 * @returns Total distance in meters
 */
export function calculatePathDistance(points: Array<[number, number]>): number {
  if (points.length < 2) return 0
  
  let totalDistance = 0
  for (let i = 0; i < points.length - 1; i++) {
    const [lat1, lon1] = points[i]
    const [lat2, lon2] = points[i + 1]
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2)
  }
  
  return totalDistance
}

/**
 * Calculate the elevation gain of a path
 * @param points Array of [lat, lon, elevation] coordinates
 * @returns Total elevation gain in meters
 */
export function calculateElevationGain(
  points: Array<[number, number, number]>
): number {
  if (points.length < 2) return 0
  
  let totalGain = 0
  for (let i = 0; i < points.length - 1; i++) {
    const elevationDiff = points[i + 1][2] - points[i][2]
    if (elevationDiff > 0) {
      totalGain += elevationDiff
    }
  }
  
  return totalGain
}

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 * @param radians Angle in radians
 * @returns Angle in degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Calculate the area of a polygon using the shoelace formula
 * @param points Array of [lat, lon] coordinates
 * @returns Area in square meters (approximate)
 */
export function calculatePolygonArea(points: Array<[number, number]>): number {
  if (points.length < 3) return 0
  
  let area = 0
  const n = points.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i][1] * points[j][0] - points[j][1] * points[i][0]
  }
  
  return Math.abs(area) / 2
}

/**
 * Check if two line segments intersect
 * @param line1 First line segment [[lat1, lon1], [lat2, lon2]]
 * @param line2 Second line segment [[lat3, lon3], [lat4, lon4]]
 * @returns True if segments intersect
 */
export function doLineSegmentsIntersect(
  line1: [[number, number], [number, number]],
  line2: [[number, number], [number, number]]
): boolean {
  const [[x1, y1], [x2, y2]] = line1
  const [[x3, y3], [x4, y4]] = line2
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-10) return false // Lines are parallel
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
  
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/**
 * Calculate the distance accuracy score (0-1)
 * @param actualDistance Actual distance in meters
 * @param targetDistance Target distance in meters
 * @returns Accuracy score (1.0 = perfect, 0.0 = very poor)
 */
export function calculateDistanceAccuracy(
  actualDistance: number,
  targetDistance: number
): number {
  const error = Math.abs(actualDistance - targetDistance) / targetDistance
  return Math.max(0, 1 - error)
}

/**
 * Calculate the path uniqueness score (0-1)
 * @param usedEdges Set of edge IDs already used
 * @param totalEdges Total number of edges in the path
 * @returns Uniqueness score
 */
export function calculatePathUniqueness(
  usedEdges: Set<string>,
  totalEdges: number
): number {
  if (totalEdges === 0) return 0
  return usedEdges.size / totalEdges
}

/**
 * Calculate the surface quality score (0-1)
 * @param surfaceTypes Record of surface types and their percentages
 * @returns Quality score (1.0 = all paved, 0.0 = all unpaved)
 */
export function calculateSurfaceQuality(
  surfaceTypes: Record<string, number>
): number {
  const pavedSurfaces = ['paved', 'asphalt', 'concrete', 'brick']
  const unpavedSurfaces = ['unpaved', 'dirt', 'grass', 'gravel', 'sand']
  
  let pavedPercentage = 0
  let unpavedPercentage = 0
  
  for (const [surface, percentage] of Object.entries(surfaceTypes)) {
    if (pavedSurfaces.includes(surface)) {
      pavedPercentage += percentage
    } else if (unpavedSurfaces.includes(surface)) {
      unpavedPercentage += percentage
    }
  }
  
  return pavedPercentage / (pavedPercentage + unpavedPercentage)
}

/**
 * Calculate the scenery variety score (0-1)
 * @param pathPoints Array of [lat, lon] coordinates
 * @returns Variety score based on path curvature and direction changes
 */
export function calculateSceneryVariety(
  pathPoints: Array<[number, number]>
): number {
  if (pathPoints.length < 3) return 0
  
  let directionChanges = 0
  let totalBearingChange = 0
  
  for (let i = 1; i < pathPoints.length - 1; i++) {
    const [lat1, lon1] = pathPoints[i - 1]
    const [lat2, lon2] = pathPoints[i]
    const [lat3, lon3] = pathPoints[i + 1]
    
    const bearing1 = calculateBearing(lat1, lon1, lat2, lon2)
    const bearing2 = calculateBearing(lat2, lon2, lat3, lon3)
    
    const bearingChange = calculateAngularDiversity(bearing1, bearing2)
    totalBearingChange += bearingChange
    
    if (bearingChange > 30) { // Significant direction change
      directionChanges++
    }
  }
  
  const averageBearingChange = totalBearingChange / (pathPoints.length - 2)
  const directionChangeRatio = directionChanges / (pathPoints.length - 2)
  
  return Math.min(1, (averageBearingChange / 180) * 0.5 + directionChangeRatio * 0.5)
}

