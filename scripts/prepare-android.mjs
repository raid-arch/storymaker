import { rmSync } from "node:fs";
// Distribution files belong to the website, never inside the APK being built.
rmSync("dist/downloads", { recursive: true, force: true });
rmSync("dist/android-release.json", { force: true });
