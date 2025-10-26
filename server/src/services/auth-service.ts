import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface UserData {
  email: string
  password: string
  name: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResult {
  success: boolean
  user: {
    id: string
    email: string
    name: string
  }
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export interface TokenPayload {
  userId: string
  email: string
  type?: 'access' | 'refresh'
}

export class AuthService {
  private readonly JWT_SECRET: string
  private readonly ACCESS_TOKEN_EXPIRY = '24h'
  private readonly REFRESH_TOKEN_EXPIRY = '7d'
  private readonly blacklistedTokens: Set<string> = new Set()

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
    if (this.JWT_SECRET === 'fallback-secret-key') {
      console.warn('⚠️  Using fallback JWT secret. Set JWT_SECRET in environment variables for production.')
    }
  }

  async register(userData: UserData): Promise<AuthResult> {
    // Validate input
    this.validateUserData(userData)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password_hash: hashedPassword,
        name: userData.name,
        preferences: {}
      }
    })

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      tokens
    }
  }

  async login(loginData: LoginData): Promise<AuthResult> {
    // Validate input
    this.validateLoginData(loginData)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: loginData.email }
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginData.password, user.password_hash)
    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      tokens
    }
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(token)) {
        throw new Error('Token has been invalidated')
      }

      const payload = jwt.verify(token, this.JWT_SECRET) as TokenPayload
      return payload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      } else {
        throw error
      }
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(refreshToken)) {
        throw new Error('Invalid refresh token')
      }

      const payload = jwt.verify(refreshToken, this.JWT_SECRET) as TokenPayload

      if (payload.type !== 'refresh') {
        throw new Error('Invalid refresh token')
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Blacklist the old refresh token
      this.blacklistedTokens.add(refreshToken)

      // Generate new tokens
      return this.generateTokens({
        userId: user.id,
        email: user.email
      })
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token')
      } else {
        throw error
      }
    }
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      const payload = jwt.verify(refreshToken, this.JWT_SECRET) as TokenPayload

      if (payload.type !== 'refresh') {
        throw new Error('Invalid refresh token')
      }

      // Add token to blacklist
      this.blacklistedTokens.add(refreshToken)

      return { success: true }
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  private generateTokens(payload: Omit<TokenPayload, 'type'>): { accessToken: string; refreshToken: string } {
    const accessToken = this.generateToken({
      ...payload,
      type: 'access'
    }, this.ACCESS_TOKEN_EXPIRY)

    const refreshToken = this.generateToken({
      ...payload,
      type: 'refresh'
    }, this.REFRESH_TOKEN_EXPIRY)

    return { accessToken, refreshToken }
  }

  generateToken(payload: TokenPayload, expiresIn: string): string {
    // Add timestamp to payload to ensure different tokens
    const payloadWithTimestamp = {
      ...payload,
      iat: Math.floor(Date.now() / 1000)
    }
    return jwt.sign(payloadWithTimestamp, this.JWT_SECRET, { expiresIn })
  }

  private validateUserData(userData: UserData): void {
    if (!userData.email || !userData.password || !userData.name) {
      throw new Error('Email, password, and name are required')
    }

    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format')
    }

    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    if (userData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters')
    }
  }

  private validateLoginData(loginData: LoginData): void {
    if (!loginData.email || !loginData.password) {
      throw new Error('Email and password are required')
    }

    if (!this.isValidEmail(loginData.email)) {
      throw new Error('Invalid email format')
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}
