import { createFileRoute } from '@tanstack/react-router'
import VoiceCompanion from '@/containers/VoiceCompanion'

export const Route = createFileRoute('/voice-companion')({
  component: VoiceCompanionRoute,
})

function VoiceCompanionRoute() {
  return <VoiceCompanion />
}
