import { beforeAll, afterAll } from '@jest/globals'
import { PrismaClient } from '@prisma/client'

// Global test setup
beforeAll(async () => {
  // Set up test environment
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/trail_route_generator_test'
})

afterAll(async () => {
  // Clean up after all tests
  const prisma = new PrismaClient()
  await prisma.$disconnect()
})


