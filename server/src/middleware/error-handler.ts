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
  if (err.message === 'Not authenticated') {
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

  // Default error response
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
}
