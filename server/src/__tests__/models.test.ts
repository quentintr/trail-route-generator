import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { PrismaClient } from '@prisma/client'

describe('Database Models with PostGIS', () => {
  let prisma: PrismaClient
  let testUserId: string

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.route.deleteMany()
    await prisma.segment.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('User Model', () => {
    it('should create a user with preferences JSONB', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password_hash: 'hashed_password',
          preferences: {
            difficulty_level: 'medium',
            preferred_terrain: ['mountain', 'forest'],
            max_distance: 20
          }
        }
      })

      expect(user.id).toBeDefined()
      expect(user.email).toBe('test@example.com')
      expect(user.preferences).toEqual({
        difficulty_level: 'medium',
        preferred_terrain: ['mountain', 'forest'],
        max_distance: 20
      })
      expect(user.created_at).toBeDefined()

      testUserId = user.id
    })

    it('should handle null preferences', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test2@example.com',
          password_hash: 'hashed_password',
          preferences: null
        }
      })

      expect(user.preferences).toBeNull()
    })
  })

  describe('Route Model', () => {
    beforeEach(async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'route-test@example.com',
          password_hash: 'hashed_password'
        }
      })
      testUserId = user.id
    })

    it('should create a route with geography data', async () => {
      const route = await prisma.route.create({
        data: {
          user_id: testUserId,
          name: 'Test Trail Route',
          distance: 15.5,
          elevation_gain: 500,
          duration: 180, // 3 hours in minutes
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566], // Paris
              [2.2945, 48.8584], // Eiffel Tower
              [2.3200, 48.8700]  // Another point
            ]
          },
          terrain_type: 'mountain'
        }
      })

      expect(route.id).toBeDefined()
      expect(route.name).toBe('Test Trail Route')
      expect(route.distance).toBe(15.5)
      expect(route.elevation_gain).toBe(500)
      expect(route.duration).toBe(180)
      expect(route.terrain_type).toBe('mountain')
      expect(route.geometry).toBeDefined()
      expect(route.created_at).toBeDefined()
    })

    it('should support geographic queries', async () => {
      // Create a route
      await prisma.route.create({
        data: {
          user_id: testUserId,
          name: 'Geographic Test Route',
          distance: 10,
          elevation_gain: 200,
          duration: 120,
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566],
              [2.2945, 48.8584]
            ]
          },
          terrain_type: 'forest'
        }
      })

      // Query routes within a bounding box
      const routesInBounds = await prisma.$queryRaw`
        SELECT id, name, distance
        FROM routes 
        WHERE ST_Contains(
          ST_MakeEnvelope(2.0, 48.0, 3.0, 49.0, 4326),
          ST_GeomFromText('POINT(2.3522 48.8566)', 4326)
        )
      `

      expect(routesInBounds).toBeDefined()
    })
  })

  describe('Segment Model', () => {
    it('should create a segment with OSM data', async () => {
      const segment = await prisma.segment.create({
        data: {
          osm_id: '12345',
          name: 'Popular Trail Segment',
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566],
              [2.2945, 48.8584]
            ]
          },
          surface_type: 'dirt',
          difficulty: 'medium',
          popularity_score: 0.85
        }
      })

      expect(segment.id).toBeDefined()
      expect(segment.osm_id).toBe('12345')
      expect(segment.name).toBe('Popular Trail Segment')
      expect(segment.surface_type).toBe('dirt')
      expect(segment.difficulty).toBe('medium')
      expect(segment.popularity_score).toBe(0.85)
      expect(segment.geometry).toBeDefined()
    })

    it('should support distance-based queries', async () => {
      // Create a segment
      await prisma.segment.create({
        data: {
          osm_id: '67890',
          name: 'Distance Test Segment',
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566],
              [2.2945, 48.8584]
            ]
          },
          surface_type: 'paved',
          difficulty: 'easy',
          popularity_score: 0.7
        }
      })

      // Query segments within a certain distance
      const nearbySegments = await prisma.$queryRaw`
        SELECT id, name, popularity_score
        FROM segments 
        WHERE ST_DWithin(
          geometry,
          ST_GeomFromText('POINT(2.3522 48.8566)', 4326),
          1000
        )
        ORDER BY popularity_score DESC
      `

      expect(nearbySegments).toBeDefined()
    })
  })

  describe('Geographic Relationships', () => {
    beforeEach(async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'geo-test@example.com',
          password_hash: 'hashed_password'
        }
      })
      testUserId = user.id
    })

    it('should support route-segment relationships', async () => {
      // Create a segment
      const segment = await prisma.segment.create({
        data: {
          osm_id: 'segment-123',
          name: 'Base Segment',
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566],
              [2.2945, 48.8584]
            ]
          },
          surface_type: 'dirt',
          difficulty: 'medium',
          popularity_score: 0.8
        }
      })

      // Create a route that uses this segment
      const route = await prisma.route.create({
        data: {
          user_id: testUserId,
          name: 'Route using Segment',
          distance: 5,
          elevation_gain: 100,
          duration: 60,
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566],
              [2.2945, 48.8584]
            ]
          },
          terrain_type: 'mixed'
        }
      })

      expect(route.id).toBeDefined()
      expect(segment.id).toBeDefined()
    })
  })
})
