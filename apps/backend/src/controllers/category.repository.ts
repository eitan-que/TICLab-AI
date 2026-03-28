import { db } from "@/db/drizzle";
import { category } from "@/db/schema";
import { Category } from "@/domain/category.domain";
import { AppError, ParseZodError } from "@/lib/errors";
import { CreateCategory, createCategorySchema } from "@/validators/category.validator";
import { sql } from "drizzle-orm";
import { ZodError } from "zod";

class CategoryRepository {
    constructor() {
        
    }

    /**
     * ## Create Category
     * Creates a new category in the database using the provided data.
     * Validates the input data against the CreateCategory schema before attempting to insert it into the database.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param data - The data for the new category, which must conform to the CreateCategory schema.
     * @returns A promise that resolves to the newly created Category object.
     * @example
     * ```ts
     * const newCategory = await categoryRepository.createCategory({
     *   name: "New Category",
     *   slug: "new-category",
     *   createdBy: "user-id-123"
     * });
     * ```
     * @throws {BadRequestError} If the input data fails validation against the CreateCategory schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async createCategory(data: CreateCategory): Promise<Category> {
        try {
            const validatedData = createCategorySchema.parse(data);
            const result = await db.insert(category).values({
                name: validatedData.name,
                slug: validatedData.slug,
                createdBy: validatedData.createdBy,
            }).returning();

            if (result.length === 0) {
                throw new AppError("Failed to create category", "CATEGORY_CREATION_FAILED", 500);
            }

            const createdCategory = result[0];
            const newCategory = new Category(
                createdCategory.id,
                createdCategory.name,
                createdCategory.slug,
                createdCategory.createdBy,
                createdCategory.createdAt,
                createdCategory.updatedAt,
                createdCategory.deletedAt
            );

            return newCategory;
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category creation", "CATEGORY_CREATION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Category By ID
     * Retrieves a category from the database by its unique identifier.
     * If the category is found, it is returned as a Category object.
     * If no category is found with the given ID, null is returned.
     * If an unexpected error occurs during the database operation, an AppError is thrown with details about the error.
     * @param id - The unique identifier of the category to retrieve.
     * @returns A promise that resolves to the Category object if found, or null if no category exists with the given ID.
     * @example
     * ```ts
     * const category = await categoryRepository.getCategoryById("category-id-123");
     * if (category) {
     *   console.log("Category found:", category);
     * } else {
     *   console.log("Category not found");
     * }
     * ```
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async getCategoryById(id: string): Promise<Category | null> {
        try {
            const prepared = db.query.category.findFirst({
                where: {
                    id: {
                        eq: sql.placeholder("id"),
                    }
                }
            }).prepare("getCategoryById");

            const categoryData = await prepared.execute({ id });

            if (!categoryData) {
                return null;
            }

            const categoryInstance = new Category(
                categoryData.id,
                categoryData.name,
                categoryData.slug,
                categoryData.createdBy,
                categoryData.createdAt,
                categoryData.updatedAt,
                categoryData.deletedAt
            );

            return categoryInstance;
        } catch (err) {
            throw new AppError("Unexpected error during category retrieval", "CATEGORY_RETRIEVAL_ERROR", 500, { error: err });
        }
    }
}

export const categoryRepository = new CategoryRepository();