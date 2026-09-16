import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { executeTransitionToDiscovery, executeTransitionToEnded } from '@/lib/transitions'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    const upperCode = code.toUpperCase()
    const { target_phase } = await request.json()

    const supabase = createServerClient()

    // Get event
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

    if (target_phase === 'discovery') {
      const result = await executeTransitionToDiscovery(
        (event as any).id,
        (event as any).discovery_time_seconds
      )

      if (!result.success) {
        return NextResponse.json(
          { error: 'transition_failed', message: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json(result, { status: 200 })
    }

    if (target_phase === 'ended') {
      const result = await executeTransitionToEnded((event as any).id)
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json(
      { error: 'invalid_phase', message: 'Invalid target phase' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in POST /api/events/[code]/transition:', error)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
