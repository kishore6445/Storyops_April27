import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
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

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", params.projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get or create WBS board
    let { data: board, error: boardError } = await supabase
      .from("wbs_boards")
      .select("*")
      .eq("project_id", params.projectId)
      .single()

    if (boardError && boardError.code === "PGRST116") {
      // Board doesn't exist, create it
      const { data: newBoard, error: createError } = await supabase
        .from("wbs_boards")
        .insert({
          project_id: params.projectId,
          name: "WBS Canvas",
          created_by: session.userId,
        })
        .select()
        .single()

      if (createError) throw createError
      board = newBoard
    } else if (boardError) {
      throw boardError
    }

    // Get all lanes for board
    const { data: lanes, error: lanesError } = await supabase
      .from("wbs_lanes")
      .select("*")
      .eq("board_id", board.id)
      .order("position", { ascending: true })

    if (lanesError) throw lanesError

    // Get all nodes for board with their hierarchy
    const { data: nodes, error: nodesError } = await supabase
      .from("wbs_nodes")
      .select("*")
      .eq("board_id", board.id)
      .order("lane_id,position", { ascending: true })

    if (nodesError) throw nodesError

    return NextResponse.json({
      board,
      lanes: lanes || [],
      nodes: nodes || [],
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error fetching WBS board:", error)
    return NextResponse.json({ error: "Failed to fetch WBS board" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
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
    const { type } = body

    const supabase = getSupabaseAdminClient()

    // Get board
    const { data: board, error: boardError } = await supabase
      .from("wbs_boards")
      .select("id")
      .eq("project_id", params.projectId)
      .single()

    if (boardError || !board) {
      return NextResponse.json({ error: "WBS board not found" }, { status: 404 })
    }

    // Create lane
    if (type === "lane") {
      const { name, color } = body

      if (!name) {
        return NextResponse.json({ error: "Lane name is required" }, { status: 400 })
      }

      // Get max position
      const { data: lanes, error: maxError } = await supabase
        .from("wbs_lanes")
        .select("position")
        .eq("board_id", board.id)
        .order("position", { ascending: false })
        .limit(1)

      if (maxError) throw maxError

      const position = (lanes?.[0]?.position ?? -1) + 1

      const { data: lane, error } = await supabase
        .from("wbs_lanes")
        .insert({
          board_id: board.id,
          name,
          color: color || "#3B82F6",
          position,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ lane, success: true }, { status: 201 })
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error in WBS board POST:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
