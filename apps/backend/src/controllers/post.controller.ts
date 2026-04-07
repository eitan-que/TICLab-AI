import { ForbiddenError } from "@/lib/errors";
import { postService } from "@/services/post.service";
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
            categoryId: body.categoryId
        });
        return result.toJSON();
    }, {
        body: createPostInputSchema.omit({ authorId: true }),
        auth: true,
        detail: {
            summary: "Create Post",
            description: "Create a new post. Only users with the ADMIN role can create posts. The authenticated user's ID will be used as the author of the post.",
            tags: ["Post"],
        },
    })
    .get("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";

        const result = await postService.getById(params.id);

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
            description: "Retrieve a post by its unique identifier. Only users with the ADMIN or MODERATOR role can access this endpoint.",
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
            description: "Retrieve a post by its unique slug.",
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
        const result = await postService.update(body);

        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        const isAuthor = result.authorId === user.id;
        if (!isAdminOrModerator && !isAuthor) {
            throw new ForbiddenError("Cannot update post", { userId: user.id, userRole: user.role, postAuthorId: result.authorId });
        }

        return result.toJSON();
    }, {
        body: updatePostInputSchema,
        auth: true,
        detail: {
            summary: "Update Post",
            description: "Update an existing post. Only the title, content, and categoryId can be updated.",
            tags: ["Post"],
        },
    })
    .delete("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await postService.delete(params.id);

        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        const isAuthor = result.authorId === user.id;
        if (!isAdminOrModerator && !isAuthor) {
            throw new ForbiddenError("Cannot delete post", { userId: user.id, userRole: user.role, postAuthorId: result.authorId });
        }

        return result.toJSON();
    }, {
        params: z.object({
            id: postId,
        }),
        auth: true,
        detail: {
            summary: "Delete Post",
            description: "Delete a post by its unique identifier. This is a soft delete, meaning the post can be restored later if needed. Only users with the ADMIN role can delete posts.",
            tags: ["Post"],
        },
    })
    .get("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await postService.restore(params.id);

        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        const isAuthor = result.authorId === user.id;
        if (!isAdminOrModerator && !isAuthor) {
            throw new ForbiddenError("Cannot restore post", { userId: user.id, userRole: user.role, postAuthorId: result.authorId });
        }

        return result.toJSON();
    }, {
        params: z.object({
            id: postId,
        }),
        auth: true,
        detail: {
            summary: "Restore Post",
            description: "Restore a previously deleted post by its unique identifier. Only users with the ADMIN role can restore posts.",
            tags: ["Post"],
        },
    })
    .post("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await postService.restore(params.id);

        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        const isAuthor = result.authorId === user.id;
        if (!isAdminOrModerator && !isAuthor) {
            throw new ForbiddenError("Cannot restore post", { userId: user.id, userRole: user.role, postAuthorId: result.authorId });
        }

        return result.toJSON();
    }, {
        params: z.object({
            id: postId,
        }),
        auth: true,
        detail: {
            summary: "Restore Post",
            description: "Restore a previously deleted post by its unique identifier. Only users with the ADMIN role can restore posts.",
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
            description: "Permanently delete a post by its unique identifier. This action cannot be undone. Only users with the ADMIN role can perform this action.",
            tags: ["Post"],
        },
    })