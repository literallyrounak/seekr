import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    const upperCode = code.toUpperCase()
    const supabase = createServerClient()

    // Get event with players and game state
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

    // Get players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, username, is_host, joined_at')
      .eq('event_id', (event as any).id)
      .order('joined_at', { ascending: true })

    if (playersError) {
      console.error('Error fetching players:', playersError)
    }

    // Get game state
    const { data: gameState, error: stateError } = await supabase
      .from('game_state')
      .select('*')
      .eq('event_id', (event as any).id)
      .single()

    if (stateError) {
      console.error('Error fetching game state:', stateError)
    }

    return NextResponse.json({
      event: {
        ...(event as any),
        players: players || [],
        game_state: gameState || null
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error in GET /api/events/[code]:', error)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
