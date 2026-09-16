import { createServerClient } from '@/lib/supabase'
import { assignTargets } from '@/lib/game-logic'

export async function executeTransitionToDiscovery(eventId: string, discoveryTimeSeconds: number) {
  const supabase = createServerClient()

  // 1. Get all players for this event
  const { data: allPlayers, error: playersError } = await supabase
    .from('players')
    .select('id, username, is_host')
    .eq('event_id', eventId)

  if (playersError || !allPlayers || allPlayers.length < 2) {
    return { success: false, error: 'Need at least 2 players to start discovery phase' }
  }

  // Filter out any dummy 'Host' player who never submitted answers if other players exist
  let activePlayers = allPlayers
  const nonHostPlayers = allPlayers.filter(p => !p.is_host && p.username !== 'Host')
  if (nonHostPlayers.length >= 2) {
    activePlayers = nonHostPlayers
  }

  // 2. Assign targets (derangement: no self-assignment, 1-to-1)
  const targetAssignments = assignTargets(activePlayers as any)

  // 3. Update each player with their target_id
  for (const [playerId, targetId] of targetAssignments.entries()) {
    await supabase
      .from('players')
      .update({ target_id: targetId } as any)
      .eq('id', playerId)
  }

  // 4. Update game state to discovery
  const now = new Date()
  const discoveryDeadline = new Date(now.getTime() + (discoveryTimeSeconds || 300) * 1000)

  const { error: stateError } = await supabase
    .from('game_state')
    .update({
      current_phase: 'discovery',
      phase_started_at: now.toISOString(),
      phase_ends_at: discoveryDeadline.toISOString()
    } as any)
    .eq('event_id', eventId)

  if (stateError) {
    console.error('Error updating game state to discovery:', stateError)
    return { success: false, error: 'Failed to update game state' }
  }

  return {
    success: true,
    phase: 'discovery',
    deadline: discoveryDeadline.toISOString()
  }
}

export async function executeTransitionToEnded(eventId: string) {
  const supabase = createServerClient()
  const now = new Date().toISOString()

  await supabase
    .from('game_state')
    .update({
      current_phase: 'ended',
      phase_ends_at: now
    } as any)
    .eq('event_id', eventId)

  await supabase
    .from('events')
    .update({ ended_at: now } as any)
    .eq('id', eventId)

  return { success: true, phase: 'ended' }
}
