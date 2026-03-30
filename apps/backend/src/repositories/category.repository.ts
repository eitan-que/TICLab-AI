import { db } from "@/db/drizzle";
import { category } from "@/db/schema";
import { Category } from "@/domain/category.domain";
import { Debug, Debuggable } from "@/lib/debug";
import { AppError, BadRequestError, ParseZodError } from "@/lib/errors";
import { categoryId, CategoryId, categorySlug, CategorySlug, CreateCategory, createCategorySchema, GetAllCategories, getAllCategoriesSchema, UpdateCategory, updateCategorySchema } from "@/validators/category.validator";
import { eq, sql } from "drizzle-orm";
import { ZodError } from "zod";

/**
 * # CategoryRepository
 * The CategoryRepository class is responsible for managing all database operations related to the Category entity.
 * It provides methods for creating, retrieving, updating, and deleting categories, as well as additional operations like restoring and hard deleting categories.
 * Each method includes comprehensive validation of input data using Zod schemas, and detailed error handling with custom error classes.
 * The repository also integrates with the Debug class to provide detailed logging of each step in the process, which can be invaluable for troubleshooting and monitoring the application's behavior.
 * @see Category for the domain model that this repository manages.
 */
class CategoryRepository extends Debuggable {

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
            this.debug.start("Creating new category");

            this.debug.step("Validating input data", { ...data });
            const validatedData = createCategorySchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Inserting new category into database");
            const result = await db.insert(category).values({
                name: validatedData.name,
                slug: validatedData.slug,
                createdBy: validatedData.createdBy,
            }).returning();
            this.debug.info("New category inserted successfully", { result });

            this.debug.step("Checking if category was created successfully");
            if (result.length === 0) {
                throw new AppError("Failed to create category", "CATEGORY_CREATION_FAILED", 500);
            }
            this.debug.info("Category creation confirmed", { createdCategoryId: result[0].id });

            const createdCategory = result[0];
            this.debug.step("Mapping database record to Category domain object");
            const newCategory = new Category(
                createdCategory.id,
                createdCategory.name,
                createdCategory.slug,
                createdCategory.createdBy,
                createdCategory.createdAt,
                createdCategory.updatedAt,
                createdCategory.deletedAt
            );
            this.debug.info("Category domain object created successfully", { ...newCategory });

