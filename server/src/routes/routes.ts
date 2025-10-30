import express from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { osrmService } from '../services/osrm-service'
import { RouteGenerationRequest, RouteGenerationResponse } from '@trail-route-generator/shared/types'
import { buildGraph, validateGraph } from '../services/graph-builder'
import { generateLoops } from '../algorithms/loop-generator'
import * as GraphCache from '../services/graph-cache'
import { osmService } from '../services/osm-service'
import { routingService } from '../services/routing-service'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const waypointSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  type: z.enum(['start', 'end', 'waypoint']),
  description: z.string().optional()
})

const createRouteSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  distance: z.number().positive('La distance doit être positive'),
  duration: z.number().positive('La durée doit être positive'),
  elevation: z.number().min(0, 'L\'élévation ne peut pas être négative'),
  waypoints: z.array(waypointSchema).min(2, 'Au moins 2 points sont requis')
})

const updateRouteSchema = createRouteSchema.partial()

// Calculate route between two points
const calculateRouteSchema = z.object({
  start: z.array(z.number()).length(2, 'Point de départ requis [longitude, latitude]'),
  end: z.array(z.number()).length(2, 'Point d\'arrivée requis [longitude, latitude]'),
  profile: z.enum(['foot', 'bike']).optional().default('foot'),
  alternatives: z.boolean().optional().default(false)
})

// Get all routes
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      difficulty, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    
    if (difficulty) {
      where.difficulty = difficulty
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          },
          waypoints: true,
          _count: {
            select: {
              reviews: true
            }
          }
        }
      }),
      prisma.route.count({ where })
    ])

    res.json({
      routes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get routes error:', error)
    res.status(500).json({
      error: 'Erreur lors du chargement des itinéraires'
    })
  }
})

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
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
        waypoints: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    })

    if (!route) {
      return res.status(404).json({
        error: 'Itinéraire non trouvé'
      })
    }

    // Calculate average rating
    const averageRating = route.reviews.length > 0 
      ? route.reviews.reduce((sum, review) => sum + review.rating, 0) / route.reviews.length
      : 0

    res.json({
      ...route,
      averageRating,
      reviewCount: route._count.reviews
    })
  } catch (error) {
    console.error('Get route error:', error)
    res.status(500).json({
      error: 'Erreur lors du chargement de l\'itinéraire'
    })
  }
})

// Create route
router.post('/', async (req, res) => {
  try {
    const data = createRouteSchema.parse(req.body)
    const userId = req.headers['user-id'] as string // À implémenter avec middleware d'auth

    if (!userId) {
      return res.status(401).json({
        error: 'Authentification requise'
      })
    }

    const route = await prisma.route.create({
      data: {
        ...data,
        userId,
        waypoints: {
          create: data.waypoints.map(waypoint => ({
            ...waypoint,
            location: {
              type: 'Point',
              coordinates: [waypoint.longitude, waypoint.latitude]
            }
          }))
        }
      },
      include: {
        waypoints: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.status(201).json({
      message: 'Itinéraire créé avec succès',
      route
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      })
    }

    console.error('Create route error:', error)
    res.status(500).json({
      error: 'Erreur lors de la création de l\'itinéraire'
    })
  }
})

// Update route
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = updateRouteSchema.parse(req.body)
    const userId = req.headers['user-id'] as string // À implémenter avec middleware d'auth

    if (!userId) {
      return res.status(401).json({
        error: 'Authentification requise'
      })
    }

    // Check if user owns the route
    const existingRoute = await prisma.route.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existingRoute || existingRoute.userId !== userId) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas modifier cet itinéraire'
      })
    }

    const updateData: any = { ...data }
    
    if (data.waypoints) {
      // Delete existing waypoints and create new ones
      await prisma.waypoint.deleteMany({
        where: { routeId: id }
      })
      
      updateData.waypoints = {
        create: data.waypoints.map(waypoint => ({
          ...waypoint,
          location: {
            type: 'Point',
            coordinates: [waypoint.longitude, waypoint.latitude]
          }
        }))
      }
    }

    const route = await prisma.route.update({
      where: { id },
      data: updateData,
      include: {
        waypoints: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.json({
      message: 'Itinéraire mis à jour avec succès',
      route
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      })
    }

    console.error('Update route error:', error)
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de l\'itinéraire'
    })
  }
})

// Delete route
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['user-id'] as string // À implémenter avec middleware d'auth

    if (!userId) {
      return res.status(401).json({
        error: 'Authentification requise'
      })
    }

    // Check if user owns the route
    const existingRoute = await prisma.route.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existingRoute || existingRoute.userId !== userId) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas supprimer cet itinéraire'
      })
    }

    await prisma.route.delete({
      where: { id }
    })

    res.json({
      message: 'Itinéraire supprimé avec succès'
    })
  } catch (error) {
    console.error('Delete route error:', error)
    res.status(500).json({
      error: 'Erreur lors de la suppression de l\'itinéraire'
    })
  }
})

