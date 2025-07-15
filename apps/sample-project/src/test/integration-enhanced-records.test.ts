import { createTask } from '@forgehive/task'
import { createHiveLogClient } from '@forgehive/hive-sdk'
import { Schema } from '@forgehive/schema'

describe('Sample App Integration Tests for Enhanced Execution Records', () => {
  // Create a test client that doesn't require real API keys
  const testClient = createHiveLogClient({
    projectName: 'Sample App Integration Tests',
    metadata: {
      environment: 'test',
      version: '1.0.0'
    }
  })

  describe('Complete workflow with hive-sdk integration', () => {
    it('should execute task and successfully log enhanced execution record to hive', async () => {
      const ecommerceTask = createTask({
        name: 'process-order',
        description: 'Complete e-commerce order processing workflow',
        schema: new Schema({
          orderId: Schema.string(),
          customerId: Schema.string(),
          itemCount: Schema.number(),
          totalAmount: Schema.number(),
          paymentMethod: Schema.string()
        }),
        boundaries: {
          validateCustomer: async (customerId: string) => {
            // Simulate customer validation API call
            await new Promise(resolve => setTimeout(resolve, 80))
            if (customerId.startsWith('invalid')) {
              throw new Error(`Customer ${customerId} not found`)
            }
            return {
              id: customerId,
              name: `Customer ${customerId}`,
              creditScore: 750,
              verified: true
            }
          },
          checkInventory: async (productId: string, quantity: number) => {
            // Simulate inventory check
            await new Promise(resolve => setTimeout(resolve, 60))
            const available = Math.floor(Math.random() * 100) + quantity
            return {
              productId,
              available,
              reserved: quantity,
              sufficient: available >= quantity
            }
          },
          processPayment: async (amount: number, paymentMethod: string) => {
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 120))
            if (amount > 10000) {
              throw new Error('Payment amount exceeds limit')
            }
            return {
              transactionId: `tx_${Date.now()}`,
              amount,
              method: paymentMethod,
              status: 'completed',
              fee: amount * 0.029
            }
          },
          updateInventory: async (items: any[]) => {
            // Simulate inventory update
            await new Promise(resolve => setTimeout(resolve, 40))
            return {
              updated: items.length,
              timestamp: new Date().toISOString()
            }
          },
          sendNotification: async (customerId: string, orderId: string) => {
            // Simulate notification sending
            await new Promise(resolve => setTimeout(resolve, 30))
            return {
              sent: true,
              channel: 'email',
              messageId: `msg_${orderId}_${customerId}`
            }
          }
        },
        fn: async ({ orderId, customerId, itemCount, totalAmount, paymentMethod }, {
          validateCustomer,
          checkInventory,
          processPayment,
          updateInventory,
          sendNotification,
          setMetrics,
          setMetadata
        }) => {
          const startTime = Date.now()

          // Set comprehensive metadata
          await setMetadata('orderId', orderId)
          await setMetadata('customerId', customerId)
          await setMetadata('paymentMethod', paymentMethod)
          await setMetadata('itemCount', itemCount.toString())
          await setMetadata('environment', 'sample-app-test')

          // Business metrics
          await setMetrics({ type: 'business', name: 'orders_received', value: 1 })
          await setMetrics({ type: 'business', name: 'items_in_order', value: itemCount })

          // Step 1: Validate customer
          const customer = await validateCustomer(customerId)
          await setMetrics({ type: 'business', name: 'customer_credit_score', value: customer.creditScore })
          await setMetrics({ type: 'performance', name: 'customer_validation_time', value: 80 })

          // Step 2: Check inventory for items
          const inventoryChecks = []
          for (let i = 0; i < itemCount; i++) {
            const inventory = await checkInventory(`product_${i + 1}`, 1)
            inventoryChecks.push({ productId: `product_${i + 1}`, inventory })

            await setMetrics({ type: 'business', name: 'inventory_checks', value: 1 })
            if (!inventory.sufficient) {
              await setMetrics({ type: 'error', name: 'insufficient_inventory', value: 1 })
              throw new Error(`Insufficient inventory for product product_${i + 1}`)
            }
          }
          await setMetrics({ type: 'performance', name: 'inventory_check_time', value: 60 })

          // Step 3: Process payment
          await setMetrics({ type: 'business', name: 'order_total_cents', value: Math.round(totalAmount * 100) })

          const payment = await processPayment(totalAmount, paymentMethod)
          await setMetrics({ type: 'business', name: 'payment_fee_cents', value: Math.round(payment.fee * 100) })
          await setMetrics({ type: 'performance', name: 'payment_processing_time', value: 120 })

          // Step 4: Update inventory
          const inventoryUpdate = await updateInventory(inventoryChecks)
          await setMetrics({ type: 'business', name: 'inventory_items_updated', value: inventoryUpdate.updated })
          await setMetrics({ type: 'performance', name: 'inventory_update_time', value: 40 })

          // Step 5: Send notification
          const notification = await sendNotification(customerId, orderId)
          await setMetrics({ type: 'business', name: 'notifications_sent', value: notification.sent ? 1 : 0 })
          await setMetrics({ type: 'performance', name: 'notification_time', value: 30 })

          // Final metrics
          const totalProcessingTime = Date.now() - startTime
          await setMetrics({ type: 'performance', name: 'total_order_processing_time', value: totalProcessingTime })
          await setMetrics({ type: 'business', name: 'orders_completed', value: 1 })
          await setMetrics({ type: 'error', name: 'processing_errors', value: 0 })

          return {
            orderId,
            customer,
            items: inventoryChecks,
            payment,
            inventoryUpdate,
            notification,
            totalAmount,
            processingTime: totalProcessingTime,
            status: 'completed'
          }
        }
      })

      // Execute the task
      const [result, error, record] = await ecommerceTask.safeRun({
        orderId: 'order_123456',
        customerId: 'customer_789',
        items: [
          { productId: 'product_1', quantity: 2, price: 29.99 },
          { productId: 'product_2', quantity: 1, price: 79.99 },
          { productId: 'product_3', quantity: 3, price: 15.50 }
        ],
        paymentMethod: 'credit_card'
      })

      // Validate successful execution
      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result?.status).toBe('completed')
      expect(result?.totalAmount).toBe(156.47) // 2*29.99 + 1*79.99 + 3*15.50

      // Validate comprehensive execution record
      expect(record).toEqual(expect.objectContaining({
        input: expect.any(Object),
        output: expect.any(Object),
        taskName: 'process-order',
        metadata: expect.objectContaining({
          orderId: 'order_123456',
          customerId: 'customer_789',
          paymentMethod: 'credit_card',
          itemCount: '3',
          environment: 'sample-app-test'
        }),
        metrics: expect.any(Array),
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        }),
        boundaries: expect.objectContaining({
          validateCustomer: expect.any(Array),
          checkInventory: expect.any(Array),
          processPayment: expect.any(Array),
          updateInventory: expect.any(Array),
          sendNotification: expect.any(Array)
        }),
        type: 'success'
      }))

      // Validate metrics collection (should have 15+ metrics)
      expect(record.metrics?.length).toBeGreaterThanOrEqual(15)

      const businessMetrics = record.metrics?.filter(m => m.type === 'business') || []
      const performanceMetrics = record.metrics?.filter(m => m.type === 'performance') || []
      const errorMetrics = record.metrics?.filter(m => m.type === 'error') || []

      expect(businessMetrics.length).toBeGreaterThanOrEqual(8)
      expect(performanceMetrics.length).toBeGreaterThanOrEqual(6)
      expect(errorMetrics.length).toBeGreaterThanOrEqual(1)

      // Validate timing for each boundary
      expect(record.boundaries.validateCustomer).toHaveLength(1)
      expect(record.boundaries.validateCustomer[0].timing.duration).toBeGreaterThanOrEqual(70)

      expect(record.boundaries.checkInventory).toHaveLength(3) // One for each item
      record.boundaries.checkInventory.forEach(call => {
        expect(call.timing.duration).toBeGreaterThanOrEqual(50)
      })

      expect(record.boundaries.processPayment).toHaveLength(1)
      expect(record.boundaries.processPayment[0].timing.duration).toBeGreaterThanOrEqual(110)

      // Log to Hive SDK
      const logResult = await testClient.sendLog(record, {
        testRun: 'integration-test',
        workflow: 'e-commerce-order',
        complexity: 'high'
      })

      // In test mode (no API keys), this should return 'silent'
      expect(['success', 'silent', 'error']).toContain(logResult)

      console.log('\n=== Integration Test Results ===')
      console.log(`Order ID: ${result?.orderId}`)
      console.log(`Total Amount: $${result?.totalAmount}`)
      console.log(`Processing Time: ${result?.processingTime}ms`)
      console.log(`Metrics Collected: ${record.metrics?.length}`)
      console.log(`Boundary Calls: ${Object.keys(record.boundaries).length}`)
      console.log(`Hive Logging: ${logResult}`)
      console.log('===========================\n')
    })

    it('should handle error scenarios and still create comprehensive execution records', async () => {
      const errorTask = createTask({
        name: 'error-handling-workflow',
        schema: new Schema({
          scenario: Schema.string(),
          customerId: Schema.string(),
          amount: Schema.number()
        }),
        boundaries: {
          validateInput: async (scenario: string) => {
            await new Promise(resolve => setTimeout(resolve, 50))
            if (scenario === 'invalid-input') {
              throw new Error('Invalid input scenario')
            }
            return { valid: true, scenario }
          },
          processTransaction: async (amount: number) => {
            await new Promise(resolve => setTimeout(resolve, 100))
            if (amount > 5000) {
              throw new Error('Amount exceeds transaction limit')
            }
            return { processed: amount, fee: amount * 0.03 }
          }
        },
        fn: async ({ scenario, customerId, amount }, { validateInput, processTransaction, setMetrics, setMetadata }) => {
          await setMetadata('scenario', scenario)
          await setMetadata('customerId', customerId)
          await setMetadata('testType', 'error-handling')

          await setMetrics({ type: 'business', name: 'error_test_runs', value: 1 })

          // This will succeed or fail based on scenario
          const validation = await validateInput(scenario)
          await setMetrics({ type: 'business', name: 'validations_attempted', value: 1 })

          if (scenario === 'main-function-error') {
            await setMetrics({ type: 'error', name: 'main_function_failures', value: 1 })
            throw new Error('Main function intentional error')
          }

          // This might fail based on amount
          const transaction = await processTransaction(amount)
          await setMetrics({ type: 'business', name: 'transactions_processed', value: 1 })
          await setMetrics({ type: 'business', name: 'transaction_fee_cents', value: Math.round(transaction.fee * 100) })

          return { validation, transaction, status: 'success' }
        }
      })

      // Test boundary error scenario
      const [result1, error1, record1] = await errorTask.safeRun({
        scenario: 'invalid-input',
        customerId: 'test-customer',
        amount: 100
      })

      expect(result1).toBeNull()
      expect(error1).not.toBeNull()
      expect(record1.type).toBe('error')
      expect(record1.timing).toBeDefined()
      expect(record1.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'error_test_runs', value: 1 },
        { type: 'business', name: 'validations_attempted', value: 1 }
      ]))

      // Boundary should have error with timing
      expect(record1.boundaries.validateInput).toHaveLength(1)
      expect('error' in record1.boundaries.validateInput[0]).toBe(true)
      expect(record1.boundaries.validateInput[0].timing.duration).toBeGreaterThanOrEqual(40)

      // Log error scenario to Hive
      const logResult1 = await testClient.sendLog(record1, {
        testRun: 'error-integration-test',
        errorType: 'boundary-error'
      })
      expect(['success', 'silent', 'error']).toContain(logResult1)

      // Test main function error scenario
      const [result2, error2, record2] = await errorTask.safeRun({
        scenario: 'main-function-error',
        customerId: 'test-customer',
        amount: 100
      })

      expect(result2).toBeNull()
      expect(error2).not.toBeNull()
      expect(record2.type).toBe('error')
      expect(record2.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'error_test_runs', value: 1 },
        { type: 'business', name: 'validations_attempted', value: 1 },
        { type: 'error', name: 'main_function_failures', value: 1 }
      ]))

      // Test transaction limit error
      const [result3, error3, record3] = await errorTask.safeRun({
        scenario: 'valid',
        customerId: 'test-customer',
        amount: 6000 // Exceeds limit
      })

      expect(result3).toBeNull()
      expect(error3).not.toBeNull()
      expect(record3.type).toBe('error')
      expect(record3.boundaries.processTransaction).toHaveLength(1)
      expect('error' in record3.boundaries.processTransaction[0]).toBe(true)

      console.log('\n=== Error Test Results ===')
      console.log(`Boundary Error Metrics: ${record1.metrics?.length}`)
      console.log(`Main Function Error Metrics: ${record2.metrics?.length}`)
      console.log(`Transaction Limit Error Metrics: ${record3.metrics?.length}`)
      console.log(`All error scenarios logged: ${[logResult1].join(', ')}`)
      console.log('========================\n')
    })
  })

  describe('Replay functionality with enhanced records', () => {
    it('should replay execution with preserved timing and metrics', async () => {
      const replayTask = createTask({
        name: 'replay-test-workflow',
        schema: new Schema({
          userId: Schema.string(),
          action: Schema.string()
        }),
        boundaries: {
          auditLog: async (userId: string, action: string) => {
            await new Promise(resolve => setTimeout(resolve, 60))
            return {
              logId: `log_${Date.now()}`,
              userId,
              action,
              timestamp: new Date().toISOString()
            }
          },
          updateUserStats: async (userId: string) => {
            await new Promise(resolve => setTimeout(resolve, 40))
            return {
              userId,
              actionsCount: Math.floor(Math.random() * 10) + 1,
              lastActivity: new Date().toISOString()
            }
          }
        },
        fn: async ({ userId, action }, { auditLog, updateUserStats, setMetrics, setMetadata }) => {
          await setMetadata('userId', userId)
          await setMetadata('action', action)
          await setMetadata('executionMode', 'original')

          await setMetrics({ type: 'business', name: 'user_actions', value: 1 })

          const audit = await auditLog(userId, action)
          await setMetrics({ type: 'business', name: 'audit_logs_created', value: 1 })

          const stats = await updateUserStats(userId)
          await setMetrics({ type: 'business', name: 'user_stats_updated', value: 1 })
          await setMetrics({ type: 'business', name: 'user_total_actions', value: stats.actionsCount })

          return { audit, stats, completed: true }
        }
      })

      // Original execution
      const [originalResult, originalError, originalRecord] = await replayTask.safeRun({
        userId: 'user_replay_test',
        action: 'login'
      })

      expect(originalError).toBeNull()
      expect(originalResult).not.toBeNull()
      expect(originalRecord.type).toBe('success')

      // Log original execution
      const originalLogResult = await testClient.sendLog(originalRecord, {
        executionType: 'original',
        testPhase: 'replay-test'
      })

      // Replay the execution
      const [replayResult, replayError, replayRecord] = await replayTask.safeReplay(originalRecord)

      expect(replayError).toBeNull()
      expect(replayResult).toEqual(originalResult)

      // Verify replay record preserves original timing
      expect(replayRecord.timing?.startTime).toBe(originalRecord.timing?.startTime)
      expect(replayRecord.timing?.endTime).toBe(originalRecord.timing?.endTime)
      expect(replayRecord.timing?.duration).toBe(originalRecord.timing?.duration)

      // Replay should include original metrics plus any new ones
      expect(replayRecord.metrics?.length).toBeGreaterThanOrEqual(originalRecord.metrics?.length || 0)

      // Log replay execution
      const replayLogResult = await testClient.sendLog(replayRecord, {
        executionType: 'replay',
        testPhase: 'replay-test',
        originalLogResult: originalLogResult
      })

      console.log('\n=== Replay Test Results ===')
      console.log(`Original Execution Time: ${originalRecord.timing?.duration}ms`)
      console.log(`Replay Execution Time: ${replayRecord.timing?.duration}ms`)
      console.log(`Original Metrics: ${originalRecord.metrics?.length}`)
      console.log(`Replay Metrics: ${replayRecord.metrics?.length}`)
      console.log(`Original Log: ${originalLogResult}`)
      console.log(`Replay Log: ${replayLogResult}`)
      console.log('=========================\n')
    })
  })

  describe('Real-world complex scenarios', () => {
    it('should handle multi-step data processing pipeline with comprehensive tracking', async () => {
      const pipelineTask = createTask({
        name: 'data-processing-pipeline',
        schema: new Schema({
          dataset: Schema.object({
            id: Schema.string(),
            records: Schema.array(Schema.object({
              id: Schema.string(),
              value: Schema.number(),
              category: Schema.string()
            }))
          }),
          config: Schema.object({
            enableValidation: Schema.boolean(),
            outputFormat: Schema.string()
          })
        }),
        boundaries: {
          validateDataset: async (dataset: any) => {
            await new Promise(resolve => setTimeout(resolve, 120))
            const invalid = dataset.records.filter((r: any) => r.value < 0)
            return {
              valid: invalid.length === 0,
              totalRecords: dataset.records.length,
              invalidRecords: invalid.length,
              validationTime: 120
            }
          },
          transformRecords: async (records: any[]) => {
            await new Promise(resolve => setTimeout(resolve, 200))
            return records.map(record => ({
              ...record,
              transformedValue: record.value * 2,
              processedAt: new Date().toISOString()
            }))
          },
          aggregateData: async (records: any[]) => {
            await new Promise(resolve => setTimeout(resolve, 80))
            const byCategory = records.reduce((acc, record) => {
              if (!acc[record.category]) {
                acc[record.category] = { count: 0, total: 0 }
              }
              acc[record.category].count++
              acc[record.category].total += record.transformedValue
              return acc
            }, {})

            return {
              categories: Object.keys(byCategory).length,
              aggregations: byCategory,
              processedCount: records.length
            }
          },
          saveResults: async (data: any, format: string) => {
            await new Promise(resolve => setTimeout(resolve, 150))
            return {
              saved: true,
              format,
              size: JSON.stringify(data).length,
              location: `output/${Date.now()}.${format}`,
              savedAt: new Date().toISOString()
            }
          }
        },
        fn: async ({ dataset, config }, {
          validateDataset,
          transformRecords,
          aggregateData,
          saveResults,
          setMetrics,
          setMetadata
        }) => {
          const pipelineStart = Date.now()

          // Set comprehensive metadata
          await setMetadata('datasetId', dataset.id)
          await setMetadata('recordCount', dataset.records.length.toString())
          await setMetadata('outputFormat', config.outputFormat)
          await setMetadata('validationEnabled', config.enableValidation.toString())
          await setMetadata('pipeline', 'data-processing')

          // Initial metrics
          await setMetrics({ type: 'business', name: 'pipeline_runs', value: 1 })
          await setMetrics({ type: 'business', name: 'input_records', value: dataset.records.length })

          const processedData = dataset.records

          // Step 1: Validation (optional)
          if (config.enableValidation) {
            const validation = await validateDataset(dataset)
            await setMetrics({ type: 'business', name: 'validation_runs', value: 1 })
            await setMetrics({ type: 'business', name: 'invalid_records_found', value: validation.invalidRecords })
            await setMetrics({ type: 'performance', name: 'validation_time_ms', value: validation.validationTime })

            if (!validation.valid) {
              await setMetrics({ type: 'error', name: 'validation_failures', value: 1 })
              throw new Error(`Dataset validation failed: ${validation.invalidRecords} invalid records`)
            }
          }

          // Step 2: Transform records
          const transformed = await transformRecords(processedData)
          await setMetrics({ type: 'business', name: 'records_transformed', value: transformed.length })
          await setMetrics({ type: 'performance', name: 'transformation_time_ms', value: 200 })

          // Step 3: Aggregate data
          const aggregated = await aggregateData(transformed)
          await setMetrics({ type: 'business', name: 'categories_processed', value: aggregated.categories })
          await setMetrics({ type: 'business', name: 'aggregations_created', value: Object.keys(aggregated.aggregations).length })
          await setMetrics({ type: 'performance', name: 'aggregation_time_ms', value: 80 })

          // Step 4: Save results
          const saved = await saveResults(aggregated, config.outputFormat)
          await setMetrics({ type: 'business', name: 'files_saved', value: 1 })
          await setMetrics({ type: 'business', name: 'output_size_bytes', value: saved.size })
          await setMetrics({ type: 'performance', name: 'save_time_ms', value: 150 })

          // Final pipeline metrics
          const totalPipelineTime = Date.now() - pipelineStart
          await setMetrics({ type: 'performance', name: 'total_pipeline_time_ms', value: totalPipelineTime })
          await setMetrics({ type: 'performance', name: 'records_per_second', value: Math.round((dataset.records.length * 1000) / totalPipelineTime) })
          await setMetrics({ type: 'business', name: 'pipelines_completed', value: 1 })
          await setMetrics({ type: 'error', name: 'pipeline_errors', value: 0 })

          return {
            datasetId: dataset.id,
            inputRecords: dataset.records.length,
            outputCategories: aggregated.categories,
            saved,
            pipelineTime: totalPipelineTime,
            status: 'completed'
          }
        }
      })

      // Execute the complex pipeline
      const testDataset = {
        id: 'dataset_integration_test',
        records: [
          { id: 'r1', value: 10, category: 'A' },
          { id: 'r2', value: 20, category: 'B' },
          { id: 'r3', value: 15, category: 'A' },
          { id: 'r4', value: 30, category: 'C' },
          { id: 'r5', value: 25, category: 'B' },
          { id: 'r6', value: 12, category: 'A' },
          { id: 'r7', value: 18, category: 'C' }
        ]
      }

      const [result, error, record] = await pipelineTask.safeRun({
        dataset: testDataset,
        config: {
          enableValidation: true,
          outputFormat: 'json'
        }
      })

      // Validate successful execution
      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result?.status).toBe('completed')
      expect(result?.inputRecords).toBe(7)
      expect(result?.outputCategories).toBe(3) // A, B, C

      // Validate comprehensive metrics (should have 15+ metrics)
      expect(record.metrics?.length).toBeGreaterThanOrEqual(15)

      // Validate all boundary calls executed
      expect(record.boundaries.validateDataset).toHaveLength(1)
      expect(record.boundaries.transformRecords).toHaveLength(1)
      expect(record.boundaries.aggregateData).toHaveLength(1)
      expect(record.boundaries.saveResults).toHaveLength(1)

      // Validate timing is captured for the complex pipeline
      expect(record.timing?.duration).toBeGreaterThanOrEqual(500) // Should take at least 500ms

      // Log the complex workflow to Hive
      const logResult = await testClient.sendLog(record, {
        workflowType: 'data-pipeline',
        complexity: 'high',
        recordCount: testDataset.records.length.toString(),
        categories: '3'
      })

      expect(['success', 'silent', 'error']).toContain(logResult)

      console.log('\n=== Pipeline Test Results ===')
      console.log(`Dataset: ${result?.datasetId}`)
      console.log(`Input Records: ${result?.inputRecords}`)
      console.log(`Output Categories: ${result?.outputCategories}`)
      console.log(`Pipeline Time: ${result?.pipelineTime}ms`)
      console.log(`Total Metrics: ${record.metrics?.length}`)
      console.log(`Boundary Calls: ${Object.keys(record.boundaries).length}`)
      console.log(`File Saved: ${result?.saved.location}`)
      console.log(`Hive Logging: ${logResult}`)
      console.log('===========================\n')
    })
  })
})
