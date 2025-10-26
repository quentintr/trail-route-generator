/**
 * Pathfinding Algorithms for Loop Generation
 * 
 * Implements Dijkstra's algorithm and A* algorithm for efficient pathfinding
 * in weighted graphs with custom weight functions.
 */

import { WeightedGraph, GraphNode, GraphEdge } from '../services/graph-builder'
import { haversineDistance } from '../utils/geo-utils'

/**
 * Priority queue implementation for pathfinding algorithms
 */
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = []

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority })
    this.items.sort((a, b) => a.priority - b.priority)
  }

  dequeue(): T | null {
    const item = this.items.shift()
    return item ? item.item : null
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }

  size(): number {
    return this.items.length
  }
}

/**
 * Pathfinding result
 */
export interface PathfindingResult {
  path: string[] // Node IDs
  distance: number // Total distance in meters
  weight: number // Total weight
  found: boolean
  explored: number // Number of nodes explored
}

/**
 * Custom weight function type
 */
export type WeightFunction = (
  edge: GraphEdge,
  fromNode: GraphNode,
  toNode: GraphNode,
  currentPath: string[]
) => number

/**
 * Heuristic function type for A*
 */
export type HeuristicFunction = (
  fromNode: GraphNode,
  toNode: GraphNode
) => number

/**
 * Pathfinding configuration
 */
export interface PathfindingConfig {
  maxDistance?: number // Maximum distance to search
  maxNodes?: number // Maximum nodes to explore
  avoidEdges?: Set<string> // Edge IDs to avoid
  preferEdges?: Set<string> // Edge IDs to prefer
  customWeight?: WeightFunction
  customHeuristic?: HeuristicFunction
}

/**
 * Dijkstra's algorithm implementation
 */
export class DijkstraPathfinder {
  private graph: WeightedGraph
  private config: PathfindingConfig

