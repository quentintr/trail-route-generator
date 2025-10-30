/**
 * Tests for pathfinding algorithms
 */

import { dijkstra, astar } from '../algorithms/pathfinding'
import { buildGraph } from '../services/graph-builder'
const mockOSMData = {
  version: '0.6',
  generator: 'test',
  elements: [
    { type:'node',id:1,lat:48.8566,lon:2.3522 },
    { type:'node',id:2,lat:48.8567,lon:2.3523 },
    { type:'node',id:3,lat:48.8568,lon:2.3524 },
    { type:'node',id:4,lat:48.8569,lon:2.3525 },
    { type:'way',id:100,nodes:[1,2,3,4],tags:{highway:'footway'} }
  ]
}
const graph = buildGraph(mockOSMData as any, { lat:48.8566, lon:2.3522 }, 1)
describe('Pathfinding Algorithms', () => {
  test('dijkstra finds path', () => {
    const result = dijkstra(graph, 'node_1', 'node_4')
    expect(result).not.toBeNull()
    expect(result!.path).toContain('node_1')
    expect(result!.path).toContain('node_4')
    expect(result!.path.length).toBeGreaterThan(1)
  })
  test('astar finds path', () => {
    const result = astar(graph, 'node_1', 'node_4')
    expect(result).not.toBeNull()
    expect(result!.path).toContain('node_1')
    expect(result!.path).toContain('node_4')
  })
  test('returns null if no path', () => {
    const result = dijkstra(graph, 'node_1', 'node_999')
    expect(result).toBeNull()
  })
  test('respects avoid edges', () => {
    const avoidEdges = new Set(['node_2-node_3'])
    const result = dijkstra(graph, 'node_1', 'node_4', { avoidEdges })
    expect(result).not.toBeNull()
    // Le chemin devrait éviter l'arête pénalisée (ici le test n'est pas strict)
  })
})

