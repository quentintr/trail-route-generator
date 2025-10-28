/**
 * Algorithmes de recherche de chemin (Pathfinding)
 * 
 * Ce module implémente les algorithmes de recherche de chemin optimisés
 * pour la génération de boucles de randonnée/course.
 * 
 * Algorithmes implémentés :
 * - Dijkstra avec file de priorité
 * - A* avec fonction heuristique
 * - Support de fonctions de poids personnalisées
 */

import { Graph, GraphNode, GraphEdge } from '../services/graph-builder'
import { haversineDistance, calculateBearing } from '../utils/geo-utils'

/**
 * Types pour les résultats de pathfinding
 */
export interface PathfindingResult {
  path: string[] // IDs des nœuds du chemin
  distance: number // Distance totale en mètres
  weight: number // Poids total du chemin
  nodes: GraphNode[] // Nœuds du chemin
  edges: GraphEdge[] // Arêtes du chemin
}

export interface PathfindingOptions {
  maxDistance?: number // Distance maximale à explorer
  maxNodes?: number // Nombre maximal de nœuds à explorer
  avoidEdges?: string[] // IDs des arêtes à éviter
  preferEdges?: string[] // IDs des arêtes à privilégier
  customWeightFunction?: (edge: GraphEdge, fromNode: GraphNode, toNode: GraphNode) => number
}

/**
 * File de priorité simple pour Dijkstra/A*
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

  clear(): void {
    this.items = []
  }
}

/**
 * Classe pour les algorithmes de pathfinding
 */
export class PathfindingAlgorithms {
  /**
   * Algorithme de Dijkstra avec file de priorité
   * 
   * @param graph Graphe à explorer
   * @param startNodeId ID du nœud de départ
   * @param endNodeId ID du nœud d'arrivée (optionnel pour exploration)
   * @param options Options de recherche
   * @returns Résultat du pathfinding
   */
  dijkstra(
    graph: Graph,
    startNodeId: string,
    endNodeId?: string,
    options: PathfindingOptions = {}
  ): PathfindingResult | null {
    const startTime = Date.now()
    
    // Vérifier que le nœud de départ existe
    const startNode = graph.nodes.get(startNodeId)
    if (!startNode) {
      throw new Error(`Start node ${startNodeId} not found in graph`)
    }

    // Structures de données pour Dijkstra
    const distances = new Map<string, number>()
    const previous = new Map<string, string | null>()
    const visited = new Set<string>()
    const queue = new PriorityQueue<string>()

    // Initialiser les distances
    for (const nodeId of graph.nodes.keys()) {
      distances.set(nodeId, Infinity)
      previous.set(nodeId, null)
    }
    distances.set(startNodeId, 0)

    // Ajouter le nœud de départ à la queue
    queue.enqueue(startNodeId, 0)

    let exploredNodes = 0
    const maxNodes = options.maxNodes || 10000

    // Algorithme de Dijkstra
    while (!queue.isEmpty() && exploredNodes < maxNodes) {
      const currentNodeId = queue.dequeue()
      if (!currentNodeId) break

      // Si on a atteint le nœud de destination, on peut s'arrêter
      if (endNodeId && currentNodeId === endNodeId) {
        break
      }

      if (visited.has(currentNodeId)) continue
      visited.add(currentNodeId)
      exploredNodes++

      const currentNode = graph.nodes.get(currentNodeId)!
      const currentDistance = distances.get(currentNodeId)!

      // Vérifier la distance maximale
      if (options.maxDistance && currentDistance > options.maxDistance) {
        continue
      }

      // Explorer les voisins
      for (const neighborId of currentNode.connections) {
        if (visited.has(neighborId)) continue

        const edgeId = `${currentNodeId}-${neighborId}`
        const reverseEdgeId = `${neighborId}-${currentNodeId}`
        
        // Trouver l'arête (peut être dans les deux sens)
        let edge = graph.edges.get(edgeId)
        if (!edge) {
          edge = graph.edges.get(reverseEdgeId)
        }
        
        if (!edge) continue

        // Vérifier si cette arête doit être évitée
        if (options.avoidEdges && options.avoidEdges.includes(edge.id)) {
          continue
        }

        // Calculer le nouveau poids
        let edgeWeight = edge.weight
        
        // Appliquer les préférences d'arêtes
        if (options.preferEdges && options.preferEdges.includes(edge.id)) {
          edgeWeight *= 0.5 // Réduire le poids de moitié
        }

        // Appliquer la fonction de poids personnalisée
        if (options.customWeightFunction) {
          const neighborNode = graph.nodes.get(neighborId)!
          edgeWeight = options.customWeightFunction(edge, currentNode, neighborNode)
        }

        const newDistance = currentDistance + edgeWeight
        const existingDistance = distances.get(neighborId)!

        if (newDistance < existingDistance) {
          distances.set(neighborId, newDistance)
          previous.set(neighborId, currentNodeId)
          queue.enqueue(neighborId, newDistance)
        }
      }
    }

    // Si on cherche un chemin spécifique et qu'on ne l'a pas trouvé
    if (endNodeId && !visited.has(endNodeId)) {
      return null
    }

    // Reconstruire le chemin
    const path = this.reconstructPath(previous, startNodeId, endNodeId)
    if (!path || path.length === 0) {
      return null
    }

    // Calculer les métriques du chemin
    const result = this.calculatePathMetrics(graph, path)
    
    console.log(`Dijkstra completed: ${path.length} nodes, ${result.distance.toFixed(0)}m, ${Date.now() - startTime}ms`)
    
    return result
  }