  constructor(graph: WeightedGraph, config: PathfindingConfig = {}) {
    this.graph = graph
    this.config = config
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(startId: string, endId: string): PathfindingResult {
    console.log(`🔍 Dijkstra: Finding path from ${startId} to ${endId}`)
    
    const distances = new Map<string, number>()
    const previous = new Map<string, string | null>()
    const visited = new Set<string>()
    const queue = new PriorityQueue<string>()
    
    // Initialize distances
    for (const nodeId of this.graph.nodes.keys()) {
      distances.set(nodeId, Infinity)
    }
    distances.set(startId, 0)
    
    queue.enqueue(startId, 0)
    let explored = 0
    
    while (!queue.isEmpty() && explored < (this.config.maxNodes || 10000)) {
      const currentNodeId = queue.dequeue()
      if (!currentNodeId) break
      
      if (visited.has(currentNodeId)) continue
      visited.add(currentNodeId)
      explored++
      
      // Check if we've reached the target
      if (currentNodeId === endId) {
        break
      }
      
      // Check distance limit
      const currentDistance = distances.get(currentNodeId) || 0
      if (this.config.maxDistance && currentDistance > this.config.maxDistance) {
        continue
      }
      
      const currentNode = this.graph.nodes.get(currentNodeId)
      if (!currentNode) continue
      
      // Explore neighbors
      for (const neighborId of currentNode.connections) {
        if (visited.has(neighborId)) continue
        
        const edge = this.findEdge(currentNodeId, neighborId)
        if (!edge) continue
        
        // Calculate new distance
        const edgeWeight = this.calculateEdgeWeight(edge, currentNode, this.graph.nodes.get(neighborId)!)
        const newDistance = currentDistance + edgeWeight
        
        const currentNeighborDistance = distances.get(neighborId) || Infinity
        
        if (newDistance < currentNeighborDistance) {
          distances.set(neighborId, newDistance)
          previous.set(neighborId, currentNodeId)
          queue.enqueue(neighborId, newDistance)
        }
      }
    }
    
    // Reconstruct path
    const path = this.reconstructPath(startId, endId, previous)
    const totalDistance = this.calculatePathDistance(path)
    const totalWeight = distances.get(endId) || Infinity
    
    return {
      path,
      distance: totalDistance,
      weight: totalWeight,
      found: path.length > 1,
      explored
    }
  }

  /**
   * Find multiple paths to different targets
   */
  findMultiplePaths(
    startId: string, 
    targetIds: string[]
  ): Map<string, PathfindingResult> {
    console.log(`🔍 Dijkstra: Finding paths to ${targetIds.length} targets`)
    
    const results = new Map<string, PathfindingResult>()
    const distances = new Map<string, number>()
    const previous = new Map<string, string | null>()
    const visited = new Set<string>()
    const queue = new PriorityQueue<string>()
    
    // Initialize distances
    for (const nodeId of this.graph.nodes.keys()) {
      distances.set(nodeId, Infinity)
    }
    distances.set(startId, 0)
    
    queue.enqueue(startId, 0)
    let explored = 0
    const targetsFound = new Set<string>()
    
    while (!queue.isEmpty() && 
           explored < (this.config.maxNodes || 10000) && 
           targetsFound.size < targetIds.length) {
      
      const currentNodeId = queue.dequeue()
      if (!currentNodeId) break
      
      if (visited.has(currentNodeId)) continue
      visited.add(currentNodeId)
      explored++
      
      // Check if we've reached any target
      if (targetIds.includes(currentNodeId)) {
        targetsFound.add(currentNodeId)
        const path = this.reconstructPath(startId, currentNodeId, previous)
        const totalDistance = this.calculatePathDistance(path)
        const totalWeight = distances.get(currentNodeId) || Infinity
        
        results.set(currentNodeId, {
          path,
          distance: totalDistance,
          weight: totalWeight,
          found: true,
          explored
        })
      }
      
      // Check distance limit
      const currentDistance = distances.get(currentNodeId) || 0
      if (this.config.maxDistance && currentDistance > this.config.maxDistance) {
        continue
      }
      
      const currentNode = this.graph.nodes.get(currentNodeId)
      if (!currentNode) continue
      
      // Explore neighbors
      for (const neighborId of currentNode.connections) {
        if (visited.has(neighborId)) continue
        
        const edge = this.findEdge(currentNodeId, neighborId)
        if (!edge) continue
        
        // Calculate new distance
        const edgeWeight = this.calculateEdgeWeight(edge, currentNode, this.graph.nodes.get(neighborId)!)
        const newDistance = currentDistance + edgeWeight
        
        const currentNeighborDistance = distances.get(neighborId) || Infinity
        
        if (newDistance < currentNeighborDistance) {
          distances.set(neighborId, newDistance)
          previous.set(neighborId, currentNodeId)
          queue.enqueue(neighborId, newDistance)
        }
      }
    }
    
    return results
  }

  /**
   * Find the closest node to a target distance
   */
  findClosestToDistance(
    startId: string, 
    targetDistance: number, 
    tolerance: number = 0.1
  ): PathfindingResult | null {
    console.log(`🔍 Dijkstra: Finding path closest to ${targetDistance}m`)
    
    const distances = new Map<string, number>()
    const previous = new Map<string, string | null>()
    const visited = new Set<string>()
    const queue = new PriorityQueue<string>()
    
    // Initialize distances
    for (const nodeId of this.graph.nodes.keys()) {
      distances.set(nodeId, Infinity)
    }
    distances.set(startId, 0)
    
    queue.enqueue(startId, 0)
    let explored = 0
    let bestMatch: { nodeId: string; distance: number; path: string[] } | null = null
    
    while (!queue.isEmpty() && explored < (this.config.maxNodes || 10000)) {
      const currentNodeId = queue.dequeue()
      if (!currentNodeId) break
      
      if (visited.has(currentNodeId)) continue
      visited.add(currentNodeId)
      explored++
      
      const currentNode = this.graph.nodes.get(currentNodeId)
      if (!currentNode) continue
      
      // Calculate actual distance to this node
      const path = this.reconstructPath(startId, currentNodeId, previous)
      const actualDistance = this.calculatePathDistance(path)
      
      // Check if this is a good match
      const distanceError = Math.abs(actualDistance - targetDistance) / targetDistance
      if (distanceError <= tolerance) {
        if (!bestMatch || distanceError < Math.abs(bestMatch.distance - targetDistance) / targetDistance) {
          bestMatch = {
            nodeId: currentNodeId,
            distance: actualDistance,
            path
          }
        }
      }
      
      // Check distance limit
      const currentWeight = distances.get(currentNodeId) || 0
      if (this.config.maxDistance && currentWeight > this.config.maxDistance) {
        continue
      }
      
      // Explore neighbors
      for (const neighborId of currentNode.connections) {
        if (visited.has(neighborId)) continue
        
        const edge = this.findEdge(currentNodeId, neighborId)
        if (!edge) continue
        
        // Calculate new distance
        const edgeWeight = this.calculateEdgeWeight(edge, currentNode, this.graph.nodes.get(neighborId)!)
        const newDistance = currentWeight + edgeWeight
        
        const currentNeighborDistance = distances.get(neighborId) || Infinity
        
        if (newDistance < currentNeighborDistance) {
          distances.set(neighborId, newDistance)
          previous.set(neighborId, currentNodeId)
          queue.enqueue(neighborId, newDistance)
        }
      }
    }
    
    if (bestMatch) {
      return {
        path: bestMatch.path,
        distance: bestMatch.distance,
        weight: distances.get(bestMatch.nodeId) || Infinity,
        found: true,
        explored
      }
    }
    
    return null
  }

  /**
   * Find edge between two nodes
   */
  private findEdge(fromId: string, toId: string): GraphEdge | null {
    const edgeId1 = `${fromId}-${toId}`
    const edgeId2 = `${toId}-${fromId}`
    
    return this.graph.edges.get(edgeId1) || this.graph.edges.get(edgeId2) || null
  }

  /**
   * Calculate edge weight with custom function
   */
  private calculateEdgeWeight(
    edge: GraphEdge, 
    fromNode: GraphNode, 
    toNode: GraphNode
  ): number {
    if (this.config.customWeight) {
      return this.config.customWeight(edge, fromNode, toNode, [])
    }
    return edge.weight
  }

  /**
   * Reconstruct path from start to end
   */
  private reconstructPath(
    startId: string, 
    endId: string, 
    previous: Map<string, string | null>
  ): string[] {
    const path: string[] = []
    let currentId: string | null = endId
    
    while (currentId !== null) {
      path.unshift(currentId)
      currentId = previous.get(currentId) || null
    }
    
    // Check if we actually reached the start node
    if (path.length === 0 || path[0] !== startId) {
      return []
    }
    
    // Special case: if start and end are the same, return single node
    if (startId === endId && path.length === 1) {
      return path
    }
    
    return path
  }

  /**
   * Calculate total distance of a path
   */
  private calculatePathDistance(path: string[]): number {
    let totalDistance = 0
    
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.findEdge(path[i], path[i + 1])
      if (edge) {
        totalDistance += edge.distance
      }
    }
    
    return totalDistance
  }
}

