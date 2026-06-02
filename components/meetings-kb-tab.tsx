"use client"

import { BookOpen, Plus } from "lucide-react"

interface MeetingsKBTabProps {
  meeting: { id: string; client_id?: string }
}

export function MeetingsKBTab({ meeting }: MeetingsKBTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Knowledge Base</h3>
        <p className="text-sm text-gray-600">Documentation and resources from this meeting</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h4 className="text-sm font-semibold text-gray-900 mb-1">No KB entries yet</h4>
        <p className="text-sm text-gray-600 mb-4">Add meeting insights to your knowledge base</p>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add to KB
        </button>
      </div>
    </div>
  )
}
