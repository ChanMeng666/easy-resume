import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** Singleton Neon database client. */
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

/** @deprecated Use `db` directly. Kept for migration compatibility. */
export function getDb() {
  return db;
}
