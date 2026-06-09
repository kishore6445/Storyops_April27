import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth'

// GET /api/meetings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseAdminClient()
    const { id } = await params

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Fetch attendees
    const { data: attendeeRows } = await supabase
      .from('meeting_attendees')
      .select('user_id, users(id, full_name, email, role)')
      .eq('meeting_id', id)

    meeting.attendees = (attendeeRows || []).map((a: any) => a.users).filter(Boolean)

    return NextResponse.json({ meeting })
  } catch (error: any) {
    console.error('[v0] GET /api/meetings/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 })
  }
}

// PATCH /api/meetings/[id]  — used by MeetingsDetailsPanel and MeetingsMomTab
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseAdminClient()
    const { id } = await params
    const body = await request.json()

    const {
      title,
      client_name,
      clientName,
      date,
      time,
      notes,
      status,
      summary,
      keyDecisions,
      key_decisions,
      recording_url,
      attendees,
    } = body

    // Build only the fields that were sent
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
    if (title         !== undefined) updatePayload.title          = title
    if (client_name   !== undefined) updatePayload.client_id      = client_name
    if (clientName    !== undefined) updatePayload.client_id      = clientName
    if (date          !== undefined) updatePayload.date           = date
    if (time          !== undefined) updatePayload.time           = time
    if (notes         !== undefined) updatePayload.notes          = notes
    if (status        !== undefined) updatePayload.status         = status
    if (summary       !== undefined) updatePayload.summary        = summary
    if (recording_url !== undefined) updatePayload.recording_url  = recording_url
    if (keyDecisions  !== undefined) updatePayload.key_decisions  = Array.isArray(keyDecisions) ? keyDecisions.filter((d: string) => d?.trim()) : []
    if (key_decisions !== undefined) updatePayload.key_decisions  = key_decisions

    const { data: meeting, error } = await supabase
      .from('meetings')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error || !meeting) {
      console.error('[v0] PATCH meeting error:', error)
      return NextResponse.json({ error: 'Meeting not found or update failed' }, { status: 404 })
    }

    // Sync attendees if provided
    if (Array.isArray(attendees)) {
      await supabase.from('meeting_attendees').delete().eq('meeting_id', id)
      if (attendees.length > 0) {
        await supabase.from('meeting_attendees').insert(
          attendees.map((uid: string) => ({ meeting_id: id, user_id: uid }))
        )
      }
    }

    return NextResponse.json({ meeting })
  } catch (error: any) {
    console.error('[v0] PATCH /api/meetings/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}

// DELETE /api/meetings/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseAdminClient()
    const { id } = await params

    await supabase.from('meeting_attendees').delete().eq('meeting_id', id)

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[v0] DELETE /api/meetings/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}
