/**
 * Performance optimization utilities for loop generation
 * 
 * Provides caching, memoization, and other performance optimizations
 * to ensure loop generation completes within 3 seconds
 */

/**
 * Simple LRU cache implementation
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

/**
 * Memoization decorator for expensive functions
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Throttle function to limit function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Performance timer for measuring execution time
 */
export class PerformanceTimer {
  private startTime: number = 0
  private endTime: number = 0
  private isRunning: boolean = false

  start(): void {
    this.startTime = performance.now()
    this.isRunning = true
  }

  stop(): number {
    if (!this.isRunning) {
      throw new Error('Timer is not running')
    }
    
    this.endTime = performance.now()
    this.isRunning = false
    return this.getElapsedTime()
  }

  getElapsedTime(): number {
    const endTime = this.isRunning ? performance.now() : this.endTime
    return endTime - this.startTime
  }

  reset(): void {
    this.startTime = 0
    this.endTime = 0
    this.isRunning = false
  }
}

/**
 * Batch processor for handling large datasets efficiently
 */
export class BatchProcessor<T> {
  private batchSize: number
  private processor: (batch: T[]) => Promise<void>
  private queue: T[] = []
  private processing: boolean = false

  constructor(batchSize: number, processor: (batch: T[]) => Promise<void>) {
    this.batchSize = batchSize
    this.processor = processor
  }

  async add(item: T): Promise<void> {
    this.queue.push(item)
    
    if (this.queue.length >= this.batchSize) {
      await this.processBatch()
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length > 0) {
      await this.processBatch()
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true
    const batch = this.queue.splice(0, this.batchSize)
    
    try {
      await this.processor(batch)
    } finally {
      this.processing = false
    }
  }
}

/**
 * Object pool for reusing expensive objects
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize: number = 100
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }

  clear(): void {
    this.pool = []
  }

  size(): number {
    return this.pool.length
  }
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private metrics = new Map<string, number[]>()
  private timers = new Map<string, PerformanceTimer>()

  startTimer(name: string): void {
    const timer = new PerformanceTimer()
    timer.start()
    this.timers.set(name, timer)
  }

  stopTimer(name: string): number {
    const timer = this.timers.get(name)
    if (!timer) {
      throw new Error(`Timer '${name}' not found`)
    }
    
    const elapsed = timer.stop()
    this.recordMetric(name, elapsed)
    this.timers.delete(name)
    return elapsed
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
  }

  getMetric(name: string): number[] {
    return this.metrics.get(name) || []
  }

  getAverageMetric(name: string): number {
    const values = this.getMetric(name)
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  getMaxMetric(name: string): number {
    const values = this.getMetric(name)
    return values.length === 0 ? 0 : Math.max(...values)
  }

  getMinMetric(name: string): number {
    const values = this.getMetric(name)
    return values.length === 0 ? 0 : Math.min(...values)
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    for (const [name, values] of this.metrics) {
      result[name] = {
        avg: this.getAverageMetric(name),
        min: this.getMinMetric(name),
        max: this.getMaxMetric(name),
        count: values.length
      }
    }
    
    return result
  }

  clear(): void {
    this.metrics.clear()
    this.timers.clear()
  }
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage
  private peakMemory: NodeJS.MemoryUsage

  constructor() {
    this.initialMemory = process.memoryUsage()
    this.peakMemory = { ...this.initialMemory }
  }

  update(): void {
    const current = process.memoryUsage()
    
    if (current.heapUsed > this.peakMemory.heapUsed) {
      this.peakMemory = { ...current }
    }
  }

  getMemoryUsage(): {
    initial: NodeJS.MemoryUsage
    current: NodeJS.MemoryUsage
    peak: NodeJS.MemoryUsage
    delta: NodeJS.MemoryUsage
  } {
    const current = process.memoryUsage()
    
    return {
      initial: this.initialMemory,
      current,
      peak: this.peakMemory,
      delta: {
        rss: current.rss - this.initialMemory.rss,
        heapTotal: current.heapTotal - this.initialMemory.heapTotal,
        heapUsed: current.heapUsed - this.initialMemory.heapUsed,
        external: current.external - this.initialMemory.external,
        arrayBuffers: current.arrayBuffers - this.initialMemory.arrayBuffers
      }
    }
  }

  getMemoryUsageMB(): {
    initial: Record<string, number>
    current: Record<string, number>
    peak: Record<string, number>
    delta: Record<string, number>
  } {
    const usage = this.getMemoryUsage()
    
    const toMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100
    
    return {
      initial: {
        rss: toMB(usage.initial.rss),
        heapTotal: toMB(usage.initial.heapTotal),
        heapUsed: toMB(usage.initial.heapUsed),
        external: toMB(usage.initial.external),
        arrayBuffers: toMB(usage.initial.arrayBuffers)
      },
      current: {
        rss: toMB(usage.current.rss),
        heapTotal: toMB(usage.current.heapTotal),
        heapUsed: toMB(usage.current.heapUsed),
        external: toMB(usage.current.external),
        arrayBuffers: toMB(usage.current.arrayBuffers)
      },
      peak: {
        rss: toMB(usage.peak.rss),
        heapTotal: toMB(usage.peak.heapTotal),
        heapUsed: toMB(usage.peak.heapUsed),
        external: toMB(usage.peak.external),
        arrayBuffers: toMB(usage.peak.arrayBuffers)
      },
      delta: {
        rss: toMB(usage.delta.rss),
        heapTotal: toMB(usage.delta.heapTotal),
        heapUsed: toMB(usage.delta.heapUsed),
        external: toMB(usage.delta.external),
        arrayBuffers: toMB(usage.delta.arrayBuffers)
      }
    }
  }
}

/**
 * Performance optimization settings
 */
export interface PerformanceConfig {
  maxCacheSize: number
  maxNodes: number
  maxEdges: number
  batchSize: number
  timeoutMs: number
  enableCaching: boolean
  enableMemoization: boolean
  enableBatching: boolean
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxCacheSize: 1000,
  maxNodes: 10000,
  maxEdges: 20000,
  batchSize: 100,
  timeoutMs: 3000, // 3 seconds
  enableCaching: true,
  enableMemoization: true,
  enableBatching: true
}

/**
 * Performance optimization manager
 */
export class PerformanceManager {
  private config: PerformanceConfig
  private metrics: PerformanceMetrics
  private memoryMonitor: MemoryMonitor
  private caches = new Map<string, LRUCache<any, any>>()