/**
 * A* algorithm implementation
 */
export class AStarPathfinder {
  private graph: WeightedGraph
  private config: PathfindingConfig

  constructor(graph: WeightedGraph, config: PathfindingConfig = {}) {
    this.graph = graph
    this.config = config
  }

  /**
   * Find shortest path using A* algorithm
   */
  findPath(startId: string, endId: string): PathfindingResult {
    console.log(`⭐ A*: Finding path from ${startId} to ${endId}`)
    
    const gScore = new Map<string, number>()
    const fScore = new Map<string, number>()
    const previous = new Map<string, string | null>()
    const openSet = new PriorityQueue<string>()
    const openSetHash = new Set<string>()
    const closedSet = new Set<string>()
    
    // Initialize scores
    for (const nodeId of this.graph.nodes.keys()) {
      gScore.set(nodeId, Infinity)
      fScore.set(nodeId, Infinity)
    }
    
    gScore.set(startId, 0)
    fScore.set(startId, this.heuristic(startId, endId))
    
    openSet.enqueue(startId, fScore.get(startId)!)
    openSetHash.add(startId)
    
    let explored = 0
    
    while (!openSet.isEmpty() && explored < (this.config.maxNodes || 10000)) {
      const currentNodeId = openSet.dequeue()
      if (!currentNodeId) break
      
      openSetHash.delete(currentNodeId)
      
      if (currentNodeId === endId) {
        const path = this.reconstructPath(startId, endId, previous)
        const totalDistance = this.calculatePathDistance(path)
        
        return {
          path,
          distance: totalDistance,
          weight: gScore.get(endId)!,
          found: true,
          explored
        }
      }
      
      closedSet.add(currentNodeId)
      explored++
      
      const currentNode = this.graph.nodes.get(currentNodeId)
      if (!currentNode) continue
      
      // Explore neighbors
      for (const neighborId of currentNode.connections) {
        if (closedSet.has(neighborId)) continue
        
        const edge = this.findEdge(currentNodeId, neighborId)
        if (!edge) continue
        
        const tentativeGScore = gScore.get(currentNodeId)! + this.calculateEdgeWeight(edge, currentNode, this.graph.nodes.get(neighborId)!)
        
        if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
          previous.set(neighborId, currentNodeId)
          gScore.set(neighborId, tentativeGScore)
          fScore.set(neighborId, tentativeGScore + this.heuristic(neighborId, endId))
          
          if (!openSetHash.has(neighborId)) {
            openSet.enqueue(neighborId, fScore.get(neighborId)!)
            openSetHash.add(neighborId)
          }
        }
      }
    }
    
