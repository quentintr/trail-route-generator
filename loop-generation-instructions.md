# Loop Generation Algorithm - Detailed Instructions

## Objective
Generate running/trail loops that:
- Start and end at the same point
- Match target distance (±5%)
- Avoid simple out-and-back routes
- Use real paths from OpenStreetMap
- Prioritize safe, runnable surfaces

## Algorithm Overview

### Method: Radial Exploration with Smart Return

1. **Extract local graph**
   - Query OSM for walkable/runnable paths within calculated radius
   - Radius = sqrt(target_distance² / π) × 1.5 (to have margin)
   - Build weighted graph with nodes and edges

2. **Graph filtering**
   - Include: footway, path, track, cycleway, residential, living_street
   - Exclude: motorway, trunk, primary (unless sidewalk present)
   - Weight edges based on:
     * Distance (primary)
     * Surface quality (+20% weight for paved vs unpaved)
     * Popularity from Strava heatmap if available (+10% for popular paths)
     * Safety score based on road type (-50% for major roads)

3. **Exploration phase**
   - Use modified Dijkstra from start point
   - Target: reach 45-55% of desired distance
   - Prefer paths that diverge from start direction (avoid immediate return)
   - Score candidate points based on:
     * Distance from start (should be ~50% of target)
     * Angular diversity (prefer points in different directions)
     * Path quality

4. **Return phase**
   - From best candidate point, calculate return route
   - Use A* algorithm to return to start
   - Constraint: penalize edges already used in exploration phase (×5 weight)
   - This ensures different paths on return

5. **Loop completion**
   - Combine exploration + return paths
   - If distance < target: add small detour near start/end
   - If distance > target: use shortcuts if available
   - Optimize with 2-opt algorithm to reduce crossings

6. **Quality scoring**
   - Score = 0.4×distance_accuracy + 0.3×path_uniqueness + 0.2×surface_quality + 0.1×scenery_variety
   - Generate 3-5 variants with different parameters
   - Return top variants sorted by score

## Edge Cases
- If no valid loop found: return error with reason
- If area has insufficient paths: suggest minimum distance possible
- If start point is isolated: find nearest accessible point

## Data Structures

```typescript
interface GraphNode {
  id: string;
  lat: number;
  lon: number;
  connections: string[]; // IDs of connected nodes
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  distance: number; // meters
  surface: 'paved' | 'unpaved' | 'mixed';
  highway_type: string;
  weight: number; // calculated weight for pathfinding
}

interface RouteSegment {
  nodes: string[];
  distance: number;
  duration: number; // seconds
  elevation_gain: number;
  surface_types: Record<string, number>; // percentage of each surface
}

interface GeneratedLoop {
  id: string;
  segments: RouteSegment[];
  total_distance: number;
  total_duration: number;
  total_elevation: number;
  quality_score: number;
  geometry: GeoJSON.LineString;
}
```

## Implementation Notes
- Use efficient graph structures (adjacency lists)
- Cache OSM data per geographic area
- Limit graph size to avoid performance issues (max 10km radius)
- Use priority queue for Dijkstra/A*
- Consider using Web Workers for heavy computation
```