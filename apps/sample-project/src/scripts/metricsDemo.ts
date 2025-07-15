/* eslint-disable no-console */
import dotenv from 'dotenv'
import { Task, createTask } from '@forgehive/task'
import { createHiveLogClient } from '@forgehive/hive-sdk'
import { Schema } from '@forgehive/schema'

// Load environment variables
dotenv.config()

// Create the Hive client
const client = createHiveLogClient({
  projectName: 'Mono repo sample project - Metrics Demo',
  metadata: {
    environment: 'development',
    version: '1.0.0',
    script: 'metricsDemo'
  }
})

// Create a task that demonstrates metrics collection
const metricsSchema = new Schema({
  userId: Schema.string(),
  limit: Schema.number().optional()
})

const metricsTask = createTask({
  name: 'userDataProcessor',
  description: 'Processes user data and collects comprehensive metrics',
  schema: metricsSchema,
  boundaries: {
    fetchUserProfile: async (userId: string) => {
      // Simulate API call delay
      const startTime = Date.now()
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50))
      const responseTime = Date.now() - startTime

      return {
        id: userId,
        name: `User ${userId}`,
        email: `${userId}@example.com`,
        responseTime
      }
    },

    fetchUserPosts: async (userId: string, limit = 10) => {
      // Simulate another API call
      const startTime = Date.now()
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 30))
      const responseTime = Date.now() - startTime

      const posts = Array.from({ length: Math.min(limit, Math.floor(Math.random() * 15) + 1) }, (_, i) => ({
        id: `post_${i + 1}`,
        title: `Post ${i + 1} by ${userId}`,
        content: `This is the content of post ${i + 1}`
      }))

      return { posts, responseTime }
    },

    calculateEngagement: async (posts: any[]) => {
      // Simulate engagement calculation
      const startTime = Date.now()
      await new Promise(resolve => setTimeout(resolve, 50))
      const processingTime = Date.now() - startTime

      const engagement = posts.reduce((total, post, index) => {
        return total + (Math.random() * 100) + (index * 5)
      }, 0)

      return { engagement: Math.round(engagement), processingTime }
    }
  },

  fn: async function ({ userId, limit = 10 }, { fetchUserProfile, fetchUserPosts, calculateEngagement, setMetrics, setMetadata }) {
    // Set metadata for tracking
    await setMetadata('userId', userId)
    await setMetadata('environment', 'metrics-demo')

    // Collect initial metric
    await setMetrics({
      type: 'business',
      name: 'user_requests',
      value: 1
    })

    // Fetch user profile and collect timing metrics
    const userProfile = await fetchUserProfile(userId)
    await setMetrics({
      type: 'performance',
      name: 'user_profile_response_time',
      value: userProfile.responseTime
    })

    // Collect API health metric based on response time
    const healthScore = userProfile.responseTime < 100 ? 100 : userProfile.responseTime < 200 ? 75 : 50
    await setMetrics({
      type: 'system',
      name: 'api_health_score',
      value: healthScore
    })

    // Fetch user posts and collect metrics
    const { posts, responseTime: postsResponseTime } = await fetchUserPosts(userId, limit)
    await setMetrics({
      type: 'performance',
      name: 'user_posts_response_time',
      value: postsResponseTime
    })

    await setMetrics({
      type: 'business',
      name: 'posts_retrieved',
      value: posts.length
    })

    // Calculate engagement metrics
    const { engagement, processingTime } = await calculateEngagement(posts)
    await setMetrics({
      type: 'performance',
      name: 'engagement_processing_time',
      value: processingTime
    })

    await setMetrics({
      type: 'business',
      name: 'user_engagement_score',
      value: engagement
    })

    // Collect efficiency metric
    const totalApiTime = userProfile.responseTime + postsResponseTime
    const efficiency = posts.length > 0 ? (engagement / totalApiTime) * 100 : 0
    await setMetrics({
      type: 'business',
      name: 'processing_efficiency',
      value: Math.round(efficiency * 100) / 100
    })

    // Error simulation metric (count errors that didn't happen)
    await setMetrics({
      type: 'error',
      name: 'api_errors_prevented',
      value: 0
    })

    return {
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email
      },
      posts: posts.length,
      engagement: engagement,
      summary: {
        totalResponseTime: totalApiTime,
        efficiency: Math.round(efficiency * 100) / 100,
        healthScore
      }
    }
  }
})

