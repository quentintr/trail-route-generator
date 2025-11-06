import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import routesRouter from '../../src/routes/routes.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/routes', routesRouter)

describe('Routes API Integration', () => {
  describe('POST /api/routes/generate', () => {
    it('should generate routes with valid parameters', async () => {
      const response = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 43.5781632,
          start_lon: 1.4516224,
          distance: 10,
          pace: 5,
          terrain_type: 'mixed'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.routes).toBeDefined()
      expect(Array.isArray(response.body.routes)).toBe(true)
      expect(response.body.routes.length).toBeGreaterThan(0)
      expect(response.body.routes.length).toBeLessThanOrEqual(3)
    }, 30000) // Timeout de 30 secondes pour la génération

    it('should return routes with required fields', async () => {
      const response = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 43.5781632,
          start_lon: 1.4516224,
          distance: 8,
          pace: 5,
          terrain_type: 'mixed'
        })
        .expect(200)

      const route = response.body.routes[0]

      expect(route).toHaveProperty('id')
      expect(route).toHaveProperty('name')
      expect(route).toHaveProperty('distance')
      expect(route).toHaveProperty('duration')
      expect(route).toHaveProperty('elevation_gain')
      expect(route).toHaveProperty('geometry')
      expect(route).toHaveProperty('quality_score')
      expect(route.geometry).toHaveProperty('type', 'LineString')
      expect(route.geometry).toHaveProperty('coordinates')
    }, 30000)

    it('should reject request with missing parameters', async () => {
      const response = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 43.5781632,
          // Manque start_lon
          distance: 10,
          pace: 5
        })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject request with invalid coordinates', async () => {
      const response = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 200, // Latitude invalide
          start_lon: 400, // Longitude invalide
          distance: 10,
          pace: 5
        })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject request with distance out of range', async () => {
      // Distance trop petite
      const response1 = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 43.5781632,
          start_lon: 1.4516224,
          distance: 0.5, // < 1 km
          pace: 5
        })
        .expect(400)

      expect(response1.body.error).toBeDefined()

      // Distance trop grande
      const response2 = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 43.5781632,
          start_lon: 1.4516224,
          distance: 100, // > 50 km
          pace: 5
        })
        .expect(400)

      expect(response2.body.error).toBeDefined()
    })

    it('should handle distance edge cases', async () => {
      // Distance minimale
      const response1 = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 43.5781632,
          start_lon: 1.4516224,
          distance: 1,
          pace: 5,
          terrain_type: 'mixed'
        })
        .expect(200)

      expect(response1.body.routes.length).toBeGreaterThan(0)
    }, 30000)

    it('should return routes with valid quality scores (0-1)', async () => {
      const response = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 43.5781632,
          start_lon: 1.4516224,
          distance: 6,
          pace: 5,
          terrain_type: 'mixed'
        })
        .expect(200)

      response.body.routes.forEach((route: any) => {
        expect(route.quality_score).toBeGreaterThanOrEqual(0)
        expect(route.quality_score).toBeLessThanOrEqual(1)
      })
    }, 30000)

    it('should return routes with valid geometry structure', async () => {
      const response = await request(app)
        .post('/api/routes/generate')
        .send({
          start_lat: 43.5781632,
          start_lon: 1.4516224,
          distance: 5,
          pace: 5,
          terrain_type: 'mixed'
        })
        .expect(200)

      response.body.routes.forEach((route: any) => {
        expect(route.geometry.type).toBe('LineString')
        expect(Array.isArray(route.geometry.coordinates)).toBe(true)
        expect(route.geometry.coordinates.length).toBeGreaterThan(10) // Au moins 10 points

        route.geometry.coordinates.forEach((coord: number[]) => {
          expect(coord.length).toBe(2)
          expect(typeof coord[0]).toBe('number') // longitude
          expect(typeof coord[1]).toBe('number') // latitude
        })
      })
    }, 30000)
  })
})

