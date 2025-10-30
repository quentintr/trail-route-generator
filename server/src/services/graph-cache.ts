import fs from 'fs/promises'
import path from 'path'
import { Graph } from './graph-builder'

const CACHE_DIR = path.resolve(__dirname, '../../cache')
const TTL_DAYS = 7

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
  await fs.mkdir(CACHE_DIR, {recursive:true})
  const file = path.join(CACHE_DIR, `osm-${key}.json`)
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8')
}

export async function loadGraph(key: string): Promise<CachedGraph|null> {
  const file = path.join(CACHE_DIR, `osm-${key}.json`)
  try {
    const raw = await fs.readFile(file, 'utf8')
    const obj = JSON.parse(raw)
    // TTL management
    if (Date.now()-Date.parse(obj.createdAt) > TTL_DAYS*24*3600*1000) return null
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
