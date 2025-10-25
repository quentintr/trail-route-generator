/**
 * Tests pour la configuration OSM
 * 
 * Ces tests vérifient la configuration et les utilitaires
 * pour les services de cartographie OSM.
 */

import { describe, it, expect } from '@jest/globals'
import { 
  OVERPASS_CONFIG, 
  OSRM_CONFIG, 
  RUNNING_PATH_TAGS, 
  SURFACE_TYPES, 
  RATE_LIMITING,
  ERROR_MESSAGES,
  configUtils 
} from '../config/osm-config'

describe('Configuration OSM', () => {
  describe('OVERPASS_CONFIG', () => {
    it('devrait avoir une configuration valide', () => {
      expect(OVERPASS_CONFIG.endpoint).toBe('https://overpass-api.de/api/interpreter')
      expect(OVERPASS_CONFIG.timeout).toBe(30000)
      expect(OVERPASS_CONFIG.maxAreaSize).toBe(0.1)
      expect(OVERPASS_CONFIG.maxNodes).toBe(10000)
    })
  })

  describe('OSRM_CONFIG', () => {
    it('devrait avoir une configuration valide', () => {
      expect(OSRM_CONFIG.endpoint).toBe('https://router.project-osrm.org')
      expect(OSRM_CONFIG.timeout).toBe(15000)
      expect(OSRM_CONFIG.profile).toBe('foot')
      expect(OSRM_CONFIG.bikeProfile).toBe('bike')
    })
  })

  describe('RUNNING_PATH_TAGS', () => {
    it('devrait contenir les tags de chemins primaires', () => {
      expect(RUNNING_PATH_TAGS.primary).toContain('footway')
      expect(RUNNING_PATH_TAGS.primary).toContain('path')
      expect(RUNNING_PATH_TAGS.primary).toContain('track')
      expect(RUNNING_PATH_TAGS.primary).toContain('bridleway')
    })

    it('devrait contenir les tags de routes secondaires', () => {
      expect(RUNNING_PATH_TAGS.secondary).toContain('residential')
      expect(RUNNING_PATH_TAGS.secondary).toContain('unclassified')
      expect(RUNNING_PATH_TAGS.secondary).toContain('service')
    })

    it('devrait contenir les tags à exclure', () => {
      expect(RUNNING_PATH_TAGS.exclude).toContain('motorway')
      expect(RUNNING_PATH_TAGS.exclude).toContain('trunk')
      expect(RUNNING_PATH_TAGS.exclude).toContain('primary')
    })
  })

  describe('SURFACE_TYPES', () => {
    it('devrait contenir les types de surfaces naturelles', () => {
      expect(SURFACE_TYPES.natural).toContain('grass')
      expect(SURFACE_TYPES.natural).toContain('dirt')
      expect(SURFACE_TYPES.natural).toContain('sand')
      expect(SURFACE_TYPES.natural).toContain('gravel')
    })

    it('devrait contenir les types de surfaces artificielles', () => {
      expect(SURFACE_TYPES.artificial).toContain('paved')
      expect(SURFACE_TYPES.artificial).toContain('asphalt')
      expect(SURFACE_TYPES.artificial).toContain('concrete')
      expect(SURFACE_TYPES.artificial).toContain('brick')
    })

    it('devrait contenir les types de surfaces mixtes', () => {
      expect(SURFACE_TYPES.mixed).toContain('unpaved')
      expect(SURFACE_TYPES.mixed).toContain('compacted')
      expect(SURFACE_TYPES.mixed).toContain('fine_gravel')
    })
  })

  describe('RATE_LIMITING', () => {
    it('devrait avoir des limites de taux raisonnables', () => {
      expect(RATE_LIMITING.requestsPerMinute).toBe(60)
      expect(RATE_LIMITING.delayBetweenRequests).toBe(1000)
      expect(RATE_LIMITING.maxRetries).toBe(3)
      expect(RATE_LIMITING.retryDelay).toBe(2000)
    })
  })

  describe('ERROR_MESSAGES', () => {
    it('devrait contenir tous les messages d\'erreur', () => {
      expect(ERROR_MESSAGES.OVERPASS_TIMEOUT).toBeDefined()
      expect(ERROR_MESSAGES.OVERPASS_ERROR).toBeDefined()
      expect(ERROR_MESSAGES.OSRM_TIMEOUT).toBeDefined()
      expect(ERROR_MESSAGES.OSRM_ERROR).toBeDefined()
      expect(ERROR_MESSAGES.INVALID_COORDINATES).toBeDefined()
      expect(ERROR_MESSAGES.NO_PATHS_FOUND).toBeDefined()
      expect(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED).toBeDefined()
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined()
    })
  })
})

describe('configUtils', () => {
  describe('buildOverpassQuery', () => {
    it('devrait construire une requête Overpass valide', () => {
      const area = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }
      const tags = ['footway', 'path']

      const query = configUtils.buildOverpassQuery(area, tags)

      expect(query.bbox).toBe('48.85,2.35,48.86,2.36')
      expect(query.timeout).toBe(30000)
      expect(query.maxNodes).toBe(10000)
      expect(query.query).toContain('footway')
      expect(query.query).toContain('path')
      expect(query.query).toContain('[out:json]')
      expect(query.query).toContain('[timeout:30000]')
    })

    it('devrait gérer plusieurs tags', () => {
      const area = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }
      const tags = ['footway', 'path', 'track', 'bridleway']

      const query = configUtils.buildOverpassQuery(area, tags)

      expect(query.query).toContain('footway|path|track|bridleway')
    })
  })

  describe('validateSearchArea', () => {
    it('devrait valider une zone de recherche correcte', () => {
      const validArea = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      expect(configUtils.validateSearchArea(validArea)).toBe(true)
    })

    it('devrait rejeter une zone avec north < south', () => {
      const invalidArea = {
        north: 48.85,
        south: 48.86,
        east: 2.36,
        west: 2.35
      }

      expect(configUtils.validateSearchArea(invalidArea)).toBe(false)
    })

    it('devrait rejeter une zone avec east < west', () => {
      const invalidArea = {
        north: 48.86,
        south: 48.85,
        east: 2.35,
        west: 2.36
      }

      expect(configUtils.validateSearchArea(invalidArea)).toBe(false)
    })

    it('devrait rejeter une zone trop grande', () => {
      const tooLargeArea = {
        north: 50,
        south: 40,
        east: 10,
        west: 0
      }

      expect(configUtils.validateSearchArea(tooLargeArea)).toBe(false)
    })
  })

  describe('calculateAreaRadius', () => {
    it('devrait calculer le rayon d\'une zone carrée', () => {
      const squareArea = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      const radius = configUtils.calculateAreaRadius(squareArea)

      expect(radius).toBeCloseTo(0.005, 3)
    })

    it('devrait calculer le rayon d\'une zone rectangulaire', () => {
      const rectangularArea = {
        north: 48.86,
        south: 48.85,
        east: 2.40,
        west: 2.35
      }

      const radius = configUtils.calculateAreaRadius(rectangularArea)

      expect(radius).toBeCloseTo(0.025, 3) // Plus grand côté / 2
    })
  })
})
