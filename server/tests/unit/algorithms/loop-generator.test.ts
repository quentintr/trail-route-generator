import { describe, it, expect, beforeEach } from '@jest/globals'
import { generateLoops, LoopGenerationOptions } from '../../../src/algorithms/loop-generator.js'
import { Graph, GraphNode, GraphEdge } from '../../../src/services/graph-builder.js'

describe('Loop Generator Algorithm', () => {
  let mockGraph: Graph

  beforeEach(() => {
    // Créer un graphe simplifié pour les tests
    const nodes = new Map<string, GraphNode>()
    const edges = new Map<string, GraphEdge>()

    // Créer 4 nœuds en carré
    const node1: GraphNode = {
      id: 'node1',
      osmId: '1',
      lat: 43.5781632,
      lon: 1.4516224,
      connections: ['node2', 'node3'],
    }
    const node2: GraphNode = {
      id: 'node2',
      osmId: '2',
      lat: 43.5791632,
      lon: 1.4526224,
      connections: ['node1', 'node4'],
    }
    const node3: GraphNode = {
      id: 'node3',
      osmId: '3',
      lat: 43.5771632,
      lon: 1.4506224,
      connections: ['node1', 'node4'],
    }
    const node4: GraphNode = {
      id: 'node4',
      osmId: '4',
      lat: 43.5781632,
      lon: 1.4536224,
      connections: ['node2', 'node3'],
    }

    nodes.set('node1', node1)
    nodes.set('node2', node2)
    nodes.set('node3', node3)
    nodes.set('node4', node4)

    // Créer les edges (distance approximative en mètres)
    const edge12: GraphEdge = {
      id: 'node1-node2',
      osmWayId: 'way1',
      from: 'node1',
      to: 'node2',
      distance: 1500,
      weight: 1500,
    }
    const edge13: GraphEdge = {
      id: 'node1-node3',
      osmWayId: 'way2',
      from: 'node1',
      to: 'node3',
      distance: 1500,
      weight: 1500,
    }
    const edge24: GraphEdge = {
      id: 'node2-node4',
      osmWayId: 'way3',
      from: 'node2',
      to: 'node4',
      distance: 1500,
      weight: 1500,
    }
    const edge34: GraphEdge = {
      id: 'node3-node4',
      osmWayId: 'way4',
      from: 'node3',
      to: 'node4',
      distance: 1500,
      weight: 1500,
    }

    edges.set('node1-node2', edge12)
    edges.set('node2-node1', { ...edge12, id: 'node2-node1', from: 'node2', to: 'node1' })
    edges.set('node1-node3', edge13)
    edges.set('node3-node1', { ...edge13, id: 'node3-node1', from: 'node3', to: 'node1' })
    edges.set('node2-node4', edge24)
    edges.set('node4-node2', { ...edge24, id: 'node4-node2', from: 'node4', to: 'node2' })
    edges.set('node3-node4', edge34)
    edges.set('node4-node3', { ...edge34, id: 'node4-node3', from: 'node4', to: 'node3' })

    mockGraph = { nodes, edges }
  })

  describe('generateLoops', () => {
    it('should generate at least 1 loop for valid parameters', () => {
      const options: LoopGenerationOptions = {
        startNodeId: 'node1',
        targetDistance: 5000, // 5 km
        numVariants: 3,
      }

      const result = generateLoops(mockGraph, options)

      expect(result.loops.length).toBeGreaterThan(0)
      expect(result.loops.length).toBeLessThanOrEqual(3)
    })

    it('should generate loops with correct distance range', () => {
      const options: LoopGenerationOptions = {
        startNodeId: 'node1',
        targetDistance: 10000, // 10 km
        numVariants: 3,
      }

      const result = generateLoops(mockGraph, options)

      result.loops.forEach(loop => {
        const distanceKm = loop.distance / 1000
        // Accepter entre 50% et 150% de la distance cible
        expect(distanceKm).toBeGreaterThan(5)
        expect(distanceKm).toBeLessThan(15)
      })
    })

    it('should return loops sorted by quality score', () => {
      const options: LoopGenerationOptions = {
        startNodeId: 'node1',
        targetDistance: 8000, // 8 km
        numVariants: 3,
      }

      const result = generateLoops(mockGraph, options)

      for (let i = 0; i < result.loops.length - 1; i++) {
        expect(result.loops[i].qualityScore).toBeGreaterThanOrEqual(result.loops[i + 1].qualityScore)
      }
    })

    it('should generate loops with valid quality scores (0-1)', () => {
      const options: LoopGenerationOptions = {
        startNodeId: 'node1',
        targetDistance: 6000, // 6 km
        numVariants: 3,
      }

      const result = generateLoops(mockGraph, options)

      result.loops.forEach(loop => {
        expect(loop.qualityScore).toBeGreaterThanOrEqual(0)
        expect(loop.qualityScore).toBeLessThanOrEqual(1)
      })
    })

    it('should handle invalid starting node gracefully', () => {
      const options: LoopGenerationOptions = {
        startNodeId: 'invalid_node',
        targetDistance: 10000,
        numVariants: 3,
      }

      const result = generateLoops(mockGraph, options)

      // Devrait retourner des boucles vides ou des warnings
      expect(result.loops.length).toBe(0)
      expect(result.debug.warnings.length).toBeGreaterThan(0)
    })

    it('should generate loops that start and end at the same position', () => {
      const options: LoopGenerationOptions = {
        startNodeId: 'node1',
        targetDistance: 7000, // 7 km
        numVariants: 3,
      }

      const result = generateLoops(mockGraph, options)

      result.loops.forEach(loop => {
        const firstNode = loop.loop[0]
        const lastNode = loop.loop[loop.loop.length - 1]
        expect(firstNode).toBe(lastNode)
        expect(firstNode).toBe('node1')
      })
    })

    it('should generate loops with valid structure', () => {
      const options: LoopGenerationOptions = {
        startNodeId: 'node1',
        targetDistance: 6000, // 6 km
        numVariants: 3,
      }

      const result = generateLoops(mockGraph, options)

      result.loops.forEach(loop => {
        expect(loop.loop.length).toBeGreaterThan(2) // Au moins 3 nœuds (départ, intermédiaire, retour)
        expect(loop.pathEdges.length).toBeGreaterThan(0)
        expect(loop.distance).toBeGreaterThan(0)
      })
    })

    it('should limit number of loops to numVariants', () => {
      const options: LoopGenerationOptions = {
        startNodeId: 'node1',
        targetDistance: 5000,
        numVariants: 2,
      }

      const result = generateLoops(mockGraph, options)

      expect(result.loops.length).toBeLessThanOrEqual(2)
    })
  })
})

