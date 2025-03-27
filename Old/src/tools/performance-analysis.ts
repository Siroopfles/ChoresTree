import { performance } from 'perf_hooks';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import Redis from 'ioredis';

// Interfaces
interface Task {
    title: string;
    description: string;
}

interface MemoryMetrics {
    heapTotal: number;
    heapUsed: number;
    rss: number;
    external: number;
}

interface PerformanceResult {
    duration: number;
    memoryDelta: {
        heapUsed: number;
    };
}

// Type voor test scenario's
interface TestScenario {
    name: string;
    v1: () => Promise<unknown>;
    v2: () => Promise<unknown>;
}

interface AnalysisResults {
    bundleSize: {
        v1: { files: number; totalSize: number };
        v2: { files: number; totalSize: number };
    };
    performance: {
        [key: string]: {
            v1: PerformanceResult;
            v2: PerformanceResult;
        };
    };
    memory: {
        v1: Partial<MemoryMetrics>;
        v2: Partial<MemoryMetrics>;
    };
    caching: {
        v1Hits: number;
        v2Hits: number;
    };
}

// Initialize results with proper typing
const results: AnalysisResults = {
    bundleSize: {
        v1: { files: 0, totalSize: 0 },
        v2: { files: 0, totalSize: 0 }
    },
    performance: {},
    memory: {
        v1: {},
        v2: {}
    },
    caching: {
        v1Hits: 0,
        v2Hits: 0
    }
};

// Mock services for testing (replace with actual implementations)
const v1TaskService = {
    createTask: async (task: Task) => ({ ...task, id: Math.random() })
};

const v2TaskService = {
    createTask: async (task: Task) => ({ ...task, id: Math.random() })
};

// Bundle size analysis
async function analyzeDirectory(dir: string): Promise<{ files: number; totalSize: number; }> {
    const files = await readdir(dir, { recursive: true });
    let totalSize = 0;
    let fileCount = 0;

    for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.js.map')) {
            const stats = await stat(path.join(dir, file.toString()));
            totalSize += stats.size;
            fileCount++;
        }
    }

    return {
        files: fileCount,
        totalSize: totalSize / 1024 // Convert to KB
    };
}

// Memory usage analysis
function getMemoryUsage() {
    const used = process.memoryUsage();
    return {
        heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
        rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
        external: Math.round(used.external / 1024 / 1024 * 100) / 100
    };
}

// Performance test scenarios
async function runPerformanceTests() {
    // Setup Redis monitoring
    const redis = new Redis();
    let v1CacheHits = 0;
    let v2CacheHits = 0;
    
    await new Promise<void>((resolve, reject) => {
        redis.monitor((err, monitor) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (!monitor) {
                reject(new Error('Redis monitor not available'));
                return;
            }

            monitor.on('monitor', (time, args) => {
                if (Array.isArray(args) && args[0] === 'get') {
                    if (args[1].startsWith('v1:')) v1CacheHits++;
                    if (args[1].startsWith('v2:')) v2CacheHits++;
                }
            });

            resolve();
        });
    });

    // Test scenarios
    const scenarios: TestScenario[] = [
        {
            name: 'Create Task',
            v1: () => v1TaskService.createTask({ title: 'Test Task', description: 'Test Description' }),
            v2: () => v2TaskService.createTask({ title: 'Test Task', description: 'Test Description' })
        },
        {
            name: 'Bulk Operations',
            v1: () => Promise.all(Array(100).fill(0).map(() => v1TaskService.createTask({ title: 'Bulk Task', description: 'Test' }))),
            v2: () => Promise.all(Array(100).fill(0).map(() => v2TaskService.createTask({ title: 'Bulk Task', description: 'Test' })))
        }
    ] as const;

    // Initialize bundle size analysis
    results.bundleSize = {
        v1: await analyzeDirectory('dist/src'),
        v2: await analyzeDirectory('dist/src/v2')
    };

    // Initialize caching metrics
    results.caching = {
        v1Hits: v1CacheHits,
        v2Hits: v2CacheHits
    };

    // Run performance tests
    for (const scenario of scenarios) {
        // Test v1
        const v1Start = performance.now();
        const v1MemBefore = getMemoryUsage();
        await scenario.v1();
        const v1MemAfter = getMemoryUsage();
        const v1Duration = performance.now() - v1Start;

        // Test v2
        const v2Start = performance.now();
        const v2MemBefore = getMemoryUsage();
        await scenario.v2();
        const v2MemAfter = getMemoryUsage();
        const v2Duration = performance.now() - v2Start;

        results.performance[scenario.name] = {
            v1: {
                duration: v1Duration,
                memoryDelta: {
                    heapUsed: v1MemAfter.heapUsed - v1MemBefore.heapUsed
                }
            },
            v2: {
                duration: v2Duration,
                memoryDelta: {
                    heapUsed: v2MemAfter.heapUsed - v2MemBefore.heapUsed
                }
            }
        };
    }

    redis.disconnect();
    return results;
}

// Run analysis
runPerformanceTests().then(results => {
    // Use warn for eslint compliance
    console.warn('Performance Analysis Results:');
    console.warn(JSON.stringify(results, null, 2));
}).catch(console.error);