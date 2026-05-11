# Subtask Display Redesign - Quick Reference Guide

## What Changed?

### 3 Simple Changes:
1. **Subtasks collapse by default** (not expanded automatically)
2. **Privacy enforced** (users only see their assigned subtasks)
3. **New visual component** (independent subtask cards with blue border)

---

## For Users

### Team Members
- ✅ See only YOUR subtasks (privacy protected)
- ✅ Click "Subtasks" to expand and view details
- ✅ Progress bar shows completion status
- ✅ Blue left border indicates "Assigned to You"

### Task Owners
- ✅ Click "Subtasks" to see all assigned subtasks
- ✅ Full control over lifecycle (add, update, delete)
- ✅ Progress tracking and completion warnings
- ✅ Can assign subtasks to team members

### Admins
- ✅ See all subtasks across all tasks
- ✅ Full audit and control capabilities
- ✅ Can manage any subtask in the system

---

## How to Use

### View Subtasks
1. Open task detail page
2. Look for "▼ Subtasks (X/Y)" section (collapsed by default)
3. Click to expand and see details
4. Click again to collapse

### Add Subtask
1. Open task detail page
2. Click "Add" button in subtasks section
3. Enter title, due date, assignee
4. Click "Create Subtask"

### Update Subtask
1. Expand subtasks section
2. Click on subtask or checkbox
3. Cycle through status: Pending → In Progress → Done
4. Delete by clicking trash icon on hover

---

## Visual Indicators

### Status Badges (Color Coded)
- 🟢 **DONE**: Green background, checkmark
- 🔵 **IN PROGRESS**: Blue background, dot indicator
- 🟡 **IN REVIEW**: Amber background, warning icon
- ⚪ **PENDING**: Gray background, empty circle

### Left Border Indicates
- 2px colored border: Status of subtask
- 3px blue border: This subtask assigned to YOU

### Metadata Shown
- **Due Date**: Red if overdue and not done
- **Assignee**: Avatar circle with initial
- **Priority**: HIGH (red), MEDIUM (amber), LOW (green)

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Expand/Collapse | Click on header |
| Advanced Status | Click checkbox |
| Add Subtask | Click "Add" button |
| Delete Subtask | Click trash icon + confirm |
| Close Add Form | Esc key |

---

## Privacy & Security

### What You'll See
- ✅ Only subtasks assigned to YOU
- ✅ Full details for YOUR subtasks
- ✅ Completion status of team's work (counts only)

### What You WON'T See
- ❌ Other team members' assigned subtasks
- ❌ Confidential task assignments
- ❌ Private team member workload details

### Exception: Admins
- ✅ Admins see ALL subtasks
- ✅ Admins can manage everything
- ✅ Admin actions are logged

---

## Common Scenarios

### Scenario 1: "I don't see my subtasks"
**Solution**: 
1. Check that subtasks section is expanded (click header)
2. Verify you're assigned to the subtask
3. Contact admin if still missing

### Scenario 2: "I can't see my colleague's work"
**Expected**: This is correct! Privacy is enforced.
**Solution**: 
1. Ask colleague directly for status
2. Contact task owner for overview
3. Admin can see all subtasks if needed

### Scenario 3: "Progress bar seems wrong"
**Solution**:
1. Expand subtasks section
2. Count DONE items manually
3. Progress = (Done / Total) × 100%
4. Example: 2 of 4 done = 50%

### Scenario 4: "Can't add subtask"
**Solution**:
1. Verify you have permission (owner/admin)
2. Try clicking "Add" button again
3. Check browser console for errors
4. Contact admin if issue persists

---

## Troubleshooting

### Subtasks Won't Expand
- Refresh page
- Clear browser cache
- Try different browser
- Contact support

### Progress Bar Not Updating
- Refresh page
- Mark subtask as done (status toggle)
- Verify backend processed the change

### Seeing Other's Subtasks (Privacy Issue)
- Log out and back in
- Clear browser cache and cookies
- Contact admin if issue persists

### Can't Delete Subtask
- Try right-clicking for context menu
- Ensure mouse hovers to show delete button
- Verify you have permission
- Contact admin if needed

---

