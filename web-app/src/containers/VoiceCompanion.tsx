import React, { useState, useEffect, useRef, useTransition } from 'react'
import {
  useVoiceCompanionStore,
  CompanionRole,
} from '@/stores/voiceCompanionStore'
import { Button } from '@/components/ui/button'
import {
  Mic,
  MicOff,
  Download,
  Upload,
  Volume2,
  Settings2,
  Trash2,
  CheckCircle,
  FileText,
  Heart,
  BookOpen,
  Briefcase,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const ROLE_ICONS: Record<CompanionRole, React.ReactNode> = {
  spouse: <Heart className="size-4 text-rose-500 fill-rose-500/20" />,
  secretary: <Briefcase className="size-4 text-blue-500" />,
  teacher: <GraduationCap className="size-4 text-amber-500" />,
  apprentice: <BookOpen className="size-4 text-emerald-500" />,
  counselor: <CheckCircle className="size-4 text-purple-500" />,
}

export default function VoiceCompanion() {
  const {
    isActive,
    isListening,
    currentMode,
    paidTierEnabled,
    conversationalCapacity,
    usedCapacity,
    isShutdownDueToSafety,
    safetyCrisisInfo,
    messages,
    skills,
    teachableSounds,
    toggleActive,
    setCurrentMode,
    setPaidTier,
    resetSafetyShutdown,
    handleUserSpeech,
    addSharedFile,
    addSkill,
    removeSkill,
    addTeachableSound,
    removeTeachableSound,
    exportMemoryLog,
  } = useVoiceCompanionStore()

  const [, startTransition] = useTransition()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [skillDialogOpen, setSkillDialogOpen] = useState(false)
  const [soundDialogOpen, setSoundDialogOpen] = useState(false)
  const [speechSimInput, setSpeechSimInput] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillContent, setNewSkillContent] = useState('')
  const [newSkillType, setNewSkillType] = useState<'text' | 'file'>('text')
  const [newSoundName, setNewSoundName] = useState('')
  const [newSoundExpression, setNewSoundExpression] = useState('')
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  // Long-press detection on the single toggle switch
  const pressTimer = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  // Real Web Speech API initialization when supported and listening
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) return

    if (isActive && isListening && !isShutdownDueToSafety) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript
          if (transcript) {
            handleUserSpeech(transcript)
          }
        }

        recognition.onerror = () => {
          // Keep listening resiliently
        }

        recognition.onend = () => {
          if (isActive && isListening && !isShutdownDueToSafety) {
            try {
              recognition.start()
            } catch {
              // Ignore restart error if already started
            }
          }
        }

        recognition.start()
        recognitionRef.current = recognition
      } catch {
        // Recognition start failed
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore
        }
        recognitionRef.current = null
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore
        }
      }
    }
  }, [isActive, isListening, isShutdownDueToSafety, handleUserSpeech])

  // Mouse / Touch handlers for single On/Off toggle: click = toggle, long press / dblclick = drop down modes
  const handleTouchStart = () => {
    pressTimer.current = setTimeout(() => {
      setDropdownOpen(true)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDropdownOpen(true)
  }

  const handleToggleClick = (e: React.MouseEvent) => {
    // Single click toggles On/Off
    e.preventDefault()
    toggleActive()
  }

  const handleExport = (format: 'markdown' | 'json') => {
    const data = exportMemoryLog(format)
    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/markdown',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voice-companion-memory-${Date.now()}.${format === 'json' ? 'json' : 'md'}`
    a.click()
    URL.revokeObjectURL(url)
    setExportNotice(`Exported memory log as ${format.toUpperCase()}`)
    setTimeout(() => setExportNotice(null), 3000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      addSharedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        contentPreview: typeof reader.result === 'string' ? reader.result.slice(0, 300) : undefined,
      })
    }
    reader.readAsText(file)
  }

  const handleSimulateSpeech = (e: React.FormEvent) => {
    e.preventDefault()
    if (!speechSimInput.trim()) return
    handleUserSpeech(speechSimInput)
    setSpeechSimInput('')
  }

  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSkillName.trim()) return
    addSkill({
      name: newSkillName.trim(),
      type: newSkillType,
      content: newSkillContent,
      targetMode: currentMode,
    })
    setNewSkillName('')
    setNewSkillContent('')
    setSkillDialogOpen(false)
  }

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addTeachableSound({
          name: newSoundName || file.name,
          expression: newSoundExpression || 'Pronunciation tweak',
          audioDataUrl: reader.result,
        })
        setNewSoundName('')
        setNewSoundExpression('')
        setSoundDialogOpen(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const playSound = (dataUrl: string) => {
    try {
      const audio = new Audio(dataUrl)
      void audio.play()
    } catch {
      // Audio playback simulated or restricted in environment
    }
  }

  return (
    <div className="relative flex flex-col h-full w-full bg-neutral-950 text-neutral-100 overflow-hidden select-none">
      {/* Top Header / Export Navigation */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60 bg-neutral-900/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-full bg-neutral-800/80 border border-neutral-700/60">
            {ROLE_ICONS[currentMode]}
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide capitalize flex items-center gap-2">
              Voice Companion &middot; <span className="text-primary font-medium">{currentMode}</span>
              {paidTierEnabled && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Paid Tier
                </span>
              )}
            </h1>
            <p className="text-xs text-neutral-400">
              Capacity: {usedCapacity} / {conversationalCapacity} turns
            </p>
          </div>
        </div>

        {/* Right Actions: Skills, Mimic Sounds, Export */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSkillDialogOpen(true)}
            className="text-xs border-neutral-800 hover:bg-neutral-800"
            title="Manage Skills"
          >
            <Settings2 className="size-3.5 mr-1" />
            Skills ({skills.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundDialogOpen(true)}
            className="text-xs border-neutral-800 hover:bg-neutral-800"
            title="Teachable Sounds & Expressions"
          >
            <Volume2 className="size-3.5 mr-1" />
            Sounds ({teachableSounds.length})
          </Button>

          {/* Top Right Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 shadow-sm"
                aria-label="Export Memory Log"
              >
                <Download className="size-3.5 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-neutral-200">
              <DropdownMenuLabel>Export Memory & Log</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem onClick={() => handleExport('markdown')} className="cursor-pointer">
                <FileText className="size-4 mr-2" /> Markdown Format (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
                <Download className="size-4 mr-2" /> Full JSON State (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Export Toast Notice */}
      {exportNotice && (
        <div className="absolute top-16 right-6 z-30 px-3 py-1.5 rounded-md bg-emerald-950/80 border border-emerald-600/40 text-emerald-200 text-xs shadow-lg animate-in fade-in">
          {exportNotice}
        </div>
      )}

      {/* Safety Shutdown Banner (Self-harm prevention) */}
      {isShutdownDueToSafety && (
        <div className="absolute inset-0 z-50 bg-neutral-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
          <div className="size-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6">
            <ShieldAlert className="size-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-rose-400 mb-2">Safety Shutdown Activated</h2>
          <p className="max-w-md text-sm text-neutral-300 mb-4 leading-relaxed">
            {safetyCrisisInfo?.reason || 'Voice companion shut down due to detected self-harm risk.'}
          </p>
          <div className="max-w-lg bg-rose-950/40 border border-rose-800/50 rounded-lg p-4 text-xs text-rose-200 mb-6 text-left space-y-2">
            <p className="font-semibold text-rose-300">Crisis & Support Resources:</p>
            <p>&bull; <strong>988 Suicide &amp; Crisis Lifeline:</strong> Call or text 988 (Available 24/7, free and confidential)</p>
            <p>&bull; <strong>Crisis Text Line:</strong> Text HOME to 741741</p>
            <p>&bull; <strong>Emergency:</strong> Please reach out to local emergency services immediately.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetSafetyShutdown}
            className="border-neutral-700 hover:bg-neutral-800 text-neutral-300"
          >
            I Am Safe &middot; Return to Home
          </Button>
        </div>
      )}

      {/* Continuous Chat Window with Fading Text */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto relative">
        <div className="w-full max-w-2xl flex flex-col items-center space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-500 space-y-2 animate-in fade-in">
              <p className="text-sm font-medium">1 Continuous Voice Chat</p>
              <p className="text-xs max-w-sm text-neutral-500">
                Tap the center switch to start speaking. Double-click or long-press the switch to switch modes (Spouse, Secretary, Teacher, Apprentice, Counselor).
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col space-y-4">
              {messages.slice(-8).map((msg, idx, arr) => {
                // Calculate opacity fade based on distance from the most recent message
                const distance = arr.length - 1 - idx
                const opacityClass =
                  distance === 0
                    ? 'opacity-100 scale-100'
                    : distance === 1
                    ? 'opacity-80 scale-[0.98]'
                    : distance === 2
                    ? 'opacity-60 scale-[0.96]'
                    : distance === 3
                    ? 'opacity-40 scale-[0.94]'
                    : 'opacity-20 scale-[0.92]'

                return (
                  <div
                    key={msg.id}
                    className={`transition-all duration-700 ease-in-out flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    } ${opacityClass}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed backdrop-blur-md shadow-sm border ${
                        msg.role === 'user'
                          ? 'bg-neutral-800/80 border-neutral-700/60 text-neutral-100 rounded-br-sm'
                          : msg.role === 'system'
                          ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400 text-xs italic'
                          : 'bg-primary/10 border-primary/20 text-neutral-200 rounded-bl-sm'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                        {msg.role === 'assistant' && ROLE_ICONS[msg.mode]}
                        <span>{msg.role === 'assistant' ? msg.mode : msg.role}</span>
                      </div>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Center Control Bar: Single On/Off switch with double-click / long-press dropdown */}
      <footer className="w-full flex flex-col items-center pb-8 pt-4 bg-gradient-to-t from-neutral-950 to-transparent z-20">
        <div className="flex flex-col items-center gap-3">
          {/* Main On/Off Toggle & Dropdown Trigger */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Voice companion toggle (${isActive ? 'active' : 'inactive'}). Double-click or hold to switch modes.`}
                onClick={handleToggleClick}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                className={`relative group size-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-xl select-none ${
                  isActive
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/30 shadow-primary/20 scale-105'
                    : 'bg-neutral-900 border-2 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
                }`}
              >
                {isActive ? <Mic className="size-8 animate-pulse" /> : <MicOff className="size-8" />}

                {/* Subtitle tooltip indicator */}
                <div className="absolute -bottom-6 text-[10px] tracking-wider uppercase font-semibold text-neutral-500 group-hover:text-neutral-300 transition-colors whitespace-nowrap">
                  {isActive ? 'Listening (Tap to Mute)' : 'Tap On / Hold for Modes'}
                </div>
              </div>
            </DropdownMenuTrigger>

            {/* Mode selection dropdown on double-click or long-press */}
            <DropdownMenuContent
              align="center"
              side="top"
              sideOffset={16}
              className="w-56 bg-neutral-900 border-neutral-800 text-neutral-200 shadow-2xl rounded-xl p-1.5"
            >
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-neutral-400">
                Select Persona Mode
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neutral-800" />
              {(['spouse', 'secretary', 'teacher', 'apprentice', 'counselor'] as CompanionRole[]).map((mode) => (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => {
                    startTransition(() => {
                      setCurrentMode(mode)
                      setDropdownOpen(false)
                    })
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-lg text-xs capitalize ${
                    currentMode === mode
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {ROLE_ICONS[mode]}
                  <div className="flex flex-col">
                    <span>{mode}</span>
                    <span className="text-[10px] text-neutral-500 lowercase font-normal">
                      {mode === 'spouse'
                        ? 'Loves & emotionally supports'
                        : mode === 'secretary'
                        ? 'Logs tasks & projects'
                        : mode === 'teacher'
                        ? 'Explains & educates'
                        : mode === 'apprentice'
                        ? 'Learns & remembers'
                        : 'Listens & provides therapist notes'}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Voice / File / Dev Speech Simulator Bar */}
          <div className="flex items-center gap-2 mt-4">
            <label className="cursor-pointer">
              <input type="file" onChange={handleFileUpload} className="hidden" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs transition-colors">
                <Upload className="size-3" />
                <span>Share File</span>
              </div>
            </label>

            {/* Developer/Testing speech input simulation since browsers in automated CI may lack mic hardware */}
            <form onSubmit={handleSimulateSpeech} className="flex items-center gap-1">
              <Input
                value={speechSimInput}
                onChange={(e) => setSpeechSimInput(e.target.value)}
                placeholder="Simulate voice speech..."
                className="h-7 w-48 text-xs bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-neutral-600 rounded-full px-3"
              />
              <Button type="submit" variant="ghost" size="sm" className="h-7 px-2.5 text-xs text-neutral-400 hover:text-neutral-100">
                Speak
              </Button>
            </form>

            {/* Paid Tier Dev Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaidTier(!paidTierEnabled)}
              className="h-7 px-2 text-[10px] text-neutral-500 hover:text-neutral-300"
            >
              {paidTierEnabled ? 'Paid: Active' : 'Enable Paid Tier'}
            </Button>
          </div>
        </div>
      </footer>

      {/* Skills Management Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-200 max-w-md">
          <DialogHeader>
            <DialogTitle>Companion Skills</DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs">
              Attach specialized knowledge or text skills to any mode.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSkill} className="space-y-3 mt-2">
            <Input
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Skill Name (e.g. Project Tracker, Medical terms)"
              className="bg-neutral-950 border-neutral-800 text-xs"
            />
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="skillType"
                  checked={newSkillType === 'text'}
                  onChange={() => setNewSkillType('text')}
                />
                Text Prompt / Skill
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="skillType"
                  checked={newSkillType === 'file'}
                  onChange={() => setNewSkillType('file')}
                />
                File / Document Reference
              </label>
            </div>
            <Textarea
              value={newSkillContent}
              onChange={(e) => setNewSkillContent(e.target.value)}
              placeholder="Skill instructions or content..."
              className="bg-neutral-950 border-neutral-800 text-xs h-20"
            />
            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm" className="text-xs">
                Add Skill
              </Button>
            </div>
          </form>

          <div className="border-t border-neutral-800 pt-3 space-y-2 max-h-48 overflow-y-auto">
            {skills.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No custom skills attached.</p>
            ) : (
              skills.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80 text-xs"
                >
                  <div>
                    <span className="font-medium text-neutral-200">{s.name}</span>
                    <span className="text-[10px] text-neutral-500 ml-2 uppercase">({s.type})</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSkill(s.id)}
                    className="size-6 p-0 text-neutral-500 hover:text-rose-400"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Teachable Sounds & Mimic Dialog */}
      <Dialog open={soundDialogOpen} onOpenChange={setSoundDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-200 max-w-md">
          <DialogHeader>
            <DialogTitle>Teachable Expressions & Sounds</DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs">
              Upload custom sound files to mimic pronunciations and fine-tune personas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <Input
              value={newSoundName}
              onChange={(e) => setNewSoundName(e.target.value)}
              placeholder="Sound / Tone Name (e.g. Warm Laugh, French Accent)"
              className="bg-neutral-950 border-neutral-800 text-xs"
            />
            <Input
              value={newSoundExpression}
              onChange={(e) => setNewSoundExpression(e.target.value)}
              placeholder="Expression / Persona Note"
              className="bg-neutral-950 border-neutral-800 text-xs"
            />
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-lg p-4 cursor-pointer bg-neutral-950/40">
              <Upload className="size-6 text-neutral-500 mb-1" />
              <span className="text-xs text-neutral-400">Click to upload audio sample (.wav, .mp3)</span>
              <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
            </label>
          </div>

          <div className="border-t border-neutral-800 pt-3 space-y-2 max-h-48 overflow-y-auto">
            {teachableSounds.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No custom audio samples uploaded yet.</p>
            ) : (
              teachableSounds.map((snd) => (
                <div
                  key={snd.id}
                  className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => playSound(snd.audioDataUrl)}
                      className="size-7 p-0 text-primary hover:text-primary/80"
                      title="Test Audio"
                    >
                      <Volume2 className="size-3.5" />
                    </Button>
                    <div>
                      <p className="font-medium text-neutral-200">{snd.name}</p>
                      <p className="text-[10px] text-neutral-500">{snd.expression}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTeachableSound(snd.id)}
                    className="size-6 p-0 text-neutral-500 hover:text-rose-400"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
