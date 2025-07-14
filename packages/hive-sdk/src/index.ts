import axios from 'axios'
import debug from 'debug'

const log = debug('hive-sdk')

// Import ExecutionRecord type from task package
interface ExecutionRecord<InputType = unknown, OutputType = unknown, B = unknown> {
  input: InputType
  output?: OutputType | null
  error?: string
  boundaries?: B
  taskName?: string
  metadata?: Record<string, string>
  type?: 'success' | 'error' | 'pending'
}

// Metadata interface
export interface Metadata {
  [key: string]: string
}

// Log item interface for sendLog method - flexible to accept task execution records
export interface LogItemInput {
  input: unknown
  output?: unknown
  error?: unknown
  boundaries?: unknown // Allow any boundary structure (task records have different format)
  metadata?: Metadata
}

// Backward compatibility alias
export type LogItem = LogItemInput

// Configuration interface for HiveLogClient
export interface HiveLogClientConfig {
  projectName: string
  apiKey?: string
  apiSecret?: string
  host?: string
  metadata?: Metadata
}

// API Response Types
export interface LogApiResponse {
  uuid: string
  taskName: string
  projectName: string
  logItem: {
    input: unknown
    output?: unknown
    error?: unknown
    boundaries?: Record<string, Array<{ input: unknown; output: unknown, error: unknown }>>
    metadata?: Metadata
  }
  replayFrom?: string
  createdAt: string
}

export interface ApiError {
  error: string
}

export interface LogApiSuccess extends LogApiResponse {}

export type LogApiResult = LogApiSuccess | ApiError

// Quality interface for setQuality method
export interface Quality {
  score: number
  reason: string
  suggestions: string
}

// Type guard to check if response is an error
export function isApiError(response: unknown): response is ApiError {
  return response !== null && typeof response === 'object' && 'error' in response
}

export class HiveLogClient {
  private apiKey: string | null
  private apiSecret: string | null
  private host: string | null
  private projectName: string
  private baseMetadata: Metadata
  private isInitialized: boolean

  constructor(config: HiveLogClientConfig) {
    const apiKey = config.apiKey || process.env.HIVE_API_KEY
    const apiSecret = config.apiSecret || process.env.HIVE_API_SECRET
    const host = config.host || process.env.HIVE_HOST || 'https://www.forgehive.cloud'

    this.projectName = config.projectName
    this.baseMetadata = config.metadata || {}

    if (!apiKey || !apiSecret) {
      this.apiKey = null
      this.apiSecret = null
      this.host = null
      this.isInitialized = false
      log('HiveLogClient in silent mode for project "%s" - missing API credentials (get them at https://www.forgehive.cloud)', config.projectName)
    } else {
      this.apiKey = apiKey
      this.apiSecret = apiSecret
      this.host = host
      this.isInitialized = true
      log('HiveLogClient initialized for project "%s" with host "%s"', config.projectName, host)
    }
  }

  isActive(): boolean {
    return this.isInitialized
  }

  private mergeMetadata<T extends { input: unknown; metadata?: Metadata }>(logItem: T, sendLogMetadata?: Metadata): Metadata {
    // Start with base metadata from client
    let finalMetadata = { ...this.baseMetadata }

    // Merge with logItem metadata if it exists
    if (logItem.metadata) {
      finalMetadata = { ...finalMetadata, ...logItem.metadata }
    }

    // Merge with sendLog metadata (highest priority)
    if (sendLogMetadata) {
      finalMetadata = { ...finalMetadata, ...sendLogMetadata }
    }

    return finalMetadata
  }

