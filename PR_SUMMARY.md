# Improve Image Modal UX

## Summary

Improves user experience across image modals with clearer placeholders, better bulk action feedback, and a larger metadata editor.

## Changes

### Create Image Modal

- Add "e.g." prefix to placeholders for Image Name and Tags fields
- Update Tags helptext to "Press Enter or click Add to add a tag"

### Bulk Action Modals (Delete/Deactivate/Activate)

- Add image count to modal titles (e.g., "Delete 3 Images")
- Show image names instead of UUIDs in action lists
- Move exception sections (protected/already-active/already-deactivated) above main action list for better visibility
- Remove input-styled boxes from exception sections for cleaner presentation
- Use consistent Plural component for all section headings with counts

### Edit Image Metadata Modal

- Restore `large` modal size (was changed to `xl`)
- Keep CSS-based text truncation for long metadata keys/values

## Test Plan

- [x] Create Image modal shows "e.g." placeholders
- [x] Bulk action modals display image names and counts correctly
- [x] Exception sections appear above action lists
- [x] Metadata editor uses large modal size with proper truncation
