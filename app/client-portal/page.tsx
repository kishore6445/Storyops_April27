"use client"

import { useState, useRef } from "react"
import useSWR from "swr"
import { AuthGuard } from "@/components/auth-guard"
import { RoleBasedLayout } from "@/components/role-based-layout"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Calendar,
  Copy,
  Download,
  Share2,
  Loader2,
  Instagram,
  Linkedin,
  Youtube,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  LayoutGrid,
  MessageSquare,
  Users,
  FileText,
  Radio,
  MessageCircle,
  HelpCircle,
  Phone,
} from "lucide-react"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json())
}

function fmtShort(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtMeetingDate(dateStr: string | null | undefined, time?: string) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return time ? `${datePart} • ${time}` : datePart
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    "On Track":  "bg-[#E6F9F0] text-[#12B76A] border border-[#A6F4C5]",
    "At Risk":   "bg-[#FFF4EC] text-[#F97316] border border-[#FED7AA]",
    Published:   "bg-[#E6F9F0] text-[#12B76A] border border-[#A6F4C5]",
    "In Review": "bg-[#FFF4EC] text-[#F97316] border border-[#FED7AA]",
    Draft:       "bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]",
  }
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", cfg[status] || "bg-[#F5F5F7] text-[#86868B]")}>
      {status}
    </span>
  )
}

// ── View All Modal ────────────────────────────────────────────────────────
function ViewAllModal({ title, items, renderItem, onClose }: {
  title: string
  items: any[]
  renderItem: (item: any) => React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E7]">
          <h3 className="text-[14px] font-bold text-[#1D1D1F]">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F5F5F7] rounded-lg transition-colors">
            <X className="w-4 h-4 text-[#86868B]" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-2">
          {items.length === 0
            ? <p className="text-[13px] text-[#86868B]">Nothing to show.</p>
            : items.map((item, i) => <div key={item.id || i}>{renderItem(item)}</div>)
          }
        </div>
      </div>
    </div>
  )
}

