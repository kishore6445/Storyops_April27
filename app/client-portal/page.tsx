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

// ── Deliverable type icon ─────────────────────────────────────────────────────
function TypeIcon({ type }: { type: string }) {
  const base = "w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
  if (type === "PDF")   return <div className={cn(base, "bg-[#FFF0F0] text-[#EF4444]")}>PDF</div>
  if (type === "Video") return <div className={cn(base, "bg-[#FFF0F0] text-[#EF4444]")}><Youtube className="w-4 h-4" /></div>
  if (type === "Image") return <div className={cn(base, "bg-[#FFF7F0] text-[#F97316]")}><Instagram className="w-4 h-4" /></div>
  return <div className={cn(base, "bg-[#F0F6FF] text-[#3B82F6]")}>F</div>
}

// ── Social row ────────────────────────────────────────────────────────────────
function SocialRow({ icon, label, count, unit }: { icon: React.ReactNode; label: string; count: number; unit: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F5F5F7] last:border-0">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[13px] text-[#1D1D1F]">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[15px] font-bold text-[#1D1D1F]">{count}</span>
        <span className="text-[12px] text-[#86868B]">{unit}</span>
      </div>
    </div>
  )
}

// ── View All Modal ────────────────────────────────────────────────────────────
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientPortalPage() {
  const [selectedSprintId, setSelectedSprintId] = useState<string>("") // empty = auto
  const [sprintDropdownOpen, setSprintDropdownOpen] = useState(false)
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
    allSprints       = [],
    currentSprint,
    nextSprint,
    completedTasks   = [],
    inProgressTasks  = [],
    attentionTasks   = [],
    meetings         = [],
    deliverables     = [],
    socialCounts     = {},
    project          = {},
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
      `Completed: ${currentSprint?.completed ?? 0}  In Progress: ${currentSprint?.inProgress ?? 0}  Pending: ${currentSprint?.pending ?? 0}  Delayed: ${currentSprint?.delayed ?? 0}`,
      "",
      `== What We've Done ==`,
      ...completedTasks.map((t: any) => `✓ ${t.title}`),
      "",
      `== In Progress ==`,
      ...inProgressTasks.map((t: any) => `• ${t.title}`),
      "",
      `== Needs Attention ==`,
      ...attentionTasks.map((t: any) => `! ${t.title} — ${t.reason}`),
      "",
      `== Next Sprint Plan ==`,
      nextSprint
        ? `${nextSprint.name}: ${fmtShort(nextSprint.startDate)} – ${fmtShort(nextSprint.endDate)}`
        : "No upcoming sprint",
      ...(nextSprint?.tasks || []).map((t: any) => `  ${t.title}`),
    ]
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Download PDF (print to PDF via browser) ───────────────────────────────
  const handleDownloadPDF = () => {
    window.print()
  }

  // ── View All modal config ────────────────────────────────────────────────
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
      title: "All Delayed Items",
      items: attentionTasks,
      render: (t: any) => (
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#1D1D1F]">{t.title}</span>
          </div>
          <p className="text-[11px] text-[#86868B] ml-4">Reason: {t.reason}</p>
        </div>
      ),
    },
    meetings: {
      title: "All Meetings & MOMs",
      items: meetings,
      render: (m: any) => (
        <div className="flex items-start gap-2.5 py-2 border-b border-[#F5F5F7] last:border-0">
          <div className="w-7 h-7 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
          </div>
          <div>
            <div className="text-[13px] font-medium text-[#1D1D1F]">{m.title}</div>
            <div className="text-[11px] text-[#86868B]">{fmtMeetingDate(m.date, m.time)}</div>
          </div>
        </div>
      ),
    },
    nextplan: {
      title: "Full Sprint Plan",
      items: nextSprint?.tasks || [],
      render: (t: any) => (
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 border border-[#D1D1D6] rounded flex-shrink-0" />
          <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
        </div>
      ),
    },
    deliverables: {
      title: "All Deliverables",
      items: deliverables,
      render: (d: any) => (
        <div className="flex items-center justify-between py-2 border-b border-[#F5F5F7] last:border-0">
          <div className="flex items-center gap-2.5">
            <TypeIcon type={d.type} />
            <span className="text-[13px] text-[#1D1D1F]">{d.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={d.status} />
            <span className="text-[11px] text-[#86868B]">{fmtShort(d.date)}</span>
          </div>
        </div>
      ),
    },
  }

  const activeModal = viewAll ? viewAllConfig[viewAll] : null

  return (
    <AuthGuard>
      <RoleBasedLayout userRole="client">
        <div className="min-h-screen bg-[#F8F9FB] pb-10 print:bg-white" ref={reportRef}>
          <div className="w-full px-6 pt-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-bold text-[#1D1D1F] flex items-center gap-2">
                  Welcome, {client?.name || userName}! <span>👋</span>
                </h1>
                <p className="text-[13px] text-[#86868B] mt-0.5">{"Here's what's happening with your project."}</p>
                {/* Sprint selector */}
                {allSprints.length > 0 && (
                  <div className="relative mt-3 inline-block print:hidden">
                    <button
                      onClick={() => setSprintDropdownOpen((o) => !o)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D1D1D6] bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#007AFF]" />
                      {selectedSprintId === "all"
                        ? "All Sprints"
                        : selectedSprintId
                          ? (allSprints.find((s: any) => s.id === selectedSprintId)?.name || "Select Sprint")
                          : (currentSprint?.name || "Select Sprint")}
                      <ChevronDown className="w-3.5 h-3.5 text-[#86868B]" />
                    </button>
                    {sprintDropdownOpen && (
                      <div
                        className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl border border-[#E5E5E7] shadow-lg z-20 overflow-hidden"
                        onMouseLeave={() => setSprintDropdownOpen(false)}
                      >
                        <button
                          onClick={() => { setSelectedSprintId("all"); setSprintDropdownOpen(false) }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#F5F5F7] transition-colors border-b border-[#F5F5F7]",
                            selectedSprintId === "all" ? "font-semibold text-[#007AFF]" : "text-[#1D1D1F]"
                          )}
                        >
                          All Sprints
                        </button>
                        {allSprints.map((s: any) => (
                          <button
                            key={s.id}
                            onClick={() => { setSelectedSprintId(s.id); setSprintDropdownOpen(false) }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#F5F5F7] transition-colors",
                              selectedSprintId === s.id || (!selectedSprintId && s.id === currentSprint?.id)
                                ? "font-semibold text-[#007AFF]"
                                : "text-[#1D1D1F]"
                            )}
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
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D1D6] bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#12B76A]" /> : <Copy className="w-3.5 h-3.5 text-[#007AFF]" />}
                  {copied ? "Copied!" : "Copy Client Report"}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D1D6] bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#EF4444]" />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: `Client Report — ${client?.name}`, url: window.location.href })
                    } else {
                      navigator.clipboard.writeText(window.location.href)
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D1D6] bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#12B76A]" />
                  Share
                </button>
              </div>
            </div>

            {/* ── Row 1: Current Sprint + Timeline ── */}
            <div className="grid grid-cols-5 gap-4 mb-4">
              {/* Current Sprint card */}
              <div className="col-span-3 bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-medium text-[#86868B]">Current Sprint</span>
                  <StatusBadge status={currentSprint?.status || "On Track"} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[17px] font-bold text-[#1D1D1F]">
                    {currentSprint
                      ? `${currentSprint.name}: ${fmtShort(currentSprint.startDate)} – ${fmtShort(currentSprint.endDate)}`
                      : "No active sprint"}
                  </h2>
                  <span className="text-[13px] font-bold text-[#12B76A]">{currentSprint?.completionPct ?? 0}% Complete</span>
                </div>
                <div className="w-full h-2 bg-[#E5E5E7] rounded-full mb-4">
                  <div className="h-2 bg-[#12B76A] rounded-full transition-all" style={{ width: `${currentSprint?.completionPct ?? 0}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Completed",   val: currentSprint?.completed ?? 0,  color: "text-[#1D1D1F]" },
                    { label: "In Progress", val: currentSprint?.inProgress ?? 0, color: "text-[#007AFF]" },
                    { label: "Pending",     val: currentSprint?.pending ?? 0,    color: "text-[#86868B]" },
                    { label: "Delayed",     val: currentSprint?.delayed ?? 0,    color: "text-[#EF4444]" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className={cn("text-[22px] font-bold", s.color)}>{s.val}</div>
                      <div className="text-[11px] text-[#86868B]">{s.label}</div>
                    </div>
                  ))}
                </div>
                <button className="flex items-center gap-1 text-[13px] font-semibold text-[#007AFF] hover:underline">
                  View Current Sprint <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sprint Timeline card */}
              <div className="col-span-2 bg-white rounded-xl border border-[#E5E5E7] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-[#007AFF]" />
                    <span className="text-[13px] font-semibold text-[#1D1D1F]">Sprint Timeline</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <div className="text-[11px] text-[#86868B] mb-1">Start Date</div>
                      <div className="text-[14px] font-bold text-[#1D1D1F]">{fmtShort(currentSprint?.startDate)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#86868B] mb-1">End Date</div>
                      <div className="text-[14px] font-bold text-[#1D1D1F]">{fmtShort(currentSprint?.endDate)}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#12B76A] flex-shrink-0" />
                  <div>
                    <div className="text-[13px] font-semibold text-[#1D1D1F]">
                      {currentSprint?.daysRemaining ?? 0} days remaining
                    </div>
                    <div className="text-[11px] text-[#86868B]">{"We're on track to deliver on time!"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 2: Done / In Progress / Needs Attention ── */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* What we've done */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">What We&apos;ve Done This Sprint</span>
                </div>
                <div className="space-y-2">
                  {completedTasks.length === 0 && <p className="text-[12px] text-[#86868B]">No completed tasks yet</p>}
                  {completedTasks.slice(0, 6).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] flex-shrink-0" />
                      <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
                    </div>
                  ))}
                </div>
                {completedTasks.length > 0 && (
                  <button
                    onClick={() => setViewAll("completed")}
                    className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#007AFF] hover:underline"
                  >
                    View All Completed Items <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* In Progress */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-[#F97316]" />
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">In Progress</span>
                </div>
                <div className="space-y-2">
                  {inProgressTasks.length === 0 && <p className="text-[12px] text-[#86868B]">No tasks in progress</p>}
                  {inProgressTasks.slice(0, 6).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F97316] flex-shrink-0" />
                      <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
                    </div>
                  ))}
                </div>
                {inProgressTasks.length > 0 && (
                  <button
                    onClick={() => setViewAll("inprogress")}
                    className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#007AFF] hover:underline"
                  >
                    View All In Progress <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Needs Attention */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">Needs Attention</span>
                </div>
                <div className="space-y-3">
                  {attentionTasks.length === 0 && <p className="text-[12px] text-[#86868B]">No items need attention</p>}
                  {attentionTasks.slice(0, 4).map((t: any, i: number) => (
                    <div key={t.id || i}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0" />
                        <span className="text-[13px] font-semibold text-[#1D1D1F]">{t.title}</span>
                      </div>
                      <p className="text-[11px] text-[#86868B] ml-4">Reason: {t.reason}</p>
                    </div>
                  ))}
                </div>
                {attentionTasks.length > 0 && (
                  <button
                    onClick={() => setViewAll("attention")}
                    className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#EF4444] hover:underline"
                  >
                    View All Delayed Items <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Row 3: Next Sprint Plan + Meetings + Social ── */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Next Sprint Plan */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[#7C3AED]" />
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">
                    Next Sprint Plan
                    {nextSprint && (
                      <span className="ml-1 font-normal text-[#86868B]">
                        ({fmtShort(nextSprint.startDate)} – {fmtShort(nextSprint.endDate)})
                      </span>
                    )}
                  </span>
                </div>
                {!nextSprint ? (
                  <p className="text-[12px] text-[#86868B]">No upcoming sprint planned</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {nextSprint.tasks.slice(0, 6).map((t: any) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border border-[#D1D1D6] rounded flex-shrink-0" />
                          <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setViewAll("nextplan")}
                      className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#007AFF] hover:underline"
                    >
                      View Full Plan <ArrowRight className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {/* Recent Meetings & MOMs */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#86868B]" />
                    <span className="text-[13px] font-semibold text-[#1D1D1F]">Recent Meetings &amp; MOMs</span>
                  </div>
                  <button
                    onClick={() => setViewAll("meetings")}
                    className="flex items-center gap-0.5 text-[12px] text-[#007AFF] hover:underline font-medium"
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {meetings.length === 0 && <p className="text-[12px] text-[#86868B]">No meetings recorded</p>}
                <div className="space-y-3">
                  {meetings.slice(0, 3).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-[#F5F5F7] last:border-0">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="w-7 h-7 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-[#1D1D1F] truncate">{m.title}</div>
                          <div className="text-[11px] text-[#86868B]">{fmtMeetingDate(m.date, m.time)}</div>
                        </div>
                      </div>
                      <button className="ml-2 px-2.5 py-1 bg-[#F0F6FF] text-[#007AFF] text-[11px] font-semibold rounded-lg hover:bg-[#E0EDFF] flex-shrink-0">
                        View MOM
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Media This Sprint */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">Social Media This Sprint</span>
                  <button className="flex items-center gap-0.5 text-[12px] text-[#007AFF] hover:underline font-medium">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <SocialRow
                  icon={<div className="w-6 h-6 rounded bg-gradient-to-br from-[#E1306C] to-[#F77737] flex items-center justify-center"><Instagram className="w-3.5 h-3.5 text-white" /></div>}
                  label="Instagram"
                  count={socialCounts.instagram ?? 0}
                  unit="Posts"
                />
                <SocialRow
                  icon={<div className="w-6 h-6 rounded bg-[#0077B5] flex items-center justify-center"><Linkedin className="w-3.5 h-3.5 text-white" /></div>}
                  label="LinkedIn"
                  count={socialCounts.linkedin ?? 0}
                  unit="Posts"
                />
                <SocialRow
                  icon={<div className="w-6 h-6 rounded bg-[#EF4444] flex items-center justify-center"><Youtube className="w-3.5 h-3.5 text-white" /></div>}
                  label="YouTube"
                  count={socialCounts.youtube ?? 0}
                  unit="Videos"
                />
                <SocialRow
                  icon={<div className="w-6 h-6 rounded bg-[#1D1D1F] flex items-center justify-center"><span className="text-white text-[9px] font-bold">R</span></div>}
                  label="Reels"
                  count={socialCounts.reels ?? 0}
                  unit="Reels"
                />
                <button className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#007AFF] hover:underline">
                  View Creatives &amp; Captions <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* ── Row 4: Deliverables + Project Overview ── */}
            <div className="grid grid-cols-5 gap-4">
              {/* Latest Deliverables */}
              <div className="col-span-3 bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[14px] font-semibold text-[#1D1D1F]">Latest Deliverables</span>
                  <button
                    onClick={() => setViewAll("deliverables")}
                    className="flex items-center gap-0.5 text-[12px] text-[#007AFF] hover:underline font-medium"
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {deliverables.length === 0 ? (
                  <p className="text-[12px] text-[#86868B]">No deliverables uploaded yet for completed tasks</p>
                ) : (
                  <>
                    <div className="grid grid-cols-[1fr_80px_90px_120px] pb-2 mb-1">
                      <span className="text-[11px] text-[#86868B] font-medium"></span>
                      <span className="text-[11px] text-[#86868B] font-medium">Type</span>
                      <span className="text-[11px] text-[#86868B] font-medium">Status</span>
                      <span className="text-[11px] text-[#86868B] font-medium">Date</span>
                    </div>
                    <div className="space-y-1">
                      {deliverables.slice(0, 6).map((d: any) => (
                        <div key={d.id} className="grid grid-cols-[1fr_80px_90px_120px] items-center py-2.5 border-b border-[#F5F5F7] last:border-0">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <TypeIcon type={d.type} />
                            <span className="text-[13px] text-[#1D1D1F] truncate">{d.name}</span>
                          </div>
                          <span className="text-[13px] text-[#86868B]">{d.type}</span>
                          <StatusBadge status={d.status} />
                          <div className="flex items-center gap-1.5 text-[11px] text-[#86868B]">
                            <span>{fmtShort(d.date)}</span>
                            {d.url && (
                              <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#007AFF]">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Project Overview — client org name + working days only */}
              <div className="col-span-2 bg-white rounded-xl border border-[#E5E5E7] p-5">
                <span className="text-[14px] font-semibold text-[#1D1D1F] block mb-4">Project Overview</span>
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-10 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#86868B]">Client Organization</div>
                      <div className="text-[13px] font-semibold text-[#1D1D1F]">{client?.name || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-[#86868B]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-[#86868B]">Working Days</div>
                      <div className="text-[13px] font-semibold text-[#1D1D1F]">Mon – Sat</div>
                    </div>
                  </div>
                </div>
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
