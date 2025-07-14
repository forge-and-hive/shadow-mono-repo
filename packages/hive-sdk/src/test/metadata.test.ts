import axios from 'axios'
import { HiveLogClient, createHiveLogClient, Metadata } from '../index'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('HiveLogClient Metadata', () => {
  const testConfig = {
    projectName: 'test-project',
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    host: 'https://test-host.com'
  }

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
  })

  describe('Constructor with base metadata', () => {
    it('should create client without base metadata', () => {
      const client = new HiveLogClient(testConfig)
      expect(client).toBeInstanceOf(HiveLogClient)
      expect(client.isActive()).toBe(true)
    })

    it('should create client with base metadata', () => {
      const baseMetadata: Metadata = {
        environment: 'production',
        version: '1.0.0',
        service: 'test-service'
      }

      const client = new HiveLogClient({ ...testConfig, metadata: baseMetadata })
      expect(client).toBeInstanceOf(HiveLogClient)
      expect(client.isActive()).toBe(true)
    })

    it('should handle empty base metadata object', () => {
      const client = new HiveLogClient({ ...testConfig, metadata: {} })
      expect(client).toBeInstanceOf(HiveLogClient)
      expect(client.isActive()).toBe(true)
    })

    it('should handle undefined base metadata', () => {
      const client = new HiveLogClient({ ...testConfig, metadata: undefined })
      expect(client).toBeInstanceOf(HiveLogClient)
      expect(client.isActive()).toBe(true)
    })
  })

  describe('createHiveLogClient factory with metadata', () => {
    it('should create client without base metadata', () => {
      const client = createHiveLogClient(testConfig)
      expect(client).toBeInstanceOf(HiveLogClient)
    })

    it('should create client with base metadata', () => {
      const baseMetadata: Metadata = {
        environment: 'development',
        team: 'backend'
      }

      const client = createHiveLogClient({ ...testConfig, metadata: baseMetadata })
      expect(client).toBeInstanceOf(HiveLogClient)
    })
  })

  describe('sendLog with metadata parameter', () => {
    let client: HiveLogClient

    beforeEach(() => {
      client = new HiveLogClient(testConfig)
    })

    it('should send log without metadata parameter', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const executionRecord = {
        input: 'test-input',
        output: 'test-output',
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {}
      }
      const result = await client.sendLog(executionRecord)

      expect(result).toBe('success')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify({
            taskName: 'test-task',
            input: 'test-input',
            output: 'test-output',
            error: undefined,
            boundaries: {},
            metadata: {}
          })
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key:test-api-secret',
            'Content-Type': 'application/json'
          }
        }
      )
    })

    it('should send log with metadata parameter', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const executionRecord = {
        input: 'test-input',
        output: 'test-output',
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {}
      }
      const metadata: Metadata = {
        requestId: 'req-123',
        userId: 'user-456'
      }

      const result = await client.sendLog(executionRecord, metadata)

      expect(result).toBe('success')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify({
            taskName: 'test-task',
            input: 'test-input',
            output: 'test-output',
            error: undefined,
            boundaries: {},
            metadata: {
              requestId: 'req-123',
              userId: 'user-456'
            }
          })
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key:test-api-secret',
            'Content-Type': 'application/json'
          }
        }
      )
    })

    it('should handle logItem with only input property', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const metadata: Metadata = { type: 'minimal' }
      const result = await client.sendLog({ input: 'simple input', taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: {} }, metadata)

      expect(result).toBe('success')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify({
            taskName: 'test-task',
            input: 'simple input',
            error: undefined,
            boundaries: {},
            metadata: { type: 'minimal' }
          })
        },
        expect.any(Object)
      )
    })

    it('should handle logItem with null input values', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const metadata: Metadata = { type: 'null-test' }
      const result = await client.sendLog({ input: null, taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: {} }, metadata)

      expect(result).toBe('success')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify({
            taskName: 'test-task',
            input: null,
            error: undefined,
            boundaries: {},
            metadata: { type: 'null-test' }
          })
        },
        expect.any(Object)
      )
    })
  })

  describe('Metadata priority system', () => {
    it('should use only base metadata when no other metadata provided', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const baseMetadata: Metadata = {
        environment: 'production',
        version: '1.0.0'
      }

      const client = new HiveLogClient({ ...testConfig, metadata: baseMetadata })
      const logItem = { input: 'test' }

      await client.sendLog({ ...logItem, taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: {} })

      const expectedLogItem = {
        taskName: 'test-task',
        input: 'test',
        error: undefined,
        boundaries: {},
        metadata: {
          environment: 'production',
          version: '1.0.0'
        }
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify(expectedLogItem)
        },
        expect.any(Object)
      )
    })

    it('should merge logItem metadata with base metadata', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const baseMetadata: Metadata = {
        environment: 'production',
        version: '1.0.0'
      }

      const client = new HiveLogClient({ ...testConfig, metadata: baseMetadata })
      const logItem = {
        input: 'test',
        metadata: {
          sessionId: 'session-123',
          version: '1.1.0' // This should override base version
        }
      }

      await client.sendLog({ ...logItem, taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: logItem.metadata || {} })

      const expectedLogItem = {
        taskName: 'test-task',
        input: 'test',
        error: undefined,
        boundaries: {},
        metadata: {
          environment: 'production', // from base
          version: '1.1.0',          // from logItem (overrides base)
          sessionId: 'session-123'   // from logItem
        }
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify(expectedLogItem)
        },
        expect.any(Object)
      )
    })

    it('should give sendLog metadata highest priority', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const baseMetadata: Metadata = {
        environment: 'production',
        version: '1.0.0',
        priority: 'base'
      }

      const client = new HiveLogClient({ ...testConfig, metadata: baseMetadata })
      const logItem = {
        input: 'test',
        metadata: {
          sessionId: 'session-123',
          version: '1.1.0',
          priority: 'logItem'
        }
      }

      const sendLogMetadata: Metadata = {
        requestId: 'req-456',
        version: '1.2.0',
        priority: 'sendLog'
      }

      await client.sendLog({ ...logItem, taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: logItem.metadata || {} }, sendLogMetadata)

      const expectedLogItem = {
        taskName: 'test-task',
        input: 'test',
        error: undefined,
        boundaries: {},
        metadata: {
          environment: 'production',  // from base
          version: '1.2.0',           // from sendLog (highest priority)
          priority: 'sendLog',        // from sendLog (highest priority)
          sessionId: 'session-123',   // from logItem
          requestId: 'req-456'        // from sendLog
        }
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify(expectedLogItem)
        },
        expect.any(Object)
      )
    })

    it('should handle all three metadata sources with complex merging', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const baseMetadata: Metadata = {
        environment: 'production',
        service: 'api-gateway',
        version: '1.0.0',
        datacenter: 'us-west-2'
      }

      const client = new HiveLogClient({ ...testConfig, metadata: baseMetadata })
      const logItem = {
        input: { query: 'search' },
        output: { results: [] },
        metadata: {
          algorithm: 'fuzzy-search',
          processingTime: '250',
          version: '1.1.0'  // overrides base
        }
      }

      const sendLogMetadata: Metadata = {
        requestId: 'req-789',
        userId: 'user-123',
        version: '1.2.0'  // overrides both base and logItem
      }

      await client.sendLog({ ...logItem, taskName: 'search-task', type: 'success' as const, boundaries: {}, metadata: logItem.metadata || {} }, sendLogMetadata)

      const expectedLogItem = {
        taskName: 'search-task',
        input: { query: 'search' },
        output: { results: [] },
        error: undefined,
        boundaries: {},
        metadata: {
          environment: 'production',    // from base
          service: 'api-gateway',       // from base
          version: '1.2.0',             // from sendLog (highest priority)
          datacenter: 'us-west-2',      // from base
          algorithm: 'fuzzy-search',    // from logItem
          processingTime: '250',        // from logItem
          requestId: 'req-789',         // from sendLog
          userId: 'user-123'            // from sendLog
        }
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'search-task',
          logItem: JSON.stringify(expectedLogItem)
        },
        expect.any(Object)
      )
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle logItem without metadata property', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const baseMetadata: Metadata = { environment: 'test' }
      const client = new HiveLogClient({ ...testConfig, metadata: baseMetadata })

      const logItem = {
        input: 'test'
        // No metadata property
      }

      await client.sendLog({ ...logItem, taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: {} })

      const expectedLogItem = {
        taskName: 'test-task',
        input: 'test',
        error: undefined,
        boundaries: {},
        metadata: {
          environment: 'test' // Only base metadata should be used
        }
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify(expectedLogItem)
        },
        expect.any(Object)
      )
    })

    it('should handle logItem with undefined metadata', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const baseMetadata: Metadata = { environment: 'test' }
      const client = new HiveLogClient({ ...testConfig, metadata: baseMetadata })

      const logItem = {
        input: 'test',
        metadata: undefined
      }

      await client.sendLog({ ...logItem, taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: logItem.metadata || {} })

      const expectedLogItem = {
        taskName: 'test-task',
        input: 'test',
        error: undefined,
        boundaries: {},
        metadata: {
          environment: 'test' // Only base metadata should be used
        }
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify(expectedLogItem)
        },
        expect.any(Object)
      )
    })

    it('should handle empty metadata objects', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const client = new HiveLogClient({ ...testConfig, metadata: {} })
      const logItem = { input: 'test', metadata: {} }

      await client.sendLog({ ...logItem, taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: logItem.metadata || {} }, {})

      const expectedLogItem = {
        taskName: 'test-task',
        input: 'test',
        error: undefined,
        boundaries: {},
        metadata: {} // All empty metadata objects result in empty final metadata
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify(expectedLogItem)
        },
        expect.any(Object)
      )
    })

    it('should work in silent mode with metadata', async () => {
      const baseMetadata: Metadata = { environment: 'test' }
      const silentClient = new HiveLogClient({ projectName: 'silent-project', metadata: baseMetadata })

      const result = await silentClient.sendLog({ input: 'test', taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: {} }, { requestId: 'req-123' })

      expect(result).toBe('silent')
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('should handle network errors with metadata', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const baseMetadata: Metadata = { environment: 'test' }
      const client = new HiveLogClient({ ...testConfig, metadata: baseMetadata })

      const result = await client.sendLog({ input: 'test', taskName: 'test-task', type: 'success' as const, boundaries: {}, metadata: {} }, { requestId: 'req-123' })

      expect(result).toBe('error')
    })
  })
})
