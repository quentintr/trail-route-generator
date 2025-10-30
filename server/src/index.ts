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
import adminRouter from './routes/admin'
import apiV1AuthRoutes from './routes/api/v1/auth'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined'))

// Health check with PostGIS status
app.get('/health', (req, res) => {
  res.json({ status:'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/trails', trailRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/admin', adminRouter)

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
    
    app.listen(PORT, ()=>{
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app