  async sendLog(record: ExecutionRecord, metadata?: Metadata): Promise<'success' | 'error' | 'silent'> {
    // Extract taskName from record
    const taskName = record.taskName || 'unknown-task'

    if (!this.isInitialized) {
      log('Silent mode: Skipping sendLog for task "%s" - client not initialized', taskName)
      return 'silent'
    }

    try {
      const logsUrl = `${this.host}/api/tasks/log-ingest`
      log('Sending log for task "%s" to %s', taskName, logsUrl)

      const authToken = `${this.apiKey}:${this.apiSecret}`

      // Convert ExecutionRecord to LogItemInput format
      const logItem = {
        input: record.input,
        output: record.output,
        error: record.error,
        boundaries: record.boundaries,
        metadata: record.metadata
      }

      // Merge metadata with priority: sendLog > record.metadata > client
      const finalMetadata = this.mergeMetadata(logItem, metadata)

      // Create enhanced logItem with merged metadata
      const enhancedLogItem = {
        ...logItem,
        metadata: finalMetadata
      }

      await axios.post(logsUrl, {
        projectName: this.projectName,
        taskName,
        logItem: JSON.stringify(enhancedLogItem)
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      log('Success: Sent log for task "%s"', taskName)
      return 'success'
    } catch (e) {
      const error = e as Error
      log('Error: Failed to send log for task "%s": %s', taskName, error.message)
      return 'error'
    }
  }

  getListener(): (record: ExecutionRecord) => Promise<void> {
    return async (record: ExecutionRecord) => {
      await this.sendLog(record)
    }
  }

  async getLog(taskName: string, uuid: string): Promise<LogApiResult | null> {
    if (!this.isInitialized) {
      log('Error: getLog for task "%s" with uuid "%s" - missing credentials', taskName, uuid)
      throw new Error('Missing Hive API credentials or host, get them at https://www.forgehive.cloud')
    }

    try {
      const logUrl = `${this.host}/api/tasks/${taskName}/logs/${uuid}`
      log('Fetching log for task "%s" with uuid "%s" from %s', taskName, uuid, logUrl)

      const authToken = `${this.apiKey}:${this.apiSecret}`

      const response = await axios.get(logUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      log('Success: Fetched log for task "%s" with uuid "%s"', taskName, uuid)
      return response.data as LogApiResult
    } catch (e) {
      const error = e as Error
      log('Error: Failed to fetch log for task "%s" with uuid "%s": %s', taskName, uuid, error.message)
      return null
    }
  }

  async setQuality(taskName: string, uuid: string, quality: Quality): Promise<boolean> {
    if (!this.isInitialized) {
      log('Error: setQuality for task "%s" with uuid "%s" - missing credentials', taskName, uuid)
      throw new Error('Missing Hive API credentials or host, get them at https://www.forgehive.cloud')
    }

    try {
      const qualityUrl = `${this.host}/api/tasks/${taskName}/logs/${uuid}/set-quality`
      log('Setting quality for task "%s" with uuid "%s" (score: %d) to %s', taskName, uuid, quality.score, qualityUrl)

      const authToken = `${this.apiKey}:${this.apiSecret}`

      await axios.post(qualityUrl, {
        quality
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      log('Success: Set quality for task "%s" with uuid "%s" (score: %d)', taskName, uuid, quality.score)
      return true
    } catch (e) {
      const error = e as Error
      log('Error: Failed to set quality for task "%s" with uuid "%s": %s', taskName, uuid, error.message)
      return false
    }
  }
}

export const createHiveLogClient = (config: HiveLogClientConfig): HiveLogClient => {
  log('Creating HiveLogClient for project "%s"', config.projectName)
  return new HiveLogClient(config)
}

// Configuration interface for HiveClient
export interface HiveClientConfig {
  projectUuid: string
  apiKey?: string
  apiSecret?: string
  host?: string
}

// Response types for invoke method
export interface InvokeResponse {
  responsePayload: unknown
}

export interface InvokeError {
  error: string
}

export type InvokeResult = InvokeResponse | InvokeError

// Type guard to check if invoke response is an error
export function isInvokeError(response: unknown): response is InvokeError {
  return response !== null && typeof response === 'object' && 'error' in response
}

export class HiveClient {
  private apiKey: string
  private apiSecret: string
  private host: string
  private projectUuid: string

  constructor(config: HiveClientConfig) {
    const apiKey = config.apiKey || process.env.HIVE_API_KEY
    const apiSecret = config.apiSecret || process.env.HIVE_API_SECRET
    const host = config.host || process.env.HIVE_HOST || 'https://forgehive.dev'

    if (!apiKey || !apiSecret) {
      throw new Error('Missing Hive API credentials. Please provide apiKey and apiSecret, or set HIVE_API_KEY and HIVE_API_SECRET environment variables. Get them at https://forgehive.dev')
    }

    this.projectUuid = config.projectUuid
    this.host = host
    this.apiKey = apiKey
    this.apiSecret = apiSecret

    log('HiveClient initialized for project "%s" with host "%s"', config.projectUuid, host)
  }

  async invoke(taskName: string, payload: unknown): Promise<InvokeResult | null> {
    try {
      const invokeUrl = `${this.host}/api/project/${this.projectUuid}/task/${taskName}/invoke`
      log('Invoking task "%s" at %s', taskName, invokeUrl)

      const authToken = `${this.apiKey}:${this.apiSecret}`

      const response = await axios.post(invokeUrl, {
        payload
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      log('Success: Invoked task "%s"', taskName)
      return response.data as InvokeResult
    } catch (e) {
      const error = e as Error
      log('Error: Failed to invoke task "%s": %s', taskName, error.message)

      // Check if it's an axios error with response data
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as InvokeError
      }

      return { error: error.message }
    }
  }
}

export const createHiveClient = (config: HiveClientConfig): HiveClient => {
  log('Creating HiveClient for project "%s"', config.projectUuid)
  return new HiveClient(config)
}
