export interface RunnerDescriptor {
  path: string
  version: string
  upload?: {
    bucket: string
    path: string
  }
}

export interface TaskDescriptor {
  path: string
  handler: string
}

export interface Infra {
  region: string
  bucket: string
}

export interface ShadowConf {
  project: {
    name: string
  }
  paths: {
    logs: string
    tasks: string
    runners: string
    fixtures: string
    tests: string
  }
  infra: Infra
  tasks: Record<string, TaskDescriptor>
  runners: Record<string, RunnerDescriptor>
}
