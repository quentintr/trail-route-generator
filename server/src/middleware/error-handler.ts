import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class CustomError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  })
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler caught:', err)

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    })
  }

  // Custom application errors
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    })
  }

  // Authentication errors
  if (err.message === 'Not authenticated' || err.message === 'Authentication required') {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required' 
    })
  }

  if (err.message === 'Not authorized') {
    return res.status(403).json({ 
      success: false,
      message: 'Not authorized to perform this action' 
    })
  }

  // Auth service specific errors
  if (err.message === 'Invalid credentials') {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid credentials' 
    })
  }

  if (err.message === 'User already exists') {
    return res.status(409).json({ 
      success: false,
      message: 'User already exists' 
    })
  }

  if (err.message === 'User not found') {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid credentials' 
    })
  }

  if (err.message === 'Invalid refresh token' || err.message === 'Refresh token expired') {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid refresh token' 
    })
  }

  if (err.message === 'Token expired') {
    return res.status(401).json({ 
      success: false,
      message: 'Token expired' 
    })
  }

  if (err.message === 'Invalid token') {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    })
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
}
