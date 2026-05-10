import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zenkaikitchen.pos",
  appName: "Zenkai Kitchen POS",
  webDir: "android-web",
  server: {
    url: "https://cafe-billing-gules.vercel.app/",
    cleartext: false,
  },
};

export default config;