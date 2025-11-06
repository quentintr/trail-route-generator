import { describe, it, expect, beforeEach } from '@jest/globals'
import { dijkstra, astar, PathfindingResult } from '../../../src/algorithms/pathfinding.js'
import { Graph, GraphNode, GraphEdge } from '../../../src/services/graph-builder.js'

describe('Pathfinding Algorithms', () => {
  let mockGraph: Graph

  beforeEach(() => {
    const nodes = new Map<string, GraphNode>()
    const edges = new Map<string, GraphEdge>()

    // Créer un graphe linéaire simple: A -> B -> C -> D
    const nodeA: GraphNode = {
      id: 'A',
      osmId: '1',
      lat: 43.5781632,
      lon: 1.4516224,
      connections: ['B'],
    }
    const nodeB: GraphNode = {
      id: 'B',
      osmId: '2',
      lat: 43.5791632,
      lon: 1.4526224,
      connections: ['A', 'C'],
    }
    const nodeC: GraphNode = {
      id: 'C',
      osmId: '3',
      lat: 43.5801632,
      lon: 1.4536224,
      connections: ['B', 'D'],
    }
    const nodeD: GraphNode = {
      id: 'D',
      osmId: '4',
      lat: 43.5811632,
      lon: 1.4546224,
      connections: ['C'],
    }

    nodes.set('A', nodeA)
    nodes.set('B', nodeB)
    nodes.set('C', nodeC)
    nodes.set('D', nodeD)

    // Créer les edges
    const edgeAB: GraphEdge = {
      id: 'A-B',
      osmWayId: 'way1',
      from: 'A',
      to: 'B',
      distance: 1000,
      weight: 1000,
    }
    const edgeBC: GraphEdge = {
      id: 'B-C',
      osmWayId: 'way2',
      from: 'B',
      to: 'C',
      distance: 1000,
      weight: 1000,
    }
    const edgeCD: GraphEdge = {
      id: 'C-D',
      osmWayId: 'way3',
      from: 'C',
      to: 'D',
      distance: 1000,
      weight: 1000,
    }

    edges.set('A-B', edgeAB)
    edges.set('B-A', { ...edgeAB, id: 'B-A', from: 'B', to: 'A' })
    edges.set('B-C', edgeBC)
    edges.set('C-B', { ...edgeBC, id: 'C-B', from: 'C', to: 'B' })
    edges.set('C-D', edgeCD)
    edges.set('D-C', { ...edgeCD, id: 'D-C', from: 'D', to: 'C' })

    mockGraph = { nodes, edges }
  })

  describe('dijkstra', () => {
    it('should find shortest path between two nodes', () => {
      const result = dijkstra(mockGraph, 'A', 'D', 10000, 1000)

      expect(result).not.toBeNull()
      expect(result!.path).toEqual(['A', 'B', 'C', 'D'])
      expect(result!.distance).toBe(3000) // 1000 + 1000 + 1000
    })

    it('should return null if no path exists', () => {
      // Créer un nœud isolé
      const isolatedNode: GraphNode = {
        id: 'E',
        osmId: '5',
        lat: 43.5821632,
        lon: 1.4556224,
        connections: [],
      }
      mockGraph.nodes.set('E', isolatedNode)

      const result = dijkstra(mockGraph, 'A', 'E', 10000, 1000)

      expect(result).toBeNull()
    })

    it('should respect maxDistance limit', () => {
      const result = dijkstra(mockGraph, 'A', 'D', 2000, 1000) // Max 2km, mais besoin de 3km

      expect(result).toBeNull()
    })

    it('should handle forbidden edges', () => {
      const forbiddenEdges = new Set<string>(['A-B'])

      const result = dijkstra(mockGraph, 'A', 'D', 10000, 1000, forbiddenEdges)

      // Ne devrait pas trouver de chemin car l'edge A-B est bloqué
      expect(result).toBeNull()
    })

    it('should return path with single node if start equals end', () => {
      const result = dijkstra(mockGraph, 'A', 'A', 10000, 1000)

      expect(result).not.toBeNull()
      expect(result!.path).toEqual(['A'])
      expect(result!.distance).toBe(0)
    })
  })

  describe('astar', () => {
    it('should find shortest path using A* algorithm', () => {
      const result = astar(mockGraph, 'A', 'D', 10000, 1000)

      expect(result).not.toBeNull()
      expect(result!.path).toEqual(['A', 'B', 'C', 'D'])
      expect(result!.distance).toBe(3000)
    })

    it('should return null if no path exists', () => {
      const isolatedNode: GraphNode = {
        id: 'E',
        osmId: '5',
        lat: 43.5821632,
        lon: 1.4556224,
        connections: [],
      }
      mockGraph.nodes.set('E', isolatedNode)

      const result = astar(mockGraph, 'A', 'E', 10000, 1000)

      expect(result).toBeNull()
    })

    it('should respect maxDistance limit', () => {
      const result = astar(mockGraph, 'A', 'D', 2000, 1000)

      expect(result).toBeNull()
    })
  })
})

