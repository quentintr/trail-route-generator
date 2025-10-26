/**
 * Demo script for loop generation algorithm
 * 
 * Demonstrates the complete loop generation process with performance monitoring
 */

import { LoopGenerator, LoopGenerationOptions, LoopGenerationUtils } from '../algorithms/loop-generator'
import { PerformanceManager, DEFAULT_PERFORMANCE_CONFIG } from '../utils/performance-utils'

/**
 * Demo locations for testing
 */
const DEMO_LOCATIONS = [
  {
    name: 'Paris, France',
    lat: 48.8566,
    lon: 2.3522,
    targetDistance: 5000 // 5km
  },
  {
    name: 'London, UK',
    lat: 51.5074,
    lon: -0.1278,
    targetDistance: 10000 // 10km
  },
  {
    name: 'New York, USA',
    lat: 40.7128,
    lon: -74.0060,
    targetDistance: 15000 // 15km
  },
  {
    name: 'Tokyo, Japan',
    lat: 35.6762,
    lon: 139.6503,
    targetDistance: 8000 // 8km
  }
]

/**
 * Run loop generation demo
 */
async function runLoopGenerationDemo() {
  console.log('🔄 Loop Generation Demo')
  console.log('======================\n')
  
  const performanceManager = new PerformanceManager({
    ...DEFAULT_PERFORMANCE_CONFIG,
    timeoutMs: 3000 // 3 seconds
  })
  
  for (const location of DEMO_LOCATIONS) {
    console.log(`📍 Testing: ${location.name}`)
    console.log(`🎯 Target distance: ${(location.targetDistance / 1000).toFixed(1)}km`)
    console.log(`📍 Coordinates: ${location.lat}, ${location.lon}\n`)
    
    try {
      // Create loop generation options
      const options: LoopGenerationOptions = {
        targetDistance: location.targetDistance,
        startLat: location.lat,
        startLon: location.lon,
        tolerance: 0.05, // 5%
        maxVariants: 3,
        includeSecondary: true,
        maxNodes: 10000
      }
      
      // Validate options
      const validationErrors = LoopGenerationUtils.validateOptions(options)
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors:', validationErrors)
        continue
      }
      
      // Start performance monitoring
      performanceManager.getMetrics().startTimer('loop_generation')
      
      // Generate loops
      const generator = new LoopGenerator(options)
      const result = await generator.generateLoops()
      
      // Stop performance monitoring
      const generationTime = performanceManager.getMetrics().stopTimer('loop_generation')
      
      // Display results
      if (result.success) {
        console.log(`✅ Generation successful in ${generationTime.toFixed(0)}ms`)
        console.log(`📊 Generated ${result.loops.length} loop variants`)
        console.log(`🗺️ Graph stats: ${result.stats.totalNodes} nodes, ${result.stats.totalEdges} edges`)
        
        // Display best loop
        if (result.loops.length > 0) {
          const bestLoop = result.loops[0]
          console.log('\n🏆 Best Loop:')
          console.log(LoopGenerationUtils.formatLoop(bestLoop))
          
          // Display quality metrics
          console.log('\n📈 Quality Metrics:')
          console.log(`  Distance accuracy: ${((bestLoop.total_distance / location.targetDistance - 1) * 100).toFixed(1)}%`)
          console.log(`  Quality score: ${(bestLoop.quality_score * 100).toFixed(1)}%`)
          console.log(`  Geometry points: ${bestLoop.geometry.length}`)
        }
        
        // Display all variants
        console.log('\n🔄 All Variants:')
        result.loops.forEach((loop, index) => {
          console.log(`  ${index + 1}. ${(loop.total_distance / 1000).toFixed(2)}km, quality: ${(loop.quality_score * 100).toFixed(1)}%`)
        })
        
      } else {
        console.log(`❌ Generation failed: ${result.error}`)
      }
      
    } catch (error) {
      console.error(`❌ Error generating loops for ${location.name}:`, error)
    }
    
    console.log('\n' + '='.repeat(50) + '\n')
    
    // Check performance
    if (!performanceManager.isPerformanceAcceptable()) {
      console.log('⚠️ Performance issues detected, applying optimizations...')
      performanceManager.optimizeForPerformance()
    }
  }
  
  // Display performance report
  console.log('📊 Final Performance Report')
  console.log('==========================')
  console.log(performanceManager.getPerformanceReport())
  
  // Display memory usage
  const memoryUsage = performanceManager.getMemoryUsage()
  console.log('\n💾 Memory Usage:')
  console.log(`  Current: ${memoryUsage.current.heapUsed}MB`)
  console.log(`  Peak: ${memoryUsage.peak.heapUsed}MB`)
  console.log(`  Delta: ${memoryUsage.delta.heapUsed}MB`)
}