// ── Main page with sidebar layout ──────────────────────────────────────────
export default function ClientPortalPage() {
  const [selectedSprintId, setSelectedSprintId] = useState<string>("")
  const [sprintDropdownOpen, setSprintDropdownOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"board" | "next" | "monthly" | "timeline" | "documents" | "meetings">("board")
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)
  const swrKey = selectedSprintId ? `/api/client-portal?sprintId=${selectedSprintId}` : "/api/client-portal"
  const { data, isLoading } = useSWR(swrKey, fetcher, { revalidateOnFocus: false })
  const [viewAll, setViewAll] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  if (isLoading) {
    return (
      <AuthGuard>
        <RoleBasedLayout userRole="client">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
          </div>
        </RoleBasedLayout>
      </AuthGuard>
    )
  }

  if (!data || data.error) {
    return (
      <AuthGuard>
        <RoleBasedLayout userRole="client">
          <div className="flex items-center justify-center h-64 text-[#86868B] text-sm">
            {data?.error === "No client account found for this user"
              ? "Your account is not linked to a client organization yet. Please contact your project manager."
              : "Unable to load portal data."}
          </div>
        </RoleBasedLayout>
      </AuthGuard>
    )
  }

  const {
    client,
    userName,
    allSprints = [],
    currentSprint,
    nextSprint,
    completedTasks = [],
    inProgressTasks = [],
    attentionTasks = [],
    meetings = [],
    deliverables = [],
    socialCounts = {},
  } = data

  // ── Copy Report ──────────────────────────────────────────────────────────
  const handleCopyReport = () => {
    const lines: string[] = [
      `Client Report — ${client?.name || userName}`,
      `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      "",
      `== Current Sprint ==`,
      currentSprint
        ? `${currentSprint.name}: ${fmtShort(currentSprint.startDate)} – ${fmtShort(currentSprint.endDate)}`
        : "No active sprint",
      `Progress: ${currentSprint?.completionPct ?? 0}%`,
      `Completed: ${currentSprint?.completed ?? 0}  In Progress: ${currentSprint?.inProgress ?? 0}  Waiting: ${attentionTasks.length}`,
      "",
      `== What We've Done ==`,
      ...completedTasks.map((t: any) => `✓ ${t.title}`),
      "",
      `== In Progress ==`,
      ...inProgressTasks.map((t: any) => `• ${t.title}`),
      "",
      `== Needs Your Input ==`,
      ...attentionTasks.map((t: any) => `! ${t.title} — ${t.reason}`),
    ]
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownloadPDF = () => {
    window.print()
  }

  // Kanban board columns
  const waitingForClient = attentionTasks.filter((t: any) => t.reason === "Awaiting content approval").length
  const inReview = attentionTasks.filter((t: any) => t.reason === "Awaiting client approval").length
  const done = completedTasks.length

  // Modal configs
  const viewAllConfig: Record<string, { title: string; items: any[]; render: (item: any) => React.ReactNode }> = {
    completed: {
      title: "All Completed Items",
      items: completedTasks,
      render: (t: any) => (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] flex-shrink-0" />
          <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
        </div>
      ),
    },
    inprogress: {
      title: "All In Progress",
      items: inProgressTasks,
      render: (t: any) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#F97316] flex-shrink-0" />
          <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
        </div>
      ),
    },
    attention: {
      title: "All Items Needing Input",
      items: attentionTasks,
      render: (t: any) => (
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#1D1D1F]">{t.title}</span>
          </div>
          <p className="text-[11px] text-[#86868B] ml-4">Status: {t.reason}</p>
        </div>
      ),
    },
  }

  const activeModal = viewAll ? viewAllConfig[viewAll] : null

  return (
    <AuthGuard>
      <RoleBasedLayout userRole="client">
        <div className="flex h-screen bg-[#F8F9FB] print:bg-white overflow-hidden" ref={reportRef}>
          
          {/* ── LEFT SIDEBAR ── */}
          <div className="w-56 bg-white border-r border-[#E5E5E7] flex flex-col print:hidden overflow-y-auto">
            {/* Sidebar header */}
            <div className="p-4 border-b border-[#E5E5E7]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center">
                  <span className="text-white font-bold text-[12px]">{client?.name?.[0] || "C"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#1D1D1F] truncate">{client?.name || "Client"}</div>
                  <div className="text-[11px] text-[#86868B]">Client Portal</div>
                </div>
              </div>
            </div>

            {/* Portal menu */}
            <div className="flex-1 p-3 space-y-1">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Portal</div>
              {[
                { id: "board", label: "Sprint Board", icon: LayoutGrid },
                { id: "next", label: "Next Sprint", icon: Calendar },
                { id: "monthly", label: "Monthly Review", icon: FileText },
                { id: "timeline", label: "Timeline", icon: Radio },
                { id: "documents", label: "Documents", icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                    activeTab === id
                      ? "bg-[#EEF4FF] text-[#007AFF]"
                      : "text-[#1D1D1F] hover:bg-[#F5F5F7]"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {/* Communication menu */}
            <div className="border-t border-[#E5E5E7] p-3 space-y-1">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Communication</div>
              {[
                { label: "Weekly Meetings", icon: MessageSquare, tab: "meetings" as const },
                { label: "Messages", icon: MessageCircle, tab: null },
              ].map(({ label, icon: Icon, tab }) => (
                <button
                  key={label}
                  onClick={() => tab && setActiveTab(tab)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                    activeTab === tab
                      ? "bg-[#EEF4FF] text-[#007AFF]"
                      : "text-[#1D1D1F] hover:bg-[#F5F5F7]"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                  {label === "Weekly Meetings" && meetings.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-[#007AFF] text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                      {meetings.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Help section */}
            <div className="border-t border-[#E5E5E7] p-3">
              <div className="bg-[#F5F5F7] rounded-lg p-3 text-center">
                <div className="w-8 h-8 mx-auto mb-2 bg-white rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#86868B]" />
                </div>
                <div className="text-[12px] font-semibold text-[#1D1D1F] mb-2">Need anything?</div>
                <p className="text-[11px] text-[#86868B] mb-2">{"We're here to help you"}</p>
                <button className="w-full text-[11px] font-semibold text-[#007AFF] hover:underline">Message Us</button>
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col">
              
              {/* Top header with sprint selector and actions */}
              <div className="bg-white border-b border-[#E5E5E7] p-4 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-[18px] font-bold text-[#1D1D1F]">{client?.name || userName}</h1>
                    <p className="text-[12px] text-[#86868B]">Client Portal</p>
                  </div>
                  {allSprints.length > 0 && (
                    <div className="relative inline-block">
                      <button
                        onClick={() => setSprintDropdownOpen(!sprintDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D1D1D6] bg-white text-[12px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#007AFF]" />
                        {selectedSprintId === "all"
                          ? "All Sprints"
                          : selectedSprintId
                            ? (allSprints.find((s: any) => s.id === selectedSprintId)?.name || "Select")
                            : (currentSprint?.name || "Select Sprint")}
                        <ChevronDown className="w-3.5 h-3.5 text-[#86868B]" />
                      </button>
                      {sprintDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl border border-[#E5E5E7] shadow-lg z-20 overflow-hidden">
                          <button
                            onClick={() => { setSelectedSprintId("all"); setSprintDropdownOpen(false) }}
                            className={cn("w-full text-left px-4 py-2.5 text-[12px] hover:bg-[#F5F5F7] transition-colors", selectedSprintId === "all" ? "font-semibold text-[#007AFF]" : "text-[#1D1D1F]")}
                          >
                            All Sprints
                          </button>
                          {allSprints.map((s: any) => (
                            <button
                              key={s.id}
                              onClick={() => { setSelectedSprintId(s.id); setSprintDropdownOpen(false) }}
                              className={cn("w-full text-left px-4 py-2.5 text-[12px] hover:bg-[#F5F5F7] transition-colors", selectedSprintId === s.id || (!selectedSprintId && s.id === currentSprint?.id) ? "font-semibold text-[#007AFF]" : "text-[#1D1D1F]")}
                            >
                              <div className="font-medium">{s.name}</div>
                              <div className="text-[11px] text-[#86868B]">{fmtShort(s.startDate)} – {fmtShort(s.endDate)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D1D6] bg-white text-[12px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#12B76A]" /> : <Copy className="w-3.5 h-3.5 text-[#007AFF]" />}
                    Copy Weekly Update
                  </button>
                  <button
                    onClick={() => navigator.share ? navigator.share({ title: `Client Report — ${client?.name}`, url: window.location.href }) : navigator.clipboard.writeText(window.location.href)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#007AFF] text-white text-[12px] font-medium hover:bg-[#0051D5] transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Client View
                  </button>
                </div>
              </div>

              {/* Tab navigation */}
              <div className="bg-white border-b border-[#E5E5E7] px-4 print:hidden">
                <div className="flex items-center gap-4">
                  {[
                    { id: "board", label: "Sprint Board" },
                    { id: "next", label: "Next Sprint" },
                    { id: "meetings", label: "Meetings" },
                    { id: "monthly", label: "Monthly Review" },
                    { id: "timeline", label: "Timeline" },
                    { id: "documents", label: "Documents" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      className={cn(
                        "px-4 py-3 text-[13px] font-medium border-b-2 transition-colors",
                        activeTab === id
                          ? "border-[#007AFF] text-[#007AFF]"
                          : "border-transparent text-[#86868B] hover:text-[#1D1D1F]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 p-4 overflow-y-auto">
                {activeTab === "board" && (
                  <div className="space-y-4">
                    {/* Kanban board */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[16px] font-bold text-[#1D1D1F]">
                          Current Sprint
                          {currentSprint && (
                            <span className="ml-2 text-[13px] font-normal text-[#86868B]">
                              {fmtShort(currentSprint.startDate)} – {fmtShort(currentSprint.endDate)}
                            </span>
                          )}
                        </h2>
                        {currentSprint && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-4">
                              {[
                                { label: "Waiting For Client", count: waitingForClient, color: "#EF4444" },
                                { label: "In Progress", count: currentSprint.inProgress, color: "#F97316" },
                                { label: "Review", count: inReview, color: "#F59E0B" },
                                { label: "Done", count: done, color: "#12B76A" },
                              ].map(s => (
                                <div key={s.label} className="text-center">
                                  <div className="text-[18px] font-bold" style={{ color: s.color }}>{s.count}</div>
                                  <div className="text-[11px] text-[#86868B]">{s.label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Kanban columns */}
                      <div className="grid grid-cols-4 gap-4">
                        {/* Waiting For Client */}
                        <div className="bg-white rounded-lg border border-[#E5E5E7]">
                          <div className="px-4 py-3 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                              <span className="text-[13px] font-semibold text-[#1D1D1F]">Waiting For Client</span>
                            </div>
                            <span className="text-[11px] text-[#86868B]">{waitingForClient} items</span>
                          </div>
                          <div className="p-3 space-y-2 min-h-[300px]">
                            {attentionTasks
                              .filter((t: any) => t.reason === "Awaiting content approval")
                              .map((t: any, i: number) => (
                                <div key={i} className="bg-[#FFF0F0] border border-[#FED7AA] rounded-lg p-3">
                                  <p className="text-[12px] font-medium text-[#1D1D1F] mb-1">{t.title}</p>
                                  <p className="text-[11px] text-[#86868B]">{t.reason}</p>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* In Progress */}
                        <div className="bg-white rounded-lg border border-[#E5E5E7]">
                          <div className="px-4 py-3 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full bg-[#F97316]" />
                              <span className="text-[13px] font-semibold text-[#1D1D1F]">In Progress</span>
                            </div>
                            <span className="text-[11px] text-[#86868B]">{currentSprint?.inProgress ?? 0} items</span>
                          </div>
                          <div className="p-3 space-y-2 min-h-[300px]">
                            {inProgressTasks.map((t: any) => (
                              <div key={t.id} className="bg-[#FFF7F0] border border-[#FED7AA] rounded-lg p-3">
                                <p className="text-[12px] font-medium text-[#1D1D1F]">{t.title}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Review */}
                        <div className="bg-white rounded-lg border border-[#E5E5E7]">
                          <div className="px-4 py-3 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                              <span className="text-[13px] font-semibold text-[#1D1D1F]">Review</span>
                            </div>
                            <span className="text-[11px] text-[#86868B]">{inReview} items</span>
                          </div>
                          <div className="p-3 space-y-2 min-h-[300px]">
                            {attentionTasks
                              .filter((t: any) => t.reason === "Awaiting client approval")
                              .map((t: any, i: number) => (
                                <div key={i} className="bg-[#FFFAF0] border border-[#FED7AA] rounded-lg p-3">
                                  <p className="text-[12px] font-medium text-[#1D1D1F] mb-1">{t.title}</p>
                                  <p className="text-[11px] text-[#86868B]">{t.reason}</p>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Done */}
                        <div className="bg-white rounded-lg border border-[#E5E5E7]">
                          <div className="px-4 py-3 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full bg-[#12B76A]" />
                              <span className="text-[13px] font-semibold text-[#1D1D1F]">Done</span>
                            </div>
                            <span className="text-[11px] text-[#86868B]">{done} items</span>
                          </div>
                          <div className="p-3 space-y-2 min-h-[300px]">
                            {completedTasks.slice(0, 8).map((t: any) => (
                              <div key={t.id} className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-3">
                                <p className="text-[12px] font-medium text-[#1D1D1F]">{t.title}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Weekly Decisions & Notes */}
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[15px] font-bold text-[#1D1D1F]">
                          Weekly Decisions &amp; Notes
                          {meetings.length > 0 && (
                            <span className="ml-2 text-[12px] font-normal text-[#86868B]">
                              Last updated: {fmtShort(meetings[0]?.date)}
                            </span>
                          )}
                        </h3>
                      </div>
                      {meetings.length === 0 ? (
                        <div className="bg-white rounded-lg border border-[#E5E5E7] p-8 text-center">
                          <MessageSquare className="w-8 h-8 text-[#86868B] mx-auto mb-2" />
                          <p className="text-[13px] text-[#86868B]">No meetings recorded yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {meetings.slice(0, 3).map((m: any) => (
                            <div key={m.id} className="bg-white rounded-lg border border-[#E5E5E7] overflow-hidden">
                              {/* Meeting header */}
                              <div className="px-5 py-4 border-b border-[#F5F5F7]">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="text-[14px] font-semibold text-[#1D1D1F]">{m.title}</div>
                                    <div className="text-[12px] text-[#86868B] mt-0.5">
                                      {fmtMeetingDate(m.date, m.time)}
                                      {m.attendees?.length > 0 && (
                                        <span className="ml-2 text-[#86868B]">· Attendees: {m.attendees.join(", ")}</span>
                                      )}
                                    </div>
                                  </div>
                                  {m.status && (
                                    <span className={cn(
                                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                                      m.status === "completed" ? "bg-[#E6F9F0] text-[#12B76A]" : "bg-[#EEF4FF] text-[#007AFF]"
                                    )}>
                                      {m.status}
                                    </span>
                                  )}
                                </div>
                                {m.summary && (
                                  <p className="text-[12px] text-[#1D1D1F] leading-relaxed mt-2">{m.summary}</p>
                                )}
                              </div>

                              {/* Key decisions + Action items */}
                              <div className="grid grid-cols-2 divide-x divide-[#F5F5F7]">
                                {/* Decisions taken */}
                                <div className="px-5 py-4">
                                  <div className="text-[12px] font-semibold text-[#12B76A] mb-2">Decisions Taken</div>
                                  {m.keyDecisions?.length > 0 ? (
                                    <ul className="space-y-1.5">
                                      {m.keyDecisions.map((d: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] flex-shrink-0 mt-0.5" />
                                          <span className="text-[12px] text-[#1D1D1F]">{d}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-[12px] text-[#86868B] italic">No decisions recorded</p>
                                  )}
                                </div>

                                {/* Action items / waiting from client */}
                                <div className="px-5 py-4">
                                  <div className="text-[12px] font-semibold text-[#EF4444] mb-2">Waiting From Client</div>
                                  {m.actionItems?.length > 0 ? (
                                    <ul className="space-y-1.5">
                                      {m.actionItems.map((a: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                                          <span className="text-[12px] text-[#1D1D1F]">{a}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-[12px] text-[#86868B] italic">Nothing pending</p>
                                  )}
                                </div>
                              </div>

                              {/* Notes / next steps */}
                              {m.notes && (
                                <div className="px-5 py-3 bg-[#F8F9FB] border-t border-[#F5F5F7]">
                                  <div className="flex items-start gap-2">
                                    <ArrowRight className="w-3.5 h-3.5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-[12px] font-semibold text-[#1D1D1F]">Next Steps </span>
                                      <span className="text-[12px] text-[#86868B]">{m.notes}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Tasks from this meeting */}
                              {m.tasks?.length > 0 && (
                                <div className="px-5 py-4 border-t border-[#F5F5F7]">
                                  <div className="text-[12px] font-semibold text-[#1D1D1F] mb-2.5">
                                    Tasks from this Meeting
                                    <span className="ml-1.5 text-[11px] font-normal text-[#86868B]">({m.tasks.length})</span>
                                  </div>
                                  <div className="space-y-2">
                                    {m.tasks.map((t: any) => (
                                      <div key={t.id} className="flex items-center gap-2.5">
                                        <div className={cn(
                                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                          t.status === "done" ? "bg-[#12B76A]" :
                                          t.status === "in_progress" ? "bg-[#007AFF]" : "bg-[#D1D1D6]"
                                        )} />
                                        <span className={cn(
                                          "text-[12px] flex-1",
                                          t.status === "done" ? "line-through text-[#86868B]" : "text-[#1D1D1F]"
                                        )}>{t.title}</span>
                                        {t.assignee && (
                                          <span className="text-[11px] text-[#86868B] flex-shrink-0">{t.assignee.full_name}</span>
                                        )}
                                        {t.priority === "high" && (
                                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full flex-shrink-0">High</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "next" && (
                  <div className="space-y-4">
                    <h2 className="text-[16px] font-bold text-[#1D1D1F]">
                      Upcoming Sprint
                      {nextSprint && (
                        <span className="ml-2 text-[13px] font-normal text-[#86868B]">
                          {fmtShort(nextSprint.startDate)} – {fmtShort(nextSprint.endDate)}
                        </span>
                      )}
                    </h2>
                    {!nextSprint ? (
                      <div className="bg-white rounded-lg border border-[#E5E5E7] p-8 text-center">
                        <Calendar className="w-8 h-8 text-[#86868B] mx-auto mb-2" />
                        <p className="text-[13px] text-[#86868B]">No upcoming sprint planned</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-[#E5E5E7] p-5">
                        <div className="space-y-2">
                          {nextSprint.tasks.map((t: any) => (
                            <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-[#F5F5F7] rounded-lg transition-colors">
                              <div className="w-4 h-4 border border-[#D1D1D6] rounded flex-shrink-0" />
                              <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "meetings" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[16px] font-bold text-[#1D1D1F]">
                        Meetings
                        {meetings.length > 0 && (
                          <span className="ml-2 text-[13px] font-normal text-[#86868B]">{meetings.length} recorded</span>
                        )}
                      </h2>
                    </div>

                    {meetings.length === 0 ? (
                      <div className="bg-white rounded-lg border border-[#E5E5E7] p-12 text-center">
                        <MessageSquare className="w-10 h-10 text-[#D1D1D6] mx-auto mb-3" />
                        <p className="text-[14px] font-medium text-[#1D1D1F]">No meetings recorded yet</p>
                        <p className="text-[12px] text-[#86868B] mt-1">Meeting notes will appear here after your sessions</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {meetings.map((m: any) => {
                          const isExpanded = expandedMeeting === m.id
                          return (
                            <div key={m.id} className="bg-white rounded-xl border border-[#E5E5E7] overflow-hidden">
                              {/* Header — always visible, click to expand */}
                              <button
                                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#F8F9FB] transition-colors text-left"
                                onClick={() => setExpandedMeeting(isExpanded ? null : m.id)}
                              >
                                <div className="w-10 h-10 rounded-full bg-[#EEF4FF] flex items-center justify-center flex-shrink-0">
                                  <MessageSquare className="w-5 h-5 text-[#007AFF]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[14px] font-semibold text-[#1D1D1F]">{m.title}</div>
                                  <div className="text-[12px] text-[#86868B] mt-0.5">
                                    {fmtMeetingDate(m.date, m.time)}
                                    {m.attendees?.length > 0 && (
                                      <span className="ml-2">· {m.attendees.join(", ")}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {m.status && (
                                    <span className={cn(
                                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                                      m.status === "completed" ? "bg-[#E6F9F0] text-[#12B76A]" :
                                      m.status === "scheduled" ? "bg-[#EEF4FF] text-[#007AFF]" :
                                      "bg-[#F5F5F7] text-[#86868B]"
                                    )}>{m.status}</span>
                                  )}
                                  {m.tasks?.length > 0 && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF4EC] text-[#F97316]">
                                      {m.tasks.length} task{m.tasks.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  <ChevronDown className={cn("w-4 h-4 text-[#86868B] transition-transform", isExpanded && "rotate-180")} />
                                </div>
                              </button>

                              {/* Expanded detail */}
                              {isExpanded && (
                                <div className="border-t border-[#F5F5F7]">

                                  {/* Agenda */}
                                  {m.agenda && (
                                    <div className="px-5 py-4 border-b border-[#F5F5F7]">
                                      <div className="text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Agenda</div>
                                      <p className="text-[13px] text-[#1D1D1F] leading-relaxed">{m.agenda}</p>
                                    </div>
                                  )}

                                  {/* Summary / Notes */}
                                  {m.summary && (
                                    <div className="px-5 py-4 border-b border-[#F5F5F7]">
                                      <div className="text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Summary</div>
                                      <p className="text-[13px] text-[#1D1D1F] leading-relaxed">{m.summary}</p>
                                    </div>
                                  )}

                                  {/* Key Decisions + Action Items side by side */}
                                  {(m.keyDecisions?.length > 0 || m.actionItems?.length > 0) && (
                                    <div className="grid grid-cols-2 divide-x divide-[#F5F5F7] border-b border-[#F5F5F7]">
                                      <div className="px-5 py-4">
                                        <div className="text-[12px] font-semibold text-[#12B76A] uppercase tracking-wider mb-3">Key Decisions</div>
                                        {m.keyDecisions?.length > 0 ? (
                                          <ul className="space-y-2">
                                            {m.keyDecisions.map((d: string, i: number) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] flex-shrink-0 mt-0.5" />
                                                <span className="text-[12px] text-[#1D1D1F]">{d}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-[12px] text-[#86868B] italic">None recorded</p>
                                        )}
                                      </div>
                                      <div className="px-5 py-4">
                                        <div className="text-[12px] font-semibold text-[#EF4444] uppercase tracking-wider mb-3">Waiting From Client</div>
                                        {m.actionItems?.length > 0 ? (
                                          <ul className="space-y-2">
                                            {m.actionItems.map((a: string, i: number) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                                                <span className="text-[12px] text-[#1D1D1F]">{a}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-[12px] text-[#86868B] italic">Nothing pending</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Next Steps */}
                                  {m.notes && (
                                    <div className="px-5 py-3 bg-[#F8F9FB] border-b border-[#F5F5F7]">
                                      <div className="flex items-start gap-2">
                                        <ArrowRight className="w-3.5 h-3.5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                                        <div>
                                          <span className="text-[12px] font-semibold text-[#1D1D1F]">Next Steps — </span>
                                          <span className="text-[12px] text-[#86868B]">{m.notes}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Tasks from this meeting */}
                                  {m.tasks?.length > 0 && (
                                    <div className="px-5 py-4">
                                      <div className="text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-3">
                                        Tasks ({m.tasks.length})
                                      </div>
                                      <div className="space-y-2">
                                        {m.tasks.map((t: any) => (
                                          <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F8F9FB]">
                                            <div className={cn(
                                              "w-2 h-2 rounded-full flex-shrink-0",
                                              t.status === "done" ? "bg-[#12B76A]" :
                                              t.status === "in_progress" ? "bg-[#007AFF]" :
                                              t.status === "in_review" ? "bg-[#F59E0B]" : "bg-[#D1D1D6]"
                                            )} />
                                            <span className={cn(
                                              "text-[12px] flex-1",
                                              t.status === "done" ? "line-through text-[#86868B]" : "text-[#1D1D1F]"
                                            )}>{t.title}</span>
                                            {t.due_date && (
                                              <span className="text-[11px] text-[#86868B] flex-shrink-0">{fmtShort(t.due_date)}</span>
                                            )}
                                            {t.assignee && (
                                              <span className="text-[11px] font-medium text-[#86868B] flex-shrink-0">{t.assignee.full_name}</span>
                                            )}
                                            {t.priority === "high" && (
                                              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full flex-shrink-0">High</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Empty state for expanded but no content */}
                                  {!m.agenda && !m.summary && !m.keyDecisions?.length && !m.actionItems?.length && !m.notes && !m.tasks?.length && (
                                    <div className="px-5 py-6 text-center">
                                      <p className="text-[12px] text-[#86868B]">No details recorded for this meeting yet.</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "monthly" && (
                  <div className="bg-white rounded-lg border border-[#E5E5E7] p-8 text-center">
                    <FileText className="w-8 h-8 text-[#86868B] mx-auto mb-2" />
                    <p className="text-[13px] text-[#86868B]">Monthly review content coming soon</p>
                  </div>
                )}

                {activeTab === "timeline" && (
                  <div className="bg-white rounded-lg border border-[#E5E5E7] p-8 text-center">
                    <Radio className="w-8 h-8 text-[#86868B] mx-auto mb-2" />
                    <p className="text-[13px] text-[#86868B]">Timeline view coming soon</p>
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="space-y-4">
                    <h2 className="text-[16px] font-bold text-[#1D1D1F]">Documents</h2>
                    {deliverables.length === 0 ? (
                      <div className="bg-white rounded-lg border border-[#E5E5E7] p-8 text-center">
                        <FileText className="w-8 h-8 text-[#86868B] mx-auto mb-2" />
                        <p className="text-[13px] text-[#86868B]">No documents available yet</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-[#E5E5E7] p-5">
                        <div className="space-y-2">
                          {deliverables.map((d: any) => (
                            <div key={d.id} className="flex items-center justify-between p-3 hover:bg-[#F5F5F7] rounded-lg transition-colors">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-[#007AFF] flex-shrink-0" />
                                <div>
                                  <div className="text-[13px] font-medium text-[#1D1D1F]">{d.name}</div>
                                  <div className="text-[11px] text-[#86868B]">{fmtShort(d.date)}</div>
                                </div>
                              </div>
                              {d.url && (
                                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-[#007AFF] hover:text-[#0051D5]">
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="w-72 bg-white border-l border-[#E5E5E7] flex flex-col print:hidden overflow-y-auto">
            {/* Sprint Summary */}
            <div className="p-4 border-b border-[#E5E5E7]">
              <h3 className="text-[13px] font-bold text-[#1D1D1F] mb-4">Sprint Summary</h3>
              <div className="flex items-center justify-center mb-4">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E5E7" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#12B76A" strokeWidth="8" strokeDasharray={`${(currentSprint?.completionPct || 0) * 3.14} 314`} strokeLinecap="round" />
                </svg>
                <div className="absolute text-center">
                  <div className="text-[24px] font-bold text-[#1D1D1F]">{currentSprint?.completionPct ?? 0}%</div>
                  <div className="text-[11px] text-[#86868B]">Complete</div>
                </div>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#1D1D1F]">Done</span>
                  <span className="font-semibold text-[#12B76A]">{done}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1D1D1F]">In Progress</span>
                  <span className="font-semibold text-[#F97316]">{currentSprint?.inProgress ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1D1D1F]">Review</span>
                  <span className="font-semibold text-[#F59E0B]">{inReview}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1D1D1F]">Waiting</span>
                  <span className="font-semibold text-[#EF4444]">{waitingForClient}</span>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="p-4 border-b border-[#E5E5E7]">
              <h3 className="text-[13px] font-bold text-[#1D1D1F] mb-3">What&apos;s Next</h3>
              {meetings.length === 0 ? (
                <p className="text-[12px] text-[#86868B]">No upcoming meetings</p>
              ) : (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-1" />
                  <div>
                    <div className="text-[12px] font-semibold text-[#1D1D1F]">{meetings[0].title}</div>
                    <div className="text-[11px] text-[#86868B]">{fmtMeetingDate(meetings[0].date, meetings[0].time)}</div>
                    <button className="text-[11px] text-[#007AFF] font-medium hover:underline mt-2">View Meeting Details</button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-4 flex-1">
              <h3 className="text-[13px] font-bold text-[#1D1D1F] mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { icon: HelpCircle, label: "Request Something" },
                  { icon: MessageCircle, label: "Give Feedback" },
                  { icon: Phone, label: "Schedule a Call" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[#E5E5E7] hover:bg-[#F5F5F7] transition-colors text-[12px] font-medium text-[#1D1D1F] group"
                  >
                    <Icon className="w-4 h-4 text-[#86868B] group-hover:text-[#007AFF]" />
                    {label}
                    <ChevronRight className="w-3.5 h-3.5 text-[#86868B] group-hover:text-[#007AFF] ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── View All Modal ── */}
        {activeModal && (
          <ViewAllModal
            title={activeModal.title}
            items={activeModal.items}
            renderItem={activeModal.render}
            onClose={() => setViewAll(null)}
          />
        )}
      </RoleBasedLayout>
    </AuthGuard>
  )
}
