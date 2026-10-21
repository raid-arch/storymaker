import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "jp.raidarch.tsuzuriniwa",
  appName: "綴庭",
  webDir: "dist",
  server: { androidScheme: "https" },
  android: {
    allowMixedContent: false,
    backgroundColor: "#111a17",
  },
};
export default config;
