import buildSchema from '@shadow/schema'

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export function createTask(title: string): Task {
  return {
    id: crypto.randomUUID(),
    title: buildSchema(title),
    completed: false,
    createdAt: new Date(),
  }
}
