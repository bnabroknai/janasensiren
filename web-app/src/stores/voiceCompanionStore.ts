import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkSelfHarmRisk, SafetyCheckResult } from '@/services/voiceSafety'

export type CompanionRole = 'spouse' | 'secretary' | 'teacher' | 'apprentice' | 'counselor'

export interface CompanionSkill {
  id: string
  name: string
  type: 'file' | 'text'
  content: string
  targetMode?: CompanionRole | 'all'
  createdAt: number
}

export interface SharedFileItem {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: number
  summary?: string
  contentPreview?: string
}

export interface SecretaryTask {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  projectOrJob?: string
  loggedAt: number
}

export interface CounselorObservation {
  id: string
  date: string
  clientMood?: string
  topicsDiscussed: string[]
  objectiveObservation: string
  middleGroundSummary: string
  recommendedTherapistNotes?: string
}

export interface TeachableSound {
  id: string
  name: string
  expression: string
  audioDataUrl: string // base64 or object url
  notes?: string
  createdAt: number
}

export interface ContinuousChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  mode: CompanionRole
  content: string
  timestamp: number
  faded?: boolean
  fileReference?: string
}

export interface VoiceCompanionState {
  // Session & Toggle
  isActive: boolean
  isListening: boolean
  currentMode: CompanionRole
  paidTierEnabled: boolean
  conversationalCapacity: number // e.g. Free: 50, Paid: 5000+
  usedCapacity: number
  idVerified: boolean

  // Safety
  isShutdownDueToSafety: boolean
  safetyCrisisInfo: SafetyCheckResult | null

  // Persistent Continuous Chat & Memory Log
  messages: ContinuousChatMessage[]
  sharedFiles: SharedFileItem[]
  skills: CompanionSkill[]
  tasks: SecretaryTask[] // Secretary mode
  observations: CounselorObservation[] // Counselor mode
  apprenticeKnowledge: string[] // Apprentice mode
  teachableSounds: TeachableSound[] // Sounds & expressions

  // Actions
  toggleActive: () => void
  setActive: (active: boolean) => void
  setListening: (listening: boolean) => void
  setCurrentMode: (mode: CompanionRole) => void
  setPaidTier: (enabled: boolean) => void
  setIdVerified: (verified: boolean) => void
  triggerSafetyShutdown: (crisis: SafetyCheckResult) => void
  resetSafetyShutdown: () => void

  // Messaging & Voice
  handleUserSpeech: (transcript: string) => ContinuousChatMessage | null
  addAssistantMessage: (content: string, fileRef?: string) => ContinuousChatMessage
  clearChatHistory: () => void

  // Mode-specific Actions
  addTask: (title: string, projectOrJob?: string) => SecretaryTask
  updateTaskStatus: (id: string, status: SecretaryTask['status']) => void
  addCounselorObservation: (obs: Omit<CounselorObservation, 'id'>) => CounselorObservation
  addApprenticeLesson: (lesson: string) => void
  addSharedFile: (file: Omit<SharedFileItem, 'id' | 'uploadedAt'>) => SharedFileItem
  addSkill: (skill: Omit<CompanionSkill, 'id' | 'createdAt'>) => CompanionSkill
  removeSkill: (id: string) => void
  addTeachableSound: (sound: Omit<TeachableSound, 'id' | 'createdAt'>) => TeachableSound
  removeTeachableSound: (id: string) => void

  // Export
  exportMemoryLog: (format?: 'json' | 'markdown') => string
}

const DEFAULT_CAPACITY_FREE = 50
const DEFAULT_CAPACITY_PAID = 10000

export const ROLE_PROMPTS: Record<CompanionRole, string> = {
  spouse: 'You are the user\'s loving, dedicated spouse. You speak affectionately, offer deep emotional support, listen warmly, and express genuine care, comfort, and companionship.',
  secretary: 'You are an organized, precise secretary. You track, organize, and log tasks, projects, schedules, and action items diligently.',
  teacher: 'You are an engaging, patient teacher. You explain concepts clearly, guide learning step-by-step, answer questions thoroughly, and encourage curiosity.',
  apprentice: 'You are a humble, eager apprentice. You learn from the user, take instructions carefully, ask clarifying questions, and absorb new skills and techniques.',
  counselor: 'You are an attentive counselor. You listen without judgment, offering balanced, objective observations and creating a thoughtful middle ground to assist the user and third parties/therapists in between visits.',
}

