#!/bin/bash
# Replit Deployment CLI - FIXED payload handling
# Removed set -e to prevent silent exits on grep mismatches
set -u  # Only fail on undefined variables

# Colors  
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

# Configuration
COOKIES='__stripe_mid=9f1c2abe-7503-4492-9c73-2ec2d683cb58e9d43e; _tt_enable_cookie=1; _ttp=YdYKPZjHATlaTsq9C4z3bZeFLXx.tt.1; _attrb=2409a071-c5cb-4724-bdd2-c320fee32a16; _zitok=bf0a93eaf129ee73a31c1741311599; _hjSessionUser_5199682=eyJpZCI6ImQ1MjM5YWNjLTBlNTYtNTZiMC04ZWJlLTM4ZDAxMzVmNDdiYiIsImNyZWF0ZWQiOjE3NDEzMTE2ODg2NjksImV4aXN0aW5nIjp0cnVlfQ==; ajs_user_id=13472548; ajs_anonymous_id=2f84e729-3bae-426d-8f92-af894b1297cf; cf_clearance=dD8ifrdI51D5C0Yi69ijY6HxIu0GKdAczMQC0nvbBn8-1741908497-1.2.1.1-7ln0utk0JSzsgSciG_BNNgewifBd89_tq2ETWAfftCqTFo9rR5c7CPESmxQWSZFzPZC3229Fcz9N9acEJhhe7OpEIQx7qNUWlp_qAtYzBK.WqEObvHYmftEzRa7bF2KMQIY4HMXGbRRtJaTQwFuGV9NbOmpc3gDVMfAGhhbDDZ.GM9vsTAdRFcYlMPd4rV8HfxVSuxenwWrIWDyZL2XnEUUoGPqAvv2pxL8CNb_PQnd_fyCl0YwJN_jLsEIWNW6_NuTktikebc1gi0FVpu_nwdol86F17eFuGrEBX7PTlQh591lnB6QSaHl4Z3MkoJ7h.LyrePu19D72sqJe9p.6n598q9.HtP_VoWySANztaXJxjPVhbgaAeo1YUjcuOXZo2WSt58EZlKU1MYYJPlVGqZatZZ7G0Czfq5GuOUUSKGI; ajs_user_id=13472548; ajs_anonymous_id=2f84e729-3bae-426d-8f92-af894b1297cf; ph_phc_TXdpocbGVeZVm5VJmAsHTMrCofBQu3e0kN8HGMNGTVW_posthog=%7B%22distinct_id%22%3A%2201957747-bd1a-752c-a0c4-81f0020f563a%22%2C%22%24sesid%22%3A%5B1750094757765%2C%22019779c6-3eca-7fb8-88c7-8716e85ac7dc%22%2C1750094724810%5D%7D; __spdt=3845f5d0334848cbba7165af58d05f3d; ttcsid_D004OSJC77U7QLNJ32IG=1753484957089::xTmebRJ47RWtAPxxzlrD.5.1753484957089; _gcl_au=1.1.1267514741.1759114558; coframe.user.token=9d9d6bb5-d31f-4102-8c4e-f20dcbdbc986; __d_d_r__=https://replit.com/; __d_d_r_l__=; signals-sdk-user-id=fe67b383-7cc9-4713-9f34-1316fb9f0557; _ga=GA1.2.266452222.1675802094; replit_statsig_stable_id=557eb457-1f8b-4a4d-a5ec-128cec56cd55; ttcsid=1761854277712::RT3V0Hg5t3-z6HmgGrhj.35.1761854807999.0; ttcsid_D004GE3C77U8PIVDSDJG=1761854277712::y0rJUQXHYBX5AdKqFVb6.36.1761854807999.0; replit_authed=1; ld_uid=13472548; _gid=GA1.2.1256978901.1763687718; _oidc_session=vCWMH-nG_IkRkZO9qSPxu; _oidc_session.sig=B9K2Xr9V4vYtTjLfDNV9ZxP6jj4; _oidc_session.legacy=vCWMH-nG_IkRkZO9qSPxu; _oidc_session.legacy.sig=cRJN-4RltukOSxHZLxC4BWgZOY4; coframe.cvc=17; coframe.lastVisitTime=1763759280373; amplitudeSessionId=1763759280; __stripe_sid=66108970-9b26-4307-9dd7-110ac9f16b585f2c1a; __cf_bm=1iDpzCvKwOT6cd27CGs8AJkiWIa9HbYwzLnlayHpyX4-1763762962-1.0.1.1-MD7RpiZCDjLLalKy.Uoqqk1rAnDkux.iLpGLHCRvIljZ7Mzf_hQil..QR59.S2HezFjgjeN7iHaMv1OVXZ5tRGbcgALQUDqIOCz9_xRvGb8; _cfuvid=a21H0tqLlXU0QZieqPzO4Weu1sUucG0c2MP4CBsM9tM-1763762962543-0.0.1.1-604800000; _gat=1; _ga_MPJY3F1YEL=GS2.2.s1763759282$o140$g1$t1763763758$j60$l0$h1504151910; connect.sid=eyJhbGciOiJSUzI1NiIsImtpZCI6Il9FcFMtUSJ9.eyJpc3MiOiJodHRwczovL3Nlc3Npb24uZmlyZWJhc2UuZ29vZ2xlLmNvbS9yZXBsaXQtd2ViIiwibmFtZSI6IlN0ZXZlIE1vcmFjbyIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS0vQUxWLVVqV3JzTldoc2xWQkhJLXVYN2hrSGZPSUxZX3gwM3BSSk9CRjlmZkpqU0tTbW5kcVRNSWZad01kdDByTEo1M05DUloweEQyZVFLMWJRa1Y0UU03MUZzeVBhcUFXUFRhbFpZbFFsWDZfMVdCNER6QngtdmhSNzJ0b3hJRzdlTlhnN3N0Ym8tb25SYmx3VHU4Y3ROVnJzUDFwTFpoVFN1enlOYXVDRXVVYU9DYlIwRi1PdWpodmNwN2JlTGEzdjhnb1hKWUpycl9tbVNaQ3FWUGNhOTJtamkxSGNMbmI2bG9yT2JPYXlEbjJ1RGg3Y3dHNUYyQk5sbk1YYUNYT3dUZGVMd25CU0pTVllJWHo5Y3FTSDIyajd6bnF6MVVvR1BDQzllWUlWS3N0YlpCTXhqSnNTcVNMUGUybVFXVTVGZjBuYkJoSm5NNTRiQ25MWm02cWZEMkR1Z1F5clRmd2FYdndsNmFUbVBpNTFrNG1fTXNJXy04UzRkZzJQVEI2Wm82U2tMV3VJVS1yYTlZbEFFclhxSEgyT2FWUTB2QmdOTWlCc1F5MWdSWE4xSFpua1R3cUhLWXR6WXhWd1ZrNWxOSXc3eTJqVUVESVNCMW5HaWpLWlpRc1VzdGV5UGVCcnFBQ3N4bklDZXBabWtSRFBrb2tLOHJvMmZ2OWJYMzlOa3Rjd1lxNVU0WlVIX1FheVoxWXZfNlNybUZ3QldYS3ZudnFpY0Q3UHI1cUVTVkJ4dWxtanJ0bFRJektCZXhCUUhpZVVFU3dwSUU3NGdLTUQ4RHN6VnJ4ZEV1aHdGTTRnQVRERUcxdkhPeS1aS2hERjBHSGVJc3BqSTJqQlk2R3dFeDhwQUl6VDFMb00tVmRyVXFLT0ozUjhLM0NOTVRfYkxKNXVINTRxazVCd2RrT1hSeldYUkJzY2hkeTRxSDRWQ1l6anJ3dFEtN1BIMlN4UDVobFY2dU1ZRE4taDhRU0F2ZVdIUERiMjJzSXJNLTA0ZnNWQ0o3RUFEWTVmZ2Z5VXlIeFFLMlEzRm1JNnFPNjk2VVljVlBkb2tOSVRVYTQ2TFMxYU5La3FZNWZmY2VOd2pSNUdBR3dGY1FxQlZDUnd5VDJjUGtXNElJazRiczQ3WnFBbTV6Tlk5bDlSMWtLSU54a21IY2YzbkZOS1BYTHl5SGJwRWNHdjU5UnlKQ2xTbnVhVXRjOW5KZGxQX01wVjVVWnF5T2FrWWhzd1plMENMQ2dvc2pVakdKMXZMVjVSMnlUcmV2cDFfSjFpLXJvRlFQQWtBXHUwMDNkczk2LWMiLCJyb2xlcyI6WyJleHBsb3JlciJdLCJhdWQiOiJyZXBsaXQtd2ViIiwiYXV0aF90aW1lIjoxNzYzNTYzNjM0LCJ1c2VyX2lkIjoiZHRBTVBNZjM0d1JVRUJwN1lkOWpnd000cEdUMiIsInN1YiI6ImR0QU1QTWYzNHdSVUVCcDdZZDlqZ3dNNHBHVDIiLCJpYXQiOjE3NjM3NjM3ODQsImV4cCI6MTc2NDM2ODU4NCwiZW1haWwiOiJzdGV2ZUBsYW5kZXIubWVkaWEiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfbnVtYmVyIjoiKzE3MTkzMzA4NTMzIiwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJhcHBsZS5jb20iOlsiMDAwNzU4LjZlNTMxOTQ1NmE3NTQyOTFiOGI1YmM4ZDY5OWRhYmMwLjA4NDIiXSwiZ29vZ2xlLmNvbSI6WyIxMDAyODcwNDg1MDU0OTkyMTE0NTciXSwiZ2l0aHViLmNvbSI6WyIxNjgxOTMyIl0sImVtYWlsIjpbInN0ZXZlQGxhbmRlci5tZWRpYSJdLCJwaG9uZSI6WyIrMTcxOTMzMDg1MzMiXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.XZoGlmiNNlxbjOxss87RBPwzg09dmLosJoXTZn5fKaAiyWOgdlQsS0v_u3dakAj92OhID0stQXOVwU92DjP6C9A6-jc3p2MKxjtxQtYD9lqbr2TZ1EwmM78w6VzvIqyY7fZTfaaVnF40UMUC-wrzZxIAP5q_C_EDoOU-85aXCj6iOexxjYdbIH_inH6OaYqIMeaV9iXosEMl9A09Mg3k2Vfyf2o6JjgLseAlaCBbeI4cSaZb8z65CoKFz_sz4Hcdl1DjK23iAnU_lN_31Bw273Zik8HAuEYqcKq4sZD-KjkgGpCXkds114LDy0fgpGZpBWEcPOD_fYpT7rOjLM5fKQ; _dd_s=logs=1&id=6b5862f3-31cc-471d-8236-5f1b82c24e13&created=1763759280591&expire=1763764686769&rum=0'

