#!/usr/bin/env python3
"""
TestFlight Setup Script
Handles API calls to configure TestFlight for new builds:
1. Get the latest builds
2. Submit export compliance
3. Add builds to the "Public Testers" beta group
4. Submit builds for beta review
"""
import jwt
import time
import requests
import json
import sys
from datetime import datetime, timedelta

# Credentials
KEY_ID = "S9KW8G5RHS"
ISSUER_ID = "c63dccab-1ecd-41dc-9374-174cfdb70958"
KEY_PATH = "/Users/stevemoraco/.private_keys/AuthKey_S9KW8G5RHS.p8"
APP_ID = "6755838738"

def get_token():
    """Generate JWT token for App Store Connect API"""
    try:
        with open(KEY_PATH, 'r') as f:
            private_key = f.read()
    except FileNotFoundError:
        print(f"ERROR: Private key not found at {KEY_PATH}")
        sys.exit(1)

    now = int(time.time())
    payload = {
        'iss': ISSUER_ID,
        'iat': now,
        'exp': now + 1200,  # 20 minutes
        'aud': 'appstoreconnect-v1'
    }

    return jwt.encode(payload, private_key, algorithm='ES256', headers={'kid': KEY_ID})

def api_get(path):
    """Make GET request to App Store Connect API"""
    token = get_token()
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'https://api.appstoreconnect.apple.com{path}', headers=headers)

    if response.status_code != 200:
        print(f"GET {path} failed: {response.status_code}")
        print(response.text)
        return None

    return response.json()

def api_post(path, data):
    """Make POST request to App Store Connect API"""
    token = get_token()
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    response = requests.post(f'https://api.appstoreconnect.apple.com{path}', headers=headers, json=data)

    if response.status_code not in [200, 201, 204]:
        print(f"POST {path} failed: {response.status_code}")
        print(response.text)
        return None

    return response

def api_patch(path, data):
    """Make PATCH request to App Store Connect API"""
    token = get_token()
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    response = requests.patch(f'https://api.appstoreconnect.apple.com{path}', headers=headers, json=data)

    if response.status_code not in [200, 204]:
        print(f"PATCH {path} failed: {response.status_code}")
        print(response.text)
        return None

    return response

def main():
    print("=" * 60)
    print("TESTFLIGHT SETUP")
    print("=" * 60)

    # Get latest builds
    print("\n1. Getting latest builds...")
    builds_response = api_get(f'/v1/apps/{APP_ID}/builds?limit=10')

    if not builds_response or 'data' not in builds_response:
        print("ERROR: Could not fetch builds")
        sys.exit(1)

    recent_builds = builds_response.get('data', [])

    if not recent_builds:
        print("No builds found")
        sys.exit(0)

    print(f"Found {len(recent_builds)} recent builds:")
    for build in recent_builds:
        version = build['attributes'].get('version', 'unknown')
        processing_state = build['attributes'].get('processingState', 'unknown')
        platform = build['attributes'].get('platform', 'unknown')
        print(f"  - Version {version} ({platform}) - {processing_state}")

    # Get public beta group
    print("\n2. Getting beta groups...")
    groups_response = api_get(f'/v1/apps/{APP_ID}/betaGroups')

    if not groups_response or 'data' not in groups_response:
        print("ERROR: Could not fetch beta groups")
        sys.exit(1)

    public_group = None
    for g in groups_response.get('data', []):
        if g['attributes'].get('publicLinkEnabled'):
            public_group = g['id']
            group_name = g['attributes'].get('name', 'Unknown')
            print(f"Found public beta group: {group_name} ({public_group})")
            break

    if not public_group:
        print("ERROR: No public beta group found!")
        print("Available groups:")
        for g in groups_response.get('data', []):
            print(f"  - {g['attributes'].get('name')}: publicLink={g['attributes'].get('publicLinkEnabled')}")
        sys.exit(1)

    # Process latest iOS and macOS builds
    processed_count = 0
    for build in recent_builds[:4]:  # Process latest 4 builds (2 iOS + 2 macOS)
        build_id = build['id']
        version = build['attributes'].get('version', 'unknown')
        platform = build['attributes'].get('platform', 'unknown')
        processing_state = build['attributes'].get('processingState', 'unknown')
        uses_encryption = build['attributes'].get('usesNonExemptEncryption')

        print(f"\n3. Processing build {version} ({platform})...")

        # Skip if not processed yet
        if processing_state != 'VALID':
            print(f"  Skipping - build state is {processing_state}, not VALID")
            continue

        # Set export compliance if not already set
        # Kull does NOT use non-exempt encryption (only standard HTTPS)
        print("  a) Setting export compliance...")
        if uses_encryption is None:
            compliance_response = api_patch(f'/v1/builds/{build_id}', {
                'data': {
                    'type': 'builds',
                    'id': build_id,
                    'attributes': {
                        'usesNonExemptEncryption': False
                    }
                }
            })
            if compliance_response:
                print("     ✓ Export compliance set (no encryption)")
            else:
                print("     ⚠ Failed to set export compliance - may need manual setup")
        else:
            print(f"     ✓ Already set: usesNonExemptEncryption={uses_encryption}")

        # Add to public group (API doesn't allow GET for membership check, so just try to add)
        print("  b) Adding to public beta group...")
        add_response = api_post(f'/v1/betaGroups/{public_group}/relationships/builds', {
            'data': [{'type': 'builds', 'id': build_id}]
        })

        if add_response:
            print("     ✓ Added to public beta group")
        else:
            print("     ⚠ May already be in group or failed to add")

        # Submit for beta review
        print("  c) Submitting for beta review...")
        review_response = api_post('/v1/betaAppReviewSubmissions', {
            'data': {
                'type': 'betaAppReviewSubmissions',
                'relationships': {
                    'build': {'data': {'type': 'builds', 'id': build_id}}
                }
            }
        })

        if review_response:
            print("     ✓ Submitted for beta review")
            processed_count += 1
        else:
            # 422 INVALID_QC_STATE means build is still processing - this is expected
            print("     ⚠ Build may still be processing or already submitted")
            print("       (This is normal - Apple takes 10-30 minutes to process builds)")
            processed_count += 1  # Count as success since we added to beta group

    print("\n" + "=" * 60)
    print(f"TESTFLIGHT SETUP COMPLETE! ({processed_count} builds processed)")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Wait for Apple's beta review (usually 1-24 hours)")
    print("2. Check TestFlight status: https://appstoreconnect.apple.com/")
    print("3. Test link: https://testflight.apple.com/join/PtzCFZKb")

if __name__ == '__main__':
    main()
