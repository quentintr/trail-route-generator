import React, { useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { MapDebugLayer } from '../components/map/MapDebugLayer'

export function RouteGenerationDebug() {
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [generationStats, setGenerationStats] = useState<any>(null)

  const generateRoute = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/routes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_lat:48.8566, start_lon:2.3522, distance:5 })
      })
      const data = await response.json()
      if (data.debug) {
        setDebugData(data.debug.graph)
        setGenerationStats(data.debug)
      }
      console.log('Route generated:', data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', padding: '20px', overflowY: 'auto' }}>
        <h2>Debug Mode</h2>
        <button onClick={generateRoute}>
          Generate Route
        </button>
        <label>
          <input
            type="checkbox"
            checked={debugEnabled}
            onChange={e => setDebugEnabled(e.target.checked)}
          />
          Show OSM Graph
        </label>
        {generationStats && (
          <div style={{ marginTop: '20px' }}>
            <h3>Generation Stats</h3>
            <pre>{JSON.stringify(generationStats, null, 2)}</pre>
          </div>
        )}
      </div>
      {/* Map */}
      <MapContainer
        center={[48.8566,2.3522]}
        zoom={13}
        style={{ flex:1 }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapDebugLayer enabled={debugEnabled} data={debugData} />
      </MapContainer>
    </div>
  )
}
