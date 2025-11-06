import { PrismaClient } from '@prisma/client'

// Mock Prisma Client pour éviter les problèmes de connexion DB en tests
// Le mock peut pointer vers ../src/db ou ../src/lib/prisma selon la structure
jest.mock('../src/db', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn()
    },
    route: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }
  
  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma,
    getDatabase: jest.fn(() => mockPrisma),
    connectDatabase: jest.fn(() => Promise.resolve(mockPrisma))
  }
})

// Cleanup global après chaque test
afterEach(() => {
  jest.clearAllMocks()
})

// Cleanup après tous les tests
afterAll(() => {
  jest.restoreAllMocks()
})
