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
    it('should throw error when HIVE_API_KEY is missing', () => {
      delete process.env.HIVE_API_KEY
      process.env.HIVE_API_SECRET = 'test-secret'
      process.env.HIVE_HOST = 'https://test.com'

      expect(() => new HiveLogClient('test-project')).toThrow(
        'Missing Hive API credentials or host, get them at https://forgehive.dev'
      )
    })

    it('should throw error when HIVE_API_SECRET is missing', () => {
      process.env.HIVE_API_KEY = 'test-key'
      delete process.env.HIVE_API_SECRET
      process.env.HIVE_HOST = 'https://test.com'

      expect(() => new HiveLogClient('test-project')).toThrow(
        'Missing Hive API credentials or host, get them at https://forgehive.dev'
      )
    })

    it('should throw error when HIVE_HOST is missing', () => {
      process.env.HIVE_API_KEY = 'test-key'
      process.env.HIVE_API_SECRET = 'test-secret'
      delete process.env.HIVE_HOST

      expect(() => new HiveLogClient('test-project')).toThrow(
        'Missing Hive API credentials or host, get them at https://forgehive.dev'
      )
    })

    it('should throw error when all environment variables are missing', () => {
      delete process.env.HIVE_API_KEY
      delete process.env.HIVE_API_SECRET
      delete process.env.HIVE_HOST

      expect(() => new HiveLogClient('test-project')).toThrow(
        'Missing Hive API credentials or host, get them at https://forgehive.dev'
      )
    })

    it('should create client successfully when all environment variables are present', () => {
      process.env.HIVE_API_KEY = 'test-key'
      process.env.HIVE_API_SECRET = 'test-secret'
      process.env.HIVE_HOST = 'https://test.com'

      expect(() => new HiveLogClient('test-project')).not.toThrow()
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

    it('should throw error when env vars are missing', () => {
      delete process.env.HIVE_API_KEY
      delete process.env.HIVE_API_SECRET
      delete process.env.HIVE_HOST

      expect(() => createHiveLogClient('test-project')).toThrow(
        'Missing Hive API credentials or host, get them at https://forgehive.dev'
      )
    })
  })
})
