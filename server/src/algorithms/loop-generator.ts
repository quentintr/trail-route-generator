// ------------------------------------------------------------------------
// Loop Generator (Exploration radiale, scoring, variantes)
// ------------------------------------------------------------------------
import { Graph, GraphNode, GraphEdge } from '../services/graph-builder.js';
import { dijkstra, astar, PathfindingResult } from './pathfinding.js';
import { calculateWayQualityScore } from '../services/osm-service.js';

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
  const debug: LoopGenerationDebug = {
    candidates: [], timings: {}, warnings: [], stats: { exploredNodes: 0, bestAngles: [] }
  };
  const t0 = Date.now();
  const directions = getDirections();
  const radialResults: { [dir: string]: PathfindingResult | null } = {};
  for (const dir of directions) {
    radialResults[dir] = radialExplore(graph, start, dir, target * 0.5);
  }
  debug.timings.exploration = Date.now() - t0;

  // MOCK : Génère un loop fictif pour exemple de qualité
  // === À remplacer par l’algo réel d’exploration/génération, ici basic exemple ===
  // on extrait un chemin, on calcule la qualité totale moyenne
  const demoEdgeIds = Array.from(graph.edges.keys()).slice(0, 10);
  let totalQuality = 0, count = 0;
  for(const edgeId of demoEdgeIds) {
    const edge = graph.edges.get(edgeId);
    if(edge && edge.tags) {
      totalQuality += calculateWayQualityScore(edge.tags); count++;
    }
  }
  const avgQuality = count ? totalQuality/count : 0;

  // On retourne une GeneratedLoop de test enrichie
  const generated:GeneratedLoop = {
    loop: demoEdgeIds.flatMap(eid => {
      const edge = graph.edges.get(eid);
      return edge ? [edge.from, edge.to] : [];
    }),
    pathEdges: demoEdgeIds,
    distance: demoEdgeIds.reduce((s,eid)=>{
      const edge = graph.edges.get(eid); return edge?s+edge.distance:s;
    },0),
    qualityScore: avgQuality,
    debug: { avgQuality, count, sample: demoEdgeIds }
  };
  return { loops: [generated], debug };
}

// ------------------------------------------------------------------------
// UTILS PHASE RADIALE, SCORING, ETC
// ------------------------------------------------------------------------

// Renvoie 8 directions N, NE, E, SE...
function getDirections(): [number, number][] {
  return [ [0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1] ]
}

// Exploration radiale = Dijkstra avec limitation sur 50% de la distance cible dans une direction donnée
function radialExplore(graph: Graph, startId: string, direction: [number, number], maxDist: number): PathfindingResult | null {
  // Pour la V1 : Dijkstra depuis start sur tous les voisins tant que la projection progresse dans la bonne direction
  return dijkstra(graph, startId, undefined as any, { maxDistance: maxDist }) // TODO : impl interdire split mauvais axe
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
    if (edge) { q+=edge.qualityScore; count++ }
  }
  return count>0 ? q/count : 50
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
