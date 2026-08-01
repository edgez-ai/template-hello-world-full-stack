import { Client, TablesDB } from "node-appwrite";

const required = ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const databaseId = process.env.APPWRITE_DATABASE_ID;
const tableId = process.env.APPWRITE_TABLE_ID;
if (!databaseId || !tableId) {
  console.error("APPWRITE_DATABASE_ID and APPWRITE_TABLE_ID are required");
  process.exit(1);
}
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const tables = new TablesDB(client);

async function create(label, operation) {
  try {
    await operation();
    console.log(`Created ${label}`);
  } catch (error) {
    if (error?.code === 409) {
      console.log(`Kept existing ${label}`);
      return;
    }
    throw error;
  }
}

await create("database", () =>
  tables.create({ databaseId, name: "Hello World" }),
);
await create("messages table", () =>
  tables.createTable({ databaseId, tableId, name: "Messages", rowSecurity: false }),
);
await create("message column", () =>
  tables.createStringColumn({ databaseId, tableId, key: "message", size: 120, required: true }),
);
await create("echo column", () =>
  tables.createStringColumn({ databaseId, tableId, key: "echo", size: 126, required: true }),
);
await create("source column", () =>
  tables.createEnumColumn({
    databaseId,
    tableId,
    key: "source",
    elements: ["web", "mobile", "api"],
    required: true,
  }),
);

console.log("Appwrite schema is ready (column creation may take a few seconds)." );
