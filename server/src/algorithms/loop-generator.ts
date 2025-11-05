// ------------------------------------------------------------------------
// Loop Generator (Exploration radiale, scoring, variantes)
// ------------------------------------------------------------------------
import { Graph, GraphNode, GraphEdge } from '../services/graph-builder.js';
import { dijkstra, astar, PathfindingResult } from './pathfinding.js';
import { calculateWayQualityScore } from '../services/osm-service.js';

// Fonction haversine pour calculer la distance
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Rayon de la Terre en mètres
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Trouver le nœud le plus proche avec de bonnes connexions
export function findClosestNode(graph: Graph, lat: number, lon: number): string | null {
  return findClosestNodeWithConnections(graph, lat, lon, 1);
}

// Trouver le nœud le plus proche avec au moins un certain nombre de connexions
export function findClosestNodeWithConnections(graph: Graph, lat: number, lon: number, minConnections: number = 3): string | null {
  let closestNodeId: string | null = null;
  let minDistance = Infinity;
  let bestNode: string | null = null;
  let bestScore = -1;

  // D'abord, essayer de trouver un nœud avec beaucoup de connexions à proximité
  for (const [nodeId, node] of graph.nodes) {
    const dist = haversineDistance(lat, lon, node.lat, node.lon);
    const connections = node.connections ? node.connections.length : 0;
    
    // Score : favoriser les nœuds avec plus de connexions, mais pénaliser la distance
    // Score = connexions / (distance + 1) pour favoriser les nœuds proches avec beaucoup de connexions
    const score = connections / (dist + 1);
    
    // Chercher dans un rayon de 500m pour un bon nœud
    if (dist < 500 && connections >= minConnections && score > bestScore) {
      bestScore = score;
      bestNode = nodeId;
    }
    
    // Garder aussi le nœud le plus proche au cas où
    if (dist < minDistance) {
      minDistance = dist;
      closestNodeId = nodeId;
    }
  }

  // Si on a trouvé un bon nœud avec des connexions, l'utiliser
  if (bestNode && bestScore > 0) {
    const bestNodeObj = graph.nodes.get(bestNode);
    if (bestNodeObj && bestNodeObj.connections && bestNodeObj.connections.length >= minConnections) {
      console.log(`[findClosestNode] Found better node with ${bestNodeObj.connections.length} connections at ${(haversineDistance(lat, lon, bestNodeObj.lat, bestNodeObj.lon) / 1000).toFixed(3)}km`);
      return bestNode;
    }
  }

  // Sinon, retourner le plus proche
  return closestNodeId;
}

// ------------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------------

export interface LoopGenerationOptions {
  startNodeId: string
  targetDistance: number      // m
  numVariants?: number
  minReturnAngleDeg?: number  // anti-allers/retours
  scoring?: Partial<{
    distance: number   // poids [0,1]
    angle: number
    quality: number
    diversity: number
  }>
  debug?: boolean
}

export interface LoopCandidate {
  nodeId: string            // id du candidat (où retourner)
  pathOut: string[]         // nœuds parcours à l'aller
  pathEdges: string[]       // edges parcourues à l'aller
  distance: number          // distance parcourue à l'aller (m)
  angle: number             // angle par rapport au départ
  qualityScore: number      // quality moyenne à l'aller
  returnPathsStats?: {
    diversity: number      // combien de chemins de retour uniques trouvés
    overlap: number        // % du retour recouvrant l’aller
    totalReturnDist: number
  }
  score: number
}

export interface GeneratedLoop {
  loop: string[]           // nœuds du parcours total (aller + retour)
  pathEdges: string[]      // edges du parcours
  distance: number
  qualityScore: number
  debug?: any
}

export interface LoopGenerationDebug {
  candidates: LoopCandidate[]
  timings: Record<string, number>
  warnings: string[]
          stats: {
    exploredNodes: number
    bestAngles: number[]
  }
}

// ------------------------------------------------------------------------
// MAIN ENTRY : generateLoops
// ------------------------------------------------------------------------