GRAPHQL_URL="https://replit.com/graphql"
LOG_DIR="deployment_logs"
mkdir -p "$LOG_DIR"
LATEST_BUILD_FILE="$LOG_DIR/latest_build_id.txt"
LAST_BUILD_ID=""

# Create fixed status query on first run
if [ ! -f "/tmp/status_query_fixed.json" ]; then
    cat > /tmp/status_query_fixed.json << 'JSONEOF'
[{"operationName":"HostingDeploymentConfigRedeploy","variables":{"id":"33f6f30b-688e-4770-8df7-c6e1828a4db4"},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"5653588fad0a612a5290839804d7a4e18928fb68b282ec4357ebf42024a0efbd"}},"query":"query HostingDeploymentConfigRedeploy($id: String!) {\n  hostingDeployment(id: $id) {\n    ... on HostingDeployment {\n      id\n      replitAppSubdomain\n      ignoredSecrets\n      activityLogs(count: 20) {\n        items {\n          id\n          ...HostingActivityLogLine2\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          nextCursor\n          __typename\n        }\n        __typename\n      }\n      currentBuild {\n        id\n        envVars {\n          name\n          value\n          __typename\n        }\n        suspendedReason\n        machineConfiguration {\n          id\n          label\n          vcpu\n          memory\n          slug\n          __typename\n        }\n        maxMachineInstances\n        __typename\n      }\n      ...DeploymentsDeployOptionsDeployment\n      repl {\n        ...DeploymentsDeployOptionsAuthzRepl\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment HostingActivityLogLine2 on HostingActivityLog {\n  id\n  build {\n    ...HostingActivityLogBuild\n    __typename\n  }\n  type\n  user {\n    id\n    displayName\n    __typename\n  }\n  timeCreated\n  isRollbackCandidate\n  __typename\n}\n\nfragment HostingActivityLogBuild on HostingBuild {\n  id\n  status\n  hasDeployLogs\n  provider\n  timeCreated\n  user {\n    id\n    displayName\n    username\n    fullName\n    image\n    __typename\n  }\n  debugSummary {\n    ...BuildDebugSummary\n    __typename\n  }\n  rollbackSourceBuildId\n  envVars {\n    name\n    value\n    __typename\n  }\n  __typename\n}\n\nfragment BuildDebugSummary on HostingDebugSummary {\n  id\n  sessionId\n  eventId\n  type\n  __typename\n}\n\nfragment DeploymentsDeployOptionsDeployment on HostingDeployment {\n  id\n  replitAppSubdomain\n  ignoredSecrets\n  timeCreated\n  securityScanEnabled\n  currentBuild {\n    timeCreated\n    id\n    provider\n    envVars {\n      name\n      value\n      __typename\n    }\n    machineJob {\n      timezone\n      crontab\n      timeoutSeconds\n      failureNotifications\n      __typename\n    }\n    isPrivate\n    hasPrivatePassword\n    __typename\n  }\n  __typename\n}\n\nfragment DeploymentsDeployOptionsAuthzRepl on Repl {\n  id\n  authorizations {\n    editDeploymentSecrets {\n      isAuthorized\n      message\n      __typename\n    }\n    editSecrets {\n      isAuthorized\n      message\n      __typename\n    }\n    __typename\n  }\n  __typename\n}"}]
JSONEOF
fi

