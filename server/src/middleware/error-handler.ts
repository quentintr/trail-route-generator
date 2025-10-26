import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

/**
 * Custom error class for application errors
 */
export class CustomError extends Error implements AppError {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false
  error: string
  message: string
  details?: any
  timestamp: string
  path: string
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal Server Error'
  let details: any = undefined

  // Log error for debugging
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // Handle specific error types
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409
        message = 'Resource already exists'
        details = { field: error.meta?.target }
        break
      case 'P2025':
        statusCode = 404
        message = 'Resource not found'
        break
      case 'P2003':
        statusCode = 400
        message = 'Invalid reference to related resource'
        break
      default:
        statusCode = 500
        message = 'Database operation failed'
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400
    message = 'Invalid data provided'
    details = { validation: error.message }
  } else if (error.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation failed'
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401
    message = 'Authentication required'
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403
    message = 'Access denied'
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    message = 'Something went wrong'
    details = undefined
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: getErrorName(statusCode),
    message,
    timestamp: new Date().toISOString(),
    path: req.path
  }

  if (details) {
    errorResponse.details = details
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * Get error name based on status code
 */
function getErrorName(statusCode: number): string {
  const errorNames: { [key: number]: string } = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  }
  
  return errorNames[statusCode] || 'Unknown Error'
}

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    path: req.path
  })
}

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
