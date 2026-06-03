import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Map WBS2 status values to Task status values expected by kanban
const statusMap: Record<string, string> = {
  'not_started': 'todo',
  'in_progress': 'in_progress',
  'waiting_client': 'in_review',
  'blocked': 'todo', // Blocked tasks appear in "Waiting" column
  'done': 'done',
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const assignee = searchParams.get('assignee')

    if (!assignee) {
      return Response.json({ error: 'Missing assignee parameter' }, { status: 400 })
    }

    // Fetch all WBS2 nodes assigned to this user across all plans
    const { data: nodes, error } = await supabase
      .from('wbs2_nodes')
      .select(`
        id,
        code,
        title,
        type,
        status,
        assignee,
        client_id,
        start_date,
        end_date,
        sprint,
        workstream_id,
        wbs2_plans!inner(client_name, wbs_name)
      `)
      .eq('assignee', assignee)

    if (error) {
      console.error('[v0] Error fetching WBS2 nodes:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Transform WBS2 nodes into Task format for kanban
    const wbsTasks = (nodes || []).map((node: any) => ({
      id: node.id,
      taskId: node.code, // e.g., "1.1.1"
      title: node.title,
      description: '',
      completed: node.status === 'done',
      clientName: node.wbs2_plans?.[0]?.client_name || 'Unknown',
      phaseName: node.wbs2_plans?.[0]?.wbs_name || 'Unknown',
      sectionName: node.type || '',
      dueDate: node.end_date || '',
      priority: 'medium' as const,
      owner: node.assignee,
      assignedTo: node.assignee,
      status: statusMap[node.status] || 'todo',
      type: 'task' as const,
      source_table: 'wbs2_nodes' as const,
    }))

    return Response.json(wbsTasks)
  } catch (err) {
    console.error('[v0] Error in my-tasks route:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
