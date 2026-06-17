import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Map WBS2 status values (title-cased) to kanban status values
const statusMap: Record<string, string> = {
  'Not Started': 'todo',
  'In Progress': 'in_progress',
  'Waiting Client': 'in_review',
  'Blocked': 'todo',
  'Done': 'done',
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const assignee = searchParams.get('assignee')

    if (!assignee) {
      return Response.json({ error: 'Missing assignee parameter' }, { status: 400 })
    }

    // Fetch all WBS2 nodes assigned to this user — join plan directly via plan_id
    const { data: nodes, error } = await supabase
      .from('wbs2_nodes')
      .select(`
        id,
        code,
        title,
        type,
        status,
        assignee,
        internal_due_date,
        sprint,
        plan_id,
        wbs2_plans ( client_name, wbs_name )
      `)
      .eq('assignee', assignee)
      .neq('status', 'Done')

    if (error) {
      console.error('[v0] Error fetching WBS2 nodes:', error.message)
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
        completed: false,
        clientName: plan?.client_name || 'WBS',
        phaseName: plan?.wbs_name || '',
        sectionName: node.type || '',
        dueDate: node.internal_due_date || '',
        priority: 'medium' as const,
        owner: node.assignee,
        assignedTo: node.assignee,
        status: statusMap[node.status] ?? 'todo',
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
