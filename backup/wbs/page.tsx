"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader, Plus } from "lucide-react"
import useSWR from "swr"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const res = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

interface Project {
  id: string
  name: string
}

export default function WBSLanding() {
  const router = useRouter()
  const { data: session } = useSWR("/api/auth/session", fetcher)
  const { data, isLoading } = useSWR(session ? "/api/projects" : null, fetcher)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const projects: Project[] = data?.projects || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">WBS Canvas</h1>
          <p className="text-gray-600 mt-2">Campaign planning with hierarchical work breakdown structure</p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Your Projects</h2>
        
        {projects.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-600 mb-4">No projects yet</p>
            <button
              onClick={() => router.push("/projects/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/wbs/${project.id}`)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all text-left"
              >
                <h3 className="font-bold text-gray-900 text-lg">{project.name}</h3>
                <p className="text-sm text-gray-600 mt-2">Click to open WBS canvas</p>
                <div className="mt-4 flex justify-end">
                  <span className="text-blue-600 font-medium">Open →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
