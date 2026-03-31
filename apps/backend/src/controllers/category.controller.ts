import { categoryService } from "@/services/category.service";
import { CreateCategoryInput, createCategoryInputSchema } from "@/validators/category.validator";
import Elysia from "elysia";

export const categoryController = new Elysia({ name: "category", prefix: "/category" })
    .get("/ok", () => {
        return {
            ok: true,
        };
    })
    .post("/", async ({ 
        body,
        // @ts-ignore
        user
    }) => {
        console.log(user);
        const result = await categoryService.create({
            name: body.name,
            creatorId: user.id
        });
        return result;
    }, {
        body: createCategoryInputSchema.omit({ creatorId: true}),
        auth: true,
    })