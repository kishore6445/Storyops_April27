import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to check if wbs_code matches pattern
function matchesPattern(wbs_code: string, pattern: string): boolean {
  const regex = pattern.replace(/\*/g, ".*").replace(/\./g, "\\.")
  return new RegExp(`^${regex}$`).test(wbs_code)
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

    const { data: rules, error } = await supabase
      .from("wbs_assignments")
      .select("*")
      .eq("project_id", params.projectId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ rules })
  } catch (error) {
    console.error("[v0] Error fetching assignment rules:", error)
    return NextResponse.json(
      { error: "Failed to fetch rules" },
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

    const { wbs_code_pattern, assignee_id, auto_assign_enabled } = await req.json()

    if (!wbs_code_pattern || !assignee_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Create assignment rule
    const { data: rule, error } = await supabase
      .from("wbs_assignments")
      .insert({
        project_id: params.projectId,
        wbs_code_pattern,
        assignee_id,
        auto_assign_enabled: auto_assign_enabled !== false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating assignment rule:", error)
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    )
  }
}
