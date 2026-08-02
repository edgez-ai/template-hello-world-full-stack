import {
  config,
  domainPrefix,
  ensureProxyDomain,
  ensureResourceVariable,
  exists,
  infraDir,
  run,
} from "./appwrite.mjs";

export function installFunction() {
  const functionId = config.name;
  const settings = [
    "--function-id", functionId,
    "--name", `${config.name} message API`,
    "--runtime", "node-24",
    "--execute", "any",
    "--timeout", "15",
    "--enabled", "true",
    "--logging", "true",
    "--entrypoint", "src/main.js",
    "--commands", "npm install",
    "--scopes", "rows.read", "rows.write",
  ];

  if (exists(["functions", "get", "--function-id", functionId])) {
    run(["functions", "update", ...settings]);
    console.log(`Updated Function ${functionId}`);
  } else {
    run(["functions", "create", ...settings]);
    console.log(`Created Function ${functionId}`);
  }

  ensureResourceVariable(
    "functions", "--function-id", functionId,
    "HELLO_CHANNELS_DATABASE_ID", config.databaseId,
  );
  ensureResourceVariable(
    "functions", "--function-id", functionId,
    "HELLO_CHANNELS_TABLE_ID", config.tableId,
  );

  run([
    "functions", "create-deployment",
    "--function-id", functionId,
    "--code", "../function",
    "--activate", "true",
    "--entrypoint", "src/main.js",
    "--commands", "npm install",
  ], { cwd: infraDir });

  const domain = `${domainPrefix}.functions.${config.domainSuffix}`;
  ensureProxyDomain("Function", functionId, domain);
  console.log(`Function URL: https://${domain}/message`);
}
