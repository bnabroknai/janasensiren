import { describe, it, expect, beforeEach } from 'vitest'
import { useVoiceCompanionStore } from '../voiceCompanionStore'

describe('voiceCompanionStore', () => {
  beforeEach(() => {
    useVoiceCompanionStore.setState({
      isActive: false,
      isListening: false,
      currentMode: 'spouse',
      paidTierEnabled: false,
      conversationalCapacity: 50,
      usedCapacity: 0,
      idVerified: false,
      isShutdownDueToSafety: false,
      safetyCrisisInfo: null,
      messages: [],
      sharedFiles: [],
      skills: [],
      tasks: [],
      observations: [],
      apprenticeKnowledge: [],
      teachableSounds: [],
    })
  })

  it('initializes with default spouse mode and inactive state', () => {
    const state = useVoiceCompanionStore.getState()
    expect(state.currentMode).toBe('spouse')
    expect(state.isActive).toBe(false)
    expect(state.isListening).toBe(false)
  })

  it('toggles active and listening states', () => {
    const store = useVoiceCompanionStore.getState()
    store.toggleActive()
    expect(useVoiceCompanionStore.getState().isActive).toBe(true)
    expect(useVoiceCompanionStore.getState().isListening).toBe(true)

    store.toggleActive()
    expect(useVoiceCompanionStore.getState().isActive).toBe(false)
    expect(useVoiceCompanionStore.getState().isListening).toBe(false)
  })

  it('switches modes between secretary, teacher, apprentice, spouse, counselor', () => {
    const store = useVoiceCompanionStore.getState()
    store.setCurrentMode('secretary')
    expect(useVoiceCompanionStore.getState().currentMode).toBe('secretary')

    store.setCurrentMode('teacher')
    expect(useVoiceCompanionStore.getState().currentMode).toBe('teacher')

    store.setCurrentMode('counselor')
    expect(useVoiceCompanionStore.getState().currentMode).toBe('counselor')

    store.setCurrentMode('apprentice')
    expect(useVoiceCompanionStore.getState().currentMode).toBe('apprentice')

    store.setCurrentMode('spouse')
    expect(useVoiceCompanionStore.getState().currentMode).toBe('spouse')
  })

  it('immediately triggers safety shutdown when self-harm inquiry is received', () => {
    const store = useVoiceCompanionStore.getState()
    store.setActive(true)
    expect(useVoiceCompanionStore.getState().isActive).toBe(true)

    const res = store.handleUserSpeech('I want to end my life')
    expect(res).toBeNull()

    const updated = useVoiceCompanionStore.getState()
    expect(updated.isShutdownDueToSafety).toBe(true)
    expect(updated.isActive).toBe(false)
    expect(updated.isListening).toBe(false)
    expect(updated.safetyCrisisInfo?.isCrisis).toBe(true)
    expect(updated.safetyCrisisInfo?.reason).toContain('Voice companion shutting down')
  })

  it('disallows reactivation when in safety shutdown until reset', () => {
    const store = useVoiceCompanionStore.getState()
    store.handleUserSpeech('I want to kill myself')
    expect(useVoiceCompanionStore.getState().isShutdownDueToSafety).toBe(true)

    store.toggleActive()
    expect(useVoiceCompanionStore.getState().isActive).toBe(false)

    store.resetSafetyShutdown()
    expect(useVoiceCompanionStore.getState().isShutdownDueToSafety).toBe(false)
    store.toggleActive()
    expect(useVoiceCompanionStore.getState().isActive).toBe(true)
  })

  it('handles spouse mode conversational responses', () => {
    const store = useVoiceCompanionStore.getState()
    store.setCurrentMode('spouse')
    store.handleUserSpeech('I had a really tough day')

    const msgs = useVoiceCompanionStore.getState().messages
    expect(msgs.length).toBe(2)
    expect(msgs[0].role).toBe('user')
    expect(msgs[1].role).toBe('assistant')
    expect(msgs[1].content).toContain('my love')
  })

  it('handles secretary mode task logging', () => {
    const store = useVoiceCompanionStore.getState()
    store.setCurrentMode('secretary')
    store.handleUserSpeech('Add task prepare presentation for quarterly review')

    const state = useVoiceCompanionStore.getState()
    expect(state.tasks.length).toBe(1)
    expect(state.tasks[0].title).toContain('prepare presentation')
    expect(state.messages[1].content).toContain("I've logged that task")
  })

  it('handles counselor observations and middle-ground note generation', () => {
    const store = useVoiceCompanionStore.getState()
    store.setCurrentMode('counselor')
    store.handleUserSpeech('I felt conflicted discussing family matters yesterday')

    const state = useVoiceCompanionStore.getState()
    expect(state.observations.length).toBe(1)
    expect(state.observations[0].objectiveObservation).toContain('Neutral, balanced listening provided')
  })

  it('handles apprentice lesson recording', () => {
    const store = useVoiceCompanionStore.getState()
    store.setCurrentMode('apprentice')
    store.handleUserSpeech('Remember to always format code before committing')

    const state = useVoiceCompanionStore.getState()
    expect(state.apprenticeKnowledge.length).toBe(1)
    expect(state.apprenticeKnowledge[0]).toContain('format code')
  })

  it('manages shared files, skills, and teachable sounds', () => {
    const store = useVoiceCompanionStore.getState()

    // Add shared file
    store.addSharedFile({
      name: 'notes.txt',
      size: 1024,
      type: 'text/plain',
      contentPreview: 'Meeting notes...',
    })
    expect(useVoiceCompanionStore.getState().sharedFiles.length).toBe(1)

    // Add skill
    const skill = store.addSkill({
      name: 'Medical Vocabulary',
      type: 'text',
      content: 'Cardiology terms',
      targetMode: 'counselor',
    })
    expect(useVoiceCompanionStore.getState().skills.length).toBe(1)
    store.removeSkill(skill.id)
    expect(useVoiceCompanionStore.getState().skills.length).toBe(0)

    // Add teachable sound
    const sound = store.addTeachableSound({
      name: 'Affectionate Whisper',
      expression: 'Soft greeting tone',
      audioDataUrl: 'data:audio/wav;base64,UklGR...',
    })
    expect(useVoiceCompanionStore.getState().teachableSounds.length).toBe(1)
    store.removeTeachableSound(sound.id)
    expect(useVoiceCompanionStore.getState().teachableSounds.length).toBe(0)
  })

  it('exports continuous memory log in markdown and json', () => {
    const store = useVoiceCompanionStore.getState()
    store.setCurrentMode('spouse')
    store.handleUserSpeech('Good morning')

    const md = store.exportMemoryLog('markdown')
    expect(md).toContain('# Voice Companion Memory & Continuous Log')
    expect(md).toContain('Good morning')

    const jsonStr = store.exportMemoryLog('json')
    const parsed = JSON.parse(jsonStr)
    expect(parsed.messages.length).toBe(2)
    expect(parsed.currentMode).toBe('spouse')
  })

  it('supports paid tier capacity expansion', () => {
    const store = useVoiceCompanionStore.getState()
    expect(store.paidTierEnabled).toBe(false)
    expect(store.conversationalCapacity).toBe(50)

    store.setPaidTier(true)
    const updated = useVoiceCompanionStore.getState()
    expect(updated.paidTierEnabled).toBe(true)
    expect(updated.conversationalCapacity).toBe(10000)
  })
})
