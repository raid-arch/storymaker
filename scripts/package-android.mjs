import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { versionName, versionCode } = JSON.parse(
  readFileSync("android-version.json", "utf8"),
);
if (
  !/^\d+\.\d+\.\d+$/.test(versionName) ||
  !Number.isInteger(versionCode) ||
  versionCode < 1
)
  throw new Error("Invalid Android version");
const apk = readFileSync(
  "android/app/build/outputs/apk/release/app-release.apk",
);
const name = `tsuzuriniwa-${versionName}.apk`;
const sha256 = createHash("sha256").update(apk).digest("hex");
mkdirSync("release-artifacts", { recursive: true });
copyFileSync(
  "android/app/build/outputs/apk/release/app-release.apk",
  `release-artifacts/${name}`,
);
copyFileSync(
  "android/app/build/outputs/apk/release/app-release.apk",
  "release-artifacts/tsuzuriniwa.apk",
);
writeFileSync(
  "release-artifacts/android-release.json",
  JSON.stringify(
    {
      versionName,
      versionCode,
      apkUrl: `https://github.com/raid-arch/storymaker/releases/download/android-v${versionName}/${name}`,
      sha256,
    },
    null,
    2,
  ) + "\n",
);
writeFileSync("release-artifacts/SHA256SUMS", `${sha256}  ${name}\n`);
console.log(`Packaged Android ${versionName} (${versionCode})`);