  /**
   * Algorithme A* avec fonction heuristique
   * 
   * @param graph Graphe à explorer
   * @param startNodeId ID du nœud de départ
   * @param endNodeId ID du nœud d'arrivée
   * @param options Options de recherche
   * @returns Résultat du pathfinding
   */
  aStar(
    graph: Graph,
    startNodeId: string,
    endNodeId: string,
    options: PathfindingOptions = {}
  ): PathfindingResult | null {
    const startTime = Date.now()
    
    // Vérifier que les nœuds existent
    const startNode = graph.nodes.get(startNodeId)
    const endNode = graph.nodes.get(endNodeId)
    
    if (!startNode || !endNode) {
      throw new Error('Start or end node not found in graph')
    }

    // Structures de données pour A*
    const gScore = new Map<string, number>() // Coût réel du chemin
    const fScore = new Map<string, number>() // Coût estimé total
    const previous = new Map<string, string | null>()
    const openSet = new PriorityQueue<string>()
    const closedSet = new Set<string>()

    // Initialiser les scores
    for (const nodeId of graph.nodes.keys()) {
      gScore.set(nodeId, Infinity)
      fScore.set(nodeId, Infinity)
      previous.set(nodeId, null)
    }

    gScore.set(startNodeId, 0)
    fScore.set(startNodeId, this.heuristic(startNode, endNode))

    openSet.enqueue(startNodeId, fScore.get(startNodeId)!)

    let exploredNodes = 0
    const maxNodes = options.maxNodes || 10000

    // Algorithme A*
    while (!openSet.isEmpty() && exploredNodes < maxNodes) {
      const currentNodeId = openSet.dequeue()
      if (!currentNodeId) break

      if (closedSet.has(currentNodeId)) continue
      closedSet.add(currentNodeId)
      exploredNodes++

      // Si on a atteint la destination
      if (currentNodeId === endNodeId) {
        break
      }

      const currentNode = graph.nodes.get(currentNodeId)!
      const currentGScore = gScore.get(currentNodeId)!

      // Vérifier la distance maximale
      if (options.maxDistance && currentGScore > options.maxDistance) {
        continue
      }

      // Explorer les voisins
      for (const neighborId of currentNode.connections) {
        if (closedSet.has(neighborId)) continue

        const edgeId = `${currentNodeId}-${neighborId}`
        const reverseEdgeId = `${neighborId}-${currentNodeId}`
        
        // Trouver l'arête
        let edge = graph.edges.get(edgeId)
        if (!edge) {
          edge = graph.edges.get(reverseEdgeId)
        }
        
        if (!edge) continue

        // Vérifier si cette arête doit être évitée
        if (options.avoidEdges && options.avoidEdges.includes(edge.id)) {
          continue
        }

        // Calculer le nouveau coût
        let edgeWeight = edge.weight
        
        // Appliquer les préférences d'arêtes
        if (options.preferEdges && options.preferEdges.includes(edge.id)) {
          edgeWeight *= 0.5
        }

        // Appliquer la fonction de poids personnalisée
        if (options.customWeightFunction) {
          const neighborNode = graph.nodes.get(neighborId)!
          edgeWeight = options.customWeightFunction(edge, currentNode, neighborNode)
        }

        const tentativeGScore = currentGScore + edgeWeight
        const existingGScore = gScore.get(neighborId)!

        if (tentativeGScore < existingGScore) {
          previous.set(neighborId, currentNodeId)
          gScore.set(neighborId, tentativeGScore)
          
          const neighborNode = graph.nodes.get(neighborId)!
          const hScore = this.heuristic(neighborNode, endNode)
          const newFScore = tentativeGScore + hScore
          
          fScore.set(neighborId, newFScore)
          openSet.enqueue(neighborId, newFScore)
        }
      }
    }

    // Vérifier si on a trouvé un chemin
    if (!closedSet.has(endNodeId)) {
      return null
    }

    // Reconstruire le chemin
    const path = this.reconstructPath(previous, startNodeId, endNodeId)
    if (!path || path.length === 0) {
      return null
    }

    // Calculer les métriques du chemin
    const result = this.calculatePathMetrics(graph, path)
    
    console.log(`A* completed: ${path.length} nodes, ${result.distance.toFixed(0)}m, ${Date.now() - startTime}ms`)
    
    return result
  }

