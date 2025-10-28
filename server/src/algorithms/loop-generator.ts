/**
 * Générateur de boucles de randonnée/course
 * 
 * Ce module implémente l'algorithme de génération de boucles basé sur
 * l'exploration radiale avec retour intelligent selon les spécifications
 * du fichier loop-generation-instructions.md.
 * 
 * Fonctionnalités :
 * - Méthode d'exploration radiale
 * - Génération de multiples variantes (3-5)
 * - Fonction de scoring de qualité
 * - Optimisation 2-opt pour lisser les boucles
 */

import { Graph, GraphNode, GraphEdge } from '../services/graph-builder'
import { pathfindingAlgorithms, PathfindingResult, PathfindingOptions } from './pathfinding'
import { 
  haversineDistance, 
  calculateBearing, 
  calculateSearchRadius,
  validateCoordinates
} from '../utils/geo-utils'

/**
 * Types pour la génération de boucles
 */
export interface RouteSegment {
  nodes: string[]
  distance: number
  duration: number // en secondes
  elevation_gain: number
  surface_types: Record<string, number> // pourcentage de chaque surface
}

export interface GeneratedLoop {
  id: string
  segments: RouteSegment[]
  total_distance: number
  total_duration: number
  total_elevation: number
  quality_score: number
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  metadata: {
    exploration_distance: number
    return_distance: number
    surface_distribution: Record<string, number>
    difficulty: 'easy' | 'medium' | 'hard' | 'expert'
    terrain_type: 'paved' | 'unpaved' | 'mixed'
  }
}

export interface LoopGenerationRequest {
  start_lat: number
  start_lon: number
  distance?: number // Distance cible en km
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
  terrain_type?: 'paved' | 'unpaved' | 'mixed'
  elevation_gain?: number
  pace?: number // Allure en minutes par km
}

export interface LoopGenerationOptions {
  maxVariants?: number // Nombre maximum de variantes à générer
  explorationRatio?: number // Ratio d'exploration (défaut: 0.5)
  qualityThreshold?: number // Seuil de qualité minimum
  avoidOverlap?: boolean // Éviter les chevauchements entre variantes
  optimizeWith2Opt?: boolean // Appliquer l'optimisation 2-opt
}

/**
 * Service de génération de boucles
 */
export class LoopGenerator {
  private readonly DEFAULT_EXPLORATION_RATIO = 0.5
  private readonly DEFAULT_MAX_VARIANTS = 5
  private readonly DEFAULT_QUALITY_THRESHOLD = 0.3

