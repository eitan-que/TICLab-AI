import { ForbiddenError } from "@/lib/errors";
import { tagService } from "@/services/tag.service";
import { createTagInputSchema, getAllTagsSchema, tagId, updateTagInputSchema } from "@/validators/tag.validator";
import Elysia from "elysia";
import z from "zod";

export const tagController = new Elysia({ name: "tag", prefix: "/tag" })
    .post("/", async ({
        body,
        // @ts-ignore
        user
    }) => {
        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        if (!isAdminOrModerator) {
            throw new ForbiddenError("Only ADMIN or MODERATOR can create tags", { userId: user.id, userRole: user.role });
        }

        const result = await tagService.create(body, user.id);
        return result.toJSON();
    }, {
        body: createTagInputSchema,
        auth: true,
        detail: {
            summary: "Create Tag",
            description: "Create a new tag. Only ADMIN or MODERATOR can create tags.",
            tags: ["Tag"],
        },
    })
    .get("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        if (!isAdminOrModerator) {
            throw new ForbiddenError("Only ADMIN or MODERATOR can access tags by ID", { userId: user.id, userRole: user.role });
        }

        const result = await tagService.getById(params.id);
        return result.toJSON();
    }, {
        params: z.object({ id: tagId }),
        auth: true,
        detail: {
            summary: "Get Tag by ID",
            description: "Retrieve a tag by its unique identifier. Only ADMIN or MODERATOR can access this endpoint.",
            tags: ["Tag"],
        },
    })
    .get("/", async ({
        query
    }) => {
        const result = await tagService.getAll(query);
        return result.map(t => t.toJSON());
    }, {
        query: getAllTagsSchema,
        detail: {
            summary: "Get All Tags",
            description: "Retrieve a list of all tags. No authentication required.",
            tags: ["Tag"],
        },
    })
    .patch("/", async ({
        body,
        // @ts-ignore
        user
    }) => {
        const isAdmin = user.role === "ADMIN";
        if (!isAdmin) {
            throw new ForbiddenError("Only ADMIN can update tags", { userId: user.id, userRole: user.role });
        }

        const result = await tagService.update(body);
        return result.toJSON();
    }, {
        body: updateTagInputSchema,
        auth: true,
        detail: {
            summary: "Update Tag",
            description: "Update a tag's name. Only ADMIN can update tags.",
            tags: ["Tag"],
        },
    })
    .delete("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        if (!isAdminOrModerator) {
            throw new ForbiddenError("Only ADMIN or MODERATOR can delete tags", { userId: user.id, userRole: user.role });
        }

        const result = await tagService.delete(params.id);
        return result.toJSON();
    }, {
        params: z.object({ id: tagId }),
        auth: true,
        detail: {
            summary: "Delete Tag",
            description: "Soft-delete a tag. Only ADMIN or MODERATOR can delete tags.",
            tags: ["Tag"],
        },
    })
    .get("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        if (!isAdminOrModerator) {
            throw new ForbiddenError("Only ADMIN or MODERATOR can restore tags", { userId: user.id, userRole: user.role });
        }

        const result = await tagService.restore(params.id);
        return result.toJSON();
    }, {
        params: z.object({ id: tagId }),
        auth: true,
        detail: {
            summary: "Restore Tag",
            description: "Restore a soft-deleted tag. Only ADMIN or MODERATOR can restore tags.",
            tags: ["Tag"],
        },
    })
    .post("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const isAdminOrModerator = user.role === "ADMIN" || user.role === "MODERATOR";
        if (!isAdminOrModerator) {
            throw new ForbiddenError("Only ADMIN or MODERATOR can restore tags", { userId: user.id, userRole: user.role });
        }

        const result = await tagService.restore(params.id);
        return result.toJSON();
    }, {
        params: z.object({ id: tagId }),
        auth: true,
        detail: {
            summary: "Restore Tag",
            description: "Restore a soft-deleted tag. Only ADMIN or MODERATOR can restore tags.",
            tags: ["Tag"],
        },
    })
    .delete("/hard/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const isAdmin = user.role === "ADMIN";
        if (!isAdmin) {
            throw new ForbiddenError("Only ADMIN can permanently delete tags", { userId: user.id, userRole: user.role });
        }

        await tagService.hardDelete(params.id);
        return { message: "Tag permanently deleted" };
    }, {
        params: z.object({ id: tagId }),
        auth: true,
        detail: {
            summary: "Hard Delete Tag",
            description: "Permanently delete a tag. Only ADMIN can perform this action.",
            tags: ["Tag"],
        },
    })
