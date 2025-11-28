#!/usr/bin/env python3
"""
Create Developer ID Application Certificate
Automates the process of creating a Developer ID certificate via Apple's API
"""
import jwt
import time
import requests
import subprocess
import tempfile
import os
import base64
import sys

# Credentials (same as testflight_setup.py)
KEY_ID = "S9KW8G5RHS"
ISSUER_ID = "c63dccab-1ecd-41dc-9374-174cfdb70958"
KEY_PATH = "/Users/stevemoraco/.private_keys/AuthKey_S9KW8G5RHS.p8"

# Certificate details
CERT_TYPE = "DEVELOPER_ID_APPLICATION"  # For signing apps distributed outside App Store
CERT_EMAIL = "steve@lander.media"
CERT_NAME = "Stephen Moraco"

def get_token():
    """Generate JWT token for Apple Developer API"""
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

    if response.status_code not in [200, 201]:
        print(f"POST {path} failed: {response.status_code}")
        print(response.text)
        return None

    return response.json()

def generate_csr():
    """Generate a Certificate Signing Request using macOS security command"""
    print("Generating Certificate Signing Request...")

    # Create a temporary directory for key and CSR
    temp_dir = tempfile.mkdtemp()
    key_path = os.path.join(temp_dir, "private_key.key")
    csr_path = os.path.join(temp_dir, "cert_request.csr")

    # Generate private key
    subprocess.run([
        "openssl", "genrsa",
        "-out", key_path,
        "2048"
    ], check=True, capture_output=True)

    # Generate CSR
    subprocess.run([
        "openssl", "req",
        "-new",
        "-key", key_path,
        "-out", csr_path,
        "-subj", f"/emailAddress={CERT_EMAIL}/CN={CERT_NAME}/C=US"
    ], check=True, capture_output=True)

    # Read CSR content
    with open(csr_path, 'r') as f:
        csr_content = f.read()

    # Store private key path for later use
    permanent_key_path = os.path.expanduser("~/.private_keys/developer_id_private_key.key")
    subprocess.run(["cp", key_path, permanent_key_path], check=True)
    os.chmod(permanent_key_path, 0o600)
    print(f"  Private key saved to: {permanent_key_path}")

    return csr_content, permanent_key_path

def check_existing_certificates():
    """Check if Developer ID Application certificate already exists"""
    print("\nChecking existing certificates...")

    certs = api_get('/v1/certificates?filter[certificateType]=DEVELOPER_ID_APPLICATION')

    if certs and 'data' in certs:
        for cert in certs['data']:
            name = cert['attributes'].get('name', 'Unknown')
            expiry = cert['attributes'].get('expirationDate', 'Unknown')
            print(f"  Found existing: {name} (expires: {expiry})")
            return cert

    return None

def create_certificate(csr_content):
    """Create Developer ID Application certificate via API"""
    print("\nCreating Developer ID Application certificate...")

    # Remove PEM headers and newlines from CSR
    csr_lines = csr_content.strip().split('\n')
    csr_base64 = ''.join(line for line in csr_lines if not line.startswith('-----'))

    data = {
        "data": {
            "type": "certificates",
            "attributes": {
                "certificateType": CERT_TYPE,
                "csrContent": csr_base64
            }
        }
    }

    result = api_post('/v1/certificates', data)

    if result and 'data' in result:
        cert_id = result['data']['id']
        cert_content = result['data']['attributes'].get('certificateContent', '')
        print(f"  Certificate created! ID: {cert_id}")
        return cert_id, cert_content

    return None, None

def download_and_install_certificate(cert_id, cert_content):
    """Download certificate and install to keychain"""
    print("\nInstalling certificate to keychain...")

    # Save certificate to file
    cert_path = os.path.expanduser("~/.private_keys/developer_id_application.cer")

    # Decode base64 certificate content
    cert_bytes = base64.b64decode(cert_content)

    with open(cert_path, 'wb') as f:
        f.write(cert_bytes)

    print(f"  Certificate saved to: {cert_path}")

    # Import to keychain
    result = subprocess.run([
        "security", "import", cert_path,
        "-k", os.path.expanduser("~/Library/Keychains/login.keychain-db"),
        "-T", "/usr/bin/codesign",
        "-T", "/usr/bin/productsign"
    ], capture_output=True, text=True)

    if result.returncode == 0:
        print("  Certificate imported to keychain!")
    else:
        print(f"  Import may have failed: {result.stderr}")
        # Try alternate method
        subprocess.run(["open", cert_path], check=True)
        print("  Opened certificate in Keychain Access - please approve if prompted")

    return cert_path

def verify_installation():
    """Verify the certificate is properly installed"""
    print("\nVerifying installation...")

    result = subprocess.run(
        ["security", "find-identity", "-v", "-p", "codesigning"],
        capture_output=True, text=True
    )

    if "Developer ID Application" in result.stdout:
        print("  SUCCESS! Developer ID Application certificate is installed")
        # Extract the identity
        for line in result.stdout.split('\n'):
            if "Developer ID Application" in line:
                print(f"  {line.strip()}")
        return True
    else:
        print("  Certificate not yet visible in codesigning identities")
        print("  Current identities:")
        print(result.stdout)
        return False

def main():
    print("=" * 60)
    print("DEVELOPER ID APPLICATION CERTIFICATE SETUP")
    print("=" * 60)

    # Check for existing certificate
    existing = check_existing_certificates()

    if existing:
        cert_content = existing['attributes'].get('certificateContent', '')
        if cert_content:
            print("\nUsing existing certificate...")
            cert_path = download_and_install_certificate(existing['id'], cert_content)
        else:
            print("\nExisting certificate found but needs to be downloaded from Apple Developer Portal")
            print("The API returned certificate without content - fetching full details...")

            # Get full certificate details
            cert_details = api_get(f"/v1/certificates/{existing['id']}")
            if cert_details and 'data' in cert_details:
                cert_content = cert_details['data']['attributes'].get('certificateContent', '')
                if cert_content:
                    cert_path = download_and_install_certificate(existing['id'], cert_content)
    else:
        # Generate CSR and create new certificate
        csr_content, key_path = generate_csr()
        cert_id, cert_content = create_certificate(csr_content)

        if cert_id and cert_content:
            cert_path = download_and_install_certificate(cert_id, cert_content)
        else:
            print("\nERROR: Failed to create certificate")
            print("You may need to create it manually at:")
            print("https://developer.apple.com/account/resources/certificates/add")
            sys.exit(1)

    # Verify
    time.sleep(2)  # Give keychain time to update
    if verify_installation():
        print("\n" + "=" * 60)
        print("SETUP COMPLETE!")
        print("=" * 60)
        print("\nYou can now use 'Developer ID Application' for signing DMGs")
        print("The release.sh script will automatically use this certificate")
    else:
        print("\nCertificate created but not yet visible.")
        print("You may need to:")
        print("1. Open Keychain Access")
        print("2. Double-click the certificate file")
        print("3. Trust the certificate if prompted")

if __name__ == '__main__':
    main()
