import { HiveLogClient, createHiveLogClient } from '../index'

describe('Hive SDK', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('HiveLogClient constructor', () => {
    it('should create client in silent mode when HIVE_API_KEY is missing', () => {
      delete process.env.HIVE_API_KEY
      process.env.HIVE_API_SECRET = 'test-secret'
      process.env.HIVE_HOST = 'https://test.com'

      expect(() => new HiveLogClient('test-project')).not.toThrow()
    })

    it('should create client in silent mode when HIVE_API_SECRET is missing', () => {
      process.env.HIVE_API_KEY = 'test-key'
      delete process.env.HIVE_API_SECRET
      process.env.HIVE_HOST = 'https://test.com'

      expect(() => new HiveLogClient('test-project')).not.toThrow()
    })

    it('should create client in silent mode when HIVE_HOST is missing', () => {
      process.env.HIVE_API_KEY = 'test-key'
      process.env.HIVE_API_SECRET = 'test-secret'
      delete process.env.HIVE_HOST

      expect(() => new HiveLogClient('test-project')).not.toThrow()
    })

    it('should create client in silent mode when all environment variables are missing', () => {
      delete process.env.HIVE_API_KEY
      delete process.env.HIVE_API_SECRET
      delete process.env.HIVE_HOST

      expect(() => new HiveLogClient('test-project')).not.toThrow()
    })

    it('should create client successfully when all environment variables are present', () => {
      process.env.HIVE_API_KEY = 'test-key'
      process.env.HIVE_API_SECRET = 'test-secret'
      process.env.HIVE_HOST = 'https://test.com'

      expect(() => new HiveLogClient('test-project')).not.toThrow()
    })
  })

  describe('isActive method', () => {
    it('should return false when credentials are missing', () => {
      delete process.env.HIVE_API_KEY
      delete process.env.HIVE_API_SECRET
      delete process.env.HIVE_HOST

      const client = new HiveLogClient('test-project')
      expect(client.isActive()).toBe(false)
    })

    it('should return true when all credentials are present', () => {
      process.env.HIVE_API_KEY = 'test-key'
      process.env.HIVE_API_SECRET = 'test-secret'
      process.env.HIVE_HOST = 'https://test.com'

      const client = new HiveLogClient('test-project')
      expect(client.isActive()).toBe(true)
    })
  })

  describe('createHiveLogClient factory function', () => {
    it('should create HiveLogClient instance when env vars are present', () => {
      process.env.HIVE_API_KEY = 'test-key'
      process.env.HIVE_API_SECRET = 'test-secret'
      process.env.HIVE_HOST = 'https://test.com'

      const client = createHiveLogClient('test-project')

      expect(client).toBeInstanceOf(HiveLogClient)
    })

    it('should create client in silent mode when env vars are missing', () => {
      delete process.env.HIVE_API_KEY
      delete process.env.HIVE_API_SECRET
      delete process.env.HIVE_HOST

      expect(() => createHiveLogClient('test-project')).not.toThrow()
    })
  })

  describe('Silent mode behavior', () => {
    let silentClient: HiveLogClient

    beforeEach(() => {
      delete process.env.HIVE_API_KEY
      delete process.env.HIVE_API_SECRET
      delete process.env.HIVE_HOST

      silentClient = new HiveLogClient('silent-project')
    })

    it('should return "silent" for sendLog in silent mode', async () => {
      const result = await silentClient.sendLog('test-task', { data: 'test' })
      expect(result).toBe('silent')
    })

    it('should throw error for getLog in silent mode', async () => {
      await expect(silentClient.getLog('test-task', 'test-uuid')).rejects.toThrow(
        'Missing Hive API credentials or host, get them at https://forgehive.dev'
      )
    })

    it('should throw error for setQuality in silent mode', async () => {
      const quality = { score: 8, reason: 'test', suggestions: 'test' }
      await expect(silentClient.setQuality('test-task', 'test-uuid', quality)).rejects.toThrow(
        'Missing Hive API credentials or host, get them at https://forgehive.dev'
      )
    })
  })
})