    // No path found
    return {
      path: [],
      distance: 0,
      weight: Infinity,
      found: false,
      explored
    }
  }

  /**
   * Calculate heuristic function
   */
  private heuristic(fromId: string, toId: string): number {
    if (this.config.customHeuristic) {
      const fromNode = this.graph.nodes.get(fromId)
      const toNode = this.graph.nodes.get(toId)
      if (fromNode && toNode) {
        return this.config.customHeuristic(fromNode, toNode)
      }
    }
    
    // Default: straight-line distance
    const fromNode = this.graph.nodes.get(fromId)
    const toNode = this.graph.nodes.get(toId)
    if (fromNode && toNode) {
      return haversineDistance(fromNode.lat, fromNode.lon, toNode.lat, toNode.lon)
    }
    
    return 0
  }

  /**
   * Find edge between two nodes
   */
  private findEdge(fromId: string, toId: string): GraphEdge | null {
    const edgeId1 = `${fromId}-${toId}`
    const edgeId2 = `${toId}-${fromId}`
    
    return this.graph.edges.get(edgeId1) || this.graph.edges.get(edgeId2) || null
  }

  /**
   * Calculate edge weight with custom function
   */
  private calculateEdgeWeight(
    edge: GraphEdge, 
    fromNode: GraphNode, 
    toNode: GraphNode
  ): number {
    if (this.config.customWeight) {
      return this.config.customWeight(edge, fromNode, toNode, [])
    }
    return edge.weight
  }

  /**
   * Reconstruct path from start to end
   */
  private reconstructPath(
    startId: string, 
    endId: string, 
    previous: Map<string, string | null>
  ): string[] {
    const path: string[] = []
    let currentId: string | null = endId
    
    while (currentId !== null) {
      path.unshift(currentId)
      currentId = previous.get(currentId) || null
    }
    
    // Check if we actually reached the start node
    if (path.length === 0 || path[0] !== startId) {
      return []
    }
    
    // Special case: if start and end are the same, return single node
    if (startId === endId && path.length === 1) {
      return path
    }
    
    return path
  }

  /**
   * Calculate total distance of a path
   */
  private calculatePathDistance(path: string[]): number {
    let totalDistance = 0
    
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.findEdge(path[i], path[i + 1])
      if (edge) {
        totalDistance += edge.distance
      }
    }
    
    return totalDistance
  }
}

