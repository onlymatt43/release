import { createClient, type Client } from "@libsql/client";

let _db: Client | null = null;

export function getDb(): Client {
  if (_db) return _db;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url)       throw new Error("Missing env variable: TURSO_DATABASE_URL");
  if (!authToken) throw new Error("Missing env variable: TURSO_AUTH_TOKEN");

  _db = createClient({ url, authToken });
  return _db;
}

/** @deprecated Use getDb() instead */
export const db = new Proxy({} as Client, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
