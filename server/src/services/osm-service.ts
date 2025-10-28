/**
 * Service OSM (OpenStreetMap) pour la récupération de données géographiques
 * 
 * Ce service utilise l'API Overpass pour récupérer les données OSM
 * et les transformer en format GeoJSON pour l'application de randonnée.
 * 
 * Fonctionnalités :
 * - Récupération de chemins de randonnée/course
 * - Filtrage par type de surface et difficulté
 * - Extraction des métadonnées (surface, élévation, etc.)
 * - Conversion en format GeoJSON
 * 
 * Documentation Overpass API : https://wiki.openstreetmap.org/wiki/Overpass_API
 */

import axios, { AxiosResponse } from 'axios'
import { 
  OVERPASS_CONFIG, 
  RUNNING_PATH_TAGS, 
  SURFACE_TYPES, 
  RATE_LIMITING,
  ERROR_MESSAGES,
  configUtils,
  type OverpassQuery,
  type SearchArea
} from '../config/osm-config'

/**
 * Types pour les données OSM
 */
export interface OSMWay {
  type: 'way'
  id: number
  nodes: number[]
  tags: Record<string, string>
  geometry?: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}

export interface OSMNode {
  type: 'node'
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

export interface OSMResponse {
  version: number
  generator: string
  osm3s: {
    timestamp_osm_base: string
    copyright: string
  }
  elements: (OSMWay | OSMNode)[]
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  properties: {
    id: number
    highway: string
    surface?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    length?: number
    elevation?: number
    name?: string
    ref?: string
    access?: string
    foot?: string
    bicycle?: string
    motor_vehicle?: string
    width?: string
    smoothness?: string
    tracktype?: string
    trail_visibility?: string
    osm_id: number
  }
}

export interface GeoJSONCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
  metadata: {
    totalFeatures: number
    bounds: {
      north: number
      south: number
      east: number
      west: number
    }
    timestamp: string
  }
}

/**
 * Service OSM pour la récupération de données géographiques
 */
export class OSMService {
  private requestCount = 0
  private lastRequestTime = 0

