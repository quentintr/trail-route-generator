/**
 * Loop Generator Algorithm
 * 
 * Implements the radial exploration method for generating running/trail loops
 * as specified in loop-generation-instructions.md
 */

import { WeightedGraph, GraphNode, GraphEdge } from '../services/graph-builder'
import { GraphBuilder, GraphBuildOptions } from '../services/graph-builder'
import { DijkstraPathfinder, AStarPathfinder, PathfindingConfig, PathfindingUtils } from './pathfinding'
import { 
  haversineDistance, 
  calculateBearing, 
  calculateAngularDiversity,
  calculateDistanceAccuracy,
  calculatePathUniqueness,
  calculateSurfaceQuality,
  calculateSceneryVariety
} from '../utils/geo-utils'

/**
 * Route segment information
 */
export interface RouteSegment {
  nodes: string[]
  distance: number
  duration: number // seconds
  elevation_gain: number
  surface_types: Record<string, number> // percentage of each surface
  geometry: Array<[number, number]> // coordinates
}

/**
 * Generated loop result
 */
export interface GeneratedLoop {
  id: string
  segments: RouteSegment[]
  total_distance: number
  total_duration: number
  total_elevation: number
  quality_score: number
  geometry: Array<[number, number]>
  exploration_path: string[]
  return_path: string[]
  used_edges: Set<string>
}

/**
 * Loop generation options
 */
export interface LoopGenerationOptions {
  targetDistance: number // meters
  startLat: number
  startLon: number
  tolerance: number // percentage (default 0.05 = 5%)
  maxVariants: number // number of variants to generate (default 5)
  includeSecondary: boolean
  surfaceTypes?: string[]
  difficulty?: string[]
  maxNodes?: number
}

/**
 * Loop generation result
 */
export interface LoopGenerationResult {
  loops: GeneratedLoop[]
  success: boolean
  error?: string
  stats: {
    totalNodes: number
    totalEdges: number
    explorationTime: number
    generationTime: number
  }
}

/**
 * Main Loop Generator Class
 */
export class LoopGenerator {
  private graph: WeightedGraph | null = null
  private options: LoopGenerationOptions
  private startTime: number = 0

  constructor(options: LoopGenerationOptions) {
    this.options = options
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  }

