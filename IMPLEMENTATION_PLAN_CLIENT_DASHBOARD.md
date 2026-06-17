# Client Dashboard Implementation Plan

## Overview
Enable clients to log into Storyops and view a comprehensive dashboard showing their sprint progress, weekly reports, meetings, and pending approvals. The design mirrors the internal staff dashboard but filtered to client-specific data with read-only permissions plus ability to submit reports and feedback.

---

## Current Data Flow Analysis

### Existing Auth System
- **Login Flow**: Email + Password → `/api/auth/login` → Supabase Auth + Custom users table
- **Role-based Redirect**: After login, users redirected based on `role` field (currently: "client" → `/client-portal`)
- **Session Token**: Stored in `localStorage` as `sessionToken`
- **Auth Check**: `/api/auth/me` validates token and returns current user
- **Users Table Schema**: Has `id`, `email`, `full_name`, `role`, `is_active` fields

### Existing API Endpoints
- `/api/client-portal` - Already returns client-specific sprint data (tasks, meetings, deliverables, social counts)
- `/api/meetings` - Fetches meetings for a user/client with attendees and action items
- `/api/tasks` - Task list with multi-assignee support via `task_assignees` junction table
- `/api/sprints` - Sprint data (start_date, end_date, status)
- `/api/content_records` - Social media content data

### Existing Tables
- `users` - Stores user accounts with role
- `clients` - Client organizations (id, name, user_id for admin link)
- `sprints` - Sprints (client_id, start_date, end_date, status)
- `tasks` - Tasks (client_id, sprint_id, assigned_to, status, due_date, promised_date, title, description)
- `task_assignees` - Multi-assignee junction table (task_id, user_id)
- `task_files` - Task attachment files (task_id, name, url, mime_type, uploaded_at)
- `meetings` - Meetings (client_id, user_id, date, time, title, summary, status)
- `meeting_attendees` - Meeting attendees (meeting_id, user_id, role)
- `content_records` - Social media content (client_id, platform, content_type, status, scheduled_date, title)
- `activity_log` - Activity logs for tracking changes

### Existing Client Portal Page
- Read-only dashboard showing current sprint, next sprint, deliverables, social counts
- Has sprint selector (show specific or all sprints)
- Shows meetings, project dates, needs attention tasks
- Accessed via `/client-portal` (requires client role)

---

## What Needs to Be Built

### 1. Client-Specific Database Tables (New)
```sql
-- Weekly reports submitted by clients (free-form text + document uploads)
CREATE TABLE weekly_reports (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  sprint_id uuid references sprints(id) on delete cascade,
  week_number int,
  report_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Files attached to weekly reports
CREATE TABLE weekly_report_files (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid references weekly_reports(id) on delete cascade,
  name text not null,
  url text not null,
  mime_type text,
  uploaded_at timestamptz default now()
);

-- Client feedback / pending items from client (waiting for review/approval by staff)
CREATE TABLE client_feedback (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  feedback_text text,
  status text default 'pending', -- pending, approved, rejected, in_review
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references users(id)
);
```

### 2. New API Endpoints

#### `GET /api/client-dashboard`
**Purpose**: Single endpoint returning everything for client dashboard
**Query Params**:
- `clientId` (optional) - filter to specific client
- `sprintId` (optional) - filter data to specific sprint or "all"

**Returns**:
```json
{
  "client": { "id", "name" },
  "currentSprint": { "id", "name", "startDate", "endDate", "status", "completionPct", "daysRemaining" },
  "nextSprint": { "id", "name", "startDate", "endDate", "tasks" },
  "allSprints": [{ "id", "name", "startDate", "endDate" }],
  "sprintSummary": { "total", "completed", "inProgress", "inReview", "waiting" },
  "socialCounts": { "instagram", "linkedin", "youtube", "reels" },
  "meetings": [{ "id", "title", "date", "time", "summary" }],
  "pendingApprovals": [{ "taskId", "taskTitle", "reason", "submittedDate" }],
  "weeklyReports": [{ "id", "week", "text", "files", "createdAt" }],
  "deliverables": [{ "id", "name", "type", "status", "date", "url" }],
  "projectTimeline": { "startDate", "endDate" }
}
```

#### `POST /api/weekly-reports`
**Purpose**: Submit weekly report (text + file uploads)
**Body**:
```json
{
  "clientId": "uuid",
  "sprintId": "uuid",
  "weekNumber": 1,
  "reportText": "string",
  "files": [ { "name", "url", "mimeType" } ]
}
```

#### `GET /api/weekly-reports?clientId=&sprintId=`
**Purpose**: Fetch submitted weekly reports
**Returns**: Array of reports with files

#### `GET /api/client-feedback?clientId=&status=pending`
**Purpose**: Fetch pending/submitted feedback from client
**Returns**: Array of feedback items with task details

#### `POST /api/client-feedback`
**Purpose**: Submit feedback/issue for specific task
**Body**:
```json
{
  "clientId": "uuid",
  "taskId": "uuid",
  "feedbackText": "string"
}
```

#### `PATCH /api/client-feedback/[feedbackId]`
**Purpose**: Staff approves/rejects client feedback
**Body**:
```json
{
  "status": "approved|rejected",
  "reviewedBy": "uuid"
}
```

### 3. Client Dashboard Page Components

#### Route: `/client-dashboard`
**Protected**: Yes (client role only)

**Tab Structure**:
1. **Overview** (default)
   - Current sprint card with progress ring
   - Sprint summary stats
   - Quick actions: Copy Weekly Update, Share view
   - Next sprint peek

2. **Sprints** (tabbed)
   - Sprint selector dropdown
   - Sprint board view (kanban-like) showing task columns:
     - Waiting For Client (approval needed)
     - In Progress
     - In Review (awaiting client approval)
     - Done
   - Click task to see details (read-only)

