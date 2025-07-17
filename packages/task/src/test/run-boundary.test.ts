import { createBoundary } from '../utils/boundary'

describe('Run boundary tests', function () {
  it('Should add a run record', async function () {
    const identity = createBoundary(async function (argv) {
      return argv
    })

    identity.startRun()
    await identity({ value: 5 })

    const runTape = identity.getRunData()

    expect(runTape.length).toBe(1)
    expect(runTape[0]).toEqual({
      input: [{ value: 5 }],
      output: { value: 5 },
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      })
    })
  })

  it('Should only add a record if run is active', async function () {
    const identity = createBoundary(async function (argv) {
      return argv
    })

    await identity({ value: 5 })

    const runTape = identity.getRunData()

    expect(runTape.length).toBe(0)
  })

  it('Shouldn\'t add after run stoped', async function () {
    const identity = createBoundary(async function (argv) {
      return argv
    })

    identity.startRun()
    await identity({ value: 5 })

    identity.stopRun()
    await identity({ value: 5 })

    const runTape = identity.getRunData()

    expect(runTape.length).toBe(1)
    expect(runTape[0]).toEqual({
      input: [{ value: 5 }],
      output: { value: 5 },
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      })
    })
  })

  it('Should have run elements from this run', async function () {
    const identity = createBoundary(async function (argv) {
      return argv
    })

    identity.startRun()
    await identity({ value: 4 })
    identity.stopRun()

    identity.startRun()
    await identity({ value: 5 })

    const runTape = identity.getRunData()

    expect(runTape.length).toBe(1)
    expect(runTape[0]).toEqual({
      input: [{ value: 5 }],
      output: { value: 5 },
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      })
    })
  })
})