// Example: Direct sendLog usage with metrics
console.log('=== Metrics Collection Demo ===')

async function demonstrateMetrics(): Promise<void> {
  try {
    console.log('Running task with comprehensive metrics collection...')

    // Execute the task
    const [result, error, record] = await metricsTask.safeRun({
      userId: 'user_123',
      limit: 5
    })

    if (error) {
      console.error('Task execution failed:', error)
      return
    }

    console.log('\n--- Task Result ---')
    console.log(JSON.stringify(result, null, 2))

    console.log('\n--- Execution Metrics ---')
    console.log(`Total metrics collected: ${record.metrics?.length || 0}`)

    if (record.metrics && record.metrics.length > 0) {
      console.log('\nMetrics breakdown:')
      const metricsByType = record.metrics.reduce((acc, metric) => {
        acc[metric.type] = acc[metric.type] || []
        acc[metric.type].push(metric)
        return acc
      }, {} as Record<string, typeof record.metrics>)

      Object.entries(metricsByType).forEach(([type, metrics]) => {
        console.log(`\n${type.toUpperCase()} metrics (${metrics.length}):`)
        metrics.forEach(metric => {
          console.log(`  - ${metric.name}: ${metric.value}`)
        })
      })
    }

    console.log('\n--- Timing Information ---')
    if (record.timing) {
      console.log(`Main function execution time: ${record.timing.duration}ms`)
      console.log(`Started at: ${new Date(record.timing.startTime).toISOString()}`)
      console.log(`Ended at: ${new Date(record.timing.endTime).toISOString()}`)
    }

    console.log('\n--- Boundary Timing ---')
    Object.entries(record.boundaries).forEach(([boundaryName, calls]) => {
      if (Array.isArray(calls) && calls.length > 0) {
        console.log(`${boundaryName}:`)
        calls.forEach((call, index) => {
          if (call.timing) {
            console.log(`  Call ${index + 1}: ${call.timing.duration}ms`)
          }
        })
      }
    })

    // Send the execution record with metrics to Hive
    console.log('\n--- Sending to Hive ---')
    const logResult = await client.sendLog(record, {
      environment: 'metrics-demo',
      method: 'direct',
      metricsEnabled: 'true',
      timingEnabled: 'true'
    })
    console.log('Hive logging result:', logResult)

    console.log('\n=== Metrics Demo completed successfully ===')
  } catch (error) {
    console.error('Error in metrics demonstration:', error)
  }
}

// Additional demonstration: Multiple runs to show metrics accumulation patterns
async function demonstrateMultipleRuns(): Promise<void> {
  console.log('\n=== Multiple Runs Demonstration ===')

  const userIds = ['alice', 'bob', 'charlie']
  const allMetrics: any[] = []

  for (const userId of userIds) {
    console.log(`\nProcessing user: ${userId}`)

    const [, error, record] = await metricsTask.safeRun({
      userId,
      limit: Math.floor(Math.random() * 8) + 3
    })

    if (!error && record.metrics) {
      allMetrics.push(...record.metrics.map(m => ({ ...m, userId })))

      // Send each execution to Hive
      await client.sendLog(record, {
        environment: 'batch-demo',
        userId,
        batchId: 'demo-batch-001'
      })
    }
  }

  // Analyze aggregated metrics
  console.log('\n--- Aggregated Metrics Analysis ---')
  const aggregated: Record<string, { values: number[], type: string, name: string }> = allMetrics.reduce((acc, metric) => {
    const key = `${metric.type}.${metric.name}`
    if (!acc[key]) {
      acc[key] = { values: [], type: metric.type, name: metric.name }
    }
    acc[key].values.push(metric.value)
    return acc
  }, {} as Record<string, { values: number[], type: string, name: string }>)

  Object.values(aggregated).forEach(({ type, name, values }) => {
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    console.log(`${type}.${name}:`)
    console.log(`  Average: ${avg.toFixed(2)}`)
    console.log(`  Range: ${min} - ${max}`)
    console.log(`  Total samples: ${values.length}`)
  })
}

// Run the demonstrations
async function main(): Promise<void> {
  try {
    // Disable global listener for this demo
    const originalListener = Task.globalListener
    Task.globalListener = undefined

    await demonstrateMetrics()
    await demonstrateMultipleRuns()

    // Restore global listener
    Task.globalListener = originalListener
  } catch (error) {
    console.error('Error in main:', error)
  }
}

// Run the main function
main().catch(console.error)