3. **Weekly Reports**
   - List of submitted reports grouped by sprint
   - Form to submit new report:
     - Sprint selector
     - Week number selector (auto-calculated)
     - Rich text editor for report text
     - File upload (multiple)
   - Show submission status (draft, submitted, reviewed)

4. **Meetings**
   - Timeline of meetings with client
   - Meeting summary and attendees
   - Action items from meetings
   - Click to view full meeting notes

5. **Pending Approvals** (tab)
   - Tasks waiting for client approval/feedback
   - Show reason: "In Review", "Awaiting Client Feedback", "Revision Requested"
   - Quick feedback form:
     - Submit approval or rejection
     - Add comment/feedback
   - Status badge: "Ready to Approve", "Needs Changes", "Approved"

6. **Documents**
   - All deliverables (task files from done tasks)
   - Filterable by type (PDF, Video, Image, etc.)
   - Download link

---

## Implementation Steps

### Phase 1: Database Setup (No Script Required — Manual SQL)
1. Create `weekly_reports` table
2. Create `weekly_report_files` table
3. Create `client_feedback` table
4. Verify RLS is disabled for now (or set up proper policies)

### Phase 2: New API Endpoints
1. Create `/api/client-dashboard` GET endpoint
2. Create `/api/weekly-reports` GET/POST endpoints
3. Create `/api/client-feedback` GET/POST endpoints
4. Create `/api/client-feedback/[id]` PATCH endpoint

### Phase 3: Client Dashboard Page
1. Create `/app/client-dashboard/page.tsx`
2. Build tab-based layout component
3. Implement Overview tab
4. Implement Sprints tab with task details
5. Implement Weekly Reports tab with form
6. Implement Meetings tab
7. Implement Pending Approvals tab
8. Implement Documents tab

### Phase 4: Components & UI Modules
1. Create `components/client-dashboard-header.tsx`
2. Create `components/sprint-card.tsx`
3. Create `components/weekly-report-form.tsx`
4. Create `components/pending-approval-card.tsx`
5. Create `components/meeting-timeline.tsx`

### Phase 5: Auth & Permissions
1. Ensure `/api/auth/login` redirects clients to `/client-dashboard` (not `/client-portal`)
2. Add `AuthGuard` check on client-dashboard page
3. Create RLS policies if needed (read-only for clients on their own data)

---

## Data Access Control (No Backend Changes)

### Client Permissions
- **Read**: Their own sprints, tasks, meetings, deliverables, social content counts
- **Write**: Weekly reports, feedback/comments on tasks
- **Cannot**: Modify tasks, reassign, change sprint assignments, access other clients' data

### Implementation via Filtering
- All API endpoints filter by `clientId` extracted from user's linked client
- User role check: if `role === "client"`, use `/client-dashboard` path and filter APIs
- Pass `clientId` from user record to all queries

---

## Key Data Relationships

```
users (role='client') 
  ↓
clients (user_id)
  ↓
sprints (client_id)
  ├→ tasks (sprint_id, client_id)
  │  ├→ task_files (task_id)
  │  ├→ task_assignees (task_id)
  │  └→ client_feedback (task_id)
  ├→ meetings (client_id)
  │  └→ meeting_attendees (meeting_id)
  ├→ content_records (client_id) — social media
  ├→ weekly_reports (sprint_id, client_id)
  │  └→ weekly_report_files (report_id)
  └→ activity_log — audit trail
```

---

## Flow Diagrams

### Login & Redirect Flow
```
Client Email+Password
  ↓
/api/auth/login (Supabase Auth)
  ↓
Check user.role === 'client' ?
  ├→ Yes: Redirect to /client-dashboard
  └→ No: Redirect to / (staff dashboard)
```

### Weekly Report Submission
```
Client fills form (sprint, week, text, files)
  ↓
POST /api/weekly-reports
  ↓
Insert into weekly_reports table
  ↓
Create weekly_report_files entries
  ↓
Return success with report ID
  ↓
UI shows "Report Submitted" badge
```

### Feedback & Approval Flow
```
Client sees "In Review" task
  ↓
Clicks to view, adds feedback/comment
  ↓
POST /api/client-feedback (status='pending')
  ↓
Staff sees in admin "Awaiting Client Feedback"
  ↓
Staff reviews and clicks "Mark Approved" / "Request Changes"
  ↓
PATCH /api/client-feedback (status='approved'/'rejected')
  ↓
Client dashboard updates to show status
```

---

## Summary of Changes Required

| Component | Type | Status | Notes |
|-----------|------|--------|-------|
| `weekly_reports` table | DB | New | Stores client-submitted weekly reports |
| `weekly_report_files` table | DB | New | Stores files attached to reports |
| `client_feedback` table | DB | New | Tracks feedback/approval requests |
| `/api/client-dashboard` | API | New | Main endpoint for client dashboard data |
| `/api/weekly-reports` | API | New | Submit and retrieve weekly reports |
| `/api/client-feedback` | API | New | Submit and manage client feedback |
| `/app/client-dashboard` | Page | New | Client-facing dashboard with tabs |
| Auth redirect | Logic | Minor | Update login redirect for client role |
| Existing APIs | No Change | Safe | Can reuse existing endpoints as-is |

---

## Notes
- **No Breaking Changes**: Existing staff dashboard, task creation, meetings, etc. remain untouched
- **Reuse Existing Data**: Leverage existing tables; only add new ones for client-specific features (reports, feedback)
- **Future RLS**: Once staff is comfortable, can add Row-Level Security policies in Supabase for production security
- **File Uploads**: Use existing Blob storage pattern already used for task files
- **Audit Trail**: All client actions can be logged to `activity_log` for transparency
