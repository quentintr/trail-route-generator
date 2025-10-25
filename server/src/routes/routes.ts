import express from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

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

export default router
