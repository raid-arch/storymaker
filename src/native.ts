import { Capacitor, registerPlugin } from "@capacitor/core";
export const isAndroidApp =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
export interface AndroidUpdate {
  available: boolean;
  versionName: string;
  versionCode: number;
  installedVersion: string;
  apkUrl?: string;
  sha256?: string;
}
interface StorymakerPlugin {
  googleAuthorize(options: {
    interactive: boolean;
    email: string;
  }): Promise<{ accessToken: string }>;
  checkUpdate(): Promise<AndroidUpdate>;
  installUpdate(): Promise<{ permissionRequired?: boolean }>;
  exportFile(options: {
    name: string;
    type: string;
    text: string;
  }): Promise<{ saved: boolean }>;
  minimize(): Promise<void>;
}
export const AndroidApp = registerPlugin<StorymakerPlugin>("Storymaker");
export async function saveTextFile(
  text: string,
  type: string,
  name: string,
): Promise<boolean> {
  if (isAndroidApp)
    return (
      await AndroidApp.exportFile({ name, type: type.split(";")[0], text })
    ).saved;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
