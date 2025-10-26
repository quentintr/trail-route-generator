# Loop Generation Algorithm - Documentation

## 🎯 Overview

The Loop Generation Algorithm implements the radial exploration method for generating running/trail loops as specified in `loop-generation-instructions.md`. It creates multiple loop variants that start and end at the same point, match target distance within tolerance, and avoid simple out-and-back routes.

## 🏗️ Architecture

### Core Components

1. **Graph Builder** (`src/services/graph-builder.ts`)
   - Builds weighted graphs from OSM data
   - Implements intelligent filtering and weighting
   - Optimizes graph structure for performance

2. **Pathfinding Algorithms** (`src/algorithms/pathfinding.ts`)
   - Dijkstra's algorithm for exploration phase
   - A* algorithm for return path optimization
   - Custom weight functions for edge avoidance

3. **Loop Generator** (`src/algorithms/loop-generator.ts`)
   - Main algorithm implementation
   - Radial exploration with smart return
   - Quality scoring and optimization

4. **Geographic Utils** (`src/utils/geo-utils.ts`)
   - Haversine distance calculations
   - Bearing and angular diversity
   - Surface quality metrics

5. **Performance Utils** (`src/utils/performance-utils.ts`)
   - LRU caching and memoization
   - Performance monitoring
   - Memory optimization

## 🚀 Usage

### Basic Usage

```typescript
import { LoopGenerator, LoopGenerationOptions } from './algorithms/loop-generator'

const options: LoopGenerationOptions = {
  targetDistance: 10000, // 10km in meters
  startLat: 48.8566,     // Paris latitude
  startLon: 2.3522,      // Paris longitude
  tolerance: 0.05,       // 5% tolerance
  maxVariants: 5,        // Generate 5 variants
  includeSecondary: true // Include secondary paths
}

const generator = new LoopGenerator(options)
const result = await generator.generateLoops()

if (result.success) {
  console.log(`Generated ${result.loops.length} loop variants`)
  result.loops.forEach((loop, index) => {
    console.log(`Loop ${index + 1}: ${(loop.total_distance / 1000).toFixed(2)}km`)
  })
}
```

### Advanced Usage

```typescript
import { LoopGenerator } from './algorithms/loop-generator'
import { PerformanceManager } from './utils/performance-utils'

// Create performance manager
const performanceManager = new PerformanceManager({
  maxCacheSize: 1000,
  maxNodes: 10000,
  timeoutMs: 3000
})

// Generate loops with performance monitoring
const generator = new LoopGenerator(options)
performanceManager.getMetrics().startTimer('loop_generation')

const result = await generator.generateLoops()

const generationTime = performanceManager.getMetrics().stopTimer('loop_generation')
console.log(`Generated in ${generationTime}ms`)

// Check performance
if (!performanceManager.isPerformanceAcceptable()) {
  performanceManager.optimizeForPerformance()
}
```

## 🔧 Configuration

### Loop Generation Options

```typescript
interface LoopGenerationOptions {
  targetDistance: number    // Target distance in meters
  startLat: number         // Start latitude
  startLon: number         // Start longitude
  tolerance: number        // Distance tolerance (0-1)
  maxVariants: number      // Number of variants to generate
  includeSecondary: boolean // Include secondary paths
  surfaceTypes?: string[]   // Allowed surface types
  difficulty?: string[]     // Allowed difficulty levels
  maxNodes?: number        // Maximum nodes in graph
}
```

### Performance Configuration

```typescript
interface PerformanceConfig {
  maxCacheSize: number     // LRU cache size
  maxNodes: number         // Maximum graph nodes
  maxEdges: number         // Maximum graph edges
  batchSize: number        // Batch processing size
  timeoutMs: number        // Generation timeout
  enableCaching: boolean   // Enable caching
  enableMemoization: boolean // Enable memoization
  enableBatching: boolean  // Enable batch processing
}
```

## 📊 Algorithm Details

### Phase 1: Graph Construction
1. Calculate search radius: `sqrt(target_distance² / π) × 1.5`
2. Fetch OSM data within radius
3. Build weighted graph with nodes and edges
4. Apply surface and safety weights
5. Optimize graph structure

### Phase 2: Exploration
1. Use Dijkstra's algorithm from start point
2. Target: reach 45-55% of desired distance
3. Score candidate points based on:
   - Distance from start
   - Angular diversity
   - Path quality

### Phase 3: Return
1. Use A* algorithm to return to start
2. Penalize edges used in exploration (×5 weight)
3. Ensure different paths on return

### Phase 4: Optimization
1. Combine exploration + return paths
2. Apply 2-opt optimization
3. Adjust distance if needed
4. Calculate quality score

### Quality Scoring
```typescript
quality_score = 0.4 × distance_accuracy + 
                0.3 × path_uniqueness + 
                0.2 × surface_quality + 
                0.1 × scenery_variety
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run specific test files
npm test -- geo-utils.test.ts
npm test -- pathfinding.test.ts
npm test -- loop-generator.test.ts

# Run with coverage
npm run test:coverage
```

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: Algorithm workflow testing
- **Performance Tests**: Speed and memory testing
- **Edge Case Tests**: Error handling and limits

