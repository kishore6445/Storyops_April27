import { NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// GET /api/wbs2/clients — list all clients for dropdown
export async function GET() {
  const db = getWbs2Supabase()
  const { data, error } = await db
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
