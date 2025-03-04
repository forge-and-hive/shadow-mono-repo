import { createTask } from '../index'

describe('createTask', () => {
  it('should create a task with the provided title', () => {
    const title = 'World'
    const task = createTask(title)

    expect(task).toEqual({
      id: expect.any(String),
      title: 'World',
      completed: false,
    })
  })

  it('should generate a unique UUID for each task', () => {
    const task1 = createTask('Task 1')
    const task2 = createTask('Task 2')

    expect(task1.id).not.toBe(task2.id)
  })
})