# Create fixed deploy query on first run (persisted query + full query fallback)
if [ ! -f "/tmp/deploy_query_fixed.json" ]; then
    cat > /tmp/deploy_query_fixed.json << 'JSONEOF'
[{"operationName":"DeploymentSessionDeployBuild","variables":{"input":{"replId":"f65a9e32-6516-4e46-a64c-53967f4d78f5","appType":"cloud_run","commands":{"build":"npm run build","run":"npm run start"},"context":"workspace","createNeonProductionDatabase":false,"enableSecurityScan":false,"envVars":[{"name":"SESSION_SECRET"}],"hasAgentSession":true,"ignoredSecretKeys":[],"maxMachineInstances":3,"privacyMode":"public","provider":"cloud_run","pushDevelopmentDatabaseObjects":null,"subdomain":"kull","syncStripe":true,"targetMachineConfigurationId":"b59bd003-0c77-4116-a16c-94ef0f86b5a4","triggerSource":"dashboard"}},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"e2ac7ddc6a42ecbccbc2a93de5df1bbc9fc2b9cefe4e28e28935c9b7d4a5cae4"}},"query":"mutation DeploymentSessionDeployBuild($input: DeployHostingBuild2Input!) { deployHostingBuild2(input: $input) { ... on DeployHostingBuild2Result { build { id status __typename } __typename } ... on Error { message __typename } __typename } }"}]
JSONEOF
fi

