# DMG Object Storage Setup Guide

## Overview

As of November 2025, Kull uses Replit Object Storage for DMG distribution instead of git-based deployments. This provides:
- Faster releases (no git push, no Replit redeploy needed)
- Cleaner git history (no version bumps in download.ts)
- More reliable uploads (direct to object storage)

## How It Works

1. **release.sh** builds the DMG and uploads it to `https://kullai.com/api/download/upload`
2. **Server** stores the DMG in Replit Object Storage (bucket: `replit-objstore-e81d00f9-23cb-4cee-bed9-b804b7721355`)
3. **Download page** dynamically reads from object storage and shows the latest version
4. **Old DMGs** are automatically cleaned up (keeps latest 2 versions)

## One-Time Setup (Required)

### Step 1: Deploy New Code to Replit

The new `server/routes/download.ts` must be deployed to Replit before the upload API will work.

**Option A: Manual sync in Replit**
1. Go to https://replit.com/@lander/Kull
2. Open the Git pane (Version Control)
3. Click "Pull" to sync with GitHub
4. Click "Deploy" to deploy the changes

**Option B: Use the Replit deploy script**
```bash
./scripts/replit-deploy-kull.sh deploy
```

### Step 2: Set DEPLOY_SECRET on Replit

1. Go to https://replit.com/@lander/Kull
2. Click on "Secrets" in the Tools panel
3. Add a new secret:
   - Key: `DEPLOY_SECRET`
   - Value: Generate a secure random string (32+ characters)

Example: `openssl rand -hex 32`

### Step 3: Set DEPLOY_SECRET Locally

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export DEPLOY_SECRET="your-secret-from-step-2"
```

Then reload: `source ~/.zshrc`

### Step 4: Verify Setup

Run the test script:
```bash
DEPLOY_SECRET="your-secret" ./scripts/test-dmg-upload.sh
```

Expected output:
- `/api/download/list` returns `{ "dmgs": [...] }`
- `/api/download/latest` returns version info

## API Endpoints

### GET /api/download/latest
Returns the latest version info for macOS and iOS.

### GET /api/download/list
Returns all DMGs in object storage with parsed metadata.

### GET /api/download/dmg/:filename
Downloads a specific DMG file.

### POST /api/download/upload
Uploads a new DMG (requires `secret` field matching DEPLOY_SECRET).

**Request:**
```bash
curl -X POST "https://kullai.com/api/download/upload" \
  -F "dmg=@Kull-2025.11.28.1234.dmg" \
  -F "secret=$DEPLOY_SECRET"
```

**Response:**
```json
{
  "success": true,
  "message": "DMG uploaded successfully",
  "version": "2025.11.28",
  "buildNumber": "1234",
  "filename": "Kull-2025.11.28.1234.dmg"
}
```

## Filename Format

DMG files MUST follow this naming convention:
```
Kull-YYYY.MM.DD.BBBB.dmg
```

Examples:
- `Kull-2025.11.28.1234.dmg` → Version: 2025.11.28, Build: 1234
- `Kull-2025.12.01.0930.dmg` → Version: 2025.12.01, Build: 0930

The server parses version and build number from the filename automatically.

## Troubleshooting

### "Server not configured for remote deployments"
- DEPLOY_SECRET is not set on Replit
- Solution: Add DEPLOY_SECRET to Replit Secrets

### "Unauthorized"
- DEPLOY_SECRET doesn't match
- Solution: Verify the secret matches between local and Replit

### "Invalid filename format"
- DMG filename doesn't match `Kull-YYYY.MM.DD.BBBB.dmg`
- Solution: Ensure release.sh is generating correct filenames

### Upload succeeds but /api/download/list is empty
- Object storage might not be initialized
- Solution: Check Replit logs for storage errors

## Legacy Scripts (Kept for Reference)

- `scripts/replit-deploy-kull.sh` - Manual Replit deployment (still works)
- `scripts/release.sh.backup-*` - Old release script versions

## Object Storage Bucket

- Bucket ID: `replit-objstore-e81d00f9-23cb-4cee-bed9-b804b7721355`
- Package: `@replit/object-storage` (v1.1.2)
- Storage is managed automatically by Replit
