---
"@cobaltcore-dev/aurora": minor
---

Ceph object storage: add a CLI Setup Guide

- New "CLI Setup Guide" modal with step-by-step, copyable configuration for AWS CLI, s3cmd and rclone, pre-filled with the project's S3 endpoint and region (credentials stay placeholders)
- Opens from the bucket list's More Actions menu, from a bucket's actions menu (commands pre-filled with the bucket name) and from the "Setup Required" screen; its "Manage Credentials" button switches to the credentials modal
- The bucket actions menu is now always shown, since "CLI Setup" needs no permissions
- Analytics events `cliSetup.open`, `cliSetup.close` and `cliSetup.selectTool` (`metadata.tool`)