  /**
   * Récupère les chemins de randonnée/course dans une zone donnée
   * 
   * @param area - Zone de recherche (bounding box)
   * @param options - Options de filtrage
   * @returns Collection GeoJSON des chemins
   */
  async getRunningPaths(
    area: SearchArea,
    options: {
      includeSecondary?: boolean
      surfaceTypes?: string[]
      difficulty?: string[]
      maxLength?: number
    } = {}
  ): Promise<GeoJSONCollection> {
    try {
      // Valider la zone de recherche
      if (!configUtils.validateSearchArea(area)) {
        throw new Error(ERROR_MESSAGES.INVALID_COORDINATES)
      }

      // Construire les tags à inclure
      const tags = this.buildPathTags(options.includeSecondary || false)
      
      // Construire la requête Overpass
      const query = configUtils.buildOverpassQuery(area, tags)
      
      // Récupérer les données OSM
      const osmData = await this.fetchOverpassData(query)
      console.log(`OSM data received: ${osmData.elements.length} elements`)
      
      // Transformer en GeoJSON
      const geojson = this.transformToGeoJSON(osmData, area)
      
      // Filtrer selon les options
      const filteredFeatures = this.filterFeatures(geojson.features, options)
      
      return {
        ...geojson,
        features: filteredFeatures,
        metadata: {
          ...geojson.metadata,
          totalFeatures: filteredFeatures.length
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des chemins OSM:', error)
      throw new Error(ERROR_MESSAGES.OVERPASS_ERROR)
    }
  }

  /**
   * Récupère les données d'élévation pour une zone
   * 
   * @param area - Zone de recherche
   * @returns Données d'élévation si disponibles
   */
  async getElevationData(area: SearchArea): Promise<GeoJSONFeature[]> {
    try {
      const query: OverpassQuery = {
        bbox: `${area.south},${area.west},${area.north},${area.east}`,
        timeout: OVERPASS_CONFIG.timeout,
        maxNodes: OVERPASS_CONFIG.maxNodes,
        query: `
          [out:json][timeout:${OVERPASS_CONFIG.timeout}];
          (
            way["natural"="peak"](${area.south},${area.west},${area.north},${area.east});
            way["natural"="ridge"](${area.south},${area.west},${area.north},${area.east});
            node["natural"="peak"](${area.south},${area.west},${area.north},${area.east});
            node["ele"](${area.south},${area.west},${area.north},${area.east});
          );
          out geom;
        `
      }

      const osmData = await this.fetchOverpassData(query)
      return this.transformElevationToGeoJSON(osmData)
    } catch (error) {
      console.error('Erreur lors de la récupération des données d\'élévation:', error)
      return []
    }
  }

  /**
   * Recherche des points d'intérêt (POI) pour la randonnée
   * 
   * @param area - Zone de recherche
   * @returns Points d'intérêt GeoJSON
   */
  async getPointsOfInterest(area: SearchArea): Promise<GeoJSONFeature[]> {
    try {
      const query: OverpassQuery = {
        bbox: `${area.south},${area.west},${area.north},${area.east}`,
        timeout: OVERPASS_CONFIG.timeout,
        maxNodes: OVERPASS_CONFIG.maxNodes,
        query: `
          [out:json][timeout:${OVERPASS_CONFIG.timeout}];
          (
            node["tourism"="viewpoint"](${area.south},${area.west},${area.north},${area.east});
            node["natural"="water"](${area.south},${area.west},${area.north},${area.east});
            node["amenity"="drinking_water"](${area.south},${area.west},${area.north},${area.east});
            node["amenity"="toilets"](${area.south},${area.west},${area.north},${area.east});
            node["amenity"="shelter"](${area.south},${area.west},${area.north},${area.east});
            node["historic"="ruins"](${area.south},${area.west},${area.north},${area.east});
            node["leisure"="park"](${area.south},${area.west},${area.north},${area.east});
          );
          out geom;
        `
      }

      const osmData = await this.fetchOverpassData(query)
      return this.transformPOIToGeoJSON(osmData)
    } catch (error) {
      console.error('Erreur lors de la récupération des POI:', error)
      return []
    }
  }

  /**
   * Récupère les données depuis l'API Overpass
   */
  private async fetchOverpassData(query: OverpassQuery): Promise<OSMResponse> {
    const maxRetries = 3
    const retryDelay = 5000 // 5 secondes

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Gestion de la limitation de taux
        await this.enforceRateLimit()

        console.log(`Making Overpass request (attempt ${attempt}/${maxRetries}) to: ${OVERPASS_CONFIG.endpoint}`)
        console.log(`Query: ${query.query.substring(0, 200)}...`)

        let response: AxiosResponse<OSMResponse>
        
        try {
          // Essayer l'endpoint principal
          response = await axios.post(
            OVERPASS_CONFIG.endpoint,
            query.query,
            {
              timeout: query.timeout,
              headers: {
                'Content-Type': 'text/plain',
                'User-Agent': 'TrailRouteGenerator/1.0'
              }
            }
          )
        } catch (primaryError) {
          console.log('Primary Overpass endpoint failed, trying alternative...')
          // Essayer l'endpoint alternatif
          response = await axios.post(
            OVERPASS_CONFIG.alternativeEndpoint,
            query.query,
            {
              timeout: query.timeout,
              headers: {
                'Content-Type': 'text/plain',
                'User-Agent': 'TrailRouteGenerator/1.0'
              }
            }
          )
        }

        console.log(`Overpass response status: ${response.status}`)
        console.log(`Overpass response elements: ${response.data.elements?.length || 0}`)

        if (response.data.elements.length === 0) {
          throw new Error(ERROR_MESSAGES.NO_PATHS_FOUND)
        }

        return response.data
      } catch (error) {
        console.error(`Overpass API error (attempt ${attempt}/${maxRetries}):`, error)
        
        if (axios.isAxiosError(error)) {
          console.error('Axios error details:', {
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          })
          
          // Si c'est la dernière tentative, lancer l'erreur
          if (attempt === maxRetries) {
            if (error.code === 'ECONNABORTED') {
              throw new Error(ERROR_MESSAGES.OVERPASS_TIMEOUT)
            }
            if (error.response?.status === 429) {
              throw new Error(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED)
            }
            throw new Error(ERROR_MESSAGES.NETWORK_ERROR)
          }
          
          // Sinon, attendre avant de réessayer
          console.log(`Waiting ${retryDelay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          // Pour les autres erreurs, lancer immédiatement
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR)
        }
      }
    }
    
    throw new Error(ERROR_MESSAGES.NETWORK_ERROR)
  }

  /**
   * Applique la limitation de taux
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < RATE_LIMITING.delayBetweenRequests) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMITING.delayBetweenRequests - timeSinceLastRequest)
      )
    }

    this.requestCount++
    this.lastRequestTime = Date.now()

    // Reset du compteur chaque minute
    if (this.requestCount >= RATE_LIMITING.requestsPerMinute) {
      await new Promise(resolve => setTimeout(resolve, 60000))
      this.requestCount = 0
    }
  }

  /**
   * Construit les tags de chemins selon les options
   */
  private buildPathTags(includeSecondary: boolean): string[] {
    const tags = [...RUNNING_PATH_TAGS.primary]
    
    if (includeSecondary) {
      tags.push(...RUNNING_PATH_TAGS.secondary)
    }
    
    return tags
  }

  /**
   * Transforme les données OSM en GeoJSON
   */
  private transformToGeoJSON(osmData: OSMResponse, area: SearchArea): GeoJSONCollection {
    const features: GeoJSONFeature[] = []
    
    // Séparer les ways et les nodes
    const ways = osmData.elements.filter((element): element is OSMWay => element.type === 'way')
    const nodes = osmData.elements.filter((element): element is OSMNode => element.type === 'node')
    
    // Créer un map des nodes pour accès rapide
    const nodeMap = new Map<number, OSMNode>()
    for (const node of nodes) {
      nodeMap.set(node.id, node)
    }

    console.log(`Found ${ways.length} ways and ${nodes.length} nodes`)

    for (const way of ways) {
      // Vérifier si la way a une géométrie directe
      if (way.geometry && way.geometry.coordinates && way.geometry.coordinates.length >= 2) {
        // Utiliser la géométrie directe
        const feature: GeoJSONFeature = this.createFeatureFromWay(way)
        features.push(feature)
      } else if (way.nodes && way.nodes.length >= 2) {
        // Construire la géométrie à partir des nœuds référencés
        const coordinates: [number, number][] = []
        for (const nodeId of way.nodes) {
          const node = nodeMap.get(nodeId)
          if (node) {
            coordinates.push([node.lon, node.lat])
          }
        }
        
        if (coordinates.length >= 2) {
          const wayWithGeometry: OSMWay = {
            ...way,
            geometry: {
              type: 'LineString',
              coordinates
            }
          }
          const feature: GeoJSONFeature = this.createFeatureFromWay(wayWithGeometry)
          features.push(feature)
        } else {
          console.log(`Skipping way ${way.id}: insufficient coordinates (${coordinates.length})`)
        }
      } else {
        console.log(`Skipping way ${way.id}: no geometry or nodes`)
      }
    }

    return {
      type: 'FeatureCollection',
      features,
      metadata: {
        totalFeatures: features.length,
        bounds: area,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Crée une feature GeoJSON à partir d'une way OSM
   */
  private createFeatureFromWay(way: OSMWay): GeoJSONFeature {
    return {
      type: 'Feature',
      geometry: way.geometry!,
      properties: {
        id: way.id,
        highway: way.tags.highway || 'unknown',
        surface: way.tags.surface,
        difficulty: this.calculateDifficulty(way.tags),
        length: this.calculateLength(way.geometry!.coordinates),
        name: way.tags.name,
        ref: way.tags.ref,
        access: way.tags.access,
        foot: way.tags.foot,
        bicycle: way.tags.bicycle,
        motor_vehicle: way.tags.motor_vehicle,
        width: way.tags.width,
        smoothness: way.tags.smoothness,
        tracktype: way.tags.tracktype,
        trail_visibility: way.tags.trail_visibility,
        osm_id: way.id
      }
    }
  }

  /**
   * Transforme les données d'élévation en GeoJSON
   */
  private transformElevationToGeoJSON(osmData: OSMResponse): GeoJSONFeature[] {
    const features: GeoJSONFeature[] = []
    const elements = osmData.elements.filter(element => 
      element.type === 'node' && 'lat' in element
    ) as OSMNode[]

    for (const node of elements) {
      const feature: GeoJSONFeature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[node.lon, node.lat]]
        },
        properties: {
          id: node.id,
          highway: 'elevation_point',
          elevation: node.tags?.ele ? parseFloat(node.tags.ele) : undefined,
          name: node.tags?.name,
          natural: node.tags?.natural,
          osm_id: node.id
        }
      }
      features.push(feature)
    }

    return features
  }

  /**
   * Transforme les POI en GeoJSON
   */
  private transformPOIToGeoJSON(osmData: OSMResponse): GeoJSONFeature[] {
    const features: GeoJSONFeature[] = []
    const nodes = osmData.elements.filter((element): element is OSMNode => 
      element.type === 'node' && 'lat' in element
    )

    for (const node of nodes) {
      const feature: GeoJSONFeature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[node.lon, node.lat]]
        },
        properties: {
          id: node.id,
          highway: 'poi',
          name: node.tags?.name,
          amenity: node.tags?.amenity,
          tourism: node.tags?.tourism,
          natural: node.tags?.natural,
          leisure: node.tags?.leisure,
          historic: node.tags?.historic,
          osm_id: node.id
        }
      }
      features.push(feature)
    }

    return features
  }

  /**
   * Filtre les features selon les options
   */
  private filterFeatures(
    features: GeoJSONFeature[], 
    options: {
      surfaceTypes?: string[]
      difficulty?: string[]
      maxLength?: number
    }
  ): GeoJSONFeature[] {
    return features.filter(feature => {
      // Filtre par type de surface
      if (options.surfaceTypes && feature.properties.surface) {
        if (!options.surfaceTypes.includes(feature.properties.surface)) {
          return false
        }
      }

      // Filtre par difficulté
      if (options.difficulty && feature.properties.difficulty) {
        if (!options.difficulty.includes(feature.properties.difficulty)) {
          return false
        }
      }

      // Filtre par longueur maximale
      if (options.maxLength && feature.properties.length) {
        if (feature.properties.length > options.maxLength) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Calcule la difficulté d'un chemin basée sur ses tags
   */
  private calculateDifficulty(tags: Record<string, string>): 'easy' | 'medium' | 'hard' {
    const surface = tags.surface
    const tracktype = tags.tracktype
    const smoothness = tags.smoothness

    // Logique de calcul de difficulté basée sur les tags OSM
    if (surface === 'asphalt' || surface === 'concrete') {
      return 'easy'
    }
    
    if (surface === 'gravel' || surface === 'dirt' || tracktype === 'grade1') {
      return 'medium'
    }
    
    if (surface === 'grass' || surface === 'sand' || tracktype === 'grade3') {
      return 'hard'
    }

    return 'medium' // Par défaut
  }

  /**
   * Calcule la longueur d'un chemin en kilomètres
   */
  private calculateLength(coordinates: [number, number][]): number {
    let totalLength = 0
    
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1]
      const [lon2, lat2] = coordinates[i]
      
      // Formule de Haversine pour calculer la distance
      const R = 6371 // Rayon de la Terre en km
      const dLat = this.toRadians(lat2 - lat1)
      const dLon = this.toRadians(lon2 - lon1)
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c
      
      totalLength += distance
    }
    
    return totalLength
  }

  /**
   * Convertit les degrés en radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

/**
 * Instance singleton du service OSM
 */
export const osmService = new OSMService()

/**
 * Fonctions utilitaires pour l'utilisation du service
 */
export const osmUtils = {
  /**
   * Crée une zone de recherche autour d'un point
   */
  createSearchArea: (
    latitude: number, 
    longitude: number, 
    radiusKm: number = 1
  ): SearchArea => {
    const latOffset = radiusKm / 111 // Approximation : 1° ≈ 111km
    const lonOffset = radiusKm / (111 * Math.cos(latitude * Math.PI / 180))
    
    return {
      north: latitude + latOffset,
      south: latitude - latOffset,
      east: longitude + lonOffset,
      west: longitude - lonOffset
    }
  },

  /**
   * Valide des coordonnées géographiques
   */
  validateCoordinates: (lat: number, lon: number): boolean => {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  },

  /**
   * Calcule le centre d'une zone de recherche
   */
  getAreaCenter: (area: SearchArea): { lat: number; lon: number } => {
    return {
      lat: (area.north + area.south) / 2,
      lon: (area.east + area.west) / 2
    }
  }
}
