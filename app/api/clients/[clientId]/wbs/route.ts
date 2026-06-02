import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

function buildWBSTree(tasks: any[]) {
  const taskMap = new Map()
  const rootTasks: any[] = []

  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, subtasks: [] })
  })

  tasks.forEach((task) => {
    if (task.parent_task_id) {
      const parent = taskMap.get(task.parent_task_id)
      if (parent) {
        parent.subtasks.push(taskMap.get(task.id))
      }
    } else if (task.wbs_code && !task.wbs_code.includes(".")) {
      rootTasks.push(taskMap.get(task.id))
    }
  })

  return rootTasks.sort((a, b) => {
    const aNum = parseInt(a.wbs_code || "0")
    const bNum = parseInt(b.wbs_code || "0")
    return aNum - bNum
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

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

    // Fetch WBS tasks (main tasks and subtasks with wbs_code)
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("client_id", clientId)
      .not("wbs_code", "is", null)
      .order("wbs_code", { ascending: true })

    if (error) throw error

    const tree = buildWBSTree(tasks || [])

    return NextResponse.json({ wbs: tree, success: true })
  } catch (error) {
    console.error("[v0] Error fetching WBS:", error)
    return NextResponse.json({ error: "Failed to fetch WBS" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

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

    const { title, description, assignee_id, due_date, promised_date, parent_task_id } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    let wbs_code: string

    if (parent_task_id) {
      // This is a subtask, generate code like "1.1", "1.2"
      const { data: siblings } = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("parent_task_id", parent_task_id)
        .eq("client_id", clientId)
        .order("wbs_code", { ascending: false })
        .limit(1)

      const parentTask = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("id", parent_task_id)
        .single()

      const parentCode = parentTask.data?.wbs_code
      const lastNum = siblings?.[0]?.wbs_code ? parseInt(siblings[0].wbs_code.split(".").pop() || "0") : 0
      wbs_code = `${parentCode}.${lastNum + 1}`
    } else {
      // This is a main task
      const { data: siblings } = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("client_id", clientId)
        .isNull("parent_task_id")
        .not("wbs_code", "is", null)
        .order("wbs_code", { ascending: false })
        .limit(1)

      const lastNum = siblings?.[0]?.wbs_code ? parseInt(siblings[0].wbs_code) : 0
      wbs_code = String(lastNum + 1)
    }

    // Create task with WBS code
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        client_id: clientId,
        title,
        description,
        assigned_to: assignee_id || null,
        due_date,
        promised_date,
        parent_task_id: parent_task_id || null,
        wbs_code,
        status: "todo",
        progress_percentage: 0,
        is_main_task: !parent_task_id,
        is_subtask: !!parent_task_id,
        auto_assigned_at: assignee_id ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task, success: true }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating WBS task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
