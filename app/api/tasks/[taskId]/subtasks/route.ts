import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

const buildSubtaskReferenceId = (taskIdentifier: string, sequence: number) => {
  const base = String(taskIdentifier || "TASK").trim()
  return `${base}_Subtask${sequence}`
}

// GET - Fetch all subtasks for a task
export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const session = await validateSession(token)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const isAdmin = session.role === "admin" || session.role === "manager"
    const supabase = getSupabaseAdminClient()
    const resolvedParams = await params
    const taskId = resolvedParams.taskId

    const subtaskQuery = supabase
      .from("task_subtasks")
      .select(`
        id,
        task_id,
        title,
        reference_id,
        status,
        assignee_id,
        due_date,
        completed_at,
        created_by,
        completed_by,
        created_at,
        updated_at
      `)
      .eq("task_id", taskId)

    if (!isAdmin) {
      subtaskQuery.eq("assignee_id", session.userId)
    }

    const { data: subtasks, error } = await subtaskQuery.order("created_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching subtasks:", error)
      return NextResponse.json([])
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("task_id, title")
      .eq("id", taskId)
      .maybeSingle()

    const parentTaskIdentifier = task?.task_id || task?.title || "TASK"

    // Enrich with user data and preserve stored reference IDs
    let enrichedSubtasks = subtasks || []
    if (enrichedSubtasks.length > 0) {
      const userIds = [...new Set(enrichedSubtasks.map(s => s.assignee_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", userIds)

        enrichedSubtasks = enrichedSubtasks.map((subtask, index) => ({
          ...subtask,
          assignee: users?.find(u => u.id === subtask.assignee_id) || null,
          reference_id: subtask.reference_id || buildSubtaskReferenceId(parentTaskIdentifier, index + 1),
        }))
      } else {
        enrichedSubtasks = enrichedSubtasks.map((subtask, index) => ({
          ...subtask,
          reference_id: subtask.reference_id || buildSubtaskReferenceId(parentTaskIdentifier, index + 1),
        }))
      }
    }

    return NextResponse.json(enrichedSubtasks)
  } catch (error) {
    console.error("[v0] Error in subtasks GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a subtask
export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const session = await validateSession(token)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const body = await request.json()
    const { title, assignee_id, due_date } = body
    const resolvedParams = await params
    const taskId = resolvedParams.taskId

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Subtask title is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("task_id, title")
      .eq("id", taskId)
      .maybeSingle()

    if (taskError || !task) {
      console.error("[v0] Error fetching parent task identifier:", taskError)
      return NextResponse.json({ error: "Failed to resolve parent task" }, { status: 400 })
    }

    const { count: existingCount, error: countError } = await supabase
      .from("task_subtasks")
      .select("id", { count: "exact", head: true })
      .eq("task_id", taskId)

    if (countError) {
      console.error("[v0] Error counting existing subtasks:", countError)
    }

    const nextSequence = (existingCount || 0) + 1
    const referenceId = buildSubtaskReferenceId(task.task_id || task.title || "TASK", nextSequence)

    const { data: subtask, error } = await supabase
      .from("task_subtasks")
      .insert({
        task_id: taskId,
        title: title.trim(),
        reference_id: referenceId,
        status: "pending",
        assignee_id: assignee_id || null,
        due_date: due_date || null,
        created_by: session.userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating subtask:", error)
      return NextResponse.json({ error: "Failed to create subtask", details: error.message }, { status: 400 })
    }

    // Log activity
    await supabase.from("task_activity").insert({
      task_id: taskId,
      created_by: session.userId,
      action_type: "subtask_created",
      description: `Created subtask: ${title.trim()}`
    })

    return NextResponse.json({
      ...subtask,
      reference_id: referenceId,
    }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating subtask:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
