import { AuthService } from '../services/auth-service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(async () => {
    authService = new AuthService()
    // Clean up test data
    await prisma.user.deleteMany()
  })

  afterEach(async () => {
    await prisma.user.deleteMany()
  })

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test1@example.com',
        password: 'password123',
        name: 'Test User'
      }

      const result = await authService.register(userData)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe('test1@example.com')
      expect(result.tokens).toBeDefined()
      expect(result.tokens.accessToken).toBeDefined()
      expect(result.tokens.refreshToken).toBeDefined()
    })

    it('should hash password before storing', async () => {
      const userData = {
        email: 'test2@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await authService.register(userData)

      const user = await prisma.user.findUnique({
        where: { email: 'test2@example.com' }
      })

      expect(user).toBeDefined()
      expect(user?.password_hash).not.toBe('password123')
      expect(user?.password_hash).toMatch(/^\$2[aby]\$\d+\$/)
    })

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'test3@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await authService.register(userData)

      await expect(authService.register(userData)).rejects.toThrow('User already exists')
    })

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      }

      await expect(authService.register(userData)).rejects.toThrow()
    })

    it('should validate password strength', async () => {
      const userData = {
        email: 'test4@example.com',
        password: '123',
        name: 'Test User'
      }

      await expect(authService.register(userData)).rejects.toThrow()
    })
  })

  describe('login', () => {
    beforeEach(async () => {
      const userData = {
        email: 'test5@example.com',
        password: 'password123',
        name: 'Test User'
      }
      await authService.register(userData)
    })

    it('should login with valid credentials', async () => {
      const result = await authService.login({ email: 'test5@example.com', password: 'password123' })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe('test5@example.com')
      expect(result.tokens).toBeDefined()
      expect(result.tokens.accessToken).toBeDefined()
      expect(result.tokens.refreshToken).toBeDefined()
    })

    it('should reject invalid email', async () => {
      await expect(authService.login({ email: 'wrong@example.com', password: 'password123' })).rejects.toThrow('Invalid credentials')
    })

    it('should reject invalid password', async () => {
      await expect(authService.login({ email: 'test5@example.com', password: 'wrongpassword' })).rejects.toThrow('Invalid credentials')
    })
  })

  describe('verifyToken', () => {
    let tokens: { accessToken: string; refreshToken: string }

    beforeEach(async () => {
      const userData = {
        email: 'test6@example.com',
        password: 'password123',
        name: 'Test User'
      }
      const result = await authService.register(userData)
      tokens = result.tokens
    })

    it('should verify valid access token', async () => {
      const payload = await authService.verifyToken(tokens.accessToken)

      expect(payload).toBeDefined()
      expect(payload.userId).toBeDefined()
      expect(payload.email).toBe('test6@example.com')
    })

    it('should reject invalid token', async () => {
      await expect(authService.verifyToken('invalid-token')).rejects.toThrow('Invalid token')
    })

    it('should reject expired token', async () => {
      // Create a token with very short expiry for testing
      const shortExpiryToken = authService.generateToken({ userId: 'test', email: 'test@example.com' }, '1ms')
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await expect(authService.verifyToken(shortExpiryToken)).rejects.toThrow('Token expired')
    })
  })

  describe('refreshToken', () => {
    let tokens: { accessToken: string; refreshToken: string }

    beforeEach(async () => {
      const userData = {
        email: 'test7@example.com',
        password: 'password123',
        name: 'Test User'
      }
      const result = await authService.register(userData)
      tokens = result.tokens
    })

    it('should refresh valid refresh token', async () => {
      // Add a delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100))

      const newTokens = await authService.refreshToken(tokens.refreshToken)

      expect(newTokens).toBeDefined()
      expect(newTokens.accessToken).toBeDefined()
      expect(newTokens.refreshToken).toBeDefined()
    })

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-refresh-token')).rejects.toThrow('Invalid refresh token')
    })

    it('should reject expired refresh token', async () => {
      // Create an expired refresh token
      const expiredToken = authService.generateToken({ userId: 'test', email: 'test@example.com' }, '1ms')
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await expect(authService.refreshToken(expiredToken)).rejects.toThrow('Refresh token expired')
    })
  })

  describe('logout', () => {
    let tokens: { accessToken: string; refreshToken: string }

    beforeEach(async () => {
      const userData = {
        email: 'test8@example.com',
        password: 'password123',
        name: 'Test User'
      }
      const result = await authService.register(userData)
      tokens = result.tokens
    })

    it('should logout successfully', async () => {
      const result = await authService.logout(tokens.refreshToken)

      expect(result.success).toBe(true)
    })

    it('should invalidate refresh token after logout', async () => {
      await authService.logout(tokens.refreshToken)

      await expect(authService.refreshToken(tokens.refreshToken)).rejects.toThrow('Invalid refresh token')
    })
  })
})
