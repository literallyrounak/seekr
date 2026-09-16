import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createEventSchema } from '@/lib/validators'
import { DEFAULT_QUESTIONS, generateEventCode } from '@/lib/game-logic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createEventSchema.parse(body)

    const supabase = createServerClient()

    // Generate unique event code
    let code = generateEventCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('events')
        .select('code')
        .eq('code', code)
        .single()

      if (!existing) break
      code = generateEventCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'failed_to_generate_code', message: 'Could not generate unique event code' },
        { status: 500 }
      )
    }

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        code,
        name: validated.name,
        max_players: validated.max_players,
        questions: validated.questions || DEFAULT_QUESTIONS,
        answer_time_seconds: validated.answer_time_seconds,
        discovery_time_seconds: validated.discovery_time_seconds
      } as any)
      .select()
      .single()

    if (eventError || !event) {
      console.error('Error creating event:', eventError)
      return NextResponse.json(
        { error: 'database_error', message: eventError?.message || 'Failed to create event', details: eventError },
        { status: 500 }
      )
    }

    // Create initial game state
    const { error: stateError } = await supabase
      .from('game_state')
      .insert({
        event_id: (event as any).id,
        current_phase: 'lobby'
      } as any)

    if (stateError) {
      console.error('Error creating game state:', stateError)
    }

    return NextResponse.json({
      event: {
        id: (event as any).id,
        code: (event as any).code,
        name: (event as any).name,
        max_players: (event as any).max_players,
        questions: (event as any).questions,
        answer_time_seconds: (event as any).answer_time_seconds,
        discovery_time_seconds: (event as any).discovery_time_seconds
      },
      qr_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${code}`
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/events:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid input', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
