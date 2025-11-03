import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Graph } from './graph-builder';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '../../cache');
const TTL_DAYS = 7;

export interface CachedGraph {
  area: { lat: number, lon: number, radius: number }
  graph: Graph
  osmDataVersion: string
  createdAt: string
  nodesCount: number
  edgesCount: number
}

export function hashArea(lat: number, lon: number, radius: number): string {
  return Buffer.from(`${lat.toFixed(6)},${lon.toFixed(6)},${radius.toFixed(2)}`).toString('base64')
}

export async function saveGraph(key: string, data: CachedGraph): Promise<void> {
  // Validation : ne pas sauvegarder de graphe vide
  const nodesCount = data.graph?.nodes instanceof Map ? data.graph.nodes.size : 
                     typeof data.graph?.nodes === 'object' ? Object.keys(data.graph.nodes).length : 0
  const edgesCount = data.graph?.edges instanceof Map ? data.graph.edges.size : 
                     typeof data.graph?.edges === 'object' ? Object.keys(data.graph.edges).length : 0
  
  if (nodesCount === 0 || edgesCount === 0) {
    throw new Error(`Cannot cache empty graph (nodes=${nodesCount}, edges=${edgesCount})`)
  }
  
  await fs.mkdir(CACHE_DIR, {recursive:true})
  const file = path.join(CACHE_DIR, `osm-${key}.json`)
  
  // Convertir les Map en objets pour JSON serialization
  const serializableData = {
    ...data,
    graph: {
      nodes: data.graph.nodes instanceof Map 
        ? Object.fromEntries(data.graph.nodes)
        : data.graph.nodes,
      edges: data.graph.edges instanceof Map
        ? Object.fromEntries(data.graph.edges)
        : data.graph.edges
    }
  }
  
  await fs.writeFile(file, JSON.stringify(serializableData, null, 2), 'utf8')
}

export async function loadGraph(key: string): Promise<CachedGraph|null> {
  const file = path.join(CACHE_DIR, `osm-${key}.json`)
  try {
    const raw = await fs.readFile(file, 'utf8')
    const obj = JSON.parse(raw)
    // TTL management
    if (Date.now()-Date.parse(obj.createdAt) > TTL_DAYS*24*3600*1000) return null
    // Rejeter les graphes vides (problème de cache corrompu)
    if (!obj.graph || !obj.graph.nodes || !obj.graph.edges) {
      console.warn(`[cache] Rejected invalid graph structure for key ${key}`)
      return null
    }
    const nodesCount = obj.nodesCount || (typeof obj.graph.nodes === 'object' ? Object.keys(obj.graph.nodes).length : 0)
    const edgesCount = obj.edgesCount || (typeof obj.graph.edges === 'object' ? Object.keys(obj.graph.edges).length : 0)
    if (nodesCount === 0 || edgesCount === 0) {
      console.warn(`[cache] Rejected empty graph (nodes=${nodesCount}, edges=${edgesCount}) for key ${key}`)
      return null
    }
    return obj as CachedGraph
  } catch {
    return null
  }
}

export async function cleanupCache(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR)
    for(const f of files) {
      if(f.startsWith('osm-')&&f.endsWith('.json')) {
        const p = path.join(CACHE_DIR, f)
        const raw = await fs.readFile(p, 'utf8')
        const obj = JSON.parse(raw)
        if (Date.now()-Date.parse(obj.createdAt) > TTL_DAYS*24*3600*1000) {
          await fs.unlink(p)
        }
      }
    }
  } catch{}
}

export async function cacheStats(): Promise<{count:number, totalMB:number}> {
  await fs.mkdir(CACHE_DIR, {recursive:true})
  const files = await fs.readdir(CACHE_DIR)
  let count = 0, total = 0
  for(const f of files) {
    if(f.startsWith('osm-')&&f.endsWith('.json')) {
      const stat = await fs.stat(path.join(CACHE_DIR, f))
      count++
      total += stat.size
    }
  }
  return { count, totalMB: total/1024/1024 }
}
