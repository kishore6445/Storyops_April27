import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; itemId: string } }
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

    // Get all dependencies for this item (both as predecessor and successor)
    const { data: dependencies, error } = await supabase
      .from("wbs_dependencies")
      .select(`
        *,
        predecessor:predecessor_id (id, title, wbs_code),
        successor:successor_id (id, title, wbs_code)
      `)
      .or(`predecessor_id.eq.${params.itemId},successor_id.eq.${params.itemId}`)

    if (error) throw error

    return NextResponse.json({ dependencies, success: true })
  } catch (error) {
    console.error("[v0] Error fetching dependencies:", error)
    return NextResponse.json({ error: "Failed to fetch dependencies" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; itemId: string } }
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

    const { successor_id, dependency_type = "finish-start", lead_lag_days = 0 } = await request.json()

    if (!successor_id) {
      return NextResponse.json({ error: "successor_id is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Create dependency
    const { data: dependency, error } = await supabase
      .from("wbs_dependencies")
      .insert({
        predecessor_id: params.itemId,
        successor_id,
        dependency_type,
        lead_lag_days,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ dependency, success: true }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating dependency:", error)
    return NextResponse.json({ error: "Failed to create dependency" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; itemId: string } }
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

    const { dependency_id } = await request.json()

    if (!dependency_id) {
      return NextResponse.json({ error: "dependency_id is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Delete dependency
    const { error } = await supabase
      .from("wbs_dependencies")
      .delete()
      .eq("id", dependency_id)

    if (error) throw error

    return NextResponse.json({ success: true, message: "Dependency deleted" })
  } catch (error) {
    console.error("[v0] Error deleting dependency:", error)
    return NextResponse.json({ error: "Failed to delete dependency" }, { status: 500 })
  }
}