  /**
   * Generate running/trail loops
   */
  async generateLoops(): Promise<LoopGenerationResult> {
    this.startTime = Date.now()
    console.log('🔄 Starting loop generation...')
    console.log(`📍 Start: ${this.options.startLat}, ${this.options.startLon}`)
    console.log(`🎯 Target distance: ${(this.options.targetDistance / 1000).toFixed(2)}km`)
    
    // Validate coordinates
    if (!this.isValidCoordinate(this.options.startLat, this.options.startLon)) {
      return {
        loops: [],
        stats: { totalNodes: 0, totalEdges: 0, generationTime: 0 },
        success: false,
        error: 'Invalid start coordinates'
      }
    }
    
    try {
      // Step 1: Build the graph
      const graphBuildStart = Date.now()
      this.graph = await this.buildGraph()
      const graphBuildTime = Date.now() - graphBuildStart
      console.log(`✅ Graph built in ${graphBuildTime}ms`)
      
      if (!this.graph || this.graph.nodes.size === 0) {
        return {
          loops: [],
          success: false,
          error: 'No valid paths found',
          stats: {
            totalNodes: 0,
            totalEdges: 0,
            explorationTime: 0,
            generationTime: Date.now() - this.startTime
          }
        }
      }
      
      // Step 2: Find start node
      const startNode = this.findStartNode()
      if (!startNode) {
        return {
          loops: [],
          success: false,
          error: 'Start point is not accessible',
          stats: {
            totalNodes: this.graph.nodes.size,
            totalEdges: this.graph.edges.size,
            explorationTime: 0,
            generationTime: Date.now() - this.startTime
          }
        }
      }
      
      console.log(`🚀 Start node: ${startNode.id}`)
      
      // Step 3: Generate multiple loop variants
      const generationStart = Date.now()
      const loops = await this.generateLoopVariants(startNode)
      const generationTime = Date.now() - generationStart
      
      console.log(`✅ Generated ${loops.length} loop variants in ${generationTime}ms`)
      
      return {
        loops,
        success: loops.length > 0,
        stats: {
          totalNodes: this.graph.nodes.size,
          totalEdges: this.graph.edges.size,
          explorationTime: graphBuildTime,
          generationTime: Date.now() - this.startTime
        }
      }
      
    } catch (error) {
      console.error('❌ Loop generation failed:', error)
      return {
        loops: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          totalNodes: this.graph?.nodes.size || 0,
          totalEdges: this.graph?.edges.size || 0,
          explorationTime: 0,
          generationTime: Date.now() - this.startTime
        }
      }
    }
  }

  /**
   * Build the weighted graph from OSM data
   */
  private async buildGraph(): Promise<WeightedGraph> {
    const graphOptions: GraphBuildOptions = {
      targetDistance: this.options.targetDistance,
      startLat: this.options.startLat,
      startLon: this.options.startLon,
      includeSecondary: this.options.includeSecondary,
      surfaceTypes: this.options.surfaceTypes,
      difficulty: this.options.difficulty,
      maxNodes: this.options.maxNodes
    }
    
    const graphBuilder = new GraphBuilder(graphOptions)
    return await graphBuilder.buildGraph()
  }

  /**
   * Find the closest accessible node to the start point
   */
  private findStartNode(): GraphNode | null {
    if (!this.graph) return null
    
    let closestNode: GraphNode | null = null
    let minDistance = Infinity
    
    for (const node of this.graph.nodes.values()) {
      const distance = haversineDistance(
        this.options.startLat, this.options.startLon,
        node.lat, node.lon
      )
      
      if (distance < minDistance) {
        minDistance = distance
        closestNode = node
      }
    }
    
    // Check if the closest node is accessible (has connections)
    if (closestNode && closestNode.connections.length === 0) {
      return null // Node is isolated
    }
    
    return closestNode
  }

  /**
   * Generate multiple loop variants using different strategies
   */
  private async generateLoopVariants(startNode: GraphNode): Promise<GeneratedLoop[]> {
    const loops: GeneratedLoop[] = []
    const maxVariants = this.options.maxVariants || 5
    
    console.log(`🔄 Generating ${maxVariants} loop variants...`)
    
    // Strategy 1: Radial exploration with different target distances
    const targetDistances = this.calculateTargetDistances()
    
    for (let i = 0; i < Math.min(maxVariants, targetDistances.length); i++) {
      const targetDistance = targetDistances[i]
      console.log(`🎯 Variant ${i + 1}: Target distance ${(targetDistance / 1000).toFixed(2)}km`)
      
      const loop = await this.generateSingleLoop(startNode, targetDistance, i)
      if (loop) {
        loops.push(loop)
      }
    }
    
    // Sort by quality score
    loops.sort((a, b) => b.quality_score - a.quality_score)
    
    return loops
  }

  /**
   * Calculate target distances for different variants
   */
  private calculateTargetDistances(): number[] {
    const baseDistance = this.options.targetDistance
    const tolerance = this.options.tolerance
    const maxVariants = this.options.maxVariants || 5
    
    const distances: number[] = []
    
    // Add the exact target distance
    distances.push(baseDistance)
    
    // Add slightly shorter and longer variants
    const step = baseDistance * tolerance
    for (let i = 1; i < maxVariants; i++) {
      const offset = step * i
      distances.push(baseDistance - offset)
      distances.push(baseDistance + offset)
    }
    
    // Remove duplicates and sort
    return [...new Set(distances)].sort((a, b) => a - b)
  }

  /**
   * Generate a single loop using radial exploration
   */
  private async generateSingleLoop(
    startNode: GraphNode, 
    targetDistance: number, 
    variantIndex: number
  ): Promise<GeneratedLoop | null> {
    console.log(`🔄 Generating loop variant ${variantIndex + 1}...`)
    
    try {
      // Phase 1: Exploration (45-55% of target distance)
      const explorationDistance = targetDistance * (0.45 + variantIndex * 0.02)
      console.log(`🔍 Exploration phase: ${(explorationDistance / 1000).toFixed(2)}km`)
      
      const explorationResult = await this.exploreFromStart(startNode, explorationDistance)
      if (!explorationResult.found) {
        console.log(`❌ No exploration path found for variant ${variantIndex + 1}`)
        return null
      }
      
      // Phase 2: Return path using A*
      const returnResult = await this.findReturnPath(
        startNode.id, 
        explorationResult.path[explorationResult.path.length - 1],
        explorationResult.path
      )
      
      if (!returnResult.found) {
        console.log(`❌ No return path found for variant ${variantIndex + 1}`)
        return null
      }
      
      // Phase 3: Combine paths and optimize
      const combinedLoop = this.combinePaths(explorationResult, returnResult)
      if (!combinedLoop) {
        console.log(`❌ Failed to combine paths for variant ${variantIndex + 1}`)
        return null
      }
      
      // Phase 4: Optimize with 2-opt
      const optimizedLoop = this.optimizeLoop(combinedLoop)
      
      // Phase 5: Calculate quality score
      const qualityScore = this.calculateQualityScore(optimizedLoop, targetDistance)
      
      console.log(`✅ Loop variant ${variantIndex + 1} generated with quality ${qualityScore.toFixed(3)}`)
      
      return {
        id: `loop_${variantIndex + 1}_${Date.now()}`,
        segments: optimizedLoop.segments,
        total_distance: optimizedLoop.total_distance,
        total_duration: optimizedLoop.total_duration,
        total_elevation: optimizedLoop.total_elevation,
        quality_score: qualityScore,
        geometry: optimizedLoop.geometry,
        exploration_path: explorationResult.path,
        return_path: returnResult.path,
        used_edges: optimizedLoop.used_edges
      }
      
    } catch (error) {
      console.error(`❌ Error generating loop variant ${variantIndex + 1}:`, error)
      return null
    }
  }

  /**
   * Exploration phase: find path to 45-55% of target distance
   */
  private async exploreFromStart(
    startNode: GraphNode, 
    targetDistance: number
  ): Promise<{ path: string[]; found: boolean; distance: number }> {
    const dijkstra = new DijkstraPathfinder(this.graph!, {
      maxDistance: targetDistance * 1.2, // Allow some overshoot
      maxNodes: 5000
    })
    
    // Find path closest to target distance
    const result = dijkstra.findClosestToDistance(
      startNode.id, 
      targetDistance, 
      this.options.tolerance
    )
    
    if (result && result.found) {
      console.log(`🔍 Exploration found path: ${(result.distance / 1000).toFixed(2)}km`)
      return {
        path: result.path,
        found: true,
        distance: result.distance
      }
    }
    
    return { path: [], found: false, distance: 0 }
  }

  /**
   * Return phase: find path back to start using A*
   */
  private async findReturnPath(
    startId: string, 
    endId: string, 
    explorationPath: string[]
  ): Promise<{ path: string[]; found: boolean; distance: number }> {
    // Create weight function that penalizes already used edges
    const usedEdges = new Set<string>()
    for (let i = 0; i < explorationPath.length - 1; i++) {
      const edgeId1 = `${explorationPath[i]}-${explorationPath[i + 1]}`
      const edgeId2 = `${explorationPath[i + 1]}-${explorationPath[i]}`
      usedEdges.add(edgeId1)
      usedEdges.add(edgeId2)
    }
    
    const customWeight = PathfindingUtils.createUsedEdgesWeight(usedEdges, 5)
    
    const aStar = new AStarPathfinder(this.graph!, {
      customWeight,
      maxNodes: 5000
    })
    
    const result = aStar.findPath(endId, startId)
    
    if (result.found) {
      console.log(`⭐ Return path found: ${(result.distance / 1000).toFixed(2)}km`)
      return {
        path: result.path,
        found: true,
        distance: result.distance
      }
    }
    
    return { path: [], found: false, distance: 0 }
  }

  /**
   * Combine exploration and return paths
   */
  private combinePaths(
    exploration: { path: string[]; distance: number },
    returnPath: { path: string[]; distance: number }
  ): any | null {
    if (!this.graph) return null
    
    // Remove duplicate start/end nodes
    const combinedPath = [...exploration.path]
    if (returnPath.path.length > 1) {
      combinedPath.push(...returnPath.path.slice(1)) // Skip the first node (duplicate)
    }
    
    // Calculate total metrics
    let totalDistance = exploration.distance + returnPath.distance
    let totalDuration = totalDistance / 1.4 // Assume 1.4 m/s average speed
    let totalElevation = 0
    const usedEdges = new Set<string>()
    const surfaceTypes: Record<string, number> = {}
    const geometry: Array<[number, number]> = []
    
    // Process each segment
    for (let i = 0; i < combinedPath.length - 1; i++) {
      const fromId = combinedPath[i]
      const toId = combinedPath[i + 1]
      
      const edgeId1 = `${fromId}-${toId}`
      const edgeId2 = `${toId}-${fromId}`
      const edge = this.graph.edges.get(edgeId1) || this.graph.edges.get(edgeId2)
      
      if (edge) {
        usedEdges.add(edge.id)
        surfaceTypes[edge.surface] = (surfaceTypes[edge.surface] || 0) + edge.distance
        
        // Add geometry points
        if (edge.geometry) {
          geometry.push(...edge.geometry)
        } else {
          const fromNode = this.graph.nodes.get(fromId)
          const toNode = this.graph.nodes.get(toId)
          if (fromNode && toNode) {
            geometry.push([fromNode.lon, fromNode.lat])
            geometry.push([toNode.lon, toNode.lat])
          }
        }
      }
    }
    
    // Create route segments
    const segments: RouteSegment[] = [{
      nodes: combinedPath,
      distance: totalDistance,
      duration: totalDuration,
      elevation_gain: totalElevation,
      surface_types: surfaceTypes,
      geometry
    }]
    
    return {
      segments,
      total_distance: totalDistance,
      total_duration: totalDuration,
      total_elevation: totalElevation,
      geometry,
      used_edges: usedEdges
    }
  }

  /**
   * Optimize loop using 2-opt algorithm
   */
  private optimizeLoop(loop: any): any {
    // Simple 2-opt optimization
    // This is a placeholder - in a real implementation, you'd implement
    // the full 2-opt algorithm to reduce crossings and improve the loop
    
    console.log('⚡ Applying 2-opt optimization...')
    
    // For now, just return the original loop
    // TODO: Implement proper 2-opt optimization
    return loop
  }

  /**
   * Calculate quality score for a loop
   */
  private calculateQualityScore(loop: any, targetDistance: number): number {
    const distanceAccuracy = calculateDistanceAccuracy(loop.total_distance, targetDistance)
    const pathUniqueness = calculatePathUniqueness(loop.used_edges, loop.segments[0]?.nodes.length || 0)
    const surfaceQuality = calculateSurfaceQuality(loop.segments[0]?.surface_types || {})
    const sceneryVariety = calculateSceneryVariety(loop.geometry)
    
    // Weighted quality score as specified in instructions
    const qualityScore = 
      0.4 * distanceAccuracy + 
      0.3 * pathUniqueness + 
      0.2 * surfaceQuality + 
      0.1 * sceneryVariety
    
    console.log(`📊 Quality metrics: distance=${distanceAccuracy.toFixed(3)}, uniqueness=${pathUniqueness.toFixed(3)}, surface=${surfaceQuality.toFixed(3)}, scenery=${sceneryVariety.toFixed(3)}`)
    
    return qualityScore
  }
}

