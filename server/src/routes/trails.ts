import express from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const createTrailSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  distance: z.number().positive('La distance doit être positive'),
  duration: z.number().positive('La durée doit être positive'),
  elevation: z.number().min(0, 'L\'élévation ne peut pas être négative'),
  startLatitude: z.number().min(-90).max(90),
  startLongitude: z.number().min(-180).max(180),
  endLatitude: z.number().min(-90).max(90),
  endLongitude: z.number().min(-180).max(180)
})

const updateTrailSchema = createTrailSchema.partial()

// Get all trails
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

    const [trails, total] = await Promise.all([
      prisma.trail.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder
        },
        include: {
          reviews: {
            select: {
              rating: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        }
      }),
      prisma.trail.count({ where })
    ])

    // Calculate average ratings
    const trailsWithRatings = trails.map(trail => ({
      ...trail,
      averageRating: trail.reviews.length > 0 
        ? trail.reviews.reduce((sum, review) => sum + review.rating, 0) / trail.reviews.length
        : 0,
      reviewCount: trail._count.reviews
    }))

    res.json({
      trails: trailsWithRatings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get trails error:', error)
    res.status(500).json({
      error: 'Erreur lors du chargement des sentiers'
    })
  }
})

// Get trail by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const trail = await prisma.trail.findUnique({
      where: { id },
      include: {
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

    if (!trail) {
      return res.status(404).json({
        error: 'Sentier non trouvé'
      })
    }

    // Calculate average rating
    const averageRating = trail.reviews.length > 0 
      ? trail.reviews.reduce((sum, review) => sum + review.rating, 0) / trail.reviews.length
      : 0

    res.json({
      ...trail,
      averageRating,
      reviewCount: trail._count.reviews
    })
  } catch (error) {
    console.error('Get trail error:', error)
    res.status(500).json({
      error: 'Erreur lors du chargement du sentier'
    })
  }
})

// Create trail
router.post('/', async (req, res) => {
  try {
    const data = createTrailSchema.parse(req.body)

    const trail = await prisma.trail.create({
      data: {
        ...data,
        startPoint: {
          type: 'Point',
          coordinates: [data.startLongitude, data.startLatitude]
        },
        endPoint: {
          type: 'Point',
          coordinates: [data.endLongitude, data.endLatitude]
        }
      }
    })

    res.status(201).json({
      message: 'Sentier créé avec succès',
      trail
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      })
    }

    console.error('Create trail error:', error)
    res.status(500).json({
      error: 'Erreur lors de la création du sentier'
    })
  }
})

// Update trail
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = updateTrailSchema.parse(req.body)

    const updateData: any = { ...data }
    
    if (data.startLatitude && data.startLongitude) {
      updateData.startPoint = {
        type: 'Point',
        coordinates: [data.startLongitude, data.startLatitude]
      }
    }
    
    if (data.endLatitude && data.endLongitude) {
      updateData.endPoint = {
        type: 'Point',
        coordinates: [data.endLongitude, data.endLatitude]
      }
    }

    const trail = await prisma.trail.update({
      where: { id },
      data: updateData
    })

    res.json({
      message: 'Sentier mis à jour avec succès',
      trail
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      })
    }

    console.error('Update trail error:', error)
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du sentier'
    })
  }
})

// Delete trail
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.trail.delete({
      where: { id }
    })

    res.json({
      message: 'Sentier supprimé avec succès'
    })
  } catch (error) {
    console.error('Delete trail error:', error)
    res.status(500).json({
      error: 'Erreur lors de la suppression du sentier'
    })
  }
})

export default router
