/**
 * Tests for pathfinding algorithms
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { DijkstraPathfinder, AStarPathfinder, PathfindingUtils } from '../algorithms/pathfinding'
import { WeightedGraph, GraphNode, GraphEdge } from '../services/graph-builder'

describe('Pathfinding Algorithms', () => {
  let mockGraph: WeightedGraph
  let mockNodes: Map<string, GraphNode>
  let mockEdges: Map<string, GraphEdge>

  beforeEach(() => {
    // Create a simple test graph
    mockNodes = new Map([
      ['A', { id: 'A', lat: 0, lon: 0, connections: ['B', 'C'] }],
      ['B', { id: 'B', lat: 1, lon: 0, connections: ['A', 'C', 'D'] }],
      ['C', { id: 'C', lat: 0, lon: 1, connections: ['A', 'B', 'D'] }],
      ['D', { id: 'D', lat: 1, lon: 1, connections: ['B', 'C'] }]
    ])

    mockEdges = new Map([
      ['A-B', { id: 'A-B', from: 'A', to: 'B', distance: 100, surface: 'paved', highway_type: 'footway', weight: 100 }],
      ['A-C', { id: 'A-C', from: 'A', to: 'C', distance: 100, surface: 'paved', highway_type: 'footway', weight: 100 }],
      ['B-C', { id: 'B-C', from: 'B', to: 'C', distance: 141, surface: 'paved', highway_type: 'footway', weight: 141 }],
      ['B-D', { id: 'B-D', from: 'B', to: 'D', distance: 100, surface: 'paved', highway_type: 'footway', weight: 100 }],
      ['C-D', { id: 'C-D', from: 'C', to: 'D', distance: 100, surface: 'paved', highway_type: 'footway', weight: 100 }]
    ])

    mockGraph = {
      nodes: mockNodes,
      edges: mockEdges,
      nodeConnections: new Map([
        ['A', ['B', 'C']],
        ['B', ['A', 'C', 'D']],
        ['C', ['A', 'B', 'D']],
        ['D', ['B', 'C']]
      ])
    }
  })

  describe('DijkstraPathfinder', () => {
    it('should find shortest path between two nodes', () => {
      const dijkstra = new DijkstraPathfinder(mockGraph)
      const result = dijkstra.findPath('A', 'D')
      
      expect(result.found).toBe(true)
      expect(result.path).toEqual(['A', 'B', 'D'])
      expect(result.distance).toBe(200) // 100 + 100
      expect(result.weight).toBe(200)
    })

    it('should return empty path when no route exists', () => {
      // Create isolated node
      const isolatedGraph: WeightedGraph = {
        nodes: new Map([
          ['A', { id: 'A', lat: 0, lon: 0, connections: [] }],
          ['B', { id: 'B', lat: 1, lon: 1, connections: [] }]
        ]),
        edges: new Map(),
        nodeConnections: new Map([
          ['A', []],
          ['B', []]
        ])
      }

      const dijkstra = new DijkstraPathfinder(isolatedGraph)
      const result = dijkstra.findPath('A', 'B')
      
      expect(result.found).toBe(false)
      expect(result.path).toEqual([])
    })

    it('should find multiple paths to different targets', () => {
      const dijkstra = new DijkstraPathfinder(mockGraph)
      const results = dijkstra.findMultiplePaths('A', ['B', 'C', 'D'])
      
      expect(results.size).toBe(3)
      expect(results.get('B')?.found).toBe(true)
      expect(results.get('C')?.found).toBe(true)
      expect(results.get('D')?.found).toBe(true)
    })

    it('should respect max distance limit', () => {
      const dijkstra = new DijkstraPathfinder(mockGraph, { maxDistance: 150 })
      const result = dijkstra.findPath('A', 'D')
      
      expect(result.found).toBe(false) // Path exceeds max distance
    })

    it('should find path closest to target distance', () => {
      const dijkstra = new DijkstraPathfinder(mockGraph)
      const result = dijkstra.findClosestToDistance('A', 200, 0.1)
      
      expect(result).not.toBeNull()
      expect(result?.found).toBe(true)
      expect(result?.distance).toBeCloseTo(200, 0)
    })
  })

  describe('AStarPathfinder', () => {
    it('should find shortest path using A* algorithm', () => {
      const aStar = new AStarPathfinder(mockGraph)
      const result = aStar.findPath('A', 'D')
      
      expect(result.found).toBe(true)
      expect(result.path).toEqual(['A', 'B', 'D'])
      expect(result.distance).toBe(200)
    })

    it('should use custom heuristic function', () => {
      const customHeuristic = (from: GraphNode, to: GraphNode) => {
        return Math.abs(from.lat - to.lat) + Math.abs(from.lon - to.lon)
      }

      const aStar = new AStarPathfinder(mockGraph, { customHeuristic })
      const result = aStar.findPath('A', 'D')
      
      expect(result.found).toBe(true)
    })

    it('should return empty path when no route exists', () => {
      const isolatedGraph: WeightedGraph = {
        nodes: new Map([
          ['A', { id: 'A', lat: 0, lon: 0, connections: [] }],
          ['B', { id: 'B', lat: 1, lon: 1, connections: [] }]
        ]),
        edges: new Map(),
        nodeConnections: new Map([
          ['A', []],
          ['B', []]
        ])
      }

      const aStar = new AStarPathfinder(isolatedGraph)
      const result = aStar.findPath('A', 'B')
      
      expect(result.found).toBe(false)
      expect(result.path).toEqual([])
    })
  })

  describe('PathfindingUtils', () => {
    it('should create avoid edges weight function', () => {
      const avoidEdges = new Set(['A-B'])
      const weightFunction = PathfindingUtils.createAvoidEdgesWeight(avoidEdges, 1000)
      
      const edge: GraphEdge = {
        id: 'A-B',
        from: 'A',
        to: 'B',
        distance: 100,
        surface: 'paved',
        highway_type: 'footway',
        weight: 100
      }
      
      const fromNode: GraphNode = { id: 'A', lat: 0, lon: 0, connections: [] }
      const toNode: GraphNode = { id: 'B', lat: 1, lon: 0, connections: [] }
      
      const weight = weightFunction(edge, fromNode, toNode, [])
      expect(weight).toBe(100000) // 100 * 1000
    })

    it('should create prefer edges weight function', () => {
      const preferEdges = new Set(['A-B'])
      const weightFunction = PathfindingUtils.createPreferEdgesWeight(preferEdges, 0.5)
      
      const edge: GraphEdge = {
        id: 'A-B',
        from: 'A',
        to: 'B',
        distance: 100,
        surface: 'paved',
        highway_type: 'footway',
        weight: 100
      }
      
      const fromNode: GraphNode = { id: 'A', lat: 0, lon: 0, connections: [] }
      const toNode: GraphNode = { id: 'B', lat: 1, lon: 0, connections: [] }
      
      const weight = weightFunction(edge, fromNode, toNode, [])
      expect(weight).toBe(50) // 100 * 0.5
    })

    it('should create used edges weight function', () => {
      const usedEdges = new Set(['A-B'])
      const weightFunction = PathfindingUtils.createUsedEdgesWeight(usedEdges, 5)
      
      const edge: GraphEdge = {
        id: 'A-B',
        from: 'A',
        to: 'B',
        distance: 100,
        surface: 'paved',
        highway_type: 'footway',
        weight: 100
      }
      
      const fromNode: GraphNode = { id: 'A', lat: 0, lon: 0, connections: [] }
      const toNode: GraphNode = { id: 'B', lat: 1, lon: 0, connections: [] }
      
      const weight = weightFunction(edge, fromNode, toNode, [])
      expect(weight).toBe(500) // 100 * 5
    })

    it('should create distance heuristic function', () => {
      const heuristic = PathfindingUtils.createDistanceHeuristic()
      
      const fromNode: GraphNode = { id: 'A', lat: 0, lon: 0, connections: [] }
      const toNode: GraphNode = { id: 'B', lat: 1, lon: 0, connections: [] }
      
      const distance = heuristic(fromNode, toNode)
      expect(distance).toBeCloseTo(111000, -3) // ~111km (1 degree)
    })

    it('should create elevation heuristic function', () => {
      const heuristic = PathfindingUtils.createElevationHeuristic(0.1)
      
      const fromNode: GraphNode = { id: 'A', lat: 0, lon: 0, connections: [], elevation: 100 }
      const toNode: GraphNode = { id: 'B', lat: 1, lon: 0, connections: [], elevation: 200 }
      
      const distance = heuristic(fromNode, toNode)
      expect(distance).toBeCloseTo(111000 + 10, -3) // Distance + elevation penalty
    })

    it('should calculate path quality metrics', () => {
      const path = ['A', 'B', 'C', 'D']
      const usedEdges = new Set(['A-B', 'B-C', 'C-D'])
      
      const quality = PathfindingUtils.calculatePathQuality(path, mockGraph, 300)
      
      expect(quality.distanceAccuracy).toBeGreaterThan(0)
      expect(quality.pathUniqueness).toBeGreaterThan(0)
      expect(quality.surfaceQuality).toBeGreaterThan(0)
      expect(quality.totalScore).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty graph', () => {
      const emptyGraph: WeightedGraph = {
        nodes: new Map(),
        edges: new Map(),
        nodeConnections: new Map()
      }

      const dijkstra = new DijkstraPathfinder(emptyGraph)
      const result = dijkstra.findPath('A', 'B')
      
      expect(result.found).toBe(false)
    })

    it('should handle single node graph', () => {
      const singleNodeGraph: WeightedGraph = {
        nodes: new Map([['A', { id: 'A', lat: 0, lon: 0, connections: [] }]]),
        edges: new Map(),
        nodeConnections: new Map([['A', []]])
      }

      const dijkstra = new DijkstraPathfinder(singleNodeGraph)
      const result = dijkstra.findPath('A', 'A')
      
      expect(result.found).toBe(true)
      expect(result.path).toEqual(['A'])
    })

    it('should handle disconnected graph', () => {
      const disconnectedGraph: WeightedGraph = {
        nodes: new Map([
          ['A', { id: 'A', lat: 0, lon: 0, connections: ['B'] }],
          ['B', { id: 'B', lat: 1, lon: 0, connections: ['A'] }],
          ['C', { id: 'C', lat: 2, lon: 0, connections: ['D'] }],
          ['D', { id: 'D', lat: 3, lon: 0, connections: ['C'] }]
        ]),
        edges: new Map([
          ['A-B', { id: 'A-B', from: 'A', to: 'B', distance: 100, surface: 'paved', highway_type: 'footway', weight: 100 }],
          ['C-D', { id: 'C-D', from: 'C', to: 'D', distance: 100, surface: 'paved', highway_type: 'footway', weight: 100 }]
        ]),
        nodeConnections: new Map([
          ['A', ['B']],
          ['B', ['A']],
          ['C', ['D']],
          ['D', ['C']]
        ])
      }

      const dijkstra = new DijkstraPathfinder(disconnectedGraph)
      const result = dijkstra.findPath('A', 'C')
      
      expect(result.found).toBe(false)
    })
  })
})

