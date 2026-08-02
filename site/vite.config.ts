import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const name = process.env.HELLO_CHANNELS_APP_NAME || process.env.APP_NAME;
const projectName = process.env.HELLO_CHANNELS_PROJECT_NAME || process.env.APPWRITE_PROJECT_NAME;
const domainSuffix = process.env.HELLO_CHANNELS_DOMAIN_SUFFIX || process.env.DOMAIN_SUFFIX;
const pollIntervalMs = Number(
  process.env.HELLO_CHANNELS_POLL_INTERVAL_MS || process.env.POLL_INTERVAL_MS || "2000",
);

if (!name || !projectName || !domainSuffix) {
  throw new Error("APP_NAME, APPWRITE_PROJECT_NAME, and DOMAIN_SUFFIX must be exported before running Vite");
}

const domainPrefix = `${projectName}-${name}`;

export default defineConfig({
  plugins: [react()],
  define: {
    __FUNCTION_URL__: JSON.stringify(`https://${domainPrefix}.functions.${domainSuffix}`),
    __POLL_INTERVAL_MS__: JSON.stringify(pollIntervalMs),
  },
});
