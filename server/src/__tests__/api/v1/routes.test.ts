import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import routes from '../../routes/api/v1/routes'
import { errorHandler, notFoundHandler } from '../../middleware/error-handler'

// Mock Prisma
jest.mock('@prisma/client')
const MockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>

// Mock LoopGenerator
jest.mock('../../algorithms/loop-generator', () => ({
  LoopGenerator: jest.fn().mockImplementation(() => ({
    generateLoops: jest.fn().mockResolvedValue([
      {
        id: 'loop_1',
        distance: 5.2,
        quality: 0.85,
        path: ['A', 'B', 'C', 'A'],
        geometry: {
          type: 'LineString',
          coordinates: [[2.3522, 48.8566], [2.3542, 48.8576], [2.3562, 48.8586], [2.3522, 48.8566]]
        }
      },
      {
        id: 'loop_2',
        distance: 4.8,
        quality: 0.78,
        path: ['A', 'D', 'E', 'A'],
        geometry: {
          type: 'LineString',
          coordinates: [[2.3522, 48.8566], [2.3502, 48.8556], [2.3482, 48.8546], [2.3522, 48.8566]]
        }
      }
    ])
  }))
}))

const app = express()
app.use(express.json())
app.use('/api/v1/routes', routes)
app.use(notFoundHandler)
app.use(errorHandler)

describe('API v1 Routes', () => {
  let mockPrisma: jest.Mocked<PrismaClient>

  beforeEach(() => {
    mockPrisma = {
      route: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    } as any

    MockedPrismaClient.mockImplementation(() => mockPrisma)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/v1/routes/generate', () => {
    it('should generate route variants successfully', async () => {
      const requestBody = {
        lat: 48.8566,
        lon: 2.3522,
        distance: 5,
        pace: 'moderate',
        terrain_type: 'mixed',
        difficulty: 'medium'
      }

      const response = await request(app)
        .post('/api/v1/routes/generate')
        .send(requestBody)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          variants: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              distance: expect.any(Number),
              quality: expect.any(Number),
              path: expect.any(Array),
              geometry: expect.objectContaining({
                type: 'LineString',
                coordinates: expect.any(Array)
              })
            })
          ])
        }
      })

      expect(response.body.data.variants).toHaveLength(2)
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/routes/generate')
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Bad Request',
        message: 'Validation failed'
      })
    })

    it('should validate coordinate ranges', async () => {
      const response = await request(app)
        .post('/api/v1/routes/generate')
        .send({
          lat: 91, // Invalid latitude
          lon: 2.3522,
          distance: 5
        })
        .expect(400)

      expect(response.body.message).toContain('Latitude must be between -90 and 90')
    })

    it('should validate distance range', async () => {
      const response = await request(app)
        .post('/api/v1/routes/generate')
        .send({
          lat: 48.8566,
          lon: 2.3522,
          distance: 100 // Invalid distance
        })
        .expect(400)

      expect(response.body.message).toContain('Distance cannot exceed 50km')
    })

    it('should handle generation errors', async () => {
      // Mock generation failure
      const { LoopGenerator } = require('../../algorithms/loop-generator')
      LoopGenerator.mockImplementation(() => ({
        generateLoops: jest.fn().mockRejectedValue(new Error('Generation failed'))
      }))

      const response = await request(app)
        .post('/api/v1/routes/generate')
        .send({
          lat: 48.8566,
          lon: 2.3522,
          distance: 5
        })
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal Server Error'
      })
    })
  })

  describe('GET /api/v1/routes/:id', () => {
    it('should return route details for valid ID', async () => {
      const mockRoute = {
        id: 'route_123',
        name: 'Test Route',
        distance: 5.2,
        difficulty: 'medium',
        terrain_type: 'mixed',
        geometry: {
          type: 'LineString',
          coordinates: [[2.3522, 48.8566], [2.3542, 48.8576]]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.route.findUnique.mockResolvedValue(mockRoute as any)

      const response = await request(app)
        .get('/api/v1/routes/123e4567-e89b-12d3-a456-426614174000')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: mockRoute.id,
          name: mockRoute.name,
          distance: mockRoute.distance
        })
      })
    })

    it('should return 404 for non-existent route', async () => {
      mockPrisma.route.findUnique.mockResolvedValue(null)

      const response = await request(app)
        .get('/api/v1/routes/123e4567-e89b-12d3-a456-426614174000')
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Not Found',
        message: 'Route not found'
      })
    })

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/routes/invalid-id')
        .expect(400)

      expect(response.body.message).toContain('Invalid route ID format')
    })
  })

  describe('GET /api/v1/routes', () => {
    it('should return paginated routes list', async () => {
      const mockRoutes = [
        {
          id: 'route_1',
          name: 'Route 1',
          distance: 5.2,
          difficulty: 'medium',
          terrain_type: 'mixed'
        },
        {
          id: 'route_2',
          name: 'Route 2',
          distance: 8.1,
          difficulty: 'hard',
          terrain_type: 'trail'
        }
      ]

      mockPrisma.route.findMany.mockResolvedValue(mockRoutes as any)
      mockPrisma.route.count.mockResolvedValue(2)

      const response = await request(app)
        .get('/api/v1/routes')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          routes: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String)
            })
          ]),
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1
          }
        }
      })
    })

    it('should filter routes by terrain_type', async () => {
      mockPrisma.route.findMany.mockResolvedValue([])
      mockPrisma.route.count.mockResolvedValue(0)

      await request(app)
        .get('/api/v1/routes?terrain_type=trail')
        .expect(200)

      expect(mockPrisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            terrain_type: 'trail'
          })
        })
      )
    })

    it('should filter routes by distance range', async () => {
      mockPrisma.route.findMany.mockResolvedValue([])
      mockPrisma.route.count.mockResolvedValue(0)

      await request(app)
        .get('/api/v1/routes?min_distance=5&max_distance=10')
        .expect(200)

      expect(mockPrisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            distance: {
              gte: 5,
              lte: 10
            }
          })
        })
      )
    })
  })

  describe('POST /api/v1/routes/:id/save', () => {
    it('should save route successfully', async () => {
      const mockSavedRoute = {
        id: 'saved_route_123',
        name: 'Saved Route',
        distance: 5.2,
        difficulty: 'medium',
        terrain_type: 'mixed',
        userId: 'user_123'
      }

      mockPrisma.route.create.mockResolvedValue(mockSavedRoute as any)

      const response = await request(app)
        .post('/api/v1/routes/123e4567-e89b-12d3-a456-426614174000/save')
        .set('user-id', 'user_123')
        .send({
          name: 'My Saved Route',
          description: 'A great hiking route'
        })
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Route saved successfully',
        data: expect.objectContaining({
          id: expect.any(String),
          name: 'My Saved Route'
        })
      })
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/routes/123e4567-e89b-12d3-a456-426614174000/save')
        .send({
          name: 'My Saved Route'
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    })

    it('should validate route ID format', async () => {
      const response = await request(app)
        .post('/api/v1/routes/invalid-id/save')
        .set('user-id', 'user_123')
        .send({
          name: 'My Saved Route'
        })
        .expect(400)

      expect(response.body.message).toContain('Invalid route ID format')
    })
  })
})
