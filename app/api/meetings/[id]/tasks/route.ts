import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth'

// GET /api/meetings/[id]/tasks  — fetch tasks linked to this meeting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseAdminClient()
    const { id } = await params

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, promised_date, assigned_to, users!tasks_assigned_to_fkey(id, full_name, email)')
      .eq('meeting_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[v0] GET meeting tasks error:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    const enriched = (tasks || []).map((t: any) => ({
      ...t,
      assignee: t.users || null,
    }))

    return NextResponse.json({ tasks: enriched })
  } catch (error: any) {
    console.error('[v0] GET /api/meetings/[id]/tasks error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST /api/meetings/[id]/tasks  — create a task and link it to the meeting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseAdminClient()
    const { id: meetingId } = await params
    const body = await request.json()

    const { title, assigneeId, priority, due_date, promised_date, clientId, sprintId } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Look up the meeting to get its client_id if clientId not passed
    let resolvedClientId = clientId
    if (!resolvedClientId) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('client_id')
        .eq('id', meetingId)
        .single()
      resolvedClientId = (meeting as any)?.client_id || null
    }

    const insertPayload: Record<string, any> = {
      title: title.trim(),
      status: 'todo',
      priority: priority || 'medium',
      user_id: user.id,
      meeting_id: meetingId,
    }

    if (resolvedClientId) insertPayload.client_id  = resolvedClientId
    if (sprintId)         insertPayload.sprint_id  = sprintId
    if (assigneeId)       insertPayload.assigned_to = assigneeId
    if (due_date)         insertPayload.due_date    = due_date
    if (promised_date)    insertPayload.promised_date = promised_date

    const { data: taskData, error } = await supabase
      .from('tasks')
      .insert(insertPayload as any)
      .select('id, title, status, priority, due_date, promised_date, assigned_to, users!tasks_assigned_to_fkey(id, full_name, email)')
      .single()

    const task = taskData as any

    if (error || !task) {
      console.error('[v0] POST meeting task error:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Also insert into task_assignees if assigneeId provided
    if (assigneeId && task.id) {
      await supabase.from('task_assignees').insert({ task_id: task.id, user_id: assigneeId } as any)
    }

    return NextResponse.json({ task: { ...task, assignee: task.users || null } }, { status: 201 })
  } catch (error: any) {
    console.error('[v0] POST /api/meetings/[id]/tasks error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
