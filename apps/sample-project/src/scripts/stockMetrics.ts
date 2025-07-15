/* eslint-disable no-console */
import dotenv from 'dotenv'
import { Task, createTask } from '@forgehive/task'
import { createHiveLogClient } from '@forgehive/hive-sdk'
import { Schema } from '@forgehive/schema'

// Load environment variables
dotenv.config()

// Create the Hive client
const client = createHiveLogClient({
  projectName: 'Stock Metrics Demo',
  metadata: {
    environment: 'development',
    version: '1.0.0',
    demo: 'stock-metrics'
  }
})

// Enhanced stock price task with comprehensive metrics
const stockSchema = new Schema({
  ticker: Schema.string(),
  includeAnalysis: Schema.boolean().optional()
})

const stockMetricsTask = createTask({
  name: 'stockPriceWithMetrics',
  description: 'Get stock price with comprehensive performance and business metrics',
  schema: stockSchema,
  boundaries: {
    fetchStockPrice: async (ticker: string): Promise<{price: number, volume: number, change: number, responseTime: number}> => {
      const startTime = Date.now()
      
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch stock price for ${ticker}: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.chart.result[0]
      const meta = result.meta
      const responseTime = Date.now() - startTime

      return {
        price: meta.regularMarketPrice || 0,
        volume: meta.regularMarketVolume || 0,
        change: meta.regularMarketChangePercent || 0,
        responseTime
      }
    },

    fetchMarketStatus: async (): Promise<{isOpen: boolean, nextOpen?: string, responseTime: number}> => {
      const startTime = Date.now()
      
      // Simulate market status check
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const now = new Date()
      const hour = now.getHours()
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5
      const isMarketHours = hour >= 9 && hour < 16
      const isOpen = isWeekday && isMarketHours

      return {
        isOpen,
        nextOpen: isOpen ? undefined : 'Next trading day 9:30 AM ET',
        responseTime: Date.now() - startTime
      }
    }
  },

  fn: async function ({ ticker, includeAnalysis = false }, { fetchStockPrice, fetchMarketStatus, setMetrics, setMetadata }) {
    const startTime = Date.now()

    // Set metadata
    await setMetadata('ticker', ticker)
    await setMetadata('analysisEnabled', includeAnalysis.toString())
    await setMetadata('timestamp', new Date().toISOString())

    // Track request
    await setMetrics({
      type: 'business',
      name: 'stock_requests',
      value: 1
    })

    // Fetch market status first
    const marketStatus = await fetchMarketStatus()
    await setMetrics({
      type: 'performance',
      name: 'market_status_response_time',
      value: marketStatus.responseTime
    })

    await setMetrics({
      type: 'business',
      name: 'market_open_status',
      value: marketStatus.isOpen ? 1 : 0
    })

    // Fetch stock data
    const stockData = await fetchStockPrice(ticker)
    await setMetrics({
      type: 'performance',
      name: 'stock_api_response_time',
      value: stockData.responseTime
    })

    // Business metrics based on stock data
    await setMetrics({
      type: 'business',
      name: 'stock_price_usd',
      value: stockData.price
    })

    await setMetrics({
      type: 'business',
      name: 'trading_volume',
      value: stockData.volume
    })

    await setMetrics({
      type: 'business',
      name: 'price_change_percent',
      value: Math.abs(stockData.change)
    })

    // Performance classification
    let performanceCategory = 'neutral'
    if (Math.abs(stockData.change) > 5) {
      performanceCategory = 'high_volatility'
    } else if (Math.abs(stockData.change) > 2) {
      performanceCategory = 'moderate_volatility'
    }

    await setMetrics({
      type: 'business',
      name: 'volatility_category',
      value: performanceCategory === 'high_volatility' ? 3 : performanceCategory === 'moderate_volatility' ? 2 : 1
    })

    // Volume analysis if enabled
    if (includeAnalysis && stockData.volume > 0) {
      const volumeScore = stockData.volume > 1000000 ? 100 : (stockData.volume / 1000000) * 100
      await setMetrics({
        type: 'business',
        name: 'volume_score',
        value: Math.round(volumeScore)
      })

      // Liquidity metric
      const liquidityScore = Math.min(100, (stockData.volume / 10000) * stockData.price / 1000)
      await setMetrics({
        type: 'business',
        name: 'liquidity_score',
        value: Math.round(liquidityScore * 100) / 100
      })
    }

    // System performance metrics
    const totalResponseTime = stockData.responseTime + marketStatus.responseTime
    await setMetrics({
      type: 'performance',
      name: 'total_api_time',
      value: totalResponseTime
    })

    const efficiency = stockData.price > 0 ? (1000 / totalResponseTime) : 0
    await setMetrics({
      type: 'performance',
      name: 'request_efficiency',
      value: Math.round(efficiency * 100) / 100
    })

    // Error tracking (errors that didn't occur)
    await setMetrics({
      type: 'error',
      name: 'api_failures',
      value: 0
    })

    await setMetrics({
      type: 'error',
      name: 'timeout_count',
      value: totalResponseTime > 5000 ? 1 : 0
    })

    const processingTime = Date.now() - startTime
    await setMetrics({
      type: 'performance',
      name: 'total_processing_time',
      value: processingTime
    })

    return {
      ticker,
      price: stockData.price,
      change: stockData.change,
      volume: stockData.volume,
      marketOpen: marketStatus.isOpen,
      analysis: includeAnalysis ? {
        volatilityCategory: performanceCategory,
        volumeScore: stockData.volume > 1000000 ? Math.round((stockData.volume / 1000000) * 100) : null,
        efficiency: Math.round(efficiency * 100) / 100
      } : undefined,
      processingTime
    }
  }
})

