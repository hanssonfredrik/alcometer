import { describe, it, expect, vi } from 'vitest'
import { pushBackHandler, handleBack } from './backStack.js'

describe('backStack', () => {
  it('returns false with nothing registered', () => {
    expect(handleBack()).toBe(false)
  })

  it('runs the most recent handler first and reports it consumed', () => {
    const a = vi.fn()
    const b = vi.fn()
    const offA = pushBackHandler(a)
    const offB = pushBackHandler(b)
    expect(handleBack()).toBe(true)
    expect(b).toHaveBeenCalledTimes(1)
    expect(a).not.toHaveBeenCalled()
    offB()
    expect(handleBack()).toBe(true)
    expect(a).toHaveBeenCalledTimes(1)
    offA()
    expect(handleBack()).toBe(false)
  })

  it('unsubscribing a non-top handler keeps the order intact', () => {
    const a = vi.fn()
    const b = vi.fn()
    const offA = pushBackHandler(a)
    const offB = pushBackHandler(b)
    offA()
    expect(handleBack()).toBe(true)
    expect(b).toHaveBeenCalledTimes(1)
    offB()
    expect(handleBack()).toBe(false)
  })
})
