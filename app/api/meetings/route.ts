import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('[v0] Fetching meetings...')
    const user = await getUserFromToken(request)
    if (!user) {
      console.log('[v0] Unauthorized - no user token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const clientName = request.nextUrl.searchParams.get('clientName')
    
    let query = supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('time', { ascending: false })

    if (clientName) {
      query = query.eq('client_id', clientName)
    }

    const { data: meetings, error } = await query

    if (error) {
      console.error('[v0] Error fetching meetings from Supabase:', error)
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
    }

    // Fetch attendees and action items for each meeting
    const meetingsWithDetails = await Promise.all(
      (meetings || []).map(async (meeting: any) => {
        const [attendeesResult, actionItemsResult] = await Promise.all([
          supabase
            .from('meeting_attendees')
            .select(`
              user_id,
              users (id, full_name, role)
            `)
            .eq('meeting_id', (meeting as any).id),
          supabase
            .from('meeting_action_items')
            .select(`
              id,
              description,
              assigned_to,
              due_date,
              completed,
              users (id, full_name)
            `)
            .eq('meeting_id', (meeting as any).id)
        ])

        return {
          ...(meeting as any),
          attendees: attendeesResult.data?.map((a: any) => ({
            id: a.users?.id,
            full_name: a.users?.full_name,
            role: a.users?.role
          })) || [],
          action_items: actionItemsResult.data?.map((item: any) => ({
            id: item.id,
            description: item.description,
            owner: item.users?.full_name || 'Unassigned',
            dueDate: item.due_date,
            completed: item.completed
          })) || []
        }
      })
    )

    const meetingsWithAttendees = meetingsWithDetails; // Declare the variable

    console.log('[v0] Fetched meetings successfully:', meetingsWithDetails.length)
    return NextResponse.json({ meetings: meetingsWithDetails })
  } catch (error) {
    console.error('[v0] Error fetching meetings:', error)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Creating meeting...')
    const user = await getUserFromToken(request)
    if (!user) {
      console.log('[v0] Unauthorized - no user token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { title, clientName, clientId: bodyClientId, date, time, repeatWeekly, attendees, notes } = body

    // Accept either clientName (string) or clientId (UUID).
    // If UUID is provided, look up the client name to store as client_id.
    let resolvedClientId: string | null = null
    if (clientName && typeof clientName === 'string') {
      resolvedClientId = clientName
    } else if (bodyClientId && typeof bodyClientId === 'string') {
      // Look up the client name from its UUID so client_id stays consistent
      const { data: clientRow } = await supabase
        .from('clients').select('name').eq('id', bodyClientId).single()
      resolvedClientId = (clientRow as any)?.name || bodyClientId
    }

    if (!resolvedClientId) {
      return NextResponse.json({ error: 'Client is required' }, { status: 400 })
    }

    // Insert meeting
    const { data: meetingRaw, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        user_id: user.id,
        title: title || null,
        client_id: resolvedClientId,
        date,
        time,
        repeat_weekly: repeatWeekly || false,
        notes: notes || '',
        status: 'scheduled'
      } as any)
      .select()
      .single()
    const meeting = meetingRaw as any

    if (meetingError || !meeting) {
      console.error('[v0] Error creating meeting:', meetingError)
      return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
    }

    // Insert attendees if provided
    if (attendees && attendees.length > 0) {
      const attendeeRecords = attendees.map((attendeeId: string) => ({
        meeting_id: (meeting as any).id,
        user_id: attendeeId
      }))

      const { error: attendeesError } = await supabase
        .from('meeting_attendees')
        .insert(attendeeRecords as any)

      if (attendeesError) {
        console.error('[v0] Error adding attendees:', attendeesError)
      }

      // Fetch attendee details
      const { data: attendeeDetails } = await supabase
        .from('meeting_attendees')
        .select(`
          user_id,
          users (id, full_name, role)
        `)
        .eq('meeting_id', (meeting as any).id)

      ;(meeting as any).attendees = (attendeeDetails as any[])?.map((a: any) => ({
        id: a.users?.id,
        full_name: a.users?.full_name,
        role: a.users?.role
      })) || []
    } else {
      ;(meeting as any).attendees = []
    }

    console.log('[v0] Meeting created successfully:', (meeting as any).id)
    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating meeting:', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('[v0] Updating meeting...')
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { id, clientName, date, time, repeatWeekly, attendees, notes, status } = body

    // Update meeting
    const { data: meetingUpdateRaw, error: meetingError } = await (supabase as any)
      .from('meetings')
      .update({
        client_id: clientName || null,
        date,
        time,
        repeat_weekly: repeatWeekly || false,
        notes: notes || '',
        status: status || 'scheduled'
      } as any)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    const meeting = meetingUpdateRaw as any

    if (meetingError || !meeting) {
      console.error('[v0] Error updating meeting:', meetingError)
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Update attendees
    if (attendees) {
      await supabase.from('meeting_attendees').delete().eq('meeting_id', id)

      if (attendees.length > 0) {
        const attendeeRecords = attendees.map((attendeeId: string) => ({
          meeting_id: id,
          user_id: attendeeId
        }))
        await supabase.from('meeting_attendees').insert(attendeeRecords as any)
      }

      const { data: attendeeDetails } = await supabase
        .from('meeting_attendees')
        .select('user_id, users (id, full_name, role)')
        .eq('meeting_id', id)

      meeting.attendees = (attendeeDetails as any[])?.map((a: any) => ({
        id: a.users?.id,
        full_name: a.users?.full_name,
        role: a.users?.role
      })) || []
    }

    console.log('[v0] Meeting updated successfully')
    return NextResponse.json({ meeting })
  } catch (error) {
    console.error('[v0] Error updating meeting:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('[v0] Deleting meeting...')
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    // Delete attendees first
    await supabase
      .from('meeting_attendees')
      .delete()
      .eq('meeting_id', id)

    // Delete meeting
    const { data, error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()

    if (error || !data || data.length === 0) {
      console.error('[v0] Error deleting meeting:', error)
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    console.log('[v0] Meeting deleted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error deleting meeting:', error)
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}
