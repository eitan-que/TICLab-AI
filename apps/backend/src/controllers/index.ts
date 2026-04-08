import { Elysia } from "elysia";
import { categoryController } from "@/controllers/category.controller";
import { postController } from "@/controllers/post.controller";
import { commentController } from "@/controllers/comment.controller";
import { voteController } from "@/controllers/vote.controller";
import { tagController } from "@/controllers/tag.controller";

/**
 * Aggregated API routes with shared error handling.
 */
export const apiRoutes = new Elysia({ prefix: "/v1" })
  // Mount all routes
  .use(categoryController)
  .use(postController)
  .use(commentController)
  .use(voteController)
  .use(tagController)
