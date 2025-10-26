import { z } from 'zod'

// User registration schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

// User login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// Route generation schema
export const routeGenerationSchema = z.object({
  start_lat: z.number().min(-90).max(90),
  start_lon: z.number().min(-180).max(180),
  distance: z.number().min(1).max(100).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  terrain_type: z.enum(['paved', 'unpaved', 'mixed']).optional(),
  elevation_gain: z.number().min(0).max(5000).optional(),
})

// User preferences schema
export const userPreferencesSchema = z.object({
  difficulty_level: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  preferred_terrain: z.enum(['paved', 'unpaved', 'mixed']).optional(),
  max_distance: z.number().min(1).max(100).optional(),
  max_duration: z.number().min(1).max(1440).optional(), // Max 24 hours in minutes
})

// Route save schema
export const routeSaveSchema = z.object({
  routeId: z.string().min(1, 'Route ID is required'),
})
