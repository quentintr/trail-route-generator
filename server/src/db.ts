import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Global Prisma client instance
let prisma: PrismaClient | null = null

/**
 * Database connection configuration with PostGIS support
 * 
 * Features:
 * - Connection pooling for better performance
 * - PostGIS extension support for geographic queries
 * - Proper error handling and logging
 * - Environment-based configuration
 */
export const connectDatabase = async (): Promise<PrismaClient> => {
  if (prisma) {
    return prisma
  }

  try {
    // Validate required environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    // Create Prisma client with optimized configuration
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'pretty'
    })

    // Test the connection
    await prisma.$connect()
    
    // Verify PostGIS extension is available
    await verifyPostGISExtension(prisma)
    
    console.log('✅ Database connected successfully with PostGIS support')
    
    return prisma
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

/**
 * Disconnect from the database
 */
export const disconnectDatabase = async (client?: PrismaClient): Promise<void> => {
  try {
    if (client) {
      await client.$disconnect()
    } else if (prisma) {
      await prisma.$disconnect()
      prisma = null
    }
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error)
    throw error
  }
}

/**
 * Get the current Prisma client instance
 */
export const getDatabase = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Database not connected. Call connectDatabase() first.')
  }
  return prisma
}

/**
 * Verify that PostGIS extension is installed and enabled
 */
const verifyPostGISExtension = async (client: PrismaClient): Promise<void> => {
  try {
    // Check if PostGIS extension is available
    const result = await client.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
      ) as exists
    `
    
    if (!result[0]?.exists) {
      console.warn('⚠️  PostGIS extension not found. Geographic queries may not work properly.')
      console.warn('   To install PostGIS: CREATE EXTENSION postgis;')
    } else {
      console.log('✅ PostGIS extension verified')
    }
  } catch (error) {
    console.warn('⚠️  Could not verify PostGIS extension:', error)
  }
}

/**
 * Execute a raw SQL query with proper error handling
 */
export const executeRawQuery = async <T = any>(
  query: string,
  params: any[] = []
): Promise<T> => {
  const client = getDatabase()
  
  try {
    return await client.$queryRawUnsafe<T>(query, ...params)
  } catch (error) {
    console.error('❌ Raw query execution failed:', error)
    throw error
  }
}

/**
 * Geographic utility functions using PostGIS
 */
export const geographicUtils = {
  /**
   * Calculate distance between two points in meters
   */
  calculateDistance: async (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): Promise<number> => {
    const client = getDatabase()
    
    const result = await client.$queryRaw<Array<{ distance: number }>>`
      SELECT ST_Distance(
        ST_GeogFromText('POINT(${lon1} ${lat1})'),
        ST_GeogFromText('POINT(${lon2} ${lat2})')
      ) as distance
    `
    
    return result[0]?.distance || 0
  },

  /**
   * Find routes within a bounding box
   */
  findRoutesInBounds: async (
    north: number,
    south: number,
    east: number,
    west: number,
    limit: number = 50
  ) => {
    const client = getDatabase()
    
    return await client.$queryRaw`
      SELECT id, name, distance, elevation_gain, terrain_type
      FROM routes 
      WHERE ST_Contains(
        ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326),
        ST_GeomFromText('POINT(0 0)', 4326)
      )
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
  },

  /**
   * Find segments near a point within a radius
   */
  findSegmentsNearPoint: async (
    latitude: number,
    longitude: number,
    radiusMeters: number = 1000,
    limit: number = 20
  ) => {
    const client = getDatabase()
    
    return await client.$queryRaw`
      SELECT id, osm_id, name, surface_type, difficulty, popularity_score
      FROM segments 
      WHERE ST_DWithin(
        geometry,
        ST_GeogFromText('POINT(${longitude} ${latitude})'),
        ${radiusMeters}
      )
      ORDER BY popularity_score DESC, ST_Distance(
        geometry,
        ST_GeogFromText('POINT(${longitude} ${latitude})')
      ) ASC
      LIMIT ${limit}
    `
  },

  /**
   * Calculate route statistics
   */
  getRouteStatistics: async (routeId: string) => {
    const client = getDatabase()
    
    const result = await client.$queryRaw<Array<{
      total_distance: number
      total_elevation: number
      bounding_box: any
    }>>`
      SELECT 
        ST_Length(geometry::geography) as total_distance,
        ST_Area(geometry::geography) as total_elevation,
        ST_Envelope(geometry) as bounding_box
      FROM routes 
      WHERE id = ${routeId}
    `
    
    return result[0]
  }
}

/**
 * Database health check
 */
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy'
  postgis: boolean
  connection: boolean
  timestamp: string
}> => {
  try {
    const client = getDatabase()
    
    // Test basic connection
    await client.$queryRaw`SELECT 1`
    
    // Check PostGIS
    const postgisResult = await client.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
      ) as exists
    `
    
    return {
      status: 'healthy',
      postgis: postgisResult[0]?.exists || false,
      connection: true,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      postgis: false,
      connection: false,
      timestamp: new Date().toISOString()
    }
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🔄 Graceful shutdown initiated...')
  await disconnectDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('🔄 Graceful shutdown initiated...')
  await disconnectDatabase()
  process.exit(0)
})

export default prisma


