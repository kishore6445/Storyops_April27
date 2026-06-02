import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

/**
 * Calculate progress for all WBS items in a project
 * Parent progress = average of children's progress
 * Leaf nodes use their own progress percentage
 */
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

    const supabase = getSupabaseAdminClient()

    // Fetch all items
    const { data: items, error: fetchError } = await supabase
      .from("wbs_items")
      .select("*")
      .eq("project_id", params.projectId)

    if (fetchError) throw fetchError
    if (!items || items.length === 0) {
      return NextResponse.json({ updated: 0, success: true })
    }

    // Build map
    const itemMap = new Map(items.map((i) => [i.id, i]))

    // Calculate progress for all items bottom-up
    const progressUpdates: Array<{ id: string; progress: number }> = []

    // First pass: leaf nodes already have their progress
    // Second pass: calculate parents from children
    const calculateProgress = (item: any): number => {
      const children = items.filter((i) => i.parent_id === item.id)

      if (children.length === 0) {
        return item.progress_percentage
      }

      const childProgress = children.map((child) => calculateProgress(child))
      return Math.round(childProgress.reduce((a, b) => a + b, 0) / children.length)
    }

    // Calculate for all items (from leaves up)
    const itemsByDepth = items.sort((a, b) => {
      const depthA = countAncestors(a.id, itemMap)
      const depthB = countAncestors(b.id, itemMap)
      return depthB - depthA // Process deepest first
    })

    for (const item of itemsByDepth) {
      const progress = calculateProgress(item)
      if (progress !== item.progress_percentage) {
        progressUpdates.push({ id: item.id, progress })
      }
    }

    // Batch update
    let updatedCount = 0
    for (const update of progressUpdates) {
      const { error: updateError } = await supabase
        .from("wbs_items")
        .update({ progress_percentage: update.progress })
        .eq("id", update.id)

      if (!updateError) {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: items.length,
    })
  } catch (error) {
    console.error("[v0] Error recalculating progress:", error)
    return NextResponse.json({ error: "Failed to recalculate progress" }, { status: 500 })
  }
}

function countAncestors(itemId: string, itemMap: Map<string, any>): number {
  let count = 0
  let current = itemMap.get(itemId)

  while (current?.parent_id) {
    count++
    current = itemMap.get(current.parent_id)
  }

  return count
}
