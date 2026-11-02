#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Sign an unsigned iOS 12.0+ IPA directly on an Android phone using Termux!
#
# How to use on Android:
# 1. Place QuranReader-unsigned.ipa, cert.p12, and profile.mobileprovision
#    in your Android phone's Download folder (/sdcard/Download/).
# 2. Open Termux and run:
#    termux-setup-storage
#    pkg update -y && pkg install -y git clang openssl libzip zlib
#    bash /sdcard/Download/sign-ipa-android-termux.sh "YOUR_P12_PASSWORD"

P12_PASS="${1:-}"
DOWNLOAD_DIR="/sdcard/Download"
UNSIGNED_IPA="${2:-$DOWNLOAD_DIR/QuranReader-unsigned.ipa}"
P12_FILE="${3:-$DOWNLOAD_DIR/cert.p12}"
PROVISION_FILE="${4:-$DOWNLOAD_DIR/profile.mobileprovision}"
OUT_IPA="${5:-$DOWNLOAD_DIR/QuranReader-signed.ipa}"

if ! command -v zsign >/dev/null 2>&1; then
  echo "Installing dependencies and compiling zsign in Termux..."
  pkg update -y
  pkg install -y git clang openssl libzip zlib
  rm -rf "$HOME/zsign-build"
  git clone --depth 1 https://github.com/zhlynn/zsign.git "$HOME/zsign-build"
  clang++ "$HOME/zsign-build/"*.cpp "$HOME/zsign-build/common/"*.cpp \
    -lcrypto -lzip -lz -O3 -o "$PREFIX/bin/zsign"
  rm -rf "$HOME/zsign-build"
fi

if [[ ! -f "$UNSIGNED_IPA" ]]; then
  echo "Error: Could not find $UNSIGNED_IPA" >&2
  echo "Make sure QuranReader-unsigned.ipa is in your Android Download folder and you ran 'termux-setup-storage'." >&2
  exit 1
fi

if [[ ! -f "$P12_FILE" || ! -f "$PROVISION_FILE" ]]; then
  echo "Error: Missing $P12_FILE or $PROVISION_FILE in your Download folder." >&2
  exit 1
fi

echo "Signing IPA on Android using zsign..."
zsign -k "$P12_FILE" -p "$P12_PASS" -m "$PROVISION_FILE" -o "$OUT_IPA" -z 9 "$UNSIGNED_IPA"
echo "Done! Signed IPA saved to your Android Download folder:"
echo "  $OUT_IPA"
