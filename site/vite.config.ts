import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const name = process.env.APP_NAME;
const projectId = process.env.APPWRITE_PROJECT_ID;
const domainSuffix = process.env.DOMAIN_SUFFIX;
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || "2000");

if (!name || !projectId || !domainSuffix) {
  throw new Error("APP_NAME, APPWRITE_PROJECT_ID, and DOMAIN_SUFFIX must be exported before running Vite");
}

const domainPrefix = `${projectId}-${name}`;

export default defineConfig({
  plugins: [react()],
  define: {
    __FUNCTION_URL__: JSON.stringify(`https://${domainPrefix}.functions.${domainSuffix}`),
    __POLL_INTERVAL_MS__: JSON.stringify(pollIntervalMs),
  },
});
