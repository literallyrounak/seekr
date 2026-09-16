import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    const upperCode = code.toUpperCase()
    const supabase = createServerClient()

    // Get event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, code, answer_time_seconds')
      .eq('code', upperCode)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'event_not_found', message: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if already started
    const { data: existingState } = await supabase
      .from('game_state')
      .select('current_phase')
      .eq('event_id', (event as any).id)
      .single()

    if (existingState && (existingState as any).current_phase !== 'lobby') {
      return NextResponse.json(
        { error: 'already_started', message: 'Game has already started' },
        { status: 409 }
      )
    }

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, username')
      .eq('event_id', (event as any).id)

    if (playersError || !players || players.length < 2) {
      return NextResponse.json(
        { error: 'not_enough_players', message: 'Need at least 2 players to start' },
        { status: 400 }
      )
    }

    // Start the game
    const now = new Date()
    const answerDeadline = new Date(now.getTime() + (event as any).answer_time_seconds * 1000)

    // Update game state
    const { error: stateError } = await supabase
      .from('game_state')
      .update({
        current_phase: 'answering',
        phase_started_at: now.toISOString(),
        phase_ends_at: answerDeadline.toISOString()
      } as any)
      .eq('event_id', (event as any).id)

    if (stateError) {
      console.error('Error updating game state:', stateError)
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to start game' },
        { status: 500 }
      )
    }

    // Mark event as started
    await supabase
      .from('events')
      .update({ started_at: now.toISOString() } as any)
      .eq('id', (event as any).id)

    return NextResponse.json({
      success: true,
      phase: 'answering',
      deadline: answerDeadline.toISOString()
    }, { status: 200 })

  } catch (error) {
    console.error('Error in POST /api/events/[code]/start:', error)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