  /**
   * Trouve tous les chemins possibles depuis un point de départ
   * 
   * @param graph Graphe à explorer
   * @param startNodeId ID du nœud de départ
   * @param maxDistance Distance maximale à explorer
   * @param options Options de recherche
   * @returns Map des nœuds accessibles avec leurs distances
   */
  exploreFromStart(
    graph: Graph,
    startNodeId: string,
    maxDistance: number,
    options: PathfindingOptions = {}
  ): Map<string, { distance: number; path: string[] }> {
    const startTime = Date.now()
    
    const startNode = graph.nodes.get(startNodeId)
    if (!startNode) {
      throw new Error(`Start node ${startNodeId} not found in graph`)
    }

    const distances = new Map<string, number>()
    const previous = new Map<string, string | null>()
    const visited = new Set<string>()
    const queue = new PriorityQueue<string>()

    // Initialiser
    for (const nodeId of graph.nodes.keys()) {
      distances.set(nodeId, Infinity)
      previous.set(nodeId, null)
    }
    distances.set(startNodeId, 0)

    queue.enqueue(startNodeId, 0)

    // Exploration
    while (!queue.isEmpty()) {
      const currentNodeId = queue.dequeue()
      if (!currentNodeId) break

      if (visited.has(currentNodeId)) continue
      visited.add(currentNodeId)

      const currentDistance = distances.get(currentNodeId)!

      // Si on dépasse la distance maximale, on s'arrête
      if (currentDistance > maxDistance) {
        continue
      }

      const currentNode = graph.nodes.get(currentNodeId)!

      // Explorer les voisins
      for (const neighborId of currentNode.connections) {
        if (visited.has(neighborId)) continue

        const edgeId = `${currentNodeId}-${neighborId}`
        const reverseEdgeId = `${neighborId}-${currentNodeId}`
        
        let edge = graph.edges.get(edgeId)
        if (!edge) {
          edge = graph.edges.get(reverseEdgeId)
        }
        
        if (!edge) continue

        // Vérifier si cette arête doit être évitée
        if (options.avoidEdges && options.avoidEdges.includes(edge.id)) {
          continue
        }

        let edgeWeight = edge.weight
        
        if (options.preferEdges && options.preferEdges.includes(edge.id)) {
          edgeWeight *= 0.5
        }

        if (options.customWeightFunction) {
          const neighborNode = graph.nodes.get(neighborId)!
          edgeWeight = options.customWeightFunction(edge, currentNode, neighborNode)
        }

        const newDistance = currentDistance + edgeWeight
        const existingDistance = distances.get(neighborId)!

        if (newDistance < existingDistance) {
          distances.set(neighborId, newDistance)
          previous.set(neighborId, currentNodeId)
          queue.enqueue(neighborId, newDistance)
        }
      }
    }

    // Construire le résultat
    const result = new Map<string, { distance: number; path: string[] }>()
    
    for (const [nodeId, distance] of distances) {
      if (distance < Infinity && nodeId !== startNodeId) {
        const path = this.reconstructPath(previous, startNodeId, nodeId)
        if (path) {
          result.set(nodeId, { distance, path })
        }
      }
    }

    console.log(`Exploration completed: ${result.size} reachable nodes in ${Date.now() - startTime}ms`)
    
    return result
  }

  /**
   * Fonction heuristique pour A* (distance à vol d'oiseau)
   */
  private heuristic(node1: GraphNode, node2: GraphNode): number {
    return haversineDistance(node1.lat, node1.lon, node2.lat, node2.lon) * 1000 // Convertir en mètres
  }

