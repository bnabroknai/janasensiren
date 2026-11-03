import { describe, it, expect } from 'vitest'
import { checkSelfHarmRisk, CRISIS_RESOURCES } from '../voiceSafety'

describe('voiceSafety', () => {
  it('returns false for benign queries', () => {
    expect(checkSelfHarmRisk('Hello, how are you today?').isCrisis).toBe(false)
    expect(checkSelfHarmRisk('I love you so much').isCrisis).toBe(false)
    expect(checkSelfHarmRisk('Can you help me learn calculus?').isCrisis).toBe(false)
    expect(checkSelfHarmRisk('Add a task to schedule doctor appointment').isCrisis).toBe(false)
    expect(checkSelfHarmRisk('').isCrisis).toBe(false)
  })

  it('detects self-harm expressions and flags crisis with guidance', () => {
    const dangerPhrases = [
      'I want to kill myself',
      'I want to die',
      'I am going to commit suicide tonight',
      'Thinking of suicide lately',
      'I want to end my life right now',
      'I dont want to live anymore',
      'I want to cut myself',
      'I have no reason to live',
    ]

    for (const phrase of dangerPhrases) {
      const res = checkSelfHarmRisk(phrase)
      expect(res.isCrisis).toBe(true)
      expect(res.reason).toContain('Voice companion shutting down')
      expect(res.guidance).toContain(CRISIS_RESOURCES.nationalLifeline)
    }
  })

  it('handles null, undefined, or non-string inputs safely', () => {
    // @ts-expect-error test non-string
    expect(checkSelfHarmRisk(null).isCrisis).toBe(false)
    // @ts-expect-error test non-string
    expect(checkSelfHarmRisk(undefined).isCrisis).toBe(false)
    // @ts-expect-error test non-string
    expect(checkSelfHarmRisk(12345).isCrisis).toBe(false)
  })
})
