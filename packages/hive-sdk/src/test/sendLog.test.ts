import axios from 'axios'
import { HiveLogClient } from '../index'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('HiveLogClient sendLog with ExecutionRecord', () => {
  let client: HiveLogClient

  const testConfig = {
    projectName: 'test-project',
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    host: 'https://test-host.com'
  }

  beforeEach(() => {
    // Create client instance with config
    client = new HiveLogClient(testConfig)

    // Clear all mocks
    jest.clearAllMocks()
  })

  describe('successful sendLog with ExecutionRecord', () => {
    it('should send log successfully with ExecutionRecord and return success', async () => {
      // Mock successful axios response
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const executionRecord = {
        input: { value: 'test-input' },
        output: { result: 'test-output' },
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {}
      }

      const result = await client.sendLog(executionRecord)

      expect(result).toBe('success')
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify({
            input: { value: 'test-input' },
            output: { result: 'test-output' },
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

    it('should handle ExecutionRecord with complex boundaries', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const executionRecord = {
        input: { userId: 123, action: 'login' },
        output: { success: true, sessionId: 'abc123' },
        taskName: 'complex-task',
        type: 'success' as const,
        boundaries: {
          database: [{ input: 'SELECT * FROM users', output: [{ id: 123 }], error: null }],
          api: [{ input: { endpoint: '/auth' }, output: { token: 'jwt123' }, error: null }]
        },
        metadata: { environment: 'test' }
      }

      const result = await client.sendLog(executionRecord)

      expect(result).toBe('success')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'complex-task',
          logItem: JSON.stringify({
            input: { userId: 123, action: 'login' },
            output: { success: true, sessionId: 'abc123' },
            error: undefined,
            boundaries: {
              database: [{ input: 'SELECT * FROM users', output: [{ id: 123 }], error: null }],
              api: [{ input: { endpoint: '/auth' }, output: { token: 'jwt123' }, error: null }]
            },
            metadata: { environment: 'test' }
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

    it('should handle ExecutionRecord with error', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const executionRecord = {
        input: { value: 'test-input' },
        output: null,
        error: 'Task execution failed',
        taskName: 'error-task',
        type: 'error' as const,
        boundaries: {},
        metadata: {}
      }

      const result = await client.sendLog(executionRecord)

      expect(result).toBe('success')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'error-task',
          logItem: JSON.stringify({
            input: { value: 'test-input' },
            output: null,
            error: 'Task execution failed',
            boundaries: {},
            metadata: {}
          })
        },
        expect.any(Object)
      )
    })

    it('should use "unknown-task" when taskName is missing', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const executionRecord = {
        input: { value: 'test-input' },
        output: { result: 'test-output' },
        // taskName is missing
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
          taskName: 'unknown-task',
          logItem: JSON.stringify({
            input: { value: 'test-input' },
            output: { result: 'test-output' },
            error: undefined,
            boundaries: {},
            metadata: {}
          })
        },
        expect.any(Object)
      )
    })
  })

  describe('sendLog with additional metadata', () => {
    it('should merge metadata from ExecutionRecord and sendLog parameter', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const executionRecord = {
        input: { value: 'test-input' },
        output: { result: 'test-output' },
        taskName: 'metadata-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {
          recordMeta: 'from-record',
          sharedKey: 'record-value'
        }
      }

      const sendLogMetadata = {
        sendLogMeta: 'from-sendlog',
        sharedKey: 'sendlog-value' // This should override record value
      }

      const result = await client.sendLog(executionRecord, sendLogMetadata)

      expect(result).toBe('success')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'metadata-task',
          logItem: JSON.stringify({
            input: { value: 'test-input' },
            output: { result: 'test-output' },
            error: undefined,
            boundaries: {},
            metadata: {
              recordMeta: 'from-record',
              sharedKey: 'sendlog-value', // sendLog metadata takes priority
              sendLogMeta: 'from-sendlog'
            }
          })
        },
        expect.any(Object)
      )
    })
  })

  describe('failed sendLog', () => {
    it('should return error when axios throws an error', async () => {
      // Mock axios to throw an error
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const executionRecord = {
        input: { value: 'test-input' },
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {}
      }

      const result = await client.sendLog(executionRecord)

      expect(result).toBe('error')
    })

    it('should return error when server returns 500', async () => {
      // Mock axios to throw a server error
      const serverError = new Error('Server Error')
      mockedAxios.post.mockRejectedValueOnce(serverError)

      const executionRecord = {
        input: { value: 'test' },
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {}
      }

      const result = await client.sendLog(executionRecord)

      expect(result).toBe('error')
    })
  })

  describe('sendLog in silent mode', () => {
    it('should return silent when client is not initialized', async () => {
      const uninitializedClient = new HiveLogClient({
        projectName: 'test-project'
        // No API credentials
      })

      const executionRecord = {
        input: { value: 'test-input' },
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {}
      }

      const result = await uninitializedClient.sendLog(executionRecord)

      expect(result).toBe('silent')
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })
  })
})


describe('HiveLogClient getListener', () => {
  let client: HiveLogClient

  const testConfig = {
    projectName: 'test-project',
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    host: 'https://test-host.com'
  }

  beforeEach(() => {
    client = new HiveLogClient(testConfig)
    jest.clearAllMocks()
  })

  describe('getListener method', () => {
    it('should return a function that calls sendLog', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const listener = client.getListener()

      expect(typeof listener).toBe('function')

      const executionRecord = {
        input: { value: 'test-input' },
        output: { result: 'test-output' },
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {}
      }

      await listener(executionRecord)

      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify({
            input: { value: 'test-input' },
            output: { result: 'test-output' },
            error: undefined,
            boundaries: {},
            metadata: {}
          })
        },
        expect.any(Object)
      )
    })

    it('should return a function that calls sendLog with provided metadata', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const listener = client.getListener()

      const executionRecord = {
        input: { value: 'test-input' },
        output: { result: 'test-output' },
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: { recordMeta: 'from-record' }
      }

      await listener(executionRecord)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify({
            input: { value: 'test-input' },
            output: { result: 'test-output' },
            error: undefined,
            boundaries: {},
            metadata: {
              recordMeta: 'from-record'
            }
          })
        },
        expect.any(Object)
      )
    })

    it('should handle listener errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const listener = client.getListener()

      const executionRecord = {
        input: { value: 'test-input' },
        taskName: 'test-task',
        type: 'success' as const,
        boundaries: {},
        metadata: {}
      }

      // Should not throw, even if sendLog fails
      await expect(listener(executionRecord)).resolves.toBeUndefined()
    })
  })
})
