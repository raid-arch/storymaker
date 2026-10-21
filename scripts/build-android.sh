#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# A developer's signing material stays outside git; CI supplies the same values as secrets.
if [[ -f .android-signing/signing.env && -z "${ANDROID_KEYSTORE_PATH:-}" ]]; then
  set -a
  source .android-signing/signing.env
  set +a
fi
: "${ANDROID_KEYSTORE_PATH:?Set ANDROID_KEYSTORE_PATH to the private release signing keystore}"
: "${ANDROID_KEYSTORE_PASSWORD:?Set ANDROID_KEYSTORE_PASSWORD}"
export ANDROID_VERSION_NAME="$(node -p 'JSON.parse(require("fs").readFileSync("android-version.json","utf8")).versionName')"
export ANDROID_VERSION_CODE="$(node -p 'JSON.parse(require("fs").readFileSync("android-version.json","utf8")).versionCode')"
npm run typecheck
npm run build:android
(cd android && ./gradlew --no-daemon assembleRelease lintRelease)
node scripts/package-android.mjs
