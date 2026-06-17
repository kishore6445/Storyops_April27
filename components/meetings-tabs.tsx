"use client"

import { cn } from "@/lib/utils"
import { 
  FileText, 
  ClipboardList, 
  Calendar, 
  BookOpen, 
  Activity 
} from "lucide-react"

type TabType = "details" | "mom" | "schedule" | "kb" | "activity"

interface Tab {
  id: TabType
  label: string
  icon: React.ReactNode
}

interface MeetingsTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: Tab[] = [
  { id: "details", label: "Meeting Details", icon: <FileText className="w-4 h-4" /> },
  { id: "mom", label: "MOM & Tasks", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "schedule", label: "Schedule Next", icon: <Calendar className="w-4 h-4" /> },
  { id: "kb", label: "Knowledge Base", icon: <BookOpen className="w-4 h-4" /> },
  { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
]

export function MeetingsTabs({ activeTab, onTabChange }: MeetingsTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
