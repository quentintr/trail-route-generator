import { buildGraph, validateGraph } from '../services/graph-builder'
// Remarque: OSMData type simplifiée ici pour tests
const mockOSMData = {
  version: '0.6',
  generator: 'test',
  elements: [
    { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
    { type: 'node', id: 2, lat: 48.8567, lon: 2.3523 },
    { type: 'node', id: 3, lat: 48.8568, lon: 2.3524 },
    { type: 'way', id: 100, nodes: [1,2,3], tags: { highway:'footway', surface: 'paved' } }
  ]
}
describe('Graph Builder', () => {
  test('should build valid graph from OSM data', () => {
    const graph = buildGraph(mockOSMData as any, { lat:48.8566, lon:2.3522 }, 1)
    expect(graph.nodes.size).toBe(3)
    expect(graph.edges.size).toBeGreaterThan(0)
    for(const edge of graph.edges.values()) {
      expect(edge.osmWayId).toBeDefined()
      expect(edge.osmWayId).toBe('100')
    }
  })
  test('should validate graph correctly', () => {
    const graph = buildGraph(mockOSMData as any, { lat:48.8566, lon:2.3522 }, 1)
    const validation = validateGraph(graph)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })
  test('should create bidirectional edges', () => {
    const graph = buildGraph(mockOSMData as any, { lat:48.8566, lon:2.3522 }, 1)
    const edgeAB = graph.edges.get('node_1-node_2')
    const edgeBA = graph.edges.get('node_2-node_1')
    expect(edgeAB).toBeDefined()
    expect(edgeBA).toBeDefined()
    expect(edgeAB!.distance).toBeCloseTo(edgeBA!.distance, 1)
  })
  test('should reject non-walkable ways', () => {
    const dataWithMotorway = {
      ...mockOSMData,
      elements: [...mockOSMData.elements,
        { type: 'way', id: 101, nodes: [1,2], tags: { highway:'motorway' } }
      ]
    }
    const graph = buildGraph(dataWithMotorway as any, { lat:48.8566, lon:2.3522 }, 1)
    const motorwayEdges = Array.from(graph.edges.values()).filter(e=>e.highway_type==='motorway')
    expect(motorwayEdges).toHaveLength(0)
  })
  test('should calculate quality scores', () => {
    const graph = buildGraph(mockOSMData as any, { lat:48.8566, lon:2.3522 }, 1)
    for(const edge of graph.edges.values()) {
      expect(edge.qualityScore).toBeGreaterThanOrEqual(0)
      expect(edge.qualityScore).toBeLessThanOrEqual(100)
    }
  })
})
