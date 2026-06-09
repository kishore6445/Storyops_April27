import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden - Client access only" }, { status: 403 })

    // Optional sprint selector: ?sprintId=xxx or ?sprintId=all
    const url = new URL(request.url)
    const selectedSprintId = url.searchParams.get("sprintId") || null

    const supabase = getSupabaseAdminClient()

    // ── User name ─────────────────────────────────────────────────────────
    const { data: userRecord } = await supabase
      .from("users").select("id, full_name, email").eq("id", user.id).single()
    const userName: string = (userRecord as any)?.full_name || "User"

    // ── Client org ────────────────────────────────────────────────────────
    // Strategy 1: find by user_id (admin linked a user to this client)
    let { data: clientRow } = await supabase
      .from("clients").select("id, name, description").eq("user_id", user.id).limit(1).maybeSingle()

    // Strategy 2: fallback — match client name against the user's full_name (case-insensitive)
    if (!clientRow && userRecord) {
      const fullName = (userRecord as any)?.full_name || ""
      if (fullName) {
        const { data: clientByName } = await supabase
          .from("clients").select("id, name, description")
          .ilike("name", fullName)
          .limit(1)
          .maybeSingle()
        if (clientByName) clientRow = clientByName
      }
    }

    // Strategy 3: fallback — match by email prefix against client name
    if (!clientRow && userRecord) {
      const email = (userRecord as any)?.email || ""
      const emailPrefix = email.split("@")[0] || ""
      if (emailPrefix.length >= 3) {
        const { data: clientByEmail } = await supabase
          .from("clients").select("id, name, description")
          .ilike("name", `%${emailPrefix}%`)
          .limit(1)
          .maybeSingle()
        if (clientByEmail) clientRow = clientByEmail
      }
    }

    if (!clientRow) {
      return NextResponse.json({ error: "No client account found for this user" }, { status: 404 })
    }
    const clientId = (clientRow as any).id
    const clientName = (clientRow as any).name

    // ── All sprints ───────────────────────────────────────────────────────
    const { data: allSprintsData } = await supabase
      .from("sprints")
      .select("id, name, start_date, end_date, status")
      .eq("client_id", clientId)
      .order("start_date", { ascending: false })
    const allSprints: any[] = allSprintsData || []

    const today = new Date()

    // Determine the "active" sprint (auto-detected) for reference
    const autoSprint = allSprints.find((s) =>
      s.status === "active" ||
      (new Date(s.start_date) <= today && new Date(s.end_date) >= today)
    ) || allSprints[0] || null

    // Sprint to show data for — either the selected one or auto
    const viewSprint = selectedSprintId && selectedSprintId !== "all"
      ? (allSprints.find((s) => s.id === selectedSprintId) || autoSprint)
      : autoSprint

    const nextSprint = allSprints.find((s) => new Date(s.start_date) > today) || null

    // ── Tasks for selected sprint (or all if "all") ───────────────────────
    let sprintTasksQuery = supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, promised_date, assigned_to, phase")
      .eq("client_id", clientId)

    if (selectedSprintId === "all") {
      // no sprint filter
    } else if (viewSprint) {
      sprintTasksQuery = sprintTasksQuery.eq("sprint_id", viewSprint.id)
    }
    const { data: sprintTasksData } = await sprintTasksQuery
    const sprintTasks: any[] = sprintTasksData || []

    // Next sprint tasks
    let nextSprintTasks: any[] = []
    if (nextSprint && nextSprint.id !== viewSprint?.id) {
      const { data: t } = await supabase
        .from("tasks").select("id, title, status, priority, due_date")
        .eq("client_id", clientId).eq("sprint_id", nextSprint.id)
      nextSprintTasks = t || []
    }

    const completedTasks  = sprintTasks.filter((t) => t.status === "done")
    const inProgressTasks = sprintTasks.filter((t) => t.status === "in_progress")
    const inReviewTasks   = sprintTasks.filter((t) => t.status === "in_review")
    const pendingTasks    = sprintTasks.filter((t) => t.status === "todo")
    const delayedTasks    = sprintTasks.filter((t) => {
      const deadline = t.promised_date || t.due_date
      if (!deadline) return false
      return new Date(deadline) < today && t.status !== "done"
    })
    const attentionTasks = [
      ...delayedTasks.map((t: any) => ({ ...t, reason: "Past due date" })),
      ...inReviewTasks.map((t: any) => ({ ...t, reason: "Awaiting content approval" })),
    ]

    const totalTasks = sprintTasks.length
    const completionPct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0

    let daysRemaining = 0
    let sprintStatus = "On Track"
    if (viewSprint) {
      const end = new Date(viewSprint.end_date)
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      if (delayedTasks.length > 0) sprintStatus = "At Risk"
    }

    // ── Meetings ──────────────────────────────────────────────────────────
    // meetings.client_id may store the name string OR the UUID depending on how it was created.
    // Fetch by both to cover all cases, then merge deduplicated.
    const [{ data: meetingsByName }, { data: meetingsByUuid }] = await Promise.all([
      supabase
        .from("meetings")
        .select("id, title, date, time, status, summary, key_decisions, notes, agenda")
        .eq("client_id", clientName)
        .order("date", { ascending: false })
        .limit(20),
      supabase
        .from("meetings")
        .select("id, title, date, time, status, summary, key_decisions, notes, agenda")
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(20),
    ])
    const seenIds = new Set<string>()
    const rawMeetings: any[] = []
    for (const m of [...(meetingsByName || []) as any[], ...(meetingsByUuid || []) as any[]]) {
      if (!seenIds.has((m as any).id)) { seenIds.add((m as any).id); rawMeetings.push(m) }
    }
    rawMeetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Fetch attendees + action items from their sub-tables for each meeting
    const meetingIds = (rawMeetings || []).map((m: any) => m.id)
    let meetingAttendeesMap: Record<string, string[]> = {}
    let meetingActionItemsMap: Record<string, string[]> = {}
    let meetingTasksMap: Record<string, any[]> = {}

    if (meetingIds.length > 0) {
      const [{ data: attendeeRows }, { data: actionRows }, { data: meetingTasks }] = await Promise.all([
        supabase
          .from("meeting_attendees")
          .select("meeting_id, users(id, full_name)")
          .in("meeting_id", meetingIds),
        supabase
          .from("meeting_action_items")
          .select("meeting_id, description, completed")
          .in("meeting_id", meetingIds),
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, assigned_to, meeting_id, users!tasks_assigned_to_fkey(id, full_name, email)")
          .in("meeting_id", meetingIds),
      ])

      for (const row of attendeeRows || []) {
        const r = row as any
        if (!meetingAttendeesMap[r.meeting_id]) meetingAttendeesMap[r.meeting_id] = []
        if (r.users?.full_name) meetingAttendeesMap[r.meeting_id].push(r.users.full_name)
      }
      for (const row of actionRows || []) {
        const r = row as any
        if (!meetingActionItemsMap[r.meeting_id]) meetingActionItemsMap[r.meeting_id] = []
        if (r.description) meetingActionItemsMap[r.meeting_id].push(r.description)
      }
      for (const t of meetingTasks || []) {
        const mt = t as any
        if (!meetingTasksMap[mt.meeting_id]) meetingTasksMap[mt.meeting_id] = []
        meetingTasksMap[mt.meeting_id].push({
          id: mt.id, title: mt.title, status: mt.status,
          priority: mt.priority, due_date: mt.due_date,
          assignee: (mt as any).users || null,
        })
      }
    }

    const meetingsData = rawMeetings

    // ── Deliverables from done-task files ─────────────────────────────────
    let deliverables: any[] = []
    if (completedTasks.length > 0) {
      const doneTaskIds = completedTasks.map((t: any) => t.id)
      const { data: files } = await supabase
        .from("task_files")
        .select("id, task_id, name, url, mime_type, uploaded_at, tasks(title, status)")
        .in("task_id", doneTaskIds)
        .order("uploaded_at", { ascending: false }).limit(8)
      deliverables = (files || []).map((f: any) => ({
        id: f.id,
        name: f.tasks?.title || f.name,
        fileName: f.name,
        type: f.mime_type?.includes("pdf") ? "PDF"
          : f.mime_type?.includes("video") ? "Video"
          : f.mime_type?.includes("image") ? "Image" : "File",
        status: "Published",
        date: f.uploaded_at,
        url: f.url,
      }))
    }

    // ── Social media counts from content_records ──────────────────────────
    let contentQuery = supabase
      .from("content_records")
      .select("id, platform, content_type, status")
      .eq("client_id", clientId)

    // Filter by sprint date range if a specific sprint is selected
    if (viewSprint && selectedSprintId !== "all") {
      contentQuery = contentQuery
        .gte("scheduled_date", viewSprint.start_date)
        .lte("scheduled_date", viewSprint.end_date)
    }
    const { data: contentRecords } = await contentQuery
    const records: any[] = contentRecords || []

    const socialCounts = {
      instagram: records.filter((r) => r.platform?.toLowerCase().includes("instagram")).length,
      linkedin:  records.filter((r) => r.platform?.toLowerCase().includes("linkedin")).length,
      youtube:   records.filter((r) => r.platform?.toLowerCase().includes("youtube")).length,
      reels:     records.filter((r) =>
        r.platform?.toLowerCase().includes("reel") ||
        r.content_type?.toLowerCase().includes("reel")).length,
    }

    // ── Project date range ────────────────────────────────────────────────
    const sortedAsc  = [...allSprints].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    const sortedDesc = [...allSprints].sort((a, b) => new Date(b.end_date).getTime()   - new Date(a.end_date).getTime())

    return NextResponse.json({
      client: { id: clientId, name: (clientRow as any).name },
      userName,
      allSprints: allSprints.map((s) => ({ id: s.id, name: s.name, startDate: s.start_date, endDate: s.end_date })),
      currentSprint: viewSprint ? {
        id: viewSprint.id,
        name: viewSprint.name,
        startDate: viewSprint.start_date,
        endDate: viewSprint.end_date,
        status: sprintStatus,
        completionPct,
        daysRemaining,
        completed: completedTasks.length,
        inProgress: inProgressTasks.length,
        pending: pendingTasks.length,
        delayed: delayedTasks.length,
      } : null,
      nextSprint: nextSprint ? {
        name: nextSprint.name,
        startDate: nextSprint.start_date,
        endDate: nextSprint.end_date,
        tasks: nextSprintTasks.map((t) => ({ id: t.id, title: t.title })),
      } : null,
      completedTasks:  completedTasks.map((t: any)  => ({ id: t.id, title: t.title })),
      inProgressTasks: inProgressTasks.map((t: any) => ({ id: t.id, title: t.title })),
      delayedTasks:    delayedTasks.map((t: any)    => ({ id: t.id, title: t.title })),
      attentionTasks:  attentionTasks.map((t: any)  => ({ id: t.id, title: t.title, reason: t.reason })),
      meetings: (meetingsData || []).map((m: any) => ({
        id: m.id,
        title: m.title || "Team Meeting",
        date: m.date,
        time: m.time || "",
        status: m.status || "",
        summary: m.summary || "",
        keyDecisions: Array.isArray(m.key_decisions) ? m.key_decisions : (m.key_decisions ? [m.key_decisions] : []),
        actionItems: meetingActionItemsMap[m.id] || [],
        attendees: meetingAttendeesMap[m.id] || [],
        notes: m.notes || "",
        agenda: m.agenda || "",
        tasks: meetingTasksMap[m.id] || [],
      })),
      deliverables,
      socialCounts,
      project: {
        startDate: sortedAsc[0]?.start_date || null,
        endDate:   sortedDesc[0]?.end_date  || null,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error in client-portal GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
