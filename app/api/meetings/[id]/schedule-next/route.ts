import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth'

// POST /api/meetings/[id]/schedule-next
// Creates a follow-up meeting linked to the parent meeting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseAdminClient()
    const { id: parentMeetingId } = await params
    const body = await request.json()
    const { title, date, time, attendee_ids } = body

    if (!date || !time) {
      return NextResponse.json({ error: 'Date and time are required' }, { status: 400 })
    }

    // Fetch parent meeting to copy client_id
    const { data: parent } = await supabase
      .from('meetings')
      .select('client_id')
      .eq('id', parentMeetingId)
      .single()

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        user_id: user.id,
        title: title || 'Follow-up Meeting',
        client_id: parent?.client_id || null,
        date,
        time,
        status: 'scheduled',
        notes: `Follow-up from meeting ${parentMeetingId}`,
      })
      .select()
      .single()

    if (error || !meeting) {
      console.error('[v0] schedule-next insert error:', error)
      return NextResponse.json({ error: 'Failed to create follow-up meeting' }, { status: 500 })
    }

    // Insert attendees if provided
    if (Array.isArray(attendee_ids) && attendee_ids.length > 0) {
      await supabase.from('meeting_attendees').insert(
        attendee_ids.map((uid: string) => ({ meeting_id: meeting.id, user_id: uid }))
      )
    }

    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error: any) {
    console.error('[v0] POST /api/meetings/[id]/schedule-next error:', error)
    return NextResponse.json({ error: 'Failed to schedule follow-up' }, { status: 500 })
  }
}
