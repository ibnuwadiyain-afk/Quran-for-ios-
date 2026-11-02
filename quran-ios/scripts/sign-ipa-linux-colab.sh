#!/bin/bash
set -euo pipefail

# Sign an unsigned iOS 12.0+ IPA on Linux or Google Colab (No Mac required!)
# Uses open-source 'zsign' (https://github.com/zhlynn/zsign)
#
# Usage in Google Colab or Ubuntu Linux:
#   chmod +x scripts/sign-ipa-linux-colab.sh
#   ./scripts/sign-ipa-linux-colab.sh QuranReader-unsigned.ipa cert.p12 "your_p12_password" profile.mobileprovision QuranReader-signed.ipa

UNSIGNED_IPA="${1:-QuranReader-unsigned.ipa}"
P12_FILE="${2:-}"
P12_PASS="${3:-}"
PROVISION_FILE="${4:-}"
OUT_IPA="${5:-QuranReader-signed.ipa}"

if [[ ! -f "$UNSIGNED_IPA" ]]; then
  echo "Error: Unsigned IPA not found: $UNSIGNED_IPA" >&2
  exit 1
fi

if [[ -z "$P12_FILE" || ! -f "$P12_FILE" || -z "$PROVISION_FILE" || ! -f "$PROVISION_FILE" ]]; then
  echo "Usage: $0 <QuranReader-unsigned.ipa> <certificate.p12> <p12-password> <profile.mobileprovision> [QuranReader-signed.ipa]" >&2
  exit 1
fi

if ! command -v zsign >/dev/null 2>&1; then
  echo "Installing zsign dependencies & building zsign on Linux/Colab..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq git g++ libssl-dev libzip-dev zlib1g-dev unzip
  TMP_ZSIGN="$(mktemp -d)"
  git clone --depth 1 https://github.com/zhlynn/zsign.git "$TMP_ZSIGN/zsign"
  g++ "$TMP_ZSIGN/zsign/"*.cpp "$TMP_ZSIGN/zsign/common/"*.cpp -lcrypto -lzip -lz -O3 -o /usr/local/bin/zsign
  rm -rf "$TMP_ZSIGN"
fi

echo "Signing $UNSIGNED_IPA for iOS 12.0+ using zsign..."
zsign -k "$P12_FILE" -p "$P12_PASS" -m "$PROVISION_FILE" -o "$OUT_IPA" -z 9 "$UNSIGNED_IPA"
echo "Successfully signed IPA on Linux/Colab: $OUT_IPA"
