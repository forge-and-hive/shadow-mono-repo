import { Task } from '../index'

describe('Task run without arguments', () => {
  it('should run a task with no arguments', async () => {
    // Create a task that doesn't require arguments
    const noArgsTask = new Task(function () {
      return 'success'
    })

    // Call run without passing any arguments
    const result = await noArgsTask.run()

    // Verify the result
    expect(result).toBe('success')
  })

  it('should run a task with optional arguments', async () => {
    // Create a task with optional arguments
    const optionalArgsTask = new Task(function (argv?: { value?: string }) {
      return argv?.value || 'default'
    })

    // Call run without passing any arguments
    const defaultResult = await optionalArgsTask.run()

    // Call run with arguments for comparison
    const customResult = await optionalArgsTask.run({ value: 'custom' })

    // Verify the results
    expect(defaultResult).toBe('default')
    expect(customResult).toBe('custom')
  })
})
