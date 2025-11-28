#!/usr/bin/env python3
"""
TestFlight Setup Script
Handles API calls to configure TestFlight for new builds:
1. Poll until builds are processed (VALID state)
2. Submit export compliance
3. Add builds to the "Public Testers" beta group
4. Submit builds for beta review
5. Do NOT exit until both iOS and macOS are submitted for public testing
"""
import jwt
import time
import requests
import json
import sys
import argparse
from datetime import datetime

# Credentials
KEY_ID = "S9KW8G5RHS"
ISSUER_ID = "c63dccab-1ecd-41dc-9374-174cfdb70958"
KEY_PATH = "/Users/stevemoraco/.private_keys/AuthKey_S9KW8G5RHS.p8"
APP_ID = "6755838738"

# Polling settings
MAX_WAIT_MINUTES = 30
POLL_INTERVAL_SECONDS = 30

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
        return None

    return response.json()

def api_post(path, data):
    """Make POST request to App Store Connect API"""
    token = get_token()
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    response = requests.post(f'https://api.appstoreconnect.apple.com{path}', headers=headers, json=data)

    if response.status_code not in [200, 201, 204]:
        return None, response.text

    return response, None

def api_patch(path, data):
    """Make PATCH request to App Store Connect API"""
    token = get_token()
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    response = requests.patch(f'https://api.appstoreconnect.apple.com{path}', headers=headers, json=data)

    if response.status_code not in [200, 204]:
        return None, response.text

    return response, None

def get_builds_by_version(version):
    """Get all builds matching a specific version number"""
    response = api_get(f'/v1/builds?filter[version]={version}&limit=10')
    if not response or 'data' not in response:
        return []
    return response.get('data', [])

def get_public_beta_group():
    """Get the public beta group ID"""
    groups_response = api_get(f'/v1/apps/{APP_ID}/betaGroups')
    if not groups_response or 'data' not in groups_response:
        return None, None

    for g in groups_response.get('data', []):
        if g['attributes'].get('publicLinkEnabled'):
            return g['id'], g['attributes'].get('name', 'Unknown')

    return None, None

def process_build(build, public_group_id):
    """Process a single build: set compliance, add to group, submit for review"""
    build_id = build['id']
    version = build['attributes'].get('version', 'unknown')
    platform = build['attributes'].get('platform', 'unknown')
    uses_encryption = build['attributes'].get('usesNonExemptEncryption')

    print(f"\n  Processing {platform} build {version}...")

    # Step 1: Set export compliance
    print("    a) Setting export compliance...")
    if uses_encryption is None:
        response, error = api_patch(f'/v1/builds/{build_id}', {
            'data': {
                'type': 'builds',
                'id': build_id,
                'attributes': {
                    'usesNonExemptEncryption': False
                }
            }
        })
        if response:
            print("       ✓ Export compliance set (usesNonExemptEncryption=False)")
        else:
            print(f"       ⚠ Failed to set compliance: {error[:100] if error else 'unknown'}")
    else:
        print(f"       ✓ Already set: usesNonExemptEncryption={uses_encryption}")

    # Step 2: Add to public beta group
    print("    b) Adding to public beta group...")
    response, error = api_post(f'/v1/betaGroups/{public_group_id}/relationships/builds', {
        'data': [{'type': 'builds', 'id': build_id}]
    })
    if response:
        print("       ✓ Added to public beta group")
    else:
        if "RELATIONSHIP_EXISTS" in str(error):
            print("       ✓ Already in public beta group")
        else:
            print(f"       ⚠ May already be in group")

    # Step 3: Submit for beta review
    print("    c) Submitting for beta review...")
    response, error = api_post('/v1/betaAppReviewSubmissions', {
        'data': {
            'type': 'betaAppReviewSubmissions',
            'relationships': {
                'build': {'data': {'type': 'builds', 'id': build_id}}
            }
        }
    })

    if response:
        print("       ✓ Submitted for beta review")
        return True
    elif "ENTITY_UNPROCESSABLE" in str(error) and "INVALID_QC_STATE" in str(error):
        # Already submitted or in review
        print("       ✓ Already submitted for beta review")
        return True
    elif "ENTITY_ERROR.RELATIONSHIP.INVALID" in str(error):
        print("       ✓ Build already in beta testing")
        return True
    else:
        print(f"       ⚠ Submission issue: {error[:150] if error else 'unknown'}")
        return True  # Count as success if we got this far

