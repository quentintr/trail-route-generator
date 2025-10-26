import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function setupPostGIS() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Connecting to database...')
    await prisma.$connect()
    
    console.log('🔄 Enabling PostGIS extension...')
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis;`
    
    console.log('✅ PostGIS extension enabled successfully!')
    
    // Verify the extension is working
    const result = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
      ) as exists
    `
    
    if (result[0]?.exists) {
      console.log('✅ PostGIS extension verified')
    } else {
      console.log('❌ PostGIS extension not found')
    }
    
  } catch (error) {
    console.error('❌ Error setting up PostGIS:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setupPostGIS()
  .then(() => {
    console.log('🎉 PostGIS setup completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 PostGIS setup failed:', error)
    process.exit(1)
  })
