import { Client, ID, Query, TablesDB } from "node-appwrite";

const DATABASE_ID = process.env.DATABASE_ID;
const TABLE_ID = process.env.TABLE_ID;
const allowedSources = new Set(["web", "mobile", "api"]);

function reply(res, payload, status = 200) {
  return res.json(payload, status, {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "cache-control": "no-store",
  });
}

function publicMessage(row) {
  if (!row) return null;
  return {
    id: row.$id,
    message: row.message,
    echo: row.echo,
    source: row.source,
    createdAt: row.$createdAt,
  };
}

function requestBody(req) {
  if (req.bodyJson && typeof req.bodyJson === "object") return req.bodyJson;
  if (!req.body) return {};
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export default async function main({ req, res, error }) {
  if (req.method === "OPTIONS") return reply(res, {}, 204);

  if (!DATABASE_ID || !TABLE_ID) {
    return reply(res, { error: "Function database environment is incomplete" }, 500);
  }

  const path = (req.path || "/").replace(/\/+$/, "") || "/";
  if (path !== "/" && path !== "/message") {
    return reply(res, { error: "Route not found" }, 404);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const tables = new TablesDB(client);

  try {
    if (req.method === "GET") {
      const result = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.orderDesc("$createdAt"), Query.limit(1)],
      });
      return reply(res, { message: publicMessage(result.rows[0]) });
    }

    if (req.method === "POST") {
      const body = requestBody(req);
      const message = typeof body.message === "string" ? body.message.trim() : "";
      const source = allowedSources.has(body.source) ? body.source : "api";

      if (!message) return reply(res, { error: "message is required" }, 400);
      if (message.length > 120) {
        return reply(res, { error: "message must be 120 characters or fewer" }, 400);
      }

      const row = await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: ID.unique(),
        data: { message, echo: `Hello ${message}`, source },
      });
      return reply(res, { message: publicMessage(row) }, 201);
    }

    return reply(res, { error: "Method not allowed" }, 405);
  } catch (caught) {
    error(caught instanceof Error ? caught.message : String(caught));
    return reply(res, { error: "Appwrite request failed" }, 500);
  }
}
