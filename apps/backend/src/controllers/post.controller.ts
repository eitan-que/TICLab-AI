import { ForbiddenError } from "@/lib/errors";
import { postService } from "@/services/post.service";
import { tagService } from "@/services/tag.service";
import { createPostInputSchema, getAllPostsSchema, postId, postSlug, updatePostInputSchema } from "@/validators/post.validator";
import Elysia from "elysia";
import z from "zod";

export const postController = new Elysia({ name: "post", prefix: "/post" })
    .post("/", async ({
        body,
        // @ts-ignore
        user
    }) => {
        const result = await postService.create({
            title: body.title,
            content: body.content,
            authorId: user.id,
            categoryId: body.categoryId,
        });

        if (body.tags && body.tags.length > 0) {
            await tagService.syncTagsForPost(result.id, body.tags, user.id, user.role);
        }

        return result.toJSON();
    }, {
        body: createPostInputSchema.omit({ authorId: true }),
        auth: true,
        detail: {
            summary: "Create Post",
            description: "Create a new post. The authenticated user becomes the author.",
            tags: ["Post"],
        },
    })
    .get("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await postService.getById(params.id);

        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        const isAuthor = result.authorId === user.id;
        if (!isAdminOrModerator && !isAuthor) {
            throw new ForbiddenError("Cannot access post", { userId: user.id, userRole: user.role, postAuthorId: result.authorId });
        }

        return result.toJSON();
    }, {
        params: z.object({
            id: postId,
        }),
        auth: true,
        detail: {
            summary: "Get Post by ID",
            description: "Retrieve a post by its unique identifier. Only the post author, ADMIN, or MODERATOR can access this endpoint.",
            tags: ["Post"],
        },
    })
    .get("/slug/:slug", async ({
        params
    }) => {
        const result = await postService.getBySlug(params.slug);
        return result.toJSON();
    }, {
        params: z.object({
            slug: postSlug,
        }),
        detail: {
            summary: "Get Post by Slug",
            description: "Retrieve a published post by its unique slug. No authentication required.",
            tags: ["Post"],
        },
    })
    .get("/", async ({
        query
    }) => {
        const result = await postService.getAll(query);
        return result.map(post => post.toJSON());
    }, {
        query: getAllPostsSchema,
        detail: {
            summary: "Get All Posts",
            description: "Retrieve a list of all posts, with optional filtering and pagination.",
            tags: ["Post"],
        },
    })
    .patch("/", async ({
        body,
        // @ts-ignore
        user
    }) => {
        // Fetch the post first to check authorship before modifying
        const existing = await postService.getById(body.id);
        const isAuthor = existing.authorId === user.id;
        if (!isAuthor) {
            throw new ForbiddenError("Only the post author can modify post content", { userId: user.id, postAuthorId: existing.authorId });
        }

        const result = await postService.update(body);

        if (body.tags !== undefined) {
            await tagService.syncTagsForPost(result.id, body.tags, user.id, user.role);
        }

        return result.toJSON();
    }, {
        body: updatePostInputSchema,
        auth: true,
        detail: {
            summary: "Update Post",
            description: "Update an existing post. Only the post author can modify content.",
            tags: ["Post"],
        },
    })
    .delete("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const existing = await postService.getById(params.id);
        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        const isAuthor = existing.authorId === user.id;
        if (!isAdminOrModerator && !isAuthor) {
            throw new ForbiddenError("Cannot delete post", { userId: user.id, userRole: user.role, postAuthorId: existing.authorId });
        }

        const result = await postService.delete(params.id, user.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: postId,
        }),
        auth: true,
        detail: {
            summary: "Delete Post",
            description: "Soft-delete a post. ADMIN, MODERATOR, or the post author can delete. A post deleted by admin/mod cannot be restored by the author.",
            tags: ["Post"],
        },
    })
    .get("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await postService.restore(params.id, user.id, user.role);
        return result.toJSON();
    }, {
        params: z.object({
            id: postId,
        }),
        auth: true,
        detail: {
            summary: "Restore Post",
            description: "Restore a soft-deleted post. ADMIN/MODERATOR can always restore. Authors can only restore if they performed the deletion themselves.",
            tags: ["Post"],
        },
    })
    .post("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await postService.restore(params.id, user.id, user.role);
        return result.toJSON();
    }, {
        params: z.object({
            id: postId,
        }),
        auth: true,
        detail: {
            summary: "Restore Post",
            description: "Restore a soft-deleted post. ADMIN/MODERATOR can always restore. Authors can only restore if they performed the deletion themselves.",
            tags: ["Post"],
        },
    })
    .delete("/hard/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const isAdmin = user.role === "ADMIN";
        if (!isAdmin) {
            throw new ForbiddenError("Cannot hard delete post", { userId: user.id, userRole: user.role });
        }

        await postService.hardDelete(params.id);
        return { message: "Post permanently deleted" };
    }, {
        params: z.object({
            id: postId,
        }),
        auth: true,
        detail: {
            summary: "Hard Delete Post",
            description: "Permanently delete a post. Only ADMIN can perform this action.",
            tags: ["Post"],
        },
    })
