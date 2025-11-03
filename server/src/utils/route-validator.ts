import { Graph } from '../services/graph-builder.js'
import { GeneratedLoop } from '../algorithms/loop-generator.js'
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalSegments: number
    validSegments: number
    invalidSegments: number
  }
}
export function validateRouteAgainstOSM(
  loop: GeneratedLoop,
  graph: Graph
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let validSegments = 0
  let invalidSegments = 0
  let totalSegments = 0
  // suppose que loop.pathEdges existe
  for(const edgeId of loop.pathEdges) {
    totalSegments++
    const edge = graph.edges.get(edgeId)
    if (!edge) {
      errors.push(`No OSM edge ${edgeId}`)
      invalidSegments++; continue
    }
    if (!graph.nodes.has(edge.from)||!graph.nodes.has(edge.to)) {
      errors.push(`Edge ${edgeId} references non-existent node`)
      invalidSegments++; continue
    }
    if (!edge.osmWayId) warnings.push(`Edge ${edgeId} has no osmWayId`)
    validSegments++
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: { totalSegments, validSegments, invalidSegments }
  }
}
