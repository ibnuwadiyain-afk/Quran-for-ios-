#!/bin/bash
set -euo pipefail

# Sign an unsigned QuranReader IPA on macOS using an Apple Developer certificate
# and a provisioning profile (.mobileprovision).
#
# Usage:
#   ./scripts/sign-ipa.sh <unsigned.ipa> <profile.mobileprovision> "<Signing Identity>" [signed-output.ipa]
#
# Example:
#   ./scripts/sign-ipa.sh QuranReader-unsigned.ipa ~/Downloads/QuranReader_AdHoc.mobileprovision "Apple Distribution: Your Name (TEAMID)" QuranReader-signed.ipa

UNSIGNED_IPA="${1:-QuranReader-unsigned.ipa}"
PROVISION_PROFILE="${2:-}"
SIGNING_IDENTITY="${3:-}"
OUTPUT_IPA="${4:-QuranReader-signed.ipa}"

if [[ ! -f "$UNSIGNED_IPA" ]]; then
  echo "Error: Unsigned IPA not found: $UNSIGNED_IPA" >&2
  exit 1
fi

if [[ -z "$PROVISION_PROFILE" || ! -f "$PROVISION_PROFILE" ]]; then
  echo "Usage: $0 <unsigned.ipa> <profile.mobileprovision> \"<Signing Identity>\" [signed-output.ipa]" >&2
  echo "" >&2
  echo "Available signing identities in your macOS Keychain:" >&2
  security find-identity -v -p codesigning || true
  exit 1
fi

if [[ -z "$SIGNING_IDENTITY" ]]; then
  echo "Error: Signing Identity is required." >&2
  security find-identity -v -p codesigning || true
  exit 1
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "1. Extracting $UNSIGNED_IPA..."
unzip -q "$UNSIGNED_IPA" -d "$WORK_DIR"
APP_BUNDLE="$(find "$WORK_DIR/Payload" -maxdepth 1 -name "*.app" | head -n 1)"

if [[ -z "$APP_BUNDLE" || ! -d "$APP_BUNDLE" ]]; then
  echo "Error: Could not locate .app bundle inside Payload/" >&2
  exit 1
fi

echo "2. Decoding provisioning profile & extracting entitlements..."
security cms -D -i "$PROVISION_PROFILE" > "$WORK_DIR/profile.plist"
/usr/libexec/PlistBuddy -x -c "Print :Entitlements" "$WORK_DIR/profile.plist" > "$WORK_DIR/entitlements.plist"

echo "3. Embedding embedded.mobileprovision..."
cp "$PROVISION_PROFILE" "$APP_BUNDLE/embedded.mobileprovision"

# Optional: sync bundle identifier from provisioning profile if non-wildcard
PROFILE_APP_ID="$(/usr/libexec/PlistBuddy -c "Print :Entitlements:application-identifier" "$WORK_DIR/profile.plist" 2>/dev/null || true)"
TEAM_PREFIX="$(/usr/libexec/PlistBuddy -c "Print :ApplicationIdentifierPrefix:0" "$WORK_DIR/profile.plist" 2>/dev/null || true)"
if [[ -n "$PROFILE_APP_ID" && -n "$TEAM_PREFIX" ]]; then
  EXTRACTED_BUNDLE_ID="${PROFILE_APP_ID#${TEAM_PREFIX}.}"
  if [[ "$EXTRACTED_BUNDLE_ID" != *"*"* ]]; then
    echo "   Setting CFBundleIdentifier to $EXTRACTED_BUNDLE_ID"
    /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $EXTRACTED_BUNDLE_ID" "$APP_BUNDLE/Info.plist"
  fi
fi

echo "4. Signing frameworks & dylibs (if any)..."
if [[ -d "$APP_BUNDLE/Frameworks" ]]; then
  find "$APP_BUNDLE/Frameworks" \( -name "*.framework" -o -name "*.dylib" \) -print0 | while IFS= read -r -d '' fw; do
    /usr/bin/codesign --force --sign "$SIGNING_IDENTITY" --generate-entitlement-der "$fw"
  done
fi

echo "5. Signing application bundle for iOS 12.0+..."
/usr/bin/codesign --force --sign "$SIGNING_IDENTITY" \
  --entitlements "$WORK_DIR/entitlements.plist" \
  --generate-entitlement-der \
  "$APP_BUNDLE"

echo "6. Verifying signature..."
/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"

echo "7. Packaging signed IPA to $OUTPUT_IPA..."
rm -f "$OUTPUT_IPA"
(cd "$WORK_DIR" && /usr/bin/zip -qry "$OLDPWD/$OUTPUT_IPA" Payload)

echo "Done! Signed IPA written to: $OUTPUT_IPA"
