/**
 * Tests for geographic utility functions
 */

import { describe, it, expect } from '@jest/globals'
import {
  haversineDistance,
  calculateBearing,
  pointToLineDistance,
  calculateMidpoint,
  calculateBoundingBox,
  calculateSearchRadius,
  isPointInBounds,
  calculateAngularDiversity,
  calculatePolygonCenter,
  calculatePathDistance,
  calculateElevationGain,
  toRadians,
  toDegrees,
  calculatePolygonArea,
  doLineSegmentsIntersect,
  calculateDistanceAccuracy,
  calculatePathUniqueness,
  calculateSurfaceQuality,
  calculateSceneryVariety
} from '../utils/geo-utils'

describe('Geo Utils', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Paris to London
      const distance = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278)
      expect(distance).toBeCloseTo(343556, -2) // ~343.6km (valeur réelle)
    })

    it('should return 0 for identical points', () => {
      const distance = haversineDistance(48.8566, 2.3522, 48.8566, 2.3522)
      expect(distance).toBe(0)
    })

    it('should handle edge cases', () => {
      // North pole to south pole
      const distance = haversineDistance(90, 0, -90, 0)
      expect(distance).toBeCloseTo(20000000, -6) // ~20,000km
    })
  })

  describe('calculateBearing', () => {
    it('should calculate bearing correctly', () => {
      // North bearing
      const bearing = calculateBearing(0, 0, 1, 0)
      expect(bearing).toBeCloseTo(0, 1)
      
      // East bearing
      const bearingEast = calculateBearing(0, 0, 0, 1)
      expect(bearingEast).toBeCloseTo(90, 1)
    })

    it('should handle negative bearings', () => {
      const bearing = calculateBearing(0, 0, -1, 0)
      expect(bearing).toBeCloseTo(180, 1)
    })
  })

  describe('pointToLineDistance', () => {
    it('should calculate distance from point to line', () => {
      // Point (1,0) to line from (0,0) to (0,2)
      const distance = pointToLineDistance(1, 0, 0, 0, 0, 2)
      expect(distance).toBeCloseTo(111000, -3) // ~111km (1 degree)
    })

    it('should return 0 for point on line', () => {
      const distance = pointToLineDistance(0, 0, 0, 0, 0, 1)
      expect(distance).toBeCloseTo(0, 1)
    })
  })

  describe('calculateMidpoint', () => {
    it('should calculate midpoint correctly', () => {
      const midpoint = calculateMidpoint(0, 0, 2, 2)
      expect(midpoint).toEqual([1, 1])
    })

    it('should handle negative coordinates', () => {
      const midpoint = calculateMidpoint(-1, -1, 1, 1)
      expect(midpoint).toEqual([0, 0])
    })
  })

  describe('calculateBoundingBox', () => {
    it('should calculate bounding box correctly', () => {
      const points: Array<[number, number]> = [
        [0, 0],
        [1, 1],
        [-1, -1]
      ]
      const bbox = calculateBoundingBox(points)
      expect(bbox).toEqual({
        north: 1,
        south: -1,
        east: 1,
        west: -1
      })
    })

    it('should throw error for empty array', () => {
      expect(() => calculateBoundingBox([])).toThrow('Cannot calculate bounding box for empty point array')
    })
  })

  describe('calculateSearchRadius', () => {
    it('should calculate search radius correctly', () => {
      const radius = calculateSearchRadius(10000) // 10km
      expect(radius).toBeCloseTo(8463, 0) // sqrt(10000²/π) * 1.5
    })

    it('should handle small distances', () => {
      const radius = calculateSearchRadius(1000) // 1km
      expect(radius).toBeCloseTo(846, 0)
    })
  })

  describe('isPointInBounds', () => {
    it('should return true for point inside bounds', () => {
      const bbox = { north: 1, south: -1, east: 1, west: -1 }
      expect(isPointInBounds(0, 0, bbox)).toBe(true)
    })

    it('should return false for point outside bounds', () => {
      const bbox = { north: 1, south: -1, east: 1, west: -1 }
      expect(isPointInBounds(2, 2, bbox)).toBe(false)
    })
  })

  describe('calculateAngularDiversity', () => {
    it('should calculate angular diversity correctly', () => {
      const diversity = calculateAngularDiversity(0, 90)
      expect(diversity).toBe(90)
    })

    it('should handle wrap-around angles', () => {
      const diversity = calculateAngularDiversity(350, 10)
      expect(diversity).toBe(20)
    })
  })

  describe('calculatePolygonCenter', () => {
    it('should calculate polygon center correctly', () => {
      const points: Array<[number, number]> = [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2]
      ]
      const center = calculatePolygonCenter(points)
      expect(center).toEqual([1, 1])
    })

    it('should throw error for empty polygon', () => {
      expect(() => calculatePolygonCenter([])).toThrow('Cannot calculate center for empty polygon')
    })
  })

  describe('calculatePathDistance', () => {
    it('should calculate path distance correctly', () => {
      const points: Array<[number, number]> = [
        [0, 0],
        [1, 0],
        [1, 1]
      ]
      const distance = calculatePathDistance(points)
      expect(distance).toBeCloseTo(222000, -3) // ~222km (2 degrees)
    })

    it('should return 0 for single point', () => {
      const distance = calculatePathDistance([[0, 0]])
      expect(distance).toBe(0)
    })
  })

  describe('calculateElevationGain', () => {
    it('should calculate elevation gain correctly', () => {
      const points: Array<[number, number, number]> = [
        [0, 0, 100],
        [1, 0, 200],
        [1, 1, 150]
      ]
      const gain = calculateElevationGain(points)
      expect(gain).toBe(100) // Only the first climb counts
    })

    it('should return 0 for no elevation gain', () => {
      const points: Array<[number, number, number]> = [
        [0, 0, 100],
        [1, 0, 50]
      ]
      const gain = calculateElevationGain(points)
      expect(gain).toBe(0)
    })
  })

  describe('toRadians and toDegrees', () => {
    it('should convert degrees to radians correctly', () => {
      expect(toRadians(180)).toBeCloseTo(Math.PI, 5)
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 5)
    })

    it('should convert radians to degrees correctly', () => {
      expect(toDegrees(Math.PI)).toBeCloseTo(180, 5)
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 5)
    })
  })

  describe('calculatePolygonArea', () => {
    it('should calculate polygon area correctly', () => {
      const points: Array<[number, number]> = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      ]
      const area = calculatePolygonArea(points)
      expect(area).toBe(1)
    })

    it('should return 0 for insufficient points', () => {
      const area = calculatePolygonArea([[0, 0], [1, 0]])
      expect(area).toBe(0)
    })
  })

  describe('doLineSegmentsIntersect', () => {
    it('should detect intersecting segments', () => {
      const line1: [[number, number], [number, number]] = [[0, 0], [2, 2]]
      const line2: [[number, number], [number, number]] = [[0, 2], [2, 0]]
      expect(doLineSegmentsIntersect(line1, line2)).toBe(true)
    })

    it('should detect non-intersecting segments', () => {
      const line1: [[number, number], [number, number]] = [[0, 0], [1, 1]]
      const line2: [[number, number], [number, number]] = [[2, 2], [3, 3]]
      expect(doLineSegmentsIntersect(line1, line2)).toBe(false)
    })
  })

  describe('calculateDistanceAccuracy', () => {
    it('should return 1 for perfect match', () => {
      const accuracy = calculateDistanceAccuracy(1000, 1000)
      expect(accuracy).toBe(1)
    })

    it('should return 0.5 for 50% error', () => {
      const accuracy = calculateDistanceAccuracy(1500, 1000)
      expect(accuracy).toBe(0.5)
    })

    it('should return 0 for 100% error', () => {
      const accuracy = calculateDistanceAccuracy(2000, 1000)
      expect(accuracy).toBe(0)
    })
  })

  describe('calculatePathUniqueness', () => {
    it('should return 1 for all unique edges', () => {
      const usedEdges = new Set(['edge1', 'edge2', 'edge3'])
      const uniqueness = calculatePathUniqueness(usedEdges, 3)
      expect(uniqueness).toBe(1)
    })

    it('should return 0.5 for half unique edges', () => {
      const usedEdges = new Set(['edge1', 'edge2'])
      const uniqueness = calculatePathUniqueness(usedEdges, 4)
      expect(uniqueness).toBe(0.5)
    })
  })

  describe('calculateSurfaceQuality', () => {
    it('should return 1 for all paved surfaces', () => {
      const surfaceTypes = { paved: 100 }
      const quality = calculateSurfaceQuality(surfaceTypes)
      expect(quality).toBe(1)
    })

    it('should return 0 for all unpaved surfaces', () => {
      const surfaceTypes = { unpaved: 100 }
      const quality = calculateSurfaceQuality(surfaceTypes)
      expect(quality).toBe(0)
    })

    it('should return 0.5 for mixed surfaces', () => {
      const surfaceTypes = { paved: 50, unpaved: 50 }
      const quality = calculateSurfaceQuality(surfaceTypes)
      expect(quality).toBe(0.5)
    })
  })

  describe('calculateSceneryVariety', () => {
    it('should return 0 for straight line', () => {
      const pathPoints: Array<[number, number]> = [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0]
      ]
      const variety = calculateSceneryVariety(pathPoints)
      expect(variety).toBe(0)
    })

    it('should return higher value for curvy path', () => {
      const pathPoints: Array<[number, number]> = [
        [0, 0],
        [1, 1],
        [2, 0],
        [3, 1]
      ]
      const variety = calculateSceneryVariety(pathPoints)
      expect(variety).toBeGreaterThan(0)
    })
  })
})
