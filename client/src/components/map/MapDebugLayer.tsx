import React from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
interface DebugData {
  graph?: {
    nodes: Map<string, any>
    edges: Map<string, any>
  }
  exploration?: {
    directions: any[]
    candidates: any[]
  }
}
interface Props {
  enabled: boolean
  data?: DebugData
}
export function MapDebugLayer({ enabled, data }: Props) {
  const map = useMap()
  React.useEffect(() => {
    if (!enabled || !data) return
    const layers: L.Layer[] = []
    // Nodes
    if (data.graph) {
      for (const node of Object.values(data.graph.nodes||{})) {
        const marker = L.circleMarker([node.lat, node.lon], {
          radius: 3, color: node.isIntersection ? 'red' : 'blue', fillOpacity: 0.5
        }).addTo(map)
        marker.bindTooltip(`Node ${node.id}<br/>Degree: ${node.degree}`)
        layers.push(marker)
      }
      // Edges
      for (const edge of Object.values(data.graph.edges||{})) {
        const fromNode = data.graph.nodes[edge.from]
        const toNode = data.graph.nodes[edge.to]
        if (fromNode && toNode) {
          const polyline = L.polyline([
            [fromNode.lat, fromNode.lon],[toNode.lat, toNode.lon]
          ],{
            color:'gray',weight:1,opacity:0.3
          }).addTo(map)
          polyline.bindTooltip(
            `Way ${edge.osmWayId}<br/>Distance: ${edge.distance.toFixed(0)}m<br/>Quality: ${edge.qualityScore.toFixed(0)}`
          )
          layers.push(polyline)
        }
      }
    }
    // Cleanup
    return () => { layers.forEach(layer => map.removeLayer(layer)) }
  }, [enabled, data, map])
  return null
}