# API call - pass data via file to avoid bash escaping issues
api_call_file() {
    local payload_file="$1"
    curl -s -X POST "$GRAPHQL_URL" \
        -H 'Content-Type: application/json' \
        -H 'Accept: */*' \
        -H 'Origin: https://replit.com' \
        -H 'X-Requested-With: XMLHttpRequest' \
        -H "Cookie: $COOKIES" \
        --data-binary "@$payload_file"
}

# Logging
log_response() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local log_file="$LOG_DIR/${2}_${timestamp}.json"
    echo "$1" > "$log_file"
    echo "$log_file"
}

save_latest_build_id() {
    local build_id="$1"
    if [ -n "$build_id" ] && [ "$build_id" != "id" ] && echo "$build_id" | grep -Eq '^[a-f0-9-]{8,}$'; then
        echo "$build_id" > "$LATEST_BUILD_FILE"
    fi
}

load_latest_build_id() {
    if [ -s "$LATEST_BUILD_FILE" ]; then
        local val
        val=$(cat "$LATEST_BUILD_FILE")
        if echo "$val" | grep -Eq '^[a-f0-9-]{8,}$'; then
            echo "$val"
            return
        fi
    fi
    
    local latest_log
    for latest_log in $(ls -1t "$LOG_DIR"/deploy_*.json 2>/dev/null); do
        if [ -f "$latest_log" ]; then
            local found
            found=$(grep -o '"build":{"id":"[^"]*"' "$latest_log" | head -1 | cut -d'"' -f4)
            if [ -n "$found" ] && echo "$found" | grep -Eq '^[a-f0-9-]{8,}$'; then
                echo "$found"
                return
            fi
        fi
    done
}

