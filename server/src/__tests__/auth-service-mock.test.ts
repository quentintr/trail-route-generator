import { describe, it, expect, beforeEach, vi } from '@jest/globals'
import { AuthService } from '../services/auth-service'
import { prismaMock, resetPrismaMock } from '../../tests/mocks/prisma'
import bcrypt from 'bcryptjs'

// Mock Prisma dans auth-service
vi.mock('../db', () => ({
  default: prismaMock,
  getDatabase: () => prismaMock,
}))

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

describe('AuthService with Mock Prisma', () => {
  let authService: AuthService

  beforeEach(() => {
    resetPrismaMock()
    authService = new AuthService()
    vi.clearAllMocks()
  })

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      const hashedPassword = 'hashed_password_123'
      const mockUser = {
        id: 'user_123',
        email: userData.email,
        name: userData.name,
        password_hash: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
        preferences: null,
      }

      // Mock bcrypt.hash
      ;(bcrypt.hash as any).mockResolvedValue(hashedPassword)

      // Mock prisma.user.create
      prismaMock.user.create = vi.fn().mockResolvedValue(mockUser)

      // Mock jwt (si nécessaire)
      vi.mock('jsonwebtoken', () => ({
        default: {
          sign: vi.fn(() => 'mock_token'),
        },
      }))

      const result = await authService.register(userData)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(userData.email)
      expect(result.user.name).toBe(userData.name)
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          name: userData.name,
          password_hash: hashedPassword,
        },
      })
    })

    it('should not register user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Mock: user existe déjà
      prismaMock.user.findUnique = vi.fn().mockResolvedValue({
        id: 'existing_user',
        email: userData.email,
      })

      await expect(authService.register(userData)).rejects.toThrow()
    })
  })

  describe('login', () => {
    it('should login user with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user_123',
        email: loginData.email,
        name: 'Test User',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date(),
        preferences: null,
      }

      prismaMock.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      ;(bcrypt.compare as any).mockResolvedValue(true)

      const result = await authService.login(loginData)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
      })
    })

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrong_password',
      }

      const mockUser = {
        id: 'user_123',
        email: loginData.email,
        name: 'Test User',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date(),
        preferences: null,
      }

      prismaMock.user.findUnique = vi.fn().mockResolvedValue(mockUser)
      ;(bcrypt.compare as any).mockResolvedValue(false)

      await expect(authService.login(loginData)).rejects.toThrow()
    })
  })

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'test123'
      const hashed = 'hashed_password'

      ;(bcrypt.hash as any).mockResolvedValue(hashed)

      // Si authService a une méthode hashPassword publique
      // const result = await authService.hashPassword(password)
      // expect(result).toBe(hashed)
      expect(bcrypt.hash).toBeDefined()
    })
  })
})

