#!/bin/bash
set -euo pipefail

APP="${1:-build/Build/Products/Release-iphoneos/Quran Reader.app}"
OUT="${2:-QuranReader-unsigned.ipa}"

if [[ ! -d "$APP" ]]; then
  echo "Error: App bundle not found at: $APP" >&2
  echo "Run xcodebuild first with CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO." >&2
  exit 1
fi

if [[ ! -f "$APP/Info.plist" ]]; then
  echo "Error: Missing Info.plist inside $APP" >&2
  exit 1
fi

# Ensure PkgInfo is present for legacy iOS 12 installer compatibility
if [[ ! -f "$APP/PkgInfo" ]]; then
  printf "APPL????" > "$APP/PkgInfo"
fi

rm -rf Payload "$OUT"
mkdir -p Payload
cp -R "$APP" Payload/
/usr/bin/zip -qry "$OUT" Payload
rm -rf Payload

echo "Created $OUT (unsigned iOS 12.0+ IPA; sign with scripts/sign-ipa.sh before installing on a device)."
