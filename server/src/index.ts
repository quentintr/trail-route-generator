import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDatabase, getDatabase, healthCheck } from './db'

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error-handler'

// Import routes
import authRoutes from './routes/auth'
import trailRoutes from './routes/trails'
import routeRoutes from './routes/routes'
import apiV1AuthRoutes from './routes/api/v1/auth'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check with PostGIS status
app.get('/health', async (req, res) => {
  try {
    const health = await healthCheck()
    res.json({ 
      ...health,
      uptime: process.uptime()
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    })
  }
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/trails', trailRoutes)
app.use('/api/routes', routeRoutes)

// API v1 Routes
app.use('/api/v1/auth', apiV1AuthRoutes)

// 404 handler
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

// Start server with database connection
const startServer = async () => {
  try {
    // Connect to database with PostGIS
    await connectDatabase()
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🗄️  Database: Connected with PostGIS support`)
      console.log(`🌍 Geographic queries: Enabled`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app
