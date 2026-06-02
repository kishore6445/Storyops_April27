"use server"

import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string; phaseId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