## Settings & Preferences

### Collapse Preference
- **Current**: Collapsed by default
- **Change**: Expand section, stays expanded for your session
- **On reload**: Returns to default (collapsed)

### No user settings currently available
- Customize in future release
- Feature requests welcome!

---

## Performance & Loading

### Expected Load Times
- Task detail page: < 2 seconds
- Expand subtasks: < 500ms
- Update status: < 1 second
- Add subtask: < 2 seconds

### If Slow
1. Check internet connection
2. Refresh page
3. Try incognito/private browser
4. Contact admin

---

## Mobile & Tablet

### Mobile View (< 640px)
- Full width subtask cards
- Touch-friendly buttons (44x44px min)
- Stacked metadata (no side-by-side)
- Works without horizontal scroll

### Tablet View (640px - 768px)
- Optimized spacing
- Full functionality maintained
- Readable text and buttons
- Proper proportions

### Desktop View (> 768px)
- Full featured layout
- Hover effects and tooltips
- Sidebar metadata display
- Keyboard shortcuts available

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move to next button/element |
| `Shift+Tab` | Move to previous element |
| `Enter` | Activate button/link |
| `Space` | Toggle checkbox or button |
| `Esc` | Close form/dialog |
| `↓` | Next item in list |
| `↑` | Previous item in list |

---

## Accessibility

### Screen Reader Support
- All elements have labels
- Status changes announced
- Form fields clearly marked
- Error messages spoken

### Color Blind Friendly
- Colors are not the only indicator
- Text labels always present
- Icons combined with text

### Keyboard Only
- All functions keyboard accessible
- No mouse required
- Logical tab order
- Clear focus indicators

---

## Tips & Tricks

### Pro Tips
1. **Click count badge**: Shows progress breakdown
2. **Hover for delete**: Trash icon appears on hover
3. **Click status**: Cycles through states quickly
4. **Date format**: Always shows as "Mon DD"
5. **Due date colors**: Red = overdue, Black = on time

### Power User Tips
1. Assign early to prevent blocking
2. Set realistic due dates
3. Update status regularly
4. Complete before task review
5. Check progress bar daily

---

## Getting Help

### Need Support?
1. Check this guide first
2. Contact your team lead
3. Ask project manager
4. Email support team
5. Check Slack channel

### Reporting Issues
- Include screenshot
- Describe steps to reproduce
- Note browser and device
- List affected tasks
- Include error message if any

---

## FAQ

**Q: Why are subtasks collapsed by default?**  
A: Cleaner interface, saves screen space, and prevents information overload.

**Q: Why can't I see other team member's subtasks?**  
A: Privacy protection. Only assigned subtasks are visible to team members.

**Q: Can I change the default collapsed state?**  
A: Currently no, but this may be added in future updates.

**Q: What if I need to see all subtasks?**  
A: If you're admin, expand any section. Otherwise, contact task owner.

**Q: Does this affect task blocking?**  
A: No. Blocking logic unchanged - incomplete subtasks still block "In Review" status.

**Q: Can I undo a subtask deletion?**  
A: No. Confirm the dialog carefully before deleting.

**Q: Why is my subtask marked overdue?**  
A: Due date has passed and status is not "DONE". Contact assignee if needed.

**Q: Can I change the 3px blue border color?**  
A: No, but it's intentional for consistency. Can be customized by admin later.

**Q: Does this work on mobile?**  
A: Yes! Full functionality on all devices and screen sizes.

**Q: How do I export subtask data?**  
A: Use browser's export features or contact admin for bulk export.

---

## Version Information

- **Version**: 1.0
- **Release Date**: May 2026
- **Last Updated**: May 1, 2026
- **Status**: Production Ready

---

## More Information

See documentation files for detailed information:
- `SUBTASK_DISPLAY_REDESIGN_COMPLETE.md` - Full implementation guide
- `SUBTASK_LAYOUT_GUIDE.md` - Visual design specifications
- `SUBTASK_TESTING_CHECKLIST.md` - Test procedures
- `SUBTASK_BEFORE_AFTER_COMPARISON.md` - Visual before/after

---

**Questions?** Check the FAQ section above or contact your team admin.
