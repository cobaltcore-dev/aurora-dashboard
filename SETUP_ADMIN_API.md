# Setup Ceph Admin API - Quick Guide

## Current Status

✅ Code is ready - Usage & Quota feature implemented  
⏸️ Waiting for Admin API credentials

## What You Need

Add these 2 lines to your `.env` file:

```bash
CEPH_ADMIN_ACCESS_KEY="your-admin-access-key-here"
CEPH_ADMIN_SECRET_KEY="your-admin-secret-key-here"
```

**Location:** `/apps/aurora-portal/.env`

## Where to Get Credentials

### Option 1: Ask DevOps/Infrastructure Team

Send them this request:

```
Hi! I need Ceph Admin API credentials for the Aurora Portal.

Environment: qa-de-1
Ceph Endpoint: https://rgw.st1.qa-de-1.cloud.sap

Required:
- Admin Access Key
- Admin Secret Key

Capabilities needed (read-only):
- users=read
- usage=read
- buckets=read

This is for displaying storage usage statistics in the UI.
```

### Option 2: If You Have Ceph Access

If you can SSH into the Ceph cluster:

```bash
# Create admin user
radosgw-admin user create \
  --uid=aurora-admin \
  --display-name="Aurora Portal Admin" \
  --access-key=YOUR_ACCESS_KEY \
  --secret-key=YOUR_SECRET_KEY

# Grant read-only capabilities
radosgw-admin caps add \
  --uid=aurora-admin \
  --caps="users=read;usage=read;buckets=read"
```

## After Adding Credentials

1. **Restart dev server:**
   ```bash
   pnpm dev
   ```

2. **Test in browser:**
   - Go to: `/projects/{your-project}/storage/ceph/containers`
   - You should see **Usage Overview** section with:
     - ✅ Buckets count
     - ✅ Objects count
     - ✅ Storage used
     - ✅ Quota (if configured)

## Troubleshooting

### Still seeing "Usage statistics are not available"?

Check:
1. ✅ Added credentials to `.env`
2. ✅ Restarted `pnpm dev`
3. ✅ No typos in variable names (`CEPH_ADMIN_ACCESS_KEY` and `CEPH_ADMIN_SECRET_KEY`)

### Error: "403 Forbidden"

Admin user needs proper capabilities:
```bash
radosgw-admin caps add --uid=aurora-admin --caps="users=read;usage=read;buckets=read"
```

### Error: "404 Not Found"

Project ID not found in Ceph. This means:
- User/project doesn't have any Ceph buckets yet
- OR project ID doesn't match Ceph uid

## What's Implemented

```
┌─────────────────────────────────────────┐
│         Usage Overview                  │
│                                         │
│  Buckets:       5                      │
│  Objects:       1,234                  │
│  Storage Used:  2.5 GB                 │
│  Quota:         100 GB (if configured) │
└─────────────────────────────────────────┘
```

## Architecture

```
Frontend (CephUsageOverview)
    ↓
tRPC (storage.ceph.usage.getUserUsage)
    ↓
usageRouter.ts
    ↓
cephAdminClient.ts (AWS Signature V2)
    ↓
Ceph Admin API
    ↓
GET /admin/user?uid={project-id}&stats=true
```

## Security Notes

✅ Read-only capabilities - cannot modify data  
✅ Separate credentials from user S3 keys  
✅ HTTPS encrypted communication  
⚠️ Keep credentials secret - don't commit to git

## Need Help?

Contact me or check:
- `CEPH_ADMIN_API_SETUP.md` - Detailed setup guide
- `USAGE_ALTERNATIVES_ANALYSIS.md` - Alternative approaches
