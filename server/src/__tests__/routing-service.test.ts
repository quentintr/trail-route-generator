/**
 * Tests pour le service de routage
 * 
 * Ces tests vérifient le bon fonctionnement du service de routage
 * utilisant l'API OSRM pour le calcul d'itinéraires.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { RoutingService, routingUtils } from '../services/routing-service'

// Mock axios pour éviter les appels réseau réels
jest.mock('axios')
const mockedAxios = jest.mocked(await import('axios'))

describe('RoutingService', () => {
  let routingService: RoutingService

  beforeEach(() => {
    routingService = new RoutingService()
    jest.clearAllMocks()
  })

  describe('calculateRoute', () => {
    it('devrait calculer un itinéraire entre deux points', async () => {
      // Mock de la réponse OSRM
      const mockOSRMResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              type: 'LineString',
              coordinates: [
                [2.3522, 48.8566],
                [2.3542, 48.8576],
                [2.3562, 48.8586]
              ]
            },
            legs: [
              {
                distance: 1000,
                duration: 600,
                weight: 600,
                summary: 'Route principale',
                steps: [
                  {
                    distance: 1000,
                    duration: 600,
                    geometry: {
                      type: 'LineString',
                      coordinates: [
                        [2.3522, 48.8566],
                        [2.3542, 48.8576],
                        [2.3562, 48.8586]
                      ]
                    },
                    maneuver: {
                      bearing_after: 0,
                      bearing_before: 0,
                      location: [2.3522, 48.8566],
                      type: 1,
                      instruction: 'Départ'
                    },
                    mode: 'foot',
                    name: 'Rue de la Paix'
                  }
                ]
              }
            ],
            distance: 1000,
            duration: 600,
            weight: 600,
            weight_name: 'routability'
          }
        ],
        waypoints: [
          {
            distance: 0,
            name: 'Départ',
            location: [2.3522, 48.8566],
            hint: 'hint1'
          },
          {
            distance: 1000,
            name: 'Arrivée',
            location: [2.3562, 48.8586],
            hint: 'hint2'
          }
        ]
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: mockOSRMResponse,
        status: 200
      })

      const start: [number, number] = [2.3522, 48.8566]
      const end: [number, number] = [2.3562, 48.8586]

      const result = await routingService.calculateRoute(start, end)

      expect(result.distance).toBe(1) // 1000m = 1km
      expect(result.duration).toBe(10) // 600s = 10min
      expect(result.geometry.coordinates).toHaveLength(3)
      expect(result.legs).toHaveLength(1)
      expect(result.summary.totalDistance).toBe(1)
      expect(result.summary.totalDuration).toBe(10)
    })

    it('devrait gérer les erreurs de l\'API OSRM', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

      const start: [number, number] = [2.3522, 48.8566]
      const end: [number, number] = [2.3562, 48.8586]

      await expect(routingService.calculateRoute(start, end))
        .rejects.toThrow('Erreur lors du calcul de route')
    })

    it('devrait valider les coordonnées', async () => {
      const invalidStart: [number, number] = [200, 48.8566] // Longitude invalide
      const end: [number, number] = [2.3562, 48.8586]

      await expect(routingService.calculateRoute(invalidStart, end))
        .rejects.toThrow('Coordonnées invalides')
    })

    it('devrait utiliser le profil de routage correct', async () => {
      const mockOSRMResponse = {
        code: 'Ok',
        routes: [{ geometry: { type: 'LineString', coordinates: [] }, legs: [], distance: 0, duration: 0, weight: 0, weight_name: 'routability' }],
        waypoints: []
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: mockOSRMResponse,
        status: 200
      })

      const start: [number, number] = [2.3522, 48.8566]
      const end: [number, number] = [2.3562, 48.8586]

      await routingService.calculateRoute(start, end, { profile: 'bike' })

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/bike'),
        expect.any(Object)
      )
    })
  })

  describe('calculateRouteWithWaypoints', () => {
    it('devrait calculer un itinéraire avec plusieurs points de passage', async () => {
      const mockOSRMResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              type: 'LineString',
              coordinates: [
                [2.3522, 48.8566],
                [2.3542, 48.8576],
                [2.3562, 48.8586]
              ]
            },
            legs: [
              {
                distance: 500,
                duration: 300,
                weight: 300,
                summary: 'Premier segment',
                steps: []
              },
              {
                distance: 500,
                duration: 300,
                weight: 300,
                summary: 'Deuxième segment',
                steps: []
              }
            ],
            distance: 1000,
            duration: 600,
            weight: 600,
            weight_name: 'routability'
          }
        ],
        waypoints: []
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: mockOSRMResponse,
        status: 200
      })

      const waypoints: [number, number][] = [
        [2.3522, 48.8566],
        [2.3542, 48.8576],
        [2.3562, 48.8586]
      ]

      const result = await routingService.calculateRouteWithWaypoints(waypoints)

      expect(result.legs).toHaveLength(2)
      expect(result.distance).toBe(1)
      expect(result.duration).toBe(10)
    })

    it('devrait rejeter moins de deux points', async () => {
      const waypoints: [number, number][] = [[2.3522, 48.8566]]

      await expect(routingService.calculateRouteWithWaypoints(waypoints))
        .rejects.toThrow('Au moins deux points sont requis')
    })
  })

  describe('calculateDistanceMatrix', () => {
    it('devrait calculer la matrice de distances', async () => {
      const mockOSRMResponse = {
        code: 'Ok',
        durations: [[0, 600], [600, 0]],
        distances: [[0, 1000], [1000, 0]],
        sources: [
          { distance: 0, name: 'Point 1', location: [2.3522, 48.8566], hint: 'hint1' }
        ],
        destinations: [
          { distance: 0, name: 'Point 2', location: [2.3562, 48.8586], hint: 'hint2' }
        ]
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: mockOSRMResponse,
        status: 200
      })

      const coordinates: [number, number][] = [
        [2.3522, 48.8566],
        [2.3562, 48.8586]
      ]

      const result = await routingService.calculateDistanceMatrix(coordinates)

      expect(result.durations).toEqual([[0, 600], [600, 0]])
      expect(result.distances).toEqual([[0, 1000], [1000, 0]])
      expect(result.sources).toHaveLength(1)
      expect(result.destinations).toHaveLength(1)
    })
  })

  describe('calculateDistanceAndDuration', () => {
    it('devrait calculer la distance et durée entre deux points', async () => {
      const mockOSRMResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: { type: 'LineString', coordinates: [] },
            legs: [],
            distance: 2000,
            duration: 1200,
            weight: 1200,
            weight_name: 'routability'
          }
        ],
        waypoints: []
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: mockOSRMResponse,
        status: 200
      })

      const start: [number, number] = [2.3522, 48.8566]
      const end: [number, number] = [2.3562, 48.8586]

      const result = await routingService.calculateDistanceAndDuration(start, end)

      expect(result.distance).toBe(2) // 2000m = 2km
      expect(result.duration).toBe(20) // 1200s = 20min
    })
  })

  describe('findShortestRoute', () => {
    it('devrait trouver l\'itinéraire le plus court', async () => {
      const mockOSRMResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: { type: 'LineString', coordinates: [] },
            legs: [],
            distance: 1000,
            duration: 600,
            weight: 600,
            weight_name: 'routability'
          }
        ],
        waypoints: []
      }

      mockedAxios.get.mockResolvedValueOnce({
        data: mockOSRMResponse,
        status: 200
      })

      const coordinates: [number, number][] = [
        [2.3522, 48.8566],
        [2.3542, 48.8576],
        [2.3562, 48.8586]
      ]

      const result = await routingService.findShortestRoute(coordinates)

      expect(result.distance).toBe(1)
      expect(result.duration).toBe(10)
    })
  })
})

describe('routingUtils', () => {
  describe('calculateHaversineDistance', () => {
    it('devrait calculer la distance à vol d\'oiseau', () => {
      const distance = routingUtils.calculateHaversineDistance(
        48.8566, 2.3522, // Paris
        48.8584, 2.2945  // Tour Eiffel
      )

      expect(distance).toBeCloseTo(4.5, 1) // ~4.5km
    })
  })

  describe('formatDuration', () => {
    it('devrait formater une durée en minutes', () => {
      expect(routingUtils.formatDuration(30)).toBe('30min')
      expect(routingUtils.formatDuration(90)).toBe('1h 30min')
      expect(routingUtils.formatDuration(120)).toBe('2h 0min')
    })
  })

  describe('formatDistance', () => {
    it('devrait formater une distance en kilomètres', () => {
      expect(routingUtils.formatDistance(0.5)).toBe('500m')
      expect(routingUtils.formatDistance(1.5)).toBe('1.5km')
      expect(routingUtils.formatDistance(10)).toBe('10.0km')
    })
  })

  describe('calculateDifficultyFactor', () => {
    it('devrait calculer le facteur de difficulté', () => {
      const factor1 = routingUtils.calculateDifficultyFactor(5, 200)
      const factor2 = routingUtils.calculateDifficultyFactor(20, 1000)

      expect(factor1).toBeLessThan(factor2)
      expect(factor1).toBeGreaterThan(0)
      expect(factor2).toBeLessThanOrEqual(10)
    })
  })
})