/**
 * Run performance stress test
 */
async function runPerformanceStressTest() {
  console.log('⚡ Performance Stress Test')
  console.log('=========================\n')
  
  const performanceManager = new PerformanceManager({
    ...DEFAULT_PERFORMANCE_CONFIG,
    timeoutMs: 2000 // 2 seconds
  })
  
  const testCases = [
    { distance: 1000, name: '1km' },
    { distance: 5000, name: '5km' },
    { distance: 10000, name: '10km' },
    { distance: 20000, name: '20km' },
    { distance: 50000, name: '50km' }
  ]
  
  for (const testCase of testCases) {
    console.log(`🧪 Testing ${testCase.name} loop generation...`)
    
    const options: LoopGenerationOptions = {
      targetDistance: testCase.distance,
      startLat: 48.8566, // Paris
      startLon: 2.3522,
      tolerance: 0.1, // 10% tolerance for stress test
      maxVariants: 1, // Only 1 variant for speed
      includeSecondary: true,
      maxNodes: 5000 // Limit nodes for performance
    }
    
    try {
      performanceManager.getMetrics().startTimer(`stress_${testCase.name}`)
      
      const generator = new LoopGenerator(options)
      const result = await generator.generateLoops()
      
      const generationTime = performanceManager.getMetrics().stopTimer(`stress_${testCase.name}`)
      
      if (result.success) {
        console.log(`  ✅ Success in ${generationTime.toFixed(0)}ms`)
        console.log(`  📊 Quality: ${(result.loops[0]?.quality_score || 0 * 100).toFixed(1)}%`)
      } else {
        console.log(`  ❌ Failed: ${result.error}`)
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
    }
    
    // Check if we're still within performance limits
    if (!performanceManager.isPerformanceAcceptable()) {
      console.log('⚠️ Performance limits exceeded, stopping stress test')
      break
    }
  }
  
  console.log('\n📊 Stress Test Results:')
  const metrics = performanceManager.getMetrics().getAllMetrics()
  for (const [name, metric] of Object.entries(metrics)) {
    if (name.startsWith('stress_')) {
      console.log(`  ${name}: avg=${metric.avg.toFixed(0)}ms, max=${metric.max.toFixed(0)}ms`)
    }
  }
}

/**
 * Run edge case tests
 */
async function runEdgeCaseTests() {
  console.log('🧪 Edge Case Tests')
  console.log('==================\n')
  
  const edgeCases = [
    {
      name: 'Very short distance',
      options: {
        targetDistance: 100, // 100m
        startLat: 48.8566,
        startLon: 2.3522,
        tolerance: 0.5,
        maxVariants: 1
      }
    },
    {
      name: 'Very long distance',
      options: {
        targetDistance: 100000, // 100km
        startLat: 48.8566,
        startLon: 2.3522,
        tolerance: 0.5,
        maxVariants: 1
      }
    },
    {
      name: 'High tolerance',
      options: {
        targetDistance: 10000,
        startLat: 48.8566,
        startLon: 2.3522,
        tolerance: 0.9, // 90%
        maxVariants: 1
      }
    },
    {
      name: 'Many variants',
      options: {
        targetDistance: 10000,
        startLat: 48.8566,
        startLon: 2.3522,
        tolerance: 0.1,
        maxVariants: 10
      }
    }
  ]
  
  for (const edgeCase of edgeCases) {
    console.log(`🧪 Testing: ${edgeCase.name}`)
    
    try {
      const generator = new LoopGenerator(edgeCase.options)
      const result = await generator.generateLoops()
      
      if (result.success) {
        console.log(`  ✅ Success: ${result.loops.length} variants generated`)
      } else {
        console.log(`  ❌ Failed: ${result.error}`)
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
    }
  }
}

/**
 * Main demo function
 */
async function main() {
  console.log('🚀 Loop Generation Algorithm Demo')
  console.log('==================================\n')
  
  try {
    // Run main demo
    await runLoopGenerationDemo()
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // Run performance stress test
    await runPerformanceStressTest()
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // Run edge case tests
    await runEdgeCaseTests()
    
    console.log('\n🎉 Demo completed successfully!')
    
  } catch (error) {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  }
}

// Run demo if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { runLoopGenerationDemo, runPerformanceStressTest, runEdgeCaseTests }

