import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { submitGuessSchema } from '@/lib/validators'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    const upperCode = code.toUpperCase()
    const body = await request.json()
    const validated = submitGuessSchema.parse(body)

    const playerId = request.headers.get('x-player-id') || body.player_id

    if (!playerId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Player ID required' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Get event and game state
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, code')
      .eq('code', upperCode)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'event_not_found', message: 'Event not found' },
        { status: 404 }
      )
    }

    // Check game state
    const { data: gameState } = await supabase
      .from('game_state')
      .select('current_phase, phase_ends_at')
      .eq('event_id', (event as any).id)
      .single()

    if (!gameState || (gameState as any).current_phase !== 'discovery') {
      return NextResponse.json(
        { error: 'wrong_phase', message: 'Not in discovery phase' },
        { status: 409 }
      )
    }

    // Check deadline
    if ((gameState as any).phase_ends_at) {
      const deadline = new Date((gameState as any).phase_ends_at)
      if (new Date() > deadline) {
        return NextResponse.json(
          { error: 'deadline_passed', message: 'Discovery deadline has passed' },
          { status: 408 }
        )
      }
    }

    // Get current player with their target
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, target_id, found_at')
      .eq('id', playerId)
      .eq('event_id', (event as any).id)
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'player_not_found', message: 'Player not found' },
        { status: 404 }
      )
    }

    // Already found their target
    if ((player as any).found_at) {
      return NextResponse.json(
        { error: 'already_found', message: 'You already found your target' },
        { status: 409 }
      )
    }

    // Get target player
    const { data: targetPlayer } = await supabase
      .from('players')
      .select('id, username')
      .eq('event_id', (event as any).id)
      .eq('username', validated.guessed_username)
      .single()

    if (!targetPlayer) {
      return NextResponse.json(
        { error: 'player_not_found', message: 'No player with that username' },
        { status: 404 }
      )
    }

    // Check if guess is correct
    const isCorrect = (targetPlayer as any).id === (player as any).target_id

    if (!isCorrect) {
      return NextResponse.json({
        success: false,
        correct: false,
        message: "That's not your person. Keep looking!"
      }, { status: 200 })
    }

    // Correct guess - award points
    const now = new Date().toISOString()

    // Update player as found
    const { error: updateError } = await supabase
      .from('players')
      .update({ found_at: now } as any)
      .eq('id', playerId)

    if (updateError) {
      console.error('Error updating player:', updateError)
    }

    // Award points to finder (+100)
    await supabase
      .from('score_events')
      .insert({
        event_id: (event as any).id,
        player_id: playerId,
        points: 100,
        reason: 'finder'
      } as any)

    // Award points to found player (+50)
    await supabase
      .from('score_events')
      .insert({
        event_id: (event as any).id,
        player_id: (targetPlayer as any).id,
        points: 50,
        reason: 'found'
      } as any)

    return NextResponse.json({
      success: true,
      correct: true,
      message: '🎉 YOU FOUND THEM!',
      target_username: (targetPlayer as any).username,
      points_earned: {
        finder: 100,
        found: 50
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error in POST /api/events/[code]/guess:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid input' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
