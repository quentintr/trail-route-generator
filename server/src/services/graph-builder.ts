/**
 * Graph Builder Service for Loop Generation
 * 
 * Builds weighted graphs from OSM data with intelligent filtering and weighting.
 * Implements the graph construction logic specified in loop-generation-instructions.md
 */

import { osmService } from './osm-service'
import { 
  haversineDistance, 
  calculateSearchRadius
} from '../utils/geo-utils'

/**
 * Graph node representing a point in the network
 */
export interface GraphNode {
  id: string
  lat: number
  lon: number
  connections: string[] // IDs of connected nodes
  elevation?: number
  tags?: Record<string, string>
}

/**
 * Graph edge representing a path between nodes
 */
export interface GraphEdge {
  id: string
  from: string
  to: string
  distance: number // meters
  surface: 'paved' | 'unpaved' | 'mixed'
  highway_type: string
  weight: number // calculated weight for pathfinding
  geometry?: Array<[number, number]> // intermediate points
  tags?: Record<string, string>
}

/**
 * Weighted graph structure
 */
export interface WeightedGraph {
  nodes: Map<string, GraphNode>
  edges: Map<string, GraphEdge>
  nodeConnections: Map<string, string[]> // adjacency list for fast lookups
}

/**
 * Graph building options
 */
export interface GraphBuildOptions {
  targetDistance: number // meters
  startLat: number
  startLon: number
  includeSecondary?: boolean
  surfaceTypes?: string[]
  difficulty?: string[]
  maxNodes?: number
}

/**
 * Surface type weights for pathfinding
 */
const SURFACE_WEIGHTS: Record<string, number> = {
  'paved': 1.0,
  'asphalt': 1.0,
  'concrete': 1.0,
  'brick': 1.1,
  'paving_stones': 1.1,
  'cobblestone': 1.2,
  'mixed': 1.3,
  'unpaved': 1.5,
  'dirt': 1.5,
  'gravel': 1.4,
  'fine_gravel': 1.3,
  'grass': 1.6,
  'sand': 2.0,
  'rock': 2.5,
  'mud': 3.0
}

/**
 * Highway type weights for pathfinding
 */
const HIGHWAY_WEIGHTS: Record<string, number> = {
  'footway': 1.0,
  'path': 1.1,
  'track': 1.2,
  'cycleway': 1.1,
  'residential': 1.3,
  'living_street': 1.2,
  'unclassified': 1.4,
  'service': 1.5,
  'pedestrian': 1.0,
  'steps': 1.8,
  'bridleway': 1.3
}

/**
 * Safety scores for different road types
 */
const SAFETY_SCORES: Record<string, number> = {
  'footway': 1.0,
  'path': 1.0,
  'track': 1.0,
  'cycleway': 1.1,
  'residential': 1.2,
  'living_street': 1.0,
  'unclassified': 1.3,
  'service': 1.4,
  'pedestrian': 1.0,
  'steps': 1.5,
  'bridleway': 1.1,
  'motorway': 0.0, // Excluded
  'trunk': 0.0,    // Excluded
  'primary': 0.0,  // Excluded
  'secondary': 0.0 // Excluded
}

/**
 * Graph Builder Service
 */
export class GraphBuilder {
  private graph: WeightedGraph
  private options: GraphBuildOptions

