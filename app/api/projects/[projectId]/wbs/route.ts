import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Build hierarchical tree structure from flat task list
function buildWBSTree(tasks: any[]) {
  const taskMap = new Map()
  const rootTasks: any[] = []

  // First pass: create task map
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, subtasks: [] })
  })

  // Second pass: build hierarchy
  tasks.forEach((task) => {
    if (task.parent_task_id) {
      const parent = taskMap.get(task.parent_task_id)
      if (parent) {
        parent.subtasks.push(taskMap.get(task.id))
      }
    } else if (task.wbs_code && !task.wbs_code.includes(".")) {
      // Main task (no dot in wbs_code)
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
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all tasks for the project, ordered by wbs_code
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", params.projectId)
      .order("wbs_code", { ascending: true })

    if (error) throw error

    // Build tree structure
    const tree = buildWBSTree(tasks || [])

    return NextResponse.json({ wbs: tree })
  } catch (error) {
    console.error("[v0] Error fetching WBS:", error)
    return NextResponse.json(
      { error: "Failed to fetch WBS" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, assignee_id, due_date, promised_date, parent_task_id } = await req.json()

    if (!title) {
      return NextResponse.json(
        { error: "Missing title" },
        { status: 400 }
      )
    }

    // Get next wbs_code
    let wbs_code: string

    if (parent_task_id) {
      // This is a subtask, generate code like "1.1", "1.2"
      const { data: siblings } = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("parent_task_id", parent_task_id)
        .eq("project_id", params.projectId)
        .order("wbs_code", { ascending: false })
        .limit(1)

      const lastSibling = siblings?.[0]
      const parentTask = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("id", parent_task_id)
        .single()

      const parentCode = parentTask.data?.wbs_code
      const lastNum = lastSibling?.wbs_code ? parseInt(lastSibling.wbs_code.split(".").pop() || "0") : 0
      wbs_code = `${parentCode}.${lastNum + 1}`
    } else {
      // This is a main task
      const { data: siblings } = await supabase
        .from("tasks")
        .select("wbs_code")
        .eq("project_id", params.projectId)
        .isNull("parent_task_id")
        .order("wbs_code", { ascending: false })
        .limit(1)

      const lastNum = siblings?.[0]?.wbs_code ? parseInt(siblings[0].wbs_code) : 0
      wbs_code = String(lastNum + 1)
    }

    // Create task
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        project_id: params.projectId,
        title,
        description,
        assignee_id,
        due_date,
        promised_date,
        parent_task_id: parent_task_id || null,
        wbs_code,
        status: "to-do",
        progress_percentage: 0,
        auto_assigned_at: assignee_id ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating WBS task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}
