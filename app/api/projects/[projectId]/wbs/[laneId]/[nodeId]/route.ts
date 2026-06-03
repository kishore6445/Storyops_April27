import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

// Helper to generate WBS code
async function generateWBSCode(laneId: string, parentId: string | null, supabase: any): Promise<string> {
  if (parentId) {
    // Child node: get parent code and add sibling count
    const { data: parent } = await supabase
      .from("wbs_nodes")
      .select("wbs_code")
      .eq("id", parentId)
      .single()

    if (!parent) throw new Error("Parent not found")

    // Count siblings
    const { data: siblings } = await supabase
      .from("wbs_nodes")
      .select("wbs_code", { count: "exact" })
      .eq("parent_id", parentId)

    const siblingIndex = (siblings?.length ?? 0) + 1
    return `${parent.wbs_code}.${siblingIndex}`
  } else {
    // Root node in this lane
    const { data: rootNodes } = await supabase
      .from("wbs_nodes")
      .select("wbs_code")
      .eq("lane_id", laneId)
      .is("parent_id", null)

    // Find highest root number in this lane
    const maxNum = (rootNodes || []).reduce((max: number, node: any) => {
      const num = parseInt(node.wbs_code.split(".")[0]) || 0
      return Math.max(max, num)
    }, 0)

    return String(maxNum + 1)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; laneId: string } }
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
    const { title, description, parentId, priority, dueDate, estimatedHours } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Verify lane exists
    const { data: lane, error: laneError } = await supabase
      .from("wbs_lanes")
      .select("board_id")
      .eq("id", params.laneId)
      .single()

    if (laneError || !lane) {
      return NextResponse.json({ error: "Lane not found" }, { status: 404 })
    }

    // Generate WBS code
    const wbsCode = await generateWBSCode(params.laneId, parentId || null, supabase)

    // Get max position
    const { data: siblings } = await supabase
      .from("wbs_nodes")
      .select("position")
      .eq("lane_id", params.laneId)
      .eq("parent_id", parentId || null)
      .order("position", { ascending: false })
      .limit(1)

    const position = (siblings?.[0]?.position ?? -1) + 1

    // Create node
    const { data: node, error } = await supabase
      .from("wbs_nodes")
      .insert({
        lane_id: params.laneId,
        board_id: lane.board_id,
        parent_id: parentId || null,
        wbs_code,
        title,
        description: description || null,
        priority: priority || "medium",
        due_date: dueDate || null,
        estimated_hours: estimatedHours || null,
        position,
        created_by: session.userId,
        status: "not-started",
        progress_percentage: 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ node, success: true }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating WBS node:", error)
    return NextResponse.json({ error: "Failed to create node: " + (error instanceof Error ? error.message : "") }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; laneId: string; nodeId: string } }
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
    const { title, description, status, priority, progressPercentage, dueDate, estimatedHours } = body

    const supabase = getSupabaseAdminClient()

    // Verify node exists
    const { data: node, error: nodeError } = await supabase
      .from("wbs_nodes")
      .select("*")
      .eq("id", params.nodeId)
      .single()

    if (nodeError || !node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 })
    }

    // Update node
    const { data: updated, error } = await supabase
      .from("wbs_nodes")
      .update({
        title: title ?? node.title,
        description: description ?? node.description,
        status: status ?? node.status,
        priority: priority ?? node.priority,
        progress_percentage: progressPercentage ?? node.progress_percentage,
        due_date: dueDate ?? node.due_date,
        estimated_hours: estimatedHours ?? node.estimated_hours,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.nodeId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ node: updated, success: true })
  } catch (error) {
    console.error("[v0] Error updating WBS node:", error)
    return NextResponse.json({ error: "Failed to update node" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; laneId: string; nodeId: string } }
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

    const supabase = getSupabaseAdminClient()

    // Delete node and all children
    const { error } = await supabase
      .from("wbs_nodes")
      .delete()
      .eq("id", params.nodeId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting WBS node:", error)
    return NextResponse.json({ error: "Failed to delete node" }, { status: 500 })
  }
}
