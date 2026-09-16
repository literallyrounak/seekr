import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { joinEventSchema } from '@/lib/validators'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    const upperCode = code.toUpperCase()
    const body = await request.json()
    const validated = joinEventSchema.parse(body)

    const supabase = createServerClient()

    // Get event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, code, name, max_players, started_at')
      .eq('code', upperCode)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'event_not_found', message: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if event has started
    if ((event as any).started_at) {
      return NextResponse.json(
        { error: 'event_started', message: 'Event has already started' },
        { status: 409 }
      )
    }

    // Check player count
    const { count, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', (event as any).id)

    if (countError) {
      console.error('Error counting players:', countError)
    }

    if (count && count >= (event as any).max_players) {
      return NextResponse.json(
        { error: 'event_full', message: 'Event is full' },
        { status: 409 }
      )
    }

    // Check for duplicate username
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('event_id', (event as any).id)
      .eq('username', validated.username)
      .single()

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'username_taken', message: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Create player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        event_id: (event as any).id,
        username: validated.username
      } as any)
      .select()
      .single()

    if (playerError || !player) {
      console.error('Error creating player:', playerError)
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to join event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      player: {
        id: (player as any).id,
        username: (player as any).username,
        event_id: (player as any).event_id
      },
      event: {
        code: (event as any).code,
        name: (event as any).name
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error in POST /api/events/[code]/join:', error)

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
