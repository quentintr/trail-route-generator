/**
 * Service de construction de graphe à partir des données OSM
 * 
 * Ce service transforme les données OpenStreetMap en un graphe pondéré
 * optimisé pour la recherche de chemins et la génération de boucles.
 * 
 * Fonctionnalités :
 * - Construction de graphe à partir des données OSM
 * - Filtrage et pondération des arêtes
 * - Structures de données efficaces (Map pour O(1) lookups)
 * - Support des différents types de surfaces et difficultés
 */

import { osmService, GeoJSONFeature } from './osm-service'
import { SearchArea } from '../config/osm-config'
import { 
  haversineDistance, 
  validateCoordinates
} from '../utils/geo-utils'

/**
 * Types pour le graphe
 */
export interface GraphNode {
  id: string
  lat: number
  lon: number
  connections: string[] // IDs des nœuds connectés
  properties?: {
    highway?: string
    surface?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    name?: string
  }
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  distance: number // en mètres
  surface: 'paved' | 'unpaved' | 'mixed'
  highway_type: string
  weight: number // poids calculé pour le pathfinding
  properties?: {
    name?: string
    access?: string
    foot?: string
    bicycle?: string
    motor_vehicle?: string
    width?: string
    smoothness?: string
    tracktype?: string
    trail_visibility?: string
  }
}

export interface Graph {
  nodes: Map<string, GraphNode>
  edges: Map<string, GraphEdge>
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  metadata: {
    totalNodes: number
    totalEdges: number
    buildTime: number
    osmFeatures: number
  }
}

export interface GraphBuildOptions {
  includeSecondary?: boolean
  surfaceTypes?: string[]
  difficulty?: string[]
  maxLength?: number
  minPathLength?: number // Longueur minimale d'un chemin pour l'inclure
  weightFactors?: {
    distance?: number // Facteur de poids pour la distance (défaut: 1.0)
    surface?: number // Bonus/malus pour le type de surface (défaut: 0.2)
    safety?: number // Malus pour les routes dangereuses (défaut: 0.5)
    popularity?: number // Bonus pour les chemins populaires (défaut: 0.1)
  }
}

/**
 * Service de construction de graphe
 */
export class GraphBuilder {
  private cache = new Map<string, Graph>()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes

