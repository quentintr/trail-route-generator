import express from 'express'
import { PrismaClient } from '@prisma/client'
import { LoopGenerator } from '../../../algorithms/loop-generator'
import { 
  validateGenerateRoute, 
  validateRouteId, 
  validatePagination 
} from '../../../middleware/validation'
import { asyncHandler, CustomError } from '../../../middleware/error-handler'

const router = express.Router()
const prisma = new PrismaClient()

/**
 * @swagger
 * /api/v1/routes/generate:
 *   post:
 *     summary: Generate trail route variants
 *     description: Generate 3-5 route variants based on starting point and preferences
 *     tags: [Routes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lon
 *               - distance
 *             properties:
 *               lat:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Starting latitude
 *               lon:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Starting longitude
 *               distance:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 50
 *                 description: Target distance in kilometers
 *               pace:
 *                 type: string
 *                 enum: [slow, moderate, fast]
 *                 default: moderate
 *                 description: Walking pace preference
 *               terrain_type:
 *                 type: string
 *                 enum: [urban, trail, mixed]
 *                 default: mixed
 *                 description: Preferred terrain type
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard, expert]
 *                 default: medium
 *                 description: Route difficulty level
 *               max_variants:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 3
 *                 description: Maximum number of route variants to generate
 *     responses:
 *       201:
 *         description: Route variants generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     variants:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "loop_1234567890"
 *                           distance:
 *                             type: number
 *                             example: 5.2
 *                           quality:
 *                             type: number
 *                             example: 0.85
 *                           path:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["A", "B", "C", "A"]
 *                           geometry:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                                 example: "LineString"
 *                               coordinates:
 *                                 type: array
 *                                 items:
 *                                   type: array
 *                                   items:
 *                                     type: number
 *                                 example: [[2.3522, 48.8566], [2.3542, 48.8576]]
 *                           difficulty:
 *                             type: string
 *                             example: "medium"
 *                           terrain_type:
 *                             type: string
 *                             example: "mixed"
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Internal server error
 */
router.post('/generate', validateGenerateRoute, asyncHandler(async (req, res) => {
  const { lat, lon, distance, pace, terrain_type, difficulty, max_variants } = req.body

  try {
    // Create mock graph for demonstration
    // In production, this would use real OSM data
    const mockGraph = createMockGraph(lat, lon)

    const loopGenerator = new LoopGenerator()
    const loops = await loopGenerator.generateLoops(
      [lon, lat], // [longitude, latitude]
      distance,
      {
        tolerance: 0.2,
        maxVariants: max_variants,
        difficulty: difficulty
      }
    )

    if (loops.length === 0) {
      throw new CustomError('No route variants found for the given parameters', 404)
    }

    // Transform loops to API response format
    const variants = loops.map((loop, index) => ({
      id: `loop_${Date.now()}_${index}`,
      distance: loop.distance,
      quality: loop.quality,
      path: loop.path,
      geometry: {
        type: 'LineString',
        coordinates: loop.path.map(nodeId => {
          const node = mockGraph.nodes.get(nodeId)
          return node ? [node.lon, node.lat] : [lon, lat]
        })
      },
      difficulty: difficulty,
      terrain_type: terrain_type,
      pace: pace,
      estimated_duration: calculateDuration(loop.distance, pace)
    }))

    res.status(201).json({
      success: true,
      data: {
        variants,
        metadata: {
          generated_at: new Date().toISOString(),
          total_variants: variants.length,
          target_distance: distance,
          start_point: { lat, lon }
        }
      }
    })
  } catch (error) {
    if (error instanceof CustomError) {
      throw error
    }
    throw new CustomError('Failed to generate route variants', 500)
  }
}))

/**
 * @swagger
 * /api/v1/routes/{id}:
 *   get:
 *     summary: Get route details by ID
 *     description: Retrieve full details of a saved route including GeoJSON geometry
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     name:
 *                       type: string
 *                       example: "Beautiful Trail Route"
 *                     description:
 *                       type: string
 *                       example: "A scenic route through the forest"
 *                     distance:
 *                       type: number
 *                       example: 5.2
 *                     difficulty:
 *                       type: string
 *                       example: "medium"
 *                     terrain_type:
 *                       type: string
 *                       example: "trail"
 *                     geometry:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: "LineString"
 *                         coordinates:
 *                           type: array
 *                           items:
 *                             type: array
 *                             items:
 *                               type: number
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Route not found
 *       400:
 *         description: Invalid route ID format
 */
router.get('/:id', validateRouteId, asyncHandler(async (req, res) => {
  const { id } = req.params

  const route = await prisma.route.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      },
      waypoints: true
    }
  })

  if (!route) {
    throw new CustomError('Route not found', 404)
  }

  res.json({
    success: true,
    data: {
      id: route.id,
      name: route.name,
      description: route.description,
      distance: route.distance,
      difficulty: route.difficulty,
      terrain_type: route.terrain_type,
      geometry: route.geometry,
      user: route.user,
      waypoints: route.waypoints,
      created_at: route.createdAt,
      updated_at: route.updatedAt
    }
  })
}))

