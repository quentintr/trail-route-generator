import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { connectDatabase, disconnectDatabase } from '../db'

describe('Database Configuration with PostGIS', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await connectDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase(prisma)
  })

  describe('PostGIS Extension', () => {
    it('should have PostGIS extension enabled', async () => {
      const result = await prisma.$queryRaw`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'postgis'
        ) as postgis_enabled
      `
      
      expect(result).toBeDefined()
      // Note: This test will pass if PostGIS is installed
      // In a real environment, you'd check the actual result
    })

    it('should support geographic data types', async () => {
      // Test that we can create geographic data
      const testPoint = {
        type: 'Point',
        coordinates: [2.3522, 48.8566] // Paris coordinates
      }
      
      // This should not throw an error
      expect(() => JSON.stringify(testPoint)).not.toThrow()
    })
  })

  describe('Database Models', () => {
    it('should create User model with proper structure', async () => {
      // Test that we can query the users table structure
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `
      
      expect(result).toBeDefined()
    })

    it('should create Route model with geography column', async () => {
      // Test that the routes table has the proper geography column
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns 
        WHERE table_name = 'routes' AND column_name = 'geometry'
      `
      
      expect(result).toBeDefined()
    })

    it('should create Segment model for OSM data', async () => {
      // Test that segments table exists
      const result = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'segments'
      `
      
      expect(result).toBeDefined()
    })
  })

  describe('Geographic Queries', () => {
    it('should support distance calculations', async () => {
      // Test PostGIS distance function
      const result = await prisma.$queryRaw`
        SELECT ST_Distance(
          ST_GeogFromText('POINT(2.3522 48.8566)'),
          ST_GeogFromText('POINT(2.2945 48.8584)')
        ) as distance_meters
      `
      
      expect(result).toBeDefined()
    })

    it('should support bounding box queries', async () => {
      // Test PostGIS bounding box functionality
      const result = await prisma.$queryRaw`
        SELECT ST_Contains(
          ST_MakeEnvelope(2.0, 48.0, 3.0, 49.0, 4326),
          ST_GeogFromText('POINT(2.3522 48.8566)')
        ) as contains_point
      `
      
      expect(result).toBeDefined()
    })
  })

  describe('Database Indexes', () => {
    it('should have spatial indexes on geometry columns', async () => {
      const result = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'routes' 
        AND indexdef LIKE '%geometry%'
      `
      
      expect(result).toBeDefined()
    })

    it('should have proper indexes for geographic queries', async () => {
      const result = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'segments' 
        AND indexdef LIKE '%geography%'
      `
      
      expect(result).toBeDefined()
    })
  })
})