export function generateLoops(
  graph: Graph,
  options: LoopGenerationOptions
): { loops: GeneratedLoop[]; debug: LoopGenerationDebug } {
  const start = options.startNodeId;
  const target = options.targetDistance;
  const numVariants = options.numVariants || 3;
  const debug: LoopGenerationDebug = {
    candidates: [], timings: {}, warnings: [], stats: { exploredNodes: 0, bestAngles: [] }
  };
  const t0 = Date.now();
  
  // Vérifier que le nœud de départ existe
  const startNode = graph.nodes.get(start);
  if (!startNode) {
    debug.warnings.push(`Start node ${start} not found in graph`);
    return { loops: [], debug };
  }
  
  // Vérifier les connexions du nœud de départ
  if (!startNode.connections || startNode.connections.length === 0) {
    debug.warnings.push(`Start node ${start} has no connections`);
    return { loops: [], debug };
  }
  
  console.log(`[LoopGenerator] Starting from ${start} with ${startNode.connections.length} connections`);
  
  // Si le nœud a très peu de connexions, utiliser une approche différente : explorer directement avec Dijkstra
  // pour trouver des nœuds éloignés, puis utiliser radialExplore depuis ces nœuds
  let radialResults: { [dir: string]: PathfindingResult | null } = {};
  
  if (startNode.connections.length <= 2) {
    console.log(`[LoopGenerator] Node has few connections, using direct Dijkstra exploration`);
    // Explorer directement avec BFS/Dijkstra pour trouver des nœuds éloignés
    const queue: Array<[string, number, string[]]> = [[start, 0, [start]]];
    const visited = new Set<string>();
    const distantNodes: Array<{ nodeId: string; distance: number; path: string[] }> = [];
    const allExploredNodes: Array<{ nodeId: string; distance: number; path: string[] }> = []; // Stocker tous les nœuds pour fallback
    
    let maxDistFound = 0;
    let iterations = 0;
    const maxIterations = 100000; // Limite très large
    
    while (queue.length > 0 && visited.size < 20000 && iterations < maxIterations) {
      iterations++;
      const [currentId, dist, path] = queue.shift()!;
      if (visited.has(currentId)) continue;
      if (dist > target * 5.0) continue; // Augmenter à 5x la distance cible pour explorer vraiment loin
      visited.add(currentId);
      
      // Tracker la distance maximale
      if (dist > maxDistFound) {
        maxDistFound = dist;
      }
      
      const node = graph.nodes.get(currentId);
      if (!node || !node.connections) continue;
      
      // Stocker tous les nœuds explorés (sauf le départ)
      if (currentId !== start && dist > 0) {
        allExploredNodes.push({ nodeId: currentId, distance: dist, path: [...path] });
      }
      
      // Garder les nœuds qui sont à environ 50% de la distance cible (avec une marge plus large)
      // Accepter les nœuds entre 20% et 80% de la distance cible pour avoir plus de candidats
      if (dist >= target * 0.2 && dist <= target * 0.8) {
        distantNodes.push({ nodeId: currentId, distance: dist, path: [...path] });
      }
      
      // Log périodique pour debug
      if (visited.size % 1000 === 0 && visited.size > 0) {
        console.log(`[LoopGenerator] BFS exploration: visited=${visited.size}, queue=${queue.length}, distantNodes=${distantNodes.length}, maxDist=${(maxDistFound / 1000).toFixed(3)}km`);
      }
      
      // Continuer l'exploration - explorer TOUS les voisins
      for (const nextId of node.connections) {
        if (visited.has(nextId)) continue;
        
        let edge = graph.edges.get(`${currentId}-${nextId}`);
        if (!edge) {
          edge = graph.edges.get(`${nextId}-${currentId}`);
        }
        if (edge && dist + edge.distance <= target * 5.0) {
          queue.push([nextId, dist + edge.distance, [...path, nextId]]);
        }
      }
    }
    
    if (iterations >= maxIterations) {
      console.warn(`[LoopGenerator] Max iterations reached (${maxIterations}), but continuing with results`);
    }
    
    console.log(`[LoopGenerator] BFS complete: visited=${visited.size}, iterations=${iterations}, maxDist=${(maxDistFound / 1000).toFixed(3)}km, found ${distantNodes.length} distant nodes, allExplored=${allExploredNodes.length}`);
    
    // Utiliser les nœuds éloignés comme candidats
    if (distantNodes.length > 0) {
      // Prendre les meilleurs nœuds (les plus proches de target * 0.5)
      distantNodes.sort((a, b) => Math.abs(a.distance - target * 0.5) - Math.abs(b.distance - target * 0.5));
      const bestDistantNodes = distantNodes.slice(0, Math.min(8, distantNodes.length));
      
      console.log(`[LoopGenerator] Using ${bestDistantNodes.length} best distant nodes (distances: ${bestDistantNodes.map(n => (n.distance / 1000).toFixed(2)).join(', ')}km)`);
      
      // Créer des résultats radiaux depuis ces nœuds
      for (let i = 0; i < bestDistantNodes.length; i++) {
        const distant = bestDistantNodes[i];
        // Utiliser dijkstra pour trouver le chemin optimal vers ce nœud
        const pathResult = dijkstra(graph, start, distant.nodeId, target * 2.0, 20000);
        if (pathResult) {
          const dirKey = `distant_${i}`;
          radialResults[dirKey] = pathResult;
          console.log(`[LoopGenerator] Path to distant node ${i}: ${(pathResult.distance / 1000).toFixed(3)}km`);
        } else {
          // Si dijkstra échoue, utiliser le chemin BFS direct
          const bfsPath: PathfindingResult = {
            path: distant.path,
            distance: distant.distance
          };
          const dirKey = `distant_${i}`;
          radialResults[dirKey] = bfsPath;
          console.log(`[LoopGenerator] Using BFS path to distant node ${i}: ${(distant.distance / 1000).toFixed(3)}km`);
        }
      }
    } else {
      // Si aucun nœud distant n'a été trouvé dans la plage idéale, prendre les nœuds les plus éloignés trouvés
      console.warn(`[LoopGenerator] No distant nodes found in ideal range (20-80%), using farthest nodes found (maxDist: ${(maxDistFound / 1000).toFixed(3)}km)`);
      
      if (allExploredNodes.length > 0) {
        // Trier par distance décroissante et prendre les plus éloignés
        allExploredNodes.sort((a, b) => b.distance - a.distance);
        const farthestNodes = allExploredNodes.slice(0, Math.min(8, allExploredNodes.length));
        
        console.log(`[LoopGenerator] Using ${farthestNodes.length} farthest nodes (distances: ${farthestNodes.map(n => (n.distance / 1000).toFixed(2)).join(', ')}km)`);
        
        // Créer des résultats radiaux depuis ces nœuds
        for (let i = 0; i < farthestNodes.length; i++) {
          const farthest = farthestNodes[i];
          // Utiliser le chemin BFS direct
          const bfsPath: PathfindingResult = {
            path: farthest.path,
            distance: farthest.distance
          };
          const dirKey = `farthest_${i}`;
          radialResults[dirKey] = bfsPath;
          console.log(`[LoopGenerator] Using farthest node ${i}: ${(farthest.distance / 1000).toFixed(3)}km`);
        }
      } else {
        console.error(`[LoopGenerator] No nodes explored at all! This indicates a problem with the graph connectivity.`);
      }
    }
  } else {
    // Exploration radiale normale pour les nœuds avec plusieurs connexions
    const directions = getDirections();
    for (const dir of directions) {
      // Explorer jusqu'à 60% de la distance cible pour avoir plus de marge
      radialResults[dir] = radialExplore(graph, start, dir, target * 0.6);
    }
  }
  
  debug.timings.exploration = Date.now() - t0;
  
  // Log pour debug
  const foundCount = Object.values(radialResults).filter(r => r !== null).length;
  console.log(`[LoopGenerator] Radial exploration: ${foundCount}/${Object.keys(radialResults).length} directions found paths`);

  // Collecter les candidats valides (points atteints à ~50% de la distance cible)
  const candidates: LoopCandidate[] = [];
  const exploredNodes = new Set<string>();
  
  // Seuil minimum : très réduit pour accepter même des chemins courts (0.5% de la distance cible)
  // Cela permettra de continuer l'exploration même depuis des nœuds avec peu de connexions
  const minCandidateDistance = target * 0.005; // 0.5% = 50m pour 10km
  
  let radialExplorationStats = {
    total: 0,
    found: 0,
    tooShort: 0,
    noReturnPath: 0
  };
  
  for (const [dir, result] of Object.entries(radialResults)) {
    radialExplorationStats.total++;
    
    if (!result || !result.path || result.path.length < 2) {
      continue;
    }
    
    radialExplorationStats.found++;
    const returnNodeId = result.path[result.path.length - 1];
    exploredNodes.add(returnNodeId);
    
    // Construire les edges du chemin aller (essayer les deux sens)
    const pathEdges: string[] = [];
    let totalDistance = 0;
    for (let i = 0; i < result.path.length - 1; i++) {
      const from = result.path[i];
      const to = result.path[i + 1];
      let edge = graph.edges.get(`${from}-${to}`);
      if (!edge) {
        edge = graph.edges.get(`${to}-${from}`);
      }
      if (edge) {
        pathEdges.push(edge.id);
        totalDistance += edge.distance;
      }
    }
    
    // Même si le candidat est court, on le garde pour essayer de l'étendre plus tard
    // On ne filtre plus ici, on accepte tous les candidats et on essaiera de les étendre
    if (totalDistance < minCandidateDistance) {
      radialExplorationStats.tooShort++;
      // On continue quand même pour permettre l'extension
    }
    
    // Calculer l'angle par rapport au départ
    const returnNode = graph.nodes.get(returnNodeId);
    if (!returnNode) continue;
    const angle = computeAngle(graph, start, returnNodeId);
    
    // Score de qualité moyen
    const qualityScore = averageEdgeQuality(graph, pathEdges);
    
    // Chercher un chemin de retour vers le départ (avec limite très large)
    // Essayer d'abord d'éviter les edges du chemin aller pour avoir un vrai retour différent
    const forbiddenEdges = new Set<string>(pathEdges);
    let returnResult = dijkstra(graph, returnNodeId, start, target * 5.0, 20000, forbiddenEdges);
    
    // Si on ne trouve pas de chemin évitant les edges de l'aller, essayer sans restriction
    if (!returnResult) {
      returnResult = dijkstra(graph, returnNodeId, start, target * 5.0, 20000);
    }
    
    if (!returnResult) {
      radialExplorationStats.noReturnPath++;
      // Même sans chemin de retour, on garde le candidat pour le fallback
      candidates.push({
        nodeId: returnNodeId,
        pathOut: result.path,
        pathEdges,
        distance: totalDistance,
        angle,
        qualityScore,
        returnPathsStats: undefined,
        score: 0
      });
    } else {
      candidates.push({
        nodeId: returnNodeId,
        pathOut: result.path,
        pathEdges,
        distance: totalDistance,
        angle,
        qualityScore,
        returnPathsStats: {
          diversity: 1,
          overlap: 0.1, // Approximation
          totalReturnDist: returnResult.distance
        },
        score: 0 // Sera calculé plus tard
      });
    }
  }
  
  debug.stats.exploredNodes = exploredNodes.size;
  debug.stats.radialExploration = radialExplorationStats;
  debug.candidates = candidates;

  // Générer les boucles : prendre les meilleurs candidats et construire les boucles complètes
  const loops: GeneratedLoop[] = [];
  
  // Si on a des candidats avec chemin de retour, les utiliser en priorité
  const candidatesWithReturn = candidates.filter(c => c.returnPathsStats);
  const candidatesWithoutReturn = candidates.filter(c => !c.returnPathsStats);
  
  const scoredCandidates = candidatesWithReturn.length > 0
    ? candidatesWithReturn.map(c => {
      // Calculer le score
      const distanceScore = Math.abs(c.distance - target * 0.5) / target; // Plus proche de target/2 = meilleur
      const angleScore = Math.abs(c.angle) / 180; // Normaliser l'angle
      const score = (1 - distanceScore) * (options.scoring?.distance || 0.4) +
                    (1 - angleScore) * (options.scoring?.angle || 0.3) +
                    (c.qualityScore / 100) * (options.scoring?.quality || 0.2) +
                    (c.returnPathsStats!.diversity / 10) * (options.scoring?.diversity || 0.1);
      return { ...c, score };
    }).sort((a, b) => b.score - a.score).slice(0, numVariants)
    : candidatesWithoutReturn
        .sort((a, b) => b.distance - a.distance) // Trier par distance décroissante
        .slice(0, numVariants);

  // Construire les boucles complètes (aller + retour)
  for (const candidate of scoredCandidates) {
    // Créer un Set des edges interdites pour éviter de revenir par le même chemin
    const forbiddenEdges = new Set<string>(candidate.pathEdges);
    
    // Essayer d'abord avec les edges interdites pour avoir un vrai retour différent
    let returnResult: PathfindingResult | null = null;
    
    // Utiliser des limites très larges pour permettre de longs chemins de retour
    // Essayer d'abord avec les edges interdites (éviter le chemin aller)
    returnResult = dijkstra(graph, candidate.nodeId, start, target * 5.0, 20000, forbiddenEdges);
    
    // Si on ne trouve pas de chemin évitant les edges de l'aller, essayer sans restriction
    // (meilleur que rien, mais on préfère un vrai retour différent)
    if (!returnResult || !returnResult.path) {
      console.log(`[LoopGenerator] No return path avoiding forward edges, trying without restriction`);
      returnResult = dijkstra(graph, candidate.nodeId, start, target * 5.0, 20000);
    }
    
    if (!returnResult || !returnResult.path) {
      // Si on ne trouve toujours pas de retour, on passe au fallback plus tard
      continue;
    }
    
    // Vérifier que le chemin de retour est vraiment différent (pas juste l'inverse)
    const returnEdgesSet = new Set<string>();
    for (let i = 0; i < returnResult.path.length - 1; i++) {
      const from = returnResult.path[i];
      const to = returnResult.path[i + 1];
      let edge = graph.edges.get(`${from}-${to}`);
      if (!edge) {
        edge = graph.edges.get(`${to}-${from}`);
      }
      if (edge) {
        returnEdgesSet.add(edge.id);
      }
    }
    
    // Vérifier le chevauchement
    let overlapCount = 0;
    for (const edgeId of candidate.pathEdges) {
      if (returnEdgesSet.has(edgeId)) {
        overlapCount++;
      }
    }
    const overlapRatio = candidate.pathEdges.length > 0 ? overlapCount / candidate.pathEdges.length : 0;
    
    // Si le chevauchement est trop élevé (> 80%), essayer de trouver un meilleur chemin
    if (overlapRatio > 0.8) {
      console.log(`[LoopGenerator] Return path overlaps ${(overlapRatio * 100).toFixed(1)}% with forward path, trying to find alternative`);
      // Essayer avec une restriction plus stricte : éviter aussi les nœuds du chemin aller
      const forwardNodes = new Set(candidate.pathOut.slice(1, -1)); // Exclure le départ et l'arrivée
      // Note: Pour l'instant, on accepte ce chemin mais on logge l'avertissement
      // On pourrait implémenter une version plus sophistiquée qui évite aussi les nœuds intermédiaires
    }
    
      // Construire les edges du retour et calculer la distance réelle (essayer les deux sens)
      const returnEdges: string[] = [];
      let returnDistance = 0;
      for (let i = 0; i < returnResult.path.length - 1; i++) {
        const from = returnResult.path[i];
        const to = returnResult.path[i + 1];
        let edge = graph.edges.get(`${from}-${to}`);
        if (!edge) {
          edge = graph.edges.get(`${to}-${from}`);
        }
        if (edge) {
          returnEdges.push(edge.id);
          returnDistance += edge.distance; // Somme des distances réelles des edges
        }
      }
    
    // Recalculer la distance aller en sommant les distances réelles des edges
    let outDistance = 0;
    for (const edgeId of candidate.pathEdges) {
      const edge = graph.edges.get(edgeId);
      if (edge) {
        outDistance += edge.distance;
      }
    }
    
    // Distance totale = somme réelle de toutes les edges
    const totalDist = outDistance + returnDistance;
    
    // Combiner aller + retour
    const fullLoop = [...candidate.pathOut, ...returnResult.path.slice(1)]; // Éviter la duplication du point de retour
    const allEdges = [...candidate.pathEdges, ...returnEdges];
    const avgQuality = (candidate.qualityScore + averageEdgeQuality(graph, returnEdges)) / 2;
    
    loops.push({
      loop: fullLoop,
      pathEdges: allEdges,
      distance: totalDist, // Distance en mètres
      qualityScore: avgQuality,
      debug: {
        outPath: candidate.pathOut,
        returnPath: returnResult.path,
        outDistance,
        returnDistance,
        totalDistance: totalDist,
        score: candidate.score
      }
    });
  }

  // Si aucune boucle complète n'a été trouvée, essayer une exploration plus agressive
  if (loops.length === 0) {
    debug.warnings.push('No complete loops found, trying more aggressive exploration');
    
    // Si on a des candidats mais trop courts, essayer de les étendre
    if (candidates.length > 0) {
      const bestCandidate = candidates.sort((a, b) => b.distance - a.distance)[0];
      
      // Essayer d'explorer vraiment loin depuis le point de retour dans plusieurs directions
      // Utiliser une distance d'exploration beaucoup plus grande pour atteindre la moitié de la distance cible
      const extendDirections = [[1, 0], [0, 1], [1, 1], [-1, 1], [0, -1], [-1, 0], [1, -1], [-1, -1]];
      let extendedResult: PathfindingResult | null = null;
      let bestExtendedDist = 0;
      
      // Essayer plusieurs directions pour trouver la meilleure extension
      for (const dir of extendDirections) {
        const result = radialExplore(graph, bestCandidate.nodeId, dir as [number, number], target * 0.8);
        if (result && result.distance > bestExtendedDist) {
          extendedResult = result;
          bestExtendedDist = result.distance;
        }
      }
      let finalReturnNode = bestCandidate.nodeId;
      let extendedPath = bestCandidate.pathOut;
      let extendedEdges = bestCandidate.pathEdges;
      let extendedDistance = bestCandidate.distance;
      
      if (extendedResult && extendedResult.path && extendedResult.path.length > 1) {
        finalReturnNode = extendedResult.path[extendedResult.path.length - 1];
        extendedPath = [...bestCandidate.pathOut, ...extendedResult.path.slice(1)];
        
        // Ajouter les edges de l'extension (essayer les deux sens)
        for (let i = 0; i < extendedResult.path.length - 1; i++) {
          const from = extendedResult.path[i];
          const to = extendedResult.path[i + 1];
          let edge = graph.edges.get(`${from}-${to}`);
          if (!edge) {
            edge = graph.edges.get(`${to}-${from}`);
          }
          if (edge) {
            extendedEdges.push(edge.id);
            extendedDistance += edge.distance;
          }
        }
        console.log(`[LoopGenerator] Extended path: ${(extendedDistance / 1000).toFixed(3)}km`);
      }
      
      // Chercher un chemin de retour avec une limite très large
      const returnApprox = dijkstra(graph, finalReturnNode, start, target * 2.0, 5000);
      if (returnApprox && returnApprox.path) {
        let returnDist = 0;
        const returnEdges: string[] = [];
        for (let i = 0; i < returnApprox.path.length - 1; i++) {
          const from = returnApprox.path[i];
          const to = returnApprox.path[i + 1];
          let edge = graph.edges.get(`${from}-${to}`);
          if (!edge) {
            edge = graph.edges.get(`${to}-${from}`);
          }
          if (edge) {
            returnEdges.push(edge.id);
            returnDist += edge.distance;
          }
        }
        const totalDist = extendedDistance + returnDist;
        
        console.log(`[LoopGenerator] Extended loop: ${(totalDist / 1000).toFixed(3)}km (target: ${(target / 1000).toFixed(3)}km)`);
        
        // Accepter même si la distance totale est plus courte que la cible (au moins 20%)
        if (totalDist >= target * 0.2) {
          const simpleLoop: GeneratedLoop = {
            loop: [...extendedPath, ...returnApprox.path.slice(1)],
            pathEdges: [...extendedEdges, ...returnEdges],
            distance: totalDist,
            qualityScore: (bestCandidate.qualityScore + averageEdgeQuality(graph, returnEdges)) / 2,
            debug: { note: 'Extended simple loop', extendedDistance, returnDist, totalDist }
          };
          loops.push(simpleLoop);
          debug.warnings.push(`Generated extended loop: ${(totalDist / 1000).toFixed(2)}km`);
        }
      }
    }
    
    // Si toujours rien, essayer une exploration directe plus longue
    if (loops.length === 0) {
      debug.warnings.push('Trying direct long-distance exploration');
      // Essayer une exploration directe dans plusieurs directions avec une distance plus grande
      for (const dir of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        const longExplore = radialExplore(graph, start, dir as [number, number], target * 0.8);
        if (longExplore && longExplore.path && longExplore.path.length > 2) {
          const returnNodeId = longExplore.path[longExplore.path.length - 1];
          
          // Construire les edges du chemin aller
          const longExploreEdges: string[] = [];
          for (let i = 0; i < longExplore.path.length - 1; i++) {
            const from = longExplore.path[i];
            const to = longExplore.path[i + 1];
            let edge = graph.edges.get(`${from}-${to}`);
            if (!edge) {
              edge = graph.edges.get(`${to}-${from}`);
            }
            if (edge) {
              longExploreEdges.push(edge.id);
            }
          }
          
          // Essayer d'éviter les edges du chemin aller
          const forbiddenEdges = new Set<string>(longExploreEdges);
          let returnPath = dijkstra(graph, returnNodeId, start, target * 5.0, 20000, forbiddenEdges);
          // Si pas trouvé, essayer sans restriction
          if (!returnPath) {
            returnPath = dijkstra(graph, returnNodeId, start, target * 5.0, 20000);
          }
          
          if (returnPath && returnPath.path) {
            // Construire la boucle complète
            const loopPath = [...longExplore.path, ...returnPath.path.slice(1)];
            const loopEdges: string[] = [];
            let loopDist = 0;
            
            for (let i = 0; i < loopPath.length - 1; i++) {
              const from = loopPath[i];
              const to = loopPath[i + 1];
              let edge = graph.edges.get(`${from}-${to}`);
              if (!edge) {
                edge = graph.edges.get(`${to}-${from}`);
              }
              if (edge) {
                loopEdges.push(edge.id);
                loopDist += edge.distance;
              }
            }
            
            if (loopDist >= target * 0.5) {
              loops.push({
                loop: loopPath,
                pathEdges: loopEdges,
                distance: loopDist,
                qualityScore: averageEdgeQuality(graph, loopEdges),
                debug: { note: 'Direct long exploration', dir }
              });
              break; // Arrêter après le premier succès
            }
          }
        }
      }
    }
    
    // Dernier recours : si toujours rien, créer une boucle minimale mais avertir
    if (loops.length === 0 && candidates.length > 0) {
      const bestCandidate = candidates.sort((a, b) => b.distance - a.distance)[0];
      const calculatedDistance = bestCandidate.distance * 2; // Double pour faire une boucle
      
      const simpleLoop: GeneratedLoop = {
        loop: [...bestCandidate.pathOut, start],
        pathEdges: bestCandidate.pathEdges,
        distance: calculatedDistance,
        qualityScore: bestCandidate.qualityScore,
        debug: { note: 'Minimal fallback loop (too short)', calculatedDistance }
      };
      loops.push(simpleLoop);
      debug.warnings.push(`⚠️  Generated minimal loop: ${(calculatedDistance / 1000).toFixed(2)}km (target: ${(target / 1000).toFixed(2)}km)`);
    }
  }

  debug.timings.total = Date.now() - t0;
  return { loops, debug };
}

