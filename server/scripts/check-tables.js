import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function checkTables() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Connecting to database...')
    await prisma.$connect()
    
    console.log('🔄 Checking if tables exist...')
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'routes', 'segments', 'reviews')
      ORDER BY table_name
    `
    
    console.log('📋 Found tables:', tables)
    
    // Try to query each table
    try {
      const userCount = await prisma.user.count()
      console.log('✅ Users table exists, count:', userCount)
    } catch (error) {
      console.log('❌ Users table error:', error.message)
    }
    
    try {
      const routeCount = await prisma.route.count()
      console.log('✅ Routes table exists, count:', routeCount)
    } catch (error) {
      console.log('❌ Routes table error:', error.message)
    }
    
    try {
      const segmentCount = await prisma.segment.count()
      console.log('✅ Segments table exists, count:', segmentCount)
    } catch (error) {
      console.log('❌ Segments table error:', error.message)
    }
    
    try {
      const reviewCount = await prisma.review.count()
      console.log('✅ Reviews table exists, count:', reviewCount)
    } catch (error) {
      console.log('❌ Reviews table error:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkTables()
  .then(() => {
    console.log('🎉 Table check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Table check failed:', error)
    process.exit(1)
  })
