import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { submitAnswersSchema } from '@/lib/validators'
import { executeTransitionToDiscovery } from '@/lib/transitions'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    const upperCode = code.toUpperCase()
    const body = await request.json()
    const validated = submitAnswersSchema.parse(body)

    // Extract player_id from header or body
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
      .select('id, code, discovery_time_seconds')
      .eq('code', upperCode)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'event_not_found', message: 'Event not found' },
        { status: 404 }
      )
    }

    // Check game state and deadline
    const { data: gameState } = await supabase
      .from('game_state')
      .select('current_phase, phase_ends_at')
      .eq('event_id', (event as any).id)
      .single()

    if (!gameState || (gameState as any).current_phase !== 'answering') {
      return NextResponse.json(
        { error: 'wrong_phase', message: 'Not in answering phase' },
        { status: 409 }
      )
    }

    // Check deadline (server-authoritative)
    if ((gameState as any).phase_ends_at) {
      const deadline = new Date((gameState as any).phase_ends_at)
      if (new Date() > deadline) {
        return NextResponse.json(
          { error: 'deadline_passed', message: 'Answer submission deadline has passed' },
          { status: 408 }
        )
      }
    }

    // Verify player belongs to this event
    const { data: player } = await supabase
      .from('players')
      .select('id, event_id')
      .eq('id', playerId)
      .eq('event_id', (event as any).id)
      .single()

    if (!player) {
      return NextResponse.json(
        { error: 'player_not_found', message: 'Player not found in this event' },
        { status: 404 }
      )
    }

    // Insert/update answers
    const answersToInsert = validated.answers.map(answer => ({
      event_id: (event as any).id,
      player_id: playerId,
      question_index: answer.question_index,
      answer_text: answer.answer_text
    }))

    // Use upsert to handle re-submissions
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .upsert(answersToInsert as any, {
        onConflict: 'player_id,question_index'
      })
      .select()

    if (answersError) {
      console.error('Error submitting answers:', answersError)
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to submit answers' },
        { status: 500 }
      )
    }

    // Check if all players have now submitted answers
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, is_host, username')
      .eq('event_id', (event as any).id)

    const activePlayers = (allPlayers || []).filter(p => !p.is_host && p.username !== 'Host')
    const targetCount = activePlayers.length > 0 ? activePlayers.length : (allPlayers?.length || 0)

    const { data: allAnswers } = await supabase
      .from('answers')
      .select('player_id')
      .eq('event_id', (event as any).id)

    const distinctPlayersAnswered = new Set(allAnswers?.map(a => a.player_id) || [])

    let transitioned = false
    if (targetCount >= 2 && distinctPlayersAnswered.size >= targetCount) {
      // Automatically advance to discovery phase!
      await executeTransitionToDiscovery((event as any).id, (event as any).discovery_time_seconds)
      transitioned = true
    }

    return NextResponse.json({
      success: true,
      submitted_count: answers?.length || 0,
      all_submitted: transitioned
    }, { status: 200 })

  } catch (error) {
    console.error('Error in POST /api/events/[code]/answers:', error)

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