// ------------------------------------------------------------------------
// UTILS PHASE RADIALE, SCORING, ETC
// ------------------------------------------------------------------------

// Renvoie 8 directions N, NE, E, SE...
function getDirections(): [number, number][] {
  return [ [0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1] ]
}

// Exploration radiale = Exploration BFS depuis le point de départ avec limite de distance
// Prend en compte la direction souhaitée et explore plus agressivement
function radialExplore(graph: Graph, startId: string, direction: [number, number], maxDist: number): PathfindingResult | null {
  const startNode = graph.nodes.get(startId);
  if (!startNode) return null;
  
  // Vérifier que le nœud a des connexions
  if (!startNode.connections || startNode.connections.length === 0) {
    return null;
  }
  
  // Normaliser la direction
  const dirNorm = Math.sqrt(direction[0] ** 2 + direction[1] ** 2);
  const dirX = direction[0] / dirNorm;
  const dirY = direction[1] / dirNorm;
  
  // Exploration BFS avec scoring directionnel
  const queue: [string, number, string[], number][] = [[startId, 0, [startId], 0]]; // [nodeId, dist, path, directionalScore]
  const visited = new Set<string>();
  const nodeToPath = new Map<string, string[]>(); // Pour reconstruire le chemin
  let bestNode: string | null = null;
  let bestScore = -Infinity; // Score combinant distance et direction
  let bestPath: string[] = [startId]; // Chemin BFS vers le meilleur nœud
  
  // Ne pas avoir de seuil minimum trop strict - on veut explorer le plus loin possible
  // Le seuil sera utilisé seulement pour le scoring, pas pour filtrer
  const minDist = 0; // Pas de seuil minimum, explorer tout
  
  let maxIterations = 50000; // Limite de sécurité
  let iterations = 0;
  let maxDistanceFound = 0;
  
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const [currentId, dist, path, _] = queue.shift()!;
    
    if (visited.has(currentId)) continue;
    // Permettre une exploration beaucoup plus large
    if (dist > maxDist * 10.0) continue; // Permettre jusqu'à 10x la distance cible
    visited.add(currentId);
    
    // Tracker la distance maximale trouvée
    if (dist > maxDistanceFound) {
      maxDistanceFound = dist;
    }
    
    const node = graph.nodes.get(currentId);
    if (!node) continue;
    
    // Vérifier que le nœud a des connexions
    if (!node.connections || node.connections.length === 0) {
      continue; // Passer au suivant si pas de connexions
    }
    
    // Calculer le score directionnel : favoriser les nœuds dans la bonne direction
    const dx = node.lon - startNode.lon;
    const dy = node.lat - startNode.lat;
    const distFromStart = Math.sqrt(dx ** 2 + dy ** 2);
    
    if (distFromStart > 0.001) { // Éviter division par zéro
      const nodeDirX = dx / distFromStart;
      const nodeDirY = dy / distFromStart;
      const dotProduct = nodeDirX * dirX + nodeDirY * dirY; // Produit scalaire [-1, 1]
      const directionalScore = (dotProduct + 1) / 2; // Normaliser à [0, 1]
      
      // Score combiné : distance * (1 + bonus directionnel)
      // Plus la distance est grande ET plus on est dans la bonne direction, meilleur le score
      const combinedScore = dist * (1 + directionalScore * 0.5);
      
      // Garder le meilleur nœud (plus loin = meilleur)
      // Ne pas filtrer par minDist, on veut le nœud le plus éloigné
      if (dist > bestScore || (dist === bestScore && combinedScore > bestScore)) {
        bestScore = dist; // Utiliser la distance réelle comme score principal
        bestNode = currentId;
        bestPath = path;
      }
    }
    
    // Stocker le chemin vers ce nœud
    nodeToPath.set(currentId, path);
    
    // Explorer les voisins
    for (const nextId of node.connections) {
      // Essayer les deux sens de l'edge (currentId-nextId et nextId-currentId)
      let edge = graph.edges.get(`${currentId}-${nextId}`);
      if (!edge) {
        edge = graph.edges.get(`${nextId}-${currentId}`);
      }
      
      if (!edge || visited.has(nextId)) continue;
      
      const newDist = dist + edge.distance;
      // Permettre une exploration beaucoup plus large pour atteindre la distance cible
      if (newDist <= maxDist * 10.0) { // Permettre jusqu'à 10x pour explorer vraiment loin
        // Calculer le score directionnel pour le prochain nœud
        const nextNode = graph.nodes.get(nextId);
        if (nextNode) {
          const nextDx = nextNode.lon - startNode.lon;
          const nextDy = nextNode.lat - startNode.lat;
          const nextDistFromStart = Math.sqrt(nextDx ** 2 + nextDy ** 2);
          let nextDirScore = 0;
          if (nextDistFromStart > 0.001) {
            const nextDirX = nextDx / nextDistFromStart;
            const nextDirY = nextDy / nextDistFromStart;
            const nextDot = nextDirX * dirX + nextDirY * dirY;
            nextDirScore = (nextDot + 1) / 2;
          }
          const newPath = [...path, nextId];
          queue.push([nextId, newDist, newPath, nextDirScore]);
          nodeToPath.set(nextId, newPath);
        }
      }
    }
    
    // Log périodique pour debug
    if (iterations % 1000 === 0 && iterations > 0) {
      console.log(`[radialExplore] Iteration ${iterations}, queue size: ${queue.length}, visited: ${visited.size}, max dist: ${(maxDistanceFound / 1000).toFixed(3)}km`);
    }
  }
  
  if (iterations >= maxIterations) {
    console.warn(`[radialExplore] Max iterations reached (${maxIterations}), stopping exploration`);
  }
  
  // Log pour debug
  if (iterations > 0) {
    console.log(`[radialExplore] Explored ${visited.size} nodes, max distance: ${(maxDistanceFound / 1000).toFixed(3)}km, best node: ${bestNode}, iterations: ${iterations}`);
  }
  
  // Si on a trouvé un bon nœud, utiliser dijkstra pour trouver le meilleur chemin
  if (bestNode && bestNode !== startId) {
    console.log(`[radialExplore] Using Dijkstra to find path from ${startId} to ${bestNode}, target distance: ${(maxDist / 1000).toFixed(3)}km`);
    // Utiliser une limite très large pour dijkstra pour explorer vraiment loin
    const result = dijkstra(graph, startId, bestNode, maxDist * 10, 10000); // Limite très large
    if (result) {
      console.log(`[radialExplore] Dijkstra found path: ${(result.distance / 1000).toFixed(3)}km, ${result.path.length} nodes`);
    } else {
      console.log(`[radialExplore] Dijkstra failed, using BFS path instead`);
    }
    // Si dijkstra échoue mais qu'on a un chemin dans visited, utiliser le chemin BFS
    if (!result && bestNode && bestPath.length > 1) {
      // Fallback : construire le résultat depuis le chemin BFS
      let totalDistance = 0;
      for (let i = 0; i < bestPath.length - 1; i++) {
        const edge = graph.edges.get(`${bestPath[i]}-${bestPath[i + 1]}`);
        if (edge) {
          totalDistance += edge.distance;
        }
      }
      return {
        path: bestPath,
        distance: totalDistance
      };
    }
    return result;
  }
  
  // Si aucun nœud n'a été trouvé avec le seuil minimum, essayer sans seuil
  if (bestNode === null && nodeToPath.size > 1) {
    // Trouver le nœud le plus éloigné (même très court)
    let farthestDist = 0;
    let farthestNode: string | null = null;
    let farthestPath: string[] = [startId];
    const minFallbackDist = maxDist * 0.005; // Très permissif : 0.5% de la distance cible
    
    for (const [nodeId, path] of nodeToPath.entries()) {
      if (nodeId === startId) continue;
      let pathDist = 0;
      for (let i = 0; i < path.length - 1; i++) {
        let edge = graph.edges.get(`${path[i]}-${path[i + 1]}`);
        if (!edge) {
          edge = graph.edges.get(`${path[i + 1]}-${path[i]}`);
        }
        if (edge) pathDist += edge.distance;
      }
      if (pathDist > farthestDist && pathDist >= minFallbackDist) {
        farthestDist = pathDist;
        farthestNode = nodeId;
        farthestPath = path;
      }
    }
    
    if (farthestNode && farthestPath.length > 1) {
      return {
        path: farthestPath,
        distance: farthestDist
      };
    }
  }
  
  // Dernier recours : si on a exploré des nœuds mais aucun ne satisfait les critères, retourner le plus éloigné quand même
  if (nodeToPath.size > 1 && visited.size > 1) {
    let maxDistFound = 0;
    let farthestNode: string | null = null;
    let farthestPath: string[] = [startId];
    
    for (const [nodeId, path] of nodeToPath.entries()) {
      if (nodeId === startId) continue;
      let pathDist = 0;
      for (let i = 0; i < path.length - 1; i++) {
        let edge = graph.edges.get(`${path[i]}-${path[i + 1]}`);
        if (!edge) {
          edge = graph.edges.get(`${path[i + 1]}-${path[i]}`);
        }
        if (edge) pathDist += edge.distance;
      }
      if (pathDist > maxDistFound) {
        maxDistFound = pathDist;
        farthestNode = nodeId;
        farthestPath = path;
      }
    }
    
    if (farthestNode && farthestPath.length > 1 && maxDistFound > 0) {
      return {
        path: farthestPath,
        distance: maxDistFound
      };
    }
  }
  
  return null;
}

