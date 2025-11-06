import express from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { osrmService } from '../services/osrm-service.js'
import { RouteGenerationRequest, RouteGenerationResponse } from '@trail-route-generator/shared/types'
import { buildGraph, validateGraph } from '../services/graph-builder.js'
import { generateLoops } from '../algorithms/loop-generator.js'
import * as GraphCache from '../services/graph-cache.js'
import { osmService } from '../services/osm-service.js'
import { routingService } from '../services/routing-service.js'
import { ensureOSMFormat, detectFormat } from '../utils/format-adapter.js'
import { getElevations, calculateElevationGain } from '../services/elevation-service.js'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const waypointSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  type: z.enum(['start', 'end', 'waypoint']),
  description: z.string().optional()
})

const createRouteSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  distance: z.number().positive('La distance doit être positive'),
  duration: z.number().positive('La durée doit être positive'),
  elevation: z.number().min(0, 'L\'élévation ne peut pas être négative'),
  waypoints: z.array(waypointSchema).min(2, 'Au moins 2 points sont requis')
})

const updateRouteSchema = createRouteSchema.partial()

// Calculate route between two points
const calculateRouteSchema = z.object({
  start: z.array(z.number()).length(2, 'Point de départ requis [longitude, latitude]'),
  end: z.array(z.number()).length(2, 'Point d\'arrivée requis [longitude, latitude]'),
  profile: z.enum(['foot', 'bike']).optional().default('foot'),
  alternatives: z.boolean().optional().default(false)
})

// Get all routes
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      difficulty, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    
    if (difficulty) {
      where.difficulty = difficulty
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          },
          waypoints: true,
          _count: {
            select: {
              reviews: true
            }
          }
        }
      }),
      prisma.route.count({ where })
    ])

    res.json({
      routes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get routes error:', error)
    res.status(500).json({
      error: 'Erreur lors du chargement des itinéraires'
    })
  }
})

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        waypoints: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    })

    if (!route) {
      return res.status(404).json({
        error: 'Itinéraire non trouvé'
      })
    }

    // Calculate average rating
    const averageRating = route.reviews.length > 0 
      ? route.reviews.reduce((sum, review) => sum + review.rating, 0) / route.reviews.length
      : 0

    res.json({
      ...route,
      averageRating,
      reviewCount: route._count.reviews
    })
  } catch (error) {
    console.error('Get route error:', error)
    res.status(500).json({
      error: 'Erreur lors du chargement de l\'itinéraire'
    })
  }
})

// Create route
router.post('/', async (req, res) => {
  try {
    const data = createRouteSchema.parse(req.body)
    const userId = req.headers['user-id'] as string // À implémenter avec middleware d'auth

    if (!userId) {
      return res.status(401).json({
        error: 'Authentification requise'
      })
    }

    const route = await prisma.route.create({
      data: {
        ...data,
        userId,
        waypoints: {
          create: data.waypoints.map(waypoint => ({
            ...waypoint,
            location: {
              type: 'Point',
              coordinates: [waypoint.longitude, waypoint.latitude]
            }
          }))
        }
      },
      include: {
        waypoints: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.status(201).json({
      message: 'Itinéraire créé avec succès',
      route
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      })
    }

    console.error('Create route error:', error)
    res.status(500).json({
      error: 'Erreur lors de la création de l\'itinéraire'
    })
  }
})

// Update route
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = updateRouteSchema.parse(req.body)
    const userId = req.headers['user-id'] as string // À implémenter avec middleware d'auth

    if (!userId) {
      return res.status(401).json({
        error: 'Authentification requise'
      })
    }

    // Check if user owns the route
    const existingRoute = await prisma.route.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existingRoute || existingRoute.userId !== userId) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas modifier cet itinéraire'
      })
    }

    const updateData: any = { ...data }
    
    if (data.waypoints) {
      // Delete existing waypoints and create new ones
      await prisma.waypoint.deleteMany({
        where: { routeId: id }
      })
      
      updateData.waypoints = {
        create: data.waypoints.map(waypoint => ({
          ...waypoint,
          location: {
            type: 'Point',
            coordinates: [waypoint.longitude, waypoint.latitude]
          }
        }))
      }
    }

    const route = await prisma.route.update({
      where: { id },
      data: updateData,
      include: {
        waypoints: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.json({
      message: 'Itinéraire mis à jour avec succès',
      route
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      })
    }

    console.error('Update route error:', error)
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de l\'itinéraire'
    })
  }
})

