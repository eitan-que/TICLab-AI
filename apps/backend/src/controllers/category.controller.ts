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
            description: "Create a new category. The authenticated user will be set as the creator of the category.",
            tags: ["Category"],
        },
    })
    .get("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await categoryService.getById(params.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: categoryId,
        }),
        detail: {
            summary: "Get Category by ID",
            description: "Retrieve a category by its unique identifier.",
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
        const result = await categoryService.delete(params.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: categoryId,
        }),
        auth: true,
        detail: {
            summary: "Delete Category",
            description: "Delete a category by its unique identifier.",
            tags: ["Category"],
        },
    })
    .get("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await categoryService.restore(params.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: categoryId,
        }),
        auth: true,
        detail: {
            summary: "Restore Category",
            description: "Restore a previously deleted category by its unique identifier.",
            tags: ["Category"],
        },
    })
    .post("/restore/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        const result = await categoryService.restore(params.id);
        return result.toJSON();
    }, {
        params: z.object({
            id: categoryId,
        }),
        auth: true,
        detail: {
            summary: "Restore Category",
            description: "Restore a previously deleted category by its unique identifier.",
            tags: ["Category"],
        },
    })
    .delete("/hard/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        await categoryService.hardDelete(params.id);
        return { message: "Category permanently deleted" };
    }, {
        params: z.object({
            id: categoryId,
        }),
        auth: true,
        detail: {
            summary: "Hard Delete Category",
            description: "Permanently delete a category by its unique identifier. This action cannot be undone.",
            tags: ["Category"],
        },
    })