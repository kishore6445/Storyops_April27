"use client"

import { Calendar, Plus } from "lucide-react"

interface Meeting {
  id: string
  date: string
  time: string
}

interface MeetingsScheduleNextTabProps {
  meeting: Meeting
}

export function MeetingsScheduleNextTab({ meeting }: MeetingsScheduleNextTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule Next Meeting</h3>
        <p className="text-sm text-gray-600">Plan the follow-up meeting</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h4 className="text-sm font-semibold text-gray-900 mb-1">No next meeting scheduled</h4>
        <p className="text-sm text-gray-600 mb-4">Schedule a follow-up meeting with the team</p>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </button>
      </div>
    </div>
  )
}
