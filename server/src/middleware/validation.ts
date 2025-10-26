import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// Validation schemas
export const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lon: z.number().min(-180).max(180, 'Longitude must be between -180 and 180')
})

export const generateRouteSchema = z.object({
  lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lon: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  distance: z.number().min(1, 'Distance must be at least 1km').max(50, 'Distance cannot exceed 50km'),
  pace: z.enum(['slow', 'moderate', 'fast']).optional().default('moderate'),
  terrain_type: z.enum(['urban', 'trail', 'mixed']).optional().default('mixed'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional().default('medium'),
  max_variants: z.number().int().min(1).max(5).optional().default(3)
})

export const routeIdSchema = z.object({
  id: z.string().uuid('Invalid route ID format')
})

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
  terrain_type: z.enum(['urban', 'trail', 'mixed']).optional(),
  min_distance: z.string().regex(/^\d+$/).transform(Number).optional(),
  max_distance: z.string().regex(/^\d+$/).transform(Number).optional()
})

// Validation middleware factory
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        ...req.body,
        ...req.params,
        ...req.query
      })
      
      // Merge validated data back to request
      req.body = { ...req.body, ...validatedData }
      req.params = { ...req.params, ...validatedData }
      req.query = { ...req.query, ...validatedData }
      
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }
      
      next(error)
    }
  }
}

// Specific validation middlewares
export const validateGenerateRoute = validateRequest(generateRouteSchema)
export const validateRouteId = validateRequest(routeIdSchema)
export const validatePagination = validateRequest(paginationSchema)
