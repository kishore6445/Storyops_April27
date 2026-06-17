"use server"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string; phaseId: string } }
) {
  try {
    // Validate session
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

    // Fetch phase details
    const { data: phase, error: phaseError } = await supabase
      .from("client_phases")
      .select("*")
      .eq("id", params.phaseId)
      .eq("client_id", params.clientId)
      .single()

    if (phaseError || !phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 })
    }

    return NextResponse.json({ phase })
  } catch (error) {
    console.error("[v0] Error fetching phase:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