            this.debug.finish("Category creation process completed");
            return newCategory;

        } catch (err) {
            this.debug.error("Error occurred while creating category", { error: err });
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
     * @throws {BadRequestError} If the provided ID fails validation against the CategoryId schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async getCategoryById(id: CategoryId): Promise<Category | null> {
        try {
            this.debug.start("Getting category by ID");

            this.debug.step("Validating category ID", { id });
            const validatedId = categoryId.parse(id);
            this.debug.info("Category ID validated successfully", { validatedId });

            this.debug.step("Preparing database query to retrieve category by ID");
            const prepared = db.query.category.findFirst({
                where: {
                    id: {
                        eq: sql.placeholder("id"),
                    }
                }
            }).prepare("getCategoryById");
            this.debug.info("Database query prepared successfully", { queryName: "getCategoryById" });

            this.debug.step("Executing database query to retrieve category by ID", { validatedId });
            const categoryData = await prepared.execute({ id: validatedId });
            this.debug.info("Database query executed successfully", { ...categoryData });

            this.debug.step("Checking if category was found");
            if (!categoryData) {
                this.debug.finish("Category not found");
                return null;
            }
            this.debug.info("Category found", { categoryId: categoryData.id });

            this.debug.step("Mapping database record to Category domain object");
            const categoryInstance = new Category(
                categoryData.id,
                categoryData.name,
                categoryData.slug,
                categoryData.createdBy,
                categoryData.createdAt,
                categoryData.updatedAt,
                categoryData.deletedAt
            );
            this.debug.info("Category domain object created successfully", { ...categoryInstance });

            this.debug.finish("Getting category by ID completed");
            return categoryInstance;

        } catch (err) {
            this.debug.error("Error occurred while retrieving category", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category retrieval", "CATEGORY_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Category By Slug
     * Retrieves a category from the database by its unique slug.
     * If the category is found, it is returned as a Category object.
     * If no category is found with the given slug, null is returned.
     * If an unexpected error occurs during the database operation, an AppError is thrown with details about the error.
     * @param slug - The unique slug of the category to retrieve.
     * @returns A promise that resolves to the Category object if found, or null if no category exists with the given slug.
     * @example
     * ```ts
     * const category = await categoryRepository.getCategoryBySlug("example-category");
     * if (category) {
     *   console.log("Category found:", category);
     * } else {
     *   console.log("Category not found");
     * }
     * ```
     * @throws {BadRequestError} If the provided slug fails validation against the CategorySlug schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async getCategoryBySlug(slug: CategorySlug): Promise<Category | null> {
        try {
            this.debug.start("Getting category by slug");

            this.debug.step("Validating category slug", { slug });
            const validatedSlug = categorySlug.parse(slug);
            this.debug.info("Category slug validated successfully", { validatedSlug });

            this.debug.step("Preparing database query to retrieve category by slug");
            const prepared = db.query.category.findFirst({
                where: {
                    slug: {
                        eq: sql.placeholder("slug"),
                    }
                }
            }).prepare("getCategoryBySlug");
            this.debug.info("Database query prepared successfully", { queryName: "getCategoryBySlug" });

            this.debug.step("Executing database query to retrieve category by slug", { validatedSlug });
            const categoryData = await prepared.execute({ slug: validatedSlug });
            this.debug.info("Database query executed successfully", { ...categoryData });

            this.debug.step("Checking if category was found");
            if (!categoryData) {
                this.debug.finish("Category not found");
                return null;
            }
            this.debug.info("Category found", { categoryId: categoryData.id });

            this.debug.step("Mapping database record to Category domain object");
            const categoryInstance = new Category(
                categoryData.id,
                categoryData.name,
                categoryData.slug,
                categoryData.createdBy,
                categoryData.createdAt,
                categoryData.updatedAt,
                categoryData.deletedAt
            );
            this.debug.info("Category domain object created successfully", { ...categoryInstance });

            this.debug.finish("Getting category by slug completed");
            return categoryInstance;

        } catch (err) {
            this.debug.error("Error occurred while retrieving category", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category retrieval", "CATEGORY_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get All Categories
     * Retrieves a list of categories from the database based on the provided query parameters.
     * Supports filtering by name and slug, as well as pagination through page and limit parameters.
     * Validates the input query parameters against the GetAllCategories schema before attempting to retrieve data from the database.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If an unexpected error occurs during the database operation, an AppError is thrown with details about the error.
     * @param query - The query parameters for retrieving categories, which must conform to the GetAllCategories schema.
     * @returns A promise that resolves to an array of Category objects that match the query criteria.
     * @example
     * ```ts
     * const categories = await categoryRepository.getAllCategories({
     *   name: "example",
     *   slug: "example",
     *   page: 1,
     *   limit: 10
     * });
     * console.log("Retrieved categories:", categories);
     * ```
     * @throws {BadRequestError} If the input query parameters fail validation against the GetAllCategories schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async getAllCategories(query: GetAllCategories): Promise<Category[]> {
        try {
            this.debug.start("Getting all categories");

            this.debug.step("Validating query parameters", { ...query });
            const validatedQuery = getAllCategoriesSchema.parse(query);
            this.debug.info("Query parameters validated successfully", { ...validatedQuery });

            this.debug.step("Retrieving categories from database");
            const categoriesData = await db.query.category.findMany({
                where: {
                    name: validatedQuery.name ? {
                        like: `%${validatedQuery.name}%`,
                    } : undefined,
                    slug: validatedQuery.slug ? {
                        like: `%${validatedQuery.slug}%`,
                    } : undefined,
                },
                offset: (validatedQuery.page - 1) * validatedQuery.limit,
                limit: validatedQuery.limit,
            })
            this.debug.info("Categories retrieved successfully", { count: categoriesData.length });

            this.debug.step("Mapping database records to Category domain objects");
            const categories = categoriesData.map(categoryData => new Category(
                categoryData.id,
                categoryData.name,
                categoryData.slug,
                categoryData.createdBy,
                categoryData.createdAt,
                categoryData.updatedAt,
                categoryData.deletedAt
            ));
            this.debug.info("Category domain objects created successfully", { ...categories });

            this.debug.finish("Getting all categories");
            return categories;

        } catch (err) {
            this.debug.error("Error occurred while retrieving categories", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during categories retrieval", "CATEGORIES_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Update Category
     * Updates an existing category in the database with the provided data.
     * Validates the input data against the UpdateCategory schema before attempting to update the database record.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param data - The data for updating the category, which must conform to the UpdateCategory schema.
     * @returns A promise that resolves to the updated Category object.
     * @example
     * ```ts
     * const updatedCategory = await categoryRepository.updateCategory({
     *   id: "category-id-123",
     *   name: "Updated Category Name",
     *   slug: "updated-category-slug"
     * });
     * console.log("Updated category:", updatedCategory);
     * ```
     * @throws {BadRequestError} If the input data fails validation against the UpdateCategory schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async updateCategory(data: UpdateCategory): Promise<Category> {
        try {
            this.debug.start("Updating category");
            
            this.debug.step("Validating input data", { ...data });
            const validatedData = updateCategorySchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Updating category in database");
            const [categoryData] = await db.update(category)
                .set({
                    name: data.name,
                    slug: data.slug
                })
                .where(eq(category.id, data.id))
                .returning();
            this.debug.info("Category updated successfully", { ...categoryData });

            this.debug.step("Mapping database record to Category domain object");
            const categoryInstance = new Category(
                categoryData.id,
                categoryData.name,
                categoryData.slug,
                categoryData.createdBy,
                categoryData.createdAt,
                categoryData.updatedAt,
                categoryData.deletedAt
            );
            this.debug.info("Category domain object created successfully", { ...categoryInstance });

            this.debug.finish("Category update process completed");
            return categoryInstance;

        } catch (err) {
            this.debug.error("Error occurred while updating category", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category update", "CATEGORY_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Delete Category
     * Marks a category as deleted in the database by setting the deletedAt timestamp.
     * Validates the input ID against the CategoryId schema before attempting to update the database record.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param id - The unique identifier of the category to delete, which must conform to the CategoryId schema.
     * @returns A promise that resolves when the category has been marked as deleted.
     * @example
     * ```ts
     * await categoryRepository.deleteCategory("category-id-123");
     * console.log("Category deleted");
     * ```
     * @throws {BadRequestError} If the provided ID fails validation against the CategoryId schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async deleteCategory(id: CategoryId): Promise<void> {
        try {
            this.debug.start("Deleting category");

            this.debug.step("Validating category ID", { id });
            const validatedId = categoryId.parse(id);
            this.debug.info("Category ID validated successfully", { validatedId });

            this.debug.step("Updating category in database to set deletedAt timestamp");
            await db.update(category)
                .set({
                    deletedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(category.id, validatedId));
            this.debug.info("Category marked as deleted successfully", { categoryId: validatedId });

            this.debug.finish("Category deletion process completed");
            return;

        } catch (err) {
            this.debug.error("Error occurred while deleting category", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category deletion", "CATEGORY_DELETION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Restore Category
     * Restores a previously deleted category in the database by setting the deletedAt timestamp to null.
     * Validates the input ID against the CategoryId schema before attempting to update the database record.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param id - The unique identifier of the category to restore, which must conform to the CategoryId schema.
     * @returns A promise that resolves when the category has been restored.
     * @example
     * ```ts
     * await categoryRepository.restoreCategory("category-id-123");
     * console.log("Category restored");
     * ```
     * @throws {BadRequestError} If the provided ID fails validation against the CategoryId schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async restoreCategory(id: CategoryId): Promise<void> {
        try {
            this.debug.start("Restoring category");

            this.debug.step("Validating category ID", { id });
            const validatedId = categoryId.parse(id);
            this.debug.info("Category ID validated successfully", { validatedId });

            this.debug.step("Updating category in database to set deletedAt to null");
            await db.update(category)
                .set({
                    deletedAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(category.id, validatedId));
            this.debug.info("Category restored successfully", { categoryId: validatedId });

            this.debug.finish("Category restoration process completed");
            return;

        } catch (err) {
            this.debug.error("Error occurred while restoring category", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category restoration", "CATEGORY_RESTORATION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Hard Delete Category
     * Permanently deletes a category from the database.
     * Validates the input ID against the CategoryId schema before attempting to delete the database record.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param id - The unique identifier of the category to hard delete, which must conform to the CategoryId schema.
     * @returns A promise that resolves when the category has been permanently deleted.
     * @example
     * ```ts
     * await categoryRepository.hardDeleteCategory("category-id-123");
     * console.log("Category permanently deleted");
     * ```
     * @throws {BadRequestError} If the provided ID fails validation against the CategoryId schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     * @remarks This operation is irreversible and will permanently remove the category from the database, including all associated data. Use with caution.
     */
    async hardDeleteCategory(id: CategoryId): Promise<void> {
        try {
            this.debug.start("Hard deleting category");

            this.debug.step("Validating category ID", { id });
            const validatedId = categoryId.parse(id);
            this.debug.info("Category ID validated successfully", { validatedId });

            this.debug.step("Permanently deleting category from database");
            await db.delete(category)
                .where(eq(category.id, validatedId));
            this.debug.info("Category permanently deleted successfully", { categoryId: validatedId });

            this.debug.finish("Category hard deletion process completed");
            return;

        } catch (err) {
            this.debug.error("Error occurred while hard deleting category", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category hard deletion", "CATEGORY_HARD_DELETION_ERROR", 500, { error: err });
        }
    }
}

export const categoryRepository = new CategoryRepository();