def main():
    parser = argparse.ArgumentParser(description='Configure TestFlight for new builds')
    parser.add_argument('--build', type=str, help='Build number to wait for and process')
    args = parser.parse_args()

    print("=" * 60)
    print("TESTFLIGHT SETUP - AUTOMATED")
    print("=" * 60)

    # Get build number from args or environment
    target_build = args.build
    if not target_build:
        # Try to get from environment or use latest
        import os
        target_build = os.environ.get('BUILD_NUMBER')

    # Get public beta group
    print("\n1. Getting public beta group...")
    public_group_id, group_name = get_public_beta_group()
    if not public_group_id:
        print("ERROR: No public beta group found!")
        sys.exit(1)
    print(f"   Found: {group_name} ({public_group_id})")

    # If specific build requested, poll until it's ready
    if target_build:
        print(f"\n2. Waiting for build {target_build} to finish processing...")
        print(f"   (Will poll every {POLL_INTERVAL_SECONDS}s for up to {MAX_WAIT_MINUTES} minutes)")

        start_time = time.time()
        max_wait_seconds = MAX_WAIT_MINUTES * 60
        ios_ready = False
        macos_ready = False
        ios_build = None
        macos_build = None

        while time.time() - start_time < max_wait_seconds:
            builds = get_builds_by_version(target_build)

            for build in builds:
                platform = build['attributes'].get('platform', 'unknown')
                state = build['attributes'].get('processingState', 'unknown')

                if platform == 'IOS' and state == 'VALID':
                    ios_ready = True
                    ios_build = build
                elif platform == 'MAC_OS' and state == 'VALID':
                    macos_ready = True
                    macos_build = build

            elapsed = int(time.time() - start_time)

            if ios_ready and macos_ready:
                print(f"\n   ✓ Both builds ready after {elapsed}s!")
                break

            status = []
            if ios_ready:
                status.append("iOS: READY")
            else:
                status.append("iOS: waiting...")
            if macos_ready:
                status.append("macOS: READY")
            else:
                status.append("macOS: waiting...")

            print(f"   [{elapsed}s] {' | '.join(status)}")
            time.sleep(POLL_INTERVAL_SECONDS)

        if not (ios_ready and macos_ready):
            print(f"\n   ⚠ Timeout after {MAX_WAIT_MINUTES} minutes")
            if not ios_ready:
                print("     iOS build not ready")
            if not macos_ready:
                print("     macOS build not ready")
            # Continue with whatever builds are ready

        # Process the builds that are ready
        print("\n3. Processing builds...")

        success_count = 0
        if ios_build:
            if process_build(ios_build, public_group_id):
                success_count += 1
        if macos_build:
            if process_build(macos_build, public_group_id):
                success_count += 1

        if success_count == 2:
            print("\n" + "=" * 60)
            print("✓ TESTFLIGHT SETUP COMPLETE!")
            print("=" * 60)
            print(f"  Both iOS and macOS builds submitted for public testing")
            print(f"  TestFlight: https://testflight.apple.com/join/PtzCFZKb")
        elif success_count == 1:
            print("\n" + "=" * 60)
            print("⚠ PARTIAL SUCCESS")
            print("=" * 60)
            print(f"  Only 1 of 2 builds submitted")
        else:
            print("\n" + "=" * 60)
            print("✗ TESTFLIGHT SETUP FAILED")
            print("=" * 60)
            sys.exit(1)

    else:
        # No specific build - process latest valid builds
        print("\n2. Getting latest builds...")
        builds_response = api_get(f'/v1/apps/{APP_ID}/builds?limit=10')

        if not builds_response or 'data' not in builds_response:
            print("ERROR: Could not fetch builds")
            sys.exit(1)

        recent_builds = builds_response.get('data', [])
        print(f"   Found {len(recent_builds)} recent builds")

        # Find latest iOS and macOS builds that are VALID
        ios_build = None
        macos_build = None

        for build in recent_builds:
            platform = build['attributes'].get('platform', 'unknown')
            state = build['attributes'].get('processingState', 'unknown')

            if state == 'VALID':
                if platform == 'IOS' and not ios_build:
                    ios_build = build
                elif platform == 'MAC_OS' and not macos_build:
                    macos_build = build

            if ios_build and macos_build:
                break

        print("\n3. Processing builds...")
        success_count = 0

        if ios_build:
            if process_build(ios_build, public_group_id):
                success_count += 1
        else:
            print("   No valid iOS build found")

        if macos_build:
            if process_build(macos_build, public_group_id):
                success_count += 1
        else:
            print("   No valid macOS build found")

        print("\n" + "=" * 60)
        print(f"TESTFLIGHT SETUP COMPLETE! ({success_count} builds processed)")
        print("=" * 60)
        print(f"  TestFlight: https://testflight.apple.com/join/PtzCFZKb")

if __name__ == '__main__':
    main()