/**
 * Utility functions for loop generation
 */
export class LoopGenerationUtils {
  /**
   * Create default loop generation options
   */
  static createDefaultOptions(
    targetDistance: number,
    startLat: number,
    startLon: number
  ): LoopGenerationOptions {
    return {
      targetDistance,
      startLat,
      startLon,
      tolerance: 0.05, // 5%
      maxVariants: 5,
      includeSecondary: true,
      maxNodes: 10000
    }
  }

  /**
   * Validate loop generation options
   */
  static validateOptions(options: LoopGenerationOptions): string[] {
    const errors: string[] = []
    
    if (options.targetDistance <= 0) {
      errors.push('Target distance must be positive')
    }
    
    if (options.targetDistance < 1000) {
      errors.push('Target distance should be at least 1km')
    }
    
    if (options.targetDistance > 50000) {
      errors.push('Target distance should be less than 50km')
    }
    
    if (options.startLat < -90 || options.startLat > 90) {
      errors.push('Start latitude must be between -90 and 90')
    }
    
    if (options.startLon < -180 || options.startLon > 180) {
      errors.push('Start longitude must be between -180 and 180')
    }
    
    if (options.tolerance < 0 || options.tolerance > 1) {
      errors.push('Tolerance must be between 0 and 1')
    }
    
    if (options.maxVariants < 1 || options.maxVariants > 10) {
      errors.push('Max variants must be between 1 and 10')
    }
    
    return errors
  }

  /**
   * Format loop for display
   */
  static formatLoop(loop: GeneratedLoop): string {
    return `
🔄 Loop: ${loop.id}
📏 Distance: ${(loop.total_distance / 1000).toFixed(2)}km
⏱️ Duration: ${(loop.total_duration / 60).toFixed(1)}min
📈 Elevation: ${loop.total_elevation.toFixed(0)}m
⭐ Quality: ${(loop.quality_score * 100).toFixed(1)}%
🗺️ Points: ${loop.geometry.length}
    `.trim()
  }

  /**
   * Export loop as GeoJSON
   */
  static exportAsGeoJSON(loop: GeneratedLoop): any {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: loop.geometry
          },
          properties: {
            id: loop.id,
            distance: loop.total_distance,
            duration: loop.total_duration,
            elevation: loop.total_elevation,
            quality_score: loop.quality_score,
            segments: loop.segments.length
          }
        }
      ]
    }
  }
}
