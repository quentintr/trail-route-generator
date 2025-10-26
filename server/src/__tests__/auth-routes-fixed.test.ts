import request from 'supertest'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { connectDatabase } from '../db'
import { errorHandler, notFoundHandler } from '../middleware/error-handler'
import authRoutes from '../routes/api/v1/auth'

const prisma = new PrismaClient()

// Create test app without starting server
const createTestApp = () => {
  const app = express()

  // Middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Routes
  app.use('/api/v1/auth', authRoutes)

  // Error handling
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

describe('Auth Routes', () => {
  let app: express.Application

  beforeAll(async () => {
    await connectDatabase()
    app = createTestApp()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test1@example.com',
        password: 'password123',
        name: 'Test User'
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.user).toBeDefined()
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.name).toBe(userData.name)
      expect(response.body.user.password).toBeUndefined()
      expect(response.body.tokens).toBeDefined()
      expect(response.body.tokens.accessToken).toBeDefined()
      expect(response.body.tokens.refreshToken).toBeDefined()
    })

    it('should return 400 for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400)
    })

    it('should return 400 for weak password', async () => {
      const userData = {
        email: 'test2@example.com',
        password: '123',
        name: 'Test User'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400)
    })

    it('should return 400 for missing required fields', async () => {
      const userData = {
        email: 'test3@example.com'
        // Missing password and name
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400)
    })

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'test4@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Register first time
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)

      // Try to register again with same email
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      const userData = {
        email: 'test5@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
    })

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test5@example.com',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.user).toBeDefined()
      expect(response.body.user.email).toBe(loginData.email)
      expect(response.body.tokens).toBeDefined()
      expect(response.body.tokens.accessToken).toBeDefined()
      expect(response.body.tokens.refreshToken).toBeDefined()
    })

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'password123'
      }

      await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401)
    })

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'test5@example.com',
        password: 'wrongpassword'
      }

      await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401)
    })

    it('should return 400 for missing credentials', async () => {
      const loginData = {
        email: 'test5@example.com'
        // Missing password
      }

      await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(400)
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string

    beforeEach(async () => {
      // Clean up any existing users first
      await prisma.user.deleteMany()
      
      // Register and login to get tokens
      const userData = {
        email: 'test6@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test6@example.com',
          password: 'password123'
        })

      refreshToken = loginResponse.body.tokens.refreshToken
    })

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.tokens).toBeDefined()
      expect(response.body.tokens.accessToken).toBeDefined()
      expect(response.body.tokens.refreshToken).toBeDefined()
    })

    it('should return 401 for invalid refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)
    })

    it('should return 400 for missing refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400)
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    let refreshToken: string

    beforeEach(async () => {
      // Clean up any existing users first
      await prisma.user.deleteMany()
      
      // Register and login to get tokens
      const userData = {
        email: 'test7@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test7@example.com',
          password: 'password123'
        })

      refreshToken = loginResponse.body.tokens.refreshToken
    })

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Logged out successfully')
    })

    it('should return 401 for invalid refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)
    })

    it('should return 400 for missing refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .send({})
        .expect(400)
    })
  })
})