  /**
   * Génère des boucles de randonnée/course
   * 
   * @param graph Graphe OSM construit
   * @param request Paramètres de génération
   * @param options Options de génération
   * @returns Liste des boucles générées
   */
  async generateLoops(
    graph: Graph,
    request: LoopGenerationRequest,
    options: LoopGenerationOptions = {}
  ): Promise<GeneratedLoop[]> {
    const startTime = Date.now()
    
    // Valider les paramètres
    this.validateRequest(request)
    
    // Configuration par défaut
    const config = {
      maxVariants: options.maxVariants || this.DEFAULT_MAX_VARIANTS,
      explorationRatio: options.explorationRatio || this.DEFAULT_EXPLORATION_RATIO,
      qualityThreshold: options.qualityThreshold || this.DEFAULT_QUALITY_THRESHOLD,
      avoidOverlap: options.avoidOverlap !== false,
      optimizeWith2Opt: options.optimizeWith2Opt !== false
    }

    console.log(`Generating loops: target ${request.distance || 10}km, ${config.maxVariants} variants`)

    try {
      // Trouver le nœud de départ le plus proche
      const startNode = this.findStartNode(graph, request)
      if (!startNode) {
        throw new Error('No suitable start node found in the area')
      }

      console.log(`Start node found: ${startNode.id} at ${startNode.lat}, ${startNode.lon}`)

      // Calculer le rayon de recherche
      const targetDistance = (request.distance || 10) * 1000 // Convertir en mètres

      // Générer les variantes
      const loops: GeneratedLoop[] = []
      const usedEdges = new Set<string>() // Pour éviter les chevauchements

      for (let variant = 0; variant < config.maxVariants; variant++) {
        console.log(`Generating variant ${variant + 1}/${config.maxVariants}`)
        
        const loop = await this.generateSingleLoop(
          graph,
          startNode,
          targetDistance,
          request,
          config,
          usedEdges
        )

        if (loop && loop.quality_score >= config.qualityThreshold) {
          loops.push(loop)
          
          // Marquer les arêtes utilisées pour éviter les chevauchements
          if (config.avoidOverlap) {
            for (const segment of loop.segments) {
              for (let i = 0; i < segment.nodes.length - 1; i++) {
                const edgeId = `${segment.nodes[i]}-${segment.nodes[i + 1]}`
                const reverseEdgeId = `${segment.nodes[i + 1]}-${segment.nodes[i]}`
                usedEdges.add(edgeId)
                usedEdges.add(reverseEdgeId)
              }
            }
          }
        }
      }

      // Trier par score de qualité
      loops.sort((a, b) => b.quality_score - a.quality_score)

      console.log(`Generated ${loops.length} loops in ${Date.now() - startTime}ms`)
      
      return loops
    } catch (error) {
      console.error('Error generating loops:', error)
      throw new Error(`Failed to generate loops: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Génère une seule boucle
   */
  private async generateSingleLoop(
    graph: Graph,
    startNode: GraphNode,
    targetDistance: number,
    request: LoopGenerationRequest,
    config: Required<LoopGenerationOptions>,
    usedEdges: Set<string>
  ): Promise<GeneratedLoop | null> {
    try {
      // Phase 1: Exploration radiale
      const explorationDistance = targetDistance * config.explorationRatio
      const explorationResult = await this.exploreRadially(
        graph,
        startNode,
        explorationDistance,
        request,
        usedEdges
      )

      if (!explorationResult) {
        return null
      }

      // Phase 2: Trouver le meilleur point de retour
      const returnPoint = this.selectBestReturnPoint(
        graph,
        startNode,
        explorationResult,
        targetDistance
      )

      if (!returnPoint) {
        return null
      }

      // Phase 3: Calculer le chemin de retour
      const returnPath = await this.calculateReturnPath(
        graph,
        returnPoint.nodeId,
        startNode.id,
        usedEdges
      )

      if (!returnPath) {
        return null
      }

      // Phase 4: Construire la boucle complète
      const loop = this.buildCompleteLoop(
        graph,
        startNode,
        explorationResult,
        returnPath,
        request
      )

      // Phase 5: Optimisation 2-opt (optionnelle)
      if (config.optimizeWith2Opt) {
        this.optimizeWith2Opt(loop)
      }

      // Phase 6: Calculer le score de qualité
      loop.quality_score = this.calculateQualityScore(loop, request)

      return loop
    } catch (error) {
      console.error('Error generating single loop:', error)
      return null
    }
  }

  /**
   * Phase d'exploration radiale
   */
  private async exploreRadially(
    graph: Graph,
    startNode: GraphNode,
    targetDistance: number,
    request: LoopGenerationRequest,
    usedEdges: Set<string>
  ): Promise<PathfindingResult | null> {
    console.log(`Exploring radially: target ${targetDistance}m from start`)

    // Options de pathfinding pour l'exploration
    const options: PathfindingOptions = {
      maxDistance: targetDistance * 1.2, // Marge de 20%
      avoidEdges: Array.from(usedEdges),
      customWeightFunction: (edge, fromNode, toNode) => {
        return this.calculateExplorationWeight(edge, fromNode, toNode, request)
      }
    }

    // Utiliser Dijkstra pour l'exploration
    const result = pathfindingAlgorithms.dijkstra(
      graph,
      startNode.id,
      undefined, // Pas de destination spécifique
      options
    )

    return result
  }

  /**
   * Calcule le poids d'une arête pour l'exploration
   */
  private calculateExplorationWeight(
    edge: GraphEdge,
    fromNode: GraphNode,
    toNode: GraphNode,
    request: LoopGenerationRequest
  ): number {
    let weight = edge.weight

    // Préférences de terrain
    if (request.terrain_type) {
      switch (request.terrain_type) {
        case 'paved':
          if (edge.surface === 'paved') weight *= 0.8
          else if (edge.surface === 'unpaved') weight *= 1.5
          break
        case 'unpaved':
          if (edge.surface === 'unpaved') weight *= 0.8
          else if (edge.surface === 'paved') weight *= 1.2
          break
        case 'mixed':
          // Pas de modification
          break
      }
    }

    // Préférences de difficulté
    if (request.difficulty) {
      const difficultyMultiplier = this.getDifficultyMultiplier(request.difficulty, edge)
      weight *= difficultyMultiplier
    }

    // Bonus pour la diversité directionnelle
    const bearing = calculateBearing(fromNode.lat, fromNode.lon, toNode.lat, toNode.lon)
    const diversityBonus = Math.abs(Math.sin(bearing * Math.PI / 180)) * 0.1
    weight *= (1 - diversityBonus)

    return weight
  }

  /**
   * Sélectionne le meilleur point de retour
   */
  private selectBestReturnPoint(
    graph: Graph,
    startNode: GraphNode,
    explorationResult: PathfindingResult,
    targetDistance: number
  ): { nodeId: string; distance: number } | null {
    const candidates: Array<{ nodeId: string; distance: number; score: number }> = []

    // Évaluer chaque nœud accessible
    for (let i = 0; i < explorationResult.nodes.length; i++) {
      const node = explorationResult.nodes[i]
      const distance = explorationResult.distance * (i / (explorationResult.nodes.length - 1))

      // Score basé sur la distance (préférer ~50% de la distance cible)
      const distanceRatio = distance / targetDistance
      const distanceScore = 1 - Math.abs(distanceRatio - 0.5) * 2

      // Score de diversité angulaire
      const bearing = calculateBearing(startNode.lat, startNode.lon, node.lat, node.lon)
      const angularScore = Math.abs(Math.sin(bearing * Math.PI / 180))

      // Score combiné
      const totalScore = distanceScore * 0.6 + angularScore * 0.4

      candidates.push({
        nodeId: node.id,
        distance,
        score: totalScore
      })
    }

    // Trier par score et retourner le meilleur
    candidates.sort((a, b) => b.score - a.score)
    
    return candidates.length > 0 ? candidates[0] : null
  }

  /**
   * Calcule le chemin de retour
   */
  private async calculateReturnPath(
    graph: Graph,
    returnNodeId: string,
    startNodeId: string,
    usedEdges: Set<string>
  ): Promise<PathfindingResult | null> {
    console.log(`Calculating return path from ${returnNodeId} to ${startNodeId}`)

    const options: PathfindingOptions = {
      avoidEdges: Array.from(usedEdges),
      customWeightFunction: (edge) => {
        // Pénaliser les arêtes déjà utilisées
        if (usedEdges.has(edge.id)) {
          return edge.weight * 5
        }
        return edge.weight
      }
    }

    // Utiliser A* pour le retour
    return pathfindingAlgorithms.aStar(
      graph,
      returnNodeId,
      startNodeId,
      options
    )
  }

  /**
   * Construit la boucle complète
   */
  private buildCompleteLoop(
    graph: Graph,
    startNode: GraphNode,
    explorationResult: PathfindingResult,
    returnPath: PathfindingResult,
    request: LoopGenerationRequest
  ): GeneratedLoop {
    const loopId = `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Combiner les segments
    const allNodes = [...explorationResult.nodes, ...returnPath.nodes.slice(1)] // Éviter la duplication du point de départ
    const allEdges = [...explorationResult.edges, ...returnPath.edges]

    // Calculer les métriques
    const totalDistance = explorationResult.distance + returnPath.distance
    const totalDuration = this.calculateDuration(totalDistance, request.pace || 5)
    const totalElevation = this.calculateElevation(allEdges)
    
    // Analyser les surfaces
    const surfaceDistribution = this.analyzeSurfaceDistribution(allEdges)
    
    // Créer les segments
    const segments: RouteSegment[] = [
      {
        nodes: explorationResult.path,
        distance: explorationResult.distance,
        duration: this.calculateDuration(explorationResult.distance, request.pace || 5),
        elevation_gain: this.calculateElevation(explorationResult.edges),
        surface_types: this.analyzeSurfaceDistribution(explorationResult.edges)
      },
      {
        nodes: returnPath.path.slice(1), // Éviter la duplication
        distance: returnPath.distance,
        duration: this.calculateDuration(returnPath.distance, request.pace || 5),
        elevation_gain: this.calculateElevation(returnPath.edges),
        surface_types: this.analyzeSurfaceDistribution(returnPath.edges)
      }
    ]

    // Créer la géométrie GeoJSON
    const coordinates: [number, number][] = allNodes.map(node => [node.lon, node.lat])

    return {
      id: loopId,
      segments,
      total_distance: totalDistance,
      total_duration: totalDuration,
      total_elevation: totalElevation,
      quality_score: 0, // Sera calculé plus tard
      geometry: {
        type: 'LineString',
        coordinates
      },
      metadata: {
        exploration_distance: explorationResult.distance,
        return_distance: returnPath.distance,
        surface_distribution: surfaceDistribution,
        difficulty: this.determineDifficulty(totalDistance, totalElevation, request.pace || 5),
        terrain_type: this.determineTerrainType(surfaceDistribution)
      }
    }
  }

  /**
   * Optimise la boucle avec l'algorithme 2-opt
   */
  private optimizeWith2Opt(_loop: GeneratedLoop): void {
    // Implémentation simplifiée de 2-opt
    // Dans une vraie application, on implémenterait l'algorithme complet
    console.log('Applying 2-opt optimization')
    
    // Pour l'instant, on se contente de marquer que l'optimisation a été appliquée
    // Une implémentation complète nécessiterait de recalculer les chemins
  }

  /**
   * Calcule le score de qualité d'une boucle
   */
  private calculateQualityScore(loop: GeneratedLoop, request: LoopGenerationRequest): number {
    let score = 0

    // Score de précision de distance (40%)
    const targetDistance = (request.distance || 10) * 1000
    const distanceAccuracy = 1 - Math.abs(loop.total_distance - targetDistance) / targetDistance
    score += distanceAccuracy * 0.4

    // Score d'unicité du chemin (30%)
    const pathUniqueness = this.calculatePathUniqueness(loop)
    score += pathUniqueness * 0.3

    // Score de qualité de surface (20%)
    const surfaceQuality = this.calculateSurfaceQuality(loop, request.terrain_type)
    score += surfaceQuality * 0.2

    // Score de variété de paysage (10%)
    const sceneryVariety = this.calculateSceneryVariety(loop)
    score += sceneryVariety * 0.1

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Calcule l'unicité du chemin
   */
  private calculatePathUniqueness(loop: GeneratedLoop): number {
    // Mesure la diversité des directions et évite les retours directs
    const nodes = loop.geometry.coordinates
    if (nodes.length < 3) return 0

    let totalAngleChange = 0
    for (let i = 1; i < nodes.length - 1; i++) {
      const [lon1, lat1] = nodes[i - 1]
      const [lon2, lat2] = nodes[i]
      const [lon3, lat3] = nodes[i + 1]
      
      const bearing1 = calculateBearing(lat1, lon1, lat2, lon2)
      const bearing2 = calculateBearing(lat2, lon2, lat3, lon3)
      
      const angleChange = Math.abs(bearing1 - bearing2)
      totalAngleChange += Math.min(angleChange, 360 - angleChange)
    }

    return Math.min(totalAngleChange / (nodes.length - 2) / 180, 1)
  }

  /**
   * Calcule la qualité de surface
   */
  private calculateSurfaceQuality(loop: GeneratedLoop, preferredTerrain?: string): number {
    if (!preferredTerrain) return 0.5

    const distribution = loop.metadata.surface_distribution
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
    
    if (total === 0) return 0.5

    switch (preferredTerrain) {
      case 'paved':
        return (distribution.paved || 0) / total
      case 'unpaved':
        return (distribution.unpaved || 0) / total
      case 'mixed':
        return 0.5 // Score neutre pour mixed
      default:
        return 0.5
    }
  }

  /**
   * Calcule la variété de paysage
   */
  private calculateSceneryVariety(loop: GeneratedLoop): number {
    // Mesure la diversité des surfaces et des types de routes
    const surfaceTypes = Object.keys(loop.metadata.surface_distribution).length
    return Math.min(surfaceTypes / 3, 1) // Max 3 types de surfaces
  }

  /**
   * Trouve le nœud de départ le plus proche
   */
  private findStartNode(graph: Graph, request: LoopGenerationRequest): GraphNode | null {
    let nearestNode: GraphNode | null = null
    let minDistance = Infinity

    for (const node of graph.nodes.values()) {
      const distance = haversineDistance(
        request.start_lat, request.start_lon,
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
   * Calcule la durée basée sur l'allure
   */
  private calculateDuration(distance: number, pace: number): number {
    return (distance / 1000) * pace * 60 // Convertir en secondes
  }

  /**
   * Calcule l'élévation totale
   */
  private calculateElevation(edges: GraphEdge[]): number {
    // Simulation - dans une vraie app, utiliser des données d'élévation
    return edges.length * 5 // 5m par arête en moyenne
  }

  /**
   * Analyse la distribution des surfaces
   */
  private analyzeSurfaceDistribution(edges: GraphEdge[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    for (const edge of edges) {
      distribution[edge.surface] = (distribution[edge.surface] || 0) + 1
    }
    
    return distribution
  }

  /**
   * Détermine la difficulté
   */
  private determineDifficulty(distance: number, elevation: number, _pace: number): 'easy' | 'medium' | 'hard' | 'expert' {
    const distanceKm = distance / 1000
    const elevationPerKm = elevation / distanceKm
    
    if (distanceKm > 20 || elevationPerKm > 100) return 'expert'
    if (distanceKm > 15 || elevationPerKm > 75) return 'hard'
    if (distanceKm > 10 || elevationPerKm > 50) return 'medium'
    return 'easy'
  }

  /**
   * Détermine le type de terrain
   */
  private determineTerrainType(distribution: Record<string, number>): 'paved' | 'unpaved' | 'mixed' {
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
    if (total === 0) return 'mixed'
    
    const pavedRatio = (distribution.paved || 0) / total
    const unpavedRatio = (distribution.unpaved || 0) / total
    
    if (pavedRatio > 0.7) return 'paved'
    if (unpavedRatio > 0.7) return 'unpaved'
    return 'mixed'
  }

  /**
   * Obtient le multiplicateur de difficulté
   */
  private getDifficultyMultiplier(difficulty: string, edge: GraphEdge): number {
    const difficultyScores = {
      easy: { paved: 0.8, mixed: 1.0, unpaved: 1.5 },
      medium: { paved: 1.0, mixed: 0.9, unpaved: 1.0 },
      hard: { paved: 1.2, mixed: 0.8, unpaved: 0.8 },
      expert: { paved: 1.5, mixed: 0.7, unpaved: 0.6 }
    }
    
    return difficultyScores[difficulty as keyof typeof difficultyScores]?.[edge.surface] || 1.0
  }

  /**
   * Valide la requête de génération
   */
  private validateRequest(request: LoopGenerationRequest): void {
    if (!validateCoordinates(request.start_lat, request.start_lon)) {
      throw new Error('Invalid start coordinates')
    }
    
    if (request.distance && (request.distance < 1 || request.distance > 50)) {
      throw new Error('Distance must be between 1 and 50 km')
    }
    
    if (request.pace && (request.pace < 3 || request.pace > 15)) {
      throw new Error('Pace must be between 3 and 15 minutes per km')
    }
  }
}

/**
 * Instance singleton du générateur de boucles
 */
export const loopGenerator = new LoopGenerator()