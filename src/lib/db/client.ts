import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon database client using HTTP for serverless environments.
 * Uses connection pooling for optimal performance.
 */
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