/**
 * Pathfinding utilities
 */
export class PathfindingUtils {
  /**
   * Create a weight function that avoids certain edges
   */
  static createAvoidEdgesWeight(avoidEdges: Set<string>, penalty: number = 1000): WeightFunction {
    return (edge: GraphEdge) => {
      if (avoidEdges.has(edge.id)) {
        return edge.weight * penalty
      }
      return edge.weight
    }
  }

  /**
   * Create a weight function that prefers certain edges
   */
  static createPreferEdgesWeight(preferEdges: Set<string>, bonus: number = 0.5): WeightFunction {
    return (edge: GraphEdge) => {
      if (preferEdges.has(edge.id)) {
        return edge.weight * bonus
      }
      return edge.weight
    }
  }

  /**
   * Create a weight function that penalizes already used edges
   */
  static createUsedEdgesWeight(usedEdges: Set<string>, penalty: number = 5): WeightFunction {
    return (edge: GraphEdge) => {
      if (usedEdges.has(edge.id)) {
        return edge.weight * penalty
      }
      return edge.weight
    }
  }

  /**
   * Create a heuristic function based on straight-line distance
   */
  static createDistanceHeuristic(): HeuristicFunction {
    return (fromNode: GraphNode, toNode: GraphNode) => {
      return haversineDistance(fromNode.lat, fromNode.lon, toNode.lat, toNode.lon)
    }
  }

  /**
   * Create a heuristic function that considers elevation
   */
  static createElevationHeuristic(elevationWeight: number = 0.1): HeuristicFunction {
    return (fromNode: GraphNode, toNode: GraphNode) => {
      const distance = haversineDistance(fromNode.lat, fromNode.lon, toNode.lat, toNode.lon)
      const elevationDiff = Math.abs((toNode.elevation || 0) - (fromNode.elevation || 0))
      return distance + (elevationDiff * elevationWeight)
    }
  }

  /**
   * Calculate path quality metrics
   */
  static calculatePathQuality(
    path: string[],
    graph: WeightedGraph,
    targetDistance: number
  ): {
    distanceAccuracy: number
    pathUniqueness: number
    surfaceQuality: number
    totalScore: number
  } {
    if (path.length < 2) {
      return { distanceAccuracy: 0, pathUniqueness: 0, surfaceQuality: 0, totalScore: 0 }
    }

    // Calculate distance accuracy
    let totalDistance = 0
    const usedEdges = new Set<string>()
    const surfaceTypes: Record<string, number> = {}
    
    for (let i = 0; i < path.length - 1; i++) {
      const edgeId1 = `${path[i]}-${path[i + 1]}`
      const edgeId2 = `${path[i + 1]}-${path[i]}`
      const edge = graph.edges.get(edgeId1) || graph.edges.get(edgeId2)
      
      if (edge) {
        totalDistance += edge.distance
        usedEdges.add(edge.id)
        
        // Track surface types
        const surface = edge.surface
        surfaceTypes[surface] = (surfaceTypes[surface] || 0) + edge.distance
      }
    }
    
    // Calculate metrics
    const distanceAccuracy = Math.max(0, 1 - Math.abs(totalDistance - targetDistance) / targetDistance)
    const pathUniqueness = usedEdges.size / (path.length - 1)
    
    // Calculate surface quality
    const totalSurfaceDistance = Object.values(surfaceTypes).reduce((sum, dist) => sum + dist, 0)
    let surfaceQuality = 0
    if (totalSurfaceDistance > 0) {
      const pavedDistance = (surfaceTypes.paved || 0) + (surfaceTypes.mixed || 0) * 0.5
      surfaceQuality = pavedDistance / totalSurfaceDistance
    }
    
    const totalScore = 0.4 * distanceAccuracy + 0.3 * pathUniqueness + 0.3 * surfaceQuality
    
    return {
      distanceAccuracy,
      pathUniqueness,
      surfaceQuality,
      totalScore
    }
  }
}
