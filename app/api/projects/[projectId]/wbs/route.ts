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
  assignee_id?: string
  sprint_id?: string
  due_date?: string
  estimated_hours?: number
  progress_percentage: number
  linked_task_id?: string
  is_leaf_node: boolean
  position: number
  children?: WBSItem[]
}

// Build tree structure from flat array
function buildWBSTree(items: WBSItem[]): WBSItem[] {
  const itemMap = new Map<string, WBSItem>()
  const rootItems: WBSItem[] = []

  // First pass: add all items to map with empty children
  items.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  // Second pass: build tree
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

  // Sort by position at each level
  const sortByPosition = (items: WBSItem[]) => {
    items.sort((a, b) => a.position - b.position)
    items.forEach((item) => {
      if (item.children) sortByPosition(item.children)
    })
  }

  sortByPosition(rootItems)
  return rootItems
}

// Calculate progress from children
function calculateProgress(item: WBSItem, itemMap: Map<string, WBSItem>): number {
  const children = Array.from(itemMap.values()).filter((i) => i.parent_id === item.id)

  if (children.length === 0) {
    // Leaf node: use its own progress
    return item.progress_percentage
  }

  // Parent node: calculate from children
  const childProgress = children.map((child) => calculateProgress(child, itemMap))
  return Math.round(childProgress.reduce((a, b) => a + b, 0) / children.length)
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

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id, team_id")
      .eq("id", params.projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Fetch all WBS items for project
    const { data: items, error } = await supabase
      .from("wbs_items")
      .select("*")
      .eq("project_id", params.projectId)
      .order("position", { ascending: true })

    if (error) throw error

    const tree = buildWBSTree(items || [])
    const itemMap = new Map((items || []).map((i) => [i.id, i]))

    // Calculate progress for all items
    const itemsWithProgress = items?.map((item) => ({
      ...item,
      progress_percentage: calculateProgress(item, itemMap),
    })) || []

    const treeWithProgress = buildWBSTree(itemsWithProgress)

    return NextResponse.json({
      tree: treeWithProgress,
      items: itemsWithProgress,
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

    const { title, description, parent_id, assignee_id, sprint_id, due_date, estimated_hours, priority } =
      await request.json()

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    let wbs_code = "1"

    if (parent_id) {
      // Get parent's WBS code
      const { data: parent, error: parentError } = await supabase
        .from("wbs_items")
        .select("wbs_code")
        .eq("id", parent_id)
        .single()

      if (parentError || !parent) {
        return NextResponse.json({ error: "Parent not found" }, { status: 404 })
      }

      // Get siblings count to generate code
      const { data: siblings, error: siblingsError } = await supabase
        .from("wbs_items")
        .select("wbs_code")
        .eq("parent_id", parent_id)
        .eq("project_id", params.projectId)

      if (siblingsError) throw siblingsError

      const siblingCount = siblings?.length || 0
      wbs_code = `${parent.wbs_code}.${siblingCount + 1}`
    } else {
      // Root level: get highest number
      const { data: rootItems, error: rootError } = await supabase
        .from("wbs_items")
        .select("wbs_code")
        .eq("project_id", params.projectId)
        .is("parent_id", null)

      if (rootError) throw rootError

      const maxCode = (rootItems || []).reduce((max, item) => {
        const num = parseInt(item.wbs_code.split(".")[0]) || 0
        return Math.max(max, num)
      }, 0)

      wbs_code = String(maxCode + 1)
    }

    // Create WBS item
    const { data: item, error } = await supabase
      .from("wbs_items")
      .insert({
        project_id: params.projectId,
        parent_id: parent_id || null,
        title,
        description: description || null,
        wbs_code,
        status: "not-started",
        priority: priority || "medium",
        assignee_id: assignee_id || null,
        sprint_id: sprint_id || null,
        due_date: due_date || null,
        estimated_hours: estimated_hours || null,
        is_leaf_node: true,
        position: 0,
        created_by: session.userId,
      })
      .select()
      .single()

    if (error) throw error

    // If assignee and sprint assigned, create a task
    if (assignee_id && sprint_id) {
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          sprint_id,
          title,
          assigned_to: assignee_id,
          due_date: due_date || null,
          priority: priority || "medium",
          estimated_hours: estimated_hours || null,
          status: "to-do",
          progress_percentage: 0,
        })
        .select()
        .single()

      if (!taskError && task) {
        // Link the task to WBS item
        await supabase
          .from("wbs_items")
          .update({ linked_task_id: task.id })
          .eq("id", item.id)
      }
    }

    return NextResponse.json({ item, success: true }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating WBS item:", error)
    return NextResponse.json({ error: "Failed to create WBS item" }, { status: 500 })
  }
}

