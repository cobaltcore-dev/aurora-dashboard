---
"@cobaltcore-dev/aurora": patch
---

Swift object storage — second go-live gate UX fixes (input validation, modal polish, action menus):

- **Input validation**: Add `helptext` constraints, `onBlur` validation, and disabled confirm-button while errors are active to `CreateContainerModal`, `CreateFolderModal`, `EditContainerMetadataModal` (quota fields), `MoveRenameObjectModal`, and `GenerateTempUrlModal` (custom duration field).
- **Copy / Move modals**: Increase modal size, improve description and spacing, show files alongside folders in the destination browser, clarify folder browser label.
- **Container header**: Add *Configure Versioning* and *Configure Static Website* actions to the container header action menu, extracted into dedicated modals.
- **Container metadata modal**: Improve layout, add copy button for the public URL, replace inline error paragraphs with a `Status` progress indicator.
- **Object modals**: Add object summary description lists to `DeleteObjectModal`, `ScheduleObjectDeletionModal`, and `GenerateTempUrlModal`; move deletion scheduling to a dedicated modal; replace read-only `TextInput`s with `DescriptionList`.
- **Action menus**: Single divider before *Delete Object* in the object row menu; divider before *Delete Container* in container action menus.
- **Error routing**: Route submit errors from Swift modals to the toast system; keep load errors inline.
- **Spacing**: Consistent bottom spacing across all Swift modals.