fetch_current_build_id() {
    local response
    response=$(api_call_file "/tmp/status_query_fixed.json")
    echo "$response" | grep -o '"currentBuild":{[^}]*"id":"[^"]*"' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

extract_build_id_from_deploy_response() {
    echo "$1" | sed -n 's/.*"deployHostingBuild2":{"build":{"id":"\([^"]*\)".*/\1/p' | head -1
}

extract_build_id_from_message() {
    echo "$1" | sed -n 's/.*build id #\([a-f0-9-]\{8,\}\).*/\1/p' | head -1
}

format_duration() {
    local total_ms="${1:-0}"
    local hours=$((total_ms / 3600000))
    local mins=$(((total_ms / 60000) % 60))
    local secs=$(((total_ms / 1000) % 60))
    local millis=$((total_ms % 1000))
    printf "%02d:%02d:%02d.%03d" "$hours" "$mins" "$secs" "$millis"
}

resolve_build_id_with_deploy() {
    local provided="$1"
    if [ -n "$provided" ]; then
        echo "$provided"
        return
    fi
    
    # Trigger a deploy to get the freshest build ID
    cmd_deploy
    
    if [ -n "$LAST_BUILD_ID" ]; then
        echo "$LAST_BUILD_ID"
        return
    fi
    
    local fallback
    fallback=$(load_latest_build_id)
    if [ -n "$fallback" ]; then
        echo "$fallback"
        return
    fi
}

print_response() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━ API Response ━━━━━━━━━━━━━━━━${NC}"
    echo "$1"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Deploy
cmd_deploy() {
    LAST_BUILD_ID=""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}   🚀 Deploying Kull${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Sync Replit with GitHub via our API endpoint
    # This tells the Replit server to run: git fetch --all && git reset --hard origin/main
    echo -e "${YELLOW}🔄 Syncing Replit with GitHub...${NC}"

    DEPLOY_SECRET="${DEPLOY_SECRET:-}"
    if [ -z "$DEPLOY_SECRET" ]; then
        echo -e "${GRAY}⚠ DEPLOY_SECRET not set - skipping remote git sync${NC}"
        echo -e "${GRAY}  Set DEPLOY_SECRET env var to enable automatic git sync${NC}"
    else
        GIT_SYNC_RESPONSE=$(curl -s -X POST "https://kullai.com/api/deploy/git-sync" \
            -H "Content-Type: application/json" \
            -d "{\"secret\": \"$DEPLOY_SECRET\"}" \
            --max-time 60)

        if echo "$GIT_SYNC_RESPONSE" | grep -q '"success":true'; then
            COMMIT_INFO=$(echo "$GIT_SYNC_RESPONSE" | grep -o '"commit":"[^"]*"' | cut -d'"' -f4)
            echo -e "${GREEN}✓ Replit synced with GitHub${NC}"
            if [ -n "$COMMIT_INFO" ]; then
                echo -e "${GRAY}  Now at: $COMMIT_INFO${NC}"
            fi
        else
            echo -e "${RED}⚠ Git sync failed${NC}"
            echo -e "${GRAY}  Response: $(echo "$GIT_SYNC_RESPONSE" | head -c 100)${NC}"
            echo -e "${GRAY}  Continuing with deployment anyway...${NC}"
        fi
    fi
    echo ""
    
    echo -e "${YELLOW}⏳ Sending deployment request...${NC}"
    
    REPL_ID="f65a9e32-6516-4e46-a64c-53967f4d78f5"
    TARGET_DEPLOYMENT_ID="33f6f30b-688e-4770-8df7-c6e1828a4db4"
    
    TMP_DEPLOY_PAYLOAD=$(mktemp)
    cat > "$TMP_DEPLOY_PAYLOAD" <<EOF
[{
  "operationName": "DeploymentSessionDeployBuild",
  "variables": {
    "input": {
      "replId": "$REPL_ID",
      "targetDeploymentId": "$TARGET_DEPLOYMENT_ID",
      "commands": {
        "build": "npm run build",
        "run": "npm run start"
      },
      "provider": "cloud_run",
      "appType": "cloud_run",
      "envVars": [],
      "context": "workspace",
      "privacyMode": "public",
      "hasAgentSession": true,
      "ignoredSecretKeys": [],
      "createNeonProductionDatabase": false,
      "enableSecurityScan": false,
      "triggerSource": "deployments_pane_republish_button",
      "syncStripe": false
    }
  },
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "cf83141a6905bbf5b70b83a152cbba41a084743dfe260240917f7a8ca561f278"
    }
  }
}]
EOF
    
    RESPONSE=$(curl -s -X POST "$GRAPHQL_URL" \
      -H 'Content-Type: application/json' \
      -H 'Accept: */*' \
      -H 'Origin: https://replit.com' \
      -H 'Referer: https://replit.com/t/lander/repls/Kull' \
      -H 'X-Requested-With: XMLHttpRequest' \
      -H "Cookie: $COOKIES" \
      --data-binary @"$TMP_DEPLOY_PAYLOAD")
    rm "$TMP_DEPLOY_PAYLOAD"
    
    LOG_FILE=$(log_response "$RESPONSE" "deploy")
    echo -e "${BLUE}📝 Logged to: $LOG_FILE${NC}"
    echo ""
    print_response "$RESPONSE"
    echo ""
    
    NEW_BUILD_ID=$(extract_build_id_from_deploy_response "$RESPONSE")
    if [ -n "$NEW_BUILD_ID" ]; then
        echo -e "${BLUE}Tracking build: ${NEW_BUILD_ID}${NC}"
        LAST_BUILD_ID="$NEW_BUILD_ID"
        save_latest_build_id "$NEW_BUILD_ID"
    fi
    
    if echo "$RESPONSE" | grep -q "already in progress"; then
        if [ -z "$NEW_BUILD_ID" ]; then
            NEW_BUILD_ID=$(extract_build_id_from_message "$RESPONSE")
            if [ -n "$NEW_BUILD_ID" ]; then
                echo -e "${BLUE}Tracking in-progress build: ${NEW_BUILD_ID}${NC}"
                LAST_BUILD_ID="$NEW_BUILD_ID"
                save_latest_build_id "$NEW_BUILD_ID"
            fi
        fi
        echo -e "${YELLOW}⚠️  Deploy already in progress${NC}"
        return 2
    elif echo "$RESPONSE" | grep -q '"status":"pending"' || echo "$RESPONSE" | grep -q '"status":"building"'; then
        echo -e "${GREEN}✅ Deployment started!${NC}"
        return 0
    else
        echo -e "${YELLOW}Check response above${NC}"
        return 1
    fi
}

