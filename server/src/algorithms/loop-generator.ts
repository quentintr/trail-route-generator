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

/**
 * Calcule l'azimut (bearing) entre deux points en degrés (0-360)
 * 0° = Nord, 90° = Est, 180° = Sud, 270° = Ouest
 */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360; // Normaliser à 0-360
  
  return bearing;
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
      // CORRECTION : Explorer jusqu'à 55% de la distance cible (au lieu de 50%)
      // Le retour fera ~45% pour avoir une boucle totale de ~100%
      radialResults[dir] = radialExplore(graph, start, dir, target * 0.55);
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
  
  // CORRECTION : Traiter TOUS les candidats pour générer plusieurs boucles
  // Même les candidats sans retour initial peuvent être utilisés (on calculera le retour après)
  const allCandidates = candidates;
  
  const scoredCandidates = allCandidates.map(c => {
    // Calculer le score
    const distanceScore = Math.abs(c.distance - target * 0.5) / target; // Plus proche de target/2 = meilleur
    const angleScore = Math.abs(c.angle) / 180; // Normaliser l'angle
    const hasReturn = c.returnPathsStats ? 1 : 0; // Bonus si chemin de retour disponible
    const score = (1 - distanceScore) * (options.scoring?.distance || 0.4) +
                  (1 - angleScore) * (options.scoring?.angle || 0.3) +
                  (c.qualityScore / 100) * (options.scoring?.quality || 0.2) +
                  (hasReturn * 0.1); // Bonus pour avoir un chemin de retour
    return { ...c, score };
  }).sort((a, b) => b.score - a.score); // Trier par score décroissant

  // Construire les boucles complètes (aller + retour)
  // CORRECTION : Limiter à 10 candidats pour éviter trop de boucles, mais essayer de générer 3 boucles valides
  const topCandidates = scoredCandidates.slice(0, 10);
  console.log(`\n📊 Processing ${topCandidates.length} top candidates (from ${scoredCandidates.length} total)`);
  
  // CORRECTION : Si on a peu de candidats, essayer de générer plusieurs boucles depuis le même candidat
  // en utilisant différents nœuds intermédiaires le long du chemin aller
  if (topCandidates.length === 1 && loops.length < 3) {
    console.log(`\n🔄 Only 1 candidate found, trying to generate multiple loops from intermediate nodes`);
    const candidate = topCandidates[0];
    const intermediateNodes = candidate.pathOut.slice(1, -1); // Tous les nœuds sauf le début et la fin
    
    // Essayer les nœuds à 1/3, 1/2 et 2/3 du chemin pour créer des variantes
    const keyPoints = [
      intermediateNodes[Math.floor(intermediateNodes.length * 0.33)],
      intermediateNodes[Math.floor(intermediateNodes.length * 0.5)],
      intermediateNodes[Math.floor(intermediateNodes.length * 0.67)]
    ].filter(Boolean);
    
    for (const intermediateNode of keyPoints) {
      if (loops.length >= 3) break;
      
      // Créer un nouveau candidat depuis ce nœud intermédiaire
      const intermediateIndex = candidate.pathOut.indexOf(intermediateNode);
      if (intermediateIndex === -1) continue;
      
      const partialPath = candidate.pathOut.slice(0, intermediateIndex + 1);
      const partialEdges = candidate.pathEdges.slice(0, intermediateIndex);
      let partialDistance = 0;
      for (const edgeId of partialEdges) {
        const edge = graph.edges.get(edgeId);
        if (edge) partialDistance += edge.distance;
      }
      
      if (partialDistance < target * 0.2) continue; // Trop court
      
      console.log(`\n🔄 Building loop variant from intermediate node ${intermediateNode} (at ${(partialDistance / 1000).toFixed(2)}km)`);
      
      const returnPath = calculateReturnPath(
        graph,
        intermediateNode,
        start,
        partialEdges,
        target * 5.0
      );
      
      if (!returnPath || returnPath.overlapRatio > 0.7) continue;
      
      const totalDist = partialDistance + returnPath.distance;
      const distanceAccuracy = 1 - Math.abs(totalDist - target) / target;
      
      if (distanceAccuracy < 0.5) continue;
      
      const fullLoop = [...partialPath, ...returnPath.path.slice(1)];
      const allEdges = [...partialEdges, ...returnPath.path.slice(0, -1).map((n, i) => {
        const from = returnPath.path[i];
        const to = returnPath.path[i + 1];
        const edge = graph.edges.get(`${from}-${to}`) || graph.edges.get(`${to}-${from}`);
        return edge?.id || '';
      }).filter(Boolean)];
      
      const qualityScore = Math.min(1.0, (1 - returnPath.overlapRatio) * distanceAccuracy);
      
      loops.push({
        loop: fullLoop,
        pathEdges: allEdges,
        distance: totalDist,
        qualityScore,
        debug: {
          outPath: partialPath,
          returnPath: returnPath.path,
          outDistance: partialDistance,
          returnDistance: returnPath.distance,
          totalDistance: totalDist,
          overlapRatio: returnPath.overlapRatio,
          distanceAccuracy,
          note: 'Variant from intermediate node'
        }
      });
      
      console.log(`   ✅ Variant loop: ${(totalDist / 1000).toFixed(2)}km, quality=${qualityScore.toFixed(2)}`);
    }
  }
  
  for (const candidate of topCandidates) {
    console.log(`\n🔄 Building loop for candidate ${candidate.nodeId}...`);
    console.log(`   Forward path: ${(candidate.distance / 1000).toFixed(2)} km, ${candidate.pathOut.length} nodes`);
    
    // CORRECTION : Calculer le retour avec logs détaillés
    const explorationEdges = candidate.pathEdges;
    
    console.log(`   🔙 Calculating return path...`);
    console.log(`      Avoiding ${explorationEdges.length} forward edges`);
    
    const returnPath = calculateReturnPath(
      graph,
      candidate.nodeId,
      start,
      explorationEdges,
      target * 5.0
    );
    
    if (!returnPath) {
      console.log(`   ❌ No return path found for candidate ${candidate.nodeId}`);
      continue;
    }
    
    console.log(`   ✅ Return path: ${(returnPath.distance / 1000).toFixed(2)} km, ${returnPath.path.length} nodes, overlap: ${(returnPath.overlapRatio * 100).toFixed(1)}%`);
    
    // CORRECTION : Rejeter si chevauchement > 70% (au lieu de 40% pour avoir plus de boucles)
    if (returnPath.overlapRatio > 0.7) {
      console.log(`   ⚠️  Return path overlaps ${(returnPath.overlapRatio * 100).toFixed(1)}% with forward path (max 70%), rejecting this loop`);
      continue;
    }
    
    // CORRECTION : Si on a déjà 3 boucles, arrêter
    if (loops.length >= 3) {
      console.log(`   ✅ Already have 3 loops, stopping candidate processing`);
      break;
    }
    
    const returnResult: PathfindingResult = {
      path: returnPath.path,
      distance: returnPath.distance
    };
    
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
    
    console.log(`   📊 Complete loop:`);
    console.log(`      - Forward: ${(outDistance / 1000).toFixed(2)} km`);
    console.log(`      - Return: ${(returnDistance / 1000).toFixed(2)} km`);
    console.log(`      - Total: ${(totalDist / 1000).toFixed(2)} km`);
    console.log(`      - Target: ${(target / 1000).toFixed(2)} km`);
    const distanceAccuracy = 1 - Math.abs(totalDist - target) / target;
    console.log(`      - Accuracy: ${(distanceAccuracy * 100).toFixed(1)}%`);
    
    // CORRECTION : Accepter ±50% au lieu de ±40% pour avoir plus de boucles
    if (distanceAccuracy < 0.5) {
      console.log(`   ⚠️  Distance too far from target (${(distanceAccuracy * 100).toFixed(1)}% accuracy), skipping`);
      continue;
    }
    
    // Combiner aller + retour
    const fullLoop = [...candidate.pathOut, ...returnResult.path.slice(1)]; // Éviter la duplication du point de retour
    const allEdges = [...candidate.pathEdges, ...returnEdges];
    
    // CORRECTION : Quality score entre 0-1 (limiter à 1.0)
    const qualityScore = Math.min(1.0, (1 - returnPath.overlapRatio) * distanceAccuracy);
    
    loops.push({
      loop: fullLoop,
      pathEdges: allEdges,
      distance: totalDist, // Distance en mètres
      qualityScore: qualityScore, // CORRECTION : 0-1 au lieu de 0-100
      debug: {
        outPath: candidate.pathOut,
        returnPath: returnResult.path,
        outDistance,
        returnDistance,
        totalDistance: totalDist,
        score: candidate.score,
        overlapRatio: returnPath.overlapRatio,
        distanceAccuracy
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
        qualityScore: Math.min(1.0, bestCandidate.qualityScore / 100), // CORRECTION : Convertir de 0-100 à 0-1
        debug: { note: 'Minimal fallback loop (too short)', calculatedDistance }
      };
      loops.push(simpleLoop);
      debug.warnings.push(`⚠️  Generated minimal loop: ${(calculatedDistance / 1000).toFixed(2)}km (target: ${(target / 1000).toFixed(2)}km)`);
    }
  }

  debug.timings.total = Date.now() - t0;
  
  // CORRECTION : Trier les boucles par quality_score et limiter à 3
  loops.sort((a, b) => b.qualityScore - a.qualityScore);
  const topLoops = loops.slice(0, 3);
  
  console.log(`\n✅ Generated ${loops.length} loops total, returning top ${topLoops.length}`);
  if (topLoops.length > 0) {
    console.log(`📊 Loop quality scores (top ${topLoops.length}):`);
    topLoops.forEach((loop, i) => {
      const overlap = (loop.debug as any)?.overlapRatio || 0;
      console.log(`   ${i + 1}. ${(loop.distance / 1000).toFixed(2)}km, score=${loop.qualityScore.toFixed(2)}, overlap=${(overlap * 100).toFixed(0)}%`);
    });
  }
  
  return { loops: topLoops, debug };
}

