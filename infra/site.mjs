import {
  config,
  domainPrefix,
  ensureProxyDomain,
  ensureResourceVariable,
  exists,
  infraDir,
  run,
} from "./appwrite.mjs";

export function installSite() {
  const siteId = `${config.name}-site`;
  const settings = [
    "--site-id", siteId,
    "--name", `${config.name} web`,
    "--framework", "react",
    "--build-runtime", "node-22",
    "--enabled", "true",
    "--logging", "true",
    "--timeout", "30",
    "--install-command", "npm install",
    "--build-command", "npm run build",
    "--output-directory", "dist",
    "--adapter", "static",
    "--fallback-file", "index.html",
  ];

  if (exists(["sites", "get", "--site-id", siteId])) {
    run(["sites", "update", ...settings]);
    console.log(`Updated Site ${siteId}`);
  } else {
    run(["sites", "create", ...settings]);
    console.log(`Created Site ${siteId}`);
  }

  const variables = [
    ["APP_NAME", config.name],
    ["APPWRITE_PROJECT_NAME", config.projectName],
    ["DOMAIN_SUFFIX", config.domainSuffix],
    ["POLL_INTERVAL_MS", config.pollIntervalMs],
  ];
  for (const [key, value] of variables) {
    ensureResourceVariable("sites", "--site-id", siteId, key, value);
  }

  run([
    "sites", "create-deployment",
    "--site-id", siteId,
    "--code", "../site",
    "--install-command", "npm install",
    "--build-command", "npm run build",
    "--output-directory", "dist",
    "--activate", "true",
  ], { cwd: infraDir });

  const domain = `${domainPrefix}.sites.${config.domainSuffix}`;
  ensureProxyDomain("Site", siteId, domain);
  console.log(`Site URL: https://${domain}`);
}
