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

    // Fetch all WBS2 nodes assigned to this user — get plan info via workstream join
    const { data: nodes, error } = await supabase
      .from('wbs2_nodes')
      .select(`
        id,
        code,
        title,
        type,
        status,
        assignee,
        end_date,
        sprint,
        plan_id,
        wbs2_workstreams(name, plan_id),
        wbs2_plans(client_name, wbs_name)
      `)
      .eq('assignee', assignee)
      .neq('status', 'done')

    if (error) {
      console.error('[v0] Error fetching WBS2 nodes:', error.message)
      // If table doesn't exist yet, return empty array gracefully
      return Response.json([])
    }

    // Transform WBS2 nodes into Task format for kanban
    const wbsTasks = (nodes || []).map((node: any) => {
      const plan = Array.isArray(node.wbs2_plans) ? node.wbs2_plans[0] : node.wbs2_plans
      return {
        id: node.id,
        taskId: node.code,
        title: node.title,
        description: '',
        completed: node.status === 'done',
        clientName: plan?.client_name || '',
        phaseName: plan?.wbs_name || 'WBS',
        sectionName: node.type || '',
        dueDate: node.end_date || '',
        priority: 'medium' as const,
        owner: node.assignee,
        assignedTo: node.assignee,
        status: statusMap[node.status] || 'todo',
        type: 'task' as const,
        source_table: 'wbs2_nodes',
      }
    })

    return Response.json(wbsTasks)
  } catch (err) {
    console.error('[v0] Error in my-tasks route:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