// ------------------------------------------------------------------------
// UTILS PHASE RADIALE, SCORING, ETC
// ------------------------------------------------------------------------

// Renvoie 8 directions en degrés (0°=Nord, 90°=Est, 180°=Sud, 270°=Ouest)
function getDirections(): [number, number][] {
  // Convertir les directions cardinales en angles
  return [ [0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1] ]
}

// Convertit une direction vectorielle [x,y] en angle en degrés (0-360)
function vectorToBearing(direction: [number, number]): number {
  const [x, y] = direction;
  // Normaliser
  const norm = Math.sqrt(x ** 2 + y ** 2);
  if (norm === 0) return 0;
  
  // Calculer l'angle : atan2(y, x) donne l'angle depuis l'axe des x
  // Mais on veut depuis le Nord (0° = Nord), donc on ajuste
  let angle = Math.atan2(x, y) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  return angle;
}

// Exploration radiale STRICTE dans UNE direction donnée avec pénalisation des déviations
function radialExplore(graph: Graph, startId: string, direction: [number, number], maxDist: number): PathfindingResult | null {
  const startNode = graph.nodes.get(startId);
  if (!startNode) return null;
  
  // Vérifier que le nœud a des connexions
  if (!startNode.connections || startNode.connections.length === 0) {
    return null;
  }
  
  // Convertir la direction vectorielle en angle en degrés
  const targetDirection = vectorToBearing(direction);
  console.log(`   🧭 Exploring direction ${targetDirection.toFixed(0)}° (strict mode)`);
  
  // Exploration BFS avec scoring directionnel STRICT
  const queue: [string, number, string[]][] = [[startId, 0, [startId]]]; // [nodeId, dist, path]
  const visited = new Set<string>();
  let bestNode: string | null = null;
  let bestScore = -Infinity;
  let bestPath: string[] = [startId];
  
  const maxIterations = 15000; // Augmenté de 10k à 15k pour explorer plus loin
  let iterations = 0;
  let maxDistanceFound = 0;
  
  // CORRECTION : Distance cible : 87.5% de maxDist (au lieu de 50%)
  // maxDist représente 55% de la boucle totale, donc targetDistance = 87.5% de 55% = ~48% de la boucle
  // On cherche ensuite entre 80-95% de targetDistance, soit 38-45% de la boucle
  const targetDistance = maxDist * 0.875;
  
  // Trier la queue par distance (exploration en largeur)
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    
    // Trier par distance pour exploration en largeur
    queue.sort((a, b) => a[1] - b[1]);
    const [currentId, dist, path] = queue.shift()!;
    
    if (visited.has(currentId)) continue;
    // CORRECTION : Arrêter si on dépasse 110% de la distance cible (au lieu de 105%) pour explorer plus loin
    if (dist > maxDist * 1.1) continue;
    visited.add(currentId);
    
    // Tracker la distance maximale trouvée
    if (dist > maxDistanceFound) {
      maxDistanceFound = dist;
    }
    
    const node = graph.nodes.get(currentId);
    if (!node || !node.connections || node.connections.length === 0) continue;
    
    // Calculer le bearing depuis le départ vers ce nœud
    const bearingFromStart = calculateBearing(startNode.lat, startNode.lon, node.lat, node.lon);
    
    // Calculer l'écart angulaire par rapport à la direction cible
    let angularDeviation = Math.abs(bearingFromStart - targetDirection);
    if (angularDeviation > 180) angularDeviation = 360 - angularDeviation;
    
    // CORRECTION : Rejeter seulement les nœuds qui dévient beaucoup (>120° au lieu de 90°) pour avoir plus de candidats
    if (angularDeviation > 120) {
      continue; // Ignorer ce nœud, il n'est pas dans la bonne direction
    }
    
    // CORRECTION : Chercher entre 70-100% de targetDistance (au lieu de 80-95%) pour avoir plus de candidats
    // Optimal à 85% pour mieux atteindre la distance cible
    const distanceRatio = dist / targetDistance;
    
    if (distanceRatio >= 0.70 && distanceRatio <= 1.0) {
      // Calculer le score
      const distanceScore = 1 - Math.abs(distanceRatio - 0.85) * 6.67; // Optimal à 85%
      const directionScore = 1 - (angularDeviation / 90); // 1.0 si parfait, 0.0 si 90°
      const connectivityScore = Math.min(node.connections.length / 10, 0.1); // Bonus si intersection
      
      const totalScore = distanceScore * 0.5 + directionScore * 0.4 + connectivityScore * 0.1;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestNode = currentId;
        bestPath = path;
        console.log(`      ✨ New best: ${currentId} at ${(dist / 1000).toFixed(2)}km, dir ${bearingFromStart.toFixed(0)}° (dev: ${angularDeviation.toFixed(0)}°), score=${totalScore.toFixed(2)}`);
      }
    }
    
    // CORRECTION : Continuer jusqu'à 110% de targetDistance (au lieu de 105%) pour explorer plus loin
    if (distanceRatio > 1.1) continue;
    
    // Explorer les voisins avec pénalisation directionnelle
    for (const neighborId of node.connections) {
      if (visited.has(neighborId)) continue;
      
      let edge = graph.edges.get(`${currentId}-${neighborId}`);
      if (!edge) {
        edge = graph.edges.get(`${neighborId}-${currentId}`);
      }
      if (!edge) continue;
      
      const neighborNode = graph.nodes.get(neighborId);
      if (!neighborNode) continue;
      
      // Calculer la direction de cette arête
      const edgeBearing = calculateBearing(node.lat, node.lon, neighborNode.lat, neighborNode.lon);
      
      // Calculer l'écart par rapport à la direction cible
      let bearingDiff = Math.abs(edgeBearing - targetDirection);
      if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
      
      // CORRECTION : Réduire les pénalités pour explorer plus largement et trouver plus de candidats
      let edgeWeight = edge.distance;
      
      if (bearingDiff > 135) {
        edgeWeight *= 10; // Réduit de x20 à x10 pour explorer plus largement
      } else if (bearingDiff > 90) {
        edgeWeight *= 3; // Réduit de x5 à x3
      } else if (bearingDiff > 45) {
        edgeWeight *= 1.5; // Réduit de x2 à x1.5
      }
      
      const newDist = dist + edgeWeight;
      
      // CORRECTION : Continuer jusqu'à 110% (au lieu de 105%) pour explorer plus loin
      if (newDist <= maxDist * 1.1) {
        queue.push([neighborId, newDist, [...path, neighborId]]);
      }
    }
    
    // Log périodique pour debug
    if (iterations % 1000 === 0 && iterations > 0) {
      console.log(`      [radialExplore] Iteration ${iterations}, queue: ${queue.length}, visited: ${visited.size}, max dist: ${(maxDistanceFound / 1000).toFixed(3)}km`);
    }
  }
  
  if (iterations >= maxIterations) {
    console.warn(`[radialExplore] Max iterations reached (${maxIterations}), stopping exploration`);
  }
  
  // Log pour debug
  if (iterations > 0) {
    console.log(`      [radialExplore] Explored ${visited.size} nodes, max distance: ${(maxDistanceFound / 1000).toFixed(3)}km, best node: ${bestNode}, iterations: ${iterations}`);
  }
  
  // Si on a trouvé un bon nœud, retourner le chemin BFS directement
  if (bestNode && bestNode !== startId && bestPath.length > 1) {
    // Calculer la distance réelle du chemin
    let totalDistance = 0;
    for (let i = 0; i < bestPath.length - 1; i++) {
      let edge = graph.edges.get(`${bestPath[i]}-${bestPath[i + 1]}`);
      if (!edge) {
        edge = graph.edges.get(`${bestPath[i + 1]}-${bestPath[i]}`);
      }
      if (edge) {
        totalDistance += edge.distance;
      }
    }
    
    console.log(`      ✅ Found path: ${bestNode} at ${(totalDistance / 1000).toFixed(2)}km, ${bestPath.length} nodes`);
    return {
      path: bestPath,
      distance: totalDistance
    };
  }
  
  console.log(`      ❌ No suitable candidate found`);
  return null;
}