// Demonstration function
async function demonstrateStockMetrics(): Promise<void> {
  console.log('=== Stock Metrics Demo ===')

  const tickers = ['AAPL', 'GOOGL', 'MSFT']
  
  for (const ticker of tickers) {
    try {
      console.log(`\n--- Processing ${ticker} ---`)
      
      const [result, error, record] = await stockMetricsTask.safeRun({
        ticker,
        includeAnalysis: Math.random() > 0.5
      })

      if (error) {
        console.error(`Error processing ${ticker}:`, error)
        continue
      }

      console.log('Result:', JSON.stringify(result, null, 2))
      
      // Display metrics summary
      if (record.metrics && record.metrics.length > 0) {
        console.log(`\nCollected ${record.metrics.length} metrics:`)
        
        const businessMetrics = record.metrics.filter(m => m.type === 'business')
        const performanceMetrics = record.metrics.filter(m => m.type === 'performance')
        const errorMetrics = record.metrics.filter(m => m.type === 'error')

        if (businessMetrics.length > 0) {
          console.log('Business metrics:')
          businessMetrics.forEach(m => console.log(`  ${m.name}: ${m.value}`))
        }

        if (performanceMetrics.length > 0) {
          console.log('Performance metrics:')
          performanceMetrics.forEach(m => console.log(`  ${m.name}: ${m.value}ms`))
        }

        if (errorMetrics.length > 0) {
          console.log('Error metrics:')
          errorMetrics.forEach(m => console.log(`  ${m.name}: ${m.value}`))
        }
      }

      // Display timing info
      if (record.timing) {
        console.log(`Total execution time: ${record.timing.duration}ms`)
      }

      // Send to Hive
      const logResult = await client.sendLog(record, {
        environment: 'stock-demo',
        ticker,
        hasAnalysis: result?.analysis ? 'true' : 'false'
      })
      console.log('Logged to Hive:', logResult === 'success' ? 'Success' : 'Failed')

    } catch (error) {
      console.error(`Unexpected error processing ${ticker}:`, error)
    }
  }

  console.log('\n=== Stock Metrics Demo completed ===')
}

// Run the demonstration
async function main(): Promise<void> {
  try {
    // Disable global listener for this demo
    const originalListener = Task.globalListener
    Task.globalListener = undefined

    await demonstrateStockMetrics()

    // Restore global listener
    Task.globalListener = originalListener
  } catch (error) {
    console.error('Error in main:', error)
  }
}

// Run the main function
main().catch(console.error)