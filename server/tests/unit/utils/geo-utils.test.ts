import { describe, it, expect } from '@jest/globals'

// Fonction haversine pour calculer la distance (copie de loop-generator.ts)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Rayon de la Terre en mètres
  const toRad = (x: number) => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Fonction calculateBearing (copie de loop-generator.ts)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI
  bearing = (bearing + 360) % 360 // Normaliser à 0-360
  
  return bearing
}

describe('Geo Utils', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Distance entre Toulouse et Paris (environ 590 km)
      const toulouse = { lat: 43.6047, lon: 1.4442 }
      const paris = { lat: 48.8566, lon: 2.3522 }

      const distance = haversineDistance(toulouse.lat, toulouse.lon, paris.lat, paris.lon)

      // Tolérance de 10 km pour les variations
      expect(distance).toBeGreaterThan(580000)
      expect(distance).toBeLessThan(600000)
    })

    it('should return 0 for same point', () => {
      const distance = haversineDistance(43.6047, 1.4442, 43.6047, 1.4442)

      expect(distance).toBe(0)
    })

    it('should calculate short distances correctly', () => {
      // Distance d'environ 1 km
      const point1 = { lat: 43.6047, lon: 1.4442 }
      const point2 = { lat: 43.6137, lon: 1.4442 } // ~1 km au nord

      const distance = haversineDistance(point1.lat, point1.lon, point2.lat, point2.lon)

      expect(distance).toBeGreaterThan(900)
      expect(distance).toBeLessThan(1100)
    })

    it('should handle negative coordinates', () => {
      // New York
      const ny = { lat: 40.7128, lon: -74.0060 }
      // Los Angeles
      const la = { lat: 34.0522, lon: -118.2437 }

      const distance = haversineDistance(ny.lat, ny.lon, la.lat, la.lon)

      // Distance approximative NY-LA: ~4000 km
      expect(distance).toBeGreaterThan(3900000)
      expect(distance).toBeLessThan(4100000)
    })
  })

  describe('calculateBearing', () => {
    it('should calculate bearing to north (0°)', () => {
      const point1 = { lat: 43.6047, lon: 1.4442 }
      const point2 = { lat: 43.6147, lon: 1.4442 } // Nord

      const bearing = calculateBearing(point1.lat, point1.lon, point2.lat, point2.lon)

      expect(bearing).toBeCloseTo(0, 1) // 0° ± 1°
    })

    it('should calculate bearing to east (90°)', () => {
      const point1 = { lat: 43.6047, lon: 1.4442 }
      const point2 = { lat: 43.6047, lon: 1.4542 } // Est

      const bearing = calculateBearing(point1.lat, point1.lon, point2.lat, point2.lon)

      expect(bearing).toBeCloseTo(90, 1) // 90° ± 1°
    })

    it('should calculate bearing to south (180°)', () => {
      const point1 = { lat: 43.6047, lon: 1.4442 }
      const point2 = { lat: 43.5947, lon: 1.4442 } // Sud

      const bearing = calculateBearing(point1.lat, point1.lon, point2.lat, point2.lon)

      expect(bearing).toBeCloseTo(180, 1) // 180° ± 1°
    })

    it('should calculate bearing to west (270°)', () => {
      const point1 = { lat: 43.6047, lon: 1.4442 }
      const point2 = { lat: 43.6047, lon: 1.4342 } // Ouest

      const bearing = calculateBearing(point1.lat, point1.lon, point2.lat, point2.lon)

      expect(bearing).toBeCloseTo(270, 1) // 270° ± 1°
    })

    it('should return bearing in range 0-360', () => {
      const point1 = { lat: 43.6047, lon: 1.4442 }
      const point2 = { lat: 43.6147, lon: 1.4542 }

      const bearing = calculateBearing(point1.lat, point1.lon, point2.lat, point2.lon)

      expect(bearing).toBeGreaterThanOrEqual(0)
      expect(bearing).toBeLessThan(360)
    })
  })
})