// POST /api/routes/generate - Génération de routes via OSRM
router.post('/generate', async (req, res) => {
  const startTime = Date.now()
  try {
    const {
      start_lat,
      start_lon,
      distance,
      difficulty,
      terrain_type
    } = req.body

    if (!start_lat || !start_lon || !distance) {
      return res.status(400).json({ error: 'Missing required fields: start_lat, start_lon, distance' })
    }
    if (distance < 1 || distance > 50) {
      return res.status(400).json({ error: 'Distance must be between 1 and 50 km' })
    }
    console.log(`🎯 Route generation request:`)
    console.log(`   - Location: ${start_lat}, ${start_lon}`)
    console.log(`   - Distance: ${distance} km`)
    console.log(`   - Difficulty: ${difficulty || 'any'}`)
    console.log(`   - Terrain: ${terrain_type || 'any'}`)

    try {
      const radius = Math.max(distance * 0.6, 2)
      console.log(`📊 Loading OSM graph (radius: ${radius.toFixed(1)} km)...`)
      const cacheKey = GraphCache.hashArea(start_lat, start_lon, radius)
      let cached = await GraphCache.loadGraph(cacheKey)
      let graph = cached ? cached.graph : null
      if (!graph) {
        console.log('   Cache MISS - Building from OSM...')
        // Utiliser le service OSM enrichi
        const osmData = await osmService.getRunningPaths(
          {
            north: start_lat + radius / 111,
            south: start_lat - radius / 111,
            east: start_lon + radius / (111 * Math.cos(start_lat * Math.PI / 180)),
            west: start_lon - radius / (111 * Math.cos(start_lat * Math.PI / 180)),
          },
          { includeSecondary: true }
        )
        graph = buildGraph(osmData, { lat: start_lat, lon: start_lon }, radius)
        await GraphCache.saveGraph(cacheKey, {
          area: { lat: start_lat, lon: start_lon, radius },
          graph,
          osmDataVersion: 'unknown',
          createdAt: new Date().toISOString(),
          nodesCount: graph.nodes.size,
          edgesCount: graph.edges.size
        })
      } else {
        console.log('   Cache HIT - Graph loaded from cache')
      }

      // Valider graphe
      const validation = validateGraph(graph)
      if (!validation.valid) {
        console.error(`❌ Invalid graph:`, validation.errors)
        throw new Error('Graph validation failed: ' + validation.errors.join(', '))
      }
      if (validation.warnings.length > 0) {
        console.warn(`⚠️  Graph warnings:`, validation.warnings)
      }
      console.log(`✅ Graph validated: nodes=${graph.nodes.size}, edges=${graph.edges.size}`)
      // Générer les boucles
      console.log(`🔄 Generating loops...`)
      const { loops, debug } = generateLoops(graph, {
        startNodeId: Array.from(graph.nodes.keys())[0], // TEMP: à améliorer avec proche du start_lat/lon
        targetDistance: distance * 1000,
        numVariants: 5,
        minReturnAngleDeg: 90,
        scoring: { distance: 0.4, angle: 0.3, quality: 0.2, diversity: 0.1 },
        debug: true
      })
      const totalTime = Date.now() - startTime
      return res.json({
        success: true,
        method: 'custom_algorithm',
        routes: loops,
        debug: {
          ...debug,
          timings: { total: totalTime },
          graph: { nodes: graph.nodes.size, edges: graph.edges.size, validation }
        }
      })
    } catch (customError) {
      console.error(`❌ Custom algorithm failed:`, customError)
      console.log('🔄 Falling back to OSRM...')
      try {
        // Simple fallback: OSRM circular
        const numWaypoints = 8
        const waypoints: [number, number][] = [[start_lon, start_lat]]
        for (let i = 0; i < numWaypoints; i++) {
          const angle = (i / numWaypoints) * 2 * Math.PI
          const offsetKm = distance * 0.4
          const lat = start_lat + (offsetKm / 111) * Math.cos(angle)
          const lon = start_lon + (offsetKm / (111 * Math.cos(start_lat * Math.PI / 180))) * Math.sin(angle)
          waypoints.push([lon, lat])
        }
        waypoints.push([start_lon, start_lat])
        const route = await routingService.calculateRouteWithWaypoints(waypoints, { profile: 'foot' })
        return res.json({ success:true, method: 'osrm_fallback', routes: [route], debug: { fallback: 'osrm' } })
      } catch (osrmError) {
        return res.status(500).json({success:false, error:'Both custom and OSRM methods failed'})
      }
    }
  } catch (error:any) {
    return res.status(500).json({ success:false, error: error.message, details: error.stack })
  }
})

export default router
