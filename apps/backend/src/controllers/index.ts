import { Elysia } from "elysia";

/**
 * Aggregated API routes with shared error handling.
 */
export const apiRoutes = new Elysia({ prefix: "/api" })
  // Mount all routes

