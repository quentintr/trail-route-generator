import { Graph } from '../services/graph-builder.js';

export interface PathfindingResult {
  path: string[];
  distance: number;
}

export function dijkstra(graph: Graph, start: string, goal: string, maxDistance=3000, maxNodes=500, forbiddenEdges?: Set<string>): PathfindingResult|null {
  // Simple BFS avec distance
  const queue: [string, number, string[]][] = [[start, 0, [start]]];
  const visited = new Set<string>();
  while(queue.length>0) {
    const [u, dist, path] = queue.shift()!;
    if(u===goal && dist<=maxDistance) return {path, distance: dist};
    if(dist>maxDistance||visited.has(u)||path.length>maxNodes) continue;
    visited.add(u);
    const node = graph.nodes.get(u);
    if(!node) continue;
    for(const v of node.connections) {
      // Essayer les deux sens de l'edge
      let e = graph.edges.get(`${u}-${v}`);
      if(!e) {
        e = graph.edges.get(`${v}-${u}`);
      }
      if(!e) continue;
      
      // Éviter les edges interdites (pour éviter de revenir par le même chemin)
      if (forbiddenEdges && (forbiddenEdges.has(e.id) || forbiddenEdges.has(`${u}-${v}`) || forbiddenEdges.has(`${v}-${u}`))) {
        continue;
      }
      
      queue.push([v, dist+e.distance, [...path, v]]);
    }
  }
  return null;
}

export function astar(graph: Graph, start: string, goal: string, maxDistance=3000, maxNodes=500): PathfindingResult|null {
  // Pour le mock : renvoie juste BFS, à spécialiser plus tard
  return dijkstra(graph, start, goal, maxDistance, maxNodes);
}