/**
 * Calcule le chemin de retour en évitant les arêtes de l'aller
 */
function calculateReturnPath(
  graph: Graph,
  fromNodeId: string,
  toNodeId: string,
  explorationEdges: string[],
  maxDistance: number
): {
  path: string[];
  distance: number;
  overlapRatio: number;
} | null {
  console.log(`      🔙 calculateReturnPath: ${fromNodeId} → ${toNodeId}`);
  
  // Créer un Set des arêtes à éviter (aller + inverses)
  const avoidEdges = new Set<string>();
  for (const edgeId of explorationEdges) {
    avoidEdges.add(edgeId);
    // Ajouter aussi l'edge inverse
    const parts = edgeId.split('-');
    if (parts.length === 2) {
      avoidEdges.add(`${parts[1]}-${parts[0]}`);
    }
  }
  
  console.log(`         Avoiding ${avoidEdges.size} edges (forward + reverse)`);
  
  // CORRECTION : Pénalisation x50 des edges de l'aller
  const edgeWeightMultiplier = (edgeId: string, edge: any) => {
    if (avoidEdges.has(edgeId) || avoidEdges.has(edge.id)) {
      return 50; // PÉNALITÉ X50
    }
    return 1;
  };
  
  // Première tentative : avec pénalisation x50
  const result = dijkstra(graph, fromNodeId, toNodeId, maxDistance, 20000, avoidEdges, edgeWeightMultiplier);
  
  if (!result) {
    console.log(`         ❌ No return path found with penalty, trying without penalty`);
    // Deuxième tentative : sans pénalisation
    const result2 = dijkstra(graph, fromNodeId, toNodeId, maxDistance, 20000);
    if (!result2) {
      console.log(`         ❌ No return path found at all`);
      return null;
    }
    
    // Calculer l'overlap pour le résultat sans pénalisation
    const returnEdgesSet = new Set<string>();
    for (let i = 0; i < result2.path.length - 1; i++) {
      const from = result2.path[i];
      const to = result2.path[i + 1];
      let edge = graph.edges.get(`${from}-${to}`);
      if (!edge) {
        edge = graph.edges.get(`${to}-${from}`);
      }
      if (edge) {
        returnEdgesSet.add(edge.id);
      }
    }
    
    const overlapCount = Array.from(returnEdgesSet).filter(e => avoidEdges.has(e)).length;
    const overlapRatio = returnEdgesSet.size > 0 ? overlapCount / returnEdgesSet.size : 0;
    
    console.log(`         ⚠️  Fallback path: ${result2.path.length} nodes, ${(result2.distance / 1000).toFixed(2)}km, overlap=${(overlapRatio * 100).toFixed(1)}%`);
    
    return {
      path: result2.path,
      distance: result2.distance,
      overlapRatio
    };
  }
  
  // Calculer l'overlap
  const returnEdgesSet = new Set<string>();
  for (let i = 0; i < result.path.length - 1; i++) {
    const from = result.path[i];
    const to = result.path[i + 1];
    let edge = graph.edges.get(`${from}-${to}`);
    if (!edge) {
      edge = graph.edges.get(`${to}-${from}`);
    }
    if (edge) {
      returnEdgesSet.add(edge.id);
    }
  }
  
  const overlapCount = Array.from(returnEdgesSet).filter(e => avoidEdges.has(e)).length;
  const overlapRatio = returnEdgesSet.size > 0 ? overlapCount / returnEdgesSet.size : 0;
  
  console.log(`         ✅ Path: ${result.path.length} nodes, ${(result.distance / 1000).toFixed(2)}km, overlap: ${(overlapRatio * 100).toFixed(1)}%`);
  
  return {
    path: result.path,
    distance: result.distance,
    overlapRatio
  };
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

