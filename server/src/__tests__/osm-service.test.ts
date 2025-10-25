/**
 * Tests pour le service OSM
 * 
 * Ces tests vérifient le bon fonctionnement du service OSM
 * pour la récupération de données géographiques depuis OpenStreetMap.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { OSMService, osmUtils } from '../services/osm-service'
import { configUtils } from '../config/osm-config'

// Mock axios pour éviter les appels réseau réels
jest.mock('axios')
const mockedAxios = jest.mocked(await import('axios'))

describe('OSMService', () => {
  let osmService: OSMService

  beforeEach(() => {
    osmService = new OSMService()
    jest.clearAllMocks()
  })

  describe('getRunningPaths', () => {
    it('devrait récupérer les chemins de randonnée dans une zone valide', async () => {
      // Mock des données OSM
      const mockOSMResponse = {
        version: 0.6,
        generator: 'Overpass API',
        osm3s: {
          timestamp_osm_base: '2024-01-01T00:00:00Z',
          copyright: 'OpenStreetMap contributors'
        },
        elements: [
          {
            type: 'way',
            id: 12345,
            nodes: [1, 2, 3],
            tags: {
              highway: 'footway',
              surface: 'asphalt',
              name: 'Sentier de test'
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [2.3522, 48.8566],
                [2.3542, 48.8576],
                [2.3562, 48.8586]
              ]
            }
          }
        ]
      }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockOSMResponse,
        status: 200
      })

      const searchArea = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      const result = await osmService.getRunningPaths(searchArea)

      expect(result.type).toBe('FeatureCollection')
      expect(result.features).toHaveLength(1)
      expect(result.features[0].properties.highway).toBe('footway')
      expect(result.features[0].properties.surface).toBe('asphalt')
      expect(result.features[0].geometry.coordinates).toHaveLength(3)
    })

    it('devrait filtrer les chemins selon les options', async () => {
      const mockOSMResponse = {
        version: 0.6,
        generator: 'Overpass API',
        osm3s: {
          timestamp_osm_base: '2024-01-01T00:00:00Z',
          copyright: 'OpenStreetMap contributors'
        },
        elements: [
          {
            type: 'way',
            id: 1,
            nodes: [1, 2],
            tags: { highway: 'footway', surface: 'asphalt' },
            geometry: {
              type: 'LineString',
              coordinates: [[2.35, 48.85], [2.36, 48.86]]
            }
          },
          {
            type: 'way',
            id: 2,
            nodes: [3, 4],
            tags: { highway: 'footway', surface: 'dirt' },
            geometry: {
              type: 'LineString',
              coordinates: [[2.35, 48.85], [2.36, 48.86]]
            }
          }
        ]
      }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockOSMResponse,
        status: 200
      })

      const searchArea = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      const result = await osmService.getRunningPaths(searchArea, {
        surfaceTypes: ['asphalt']
      })

      expect(result.features).toHaveLength(1)
      expect(result.features[0].properties.surface).toBe('asphalt')
    })

    it('devrait gérer les erreurs de l\'API Overpass', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const searchArea = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      await expect(osmService.getRunningPaths(searchArea))
        .rejects.toThrow('Erreur lors de la récupération des données OSM')
    })

    it('devrait valider la zone de recherche', async () => {
      const invalidArea = {
        north: 48.85, // Plus petit que south
        south: 48.86,
        east: 2.35,
        west: 2.36
      }

      await expect(osmService.getRunningPaths(invalidArea))
        .rejects.toThrow('Coordonnées invalides')
    })
  })

  describe('getElevationData', () => {
    it('devrait récupérer les données d\'élévation', async () => {
      const mockOSMResponse = {
        version: 0.6,
        generator: 'Overpass API',
        osm3s: {
          timestamp_osm_base: '2024-01-01T00:00:00Z',
          copyright: 'OpenStreetMap contributors'
        },
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 48.8566,
            lon: 2.3522,
            tags: {
              natural: 'peak',
              ele: '130',
              name: 'Mont Test'
            }
          }
        ]
      }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockOSMResponse,
        status: 200
      })

      const searchArea = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      const result = await osmService.getElevationData(searchArea)

      expect(result).toHaveLength(1)
      expect(result[0].properties.elevation).toBe(130)
      expect(result[0].properties.name).toBe('Mont Test')
    })
  })

  describe('getPointsOfInterest', () => {
    it('devrait récupérer les points d\'intérêt', async () => {
      const mockOSMResponse = {
        version: 0.6,
        generator: 'Overpass API',
        osm3s: {
          timestamp_osm_base: '2024-01-01T00:00:00Z',
          copyright: 'OpenStreetMap contributors'
        },
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 48.8566,
            lon: 2.3522,
            tags: {
              tourism: 'viewpoint',
              name: 'Point de vue'
            }
          }
        ]
      }

      mockedAxios.post.mockResolvedValueOnce({
        data: mockOSMResponse,
        status: 200
      })

      const searchArea = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      const result = await osmService.getPointsOfInterest(searchArea)

      expect(result).toHaveLength(1)
      expect(result[0].properties.tourism).toBe('viewpoint')
      expect(result[0].properties.name).toBe('Point de vue')
    })
  })
})

describe('osmUtils', () => {
  describe('createSearchArea', () => {
    it('devrait créer une zone de recherche autour d\'un point', () => {
      const area = osmUtils.createSearchArea(48.8566, 2.3522, 1) // 1km de rayon

      expect(area.north).toBeGreaterThan(area.south)
      expect(area.east).toBeGreaterThan(area.west)
      expect(area.north - area.south).toBeCloseTo(0.018, 2) // ~1km en degrés
    })
  })

  describe('validateCoordinates', () => {
    it('devrait valider des coordonnées correctes', () => {
      expect(osmUtils.validateCoordinates(48.8566, 2.3522)).toBe(true)
      expect(osmUtils.validateCoordinates(-48.8566, -2.3522)).toBe(true)
    })

    it('devrait rejeter des coordonnées incorrectes', () => {
      expect(osmUtils.validateCoordinates(91, 2.3522)).toBe(false)
      expect(osmUtils.validateCoordinates(48.8566, 181)).toBe(false)
      expect(osmUtils.validateCoordinates(-91, 2.3522)).toBe(false)
      expect(osmUtils.validateCoordinates(48.8566, -181)).toBe(false)
    })
  })

  describe('getAreaCenter', () => {
    it('devrait calculer le centre d\'une zone', () => {
      const area = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      const center = osmUtils.getAreaCenter(area)

      expect(center.lat).toBe(48.855)
      expect(center.lon).toBe(2.355)
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

    it('devrait rejeter une zone de recherche incorrecte', () => {
      const invalidArea = {
        north: 48.85, // Plus petit que south
        south: 48.86,
        east: 2.35,
        west: 2.36
      }

      expect(configUtils.validateSearchArea(invalidArea)).toBe(false)
    })
  })

  describe('calculateAreaRadius', () => {
    it('devrait calculer le rayon d\'une zone', () => {
      const area = {
        north: 48.86,
        south: 48.85,
        east: 2.36,
        west: 2.35
      }

      const radius = configUtils.calculateAreaRadius(area)

      expect(radius).toBeCloseTo(0.005, 3)
    })
  })
})