  /**
   * Construit un graphe à partir des données OSM pour une zone donnée
   * 
   * @param centerPoint Point central {lat, lon}
   * @param radiusKm Rayon de recherche en km
   * @param options Options de construction
   * @returns Graphe pondéré
   */
  async buildGraph(
    centerPoint: { lat: number; lon: number },
    radiusKm: number,
    options: GraphBuildOptions = {}
  ): Promise<Graph> {
    const startTime = Date.now()
    
    // Valider les coordonnées
    if (!validateCoordinates(centerPoint.lat, centerPoint.lon)) {
      throw new Error('Invalid center coordinates')
    }

    // Vérifier le cache
    const cacheKey = this.generateCacheKey(centerPoint, radiusKm, options)
    const cached = this.getCachedGraph(cacheKey)
    if (cached) {
      console.log('Using cached graph')
      return cached
    }

    try {
      // Créer la zone de recherche
      const searchArea = this.createSearchArea(centerPoint, radiusKm)
      
      // Récupérer les données OSM
      console.log('Fetching OSM data for area:', searchArea)
      const osmData = await osmService.getRunningPaths(searchArea, {
        includeSecondary: options.includeSecondary || false,
        surfaceTypes: options.surfaceTypes,
        difficulty: options.difficulty,
        maxLength: options.maxLength
      })

      console.log(`Retrieved ${osmData.features.length} OSM features`)

      // Construire le graphe
      const graph = await this.buildGraphFromOSM(osmData.features, options)
      
      // Ajouter les métadonnées
      graph.metadata = {
        totalNodes: graph.nodes.size,
        totalEdges: graph.edges.size,
        buildTime: Date.now() - startTime,
        osmFeatures: osmData.features.length
      }

      // Mettre en cache
      this.cacheGraph(cacheKey, graph)

      console.log(`Graph built: ${graph.nodes.size} nodes, ${graph.edges.size} edges in ${graph.metadata.buildTime}ms`)
      
      return graph
    } catch (error) {
      console.error('Error building graph:', error)
      throw new Error(`Failed to build graph: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Construit un graphe à partir des features OSM
   */
  private async buildGraphFromOSM(
    features: GeoJSONFeature[],
    options: GraphBuildOptions
  ): Promise<Graph> {
    const nodes = new Map<string, GraphNode>()
    const edges = new Map<string, GraphEdge>()
    
    // Parcourir toutes les features
    for (const feature of features) {
      if (feature.geometry.type !== 'LineString') continue
      
      const coordinates = feature.geometry.coordinates
      if (coordinates.length < 2) continue

      // Filtrer par longueur minimale
      const pathLength = this.calculatePathLength(coordinates)
      if (options.minPathLength && pathLength < options.minPathLength) continue

      // Créer les nœuds et arêtes pour cette feature
      await this.processOSMFeature(feature, nodes, edges, options)
    }

    // Calculer les bounds
    const bounds = this.calculateGraphBounds(nodes)

    return {
      nodes,
      edges,
      bounds,
      metadata: {
        totalNodes: nodes.size,
        totalEdges: edges.size,
        buildTime: 0, // Sera rempli par l'appelant
        osmFeatures: features.length
      }
    }
  }

  /**
   * Traite une feature OSM pour créer des nœuds et arêtes
   */
  private async processOSMFeature(
    feature: GeoJSONFeature,
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    options: GraphBuildOptions
  ): Promise<void> {
    const coordinates = feature.geometry.coordinates
    const properties = feature.properties

    // Créer les nœuds
    const nodeIds: string[] = []
    for (let i = 0; i < coordinates.length; i++) {
      const [lon, lat] = coordinates[i]
      const nodeId = this.generateNodeId(lat, lon)
      
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          lat,
          lon,
          connections: [],
          properties: {
            highway: properties.highway,
            surface: properties.surface,
            difficulty: properties.difficulty,
            name: properties.name
          }
        })
      }
      
      nodeIds.push(nodeId)
    }

    // Créer les arêtes entre nœuds consécutifs
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const fromNode = nodes.get(nodeIds[i])!
      const toNode = nodes.get(nodeIds[i + 1])!
      
      const edgeId = `${nodeIds[i]}-${nodeIds[i + 1]}`
      const distance = haversineDistance(
        fromNode.lat, fromNode.lon,
        toNode.lat, toNode.lon
      ) * 1000 // Convertir en mètres

      // Calculer le poids de l'arête
      const weight = this.calculateEdgeWeight(distance, properties, options)

      const edge: GraphEdge = {
        id: edgeId,
        from: nodeIds[i],
        to: nodeIds[i + 1],
        distance,
        surface: this.determineSurface(properties.surface),
        highway_type: properties.highway || 'unknown',
        weight,
        properties: {
          name: properties.name,
          access: properties.access,
          foot: properties.foot,
          bicycle: properties.bicycle,
          motor_vehicle: properties.motor_vehicle,
          width: properties.width,
          smoothness: properties.smoothness,
          tracktype: properties.tracktype,
          trail_visibility: properties.trail_visibility
        }
      }

      edges.set(edgeId, edge)

      // Ajouter les connexions bidirectionnelles
      fromNode.connections.push(nodeIds[i + 1])
      toNode.connections.push(nodeIds[i])
    }
  }

  /**
   * Calcule le poids d'une arête
   */
  private calculateEdgeWeight(
    distance: number,
    properties: GeoJSONFeature['properties'],
    options: GraphBuildOptions
  ): number {
    const factors = options.weightFactors || {}
    let weight = distance // Poids de base = distance

    // Facteur de surface
    const surfaceFactor = factors.surface || 0.2
    const surface = this.determineSurface(properties.surface)
    switch (surface) {
      case 'paved':
        weight *= (1 - surfaceFactor) // Bonus pour les surfaces pavées
        break
      case 'unpaved':
        weight *= (1 + surfaceFactor) // Malus pour les surfaces non pavées
        break
      case 'mixed':
        // Pas de modification
        break
    }

    // Facteur de sécurité
    const safetyFactor = factors.safety || 0.5
    const highwayType = properties.highway || 'unknown'
    if (this.isDangerousHighway(highwayType)) {
      weight *= (1 + safetyFactor) // Malus pour les routes dangereuses
    }

    // Facteur de popularité (simulé - dans une vraie app, utiliser Strava heatmap)
    const popularityFactor = factors.popularity || 0.1
    if (this.isPopularPath(properties)) {
      weight *= (1 - popularityFactor) // Bonus pour les chemins populaires
    }

    return Math.max(weight, 1) // Poids minimum de 1
  }

  /**
   * Détermine le type de surface
   */
  private determineSurface(surface?: string): 'paved' | 'unpaved' | 'mixed' {
    if (!surface) return 'mixed'
    
    const pavedSurfaces = ['asphalt', 'concrete', 'paved', 'cobblestone']
    const unpavedSurfaces = ['dirt', 'grass', 'gravel', 'sand', 'unpaved']
    
    if (pavedSurfaces.includes(surface.toLowerCase())) {
      return 'paved'
    }
    if (unpavedSurfaces.includes(surface.toLowerCase())) {
      return 'unpaved'
    }
    
    return 'mixed'
  }

  /**
   * Détermine si une route est dangereuse
   */
  private isDangerousHighway(highwayType: string): boolean {
    const dangerousTypes = ['motorway', 'trunk', 'primary']
    return dangerousTypes.includes(highwayType)
  }

  /**
   * Détermine si un chemin est populaire (simulation)
   */
  private isPopularPath(properties: GeoJSONFeature['properties']): boolean {
    // Dans une vraie application, utiliser les données Strava heatmap
    // Pour l'instant, on simule avec certains critères
    return properties.name !== undefined || 
           properties.ref !== undefined ||
           properties.trail_visibility === 'excellent'
  }

  /**
   * Calcule la longueur d'un chemin
   */
  private calculatePathLength(coordinates: [number, number][]): number {
    let totalLength = 0
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1]
      const [lon2, lat2] = coordinates[i]
      totalLength += haversineDistance(lat1, lon1, lat2, lon2)
    }
    return totalLength
  }

  /**
   * Calcule les bounds du graphe
   */
  private calculateGraphBounds(nodes: Map<string, GraphNode>): {
    north: number
    south: number
    east: number
    west: number
  } {
    if (nodes.size === 0) {
      throw new Error('Cannot calculate bounds of empty graph')
    }

    let north = -90, south = 90, east = -180, west = 180
    
    for (const node of nodes.values()) {
      north = Math.max(north, node.lat)
      south = Math.min(south, node.lat)
      east = Math.max(east, node.lon)
      west = Math.min(west, node.lon)
    }

    return { north, south, east, west }
  }

  /**
   * Génère un ID unique pour un nœud
   */
  private generateNodeId(lat: number, lon: number): string {
    // Utiliser une précision de 6 décimales (~0.1m)
    const precision = 6
    const latStr = lat.toFixed(precision)
    const lonStr = lon.toFixed(precision)
    return `${latStr},${lonStr}`
  }

  /**
   * Crée une zone de recherche autour d'un point
   */
  private createSearchArea(centerPoint: { lat: number; lon: number }, radiusKm: number): SearchArea {
    const latOffset = radiusKm / 111 // Approximation : 1° ≈ 111km
    const lonOffset = radiusKm / (111 * Math.cos(centerPoint.lat * Math.PI / 180))
    
    return {
      north: centerPoint.lat + latOffset,
      south: centerPoint.lat - latOffset,
      east: centerPoint.lon + lonOffset,
      west: centerPoint.lon - lonOffset
    }
  }

  /**
   * Génère une clé de cache
   */
  private generateCacheKey(
    centerPoint: { lat: number; lon: number },
    radiusKm: number,
    options: GraphBuildOptions
  ): string {
    const lat = centerPoint.lat.toFixed(4)
    const lon = centerPoint.lon.toFixed(4)
    const radius = radiusKm.toFixed(1)
    const optionsStr = JSON.stringify(options)
    return `${lat},${lon},${radius},${optionsStr}`
  }

  /**
   * Récupère un graphe du cache
   */
  private getCachedGraph(key: string): Graph | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    // Vérifier la validité du cache
    const now = Date.now()
    if (now - cached.metadata.buildTime > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    
    return cached
  }

  /**
   * Met un graphe en cache
   */
  private cacheGraph(key: string, graph: Graph): void {
    // Limiter la taille du cache
    if (this.cache.size >= 10) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(key, graph)
  }

  /**
   * Trouve le nœud le plus proche d'un point donné
   */
  findNearestNode(graph: Graph, targetPoint: { lat: number; lon: number }): GraphNode | null {
    let nearestNode: GraphNode | null = null
    let minDistance = Infinity

    for (const node of graph.nodes.values()) {
      const distance = haversineDistance(
        targetPoint.lat, targetPoint.lon,
        node.lat, node.lon
      )
      
      if (distance < minDistance) {
        minDistance = distance
        nearestNode = node
      }
    }

    return nearestNode
  }

  /**
   * Trouve tous les nœuds dans un rayon donné
   */
  findNodesInRadius(
    graph: Graph,
    centerPoint: { lat: number; lon: number },
    radiusKm: number
  ): GraphNode[] {
    const nodes: GraphNode[] = []
    
    for (const node of graph.nodes.values()) {
      const distance = haversineDistance(
        centerPoint.lat, centerPoint.lon,
        node.lat, node.lon
      )
      
      if (distance <= radiusKm) {
        nodes.push(node)
      }
    }
    
    return nodes
  }

  /**
   * Obtient les statistiques du graphe
   */
  getGraphStats(graph: Graph): {
    nodeCount: number
    edgeCount: number
    averageConnections: number
    surfaceDistribution: Record<string, number>
    highwayDistribution: Record<string, number>
  } {
    let totalConnections = 0
    const surfaceCounts: Record<string, number> = {}
    const highwayCounts: Record<string, number> = {}
    
    // Compter les connexions et surfaces
    for (const node of graph.nodes.values()) {
      totalConnections += node.connections.length
    }
    
    for (const edge of graph.edges.values()) {
      surfaceCounts[edge.surface] = (surfaceCounts[edge.surface] || 0) + 1
      highwayCounts[edge.highway_type] = (highwayCounts[edge.highway_type] || 0) + 1
    }
    
    return {
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.size,
      averageConnections: graph.nodes.size > 0 ? totalConnections / graph.nodes.size : 0,
      surfaceDistribution: surfaceCounts,
      highwayDistribution: highwayCounts
    }
  }
}

/**
 * Instance singleton du constructeur de graphe
 */
export const graphBuilder = new GraphBuilder()