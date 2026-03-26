import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { relations } from "@/db/relations";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle({ client, schema, relations });