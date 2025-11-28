# How to Create a Developer ID Application Certificate

## Why You Need This

The **Developer ID Application** certificate is required to distribute Kull's DMG outside the Mac App Store. Without it, users will see a security warning: "Apple could not verify 'Kull' is free of malware."

Your current certificate ("Apple Development") only works for development and testing, not public distribution.

## Step-by-Step Instructions

### 1. Create a Certificate Signing Request (CSR)

1. Open **Keychain Access** on your Mac
   - Location: `/Applications/Utilities/Keychain Access.app`

2. From the menu, select:
   - **Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority**

3. In the dialog:
   - **User Email Address:** stephen@lander.media (or your Apple Developer email)
   - **Common Name:** Stephen Moraco
   - **CA Email Address:** Leave blank
   - **Request is:** Select **"Saved to disk"**
   - Click **Continue**

4. Save the file as `CertificateSigningRequest.certSigningRequest`
   - Save it to your Desktop or Downloads folder

### 2. Create the Certificate on Apple Developer Portal

1. Go to: https://developer.apple.com/account/resources/certificates/list

2. Click the **"+"** button to create a new certificate

3. Under **"Software"**, select:
   - **Developer ID Application**
   - This certificate is used to code sign your app for distribution outside of the Mac App Store

4. Click **Continue**

5. Upload the CSR file you created in Step 1

6. Click **Continue**

7. Download the certificate file (`.cer` file)

### 3. Install the Certificate

1. Locate the downloaded `.cer` file (usually in Downloads)

2. Double-click the file to open it

3. Keychain Access will open and ask where to add the certificate:
   - Select **"login"** keychain
   - Click **Add**

4. The certificate should now appear in Keychain Access under:
   - **My Certificates** category
   - It will be named: **"Developer ID Application: Stephen Moraco (283HJ7VJR4)"**

### 4. Verify Installation

Open Terminal and run:

```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

You should see something like:

```
1) ABC123DEF456... "Developer ID Application: Stephen Moraco (283HJ7VJR4)"
```

If you see this, you're all set!

### 5. Test with the Setup Script

Run the verification script again:

```bash
cd "/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull"
./scripts/check-notarization-setup.sh
```

You should now see:
```
1. Checking for Developer ID Application certificate...
   ✓ Found: Developer ID Application: Stephen Moraco (283HJ7VJR4)
```

## What This Certificate Does

### Developer ID Application vs App Store Distribution

| Certificate Type | Purpose | Where It's Used |
|-----------------|---------|-----------------|
| **Developer ID Application** | Distribute apps **outside** App Store | DMG downloads from your website |
| **Apple Development** | Development and testing only | Local development, TestFlight (internal) |
| **Apple Distribution** | Submit to App Store | App Store releases |

### How Signing Works

1. **Without Developer ID:**
   - User downloads DMG
   - macOS shows: "Apple could not verify this app is free of malware"
   - User must go to System Settings > Security to allow it
   - Bad user experience

2. **With Developer ID:**
   - You sign the DMG with the certificate
   - You notarize the DMG with Apple
   - User downloads DMG
   - macOS shows: "Verified by Apple"
   - DMG opens normally
   - Good user experience

## Troubleshooting

### "The certificate doesn't appear in Keychain"

1. Make sure you downloaded the `.cer` file, not the `.p12` file
2. Try dragging and dropping the `.cer` file onto Keychain Access
3. Make sure you selected "login" keychain, not "System"

### "The private key is missing"

This usually means you didn't create the CSR on the same Mac. The private key is created when you generate the CSR and stays on your Mac.

**Solution:** Start over from Step 1 on this Mac.

### "I accidentally revoked or deleted the certificate"

1. Go to Apple Developer portal
2. Revoke the old certificate
3. Create a new one following these steps again

### "It says my account doesn't have permission"

You need an Apple Developer account with the "Account Holder" or "Admin" role.

If you're not the account holder, ask them to:
1. Create the certificate
2. Export it as a `.p12` file (with password)
3. Send you the `.p12` file
4. You import it into Keychain

## Next Steps

After installing the Developer ID certificate:

1. Run the verification script to confirm everything is ready:
   ```bash
   ./scripts/check-notarization-setup.sh
   ```

2. Run a test release:
   ```bash
   ./scripts/release.sh
   ```

3. The DMG will be automatically signed and notarized

4. Test the DMG on a different Mac (or ask a user to test) to verify it opens without warnings

## Certificate Expiration

Developer ID certificates expire after **5 years**.

To check when yours expires:

```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

Or open Keychain Access and look at the certificate details.

**Renew before it expires** to avoid distribution interruptions!

---

**Still having issues?** Check `scripts/NOTARIZATION_SETUP.md` for more detailed troubleshooting.
