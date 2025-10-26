/**
 * Tests for loop generation algorithm
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { LoopGenerator, LoopGenerationOptions, LoopGenerationUtils } from '../algorithms/loop-generator'
import { WeightedGraph, GraphNode, GraphEdge } from '../services/graph-builder'

// Mock the graph builder
jest.mock('../services/graph-builder', () => ({
  GraphBuilder: jest.fn().mockImplementation(() => ({
    buildGraph: jest.fn().mockResolvedValue({
      nodes: new Map([
        ['A', { id: 'A', lat: 0, lon: 0, connections: ['B', 'D'] }],
        ['B', { id: 'B', lat: 1, lon: 0, connections: ['A', 'C'] }],
        ['C', { id: 'C', lat: 1, lon: 1, connections: ['B', 'D'] }],
        ['D', { id: 'D', lat: 0, lon: 1, connections: ['A', 'C'] }]
      ]),
      edges: new Map([
        ['A-B', { id: 'A-B', from: 'A', to: 'B', distance: 2500, surface: 'paved', highway_type: 'footway', weight: 2500 }],
        ['B-C', { id: 'B-C', from: 'B', to: 'C', distance: 2500, surface: 'paved', highway_type: 'footway', weight: 2500 }],
        ['C-D', { id: 'C-D', from: 'C', to: 'D', distance: 2500, surface: 'paved', highway_type: 'footway', weight: 2500 }],
        ['D-A', { id: 'D-A', from: 'D', to: 'A', distance: 2500, surface: 'paved', highway_type: 'footway', weight: 2500 }]
      ]),
      nodeConnections: new Map([
        ['A', ['B', 'D']],
        ['B', ['A', 'C']],
        ['C', ['B', 'D']],
        ['D', ['A', 'C']]
      ])
    })
  }))
}))

// Mock the OSM service
jest.mock('../services/osm-service', () => ({
  osmService: {
    getRunningPaths: jest.fn().mockResolvedValue({
      features: [
        {
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
          },
          properties: {
            highway: 'footway',
            surface: 'paved'
          }
        }
      ]
    })
  }
}))


describe('Loop Generator', () => {
  let options: LoopGenerationOptions

  beforeEach(() => {
    options = {
      targetDistance: 10000, // 10km
      startLat: 0.5,
      startLon: 0.5,
      tolerance: 0.05,
      maxVariants: 3,
      includeSecondary: true
    }
  })

  describe('LoopGenerator', () => {
    it('should generate loops successfully', async () => {
      const generator = new LoopGenerator(options)
      const result = await generator.generateLoops()
      
      expect(result.success).toBe(true)
      expect(result.loops.length).toBeGreaterThan(0)
      expect(result.stats.totalNodes).toBeGreaterThan(0)
      expect(result.stats.totalEdges).toBeGreaterThan(0)
    })

    it('should handle invalid start point', async () => {
      const invalidOptions = {
        ...options,
        startLat: 999, // Invalid latitude
        startLon: 999  // Invalid longitude
      }
      
      const generator = new LoopGenerator(invalidOptions)
      const result = await generator.generateLoops()
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should respect max variants', async () => {
      const generator = new LoopGenerator(options)
      const result = await generator.generateLoops()
      
      expect(result.loops.length).toBeLessThanOrEqual(options.maxVariants)
    })

    it('should generate loops with quality scores', async () => {
      const generator = new LoopGenerator(options)
      const result = await generator.generateLoops()
      
      if (result.success && result.loops.length > 0) {
        const loop = result.loops[0]
        expect(loop.quality_score).toBeGreaterThanOrEqual(0)
        expect(loop.quality_score).toBeLessThanOrEqual(1)
        expect(loop.total_distance).toBeGreaterThan(0)
        expect(loop.geometry.length).toBeGreaterThan(0)
      }
    })

    it('should handle empty graph', async () => {
      // Mock empty graph
      const emptyGraph: WeightedGraph = {
        nodes: new Map(),
        edges: new Map(),
        nodeConnections: new Map()
      }

      // Override the mock for this test
      const { GraphBuilder } = await import('../services/graph-builder')
      const mockBuildGraph = jest.fn().mockResolvedValue(emptyGraph)
      ;(GraphBuilder as any).mockImplementation(() => ({
        buildGraph: mockBuildGraph
      }))

      const generator = new LoopGenerator(options)
      const result = await generator.generateLoops()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('No valid paths found')
    })

    it('should handle isolated start point', async () => {
      // Mock graph with isolated start point
      const isolatedGraph: WeightedGraph = {
        nodes: new Map([
          ['A', { id: 'A', lat: 0.5, lon: 0.5, connections: [] }], // Isolated node at start position
          ['B', { id: 'B', lat: 1, lon: 1, connections: ['C'] }],
          ['C', { id: 'C', lat: 2, lon: 2, connections: ['B'] }]
        ]),
        edges: new Map([
          ['B-C', { id: 'B-C', from: 'B', to: 'C', distance: 2500, surface: 'paved', highway_type: 'footway', weight: 2500 }]
        ]),
        nodeConnections: new Map([
          ['A', []], // No connections for A
          ['B', ['C']],
          ['C', ['B']]
        ])
      }

      // Override the mock for this test
      const { GraphBuilder } = await import('../services/graph-builder')
      const mockBuildGraph = jest.fn().mockResolvedValue(isolatedGraph)
      ;(GraphBuilder as any).mockImplementation(() => ({
        buildGraph: mockBuildGraph
      }))

      const generator = new LoopGenerator(options)
      const result = await generator.generateLoops()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Start point is not accessible')
    })
  })

  describe('LoopGenerationUtils', () => {
    it('should create default options', () => {
      const defaultOptions = LoopGenerationUtils.createDefaultOptions(10000, 0, 0)
      
      expect(defaultOptions.targetDistance).toBe(10000)
      expect(defaultOptions.startLat).toBe(0)
      expect(defaultOptions.startLon).toBe(0)
      expect(defaultOptions.tolerance).toBe(0.05)
      expect(defaultOptions.maxVariants).toBe(5)
      expect(defaultOptions.includeSecondary).toBe(true)
    })

    it('should validate options correctly', () => {
      const validOptions = LoopGenerationUtils.createDefaultOptions(10000, 0, 0)
      const errors = LoopGenerationUtils.validateOptions(validOptions)
      
      expect(errors.length).toBe(0)
    })

    it('should detect invalid target distance', () => {
      const invalidOptions = {
        ...options,
        targetDistance: -1000
      }
      
      const errors = LoopGenerationUtils.validateOptions(invalidOptions)
      expect(errors).toContain('Target distance must be positive')
    })

    it('should detect invalid coordinates', () => {
      const invalidOptions = {
        ...options,
        startLat: 999,
        startLon: 999
      }
      
      const errors = LoopGenerationUtils.validateOptions(invalidOptions)
      expect(errors).toContain('Start latitude must be between -90 and 90')
      expect(errors).toContain('Start longitude must be between -180 and 180')
    })

    it('should detect invalid tolerance', () => {
      const invalidOptions = {
        ...options,
        tolerance: 1.5
      }
      
      const errors = LoopGenerationUtils.validateOptions(invalidOptions)
      expect(errors).toContain('Tolerance must be between 0 and 1')
    })

    it('should detect invalid max variants', () => {
      const invalidOptions = {
        ...options,
        maxVariants: 15
      }
      
      const errors = LoopGenerationUtils.validateOptions(invalidOptions)
      expect(errors).toContain('Max variants must be between 1 and 10')
    })

    it('should format loop for display', () => {
      const mockLoop = {
        id: 'test_loop',
        total_distance: 10000,
        total_duration: 3600,
        total_elevation: 100,
        quality_score: 0.85,
        geometry: [[0, 0], [1, 1]],
        segments: [],
        exploration_path: [],
        return_path: [],
        used_edges: new Set()
      }
      
      const formatted = LoopGenerationUtils.formatLoop(mockLoop)
      
      expect(formatted).toContain('test_loop')
      expect(formatted).toContain('10.00km')
      expect(formatted).toContain('60.0min')
      expect(formatted).toContain('100m')
      expect(formatted).toContain('85.0%')
    })

    it('should export loop as GeoJSON', () => {
      const mockLoop = {
        id: 'test_loop',
        total_distance: 10000,
        total_duration: 3600,
        total_elevation: 100,
        quality_score: 0.85,
        geometry: [[0, 0], [1, 1]],
        segments: [],
        exploration_path: [],
        return_path: [],
        used_edges: new Set()
      }
      
      const geoJson = LoopGenerationUtils.exportAsGeoJSON(mockLoop)
      
      expect(geoJson.type).toBe('FeatureCollection')
      expect(geoJson.features).toHaveLength(1)
      expect(geoJson.features[0].geometry.type).toBe('LineString')
      expect(geoJson.features[0].properties.id).toBe('test_loop')
    })
  })

  describe('Performance Tests', () => {
    it('should complete generation within reasonable time', async () => {
      const startTime = Date.now()
      const generator = new LoopGenerator(options)
      const result = await generator.generateLoops()
      const endTime = Date.now()
      
      const duration = endTime - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      
      if (result.success) {
        expect(result.stats.generationTime).toBeLessThan(5000)
      }
    })

    it('should handle large target distances', async () => {
      const largeDistanceOptions = {
        ...options,
        targetDistance: 50000 // 50km
      }
      
      const generator = new LoopGenerator(largeDistanceOptions)
      const result = await generator.generateLoops()
      
      // Should either succeed or fail gracefully
      expect(result.success !== undefined).toBe(true)
    })

    it('should handle small target distances', async () => {
      const smallDistanceOptions = {
        ...options,
        targetDistance: 1000 // 1km
      }
      
      const generator = new LoopGenerator(smallDistanceOptions)
      const result = await generator.generateLoops()
      
      // Should either succeed or fail gracefully
      expect(result.success !== undefined).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero target distance', async () => {
      const zeroDistanceOptions = {
        ...options,
        targetDistance: 0
      }
      
      const generator = new LoopGenerator(zeroDistanceOptions)
      const result = await generator.generateLoops()
      
      expect(result.success).toBe(false)
    })

    it('should handle very high tolerance', async () => {
      const highToleranceOptions = {
        ...options,
        tolerance: 0.9
      }
      
      const generator = new LoopGenerator(highToleranceOptions)
      const result = await generator.generateLoops()
      
      // Should still work but with more lenient distance matching
      expect(result.success !== undefined).toBe(true)
    })

    it('should handle single variant request', async () => {
      const singleVariantOptions = {
        ...options,
        maxVariants: 1
      }
      
      const generator = new LoopGenerator(singleVariantOptions)
      const result = await generator.generateLoops()
      
      if (result.success) {
        expect(result.loops.length).toBeLessThanOrEqual(1)
      }
    })
  })
})
