---
"@cobaltcore-dev/aurora": patch
---

fix(aurora): improve download toast notifications in Ceph storage

**Issue 1 - Toast doesn't disappear when download completes:**
Download toast messages now automatically dismiss when the download finishes (success, error, or cancellation), instead of persisting indefinitely.

**Issue 2 - Multiple identical "Downloading..." messages:**
Download toast messages now include the filename being downloaded (e.g., "Downloading report.pdf") instead of generic "Downloading..." text, making it easy to distinguish multiple simultaneous downloads.

**Technical changes:**
- Modified `getObjectDownloadStartedToast()` to accept filename parameter
- Track toast ID in `runTransfer()` and dismiss it in the finally block
- Updated tests to verify filename is included in toast message
