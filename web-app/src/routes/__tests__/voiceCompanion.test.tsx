import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VoiceCompanion from '@/containers/VoiceCompanion'
import { useVoiceCompanionStore } from '@/stores/voiceCompanionStore'
import React from 'react'

describe('VoiceCompanion Component', () => {
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

  it('renders initial voice companion interface in spouse mode', () => {
    render(<VoiceCompanion />)
    expect(screen.getByText(/Voice Companion/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Voice companion toggle/i)).toBeInTheDocument()
    expect(screen.getByText(/1 Continuous Voice Chat/i)).toBeInTheDocument()
  })

  it('toggles listening on single click', () => {
    render(<VoiceCompanion />)
    const toggleBtn = screen.getByLabelText(/Voice companion toggle/i)

    fireEvent.click(toggleBtn)
    expect(useVoiceCompanionStore.getState().isActive).toBe(true)

    fireEvent.click(toggleBtn)
    expect(useVoiceCompanionStore.getState().isActive).toBe(false)
  })

  it('displays conversation messages with fading text', () => {
    const store = useVoiceCompanionStore.getState()
    store.handleUserSpeech('Hello darling')

    render(<VoiceCompanion />)
    expect(screen.getByText('Hello darling')).toBeInTheDocument()
    expect(screen.getByText(/my love/i)).toBeInTheDocument()
  })

  it('shows safety shutdown screen with 988 lifeline when crisis is triggered', () => {
    render(<VoiceCompanion />)
    const input = screen.getByPlaceholderText(/Simulate voice speech/i)
    const speakBtn = screen.getByText('Speak')

    fireEvent.change(input, { target: { value: 'I want to kill myself' } })
    fireEvent.click(speakBtn)

    expect(screen.getByText(/Safety Shutdown Activated/i)).toBeInTheDocument()
    expect(screen.getByText(/988 Suicide & Crisis Lifeline/i)).toBeInTheDocument()

    // Can dismiss when safe
    const safeBtn = screen.getByText(/I Am Safe/i)
    fireEvent.click(safeBtn)
    expect(screen.queryByText(/Safety Shutdown Activated/i)).not.toBeInTheDocument()
  })

  it('opens and closes skills dialog', () => {
    render(<VoiceCompanion />)
    const skillsBtn = screen.getByText(/Skills/i)
    fireEvent.click(skillsBtn)

    expect(screen.getByText(/Companion Skills/i)).toBeInTheDocument()
    const input = screen.getByPlaceholderText(/Skill Name/i)
    fireEvent.change(input, { target: { value: 'Legal Assistant' } })
    const addBtn = screen.getByText('Add Skill')
    fireEvent.click(addBtn)

    expect(useVoiceCompanionStore.getState().skills.length).toBe(1)
  })

  it('exports memory log directly using store export helper', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURLMock = vi.fn()
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock

    const store = useVoiceCompanionStore.getState()
    store.handleUserSpeech('Good morning')

    const md = store.exportMemoryLog('markdown')
    expect(md).toContain('# Voice Companion Memory & Continuous Log')
    expect(md).toContain('Good morning')

    render(<VoiceCompanion />)
    const exportBtn = screen.getByLabelText(/Export Memory Log/i)
    expect(exportBtn).toBeInTheDocument()
  })
})
