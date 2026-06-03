export type NodeStatus =
  | "Not Started"
  | "In Progress"
  | "Waiting Client"
  | "Blocked"
  | "Done"

export type NodeType = "Workstream" | "Task" | "Subtask" | "Ad"

export interface WBSNode {
  id: number
  code: string // e.g. "1.1", "1.1.1"
  title: string
  type: NodeType
  description: string
  assignee: string
  status: NodeStatus
  priority: "Low" | "Medium" | "High"
  sprint: string
  clientPromisedDate: string
  internalDueDate: string
  children: WBSNode[]
}

export interface Workstream {
  id: number
  code: string // e.g. "1.0"
  title: string
  color: string
  nodes: WBSNode[]
}

export const CLIENTS = ["PhytoCraft", "Acme Corp", "BrightWave", "NovaMind"]
export const TEAM_MEMBERS = ["Unassigned", "Suresh", "Soujanya", "Kaivalya", "Kavitha", "Rahul"]
export const SPRINTS = ["Unassigned", "Sprint_June_001", "Sprint_June_002", "Sprint_July_001"]

export const WORKSTREAM_COLORS = [
  "#6172f3",
  "#00b341",
  "#e040fb",
  "#ff6d00",
  "#00bcd4",
  "#f44336",
]

export const initialWorkstreams: Workstream[] = [
  {
    id: 1,
    code: "1.0",
    title: "Website",
    color: "#6172f3",
    nodes: [
      {
        id: 101,
        code: "1.1",
        title: "Landing Page",
        type: "Task",
        description: "Create campaign landing page",
        assignee: "Suresh",
        status: "In Progress",
        priority: "High",
        sprint: "Sprint_June_001",
        clientPromisedDate: "2026-06-12",
        internalDueDate: "2026-06-10",
        children: [
          {
            id: 1001,
            code: "1.1.1",
            title: "Hero Section",
            type: "Subtask",
            description: "Write and design hero section",
            assignee: "Soujanya",
            status: "Done",
            priority: "Medium",
            sprint: "Sprint_June_001",
            clientPromisedDate: "2026-06-07",
            internalDueDate: "2026-06-05",
            children: [],
          },
          {
            id: 1002,
            code: "1.1.2",
            title: "CTA Form Integration",
            type: "Subtask",
            description: "Embed and test CTA form",
            assignee: "Suresh",
            status: "In Progress",
            priority: "Medium",
            sprint: "Sprint_June_001",
            clientPromisedDate: "2026-06-10",
            internalDueDate: "2026-06-08",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    code: "2.0",
    title: "Facebook Marketing",
    color: "#00b341",
    nodes: [
      {
        id: 201,
        code: "2.1",
        title: "Posting",
        type: "Task",
        description: "Create and schedule Facebook posts",
        assignee: "Soujanya",
        status: "In Progress",
        priority: "High",
        sprint: "Sprint_June_001",
        clientPromisedDate: "2026-06-14",
        internalDueDate: "2026-06-12",
        children: [
          {
            id: 2001,
            code: "2.1.1",
            title: "Content Calendar",
            type: "Subtask",
            description: "Build monthly content calendar",
            assignee: "Soujanya",
            status: "In Progress",
            priority: "Medium",
            sprint: "Sprint_June_001",
            clientPromisedDate: "2026-06-10",
            internalDueDate: "2026-06-08",
            children: [],
          },
          {
            id: 2002,
            code: "2.1.2",
            title: "Reels Script",
            type: "Subtask",
            description: "Write reels scripts",
            assignee: "Kavitha",
            status: "Blocked",
            priority: "High",
            sprint: "Sprint_June_001",
            clientPromisedDate: "2026-06-12",
            internalDueDate: "2026-06-10",
            children: [],
          },
        ],
      },
      {
        id: 202,
        code: "2.2",
        title: "Campaign Setup",
        type: "Task",
        description: "Set up Facebook ad campaign",
        assignee: "Kaivalya",
        status: "Waiting Client",
        priority: "High",
        sprint: "Sprint_June_001",
        clientPromisedDate: "2026-06-16",
        internalDueDate: "2026-06-13",
        children: [
          {
            id: 2021,
            code: "2.2.1",
            title: "Pixel Setup",
            type: "Subtask",
            description: "Install and verify Facebook pixel",
            assignee: "Kaivalya",
            status: "Waiting Client",
            priority: "High",
            sprint: "Sprint_June_001",
            clientPromisedDate: "2026-06-14",
            internalDueDate: "2026-06-12",
            children: [],
          },
        ],
      },
    ],
  },
]
