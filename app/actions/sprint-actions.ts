"use server"

import { getSupabaseClient } from "@/lib/db"

// Lazy getter - don't initialize supabase at module load time
const getSupabase = () => getSupabaseClient()

interface CloseSprintPayload {
  sprintId: string
  destination: "new-sprint" | "backlog"
  newSprintName: string | null
  tasksToMigrate: string[]
}

export async function closeSprintAction(payload: CloseSprintPayload) {
  try {
    const { sprintId, destination, newSprintName, tasksToMigrate } = payload

    // 1. Get the current sprint to verify it exists
    const { data: sprint, error: sprintError } = await getSupabase()
      .from("sprints")
      .select("*")
      .eq("id", sprintId)
      .single()

    if (sprintError || !sprint) {
      return { success: false, error: "Sprint not found" }
    }

    // 2. Handle migration of in-progress and in-review tasks
    let destinationSprintId: string | null = null

    if (destination === "new-sprint" && newSprintName) {
      // Create new sprint
    const { data: newSprint, error: createError } = await getSupabase()
      .from("sprints")
      .insert({
        name: newSprintName,
        client_id: sprint.client_id,
        status: "active",
      })
      .select()
      .single()

    if (createError || !newSprint) {
      return { success: false, error: "Failed to create new sprint" }
    }

    // 3. Migrate tasks
    const { error: migrateError } = await getSupabase()
        .from("tasks")
        .update({ sprint_id: destinationSprintId })
        .in("id", tasksToMigrate)

      if (migrateError) {
        console.error("[v0] Error migrating tasks:", migrateError)
        return { success: false, error: "Failed to migrate tasks" }
      }
    }

    // 4. Mark sprint as completed
    const { error: closeError } = await getSupabase()
      .from("sprints")
      .update({ status: "completed", closed_at: new Date().toISOString() })
      .eq("id", sprintId)

    if (closeError) {
      console.error("[v0] Error closing sprint:", closeError)
      return { success: false, error: "Failed to close sprint" }
    }

    return {
      success: true,
      message: `Sprint closed. ${tasksToMigrate.length} tasks migrated.`,
      newSprintId: destinationSprintId,
    }
  } catch (error) {
    console.error("[v0] Error in closeSprintAction:", error)
    return { success: false, error: "Internal server error" }
  }
}
