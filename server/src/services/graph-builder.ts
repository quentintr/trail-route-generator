import { OSMResponse, OSMWay, OSMNode } from './osm-service.js';

// Types robustes du graphe strict
export interface GraphNode {
  id: string;        // osm_node_123456
  osmId: string;     // id OSM
  lat: number;
  lon: number;
  connections: string[];
  tags?: Record<string, string>;
}
export interface GraphEdge {
  id: string;       // node1-node2
  osmWayId: string;
  from: string;
  to: string;
  distance: number;
  surface?: string;
  highway_type?: string;
  weight: number;
  tags?: Record<string, string>;
}
export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
}

function haversine(lat1:number, lon1:number, lat2:number, lon2:number):number {
  const R = 6371000;
  const toRad = (x:number) => x*Math.PI/180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
const isWalkable = (way:OSMWay) => {
  // Peut être raffiné
  const h = way.tags.highway;
  return h && /footway|path|track|cycleway|steps|pedestrian|residential|living_street|service/.test(h);
};
export function buildGraph(osmData: any): Graph {
  if ('features' in osmData && Array.isArray(osmData.features)) {
    console.warn('[buildGraph] Reçu un GeoJSON (features) au lieu d\'un .elements OSM !');
    // TODO : adapter si besoin pour convertir GeoJSON -> .elements OSM (non pris en charge ici)
    throw new Error("Erreur OSM/GeoJSON : buildGraph attend un format 'elements' type Overpass, reçu GeoJSON.");
  }
  if (!osmData || !Array.isArray(osmData.elements)) {
    console.error("[buildGraph] ERREUR : osmData.elements is not iterable !", JSON.stringify(osmData).substring(0,500));
    throw new Error("Erreur OSM: response format incorrect, pas de tableau elements (reçu : " + typeof osmData + ")");
  }
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  // 1. Extraire nodes OSM
  for(const el of osmData.elements) {
    if (el.type==='node') {
      nodes.set(`osm_node_${el.id}`, {
        id: `osm_node_${el.id}`,
        osmId: String(el.id),
        lat: (el as OSMNode).lat,
        lon: (el as OSMNode).lon,
        connections: [],
        tags: el.tags
      });
    }
  }
  // 2. Créer les arêtes UNIQUEMENT selon les ways OSM walkables
  for(const el of osmData.elements) {
    if (el.type==='way' && isWalkable(el as OSMWay)) {
      const way = el as OSMWay;
      for(let i=0;i<way.nodes.length-1;i++) {
        const fromId = `osm_node_${way.nodes[i]}`;
        const toId = `osm_node_${way.nodes[i+1]}`;
        const fromNode = nodes.get(fromId), toNode = nodes.get(toId);
        if (!fromNode || !toNode) continue;
        const dist = haversine(fromNode.lat,fromNode.lon,toNode.lat,toNode.lon);
        const edgeId = `${fromId}-${toId}`;
        const edge:GraphEdge = {
          id: edgeId,
          osmWayId: String(way.id),
          from: fromId,
          to: toId,
          distance: dist,
          surface: way.tags.surface,
          highway_type: way.tags.highway,
          weight: dist, // par défaut pondération distance
          tags: way.tags
        };
        edges.set(edgeId, edge);
        // graphe non-orienté
        const backEdgeId = `${toId}-${fromId}`;
        edges.set(backEdgeId, { ...edge, id: backEdgeId, from: toId, to: fromId });
        fromNode.connections.push(toId);
        toNode.connections.push(fromId);
      }
    }
  }
  console.log(`[BUILD] Graph : ${nodes.size} nœuds, ${edges.size} arêtes`);
  // Validation min.
  for(const [id,e] of edges) {
    if (!e.osmWayId) throw new Error(`Edge ${id} missing osmWayId`);
    if (!nodes.has(e.from)||!nodes.has(e.to)) throw new Error(`Edge ${id} references unknown node`);
  }
  return { nodes, edges };
}

export function validateGraph(graph: Graph): { valid: boolean, errors: string[] } {
  const errors:string[]=[];
  for(const [eid,e] of graph.edges) {
    if (!e.osmWayId) errors.push(`Edge ${eid} has no osmWayId`);
    if (!graph.nodes.has(e.from)) errors.push(`Edge ${eid} missing node ${e.from}`);
    if (!graph.nodes.has(e.to)) errors.push(`Edge ${eid} missing node ${e.to}`);
  }
  return { valid: errors.length===0, errors };
}