function computeAngle(graph: Graph, start: string, end: string): number {
  const n1 = graph.nodes.get(start), n2 = graph.nodes.get(end)
  if (!n1||!n2) return 0
  const dy = n2.lat - n1.lat, dx = n2.lon - n1.lon
  return Math.atan2(dy, dx) * 180 / Math.PI
}

function averageEdgeQuality(graph: Graph, edges: string[]): number {
  let q = 0, count = 0
  for(const e of edges) {
    const edge = graph.edges.get(e)
    if (edge && edge.tags) {
      q += calculateWayQualityScore(edge.tags)
      count++
    }
  }
  return count > 0 ? q / count : 50
}

// Multicritères scoring
function multiScore(factors: {distance:number,angle:number,quality:number,diversity:number}, weight?: Partial<{distance:number,angle:number,quality:number,diversity:number}>):number {
  return (100 - factors.distance) * (weight?.distance??0.4)
    + (100 - Math.abs(factors.angle)) * (weight?.angle??0.3)
    + factors.quality * (weight?.quality??0.2)
    + factors.diversity * (weight?.diversity??0.1)
}

// % d’overlap entre aller et retour (number 0..1)
function fractionOverlap(edges1: string[], edges2: string[]): number {
  const set1 = new Set(edges1), set2 = new Set(edges2)
  let common = 0
  for(const e of set2) if(set1.has(e)) common++
  return Math.max(common / edges1.length, common / edges2.length)
}

// Validation stricte OSM
function validateLoopAgainstOSM(loop: GeneratedLoop, graph: Graph): boolean {
  for(let i=0; i<loop.pathEdges.length; i++) {
    const id = loop.pathEdges[i]
    if (!graph.edges.has(id)) return false
    const edge = graph.edges.get(id)
    if (!edge || !edge.osmWayId) return false
  }
  return true
}