// Delete route
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['user-id'] as string // À implémenter avec middleware d'auth

    if (!userId) {
      return res.status(401).json({
        error: 'Authentification requise'
      })
    }

    // Check if user owns the route
    const existingRoute = await prisma.route.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existingRoute || existingRoute.userId !== userId) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas supprimer cet itinéraire'
      })
    }

    await prisma.route.delete({
      where: { id }
    })

    res.json({
      message: 'Itinéraire supprimé avec succès'
    })
  } catch (error) {
    console.error('Delete route error:', error)
    res.status(500).json({
      error: 'Erreur lors de la suppression de l\'itinéraire'
    })
  }
})

// POST /api/routes/generate - Génération de routes via OSRM
router.post('/generate', async (req, res) => {
  const startTime = Date.now()
  try {
    const {
      start_lat,
      start_lon,
      distance,
      difficulty,
      terrain_type,
      pace // Pace en min/km (ex: 5 pour 5 min/km)
    } = req.body

    if (!start_lat || !start_lon || !distance) {
      return res.status(400).json({ error: 'Missing required fields: start_lat, start_lon, distance' })
    }
    if (distance < 1 || distance > 50) {
      return res.status(400).json({ error: 'Distance must be between 1 and 50 km' })
    }
    console.log(`🎯 Route generation request:`)
    console.log(`   - Location: ${start_lat}, ${start_lon}`)
    console.log(`   - Distance: ${distance} km`)
    console.log(`   - Pace: ${pace || 'N/A'} min/km`)
    console.log(`   - Difficulty: ${difficulty || 'any'}`)
    console.log(`   - Terrain: ${terrain_type || 'any'}`)

    try {
      const radius = Math.max(distance * 0.6, 2)
      console.log(`📊 Loading OSM graph (radius: ${radius.toFixed(1)} km)...`)
      const cacheKey = GraphCache.hashArea(start_lat, start_lon, radius)
      let cached = await GraphCache.loadGraph(cacheKey)
      let graph = cached ? cached.graph : null;
      // Correction : si le cache a désérialisé en objet brut, retransformer en Map
      if(graph && !(graph.edges instanceof Map)) {
        graph.edges = new Map(Object.entries(graph.edges));
      }
      if(graph && !(graph.nodes instanceof Map)) {
        graph.nodes = new Map(Object.entries(graph.nodes));
      }
      if (!graph || graph.nodes.size === 0 || graph.edges.size === 0) {
        if (graph && (graph.nodes.size === 0 || graph.edges.size === 0)) {
          console.warn(`   ⚠️  Cache contains empty graph (nodes=${graph.nodes.size}, edges=${graph.edges.size}) - rebuilding...`)
          graph = null
        }
        if (!graph) {
          console.log('   Cache MISS - Building from OSM...')
          // Utiliser le service OSM enrichi
          const osmData = await osmService.getRunningPaths(
            {
              north: start_lat + radius / 111,
              south: start_lat - radius / 111,
              east: start_lon + radius / (111 * Math.cos(start_lat * Math.PI / 180)),
              west: start_lon - radius / (111 * Math.cos(start_lat * Math.PI / 180)),
            },
            { includeSecondary: true }
          )
          const safeOsmData = ensureOSMFormat(osmData)
          graph = buildGraph(safeOsmData)
          
          // Ne sauvegarder que si le graphe n'est pas vide
          if (graph.nodes.size > 0 && graph.edges.size > 0) {
            await GraphCache.saveGraph(cacheKey, {
              area: { lat: start_lat, lon: start_lon, radius },
              graph,
              osmDataVersion: 'unknown',
              createdAt: new Date().toISOString(),
              nodesCount: graph.nodes.size,
              edgesCount: graph.edges.size
            })
            console.log(`   ✅ Graph cached (${graph.nodes.size} nodes, ${graph.edges.size} edges)`)
          } else {
            console.warn(`   ⚠️  Empty graph generated (nodes=${graph.nodes.size}, edges=${graph.edges.size}) - NOT cached`)
            throw new Error(`No OSM data found in area (${start_lat}, ${start_lon}) with radius ${radius}km. Please try a different location.`)
          }
        }
      } else {
        console.log(`   Cache HIT - Graph loaded from cache (${graph.nodes.size} nodes, ${graph.edges.size} edges)`)
      }

      // Valider graphe
      const validation = validateGraph(graph)
      if (!validation.valid) {
        console.error(`❌ Invalid graph:`, validation.errors)
        throw new Error('Graph validation failed: ' + validation.errors.join(', '))
      }
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn(`⚠️  Graph warnings:`, validation.warnings)
      } else if (!validation.warnings) {
        console.warn('[routes.ts] validation.warnings absent ou undefined:', validation)
      }
      console.log(`✅ Graph validated: nodes=${graph.nodes.size}, edges=${graph.edges.size}`)
      // Trouver le nœud le plus proche du point de départ
      const { findClosestNodeWithConnections } = await import('../algorithms/loop-generator.js');
      // Chercher un nœud avec au moins 3 connexions dans un rayon de 500m
      let closestNodeId = findClosestNodeWithConnections(graph, start_lat, start_lon, 3);
      
      // Si aucun nœud avec 3+ connexions n'est trouvé, chercher avec 2 connexions
      if (!closestNodeId) {
        closestNodeId = findClosestNodeWithConnections(graph, start_lat, start_lon, 2);
      }
      
      // Si toujours rien, utiliser le nœud le plus proche
      if (!closestNodeId) {
        const { findClosestNode } = await import('../algorithms/loop-generator.js');
        closestNodeId = findClosestNode(graph, start_lat, start_lon);
      }
      
      if (!closestNodeId) {
        throw new Error(`No nodes found in graph near location (${start_lat}, ${start_lon})`);
      }
      
      const startNode = graph.nodes.get(closestNodeId);
      if (startNode) {
        console.log(`📍 Starting from node ${closestNodeId} at (${startNode.lat.toFixed(6)}, ${startNode.lon.toFixed(6)})`)
        
        // Vérifier que le nœud a des connexions
        const connections = graph.edges ? Array.from(graph.edges.values()).filter(e => 
          e.from === closestNodeId || e.to === closestNodeId
        ).length : 0;
        console.log(`   🔗 Node connections: ${connections} edges`);
        
        if (connections === 0) {
          return res.status(400).json({
            success: false,
            error: 'Point de départ isolé',
            message: 'Le point de départ n\'a aucune connexion dans le graphe. Essayez un autre emplacement.',
            timing: Date.now() - startTime
          });
        }
      }
      
      // Générer les boucles
      console.log(`🔄 Generating loops...`)
      const { loops, debug } = generateLoops(graph, {
        startNodeId: closestNodeId,
        targetDistance: distance * 1000,
        numVariants: 1, // Une seule boucle
        minReturnAngleDeg: 90,
        scoring: { distance: 0.4, angle: 0.3, quality: 0.2, diversity: 0.1 },
        debug: true
      })
      
      console.log(`✅ Generated ${loops.length} loop(s)`)
      if (loops.length > 0) {
        loops.forEach((loop, i) => {
          console.log(`   Loop ${i + 1}: ${(loop.distance / 1000).toFixed(2)}km, ${loop.loop.length} nodes, quality=${loop.qualityScore.toFixed(1)}`)
        })
      } else {
        console.warn('⚠️  No loops generated')
        console.warn(`   Debug info:`, {
          candidatesCount: debug.candidates?.length || 0,
          warnings: debug.warnings || [],
          exploredNodes: debug.stats?.exploredNodes || 0,
          timings: debug.timings || {}
        })
      }
      
      // Si aucune boucle n'a été générée, retourner une erreur explicite
      if (loops.length === 0) {
        const totalTime = Date.now() - startTime
        console.error('❌ Aucune boucle générée. Debug:', JSON.stringify(debug, null, 2))
        return res.status(400).json({
          success: false,
          error: 'Impossible de générer une boucle avec les paramètres donnés',
          message: 'L\'algorithme n\'a pas pu trouver de chemin suffisamment long dans cette zone. Essayez une distance plus courte ou une autre position.',
          debug: {
            candidatesCount: debug.candidates?.length || 0,
            warnings: debug.warnings || [],
            exploredNodes: debug.stats?.exploredNodes || 0,
            timings: debug.timings || {}
          },
          timing: totalTime
        })
      }
      
      const totalTime = Date.now() - startTime
      
      // Traiter les boucles avec await (on ne peut pas utiliser await dans map)
      const processedRoutes: any[] = [];
      
      if (loops.length === 0) {
        // Déjà vérifié plus haut, mais sécurité supplémentaire
        return res.status(400).json({
          success: false,
          error: 'Aucune boucle générée',
          message: 'L\'algorithme n\'a pas pu trouver de chemin dans cette zone.',
          timing: totalTime
        });
      }
      
      // CORRECTION : Limiter à 3 boucles au lieu de 5
      const topLoops = loops.slice(0, 3);
      console.log(`\n📊 Processing ${topLoops.length} loops (from ${loops.length} total, top 3)`);
      
      for (const loop of topLoops) {
          // CORRECTION : Construire les coordonnées depuis les nœuds du loop
          // IMPORTANT : S'assurer que TOUTES les coordonnées sont extraites
          const coordinates = Array.isArray(loop.loop) && loop.loop.length >= 2
            ? loop.loop.map(lid => {
                const n = graph.nodes.get(lid);
                if (!n) {
                  console.warn(`   ⚠️  Node ${lid} not found in graph!`);
                  return undefined;
                }
                return [n.lon, n.lat] as [number, number];
              }).filter((coord): coord is [number, number] => coord !== undefined)
            : []
          
          console.log(`   📍 Loop ${loop.loop?.length || 0} nodes → ${coordinates.length} coordinates`);
          
          // Vérification de sécurité
          if (!coordinates || coordinates.length === 0) {
            console.error(`   ❌ ERROR: Loop has no coordinates!`);
            console.error(`      Loop nodes: ${loop.loop?.length || 0}`);
            console.error(`      Loop structure:`, JSON.stringify(loop).substring(0, 200));
          }
          
          if (coordinates.length !== loop.loop?.length) {
            console.warn(`   ⚠️  Mismatch: ${loop.loop?.length || 0} nodes but ${coordinates.length} coordinates`);
          }
          
          // Recalculer la distance totale depuis les coordonnées réelles (plus fiable)
          let totalDistance = 0;
          if (coordinates.length >= 2) {
            // Utiliser la fonction haversine pour calculer la distance réelle entre les points
            const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
              const R = 6371000; // Rayon de la Terre en mètres
              const toRad = (x: number) => x * Math.PI / 180;
              const dLat = toRad(lat2 - lat1);
              const dLon = toRad(lon2 - lon1);
              const a = Math.sin(dLat / 2) ** 2 + 
                        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
              return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };
            
            // Somme des distances entre points consécutifs
            for (let i = 0; i < coordinates.length - 1; i++) {
              const [lon1, lat1] = coordinates[i];
              const [lon2, lat2] = coordinates[i + 1];
              // Vérifier que les coordonnées sont valides (lat entre -90 et 90, lon entre -180 et 180)
              if (lat1 >= -90 && lat1 <= 90 && lat2 >= -90 && lat2 <= 90 &&
                  lon1 >= -180 && lon1 <= 180 && lon2 >= -180 && lon2 <= 180) {
                totalDistance += haversine(lat1, lon1, lat2, lon2);
              }
            }
          }
          
          // Si le calcul depuis les coordonnées échoue, utiliser les edges
          if (totalDistance === 0 && loop.pathEdges && loop.pathEdges.length > 0) {
            for (const edgeId of loop.pathEdges) {
              const edge = graph.edges.get(edgeId);
              if (edge) {
                totalDistance += edge.distance;
              }
            }
          }
          
          // Utiliser la distance calculée ou celle du loop
          const finalDistance = totalDistance > 0 ? totalDistance : loop.distance;
          
          // Debug: log pour vérifier (avec premiers points pour détecter inversion lat/lon)
          const firstCoord = coordinates.length > 0 ? coordinates[0] : null;
          const lastCoord = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null;
          console.log(`   🔍 Distance check: calculated=${(totalDistance / 1000).toFixed(3)}km, loop.distance=${(loop.distance / 1000).toFixed(3)}km, final=${(finalDistance / 1000).toFixed(3)}km`)
          console.log(`   🔍 Coords: first=[${firstCoord ? `${firstCoord[0].toFixed(6)}, ${firstCoord[1].toFixed(6)}` : 'N/A'}], last=[${lastCoord ? `${lastCoord[0].toFixed(6)}, ${lastCoord[1].toFixed(6)}` : 'N/A'}], count=${coordinates.length}`)
          console.log(`   🔍 Path edges count: ${loop.pathEdges?.length || 0}`)
          console.log(`   📤 Sending ${coordinates.length} coordinates to frontend`)
          
          // Vérifier qu'il n'y a pas de duplication d'edges
          if (loop.pathEdges) {
            const uniqueEdges = new Set(loop.pathEdges);
            if (uniqueEdges.size !== loop.pathEdges.length) {
              console.warn(`   ⚠️  Duplicate edges detected: ${loop.pathEdges.length} total, ${uniqueEdges.size} unique`);
            }
          }
          
          // Analyser les surfaces utilisées dans le parcours
          const surfaceStats: Record<string, number> = {}; // surface -> distance en mètres
          let totalSurfaceDistance = 0;
          
          if (loop.pathEdges) {
            for (const edgeId of loop.pathEdges) {
              const edge = graph.edges.get(edgeId);
              if (edge) {
                // Déterminer le type de surface
                let surfaceType = 'unknown';
                if (edge.surface) {
                  // Normaliser les surfaces OSM
                  const surface = edge.surface.toLowerCase();
                  if (surface.includes('asphalt') || surface.includes('paved') || surface.includes('concrete')) {
                    surfaceType = 'paved';
                  } else if (surface.includes('unpaved') || surface.includes('dirt') || surface.includes('gravel') || surface.includes('earth') || surface.includes('grass')) {
                    surfaceType = 'unpaved';
                  } else {
                    surfaceType = 'unpaved'; // Par défaut
                  }
                } else if (edge.tags?.highway) {
                  // Déduire du type de route
                  const highway = edge.tags.highway.toLowerCase();
                  if (['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'service'].includes(highway)) {
                    surfaceType = 'paved';
                  } else {
                    surfaceType = 'unpaved';
                  }
                } else {
                  surfaceType = 'unpaved'; // Par défaut
                }
                
                surfaceStats[surfaceType] = (surfaceStats[surfaceType] || 0) + edge.distance;
                totalSurfaceDistance += edge.distance;
              }
            }
          }
          
          // Calculer les pourcentages de surface
          const surfaceBreakdown: Array<{ type: string; distance: number; percentage: number }> = [];
          for (const [type, distance] of Object.entries(surfaceStats)) {
            surfaceBreakdown.push({
              type,
              distance,
              percentage: totalSurfaceDistance > 0 ? (distance / totalSurfaceDistance) * 100 : 0
            });
          }
          surfaceBreakdown.sort((a, b) => b.percentage - a.percentage);
          
          // Convertir la distance en kilomètres pour correspondre au type Route (distance in kilometers)
          const distanceInKm = finalDistance / 1000;
          
          // Récupérer les altitudes réelles depuis l'API d'élévation
          let elevations: number[] = [];
          let elevationGain = 0;
          let elevationProfile: Array<{ distance: number; elevation: number; coordinate: [number, number] }> = [];
          
          if (coordinates.length > 1) {
            // Échantillonner les coordonnées pour éviter trop de requêtes (1 point tous les ~50m)
            const sampleInterval = Math.max(1, Math.floor(coordinates.length / 100)); // Max 100 points
            const sampledCoordinates: [number, number][] = [];
            
            for (let i = 0; i < coordinates.length; i += sampleInterval) {
              sampledCoordinates.push(coordinates[i]);
            }
            
            // Toujours inclure le dernier point si différent
            const lastSampled = sampledCoordinates[sampledCoordinates.length - 1];
            const lastOriginal = coordinates[coordinates.length - 1];
            if (lastSampled && lastOriginal && 
                (lastSampled[0] !== lastOriginal[0] || lastSampled[1] !== lastOriginal[1])) {
              sampledCoordinates.push(lastOriginal);
            }
            
            console.log(`   📍 Récupération des altitudes pour ${sampledCoordinates.length} points (échantillonnage sur ${coordinates.length})...`);
            
            try {
              // Récupérer les altitudes depuis l'API avec timeout
              const elevationPromise = getElevations(sampledCoordinates);
              const timeoutPromise = new Promise<number[]>((resolve) => {
                setTimeout(() => {
                  console.warn('   ⚠️  Timeout lors de la récupération des altitudes, utilisation de valeurs par défaut');
                  resolve([]);
                }, 8000); // Timeout de 8 secondes
              });
              
              elevations = await Promise.race([elevationPromise, timeoutPromise]);
              
              if (elevations.length > 0 && elevations.length === sampledCoordinates.length) {
                // Log des premières altitudes pour debug
                const firstFew = elevations.slice(0, Math.min(5, elevations.length));
                console.log(`   📊 Premières altitudes: ${firstFew.map(e => e.toFixed(1)).join(', ')}m`);
                
                // Calculer le dénivelé cumulé positif
                elevationGain = calculateElevationGain(elevations);
                
                // Créer le profil d'élévation avec les distances réelles
                elevationProfile = sampledCoordinates.map((coord, index) => {
                  const progress = index / Math.max(1, sampledCoordinates.length - 1);
                  return {
                    distance: progress * distanceInKm,
                    elevation: Math.round(elevations[index] || 150),
                    coordinate: coord
                  };
                });
                
                const minElev = Math.min(...elevations);
                const maxElev = Math.max(...elevations);
                console.log(`   ✅ Altitudes récupérées: ${elevations.length} points, min=${minElev.toFixed(1)}m, max=${maxElev.toFixed(1)}m, dénivelé=${elevationGain}m`);
              } else {
                console.warn(`   ⚠️  Aucune altitude récupérée ou nombre incorrect (${elevations.length} vs ${sampledCoordinates.length}), utilisation de valeurs par défaut`);
                elevationGain = 0;
                // Créer un profil minimal avec altitudes par défaut
                elevationProfile = sampledCoordinates.map((coord, index) => {
                  const progress = index / Math.max(1, sampledCoordinates.length - 1);
                  return {
                    distance: progress * distanceInKm,
                    elevation: 150, // Altitude par défaut
                    coordinate: coord
                  };
                });
              }
            } catch (error) {
              console.error('   ❌ Erreur lors de la récupération des altitudes:', error);
              elevationGain = 0;
              // Créer un profil minimal avec altitudes par défaut en cas d'erreur
              elevationProfile = sampledCoordinates.length > 0 ? sampledCoordinates.map((coord, index) => {
                const progress = index / Math.max(1, sampledCoordinates.length - 1);
                return {
                  distance: progress * distanceInKm,
                  elevation: 150, // Altitude par défaut
                  coordinate: coord
                };
              }) : [];
            }
          }
          
          // Calculer la durée estimée en utilisant le pace (min/km)
          // Si pace = 5 min/km, alors vitesse = 60/5 = 12 km/h
          // Distance en mètres, donc durée = (distance_m / 1000) * pace_min_per_km
          const paceMinPerKm = pace && pace > 0 ? pace : 5; // Par défaut 5 min/km si non spécifié
          const speedKmh = 60 / paceMinPerKm; // Convertir min/km en km/h
          const speedMs = speedKmh / 3.6; // Convertir km/h en m/s
          
          // Durée en minutes = distance (km) * pace (min/km)
          const durationMinutes = Math.round(distanceInKm * paceMinPerKm);
          
          // Vitesse moyenne (en km/h)
          const averageSpeed = speedKmh;
          
          console.log(`   📊 Loop stats: distance=${distanceInKm.toFixed(2)}km, duration=${durationMinutes}min, elevation=${elevationGain.toFixed(0)}m`)
          
          const now = new Date().toISOString();
          const route = {
            id: `custom_0_${Date.now()}`,
            name: `Boucle de ${distanceInKm.toFixed(1)} km`,
            distance: distanceInKm, // Distance en kilomètres (comme spécifié dans le type Route)
            duration: durationMinutes, // Durée en minutes
            elevation: Math.round(elevationGain), // Dénivelé en mètres (réel depuis l'API)
            difficulty: 'medium' as const, // Difficulté par défaut
            terrain_type: (surfaceBreakdown.length > 0 && surfaceBreakdown[0].type === 'paved') 
              ? 'paved' as const 
              : surfaceBreakdown.length > 1 
                ? 'mixed' as const 
                : 'unpaved' as const,
            created_at: now,
            updated_at: now,
            average_speed: parseFloat(averageSpeed.toFixed(1)), // Vitesse moyenne en km/h
            geometry: {
              type: 'LineString' as const,
              coordinates: coordinates // IMPORTANT : TOUTES les coordonnées ici (pas seulement waypoints)
            },
            waypoints: coordinates.length > 0 ? [
              { 
                lat: coordinates[0][1], 
                lon: coordinates[0][0], 
                type: 'start',
                name: 'Départ'
              },
              { 
                lat: coordinates[coordinates.length - 1][1], 
                lon: coordinates[coordinates.length - 1][0], 
                type: 'end',
                name: 'Arrivée'
              }
            ] : [],
            quality_score: Math.min(1.0, Math.max(0, loop.qualityScore || 0)), // CORRECTION : Limiter entre 0-1
            pathEdges: loop.pathEdges || [],
            surface_breakdown: surfaceBreakdown, // Nouvelle information de surface
            elevation_profile: elevationProfile.length > 0 ? elevationProfile : [],
            debug: loop.debug
          };
        
        processedRoutes.push(route);
      }
      
      // Log final pour vérifier les coordonnées
      console.log(`\n📤 Sending ${processedRoutes.length} route(s) to frontend:`);
      processedRoutes.forEach((route, index) => {
        const coordCount = route.geometry?.coordinates?.length || 0;
        const waypointsCount = route.waypoints?.length || 0;
        console.log(`   Route ${index + 1}: ${coordCount} coordinates, ${waypointsCount} waypoints, ${route.distance?.toFixed(2)}km, quality=${route.quality_score?.toFixed(2) || 'N/A'}`);
        
        // Vérification critique : s'assurer que geometry.coordinates contient bien toutes les coordonnées
        if (coordCount === 0) {
          console.error(`   ❌ CRITICAL: Route ${index + 1} has NO coordinates in geometry!`);
        } else if (coordCount < 10) {
          console.warn(`   ⚠️  Route ${index + 1} has only ${coordCount} coordinates (expected more)`);
        }
        
        // Log des premières et dernières coordonnées pour vérification
        if (coordCount > 0) {
          const first = route.geometry?.coordinates?.[0];
          const last = route.geometry?.coordinates?.[coordCount - 1];
          console.log(`      First coord: [${first?.[0]?.toFixed(6)}, ${first?.[1]?.toFixed(6)}]`);
          console.log(`      Last coord: [${last?.[0]?.toFixed(6)}, ${last?.[1]?.toFixed(6)}]`);
        }
      });
      
      return res.json({
        success: true,
        method: 'custom_algorithm',
        routes: processedRoutes,
        debug: {
          ...debug,
          routes_sent: processedRoutes.length,
          coordinates_per_route: processedRoutes.map(r => r.geometry?.coordinates?.length || 0)
        },
        timing: totalTime
      });
    } catch (customError) {
      console.error('❌ Erreur dans la génération de boucles:', customError);
      const errorMessage = customError instanceof Error ? customError.message : String(customError);
      const errorStack = customError instanceof Error ? customError.stack : undefined;
      console.error('Stack trace:', errorStack);
      return res.status(500).json({ 
        error: "Erreur dans l'algorithme de génération de boucles (custom)", 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      });
    }
  } catch (error) {
    console.error('Generate route error:', error)
    res.status(500).json({
      error: 'Erreur lors de la génération de l\'itinéraire'
    })
  }
})

export default router