/**
 * @swagger
 * /api/v1/routes:
 *   get:
 *     summary: List user's saved routes
 *     description: Get paginated list of user's saved routes with optional filtering
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of routes per page
 *       - in: query
 *         name: terrain_type
 *         schema:
 *           type: string
 *           enum: [urban, trail, mixed]
 *         description: Filter by terrain type
 *       - in: query
 *         name: min_distance
 *         schema:
 *           type: number
 *           minimum: 1
 *         description: Minimum distance in kilometers
 *       - in: query
 *         name: max_distance
 *         schema:
 *           type: number
 *           maximum: 50
 *         description: Maximum distance in kilometers
 *     responses:
 *       200:
 *         description: Routes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     routes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           distance:
 *                             type: number
 *                           difficulty:
 *                             type: string
 *                           terrain_type:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get('/', validatePagination, asyncHandler(async (req, res) => {
  const { page, limit, terrain_type, min_distance, max_distance } = req.query
  const userId = req.headers['user-id'] as string

  if (!userId) {
    throw new CustomError('Authentication required', 401)
  }

  const skip = (page - 1) * limit
  const where: any = { userId }

  // Apply filters
  if (terrain_type) {
    where.terrain_type = terrain_type
  }

  if (min_distance || max_distance) {
    where.distance = {}
    if (min_distance) where.distance.gte = min_distance
    if (max_distance) where.distance.lte = max_distance
  }

  const [routes, total] = await Promise.all([
    prisma.route.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        distance: true,
        difficulty: true,
        terrain_type: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.route.count({ where })
  ])

  res.json({
    success: true,
    data: {
      routes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  })
}))

/**
 * @swagger
 * /api/v1/routes/{id}/save:
 *   post:
 *     summary: Save a generated route
 *     description: Save a generated route to user's collection
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Generated route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Route name
 *               description:
 *                 type: string
 *                 description: Route description
 *     responses:
 *       201:
 *         description: Route saved successfully
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Invalid input
 */
router.post('/:id/save', validateRouteId, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, description } = req.body
  const userId = req.headers['user-id'] as string

  if (!userId) {
    throw new CustomError('Authentication required', 401)
  }

  // In a real implementation, you would fetch the generated route data
  // and save it to the database. For now, we'll create a mock saved route.
  const savedRoute = await prisma.route.create({
    data: {
      id: `saved_${id}`,
      name,
      description: description || '',
      distance: 5.2, // This would come from the generated route
      difficulty: 'medium',
      terrain_type: 'mixed',
      userId,
      geometry: {
        type: 'LineString',
        coordinates: [[2.3522, 48.8566], [2.3542, 48.8576]]
      }
    }
  })

  res.status(201).json({
    success: true,
    message: 'Route saved successfully',
    data: {
      id: savedRoute.id,
      name: savedRoute.name,
      created_at: savedRoute.createdAt
    }
  })
}))

// Helper functions
function createMockGraph(lat: number, lon: number) {
  const nodeCount = 8
  const nodes = new Map()
  const edges = new Map()
  const nodeConnections = new Map()
  
  // Create nodes in a grid pattern around the start point
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node_${i}`
    const angle = (i / nodeCount) * 2 * Math.PI
    const radius = 0.01 // ~1km radius
    const nodeLat = lat + radius * Math.cos(angle)
    const nodeLon = lon + radius * Math.sin(angle)
    
    nodes.set(nodeId, {
      id: nodeId,
      lat: nodeLat,
      lon: nodeLon,
      connections: []
    })
    nodeConnections.set(nodeId, [])
  }
  
  // Create edges between nearby nodes
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const nodeA = nodes.get(`node_${i}`)
      const nodeB = nodes.get(`node_${j}`)
      
      // Calculate distance between nodes
      const dx = nodeB.lon - nodeA.lon
      const dy = nodeB.lat - nodeA.lat
      const distance = Math.sqrt(dx * dx + dy * dy) * 111000 // Rough conversion to meters
      
      // Only connect nearby nodes (within 2km)
      if (distance < 2000) {
        const edgeId = `edge_${i}_${j}`
        const surface = Math.random() > 0.5 ? 'paved' : 'unpaved'
        const highwayType = Math.random() > 0.3 ? 'footway' : 'path'
        
        edges.set(edgeId, {
          id: edgeId,
          from: `node_${i}`,
          to: `node_${j}`,
          distance: Math.round(distance),
          surface: surface,
          highway_type: highwayType,
          weight: Math.round(distance)
        })
        
        // Add bidirectional connections
        nodeConnections.get(`node_${i}`).push(`node_${j}`)
        nodeConnections.get(`node_${j}`).push(`node_${i}`)
        nodes.get(`node_${i}`).connections.push(`node_${j}`)
        nodes.get(`node_${j}`).connections.push(`node_${i}`)
      }
    }
  }
  
  return {
    nodes,
    edges,
    nodeConnections
  }
}

function calculateDuration(distance: number, pace: string): number {
  const paceSpeeds = {
    slow: 3, // km/h
    moderate: 4.5, // km/h
    fast: 6 // km/h
  }
  
  const speed = paceSpeeds[pace as keyof typeof paceSpeeds] || 4.5
  return Math.round((distance / speed) * 60) // minutes
}

export default router
