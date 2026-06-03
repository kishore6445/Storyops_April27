import { NextRequest, NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const supabase = getWbs2Supabase()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    if (!clientId) {
      return NextResponse.json({ sprints: [] })
    }

    const { data, error } = await supabase
      .from("sprints")
      .select("id, name")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sprints: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
