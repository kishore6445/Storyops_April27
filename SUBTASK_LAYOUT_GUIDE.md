# Subtask Display Layout Guide

## Component Structure Overview

```
TaskWorkspaceOverview
├── TaskSubtasks (Collapsible Container)
│   ├── Collapsible Header
│   │   ├── Chevron Icon (rotates on toggle)
│   │   ├── "Subtasks" Label
│   │   └── Count Badge (e.g., "3/5")
│   │
│   ├── Progress Bar (always visible, even when collapsed)
│   │
│   ├── [When Expanded] Subtask List
│   │   ├── Subtask Item 1
│   │   ├── Subtask Item 2
│   │   └── Subtask Item 3
│   │
│   └── Add Subtask Form (toggleable)
│       ├── Title Input
│       ├── Due Date Selector
│       ├── Assignee Dropdown
│       └── Create Button
│
└── [Other Sections]
    ├── Description
    ├── Recent Activity
    └── Checklist
```

## Subtask Item Layout (When Shown in Parent Task)

```
┌─────────────────────────────────────────────────────┐
│ ┃ [L-Border] Left Status Indicator (2px)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Checkbox] [S] Title        [Status Badge]  [Delete]│
│  
│  Subtask ID: SUB-001                                │
│  [Status Badge] Priority                            │
│  Assignee Badge | Due Date | [Other Metadata]      │
│                                                     │
└─────────────────────────────────────────────────────┘

Color Scheme for Left Border:
- Done:        Green (#10b981)
- In Progress: Blue (#3b82f6)
- In Review:   Amber (#f59e0b)
- Pending:     Gray (#d1d5db)
```

## Independent Subtask Card (When Assigned to User Only)

**Used in**: Kanban views, personal task lists, "My Subtasks" sections

```
┌──────────────────────────────────────────────────────┐
│ ┃ ┃ [3px Blue Left Border - Thick]                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [ID Badge] [Status Badge]           [Status Button]│
│  Subtask Title (Bold)                               │
│                                                      │
│  [●] Assigned to You | Due: May 5 | HIGH Priority   │
│                                                      │
│  ┌─────────────────────────────────────────┐        │
│  │ Primary Task: Main Task Title      [→]  │ ← Link │
│  └─────────────────────────────────────────┘        │
│                                                      │
│  [Optional] Overdue Warning (if applicable)         │
│                                                      │
└──────────────────────────────────────────────────────┘

Border Styling:
- Left Border: 3px solid #3b82f6 (Blue)
- Bottom Border: 1px solid #e5e7eb (Light Gray)
- Border Radius: 0.5rem (8px)
- Background: #f0f4f8 (Light Blue)
- Hover: Shadow lift effect
```

## Visual Distinction Table

