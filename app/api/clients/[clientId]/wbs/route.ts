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

    // Fetch only main tasks (parent_task_id is null)
    const { data: mainTasks, error: mainError } = await supabase
      .from("tasks")
      .select("*")
      .eq("client_id", clientId)
      .is("parent_task_id", null)
      .order("wbs_code", { ascending: true })

    if (mainError) throw mainError

    // For each main task, fetch its subtasks
    const tasksWithSubtasks = await Promise.all(
      (mainTasks || []).map(async (task) => {
        const { data: subtasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("parent_task_id", task.id)
          .order("wbs_code", { ascending: true })

        return {
          ...task,
          subtasks: subtasks || [],
        }
      })
    )

    return NextResponse.json({ tasks: tasksWithSubtasks, success: true })
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
    console.log("[v0] POST /api/clients/[clientId]/wbs called with clientId:", clientId)
    
    const authHeader = request.headers.get("authorization")
    const sessionToken = authHeader?.replace("Bearer ", "") || request.cookies.get("session")?.value

    console.log("[v0] Session token:", !!sessionToken)

    if (!sessionToken) {
      console.log("[v0] No session token provided")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await validateSession(sessionToken)
    console.log("[v0] Session validation result:", !!session)
    
    if (!session) {
      console.log("[v0] Invalid session")
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", body)
    
    const { title, assigned_to, due_date, promised_date } = body

    if (!title) {
      console.log("[v0] Missing title")
      return NextResponse.json({ error: "Missing title" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Get the next WBS code (1, 2, 3, etc.)
    const { data: existingTasks, error: queryError } = await supabase
      .from("tasks")
      .select("wbs_code")
      .eq("client_id", clientId)
      .is("parent_task_id", null)
      .order("wbs_code", { ascending: false })
      .limit(1)

    if (queryError) {
      console.error("[v0] Error querying existing tasks:", queryError)
      throw queryError
    }

    const lastNum = existingTasks?.[0]?.wbs_code ? parseInt(existingTasks[0].wbs_code) : 0
    const wbs_code = String(lastNum + 1)

    console.log("[v0] Creating task with WBS code:", wbs_code)

    // Create task with WBS code
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        client_id: clientId,
        title,
        assigned_to: assigned_to || null,
        due_date: due_date || null,
        promised_date: promised_date || null,
        parent_task_id: null,
        wbs_code,
        status: "to-do",
        progress_percentage: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error inserting task:", error)
      throw error
    }

    console.log("[v0] Task created successfully:", task)
    return NextResponse.json({ task, success: true }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating WBS task:", error)
    return NextResponse.json({ error: "Failed to create task: " + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}