  constructor(options: GraphBuildOptions) {
    this.options = options
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      nodeConnections: new Map()
    }
  }

  /**
   * Build the weighted graph from OSM data
   */
  async buildGraph(): Promise<WeightedGraph> {
    console.log('🏗️ Building weighted graph...')
    
    // Calculate search radius
    const searchRadius = calculateSearchRadius(this.options.targetDistance)
    console.log(`📍 Search radius: ${(searchRadius / 1000).toFixed(2)}km`)
    
    // Create search area
    const searchArea = this.createSearchArea(
      this.options.startLat,
      this.options.startLon,
      searchRadius
    )
    
    // Fetch OSM data
    console.log('🗺️ Fetching OSM data...')
    const osmData = await osmService.getRunningPaths(searchArea, {
      includeSecondary: this.options.includeSecondary,
      surfaceTypes: this.options.surfaceTypes,
      difficulty: this.options.difficulty
    })
    
    console.log(`📊 Found ${osmData.features.length} OSM features`)
    
    // Build graph from OSM data
    this.buildGraphFromOSM(osmData)
    
    // Apply graph optimizations
    this.optimizeGraph()
    
    console.log(`✅ Graph built: ${this.graph.nodes.size} nodes, ${this.graph.edges.size} edges`)
    
    return this.graph
  }

  /**
   * Create search area around start point
   */
  private createSearchArea(
    startLat: number,
    startLon: number,
    radius: number
  ) {
    // Convert radius from meters to degrees (approximate)
    const latRadius = radius / 111000 // 1 degree ≈ 111km
    const lonRadius = radius / (111000 * Math.cos(startLat * Math.PI / 180))
    
    return {
      north: startLat + latRadius,
      south: startLat - latRadius,
      east: startLon + lonRadius,
      west: startLon - lonRadius
    }
  }

  /**
   * Build graph from OSM GeoJSON data
   */
  private buildGraphFromOSM(osmData: any) {
    const nodeMap = new Map<string, GraphNode>()
    const edgeMap = new Map<string, GraphEdge>()
    
    // Process each OSM feature
    for (const feature of osmData.features) {
      if (feature.geometry.type !== 'LineString') continue
      
      const coordinates = feature.geometry.coordinates
      const properties = feature.properties
      
      // Filter based on highway type
      if (!this.isValidHighwayType(properties.highway)) continue
      
      // Create nodes for each coordinate
      const nodeIds: string[] = []
      for (let i = 0; i < coordinates.length; i++) {
        const [lon, lat] = coordinates[i]
        const nodeId = `${lat.toFixed(6)},${lon.toFixed(6)}`
        
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, {
            id: nodeId,
            lat,
            lon,
            connections: [],
            tags: properties
          })
        }
        
        nodeIds.push(nodeId)
      }
      
      // Create edges between consecutive nodes
      for (let i = 0; i < nodeIds.length - 1; i++) {
        const fromId = nodeIds[i]
        const toId = nodeIds[i + 1]
        const edgeId = `${fromId}-${toId}`
        
        // Calculate edge properties
        const fromNode = nodeMap.get(fromId)!
        const toNode = nodeMap.get(toId)!
        const distance = haversineDistance(
          fromNode.lat, fromNode.lon,
          toNode.lat, toNode.lon
        )
        
        const surface = this.determineSurfaceType(properties.surface)
        const weight = this.calculateEdgeWeight(
          distance,
          surface,
          properties.highway,
          properties
        )
        
        // Create edge
        const edge: GraphEdge = {
          id: edgeId,
          from: fromId,
          to: toId,
          distance,
          surface,
          highway_type: properties.highway,
          weight,
          geometry: coordinates.slice(i, i + 2),
          tags: properties
        }
        
        edgeMap.set(edgeId, edge)
        
        // Update node connections
        fromNode.connections.push(toId)
        toNode.connections.push(fromId)
      }
    }
    
    // Apply node limit if specified
    if (this.options.maxNodes && nodeMap.size > this.options.maxNodes) {
      this.limitNodes(nodeMap, edgeMap)
    }
    
    // Update graph
    this.graph.nodes = nodeMap
    this.graph.edges = edgeMap
    this.buildAdjacencyList()
  }

  /**
   * Check if highway type is valid for running
   */
  private isValidHighwayType(highway: string): boolean {
    const validTypes = [
      'footway', 'path', 'track', 'cycleway', 'residential',
      'living_street', 'unclassified', 'service', 'pedestrian',
      'steps', 'bridleway'
    ]
    
    return validTypes.includes(highway)
  }

  /**
   * Determine surface type from OSM tags
   */
  private determineSurfaceType(surface: string): 'paved' | 'unpaved' | 'mixed' {
    if (!surface) return 'mixed'
    
    const pavedSurfaces = ['paved', 'asphalt', 'concrete', 'brick', 'paving_stones']
    const unpavedSurfaces = ['unpaved', 'dirt', 'grass', 'gravel', 'sand', 'rock']
    
    if (pavedSurfaces.includes(surface)) return 'paved'
    if (unpavedSurfaces.includes(surface)) return 'unpaved'
    return 'mixed'
  }

  /**
   * Calculate edge weight for pathfinding
   */
  private calculateEdgeWeight(
    distance: number,
    _surface: 'paved' | 'unpaved' | 'mixed',
    highwayType: string,
    tags: Record<string, string>
  ): number {
    let weight = distance // Base weight is distance
    
    // Apply surface weight multiplier
    const surfaceWeight = SURFACE_WEIGHTS[tags.surface || 'mixed'] || 1.0
    weight *= surfaceWeight
    
    // Apply highway type weight
    const highwayWeight = HIGHWAY_WEIGHTS[highwayType] || 1.0
    weight *= highwayWeight
    
    // Apply safety penalty
    const safetyScore = SAFETY_SCORES[highwayType] || 1.0
    if (safetyScore === 0) {
      weight *= 1000 // Heavily penalize excluded road types
    } else {
      weight *= (2 - safetyScore) // Penalize less safe roads
    }
    
    // Apply additional tag-based weights
    if (tags.access === 'no' || tags.foot === 'no') {
      weight *= 1000 // Prohibit access
    }
    
    if (tags.smoothness === 'bad' || tags.smoothness === 'very_bad') {
      weight *= 1.5 // Penalize rough surfaces
    }
    
    if (tags.incline === 'up' || tags.incline === 'down') {
      weight *= 1.2 // Slight penalty for steep sections
    }
    
    return weight
  }

  /**
   * Limit number of nodes to improve performance
   */
  private limitNodes(nodeMap: Map<string, GraphNode>, edgeMap: Map<string, GraphEdge>) {
    console.log(`⚠️ Limiting nodes from ${nodeMap.size} to ${this.options.maxNodes}`)
    
    // Sort nodes by distance from start point
    const nodesArray = Array.from(nodeMap.values())
    nodesArray.sort((a, b) => {
      const distA = haversineDistance(
        this.options.startLat, this.options.startLon,
        a.lat, a.lon
      )
      const distB = haversineDistance(
        this.options.startLat, this.options.startLon,
        b.lat, b.lon
      )
      return distA - distB
    })
    
    // Keep only the closest nodes
    const keepNodes = new Set(nodesArray.slice(0, this.options.maxNodes).map(n => n.id))
    
    // Remove excess nodes
    for (const [nodeId, _node] of nodeMap) {
      if (!keepNodes.has(nodeId)) {
        nodeMap.delete(nodeId)
      }
    }
    
    // Remove edges connected to removed nodes
    for (const [edgeId, edge] of edgeMap) {
      if (!keepNodes.has(edge.from) || !keepNodes.has(edge.to)) {
        edgeMap.delete(edgeId)
      }
    }
  }

  /**
   * Build adjacency list for fast lookups
   */
  private buildAdjacencyList() {
    this.graph.nodeConnections.clear()
    
    for (const [nodeId, node] of this.graph.nodes) {
      this.graph.nodeConnections.set(nodeId, node.connections)
    }
  }

  /**
   * Optimize graph for performance
   */
  private optimizeGraph() {
    console.log('⚡ Optimizing graph...')
    
    // Remove isolated nodes
    this.removeIsolatedNodes()
    
    // Merge nearby nodes (within 10m)
    this.mergeNearbyNodes(10)
    
    // Remove duplicate edges
    this.removeDuplicateEdges()
    
    console.log(`✅ Graph optimized: ${this.graph.nodes.size} nodes, ${this.graph.edges.size} edges`)
  }

  /**
   * Remove nodes with no connections
   */
  private removeIsolatedNodes() {
    const isolatedNodes: string[] = []
    
    for (const [nodeId, node] of this.graph.nodes) {
      if (node.connections.length === 0) {
        isolatedNodes.push(nodeId)
      }
    }
    
    for (const nodeId of isolatedNodes) {
      this.graph.nodes.delete(nodeId)
      this.graph.nodeConnections.delete(nodeId)
    }
    
    if (isolatedNodes.length > 0) {
      console.log(`🗑️ Removed ${isolatedNodes.length} isolated nodes`)
    }
  }

  /**
   * Merge nodes that are very close together
   */
  private mergeNearbyNodes(maxDistance: number) {
    const nodesArray = Array.from(this.graph.nodes.values())
    const mergedNodes = new Set<string>()
    let mergeCount = 0
    
    for (let i = 0; i < nodesArray.length; i++) {
      if (mergedNodes.has(nodesArray[i].id)) continue
      
      const node1 = nodesArray[i]
      const nearbyNodes: string[] = []
      
      for (let j = i + 1; j < nodesArray.length; j++) {
        if (mergedNodes.has(nodesArray[j].id)) continue
        
        const node2 = nodesArray[j]
        const distance = haversineDistance(node1.lat, node1.lon, node2.lat, node2.lon)
        
        if (distance <= maxDistance) {
          nearbyNodes.push(node2.id)
        }
      }
      
      if (nearbyNodes.length > 0) {
        // Merge nearby nodes into the first one
        for (const nearbyNodeId of nearbyNodes) {
          const nearbyNode = this.graph.nodes.get(nearbyNodeId)!
          
          // Transfer connections
          for (const connection of nearbyNode.connections) {
            if (!node1.connections.includes(connection)) {
              node1.connections.push(connection)
            }
          }
          
          // Update edges
          for (const [_edgeId, edge] of this.graph.edges) {
            if (edge.from === nearbyNodeId) {
              edge.from = node1.id
            }
            if (edge.to === nearbyNodeId) {
              edge.to = node1.id
            }
          }
          
          // Remove the merged node
          this.graph.nodes.delete(nearbyNodeId)
          mergedNodes.add(nearbyNodeId)
          mergeCount++
        }
      }
    }
    
    if (mergeCount > 0) {
      console.log(`🔗 Merged ${mergeCount} nearby nodes`)
    }
  }

  /**
   * Remove duplicate edges
   */
  private removeDuplicateEdges() {
    const edgeMap = new Map<string, GraphEdge>()
    let duplicateCount = 0
    
    for (const [_edgeId, edge] of this.graph.edges) {
      const normalizedId = edge.from < edge.to ? 
        `${edge.from}-${edge.to}` : 
        `${edge.to}-${edge.from}`
      
      if (edgeMap.has(normalizedId)) {
        duplicateCount++
        // Keep the edge with lower weight
        const existingEdge = edgeMap.get(normalizedId)!
        if (edge.weight < existingEdge.weight) {
          edgeMap.set(normalizedId, edge)
        }
      } else {
        edgeMap.set(normalizedId, edge)
      }
    }
    
    this.graph.edges = edgeMap
    
    if (duplicateCount > 0) {
      console.log(`🗑️ Removed ${duplicateCount} duplicate edges`)
    }
  }

  /**
   * Get graph statistics
   */
  getGraphStats(): {
    nodeCount: number
    edgeCount: number
    averageConnections: number
    totalDistance: number
  } {
    let totalConnections = 0
    let totalDistance = 0
    
    for (const node of this.graph.nodes.values()) {
      totalConnections += node.connections.length
    }
    
    for (const edge of this.graph.edges.values()) {
      totalDistance += edge.distance
    }
    
    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size,
      averageConnections: totalConnections / this.graph.nodes.size,
      totalDistance
    }
  }

  /**
   * Find the closest node to a given point
   */
  findClosestNode(lat: number, lon: number): GraphNode | null {
    let closestNode: GraphNode | null = null
    let minDistance = Infinity
    
    for (const node of this.graph.nodes.values()) {
      const distance = haversineDistance(lat, lon, node.lat, node.lon)
      if (distance < minDistance) {
        minDistance = distance
        closestNode = node
      }
    }
    
    return closestNode
  }

  /**
   * Get all nodes within a certain distance of a point
   */
  getNodesWithinDistance(
    lat: number, 
    lon: number, 
    maxDistance: number
  ): GraphNode[] {
    const nearbyNodes: GraphNode[] = []
    
    for (const node of this.graph.nodes.values()) {
      const distance = haversineDistance(lat, lon, node.lat, node.lon)
      if (distance <= maxDistance) {
        nearbyNodes.push(node)
      }
    }
    
    return nearbyNodes
  }
}
