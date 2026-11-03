/**
 * Safety and Crisis Monitoring Service for Voice Companion.
 *
 * Strict policy: Any indication of self-harm or suicide results in immediate shutdown
 * of the voice companion session and provision of crisis resources.
 */

export interface SafetyCheckResult {
  isCrisis: boolean
  reason?: string
  guidance?: string
}

export const CRISIS_RESOURCES = {
  nationalLifeline: '988 Suicide & Crisis Lifeline: Call or text 988 (USA & Canada)',
  internationalText: 'Crisis Text Line: Text HOME to 741741',
  globalBefrienders: 'Befrienders Worldwide: https://www.befrienders.org',
  emergency: 'If you or someone you know is in immediate danger, please contact local emergency services (e.g. 911 / 112) immediately.',
}

const SELF_HARM_PATTERNS: RegExp[] = [
  /\bkill\s+(myself|me)\b/i,
  /\bcommit\s+suicide\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bend\s+my\s+life\b/i,
  /\btake\s+my\s+own\s+life\b/i,
  /\bhang\s+myself\b/i,
  /\bhurt\s+myself\b/i,
  /\bcut\s+(myself|my\s+wrist|my\s+wrists)\b/i,
  /\boverdose\s+on\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bdon't\s+want\s+to\s+live\b/i,
  /\bdont\s+want\s+to\s+live\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bready\s+to\s+end\s+it\b/i,
  /\bsuicide\s+(note|method|plan)\b/i,
  /\bthinking\s+of\s+suicide\b/i,
]

/**
 * Checks input text or conversational context for self-harm or suicide risk.
 * If detected, triggers immediate shutdown recommendation.
 */
export function checkSelfHarmRisk(text: string): SafetyCheckResult {
  if (!text || typeof text !== 'string') {
    return { isCrisis: false }
  }

  const normalized = text.trim().toLowerCase()

  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isCrisis: true,
        reason: 'Detected self-harm or suicide inquiry. Voice companion shutting down for user safety.',
        guidance: `${CRISIS_RESOURCES.nationalLifeline}. ${CRISIS_RESOURCES.emergency}`,
      }
    }
  }

  return { isCrisis: false }
}
