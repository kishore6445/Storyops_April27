"use client"

import { useState, useEffect } from "react"
import { Loader, ChevronRight } from "lucide-react"
import useSWR from "swr"
import { useRouter } from "next/navigation"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const response = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error("Failed to fetch")
  return response.json()
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
}

export default function WBSPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR("/api/projects", fetcher)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (data?.projects) {
      setProjects(data.projects)
    }
  }, [data])

  const handleSelectProject = (projectId: string) => {
    router.push(`/wbs/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WBS Canvas</h1>
            <p className="text-sm text-gray-500 mt-1">Plan and decompose projects hierarchically</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No projects available. Create a project first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project.id)}
                className="text-left p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    {project.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
