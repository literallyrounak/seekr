import { Player } from '@/types'

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Assign targets using a derangement (no self-assignments)
 * Returns a Map of player_id -> target_id
 */
export function assignTargets(players: Player[]): Map<string, string> {
  if (players.length < 2) {
    throw new Error('Need at least 2 players to assign targets')
  }

  const assignments = new Map<string, string>()
  const playerIds = players.map(p => p.id)

  // Try to create a derangement (no fixed points)
  let shuffled = [...playerIds]
  let attempts = 0
  const maxAttempts = 100

  do {
    shuffled = shuffle(playerIds)
    attempts++
  } while (
    shuffled.some((id, i) => id === playerIds[i]) &&
    attempts < maxAttempts
  )

  if (attempts >= maxAttempts) {
    // Fallback: rotate by 1 (guaranteed derangement for n >= 2)
    shuffled = [...playerIds.slice(1), playerIds[0]]
  }

  // Create the mapping: player[i] targets shuffled[i]
  playerIds.forEach((playerId, i) => {
    assignments.set(playerId, shuffled[i])
  })

  return assignments
}

/**
 * Validate that target assignment is a valid derangement
 */
export function validateTargetAssignment(
  players: Player[],
  assignments: Map<string, string>
): boolean {
  const playerIds = new Set(players.map(p => p.id))

  // Check all players have a target
  if (assignments.size !== players.length) return false

  // Check no self-assignments
  for (const [playerId, targetId] of assignments) {
    if (playerId === targetId) return false
    if (!playerIds.has(targetId)) return false
  }

  // Check each player is targeted exactly once
  const targetCounts = new Map<string, number>()
  for (const targetId of assignments.values()) {
    targetCounts.set(targetId, (targetCounts.get(targetId) || 0) + 1)
  }

  for (const playerId of playerIds) {
    if ((targetCounts.get(playerId) || 0) !== 1) return false
  }

  return true
}

/**
 * Generate a random event code (4-6 characters, alphanumeric)
 */
export function generateEventCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Calculate time remaining in seconds
 */
export function getTimeRemaining(deadline: Date): number {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  return Math.max(0, Math.floor(diff / 1000))
}

/**
 * Format time as MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Default questions for the game
 */
export const DEFAULT_QUESTIONS = [
  { text: "What's your favorite cuisine?" },
  { text: "What's your favorite movie?" },
  { text: "What song can you not get out of your head?" },
  { text: "What's one thing you can't live without?" },
  { text: "What's your dream vacation destination?" }
]
