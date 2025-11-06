import { describe, it, expect } from '@jest/globals'
import { buildGraph, validateGraph } from '../../src/services/graph-builder.js'
import { Graph } from '../../src/services/graph-builder.js'

describe('OSM Loader Integration', () => {
  describe('buildGraph', () => {
    it('should build graph from valid OSM data', () => {
      const mockOsmData = {
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 43.5781632,
            lon: 1.4516224
          },
          {
            type: 'node',
            id: 2,
            lat: 43.5791632,
            lon: 1.4526224
          },
          {
            type: 'way',
            id: 10,
            nodes: [1, 2],
            tags: {
              highway: 'footway'
            }
          }
        ]
      }

      const graph = buildGraph(mockOsmData)

      expect(graph).toBeDefined()
      expect(graph.nodes.size).toBeGreaterThan(0)
      expect(graph.edges.size).toBeGreaterThan(0)
    })

    it('should handle empty OSM data', () => {
      const emptyOsmData = {
        elements: []
      }

      const graph = buildGraph(emptyOsmData)

      expect(graph.nodes.size).toBe(0)
      expect(graph.edges.size).toBe(0)
    })

    it('should reject GeoJSON format', () => {
      const geoJsonData = {
        type: 'FeatureCollection',
        features: []
      }

      expect(() => buildGraph(geoJsonData)).toThrow()
    })
  })

  describe('validateGraph', () => {
    it('should validate a well-formed graph', () => {
      const { Graph, GraphNode, GraphEdge } = require('../../src/services/graph-builder.js')
      const nodes = new Map()
      const edges = new Map()

      const node1: GraphNode = {
        id: 'node1',
        osmId: '1',
        lat: 43.5781632,
        lon: 1.4516224,
        connections: ['node2']
      }
      const node2: GraphNode = {
        id: 'node2',
        osmId: '2',
        lat: 43.5791632,
        lon: 1.4526224,
        connections: ['node1']
      }

      nodes.set('node1', node1)
      nodes.set('node2', node2)

      const edge: GraphEdge = {
        id: 'node1-node2',
        osmWayId: 'way1',
        from: 'node1',
        to: 'node2',
        distance: 1000,
        weight: 1000
      }

      edges.set('node1-node2', edge)

      const graph: Graph = { nodes, edges }
      const validation = validateGraph(graph)

      expect(validation.valid).toBe(true)
    })

    it('should detect invalid graph with orphaned edges', () => {
      const { Graph, GraphNode, GraphEdge } = require('../../src/services/graph-builder.js')
      const nodes = new Map()
      const edges = new Map()

      const edge: GraphEdge = {
        id: 'node1-node2',
        osmWayId: 'way1',
        from: 'node1',
        to: 'node2',
        distance: 1000,
        weight: 1000
      }

      edges.set('node1-node2', edge)
      // Pas de nœuds correspondants

      const graph: Graph = { nodes, edges }
      const validation = validateGraph(graph)

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })
})

