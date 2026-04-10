import { ForbiddenError } from "@/lib/errors";
import { commentService } from "@/services/comment.service";
import { commentId, createCommentInputSchema, getAllCommentsSchema, updateCommentInputSchema } from "@/validators/comment.validator";
import Elysia from "elysia";
import z from "zod";

export const commentController = new Elysia({ name: "comment", prefix: "/comment" })
    .post("/", async ({
        body,
        // @ts-ignore
        user
    }) => {
        const result = await commentService.create(body, user.id);
        return result.toJSON();
    }, {
        body: createCommentInputSchema,
        auth: true,
        detail: {
            summary: "Create Comment",
            description: "Create a new comment on a post. The authenticated user becomes the author.",
            tags: ["Comment"],
        },
    })
    .get("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await commentService.getById(params.id);

        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        const isAuthor = result.authorId === user.id;
        if (!isAdminOrModerator && !isAuthor) {
            throw new ForbiddenError("Cannot access comment", { userId: user.id, userRole: user.role, commentAuthorId: result.authorId });
        }

        return result.toJSON();
    }, {
        params: z.object({ id: commentId }),
        auth: true,
        detail: {
            summary: "Get Comment by ID",
            description: "Retrieve a comment by its unique identifier. Only the comment author, ADMIN, or MODERATOR can access this endpoint.",
            tags: ["Comment"],
        },
    })
    .get("/", async ({
        query
    }) => {
        const result = await commentService.getAll(query);
        return result.map(c => c.toJSON());
    }, {
        query: getAllCommentsSchema,
        detail: {
            summary: "Get All Comments",
            description: "Retrieve a list of comments, optionally filtered by postId. No authentication required.",
            tags: ["Comment"],
        },
    })
    .patch("/", async ({
        body,
        // @ts-ignore
        user
    }) => {
        // Check authorship before modifying — only the author can edit content
        const existing = await commentService.getById(body.id);
        const isAuthor = existing.authorId === user.id;
        if (!isAuthor) {
            throw new ForbiddenError("Only the comment author can modify comment content", { userId: user.id, commentAuthorId: existing.authorId });
        }

        const result = await commentService.update(body);
        return result.toJSON();
    }, {
        body: updateCommentInputSchema,
        auth: true,
        detail: {
            summary: "Update Comment",
            description: "Update a comment's content. Only the comment author can modify it.",
            tags: ["Comment"],
        },
    })
    .delete("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const existing = await commentService.getById(params.id);
        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        const isAuthor = existing.authorId === user.id;
        if (!isAdminOrModerator && !isAuthor) {
            throw new ForbiddenError("Cannot delete comment", { userId: user.id, userRole: user.role, commentAuthorId: existing.authorId });
        }

        const result = await commentService.delete(params.id, user.id);
        return result.toJSON();
    }, {
        params: z.object({ id: commentId }),
        auth: true,
        detail: {
            summary: "Delete Comment",
            description: "Soft-delete a comment. ADMIN, MODERATOR, or the comment author can delete. A comment deleted by admin/mod cannot be restored by the author.",
            tags: ["Comment"],
        },
    })
    .get("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await commentService.restore(params.id, user.id, user.role);
        return result.toJSON();
    }, {
        params: z.object({ id: commentId }),
        auth: true,
        detail: {
            summary: "Restore Comment",
            description: "Restore a soft-deleted comment. ADMIN/MODERATOR can always restore. Authors can only restore if they performed the deletion themselves.",
            tags: ["Comment"],
        },
    })
    .post("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await commentService.restore(params.id, user.id, user.role);
        return result.toJSON();
    }, {
        params: z.object({ id: commentId }),
        auth: true,
        detail: {
            summary: "Restore Comment",
            description: "Restore a soft-deleted comment. ADMIN/MODERATOR can always restore. Authors can only restore if they performed the deletion themselves.",
            tags: ["Comment"],
        },
    })
    .delete("/hard/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const isAdmin = user.role === "ADMIN";
        if (!isAdmin) {
            throw new ForbiddenError("Cannot hard delete comment", { userId: user.id, userRole: user.role });
        }

        await commentService.hardDelete(params.id);
        return { message: "Comment permanently deleted" };
    }, {
        params: z.object({ id: commentId }),
        auth: true,
        detail: {
            summary: "Hard Delete Comment",
            description: "Permanently delete a comment. Only ADMIN can perform this action.",
            tags: ["Comment"],
        },
    })
