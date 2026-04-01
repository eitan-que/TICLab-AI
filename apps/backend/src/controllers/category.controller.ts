import { ForbiddenError } from "@/lib/errors";
import { categoryService } from "@/services/category.service";
import { categoryId, categorySlug, createCategoryInputSchema, getAllCategoriesSchema, updateCategoryInputSchema } from "@/validators/category.validator";
import Elysia from "elysia";
import z from "zod";

export const categoryController = new Elysia({ name: "category", prefix: "/category" })
    .post("/", async ({ 
        body,
        // @ts-ignore
        user
    }) => {
        if (user.role !== "ADMIN") {
            throw new ForbiddenError("Cannot create category", { userId: user.id, userRole: user.role });
        }
        const result = await categoryService.create({
            name: body.name,
            creatorId: user.id
        });
        return result.toJSON();
    }, {
        body: createCategoryInputSchema.omit({ creatorId: true}),
        auth: true,
        detail: {
            summary: "Create Category",
            description: "Create a new category. Only users with the ADMIN role can create categories. The authenticated user's ID will be used as the creator of the category.",
            tags: ["Category"],
        },
    })
    .get("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
            throw new ForbiddenError("Cannot get category by id", { userId: user.id, userRole: user.role });
        }
        const result = await categoryService.getById(params.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: categoryId,
        }),
        detail: {
            summary: "Get Category by ID",
            description: "Retrieve a category by its unique identifier. Only users with the ADMIN or MODERATOR role can access this endpoint.",
            tags: ["Category"],
        },
    })
    .get("/slug/:slug", async ({
        params
    }) => {
        const result = await categoryService.getBySlug(params.slug);
        return result.toJSON();
    }, {
        params: z.object({
            slug: categorySlug,
        }),
        detail: {
            summary: "Get Category by Slug",
            description: "Retrieve a category by its unique slug.",
            tags: ["Category"],
        },
    })
    .get("/", async ({
        query
    }) => {
        const result = await categoryService.getAll(query);
        return result.map(category => category.toJSON());
    }, {
        query: getAllCategoriesSchema,
        detail: {
            summary: "Get All Categories",
            description: "Retrieve a list of all categories, with optional filtering and pagination.",
            tags: ["Category"],
        },
    })
    .patch("/", async ({
        body, 
        // @ts-ignore
        user 
    }) => {
        if (user.role !== "ADMIN") {
            throw new ForbiddenError("Cannot update category", { userId: user.id, userRole: user.role });
        }
        const result = await categoryService.update(body);
        return result.toJSON();
    }, {
        body: updateCategoryInputSchema,
        auth: true,
        detail: {
            summary: "Update Category",
            description: "Update an existing category. Only the name and slug can be updated.",
            tags: ["Category"],
        },
    })
    .delete("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        if (user.role !== "ADMIN") {
            throw new ForbiddenError("Cannot delete category", { userId: user.id, userRole: user.role });
        }
        const result = await categoryService.delete(params.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: categoryId,
        }),
        auth: true,
        detail: {
            summary: "Delete Category",
            description: "Delete a category by its unique identifier. This is a soft delete, meaning the category can be restored later if needed. Only users with the ADMIN role can delete categories.",
            tags: ["Category"],
        },
    })
    .get("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        if (user.role !== "ADMIN") {
            throw new ForbiddenError("Cannot restore category", { userId: user.id, userRole: user.role });
        }
        const result = await categoryService.restore(params.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: categoryId,
        }),
        auth: true,
        detail: {
            summary: "Restore Category",
            description: "Restore a previously deleted category by its unique identifier. Only users with the ADMIN role can restore categories.",
            tags: ["Category"],
        },
    })
    .post("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        if (user.role !== "ADMIN") {
            throw new ForbiddenError("Cannot restore category", { userId: user.id, userRole: user.role });
        }
        const result = await categoryService.restore(params.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: categoryId,
        }),
        auth: true,
        detail: {
            summary: "Restore Category",
            description: "Restore a previously deleted category by its unique identifier. Only users with the ADMIN role can restore categories.",
            tags: ["Category"],
        },
    })
    .delete("/hard/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        if (user.role !== "ADMIN") {
            throw new ForbiddenError("Cannot hard delete category", { userId: user.id, userRole: user.role });
        }
        await categoryService.hardDelete(params.id);
        return { message: "Category permanently deleted" };
    }, {
        params: z.object({
            id: categoryId,
        }),
        auth: true,
        detail: {
            summary: "Hard Delete Category",
            description: "Permanently delete a category by its unique identifier. This action cannot be undone. Only users with the ADMIN role can perform this action.",
            tags: ["Category"],
        },
    })