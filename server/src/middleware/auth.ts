import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/auth-service'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string
      }
    }
  }
}

const authService = new AuthService()

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. Please provide a valid token.' 
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. Please provide a valid token.' 
      })
    }

    // Verify the token
    const payload = await authService.verifyToken(token)
    
    if (payload.type !== 'access') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token type. Access token required.' 
      })
    }

    // Get user details from database
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found. Please login again.' 
      })
    }

    // Attach user to request
    req.user = user
    
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        return res.status(401).json({ 
          success: false,
          message: 'Token expired. Please refresh your token.' 
        })
      } else if (error.message === 'Invalid token') {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token. Please login again.' 
        })
      }
    }

    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed. Please login again.' 
    })
  }
}

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next() // Continue without user
    }

    const token = authHeader.substring(7)
    
    if (!token) {
      return next() // Continue without user
    }

    // Try to verify the token
    const payload = await authService.verifyToken(token)
    
    if (payload.type !== 'access') {
      return next() // Continue without user
    }

    // Get user details from database
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    if (user) {
      req.user = user
    }
    
    next()
  } catch (error) {
    // Continue without user if token is invalid
    next()
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required' 
    })
  }
  next()
}
