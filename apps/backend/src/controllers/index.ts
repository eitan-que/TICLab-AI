import { Elysia } from "elysia";
import { categoryController } from "@/controllers/category.controller";

/**
 * Aggregated API routes with shared error handling.
 */
export const apiRoutes = new Elysia({ prefix: "/v1" })
  // Mount all routes
  .use(categoryController)

