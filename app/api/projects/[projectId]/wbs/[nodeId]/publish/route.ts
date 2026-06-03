import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; nodeId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")
    const sessionToken = authHeader?.replace("Bearer ", "") || request.cookies.get("session")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await validateSession(sessionToken)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const body = await request.json()
    const { sprintId, assignedTo } = body

    if (!sprintId) {
      return NextResponse.json({ error: "Sprint ID is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Get WBS node
    const { data: node, error: nodeError } = await supabase
      .from("wbs_nodes")
      .select("*")
      .eq("id", params.nodeId)
      .single()

    if (nodeError || !node) {
      return NextResponse.json({ error: "WBS node not found" }, { status: 404 })
    }

    // Check if already published to this sprint
    const { data: existing } = await supabase
      .from("wbs_task_mapping")
      .select("*")
      .eq("wbs_node_id", params.nodeId)
      .eq("sprint_id", sprintId)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Already published to this sprint" }, { status: 400 })
    }

    // Create task in sprint
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        sprint_id: sprintId,
        project_id: params.projectId,
        title: node.title,
        description: node.description,
        assigned_to: assignedTo || node.assigned_to,
        due_date: node.due_date,
        priority: node.priority,
        estimated_hours: node.estimated_hours,
        status: "to-do",
        progress_percentage: 0,
      })
      .select()
      .single()

    if (taskError) throw taskError

    // Create mapping
    const { data: mapping, error: mappingError } = await supabase
      .from("wbs_task_mapping")
      .insert({
        wbs_node_id: params.nodeId,
        task_id: task.id,
        sprint_id: sprintId,
        published_by: session.userId,
      })
      .select()
      .single()

    if (mappingError) throw mappingError

    // Update WBS node with linked task
    await supabase
      .from("wbs_nodes")
      .update({
        linked_sprint_task_id: task.id,
        sprint_id: sprintId,
        assigned_to: assignedTo || node.assigned_to,
      })
      .eq("id", params.nodeId)

    return NextResponse.json({
      task,
      mapping,
      success: true,
    }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error publishing to sprint:", error)
    return NextResponse.json({ error: "Failed to publish to sprint" }, { status: 500 })
  }
}
