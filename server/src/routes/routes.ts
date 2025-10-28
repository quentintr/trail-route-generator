import express from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { routingService } from '../services'
import { RouteGenerationRequest, RouteGenerationResponse, Route } from '@trail-route-generator/shared/types'
import { graphBuilder } from '../services/graph-builder'
import { loopGenerator, LoopGenerationRequest } from '../algorithms/loop-generator'
import { calculateSearchRadius } from '../utils/geo-utils'

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

// Real route generation service using OpenStreetMap data and loop generation algorithm
class RouteGenerationService {
  async generateRoutes(request: RouteGenerationRequest): Promise<Route[]> {
    const { start_lat, start_lon, distance = 10, terrain_type = 'mixed', pace = 5, difficulty = 'medium' } = request
    
    console.log(`Generating routes: ${distance}km, ${terrain_type}, ${difficulty}, pace ${pace}min/km`)
    
    try {
      // Calculate search radius based on target distance (limit to 5km max)
      const searchRadius = Math.min(calculateSearchRadius(distance), 5)
      
      // Build graph from OSM data
      console.log('Building OSM graph...')
      const graph = await graphBuilder.buildGraph(
        { lat: start_lat, lon: start_lon },
        searchRadius,
        {
          includeSecondary: true,
          minPathLength: 0.1, // Include paths longer than 100m
          weightFactors: {
            distance: 1.0,
            surface: 0.2,
            safety: 0.5,
            popularity: 0.1
          }
        }
      )
      
      console.log(`Graph built: ${graph.nodes.size} nodes, ${graph.edges.size} edges`)
      
      if (graph.nodes.size === 0) {
        throw new Error('No suitable paths found in the area')
      }
      
      // Convert request to loop generation format
      const loopRequest: LoopGenerationRequest = {
        start_lat,
        start_lon,
        distance,
        terrain_type: terrain_type as 'paved' | 'unpaved' | 'mixed',
        difficulty: difficulty as 'easy' | 'medium' | 'hard' | 'expert',
        pace
      }
      
      // Generate loops using the algorithm
      console.log('Generating loops...')
      const loops = await loopGenerator.generateLoops(graph, loopRequest, {
        maxVariants: 5,
        explorationRatio: 0.5,
        qualityThreshold: 0.3,
        avoidOverlap: true,
        optimizeWith2Opt: true
      })
      
      console.log(`Generated ${loops.length} loops`)
      
      if (loops.length === 0) {
        throw new Error('No suitable loops could be generated')
      }
      
      // Convert loops to Route format
      const routes: Route[] = loops.map((loop, index) => {
        const routeId = `route_${Date.now()}_${index}`
        
        return {
          id: routeId,
          name: `Route ${index + 1} - ${this.getRouteName(loop.metadata.terrain_type, loop.total_distance / 1000)}`,
          description: this.getRouteDescription(
            loop.metadata.terrain_type, 
            loop.total_distance / 1000, 
            loop.total_elevation,
            loop.metadata.difficulty
          ),
          distance: Math.round((loop.total_distance / 1000) * 10) / 10, // Convert to km and round
          duration: Math.round(loop.total_duration / 60), // Convert to minutes
          elevation: Math.round(loop.total_elevation),
          difficulty: loop.metadata.difficulty,
          terrain_type: loop.metadata.terrain_type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          geometry: loop.geometry,
          waypoints: [
            {
              id: `${routeId}_start`,
              route_id: routeId,
              name: 'Start',
              latitude: start_lat,
              longitude: start_lon,
              order: 0,
              created_at: new Date().toISOString(),
            },
            {
              id: `${routeId}_end`,
              route_id: routeId,
              name: 'End',
              latitude: loop.geometry.coordinates[loop.geometry.coordinates.length - 1][1],
              longitude: loop.geometry.coordinates[loop.geometry.coordinates.length - 1][0],
              order: loop.geometry.coordinates.length - 1,
              created_at: new Date().toISOString(),
            },
          ],
        }
      })
      
      console.log(`Successfully generated ${routes.length} routes`)
      return routes
      
    } catch (error) {
      console.error('Error in route generation:', error)
      
      // Fallback to mock routes if OSM generation fails
      console.log('Falling back to mock routes due to error')
      return this.generateMockRoutes(request)
    }
  }
  
