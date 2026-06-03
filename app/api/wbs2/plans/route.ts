import { NextRequest, NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// GET /api/wbs2/plans — list all plans
export async function GET() {
  const db = getWbs2Supabase()
  const { data, error } = await db
    .from("wbs2_plans")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/wbs2/plans — create a new plan
export async function POST(req: NextRequest) {
  const db = getWbs2Supabase()
  const body = await req.json()
  const { client_name, wbs_name, start_date, end_date, client_id } = body

  if (!client_name || !wbs_name) {
    return NextResponse.json({ error: "client_name and wbs_name required" }, { status: 400 })
  }

  const { data, error } = await db
    .from("wbs2_plans")
    .insert({ client_name, wbs_name, start_date: start_date || null, end_date: end_date || null, client_id: client_id || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
