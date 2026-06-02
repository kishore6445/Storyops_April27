"use client"

import { ActivitySquare } from "lucide-react"

interface Activity {
  id: string
  type: string
  description: string
  timestamp: string
  user?: string
}

interface MeetingsActivityTabProps {
  meeting: { id: string }
  activities?: Activity[]
}

export function MeetingsActivityTab({ meeting, activities = [] }: MeetingsActivityTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity</h3>
        <p className="text-sm text-gray-600">Timeline of changes and updates</p>
      </div>

      {activities.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-6 text-center">
          <ActivitySquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-sm font-semibold text-gray-900 mb-1">No activity yet</h4>
          <p className="text-sm text-gray-600">Updates and changes will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-b-0">
              <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.user && <span>{activity.user} • </span>}
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
