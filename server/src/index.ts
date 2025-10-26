import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDatabase, getDatabase, healthCheck } from './db'

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error-handler'
import { generalLimiter, routeGenerationLimiter, authLimiter, routeSaveLimiter } from './middleware/rate-limiter'

// Import routes
import authRoutes from './routes/auth'
import trailRoutes from './routes/trails'
import routeRoutes from './routes/routes'
import apiV1Routes from './routes/api/v1/routes'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}))

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use(generalLimiter)

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

// API Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/trails', trailRoutes)
app.use('/api/routes', routeRoutes)

// API v1 routes with specific rate limiting
app.use('/api/v1/routes', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/generate') {
    return routeGenerationLimiter(req, res, next)
  }
  if (req.method === 'POST' && req.path.includes('/save')) {
    return routeSaveLimiter(req, res, next)
  }
  next()
}, apiV1Routes)

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