  constructor(config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG) {
    this.config = config
    this.metrics = new PerformanceMetrics()
    this.memoryMonitor = new MemoryMonitor()
  }

  getCache<K, V>(name: string): LRUCache<K, V> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new LRUCache<K, V>(this.config.maxCacheSize))
    }
    return this.caches.get(name)!
  }

  clearCache(name?: string): void {
    if (name) {
      this.caches.get(name)?.clear()
    } else {
      this.caches.forEach(cache => cache.clear())
    }
  }

  getMetrics(): PerformanceMetrics {
    return this.metrics
  }

  getMemoryUsage(): ReturnType<MemoryMonitor['getMemoryUsageMB']> {
    this.memoryMonitor.update()
    return this.memoryMonitor.getMemoryUsageMB()
  }

  isPerformanceAcceptable(): boolean {
    const memoryUsage = this.getMemoryUsage()
    const metrics = this.metrics.getAllMetrics()
    
    // Check memory usage
    if (memoryUsage.current.heapUsed > 500) { // 500MB
      console.warn('⚠️ High memory usage detected')
      return false
    }
    
    // Check execution time
    const generationTime = metrics['loop_generation']?.avg || 0
    if (generationTime > this.config.timeoutMs) {
      console.warn('⚠️ Generation time exceeds limit')
      return false
    }
    
    return true
  }

  optimizeForPerformance(): void {
    // Clear old caches
    this.clearCache()
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    console.log('⚡ Performance optimizations applied')
  }

  getPerformanceReport(): string {
    const memoryUsage = this.getMemoryUsage()
    const metrics = this.metrics.getAllMetrics()
    
    let report = '📊 Performance Report\n'
    report += '===================\n\n'
    
    report += 'Memory Usage (MB):\n'
    report += `  Current: ${memoryUsage.current.heapUsed}MB\n`
    report += `  Peak: ${memoryUsage.peak.heapUsed}MB\n`
    report += `  Delta: ${memoryUsage.delta.heapUsed}MB\n\n`
    
    report += 'Execution Times (ms):\n'
    for (const [name, metric] of Object.entries(metrics)) {
      report += `  ${name}: avg=${metric.avg.toFixed(2)}, min=${metric.min.toFixed(2)}, max=${metric.max.toFixed(2)}, count=${metric.count}\n`
    }
    
    return report
  }
}