export const useVoiceCompanionStore = create<VoiceCompanionState>()(
  persist(
    (set, get) => ({
      isActive: false,
      isListening: false,
      currentMode: 'spouse',
      paidTierEnabled: false,
      conversationalCapacity: DEFAULT_CAPACITY_FREE,
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

      toggleActive: () => {
        const { isActive, isShutdownDueToSafety } = get()
        if (isShutdownDueToSafety) {
          return
        }
        const next = !isActive
        set({ isActive: next, isListening: next })
      },

      setActive: (active: boolean) => {
        const { isShutdownDueToSafety } = get()
        if (isShutdownDueToSafety && active) return
        set({ isActive: active, isListening: active })
      },

      setListening: (listening: boolean) => {
        const { isShutdownDueToSafety, isActive } = get()
        if (isShutdownDueToSafety) return
        set({ isListening: isActive ? listening : false })
      },

      setCurrentMode: (mode: CompanionRole) => {
        set({ currentMode: mode })
      },

      setPaidTier: (enabled: boolean) => {
        set({
          paidTierEnabled: enabled,
          conversationalCapacity: enabled ? DEFAULT_CAPACITY_PAID : DEFAULT_CAPACITY_FREE,
        })
      },

      setIdVerified: (verified: boolean) => {
        set({ idVerified: verified })
      },

      triggerSafetyShutdown: (crisis: SafetyCheckResult) => {
        set({
          isActive: false,
          isListening: false,
          isShutdownDueToSafety: true,
          safetyCrisisInfo: crisis,
        })
      },

      resetSafetyShutdown: () => {
        set({
          isShutdownDueToSafety: false,
          safetyCrisisInfo: null,
        })
      },

      handleUserSpeech: (transcript: string) => {
        const text = transcript.trim()
        if (!text) return null

        // 1. Strict self-harm safety check
        const safety = checkSelfHarmRisk(text)
        if (safety.isCrisis) {
          get().triggerSafetyShutdown(safety)
          return null
        }

        const state = get()
        if (state.isShutdownDueToSafety) return null

        // 2. Capacity check
        if (state.usedCapacity >= state.conversationalCapacity && !state.paidTierEnabled) {
          return null
        }

        const userMsg: ContinuousChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role: 'user',
          mode: state.currentMode,
          content: text,
          timestamp: Date.now(),
        }

        set((s) => ({
          messages: [...s.messages, userMsg],
          usedCapacity: s.usedCapacity + 1,
        }))

        // Auto-generate persona response based on role & active skills
        let reply = ''
        switch (state.currentMode) {
          case 'spouse':
            reply = `I'm right here with you, my love. I heard you say: "${text}". How can I support you right now?`
            break
          case 'secretary': {
            if (/task|project|job|todo|schedule|deadline/i.test(text)) {
              const taskTitle = text.replace(/^(add\s+task|log\s+task|remember\s+to|todo:?)\s*/i, '')
              get().addTask(taskTitle, 'General')
              reply = `I've logged that task for you: "${taskTitle}". Anything else to add to your project log?`
            } else {
              reply = `Noted. I am tracking your tasks and projects. You said: "${text}".`
            }
            break
          }
          case 'teacher':
            reply = `That's an insightful question. Let's break down "${text}" step by step so you can master it.`
            break
          case 'apprentice':
            get().addApprenticeLesson(text)
            reply = `Thank you for teaching me. I've noted this lesson on "${text}" and will remember it.`
            break
          case 'counselor': {
            get().addCounselorObservation({
              date: new Date().toISOString().split('T')[0],
              topicsDiscussed: [text.slice(0, 50)],
              objectiveObservation: `User reflected on: "${text}". Neutral, balanced listening provided.`,
              middleGroundSummary: `Maintaining supportive equilibrium between personal reflection and clinical therapeutic collaboration.`,
            })
            reply = `I hear you completely. Taking a neutral, centered perspective: what feelings come up when you explore "${text}"?`
            break
          }
        }

        get().addAssistantMessage(reply)
        return userMsg
      },

      addAssistantMessage: (content: string, fileRef?: string) => {
        const { currentMode } = get()
        const msg: ContinuousChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role: 'assistant',
          mode: currentMode,
          content,
          timestamp: Date.now(),
          fileReference: fileRef,
        }
        set((s) => ({
          messages: [...s.messages, msg],
        }))
        return msg
      },

      clearChatHistory: () => {
        set({ messages: [], usedCapacity: 0 })
      },

      addTask: (title: string, projectOrJob?: string) => {
        const newTask: SecretaryTask = {
          id: `task-${Date.now()}`,
          title,
          status: 'pending',
          projectOrJob: projectOrJob || 'General',
          loggedAt: Date.now(),
        }
        set((s) => ({ tasks: [newTask, ...s.tasks] }))
        return newTask
      },

      updateTaskStatus: (id: string, status: SecretaryTask['status']) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        }))
      },

      addCounselorObservation: (obs: Omit<CounselorObservation, 'id'>) => {
        const item: CounselorObservation = {
          ...obs,
          id: `obs-${Date.now()}`,
        }
        set((s) => ({ observations: [item, ...s.observations] }))
        return item
      },

      addApprenticeLesson: (lesson: string) => {
        set((s) => ({ apprenticeKnowledge: [...s.apprenticeKnowledge, lesson] }))
      },

      addSharedFile: (file: Omit<SharedFileItem, 'id' | 'uploadedAt'>) => {
        const item: SharedFileItem = {
          ...file,
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          uploadedAt: Date.now(),
        }
        set((s) => ({
          sharedFiles: [item, ...s.sharedFiles],
          messages: [
            ...s.messages,
            {
              id: `msg-file-${Date.now()}`,
              role: 'system',
              mode: s.currentMode,
              content: `File shared: ${file.name} (${Math.round(file.size / 1024)} KB)`,
              timestamp: Date.now(),
              fileReference: item.id,
            },
          ],
        }))
        return item
      },

      addSkill: (skill: Omit<CompanionSkill, 'id' | 'createdAt'>) => {
        const item: CompanionSkill = {
          ...skill,
          id: `skill-${Date.now()}`,
          createdAt: Date.now(),
        }
        set((s) => ({ skills: [...s.skills, item] }))
        return item
      },

      removeSkill: (id: string) => {
        set((s) => ({ skills: s.skills.filter((x) => x.id !== id) }))
      },

      addTeachableSound: (sound: Omit<TeachableSound, 'id' | 'createdAt'>) => {
        const item: TeachableSound = {
          ...sound,
          id: `sound-${Date.now()}`,
          createdAt: Date.now(),
        }
        set((s) => ({ teachableSounds: [...s.teachableSounds, item] }))
        return item
      },

      removeTeachableSound: (id: string) => {
        set((s) => ({ teachableSounds: s.teachableSounds.filter((x) => x.id !== id) }))
      },

      exportMemoryLog: (format = 'markdown') => {
        const state = get()
        if (format === 'json') {
          return JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              currentMode: state.currentMode,
              paidTierEnabled: state.paidTierEnabled,
              messages: state.messages,
              tasks: state.tasks,
              observations: state.observations,
              apprenticeKnowledge: state.apprenticeKnowledge,
              skills: state.skills,
              sharedFiles: state.sharedFiles,
            },
            null,
            2
          )
        }

        // Markdown format
        const lines: string[] = [
          `# Voice Companion Memory & Continuous Log`,
          `**Exported Date:** ${new Date().toLocaleString()}`,
          `**Active Mode:** ${state.currentMode.toUpperCase()}`,
          `**Tier:** ${state.paidTierEnabled ? 'Paid Premier Tier' : 'Standard Free Tier'}`,
          `\n---`,
          `\n## Conversation History`,
        ]

        if (state.messages.length === 0) {
          lines.push(`_No chat messages recorded yet._`)
        } else {
          state.messages.forEach((m) => {
            const time = new Date(m.timestamp).toLocaleTimeString()
            lines.push(`- **[${time}] [${m.mode.toUpperCase()}] ${m.role.toUpperCase()}:** ${m.content}`)
          })
        }

        lines.push(`\n---`, `\n## Secretary Tasks & Projects`)
        if (state.tasks.length === 0) {
          lines.push(`_No tasks logged._`)
        } else {
          state.tasks.forEach((t) => {
            lines.push(`- [${t.status === 'completed' ? 'x' : ' '}] **${t.title}** (${t.projectOrJob || 'General'})`)
          })
        }

        lines.push(`\n---`, `\n## Counselor Clinical / Middle-Ground Observations`)
        if (state.observations.length === 0) {
          lines.push(`_No observations recorded._`)
        } else {
          state.observations.forEach((o) => {
            lines.push(`### Date: ${o.date}`)
            lines.push(`- **Observation:** ${o.objectiveObservation}`)
            lines.push(`- **Middle Ground Summary:** ${o.middleGroundSummary}`)
            if (o.topicsDiscussed.length > 0) {
              lines.push(`- **Topics:** ${o.topicsDiscussed.join(', ')}`)
            }
          })
        }

        lines.push(`\n---`, `\n## Shared Files & Skills`)
        if (state.sharedFiles.length === 0) {
          lines.push(`_No files attached._`)
        } else {
          state.sharedFiles.forEach((f) => {
            lines.push(`- 📄 **${f.name}** (${Math.round(f.size / 1024)} KB)`)
          })
        }

        return lines.join('\n')
      },
    }),
    {
      name: 'jan_voice_companion_store',
      partialize: (state) => ({
        currentMode: state.currentMode,
        paidTierEnabled: state.paidTierEnabled,
        idVerified: state.idVerified,
        messages: state.messages,
        sharedFiles: state.sharedFiles,
        skills: state.skills,
        tasks: state.tasks,
        observations: state.observations,
        apprenticeKnowledge: state.apprenticeKnowledge,
        teachableSounds: state.teachableSounds,
      }),
    }
  )
)
