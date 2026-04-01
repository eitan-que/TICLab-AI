import { Category } from "@/domain/category.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, ConflictError, NotFoundError, ParseZodError } from "@/lib/errors";
import { categoryRepository, CategoryRepositoryTemplate } from "@/repositories/category.repository";
import { categoryId, CategoryId, CategoryName, categorySlug, CategorySlug, CreateCategoryInput, createCategoryInputSchema, GetAllCategories, getAllCategoriesSchema, UpdateCategoryInput, updateCategoryInputSchema } from "@/validators/category.validator";
import { ZodError } from "zod";

export class CategoryService extends Debuggable {
    constructor(
        private repository: CategoryRepositoryTemplate
    ) {
        super();
    }

    /**
     * ## Create Category
     * This method is responsible for creating a new category based on the provided input data.
     * It performs validation on the input data using the createCategoryInputSchema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
     * If the validation succeeds, it generates a slug from the category name using the slugifyName method, and then calls the repository's createCategory method to persist the new category in the database.
     * If an unexpected error occurs during validation or creation, it throws an AppError with details about the error.
     * @param data - The input data for creating a new category, which should conform to the CreateCategoryInput type.
     * @returns A promise that resolves to the created Category object.
     * @throws {ValidationError} If the input data does not meet the validation criteria defined in the createCategoryInputSchema.
     * @throws {AppError} If an unexpected error occurs during validation or category creation.
     * @example
     * ```ts
     * const newCategory = await categoryService.create({
     *   name: "New Category",
     *   creatorId: "user-id-123",
     * });
     * ```
     */
    async create(data: CreateCategoryInput): Promise<Category> {
        try {
            this.debug.start("Creating category");

            this.debug.step("Validating input data", { ...data });
            const validatedData = createCategoryInputSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Generating slug from category name", { name: validatedData.name });
            let slug = Category.slugifyName(validatedData.name);
            this.debug.info("Slug generated successfully", { slug });

            this.debug.step("Checking for existing category with the same slug", { slug });
            const existingCategory = await this.repository.getCategoryBySlug(slug);
            this.debug.info("Existing category check completed", { existingCategory: !!existingCategory });

            this.debug.step("Handling slug collision if necessary", { slug, existingCategory: !!existingCategory });
            if (existingCategory) {
                this.debug.warn("Generated slug already exists, generating a new slug", { slug });
                slug = Category.slugifyName(validatedData.name);
                this.debug.info("New slug generated successfully", { slug });
            }
            this.debug.info("Final slug to be used for category creation", { slug });

            this.debug.step("Creating category in the repository", { name: validatedData.name, slug, createdBy: validatedData.creatorId });
            const createdCategory = await this.repository.createCategory({ 
                name: validatedData.name,
                slug,
                createdBy: validatedData.creatorId,
            });
            this.debug.info("Category created successfully", { ...createdCategory });

            this.debug.finish("Category creation completed successfully", { ...createdCategory });
            return createdCategory;

        } catch (err) {
            this.debug.error("Error occurred during category creation", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError("Unexpected error during category creation", "CATEGORY_CREATION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Category by ID
     * This method retrieves a category by its unique identifier (ID).
     * It validates the provided ID using the categoryId schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
     * If the validation succeeds, it calls the repository's getCategoryById method to fetch the category from the database.
     * If no category is found with the provided ID, it throws a NotFoundError with details about the missing resource.
     * If an unexpected error occurs during validation or retrieval, it throws an AppError with details about the error.
     * @param id - The unique identifier of the category to retrieve, which should conform to the CategoryId type.
     * @returns A promise that resolves to the retrieved Category object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria defined in the categoryId schema.
     * @throws {NotFoundError} If no category is found with the provided ID.
     * @throws {AppError} If an unexpected error occurs during validation or category retrieval.
     * @example
     * ```ts
     * const category = await categoryService.getById("category-id-123");
     * ```
     */
    async getById(id: CategoryId): Promise<Category> {
        try {
            this.debug.start("Retrieving category by ID", { id });

            this.debug.step("Validating category ID", { id });
            const validatedId = categoryId.parse(id);
            this.debug.info("Category ID validated successfully", { validatedId });

            this.debug.step("Fetching category from repository", { id: validatedId });
            const category = await this.repository.getCategoryById(validatedId);
            this.debug.info("Category retrieval completed", { category: !!category });

            this.debug.step("Checking if category exists");
            if (!category) {
                this.debug.error("Category not found", { id: validatedId });
                throw new NotFoundError("Category not found", { id: validatedId });
            }
            this.debug.info("Category found", { ...category });

            this.debug.finish("Category retrieval by ID completed successfully", { ...category });
            return category;

        } catch (err) {
            this.debug.error("Error occurred during category retrieval by ID", { error: err, id });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError("Unexpected error during category retrieval", "CATEGORY_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Category by Slug
     * This method retrieves a category by its unique slug.
     * It validates the provided slug using the categorySlug schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
     * If the validation succeeds, it calls the repository's getCategoryBySlug method to fetch the category from the database.
     * If no category is found with the provided slug, it throws a NotFoundError with details about the missing resource.
     * If an unexpected error occurs during validation or retrieval, it throws an AppError with details about the error.
     * @param slug - The unique slug of the category to retrieve, which should conform to the CategorySlug type.
     * @returns A promise that resolves to the retrieved Category object.
     * @throws {ValidationError} If the provided slug does not meet the validation criteria defined in the categorySlug schema.
     * @throws {NotFoundError} If no category is found with the provided slug.
     * @throws {AppError} If an unexpected error occurs during validation or category retrieval.
     * @example
     * ```ts
     * const category = await categoryService.getBySlug("example-category-slug");
     * ```
     */
    async getBySlug(slug: CategorySlug): Promise<Category> {
        try {
            this.debug.start("Retrieving category by slug", { slug });

            this.debug.step("Validating category slug", { slug });
            const validatedSlug = categorySlug.parse(slug);
            this.debug.info("Category slug validated successfully", { validatedSlug });

            this.debug.step("Fetching category from repository", { slug: validatedSlug });
            const category = await this.repository.getCategoryBySlug(validatedSlug);
            this.debug.info("Category retrieval completed", { category: !!category });

            this.debug.step("Checking if category exists");
            if (!category) {
                this.debug.error("Category not found", { slug: validatedSlug });
                throw new NotFoundError("Category not found", { slug: validatedSlug });
            }
            this.debug.info("Category found", { ...category });

            this.debug.step("Checking if category is marked as deleted", { slug: validatedSlug, deletedAt: category.deletedAt });
            if (category.deletedAt) {
                this.debug.warn("Category is marked as deleted, treating as not found", { slug: validatedSlug });
                throw new NotFoundError("Category not found", { slug: validatedSlug });
            }
            this.debug.info("Category is not deleted, proceeding with retrieval", { slug: validatedSlug });

            this.debug.finish("Category retrieval by slug completed successfully", { ...category });
            return category;

        } catch (err) {
            this.debug.error("Error occurred during category retrieval by slug", { error: err, slug });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError("Unexpected error during category retrieval", "CATEGORY_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get All Categories
     * This method retrieves all categories based on the provided query parameters.
     * It validates the query parameters using the getAllCategoriesSchema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
     * If the validation succeeds, it calls the repository's getAllCategories method to fetch the categories from the database based on the query parameters.
     * If an unexpected error occurs during validation or retrieval, it throws an AppError with details about the error.
     * @param query - The query parameters for retrieving categories, which should conform to the GetAllCategories type.
     * @returns A promise that resolves to an array of Category objects that match the query parameters.
     * @throws {ValidationError} If the provided query parameters do not meet the validation criteria defined in the getAllCategoriesSchema.
     * @throws {AppError} If an unexpected error occurs during validation or category retrieval.
     * @example
     * ```ts
     * const categories = await categoryService.getAll({ name: "example", limit: 10, page: 1 });
     * ```
     */
    async getAll(query: GetAllCategories): Promise<Category[]> {
        try {
            this.debug.start("Retrieving all categories", { ...query });

            this.debug.step("Validating query parameters", { ...query });
            const parsedQuery = getAllCategoriesSchema.parse(query);
            this.debug.info("Query parameters validated successfully", { ...parsedQuery });

            this.debug.step("Fetching categories from repository", { ...parsedQuery });
            const categories = await this.repository.getAllCategories(parsedQuery);
            this.debug.info("Categories retrieval completed", { count: categories.length });

            if (categories.length === 0) {
                this.debug.warn("No categories found matching the query", { ...parsedQuery });
            }

            this.debug.finish("All categories retrieval completed successfully", { ...categories });
            return categories;

        } catch (err) {
            this.debug.error("Error occurred during category retrieval", { error: err, query });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError("Unexpected error during category retrieval", "CATEGORY_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Update Category
     * This method updates an existing category based on the provided input data.
     * It performs validation on the input data using the updateCategoryInputSchema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
     * If the validation succeeds, it checks if the category exists by calling the getById method. If the category does not exist, it throws a NotFoundError.
     * If the category exists, it calls the repository's updateCategory method to persist the updated category in the database.
     * If an unexpected error occurs during validation or update, it throws an AppError with details about the error.
     * @param data - The input data for updating an existing category, which should conform to the UpdateCategoryInput type.
     * @returns A promise that resolves to the updated Category object.
     * @throws {ValidationError} If the input data does not meet the validation criteria defined in the updateCategoryInputSchema.
     * @throws {NotFoundError} If the category to be updated does not exist.
     * @throws {AppError} If an unexpected error occurs during validation or category update.
     */
    async update(data: UpdateCategoryInput): Promise<Category> {
        try {
            this.debug.start("Updating category", { ...data });

            this.debug.step("Validating input data", { ...data });
            const validatedData = updateCategoryInputSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Checking if category exists", { id: validatedData.id });
            const existingCategory = await this.getById(validatedData.id);
            this.debug.info("Existing category check completed", { existingCategory: !!existingCategory });

            this.debug.step("Updating category in the repository", { ...validatedData });
            const updatedCategory = await this.repository.updateCategory(validatedData);
            this.debug.info("Category updated successfully", { ...updatedCategory });

            this.debug.finish("Category update completed successfully", { ...updatedCategory });
            return updatedCategory;

        } catch (err) {
            this.debug.error("Error occurred during category update", { error: err, data });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError("Unexpected error during category update", "CATEGORY_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Delete Category
     * This method marks a category as deleted based on its unique identifier (ID).
     * It validates the provided ID using the categoryId schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
     * If the validation succeeds, it checks if the category exists by calling the getById method. If the category does not exist, it throws a NotFoundError.
     * If the category exists, it calls the repository's deleteCategory method to mark the category as deleted in the database.
     * If an unexpected error occurs during validation or deletion, it throws an AppError with details about the error.
     * @param id - The unique identifier of the category to delete, which should conform to the CategoryId type.
     * @returns A promise that resolves to the deleted Category object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria defined in the categoryId schema.
     * @throws {NotFoundError} If the category to be deleted does not exist.
     * @throws {AppError} If an unexpected error occurs during validation or category deletion.
     */
    async delete(id: CategoryId): Promise<Category> {
        try {
            this.debug.start("Deleting category", { id });

            this.debug.step("Validating category ID", { id });
            const validatedId = categoryId.parse(id);
            this.debug.info("Category ID validated successfully", { validatedId });

            this.debug.step("Checking if category exists", { id: validatedId });
            const existingCategory = await this.getById(validatedId);
            this.debug.info("Existing category check completed", { existingCategory: !!existingCategory });

            this.debug.step("Checking if category is already deleted", { id: validatedId, deletedAt: existingCategory.deletedAt });
            if (existingCategory.deletedAt) {
                this.debug.warn("Category is already marked as deleted", { id: validatedId });
                throw new ConflictError("Category is already deleted", { id: validatedId });
            }
            this.debug.info("Category is not deleted, proceeding with deletion", { id: validatedId });

            this.debug.step("Deleting category in the repository", { id: validatedId });
            await this.repository.deleteCategory(validatedId);
            this.debug.info("Category deleted successfully", { id: validatedId });

            this.debug.step("Marking category as deleted in the domain model", { id: validatedId });
            existingCategory.delete();
            this.debug.info("Category marked as deleted in the domain model", { existingCategory });

            this.debug.finish("Category deletion completed successfully", { existingCategory });
            return existingCategory;
            
        } catch (err) {
            this.debug.error("Error occurred during category deletion", { error: err, id });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError("Unexpected error during category deletion", "CATEGORY_DELETION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Restore Category
     * This method restores a previously deleted category based on its unique identifier (ID).
     * It validates the provided ID using the categoryId schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
     * If the validation succeeds, it checks if the category exists by calling the getById method. If the category does not exist, it throws a NotFoundError.
     * If the category exists but is not marked as deleted, it throws a ConflictError indicating that the category cannot be restored because it is not deleted.
     * If the category exists and is marked as deleted, it calls the repository's restoreCategory method to restore the category in the database.
     * If an unexpected error occurs during validation or restoration, it throws an AppError with details about the error.
     * @param id - The unique identifier of the category to restore, which should conform to the CategoryId type.
     * @returns A promise that resolves to the restored Category object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria defined in the categoryId schema.
     * @throws {NotFoundError} If the category to be restored does not exist.
     * @throws {ConflictError} If the category is not marked as deleted and therefore cannot be restored.
     * @throws {AppError} If an unexpected error occurs during validation or category restoration.
     */
    async restore(id: CategoryId): Promise<Category> {
        try {
            this.debug.start("Restoring category", { id });

            this.debug.step("Validating category ID", { id });
            const validatedId = categoryId.parse(id);
            this.debug.info("Category ID validated successfully", { validatedId });

            this.debug.step("Checking if category exists", { id: validatedId });
            const existingCategory = await this.getById(validatedId);
            this.debug.info("Existing category check completed", { existingCategory: !!existingCategory });

            this.debug.step("Checking if category is not deleted", { id: validatedId, deletedAt: existingCategory.deletedAt });
            if (!existingCategory.deletedAt) {
                this.debug.warn("Category is not marked as deleted, cannot restore", { id: validatedId });
                throw new ConflictError("Category is not deleted", { id: validatedId });
            }
            this.debug.info("Category is marked as deleted, proceeding with restoration", { id: validatedId });

            this.debug.step("Restoring category in the repository", { id: validatedId });
            await this.repository.restoreCategory(validatedId);
            this.debug.info("Category restored successfully", { id: validatedId });

            this.debug.step("Marking category as restored in the domain model", { id: validatedId });
            existingCategory.restore();
            this.debug.info("Category marked as restored in the domain model", { existingCategory });

            this.debug.finish("Category restoration completed successfully", { id: validatedId });
            return existingCategory;

        } catch (err) {
            this.debug.error("Error occurred during category restoration", { error: err, id });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError("Unexpected error during category restoration", "CATEGORY_RESTORE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Hard Delete Category
     * This method permanently deletes a category from the database based on its unique identifier (ID).
     * It validates the provided ID using the categoryId schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
     * If the validation succeeds, it checks if the category exists by calling the getById method. If the category does not exist, it throws a NotFoundError.
     * If the category exists but is not marked as deleted, it throws a ConflictError indicating that the category cannot be hard deleted because it is not marked as deleted.
     * If the category exists and is marked as deleted, it calls the repository's hardDeleteCategory method to permanently delete the category from the database.
     * If an unexpected error occurs during validation or hard deletion, it throws an AppError with details about the error.
     * @param id - The unique identifier of the category to hard delete, which should conform to the CategoryId type.
     * @returns A promise that resolves when the category has been permanently deleted.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria defined in the categoryId schema.
     * @throws {NotFoundError} If the category to be hard deleted does not exist.
     * @throws {ConflictError} If the category is not marked as deleted and therefore cannot be hard deleted.
     * @throws {AppError} If an unexpected error occurs during validation or category hard deletion.
     */
    async hardDelete(id: CategoryId): Promise<void> {
        try {
            this.debug.start("Hard deleting category", { id });

            this.debug.step("Validating category ID", { id });
            const validatedId = categoryId.parse(id);
            this.debug.info("Category ID validated successfully", { validatedId });

            this.debug.step("Checking if category exists", { id: validatedId });
            const existingCategory = await this.getById(validatedId);
            this.debug.info("Existing category check completed", { existingCategory: !!existingCategory });

            this.debug.step("Checking if category is not deleted", { id: validatedId, deletedAt: existingCategory.deletedAt });
            if (!existingCategory.deletedAt) {
                this.debug.warn("Category is not marked as deleted, cannot hard delete", { id: validatedId });
                throw new ConflictError("Category is not deleted", { id: validatedId });
            }
            this.debug.info("Category is marked as deleted, proceeding with hard deletion", { id: validatedId });

            this.debug.step("Hard deleting category in the repository", { id: validatedId });
            await this.repository.hardDeleteCategory(validatedId);
            this.debug.info("Category hard deleted successfully", { id: validatedId });

            this.debug.finish("Category hard deletion completed successfully", { id: validatedId });
        } catch (err) {
            this.debug.error("Error occurred during category hard deletion", { error: err, id });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError("Unexpected error during category hard deletion", "CATEGORY_HARD_DELETE_ERROR", 500, { error: err });

        }
    }
}

export const categoryService = new CategoryService(categoryRepository);