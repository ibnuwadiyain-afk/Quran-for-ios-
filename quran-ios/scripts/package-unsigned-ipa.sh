#!/bin/bash
set -euo pipefail

APP="${1:-build/Build/Products/Release-iphoneos/Quran Reader.app}"
OUT="${2:-QuranReader-unsigned.ipa}"

if [[ ! -d "$APP" ]]; then
  echo "Error: App bundle not found at: $APP" >&2
  exit 1
fi

BIN="$APP/Quran Reader"
if [[ ! -f "$BIN" ]]; then
  echo "Error: Executable not found at: $BIN" >&2
  exit 1
fi

# 1. Ensure PkgInfo exists for legacy iOS 12 installers
if [[ ! -f "$APP/PkgInfo" ]]; then
  printf "APPL????" > "$APP/PkgInfo"
fi

# 2. Verify and ensure /usr/lib/swift and @executable_path/Frameworks are in LC_RPATH
if ! otool -l "$BIN" | grep -q "/usr/lib/swift"; then
  echo "Adding /usr/lib/swift to LC_RPATH..."
  install_name_tool -add_rpath "/usr/lib/swift" "$BIN" 2>/dev/null || true
fi
if ! otool -l "$BIN" | grep -q "@executable_path/Frameworks"; then
  echo "Adding @executable_path/Frameworks to LC_RPATH..."
  install_name_tool -add_rpath "@executable_path/Frameworks" "$BIN" 2>/dev/null || true
fi

# 3. Copy Swift 5.0 standard library dylibs into Frameworks/ (required when CODE_SIGNING_ALLOWED=NO skips CopySwiftLibs)
XCODE_DEV="$(xcode-select -p)"
SWIFT_LIB_DIR=""
for candidate in \
  "$XCODE_DEV/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift-5.0/iphoneos" \
  "$XCODE_DEV/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/iphoneos"; do
  if [[ -d "$candidate" ]]; then
    SWIFT_LIB_DIR="$candidate"
    break
  fi
done

if [[ -n "$SWIFT_LIB_DIR" ]]; then
  mkdir -p "$APP/Frameworks"
  echo "Embedding Swift runtime libraries from $SWIFT_LIB_DIR..."
  # Collect direct and transitive @rpath/libswift*.dylib dependencies
  collect_deps() {
    local target="$1"
    otool -L "$target" 2>/dev/null | awk '/@rpath\/libswift.*\.dylib/ {print $1}' | sed 's|@rpath/||'
  }

  QUEUE=($(collect_deps "$BIN"))
  PROCESSED=""

  while [[ ${#QUEUE[@]} -gt 0 ]]; do
    LIB="${QUEUE[0]}"
    QUEUE=("${QUEUE[@]:1}")
    if [[ " $PROCESSED " == *" $LIB "* ]]; then
      continue
    fi
    PROCESSED="$PROCESSED $LIB"
    SRC_LIB="$SWIFT_LIB_DIR/$LIB"
    DST_LIB="$APP/Frameworks/$LIB"
    if [[ -f "$SRC_LIB" ]]; then
      if [[ ! -f "$DST_LIB" ]]; then
        if lipo -info "$SRC_LIB" 2>/dev/null | grep -q "arm64"; then
          lipo "$SRC_LIB" -thin arm64 -output "$DST_LIB" 2>/dev/null || cp "$SRC_LIB" "$DST_LIB"
        else
          cp "$SRC_LIB" "$DST_LIB"
        fi
        chmod 755 "$DST_LIB"
        echo "  Embedded $LIB"
      fi
      NEW_DEPS=($(collect_deps "$DST_LIB"))
      if [[ ${#NEW_DEPS[@]} -gt 0 ]]; then
        QUEUE+=("${NEW_DEPS[@]}")
      fi
    fi
  done
fi

# 4. Ad-hoc sign Frameworks/*.dylib and the main app bundle so iOS 12 kernel (amfid) sees valid LC_CODE_SIGNATURE headers
ENTITLEMENTS_TMP="$(mktemp -t entitlements.XXXXXX.plist)"
cat > "$ENTITLEMENTS_TMP" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>application-identifier</key>
    <string>org.quranreader.ios12</string>
    <key>get-task-allow</key>
    <true/>
</dict>
</plist>
EOF

if [[ -d "$APP/Frameworks" ]]; then
  for dylib in "$APP/Frameworks/"*.dylib; do
    if [[ -f "$dylib" ]]; then
      /usr/bin/codesign --force --sign "-" --timestamp=none "$dylib"
    fi
  done
fi

/usr/bin/codesign --force --sign "-" --timestamp=none --entitlements "$ENTITLEMENTS_TMP" "$APP"
rm -f "$ENTITLEMENTS_TMP"

echo "Verified LC_RPATH entries in binary:"
otool -l "$BIN" | grep -A 2 "LC_RPATH" || true

rm -rf Payload "$OUT"
mkdir -p Payload
cp -R "$APP" Payload/
/usr/bin/zip -qry "$OUT" Payload
rm -rf Payload

echo "Created $OUT (iOS 12.0+ compatible with embedded Swift runtime & ad-hoc signature)."
