import request from 'supertest'
import app from '../index'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Auth Routes', () => {
  beforeAll(async () => {
    await prisma.$connect()
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
        email: 'test@example.com',
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
        email: 'test@example.com',
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
        email: 'test@example.com'
        // Missing password and name
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400)
    })

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)

      // Try to register with same email
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
    })

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
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
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401)
    })

    it('should return 400 for missing credentials', async () => {
      const loginData = {
        email: 'test@example.com'
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
      // Register and login to get tokens
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
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
      // Register and login to get tokens
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
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
