"use client"

import { AuthGuard } from "@/components/auth-guard"
import { TopNav } from "@/components/top-nav"
import { Sidebar } from "@/components/sidebar"
import { BacklogDashboard } from "@/components/backlog-dashboard"

export default function BacklogPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#FAFBFC]">
        <TopNav />
        <div className="flex">
          <Sidebar currentPhase="backlog" onPhaseChange={() => {}} />
          <main className="flex-1 ml-[var(--sidebar-width,16rem)] mt-16 p-6 [@media(max-width:768px)]:ml-20 pb-0">
            <BacklogDashboard />
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
