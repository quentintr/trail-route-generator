import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
      }
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any
    
    req.user = {
      id: decoded.id,
      email: decoded.email
    }
    
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next() // Continue without user
    }

    const token = authHeader.substring(7)
    
    if (!process.env.JWT_SECRET) {
      return next() // Continue without user if JWT_SECRET not configured
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any
    
    req.user = {
      id: decoded.id,
      email: decoded.email
    }
    
    next()
  } catch (error) {
    next() // Continue without user if token is invalid
  }
}
