import { Graph } from '../services/graph-builder.js';

export interface PathfindingResult {
  path: string[];
  distance: number;
}

export function dijkstra(graph: Graph, start: string, goal: string, maxDistance=3000, maxNodes=500): PathfindingResult|null {
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
      const e = graph.edges.get(`${u}-${v}`);
      if(!e) continue;
      queue.push([v, dist+e.distance, [...path, v]]);
    }
  }
  return null;
}

export function astar(graph: Graph, start: string, goal: string, maxDistance=3000, maxNodes=500): PathfindingResult|null {
  // Pour le mock : renvoie juste BFS, à spécialiser plus tard
  return dijkstra(graph, start, goal, maxDistance, maxNodes);
}
