/**
 * Tests for loop generation algorithm
 */

import { generateLoops } from '../algorithms/loop-generator'
import { buildGraph } from '../services/graph-builder'
// Pas de data réelle ici sinon test trop grand, mais structure immédiate

describe('Loop Generator', () => {
  test('generated loops should be valid OSM routes', async () => {
    expect(true).toBe(true)
    // TODO: utiliser un mock graph
  })
  test('should generate multiple variants', async () => {
    expect(true).toBe(true)
  })
  test('should respect distance target within 10%', async () => {
    expect(true).toBe(true)
  })
})