| Feature | Parent Subtask List | Independent Subtask |
|---------|-------------------|-------------------|
| Left Border Width | 2px | 3px |
| Left Border Color | Status-based | Blue (#3b82f6) |
| Badge | [S] Subtask ID | [ID] + Status |
| Assignee Display | Full list view | "Assigned to You" |
| Context | Part of main task | Standalone card |
| Main Task Link | N/A | Yes (clickable) |
| Use Case | Task owners view | Team member view |
| Background | Status-based color | Light Blue |

## Responsive Behavior

### Desktop (>768px)
- Full width subtask cards
- 2-column layout possible for independent subtasks
- Hover effects: Shadow, color transitions
- Full metadata display

### Tablet (640px - 768px)
- Single column layout
- Condensed metadata (abbreviated dates)
- Touch-friendly tap targets
- Maintained hover effects

### Mobile (<640px)
- Full width cards, no padding
- Stacked metadata
- Simplified status buttons
- Large tap targets (min 44x44px)

## State Indicators

### Subtask Status Badge Styles

```
DONE:
  Background: #dcfce7 (Light Green)
  Text: #166534 (Dark Green)
  Font: Bold Uppercase
  
IN_PROGRESS:
  Background: #dbeafe (Light Blue)
  Text: #1e40af (Dark Blue)
  Font: Bold Uppercase
  Indicator: Dot animation
  
IN_REVIEW:
  Background: #fef3c7 (Light Amber)
  Text: #92400e (Dark Amber)
  Font: Bold Uppercase
  Indicator: Warning icon
  
PENDING:
  Background: #f3f4f6 (Light Gray)
  Text: #374151 (Dark Gray)
  Font: Bold Uppercase
  Indicator: None
```

### Priority Indicators

```
HIGH:
  Color: #dc2626 (Red)
  Text: "HIGH"
  Icon: Triangle or Exclamation
  
MEDIUM:
  Color: #f59e0b (Amber)
  Text: "MEDIUM"
  Icon: Dash or Equal
  
LOW:
  Color: #16a34a (Green)
  Text: "LOW"
  Icon: Check or Down arrow
```

## Spacing & Typography

### Typography
- Section Title (Subtasks): 14px, Bold, Gray-900
- Subtask Title: 14px, Semibold, Gray-900 (strikethrough if done)
- Subtask ID: 11px, Monospace, Gray-500
- Status Badge: 10px, Bold, Uppercase
- Metadata: 12px, Regular, Gray-600
- Helper Text: 11px, Regular, Gray-500

### Spacing
- Container padding: 16px (1rem)
- Item margin bottom: 8px (0.5rem)
- Section margin top: 24px (1.5rem)
- Between metadata items: 12px (0.75rem)
- Badge padding: 2px 8px (0.125rem 0.5rem)

## Interactive Elements

### Expand/Collapse Button
- Icon: ChevronDown (rotates -90° when collapsed)
- Size: 16px
- Color: Gray-500 (hover: Gray-700)
- Hover effect: Color transition

### Status Toggle Button
- Size: 24px (w-6 h-6)
- Shape: Circle with border
- Default: Border only (transparent fill)
- In Progress: Blue fill with dot
- Done: Green fill with checkmark
- Hover: Scale 110%, shadow
- Click action: Cycle status (pending → in_progress → done)

### Delete Button
- Icon: Trash2
- Size: 16px
- Default: Opacity 0 (hidden)
- On Hover: Opacity 100, color red-600
- Position: Top-right of card

### Add Subtask Button
- Icon: Plus
- Size: 16px
- Text: "Add"
- Color: Blue-600
- Hover: Blue-50 background
- Padding: 6px 12px (0.375rem 0.75rem)

## Collapsed State Behavior

When subtasks section is collapsed:
- ✅ Count badge visible: "Subtasks (3/5)"
- ✅ Progress bar visible: Shows completion percentage
- ✅ Warning banner visible (if incomplete and in review)
- ✅ "Add" button visible (quick access)
- ✅ Full subtask list hidden
- ✅ Chevron icon points right (→)

When expanded:
- ✅ Full subtask list displayed
- ✅ All metadata visible
- ✅ Delete buttons appear on hover
- ✅ Chevron icon points down (↓)
- ✅ Can toggle individual subtask status
- ✅ Can add new subtasks

## Accessibility Considerations

- All interactive elements have `title` attributes
- Status changes announced via `aria-live` regions (future enhancement)
- Color not sole indicator (text labels always present)
- Keyboard navigation: Tab, Enter, Space
- Focus indicators: Ring-2 blue-500 outline
- Icons accompanied by text labels
- Screen reader: Status badges announced with full text

## Color Tokens (Tailwind)

- Background: gray-50 to gray-100
- Text Primary: gray-900
- Text Secondary: gray-600
- Text Tertiary: gray-500
- Borders: gray-200 to gray-300
- Status Done: green-500 / green-100
- Status In Progress: blue-500 / blue-100
- Status In Review: amber-500 / amber-100
- Status Pending: gray-400 / gray-100
- Accent: blue-600 (for independent subtasks)
