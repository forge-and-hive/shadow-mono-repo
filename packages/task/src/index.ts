import { Schema } from '@shadow/schema'

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export function createTask(title: string): Task {
  const schema = new Schema({
    id: Schema.string(),
    title: Schema.string(),
    completed: Schema.boolean(),
  })

  const data = schema.parse({
    id: crypto.randomUUID(),
    title,
    completed: false,
  })

  return data
}
