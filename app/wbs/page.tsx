"use client"

import { useState } from "react"

import Workstream from "./_components/Workstream"

import SummaryCards from "./_components/SummaryCards"

import { initialWorkstreams } from "@/data/initialData"

export default function Page() {
  const [workstreams, setWorkstreams] =
    useState(initialWorkstreams)

  const [selectedId, setSelectedId] =
    useState(null)

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b bg-slate-900 p-4 text-white">
        StoryOps WBS
      </div>

      <div className="p-6">
        <SummaryCards
          overall={0}
          leafTasks={0}
          blocked={0}
          dueSoon={0}
          wbsType="Monthly"
        />

        <div className="mt-6 space-y-6">
          {workstreams.map((ws) => (
            <Workstream
              key={ws.id}
              workstream={ws}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}