## 📈 Performance

### Target Performance
- **Generation Time**: < 3 seconds
- **Memory Usage**: < 500MB
- **Success Rate**: > 95%
- **Quality Score**: > 0.7

### Optimization Strategies
1. **Caching**: LRU cache for repeated calculations
2. **Memoization**: Cache expensive function results
3. **Batching**: Process large datasets in batches
4. **Object Pooling**: Reuse expensive objects
5. **Graph Optimization**: Remove isolated nodes, merge nearby nodes

### Performance Monitoring
```typescript
import { PerformanceManager } from './utils/performance-utils'

const manager = new PerformanceManager()

// Start monitoring
manager.getMetrics().startTimer('operation')
// ... perform operation
const time = manager.getMetrics().stopTimer('operation')

// Check performance
if (!manager.isPerformanceAcceptable()) {
  manager.optimizeForPerformance()
}

// Get report
console.log(manager.getPerformanceReport())
```

## 🚨 Error Handling

### Common Errors
- **No valid paths found**: Insufficient OSM data in area
- **Start point not accessible**: Start point isolated from network
- **Generation timeout**: Algorithm exceeds time limit
- **Memory limit exceeded**: Too many nodes/edges

### Error Recovery
1. **Retry with different parameters**: Reduce maxNodes, increase tolerance
2. **Fallback to simpler algorithm**: Use basic pathfinding
3. **Suggest alternative start point**: Find nearest accessible point
4. **Return partial results**: Best effort with available data

## 🔍 Debugging

### Enable Debug Logging
```typescript
// Set environment variable
process.env.DEBUG = 'loop-generator'

// Or enable in code
console.log('🔍 Debug: Graph built with', graph.nodes.size, 'nodes')
```

### Performance Debugging
```typescript
import { PerformanceManager } from './utils/performance-utils'

const manager = new PerformanceManager()

// Monitor memory usage
const memoryUsage = manager.getMemoryUsage()
console.log('Memory usage:', memoryUsage.current.heapUsed, 'MB')

// Monitor execution times
const metrics = manager.getMetrics().getAllMetrics()
console.log('Execution times:', metrics)
```

## 📚 API Reference

### LoopGenerator Class
```typescript
class LoopGenerator {
  constructor(options: LoopGenerationOptions)
  generateLoops(): Promise<LoopGenerationResult>
}
```

### Pathfinding Classes
```typescript
class DijkstraPathfinder {
  constructor(graph: WeightedGraph, config?: PathfindingConfig)
  findPath(startId: string, endId: string): PathfindingResult
  findMultiplePaths(startId: string, targetIds: string[]): Map<string, PathfindingResult>
  findClosestToDistance(startId: string, targetDistance: number, tolerance: number): PathfindingResult | null
}

class AStarPathfinder {
  constructor(graph: WeightedGraph, config?: PathfindingConfig)
  findPath(startId: string, endId: string): PathfindingResult
}
```

### Utility Functions
```typescript
// Geographic calculations
haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number
calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number
calculateAngularDiversity(bearing1: number, bearing2: number): number

// Quality metrics
calculateDistanceAccuracy(actualDistance: number, targetDistance: number): number
calculatePathUniqueness(usedEdges: Set<string>, totalEdges: number): number
calculateSurfaceQuality(surfaceTypes: Record<string, number>): number
calculateSceneryVariety(pathPoints: Array<[number, number]>): number
```

## 🎯 Best Practices

### 1. Choose Appropriate Parameters
- **Target Distance**: 1-50km for best results
- **Tolerance**: 5-10% for good balance
- **Max Variants**: 3-5 for optimal performance
- **Max Nodes**: 10,000 for urban areas, 5,000 for rural

### 2. Monitor Performance
- Use PerformanceManager for monitoring
- Set appropriate timeouts
- Monitor memory usage
- Optimize when needed

### 3. Handle Errors Gracefully
- Validate input parameters
- Provide meaningful error messages
- Implement fallback strategies
- Log errors for debugging

### 4. Optimize for Your Use Case
- Urban areas: Include secondary paths
- Rural areas: Focus on primary paths
- Long distances: Increase tolerance
- Short distances: Decrease tolerance

## 🚀 Future Enhancements

### Planned Features
1. **Machine Learning**: Learn from user preferences
2. **Real-time Updates**: Live OSM data updates
3. **Advanced Optimization**: Genetic algorithms for loop optimization
4. **Multi-threading**: Parallel processing for large areas
5. **Caching**: Persistent cache for repeated requests

### Performance Improvements
1. **Web Workers**: Offload heavy computation
2. **Streaming**: Process large datasets incrementally
3. **Compression**: Compress graph data
4. **Indexing**: Spatial indexing for faster lookups

---

**The Loop Generation Algorithm is ready for production use! 🎉**

For questions or issues, please refer to the test files or create an issue in the repository.

