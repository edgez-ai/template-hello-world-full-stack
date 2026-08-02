import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

export const infraDir = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(infraDir, "..");
const localEnvFile = path.join(rootDir, ".env.local");

// Values injected into the workspace pod remain authoritative; load the
// repository defaults only for variables that are not already in the process.
if (existsSync(localEnvFile)) {
  loadEnvFile(localEnvFile);
}

const cli = path.join(infraDir, "node_modules", ".bin", "appwrite");
export const dryRun = process.env.INFRA_DRY_RUN === "1";

if (!existsSync(cli)) {
  console.error("Appwrite CLI is not installed. Run npm install in infra/ first.");
  process.exit(1);
}

const required = [
  "APP_NAME",
  "DOMAIN_SUFFIX",
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_PROJECT_NAME",
  "APPWRITE_API_KEY",
  "DATABASE_ID",
  "TABLE_ID",
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

export const config = {
  name: process.env.APP_NAME,
  domainSuffix: process.env.DOMAIN_SUFFIX,
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  projectName: process.env.APPWRITE_PROJECT_NAME,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.DATABASE_ID,
  tableId: process.env.TABLE_ID,
  pollIntervalMs: process.env.POLL_INTERVAL_MS || "2000",
};

export const domainPrefix = `${config.projectName}-${config.name}`;

if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
  throw new Error("APP_NAME must be a lowercase DNS-safe prefix");
}
if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(config.projectName)) {
  throw new Error("APPWRITE_PROJECT_NAME must be a lowercase DNS-safe prefix");
}
if (domainPrefix.length > 63) {
  throw new Error("APPWRITE_PROJECT_NAME plus APP_NAME must fit in one 63-character DNS label");
}
if (!/^[a-z0-9.-]+$/.test(config.domainSuffix)) {
  throw new Error("DOMAIN_SUFFIX must be a valid lowercase DNS suffix");
}

function display(args) {
  return ["appwrite", ...args]
    .map((value) => (value === config.apiKey ? "<redacted>" : value))
    .join(" ");
}

export function run(args, options = {}) {
  const cwd = options.cwd || infraDir;
  if (dryRun) {
    console.log(`[dry-run] ${display(args)}`);
    return { status: options.probe ? 1 : 0, stdout: "" };
  }

  const result = spawnSync(cli, args, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (!options.allowFailure && result.status !== 0) {
    if (options.capture) process.stderr.write(result.stderr || result.stdout || "");
    throw new Error(`Command failed: ${display(args)}`);
  }
  return result;
}

export function exists(args) {
  return run(args, { capture: true, allowFailure: true, probe: true }).status === 0;
}

export function ensure(label, probeArgs, createArgs) {
  if (exists(probeArgs)) {
    console.log(`Kept existing ${label}`);
    return;
  }
  run(createArgs);
  console.log(`Created ${label}`);
}

export function ensureResourceVariable(group, resourceFlag, resourceId, key, value) {
  if (dryRun) {
    run([
      group, "create-variable",
      resourceFlag, resourceId,
      "--key", key,
      "--value", value,
      "--secret", "false",
    ]);
    return;
  }

  const result = run(
    [group, "list-variables", resourceFlag, resourceId, "--json"],
    { capture: true },
  );
  const variables = JSON.parse(result.stdout).variables || [];
  const current = variables.find((variable) => variable.key === key);
  if (current) {
    run([
      group, "update-variable",
      resourceFlag, resourceId,
      "--variable-id", current.$id,
      "--key", key,
      "--value", value,
      "--secret", "false",
    ]);
    console.log(`Updated ${group} variable ${key}`);
    return;
  }
  run([
    group, "create-variable",
    resourceFlag, resourceId,
    "--key", key,
    "--value", value,
    "--secret", "false",
  ]);
  console.log(`Created ${group} variable ${key}`);
}

export function ensureProxyDomain(type, resourceId, domain) {
  const domainExists = !dryRun && run(
    ["proxy", "list-rules", "--where", `domain=${domain}`, "--limit", "1", "--json"],
    { capture: true },
  ).stdout.includes(domain);
  if (domainExists) {
    console.log(`Kept existing ${type} domain ${domain}`);
    return;
  }

  const createCommand = type === "Function"
    ? ["proxy", "create-function-rule", "--domain", domain, "--function-id", resourceId]
    : ["proxy", "create-site-rule", "--domain", domain, "--site-id", resourceId];
  run(createCommand);
  console.log(`Created ${type} domain ${domain}`);
}

export function configureClient() {
  run([
    "client",
    "--endpoint", config.endpoint,
    "--project-id", config.projectId,
    "--key", config.apiKey,
  ]);
}