# Status
cmd_status() {
    local provided_build_id="${1:-}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}   📊 Deployment Status${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local build_id
    build_id=$(resolve_build_id_with_deploy "$provided_build_id")
    
    if [ -z "$build_id" ]; then
        echo -e "${RED}❌ No deployment build ID available${NC}"
        return 1
    fi
    
    RESPONSE=$(api_call_file "/tmp/status_query_fixed.json")
    
    LOG_FILE=$(log_response "$RESPONSE" "status")
    echo -e "${BLUE}📝 Logged to: $LOG_FILE${NC}"
    echo ""
    
    status=$(echo "$RESPONSE" | grep -o "\"id\":\"$build_id\"[^}]*\"status\":\"[^\"]*\"" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    save_latest_build_id "$build_id"
    
    if [ -z "$status" ]; then
        echo -e "${GRAY}Status unavailable yet for build $build_id${NC}"
        return 1
    fi
    
    # Display status
    echo -e "${BLUE}Build ID: $build_id${NC}"
    
    if [ "$status" = "success" ] || [ "$status" = "live" ]; then
        echo -e "${GREEN}✅ Status: LIVE${NC}"
        echo -e "${BLUE}Visit: https://kull.replit.app${NC}"
    elif [ "$status" = "building" ]; then
        echo -e "${YELLOW}🔨 Status: BUILDING${NC}"
    elif [ "$status" = "pending" ]; then
        echo -e "${YELLOW}📦 Status: PENDING${NC}"
    elif [ "$status" = "failed" ]; then
        echo -e "${RED}❌ Status: FAILED${NC}"
    elif [ "$status" = "sleeping" ]; then
        echo -e "${BLUE}😴 Status: SLEEPING${NC}"
    else
        echo -e "${GRAY}⏳ Status: ${status:-UNKNOWN}${NC}"
    fi
}

# Watch - Continuous Status Tracker
cmd_watch() {
    local arg1="${1:-}"
    local arg2="${2:-}"
    local interval="5"
    local target_build_id=""
    
    # Allow either cmd_watch <seconds> or cmd_watch <build_id> [seconds]
    if [[ -n "$arg1" && "$arg1" =~ ^[0-9]+$ ]]; then
        interval="$arg1"
    else
        target_build_id="$arg1"
        if [[ -n "$arg2" && "$arg2" =~ ^[0-9]+$ ]]; then
            interval="$arg2"
        fi
    fi
    
    if [ -z "$target_build_id" ]; then
        target_build_id=$(load_latest_build_id)
    fi
    
    if [ -z "$target_build_id" ]; then
        target_build_id=$(fetch_current_build_id)
        save_latest_build_id "$target_build_id"
    fi
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}   📊 Status Tracker${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if [ -n "$target_build_id" ]; then
        echo -e "${BLUE}Tracking build: ${target_build_id}${NC}"
    fi
    echo -e "${BLUE}Polling every ${interval}s (Ctrl+C to stop)${NC}"
    echo ""
    
    local count=0
    local consecutive_errors=0
    local start_ms=$(date +%s%3N 2>/dev/null || date +%s000)
    
    while true; do
        count=$((count + 1))
        echo -e "${GRAY}[$(date +%H:%M:%S)] Poll #$count${NC}"
        
        RESPONSE=$(api_call_file "/tmp/status_query_fixed.json")
        LOG_FILE=$(log_response "$RESPONSE" "watch_${count}")
        
        # Check for errors
        if echo "$RESPONSE" | grep -q "PERSISTED_QUERY_NOT_FOUND" || echo "$RESPONSE" | grep -q "Unterminated string"; then
            consecutive_errors=$((consecutive_errors + 1))
            echo -e "${RED}  ❌ API Error${NC}"
            echo -e "${GRAY}  Response: $(echo "$RESPONSE" | head -c 100)...${NC}"
            
            if [ $consecutive_errors -ge 3 ]; then
                echo ""
                echo -e "${RED}Multiple errors - stopping${NC}"
                break
            fi
            sleep "$interval"
            continue
        fi
        
        consecutive_errors=0
        
        # Determine which build to track
        local build_id="$target_build_id"
        if [ -z "$build_id" ]; then
            build_id=$(echo "$RESPONSE" | grep -o '"currentBuild":{[^}]*"id":"[^"]*"' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            if [ -z "$build_id" ]; then
                echo -e "${GRAY}  ⏳ No active deployment${NC}"
                sleep "$interval"
                continue
            fi
            target_build_id="$build_id"
        fi
        
        save_latest_build_id "$build_id"
        
        # Find the matching build in activityLogs to get its status
        status=$(echo "$RESPONSE" | grep -o "\"id\":\"$build_id\"[^}]*\"status\":\"[^\"]*\"" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [ -z "$status" ]; then
            local now_ms=$(date +%s%3N 2>/dev/null || date +%s000)
            local elapsed_ms=$((now_ms - start_ms))
            local pretty_elapsed
            pretty_elapsed=$(format_duration "$elapsed_ms")
            echo -e "${GRAY}  ⏳ Deploy in progress (elapsed ${pretty_elapsed})${NC}"
            sleep "$interval"
            continue
        fi
        
        # Display status
        echo -e "${GRAY}  Build: ${build_id:0:8}...${NC}"
        
        if [ "$status" = "success" ] || [ "$status" = "live" ]; then
            echo -e "${GREEN}  ✅ Status: LIVE! 🎉${NC}"
            echo -e "${BLUE}  Visit: https://kull.replit.app${NC}"
            echo ""
            echo -e "${GREEN}Deployment complete!${NC}"
            break
        elif [ "$status" = "building" ]; then
            echo -e "${YELLOW}  🔨 Status: BUILDING...${NC}"
        elif [ "$status" = "pending" ]; then
            echo -e "${YELLOW}  📦 Status: PENDING...${NC}"
        elif [ "$status" = "failed" ]; then
            echo -e "${RED}  ❌ Status: FAILED${NC}"
            break
        elif [ "$status" = "sleeping" ]; then
            echo -e "${BLUE}  😴 Status: SLEEPING${NC}"
        else
            echo -e "${GRAY}  ⏳ Status: ${status:-UNKNOWN}${NC}"
        fi
        
        sleep "$interval"
    done
}

# Cancel
cmd_cancel() {
    local build_id="${1}"
    
    if [ -z "$build_id" ]; then
        build_id=$(load_latest_build_id)
    fi
    
    # Auto-detect current build if still not provided
    if [ -z "$build_id" ]; then
        echo -e "${YELLOW}🔍 Finding current deployment...${NC}"
        build_id=$(fetch_current_build_id)
        
        if [ -z "$build_id" ]; then
            echo -e "${RED}❌ No active deployment found${NC}"
            return 1
        fi
        
        echo -e "${GREEN}✓ Found: $build_id${NC}"
        echo ""
    fi
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}   🛑 Cancelling Build${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Build ID: $build_id${NC}"
    echo ""
    
    # Create temp file with replaced ID
    TMPFILE=$(mktemp)
    cat attached_assets/Pasted--operationName-DeploymentSessionCancelInProgressDeploymentsBuild-variables-input-buildId-1763765303421_1763765303422.txt | sed "s/674e9bb2-dfe4-44b8-92d3-f1acdfbb07a7/$build_id/g" > "$TMPFILE"
    
    echo -e "${YELLOW}⏳ Sending cancel request...${NC}"
    RESPONSE=$(api_call_file "$TMPFILE")
    rm "$TMPFILE"
    
    LOG_FILE=$(log_response "$RESPONSE" "cancel")
    echo -e "${BLUE}📝 Logged to: $LOG_FILE${NC}"
    echo ""
    print_response "$RESPONSE"
    
    if echo "$RESPONSE" | grep -q '"status"'; then
        echo -e "${GREEN}✅ Cancellation sent!${NC}"
        return 0
    else
        echo -e "${RED}❌ Cancel failed${NC}"
        return 1
    fi
}

# Help
show_help() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}   Replit Deployment CLI${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo -e "  ${GREEN}deploy${NC}           Start a new deployment"
    echo -e "  ${RED}cancel${NC} [id]       Cancel current deployment (or specify build ID)"
    echo -e "  ${BLUE}status${NC}           Check current deployment status"
    echo -e "  ${PURPLE}watch${NC} [build_id] [seconds]  Status Tracker - polls continuously (default: 5s)"
    echo -e "  ${CYAN}help${NC}             Show this message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 watch                # Auto-detects current build"
    echo "  $0 watch <build_id> 10  # Track a specific build every 10s"
    echo "  $0 cancel              # Auto-detects current build
  $0 cancel 9c1355af-3f87-47c9-82da-c561ea6a24aa  # Or specify ID"
    echo "  $0 status"
    echo ""
    echo -e "${GRAY}All responses logged to: $LOG_DIR/${NC}"
    echo -e "${BLUE}Site: https://kull.replit.app${NC}"
    echo ""
    echo -e "${GREEN}✅ Fixed: Uses --data-binary for proper JSON handling${NC}"
}

# Main
COMMAND="${1:-help}"

case "$COMMAND" in
    deploy)
        cmd_deploy
        DEPLOY_STATUS=$?
        if [ $DEPLOY_STATUS -eq 0 ] || [ $DEPLOY_STATUS -eq 2 ]; then
            echo ""
            if [ $DEPLOY_STATUS -eq 2 ]; then
                echo -e "${PURPLE}📊 Starting status tracker...${NC}"
                echo ""
                cmd_watch "${NEW_BUILD_ID:-}"
            else
                read -p "$(echo -e ${CYAN}Start watching deployment? [Y/n]: ${NC})" -n 1 -r
                echo ""
                if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                    cmd_watch "${NEW_BUILD_ID:-}"
                fi
            fi
        fi
        ;;
    cancel)
        cmd_cancel "${2:-}"
        ;;
    status)
        cmd_status
        ;;
    watch)
        cmd_watch "${2:-}" "${3:-}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
