import { categoryService } from "@/services/category.service";
import { CreateCategoryInput, createCategoryInputSchema } from "@/validators/category.validator";
import Elysia from "elysia";

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
        return result;
    }, {
        body: createCategoryInputSchema.omit({ creatorId: true}),
        auth: true,
        detail: {
            summary: "Create Category",
            description: "Create a new category. The authenticated user will be set as the creator of the category.",
            tags: ["Category"],
        },
    })