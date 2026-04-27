import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
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

    console.log("[v0] /api/team/analytics - Fetching team members...")

    // Get all users (team members)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, email")

    console.log("[v0] /api/team/analytics - Users fetched:", users?.length || 0, "error:", usersError)

    if (usersError) {
      console.error("[v0] Error fetching team members:", usersError)
      return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 })
    }

    if (!users || users.length === 0) {
      console.log("[v0] /api/team/analytics - No users found, returning empty array")
      return NextResponse.json({ teamMembers: [] })
    }

    // Get task and subtask data for each team member
    const teamAnalytics = await Promise.all(
      (users || []).map(async (user) => {
        const [tasksResult, subtasksResult] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, task_id, title, status, due_date, client_id")
            .eq("assigned_to", user.id)
            .order("due_date", { ascending: true }),
          supabase
            .from("task_subtasks")
            .select("id, task_id, title, status, due_date, reference_id")
            .eq("assignee_id", user.id)
            .order("due_date", { ascending: true }),
        ])

        const tasks = tasksResult.data
        const tasksError = tasksResult.error
        const subtasks = subtasksResult.data
        const subtasksError = subtasksResult.error

        console.log(`[v0] /api/team/analytics - Tasks for ${user.full_name}:`, tasks?.length || 0, "error:", tasksError)
        console.log(`[v0] /api/team/analytics - Subtasks for ${user.full_name}:`, subtasks?.length || 0, "error:", subtasksError)

        if (tasksError || subtasksError) {
          console.error(`[v0] Error fetching tasks/subtasks for ${user.id}:`, tasksError || subtasksError)
          return {
            id: user.id,
            full_name: user.full_name,
            email: user.email || "",
            tasksAssigned: [],
            taskStats: {
              total: 0,
              completed: 0,
              inProgress: 0,
              overdue: 0,
            },
            pkrPercentage: 0,
          }
        }

        const tasksArray = tasks || []
        const subtasksArray = subtasks || []

        const taskIds = [...new Set(subtasksArray.map((subtask) => subtask.task_id).filter(Boolean))]
        const { data: parentTasks } = taskIds.length > 0
          ? await supabase.from("tasks").select("id, task_id, title").in("id", taskIds)
          : { data: [] }

        const parentTaskMap = new Map((parentTasks || []).map((task: any) => [task.id, task]))

        const taskEntries = tasksArray.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          due_date: task.due_date,
          task_id: task.task_id,
        }))

        const subtaskEntries = subtasksArray.map((subtask) => {
          const parentTask = parentTaskMap.get(subtask.task_id)
          return {
            id: subtask.id,
            title: subtask.title,
            status: subtask.status,
            due_date: subtask.due_date,
            task_id: subtask.reference_id || parentTask?.task_id || subtask.task_id,
          }
        })

        const tasksAssigned = [...taskEntries, ...subtaskEntries]

        const completed = tasksAssigned.filter((t) => t.status === "done").length
        const inProgress = tasksAssigned.filter((t) => t.status === "in_progress" || t.status === "pending").length
        const overdue = tasksAssigned.filter((t) => {
          if (t.status === "done") return false
          if (!t.due_date) return false
          return new Date(t.due_date) < new Date()
        }).length

        const pkrPercentage = tasksAssigned.length > 0 ? Math.round((completed / tasksAssigned.length) * 100) : 0

        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email || "",
          tasksAssigned,
          taskStats: {
            total: tasksAssigned.length,
            completed,
            inProgress,
            overdue,
          },
          pkrPercentage,
        }
      })
    )

    console.log("[v0] /api/team/analytics - Returning data with", teamAnalytics.length, "team members")
    return NextResponse.json({ teamMembers: teamAnalytics })
  } catch (error) {
    console.error("[v0] Error fetching team analytics:", error)
    return NextResponse.json({ error: "Failed to fetch team analytics" }, { status: 500 })
  }
}
