// Adaptateur GeoJSON → OSM Elements, détection multiprotocole
import type { OSMData, OSMElement, OSMNode, OSMWay } from '../config/osm-config'

export function detectFormat(data: any): 'osm' | 'geojson' | 'unknown' {
  if (data.elements && Array.isArray(data.elements)) return 'osm'
  if (data.features && Array.isArray(data.features)) return 'geojson'
  return 'unknown'
}

export function convertGeoJSONToOSM(geojson: any): OSMData {
  console.log('⚠️  Converting GeoJSON to OSM format (partial conversion)')
  const elements: OSMElement[] = []
  const nodeIdCounter = { current: 1 }
  const nodeCache = new Map<string, number>()
  if (!geojson.features || !Array.isArray(geojson.features)) throw new Error('Invalid GeoJSON: no features array')
  for (const feature of geojson.features) {
    if (!feature.geometry || !feature.properties) continue
    const { geometry, properties } = feature
    if (geometry.type === 'LineString') {
      const wayNodes: number[] = []
      for (const coord of geometry.coordinates) {
        const [lon, lat] = coord
        const key = `${lat.toFixed(6)},${lon.toFixed(6)}`
        let nodeId = nodeCache.get(key)
        if (!nodeId) {
          nodeId = nodeIdCounter.current++
          nodeCache.set(key, nodeId)
          elements.push({ type: 'node', id: nodeId, lat, lon, tags: {} } as OSMNode)
        }
        wayNodes.push(nodeId)
      }
      if (wayNodes.length >= 2) {
        elements.push({
          type: 'way',
          id: feature.id || nodeIdCounter.current++,
          nodes: wayNodes,
          tags: { highway: properties.highway || 'path', surface: properties.surface || 'unknown', ...properties }
        } as OSMWay)
      }
    } else if (geometry.type === 'Point') {
      const [lon, lat] = geometry.coordinates
      elements.push({ type: 'node', id: feature.id || nodeIdCounter.current++, lat, lon, tags: properties || {} } as OSMNode)
    }
  }
  console.log(`   Converted ${elements.length} elements (${nodeCache.size} nodes, ${elements.filter(e=>e.type==='way').length} ways)`)
  return { version: '0.6', generator: 'geojson-adapter', elements }
}

export function ensureOSMFormat(data: any): OSMData {
  const format = detectFormat(data)
  console.log(`📊 Detected data format: ${format}`)
  switch (format) {
    case 'osm':
      console.log('   ✅ Already in OSM format')
      return data as OSMData
    case 'geojson':
      console.log('   🔄 Converting from GeoJSON to OSM...')
      return convertGeoJSONToOSM(data)
    case 'unknown':
    default:
      console.error('   ❌ Unknown data format:', Object.keys(data))
      throw new Error(`Unknown data format. Expected OSM (with .elements) or GeoJSON (with .features), but got: ${JSON.stringify(Object.keys(data))}`)
  }
}