  /**
   * Reconstruit le chemin à partir de la table des prédécesseurs
   */
  private reconstructPath(
    previous: Map<string, string | null>,
    startNodeId: string,
    endNodeId?: string
  ): string[] | null {
    if (!endNodeId) {
      // Si pas de destination spécifique, retourner tous les nœuds accessibles
      const path: string[] = []
      for (const [nodeId, prev] of previous) {
        if (prev !== null || nodeId === startNodeId) {
          path.push(nodeId)
        }
      }
      return path.length > 0 ? path : null
    }

    const path: string[] = []
    let currentNodeId: string | null = endNodeId

    while (currentNodeId !== null) {
      path.unshift(currentNodeId)
      currentNodeId = previous.get(currentNodeId) || null
    }

    // Vérifier que le chemin commence bien au point de départ
    if (path.length === 0 || path[0] !== startNodeId) {
      return null
    }

    return path
  }

  /**
   * Calcule les métriques d'un chemin
   */
  private calculatePathMetrics(graph: Graph, path: string[]): PathfindingResult {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    let totalDistance = 0
    let totalWeight = 0

    // Récupérer les nœuds
    for (const nodeId of path) {
      const node = graph.nodes.get(nodeId)
      if (node) {
        nodes.push(node)
      }
    }

    // Récupérer les arêtes et calculer les métriques
    for (let i = 0; i < path.length - 1; i++) {
      const fromId = path[i]
      const toId = path[i + 1]
      
      const edgeId = `${fromId}-${toId}`
      const reverseEdgeId = `${toId}-${fromId}`
      
      let edge = graph.edges.get(edgeId)
      if (!edge) {
        edge = graph.edges.get(reverseEdgeId)
      }
      
      if (edge) {
        edges.push(edge)
        totalDistance += edge.distance
        totalWeight += edge.weight
      }
    }

    return {
      path,
      distance: totalDistance,
      weight: totalWeight,
      nodes,
      edges
    }
  }

  /**
   * Trouve les meilleurs points candidats pour la génération de boucles
   * 
   * @param graph Graphe à explorer
   * @param startNodeId ID du nœud de départ
   * @param targetDistance Distance cible en mètres
   * @param options Options de recherche
   * @returns Points candidats avec leurs scores
   */
  findCandidatePoints(
    graph: Graph,
    startNodeId: string,
    targetDistance: number,
    options: PathfindingOptions = {}
  ): Array<{ nodeId: string; distance: number; score: number; path: string[] }> {
    const startNode = graph.nodes.get(startNodeId)
    if (!startNode) {
      throw new Error(`Start node ${startNodeId} not found in graph`)
    }

    // Explorer depuis le point de départ
    const explorationResult = this.exploreFromStart(
      graph,
      startNodeId,
      targetDistance * 1.2, // Explorer un peu plus loin
      options
    )

    const candidates: Array<{ nodeId: string; distance: number; score: number; path: string[] }> = []

    // Évaluer chaque point accessible
    for (const [nodeId, { distance, path }] of explorationResult) {
      const node = graph.nodes.get(nodeId)!
      
      // Calculer le score basé sur plusieurs critères
      let score = 0
      
      // Score de distance (préférer ~50% de la distance cible)
      const distanceRatio = distance / targetDistance
      const distanceScore = 1 - Math.abs(distanceRatio - 0.5) * 2 // Score max à 0.5
      score += distanceScore * 0.4
      
      // Score de diversité angulaire (éviter les retours directs)
      const bearing = calculateBearing(startNode.lat, startNode.lon, node.lat, node.lon)
      const angularScore = Math.sin(bearing * Math.PI / 180) // Score basé sur l'angle
      score += Math.abs(angularScore) * 0.3
      
      // Score de qualité du chemin (basé sur les surfaces)
      let pathQuality = 0
      for (let i = 0; i < path.length - 1; i++) {
        const edgeId = `${path[i]}-${path[i + 1]}`
        const reverseEdgeId = `${path[i + 1]}-${path[i]}`
        
        let edge = graph.edges.get(edgeId)
        if (!edge) {
          edge = graph.edges.get(reverseEdgeId)
        }
        
        if (edge) {
          if (edge.surface === 'paved') pathQuality += 1
          else if (edge.surface === 'mixed') pathQuality += 0.5
          else pathQuality += 0.2
        }
      }
      score += (pathQuality / Math.max(path.length - 1, 1)) * 0.3
      
      candidates.push({
        nodeId,
        distance,
        score,
        path
      })
    }

    // Trier par score décroissant
    candidates.sort((a, b) => b.score - a.score)
    
    return candidates.slice(0, 20) // Retourner les 20 meilleurs candidats
  }
}

/**
 * Instance singleton des algorithmes de pathfinding
 */
export const pathfindingAlgorithms = new PathfindingAlgorithms()