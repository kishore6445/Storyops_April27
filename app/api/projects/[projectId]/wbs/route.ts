import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

interface WBSItem {
  id: string
  parent_id: string | null
  title: string
  description?: string
  wbs_code: string
  status: string
  priority: string
  assigned_to?: string
  sprint_id?: string
  due_date?: string
  estimated_hours?: number
  progress_percentage: number
  position: number
  children?: WBSItem[]
}

function buildWBSTree(items: WBSItem[]): WBSItem[] {
  const itemMap = new Map<string, WBSItem>()
  const rootItems: WBSItem[] = []

  items.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  items.forEach((item) => {
    const mappedItem = itemMap.get(item.id)!
    if (item.parent_id) {
      const parent = itemMap.get(item.parent_id)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(mappedItem)
      }
    } else {
      rootItems.push(mappedItem)
    }
  })

  const sortByPosition = (items: WBSItem[]) => {
    items.sort((a, b) => a.position - b.position)
    items.forEach((item) => {
      if (item.children) sortByPosition(item.children)
    })
  }

  sortByPosition(rootItems)
  return rootItems
}

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

    // Fetch all WBS items for project from tasks table
    const { data: items, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", params.projectId)
      .not("wbs_code", "is", null)
      .order("position", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching WBS:", error)
      throw error
    }

    const tree = buildWBSTree(items || [])

    return NextResponse.json({
      tree: tree,
      items: items || [],
      count: items?.length || 0,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error fetching WBS:", error)
    return NextResponse.json({ error: "Failed to fetch WBS" }, { status: 500 })
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

    const { title, description, parent_id, assigned_to, sprint_id, due_date, estimated_hours, priority } =
      await request.json()

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    let wbs_code = "1"

    if (parent_id) {
      // Get parent's WBS code
      const { data: parent, error: parentError } = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("id", parent_id)
        .single()

      if (parentError || !parent) {
        return NextResponse.json({ error: "Parent not found" }, { status: 404 })
      }

      // Get siblings count to generate code
      const { data: siblings, error: siblingsError } = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("parent_id", parent_id)
        .eq("project_id", params.projectId)

      if (siblingsError) throw siblingsError

      const siblingCount = siblings?.length || 0
      wbs_code = `${parent.wbs_code}.${siblingCount + 1}`
    } else {
      // Root level: get highest number
      const { data: rootItems, error: rootError } = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("project_id", params.projectId)
        .is("parent_id", null)
        .not("wbs_code", "is", null)

      if (rootError) throw rootError

      const maxCode = (rootItems || []).reduce((max, item) => {
        const num = parseInt(item.wbs_code.split(".")[0]) || 0
        return Math.max(max, num)
      }, 0)

      wbs_code = String(maxCode + 1)
    }

    // Create WBS item using tasks table
    const { data: item, error } = await supabase
      .from("tasks")
      .insert({
        project_id: params.projectId,
        parent_id: parent_id || null,
        title,
        description: description || null,
        wbs_code,
        status: "to-do",
        priority: priority || "medium",
        assigned_to: assigned_to || null,
        sprint_id: sprint_id || null,
        due_date: due_date || null,
        estimated_hours: estimated_hours || null,
        progress_percentage: 0,
        position: 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item, success: true }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating WBS item:", error)
    return NextResponse.json({ error: "Failed to create WBS item: " + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}


