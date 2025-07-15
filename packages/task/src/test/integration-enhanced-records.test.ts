import { createTask } from '../index'
import { Schema } from '@forgehive/schema'

describe('Integration Tests for Enhanced Execution Records', () => {
  describe('Complete task execution with timing and metrics', () => {
    it('should create comprehensive execution record with all enhanced fields', async () => {
      const task = createTask({
        name: 'comprehensive-integration-test',
        description: 'Test task for comprehensive execution record validation',
        schema: new Schema({
          userId: Schema.string(),
          operations: Schema.array(Schema.string()),
          enableMetrics: Schema.boolean().optional()
        }),
        boundaries: {
          fetchUser: async (userId: string) => {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 50))
            return { id: userId, name: `User-${userId}`, active: true }
          },
          processData: async (data: string) => {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 30))
            return data.toUpperCase()
          },
          saveResult: async (result: any) => {
            // Simulate save delay
            await new Promise(resolve => setTimeout(resolve, 20))
            return { saved: true, id: `result-${Date.now()}` }
          }
        },
        fn: async ({ userId, operations, enableMetrics = true }, { fetchUser, processData, saveResult, setMetrics, setMetadata }) => {
          const startTime = Date.now()

          // Set metadata
          await setMetadata('userId', userId)
          await setMetadata('operationCount', operations.length.toString())
          await setMetadata('environment', 'integration-test')

          if (enableMetrics) {
            await setMetrics({ type: 'business', name: 'requests', value: 1 })
            await setMetrics({ type: 'business', name: 'input_operations', value: operations.length })
          }

          // Fetch user data
          const user = await fetchUser(userId)
          if (enableMetrics) {
            await setMetrics({ type: 'performance', name: 'user_fetch_time', value: 50 })
          }

          // Process each operation
          const processedResults = []
          for (const operation of operations) {
            const processed = await processData(operation)
            processedResults.push(processed)

            if (enableMetrics) {
              await setMetrics({ type: 'business', name: 'operations_processed', value: 1 })
            }
          }

          // Save results
          const saveResult_ = await saveResult({ user, processed: processedResults })

          const totalTime = Date.now() - startTime
          if (enableMetrics) {
            await setMetrics({ type: 'performance', name: 'total_execution_time', value: totalTime })
            await setMetrics({ type: 'error', name: 'errors_encountered', value: 0 })
          }

          return {
            user,
            processedOperations: processedResults,
            saveResult: saveResult_,
            executionTime: totalTime
          }
        }
      })

      const [result, error, record] = await task.safeRun({
        userId: 'test-user-123',
        operations: ['operation1', 'operation2', 'operation3'],
        enableMetrics: true
      })

      // Validate successful execution
      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result?.user).toEqual({ id: 'test-user-123', name: 'User-test-user-123', active: true })
      expect(result?.processedOperations).toEqual(['OPERATION1', 'OPERATION2', 'OPERATION3'])
      expect(result?.saveResult.saved).toBe(true)

      // Validate enhanced execution record structure
      expect(record).toEqual(expect.objectContaining({
        input: expect.any(Object),
        output: expect.any(Object),
        error: undefined,
        boundaries: expect.any(Object),
        taskName: 'comprehensive-integration-test',
        metadata: expect.any(Object),
        metrics: expect.any(Array),
        timing: expect.any(Object),
        type: 'success'
      }))

      // Validate timing information
      expect(record.timing).toEqual(expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }))
      expect(record.timing?.duration).toBeGreaterThanOrEqual(100) // Should take at least 100ms total
      expect(record.timing?.duration).toBeLessThan(300) // But not too long

      // Validate metrics collection
      expect(record.metrics).toHaveLength(8) // 2 + 3 + 3 = 8 metrics
      expect(record.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'requests', value: 1 },
        { type: 'business', name: 'input_operations', value: 3 },
        { type: 'performance', name: 'user_fetch_time', value: 50 },
        { type: 'business', name: 'operations_processed', value: 1 },
        { type: 'performance', name: 'total_execution_time', value: expect.any(Number) },
        { type: 'error', name: 'errors_encountered', value: 0 }
      ]))

      // Validate metadata
      expect(record.metadata).toEqual(expect.objectContaining({
        userId: 'test-user-123',
        operationCount: '3',
        environment: 'integration-test'
      }))

      // Validate boundary timing
      expect(record.boundaries.fetchUser).toHaveLength(1)
      expect(record.boundaries.fetchUser[0]).toEqual(expect.objectContaining({
        input: ['test-user-123'],
        output: { id: 'test-user-123', name: 'User-test-user-123', active: true },
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      }))

      expect(record.boundaries.processData).toHaveLength(3)
      record.boundaries.processData.forEach((call, index) => {
        expect(call).toEqual(expect.objectContaining({
          input: [['operation1', 'operation2', 'operation3'][index]],
          output: [['OPERATION1', 'OPERATION2', 'OPERATION3'][index]],
          timing: expect.objectContaining({
            startTime: expect.any(Number),
            endTime: expect.any(Number),
            duration: expect.any(Number)
          })
        }))
      })

      expect(record.boundaries.saveResult).toHaveLength(1)
      expect(record.boundaries.saveResult[0]).toEqual(expect.objectContaining({
        input: expect.any(Array),
        output: expect.objectContaining({ saved: true }),
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      }))
    })

    it('should handle error scenarios with complete execution record', async () => {
      const task = createTask({
        name: 'error-integration-test',
        schema: new Schema({ shouldFail: Schema.boolean(), failAt: Schema.string() }),
        boundaries: {
          operation1: async () => {
            await new Promise(resolve => setTimeout(resolve, 20))
            return 'op1-success'
          },
          operation2: async (shouldFail: boolean) => {
            await new Promise(resolve => setTimeout(resolve, 30))
            if (shouldFail) {
              throw new Error('Operation 2 failed')
            }
            return 'op2-success'
          }
        },
        fn: async ({ shouldFail, failAt }, { operation1, operation2, setMetrics, setMetadata }) => {
          await setMetadata('testType', 'error-handling')
          await setMetrics({ type: 'business', name: 'test_runs', value: 1 })

          const result1 = await operation1()
          await setMetrics({ type: 'business', name: 'op1_completed', value: 1 })

          if (failAt === 'main') {
            await setMetrics({ type: 'error', name: 'main_function_errors', value: 1 })
            throw new Error('Main function error')
          }

          const result2 = await operation2(shouldFail)
          await setMetrics({ type: 'business', name: 'op2_completed', value: 1 })

          return { result1, result2 }
        }
      })

      // Test boundary error
      const [result1, error1, record1] = await task.safeRun({ shouldFail: true, failAt: 'boundary' })

      expect(result1).toBeNull()
      expect(error1).not.toBeNull()
      expect(record1.type).toBe('error')
      expect(record1.timing).toBeDefined() // Should have timing even on error
      expect(record1.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'test_runs', value: 1 },
        { type: 'business', name: 'op1_completed', value: 1 }
      ]))
      expect(record1.boundaries.operation1).toHaveLength(1)
      expect(record1.boundaries.operation2).toHaveLength(1)
      expect('error' in record1.boundaries.operation2[0]).toBe(true)

      // Test main function error
      const [result2, error2, record2] = await task.safeRun({ shouldFail: false, failAt: 'main' })

      expect(result2).toBeNull()
      expect(error2).not.toBeNull()
      expect(record2.type).toBe('error')
      expect(record2.timing).toBeDefined()
      expect(record2.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'test_runs', value: 1 },
        { type: 'business', name: 'op1_completed', value: 1 },
        { type: 'error', name: 'main_function_errors', value: 1 }
      ]))
    })
  })

  describe('Cross-package compatibility between task and hive-sdk', () => {
    it('should maintain type compatibility with hive-sdk ExecutionRecord', async () => {
      // This test ensures that ExecutionRecord from task package is compatible with hive-sdk
      const task = createTask({
        name: 'hive-sdk-compatibility-test',
        schema: new Schema({ testData: Schema.string() }),
        boundaries: {
          mockApi: async (data: string) => {
            await new Promise(resolve => setTimeout(resolve, 25))
            return { processed: data, timestamp: Date.now() }
          }
        },
        fn: async ({ testData }, { mockApi, setMetrics, setMetadata }) => {
          await setMetadata('source', 'compatibility-test')
          await setMetadata('version', '1.0.0')

          await setMetrics({ type: 'business', name: 'api_calls', value: 1 })

          const result = await mockApi(testData)

          await setMetrics({ type: 'performance', name: 'api_response_time', value: 25 })

          return { result, completed: true }
        }
      })

      const [result, error, record] = await task.safeRun({ testData: 'compatibility-test-data' })

      expect(error).toBeNull()
      expect(result).not.toBeNull()

      // Verify the record has all the fields expected by hive-sdk
      expect(record).toEqual(expect.objectContaining({
        input: expect.any(Object),
        output: expect.any(Object),
        boundaries: expect.any(Object),
        taskName: expect.any(String),
        metadata: expect.any(Object),
        type: expect.stringMatching(/^(success|error|pending)$/)
      }))

      // Verify enhanced fields are present
      expect(record.timing).toBeDefined()
      expect(record.metrics).toBeDefined()
      expect(Array.isArray(record.metrics)).toBe(true)

      // Simulate what hive-sdk would do - serialize and parse the record
      const serialized = JSON.stringify(record)
      const parsed = JSON.parse(serialized)

      // Verify serialization preserves all fields
      expect(parsed.input).toEqual(record.input)
      expect(parsed.output).toEqual(record.output)
      expect(parsed.boundaries).toEqual(record.boundaries)
      expect(parsed.taskName).toBe(record.taskName)
      expect(parsed.metadata).toEqual(record.metadata)
      expect(parsed.metrics).toEqual(record.metrics)
      expect(parsed.timing).toEqual(record.timing)
      expect(parsed.type).toBe(record.type)
    })

    it('should work with hive-sdk style metadata merging', async () => {
      const task = createTask({
        name: 'metadata-merging-test',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {},
        fn: async ({ input }, { setMetadata, setMetrics }) => {
          await setMetadata('taskLevel', 'metadata')
          await setMetadata('priority', 'high')
          await setMetrics({ type: 'business', name: 'executions', value: 1 })
          return { processed: input }
        }
      })

      const [result, error, record] = await task.safeRun({ input: 'test' })

      expect(error).toBeNull()
      expect(result).toEqual({ processed: 'test' })

      // Simulate hive-sdk metadata merging behavior
      const clientMetadata = { environment: 'test', version: '1.0' }
      const sendLogMetadata = { requestId: 'req-123', userId: 'user-456' }

      const mergedMetadata = {
        ...clientMetadata,
        ...record.metadata,
        ...sendLogMetadata
      }

      expect(mergedMetadata).toEqual({
        environment: 'test',
        version: '1.0',
        taskLevel: 'metadata',
        priority: 'high',
        requestId: 'req-123',
        userId: 'user-456'
      })

      // Verify the complete record structure that would be sent to hive-sdk
      const hiveRecord = {
        ...record,
        metadata: mergedMetadata
      }

      expect(hiveRecord).toEqual(expect.objectContaining({
        input: { input: 'test' },
        output: { processed: 'test' },
        taskName: 'metadata-merging-test',
        metadata: mergedMetadata,
        metrics: [{ type: 'business', name: 'executions', value: 1 }],
        timing: expect.any(Object),
        type: 'success'
      }))
    })
  })

  describe('Serialization and deserialization of enhanced execution records', () => {
    it('should properly serialize and deserialize complete execution records', async () => {
      const task = createTask({
        name: 'serialization-test',
        schema: new Schema({
          data: Schema.object({
            values: Schema.array(Schema.number()),
            metadata: Schema.object({ type: Schema.string() })
          })
        }),
        boundaries: {
          processArray: async (values: number[]) => {
            await new Promise(resolve => setTimeout(resolve, 40))
            return values.map(v => v * 2)
          },
          validateData: async (data: any) => {
            await new Promise(resolve => setTimeout(resolve, 20))
            return data.values.every((v: number) => v > 0)
          }
        },
        fn: async ({ data }, { processArray, validateData, setMetrics, setMetadata }) => {
          await setMetadata('dataType', data.metadata.type)
          await setMetadata('arrayLength', data.values.length.toString())

          await setMetrics({ type: 'business', name: 'data_processed', value: 1 })
          await setMetrics({ type: 'business', name: 'array_size', value: data.values.length })

          const isValid = await validateData(data)
          await setMetrics({ type: 'business', name: 'validation_result', value: isValid ? 1 : 0 })

          const processed = await processArray(data.values)
          await setMetrics({ type: 'performance', name: 'processing_time', value: 40 })

          return { processed, valid: isValid, originalData: data }
        }
      })

      const inputData = {
        data: {
          values: [1, 2, 3, 4, 5],
          metadata: { type: 'numeric-array' }
        }
      }

      const [result, error, record] = await task.safeRun(inputData)

      expect(error).toBeNull()
      expect(result).not.toBeNull()

      // Serialize the complete record
      const serialized = JSON.stringify(record)
      expect(typeof serialized).toBe('string')
      expect(serialized.length).toBeGreaterThan(0)

      // Deserialize and verify all fields are preserved
      const deserialized = JSON.parse(serialized)

      // Verify basic structure
      expect(deserialized.input).toEqual(inputData)
      expect(deserialized.output).toEqual(result)
      expect(deserialized.type).toBe('success')
      expect(deserialized.taskName).toBe('serialization-test')

      // Verify metadata
      expect(deserialized.metadata).toEqual({
        dataType: 'numeric-array',
        arrayLength: '5'
      })

      // Verify metrics
      expect(deserialized.metrics).toHaveLength(4)
      expect(deserialized.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'data_processed', value: 1 },
        { type: 'business', name: 'array_size', value: 5 },
        { type: 'business', name: 'validation_result', value: 1 },
        { type: 'performance', name: 'processing_time', value: 40 }
      ]))

      // Verify timing
      expect(deserialized.timing).toEqual(expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }))

      // Verify boundary data with timing
      expect(deserialized.boundaries.processArray).toHaveLength(1)
      expect(deserialized.boundaries.processArray[0]).toEqual(expect.objectContaining({
        input: [[1, 2, 3, 4, 5]],
        output: [2, 4, 6, 8, 10],
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      }))

      expect(deserialized.boundaries.validateData).toHaveLength(1)
      expect(deserialized.boundaries.validateData[0]).toEqual(expect.objectContaining({
        input: [inputData.data],
        output: true,
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      }))
    })

    it('should handle serialization of records with complex boundary data', async () => {
      const task = createTask({
        name: 'complex-serialization-test',
        schema: new Schema({ requests: Schema.array(Schema.string()) }),
        boundaries: {
          fetchData: async (request: string) => {
            await new Promise(resolve => setTimeout(resolve, 15))
            return {
              id: request,
              data: { items: [1, 2, 3], nested: { value: request.length } },
              timestamp: Date.now()
            }
          },
          aggregateResults: async (results: any[]) => {
            await new Promise(resolve => setTimeout(resolve, 25))
            return {
              totalItems: results.reduce((sum, r) => sum + r.data.items.length, 0),
              resultCount: results.length,
              summary: { processed: true, avgValue: 2 }
            }
          }
        },
        fn: async ({ requests }, { fetchData, aggregateResults, setMetrics }) => {
          await setMetrics({ type: 'business', name: 'batch_size', value: requests.length })

          const results = []
          for (const request of requests) {
            const data = await fetchData(request)
            results.push(data)
            await setMetrics({ type: 'business', name: 'items_fetched', value: data.data.items.length })
          }

          const aggregated = await aggregateResults(results)
          await setMetrics({ type: 'performance', name: 'aggregation_score', value: aggregated.summary.avgValue })

          return { results, aggregated }
        }
      })

      const [result, error, record] = await task.safeRun({
        requests: ['req1', 'req2', 'req3']
      })

      expect(error).toBeNull()
      expect(result).not.toBeNull()

      // Serialize and deserialize
      const serialized = JSON.stringify(record)
      const deserialized = JSON.parse(serialized)

      // Verify complex nested data structures are preserved
      expect(deserialized.boundaries.fetchData).toHaveLength(3)
      deserialized.boundaries.fetchData.forEach((call: any, index: number) => {
        expect(call.output).toEqual(expect.objectContaining({
          id: `req${index + 1}`,
          data: { items: [1, 2, 3], nested: { value: 4 } },
          timestamp: expect.any(Number)
        }))
        expect(call.timing).toEqual(expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        }))
      })

      expect(deserialized.boundaries.aggregateResults).toHaveLength(1)
      expect(deserialized.boundaries.aggregateResults[0].output).toEqual({
        totalItems: 9,
        resultCount: 3,
        summary: { processed: true, avgValue: 2 }
      })

      // Verify that the deserialized record could be used for replay
      expect(deserialized).toEqual(expect.objectContaining({
        input: expect.any(Object),
        output: expect.any(Object),
        boundaries: expect.any(Object),
        taskName: expect.any(String),
        metadata: expect.any(Object),
        metrics: expect.any(Array),
        timing: expect.any(Object),
        type: 'success'
      }))
    })
  })
})
