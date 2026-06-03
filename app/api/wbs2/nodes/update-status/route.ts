import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Map kanban status values back to WBS2 title-cased status values
const reverseStatusMap: Record<string, string> = {
  'todo': 'Not Started',
  'in_progress': 'In Progress',
  'in_review': 'Waiting Client',
  'done': 'Done',
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { nodeId, status } = body

    if (!nodeId || !status) {
      return Response.json(
        { error: 'Missing nodeId or status' },
        { status: 400 }
      )
    }

    // Map kanban status to WBS2 status
    const wbs2Status = reverseStatusMap[status] || 'Not Started'

    // Update the node's status
    const { data, error } = await supabase
      .from('wbs2_nodes')
      .update({ status: wbs2Status })
      .eq('id', nodeId)
      .select()

    if (error) {
      console.error('[v0] Error updating node status:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (err) {
    console.error('[v0] Error in update-status route:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