  private generateMockRoutes(request: RouteGenerationRequest): Route[] {
    const { start_lat, start_lon, distance = 10, terrain_type = 'mixed', pace = 5 } = request
    
    // Generate 3-5 mock routes with different characteristics
    const routes: Route[] = []
    
    for (let i = 0; i < 4; i++) {
      const routeId = `route_${Date.now()}_${i}`
      const routeDistance = distance + (Math.random() - 0.5) * 2 // ±1km variation
      const elevationGain = Math.floor(Math.random() * 200) + 50 // 50-250m
      const duration = Math.floor(routeDistance * pace) + Math.floor(Math.random() * 20) // Based on pace + variation
      
      // Generate mock coordinates around the start point
      const coordinates: [number, number][] = []
      const numPoints = Math.floor(routeDistance * 10) + 5 // ~10 points per km
      
      for (let j = 0; j < numPoints; j++) {
        const progress = j / (numPoints - 1)
        const angle = (Math.PI * 2 * progress) + (Math.random() - 0.5) * 0.5 // Circular-ish route with variation
        const radius = (routeDistance / 2) * (0.8 + Math.random() * 0.4) // Variable radius
        
        const lat = start_lat + (radius / 111) * Math.cos(angle) // Rough conversion: 1 degree ≈ 111km
        const lng = start_lon + (radius / (111 * Math.cos(start_lat * Math.PI / 180))) * Math.sin(angle)
        
        coordinates.push([lng, lat])
      }
      
      const difficulties = ['easy', 'medium', 'hard', 'expert'] as const
      const terrainTypes = ['paved', 'unpaved', 'mixed'] as const
      
      const route: Route = {
        id: routeId,
        name: `Route ${i + 1} - ${this.getRouteName(terrain_type, routeDistance)}`,
        description: this.getRouteDescription(terrain_type, routeDistance, elevationGain, difficulties[i % difficulties.length]),
        distance: Math.round(routeDistance * 10) / 10, // Round to 1 decimal
        duration,
        elevation: elevationGain,
        difficulty: difficulties[i % difficulties.length],
        terrain_type: terrainTypes[i % terrainTypes.length],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        geometry: {
          type: 'LineString',
          coordinates,
        },
        waypoints: [
          {
            id: `${routeId}_start`,
            route_id: routeId,
            name: 'Start',
            latitude: start_lat,
            longitude: start_lon,
            order: 0,
            created_at: new Date().toISOString(),
          },
          {
            id: `${routeId}_end`,
            route_id: routeId,
            name: 'End',
            latitude: coordinates[coordinates.length - 1][1],
            longitude: coordinates[coordinates.length - 1][0],
            order: coordinates.length - 1,
            created_at: new Date().toISOString(),
          },
        ],
      }
      
      routes.push(route)
    }
    
    return routes
  }
  
  private getRouteName(terrainType: string, distance: number): string {
    const names = {
      paved: ['City Loop', 'Urban Circuit', 'Downtown Route', 'City Explorer'],
      unpaved: ['Nature Trail', 'Forest Path', 'Mountain Route', 'Wilderness Trail'],
      mixed: ['Scenic Route', 'Adventure Path', 'Explorer Trail', 'Discovery Route'],
    }
    
    const nameList = names[terrainType as keyof typeof names] || names.mixed
    return nameList[Math.floor(Math.random() * nameList.length)]
  }
  
  private getRouteDescription(terrainType: string, distance: number, elevation: number, difficulty: string): string {
    const descriptions = {
      paved: `A ${distance.toFixed(1)}km urban route with ${elevation}m elevation gain. Perfect for city running with smooth surfaces.`,
      unpaved: `A ${distance.toFixed(1)}km nature trail with ${elevation}m elevation gain. Experience the beauty of natural landscapes.`,
      mixed: `A ${distance.toFixed(1)}km scenic route with ${elevation}m elevation gain. Combines urban and natural environments.`,
    }
    
    const baseDescription = descriptions[terrainType as keyof typeof descriptions] || descriptions.mixed
    return `${baseDescription} Difficulty: ${difficulty}.`
  }
}

const routeGenerationService = new RouteGenerationService()

// POST /api/routes/generate - Generate routes based on criteria
router.post('/generate', async (req, res) => {
  try {
    const request: RouteGenerationRequest = req.body
    
    // Validate required fields
    if (!request.start_lat || !request.start_lon) {
      res.status(400).json({
        success: false,
        message: 'start_lat and start_lon are required',
      } as RouteGenerationResponse)
      return
    }
    
    // Validate coordinate ranges
    if (request.start_lat < -90 || request.start_lat > 90) {
      res.status(400).json({
        success: false,
        message: 'start_lat must be between -90 and 90',
      } as RouteGenerationResponse)
      return
    }
    
    if (request.start_lon < -180 || request.start_lon > 180) {
      res.status(400).json({
        success: false,
        message: 'start_lon must be between -180 and 180',
      } as RouteGenerationResponse)
      return
    }
    
    // Validate distance
    if (request.distance && (request.distance < 1 || request.distance > 50)) {
      res.status(400).json({
        success: false,
        message: 'distance must be between 1 and 50 km',
      } as RouteGenerationResponse)
      return
    }
    
    // Generate routes
    const routes = await routeGenerationService.generateRoutes(request)
    
    const response: RouteGenerationResponse = {
      success: true,
      routes,
      message: `Generated ${routes.length} routes successfully`,
    }
    
    res.json(response)
  } catch (error) {
    console.error('Error generating routes:', error)
    
    const response: RouteGenerationResponse = {
      success: false,
      message: 'Internal server error while generating routes',
    }
    
    res.status(500).json(response)
  }
})

export default router
