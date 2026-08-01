import { config, ensure } from "./appwrite.mjs";

export function installDatabase() {
  ensure(
    "database",
    ["tables-db", "get", "--database-id", config.databaseId],
    ["tables-db", "create", "--database-id", config.databaseId, "--name", `${config.name} database`],
  );
  ensure(
    "messages table",
    ["tables-db", "get-table", "--database-id", config.databaseId, "--table-id", config.tableId],
    [
      "tables-db", "create-table",
      "--database-id", config.databaseId,
      "--table-id", config.tableId,
      "--name", "Messages",
      "--row-security", "false",
    ],
  );

  const columns = [
    { key: "message", type: "string", size: "120" },
    { key: "echo", type: "string", size: "126" },
    { key: "source", type: "enum", elements: ["web", "mobile", "api"] },
  ];
  for (const column of columns) {
    const base = [
      "--database-id", config.databaseId,
      "--table-id", config.tableId,
      "--key", column.key,
    ];
    const createArgs = column.type === "enum"
      ? ["tables-db", "create-enum-column", ...base, "--elements", ...column.elements, "--required", "true"]
      : ["tables-db", "create-string-column", ...base, "--size", column.size, "--required", "true"];
    ensure(
      `${column.key} column`,
      ["tables-db", "get-column", ...base],
      createArgs,
    );
  }
}

