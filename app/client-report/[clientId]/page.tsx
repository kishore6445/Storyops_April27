// "use client"

import {
  CheckCircle2,
  Calendar,
  BarChart3,
  Share2,
  FileText,
  MessageSquare,
  TrendingUp,
} from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { TopNav } from "@/components/top-nav"
import { Sidebar } from "@/components/sidebar"

interface ReportData {
  clientName: string
  month: string
  completedTasks: number
  totalTasks: number
  tasks: Array<{
    id: string
    title: string
    status: "completed" | "in_progress"
    dueDate: string
    assignee: string
  }>
  contentPosts: Array<{
    id: string
    platform: string
    title: string
    status: "published" | "scheduled" | "draft"
    date: string
  }>
  accountManagerNotes: string
}

const dummyReportData: ReportData = {
  clientName: "TechStartup Inc.",
  month: "April 2026",
  completedTasks: 24,
  totalTasks: 28,
  tasks: [],
  contentPosts: [],
  accountManagerNotes: "Great progress this month!",
}

export default function ClientReportPage() {
  const data = dummyReportData

  const publishedCount = data.contentPosts.filter(
    (p) => p.status === "published"
  ).length

  const scheduledCount = data.contentPosts.filter(
    (p) => p.status === "scheduled"
  ).length

  const completionPercentage = Math.round(
    (data.completedTasks / data.totalTasks) * 100
  )

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar currentPhase="client-dashboards" onPhaseChange={() => {}} />

        <div className="flex-1 flex flex-col">
          <TopNav />

          <main className="flex-1 overflow-auto">
            <div className="min-h-screen bg-white">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <div className="max-w-6xl mx-auto px-6 py-12">
                  <h1 className="text-4xl font-bold mb-2">
                    {data.clientName}
                  </h1>
                  <p className="text-blue-100 text-lg">
                    Monthly Progress Report - {data.month}
                  </p>

                  <div className="mt-6">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href)
                        alert("Link copied!")
                      }}
                      className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold"
                    >
                      <Share2 className="w-5 h-5" />
                      Share Report
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="max-w-6xl mx-auto px-6 py-12">

                {/* KPI */}
                <div className="grid md:grid-cols-4 gap-6 mb-12">
                  <div className="p-6 border rounded-xl">
                    <p>Completed Tasks</p>
                    <h2 className="text-2xl font-bold">
                      {data.completedTasks}
                    </h2>
                  </div>

                  <div className="p-6 border rounded-xl">
                    <p>Completion %</p>
                    <h2 className="text-2xl font-bold">
                      {completionPercentage}%
                    </h2>
                  </div>

                  <div className="p-6 border rounded-xl">
                    <p>Published</p>
                    <h2 className="text-2xl font-bold">
                      {publishedCount}
                    </h2>
                  </div>

                  <div className="p-6 border rounded-xl">
                    <p>Scheduled</p>
                    <h2 className="text-2xl font-bold">
                      {scheduledCount}
                    </h2>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-12 p-6 border rounded-xl">
                  <h2 className="text-xl font-bold mb-4">
                    Account Manager Notes
                  </h2>
                  <p>{data.accountManagerNotes}</p>
                </div>

                {/* Footer */}
                <div className="border-t pt-6 text-center text-gray-600">
                  <p>
                    Confidential report for {data.clientName}
                  </p>
                  <p className="text-sm mt-2">
                    Contact your account manager for queries
                  </p>
                </div>

              </div>
            </div>
          </main>

        </div>
      </div>
    </AuthGuard>
  )
}