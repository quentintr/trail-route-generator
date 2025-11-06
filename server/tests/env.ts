// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:./test.db'
process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-do-not-use-in-production'
process.env.JWT_EXPIRES_IN = '15m'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'

