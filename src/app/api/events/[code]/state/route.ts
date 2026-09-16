import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { executeTransitionToDiscovery, executeTransitionToEnded } from '@/lib/transitions'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    const upperCode = code.toUpperCase()
    const playerId = request.headers.get('x-player-id')

    const supabase = createServerClient()

    // Get event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('code', upperCode)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'event_not_found', message: 'Event not found' },
        { status: 404 }
      )
    }

    // Get game state
    let { data: gameState } = await supabase
      .from('game_state')
      .select('*')
      .eq('event_id', (event as any).id)
      .single()

    // Check for automatic timer-based phase transitions
    if (gameState && (gameState as any).phase_ends_at) {
      const deadline = new Date((gameState as any).phase_ends_at)
      const now = new Date()

      if (now > deadline) {
        if ((gameState as any).current_phase === 'answering') {
          // Timer expired for answering phase -> auto-transition to discovery
          await executeTransitionToDiscovery((event as any).id, (event as any).discovery_time_seconds)
          const { data: updatedState } = await supabase
            .from('game_state')
            .select('*')
            .eq('event_id', (event as any).id)
            .single()
          gameState = updatedState
        } else if ((gameState as any).current_phase === 'discovery') {
          // Timer expired for discovery phase -> auto-transition to ended
          await executeTransitionToEnded((event as any).id)
          const { data: updatedState } = await supabase
            .from('game_state')
            .select('*')
            .eq('event_id', (event as any).id)
            .single()
          gameState = updatedState
        }
      }
    }

    // Get all players (for lobby and leaderboard)
    const { data: players } = await supabase
      .from('players')
      .select('id, username, is_host, joined_at, found_at')
      .eq('event_id', (event as any).id)
      .order('joined_at', { ascending: true })

    // Filter out dummy host from player count display if non-host players exist
    const realPlayers = (players || []).filter((p: any) => !p.is_host && p.username !== 'Host')
    const displayPlayers = realPlayers.length > 0 ? realPlayers : (players || [])

    // Get leaderboard
    const { data: scoreEvents } = await supabase
      .from('score_events')
      .select('player_id, points')
      .eq('event_id', (event as any).id)

    const leaderboard = new Map<string, number>()
    scoreEvents?.forEach((se: any) => {
      leaderboard.set(se.player_id, (leaderboard.get(se.player_id) || 0) + se.points)
    })

    // Get answers count
    const { data: allAnswers } = await supabase
      .from('answers')
      .select('player_id')
      .eq('event_id', (event as any).id)

    const uniquePlayersWithAnswers = new Set(allAnswers?.map(a => a.player_id) || [])

    // Player-specific data
    let myTargetAnswers = null
    let myAnswers = null

    if (playerId && (gameState as any)?.current_phase === 'discovery') {
      // Get player's target
      const { data: player } = await supabase
        .from('players')
        .select('target_id')
        .eq('id', playerId)
        .single()

      if ((player as any)?.target_id) {
        // Get target's answers (but NOT their username/identity)
        const { data: targetAnswers } = await supabase
          .from('answers')
          .select('question_index, answer_text')
          .eq('player_id', (player as any).target_id)
          .order('question_index', { ascending: true })

        myTargetAnswers = targetAnswers
      }
    }

    if (playerId) {
      // Get player's own answers
      const { data: answers } = await supabase
        .from('answers')
        .select('question_index, answer_text')
        .eq('player_id', playerId)
        .order('question_index', { ascending: true })

      myAnswers = answers
    }

    // Calculate time remaining
    let timeRemaining = null
    if ((gameState as any)?.phase_ends_at) {
      const deadline = new Date((gameState as any).phase_ends_at)
      const now = new Date()
      timeRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000))
    }

    return NextResponse.json({
      event: {
        ...(event as any),
        players: displayPlayers.map((p: any) => ({
          ...p,
          total_points: leaderboard.get(p.id) || 0
        })),
        answers_submitted_count: uniquePlayersWithAnswers.size,
        game_state: gameState ? {
          ...(gameState as any),
          time_remaining: timeRemaining
        } : null
      },
      my_state: playerId ? {
        my_answers: myAnswers,
        my_target_answers: myTargetAnswers
      } : null
    }, { status: 200 })

  } catch (error) {
    console.error('Error in GET /api/events/[code]/state:', error)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
