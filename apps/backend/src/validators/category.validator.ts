import z from "zod";

/**
 * Category Name: A string between 3 and 255 characters, trimmed of whitespace.
 * Used for both user input and server-side operations.
 */
export const categoryName = z
    .string({ error: "CATEGORY_NAME_INVALID" })
    .min(3, { error: "CATEGORY_NAME_TOO_SHORT" })
    .max(255, { error: "CATEGORY_NAME_TOO_LONG" })
    .trim();

export type CategoryName = z.infer<typeof categoryName>;

/**
 * Category Slug: A string between 3 and 255 characters, consisting of lowercase letters, numbers, and hyphens.
 * It must start and end with a letter or number, and cannot contain consecutive hyphens. Trimmed of whitespace.
 * Used only for server-side operations. Must be unique across all categories.
 */
export const categorySlug = z
    .string({ error: "CATEGORY_SLUG_INVALID" })
    .min(3, { error: "CATEGORY_SLUG_TOO_SHORT" })
    .max(255, { error: "CATEGORY_SLUG_TOO_LONG" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "CATEGORY_SLUG_INVALID_FORMAT" })
    .trim();

export type CategorySlug = z.infer<typeof categorySlug>;

/**
 * CreateCategoryInput: The expected shape of the input when creating a new category.
 * - name: Required, validated by categoryName schema.
 * - slug: Required, validated by categorySlug schema.
 * - createdBy: Optional, must be a valid UUID if provided, or null.
 * 
 * Used for validating incoming data when creating a category.
 * Used only for server-side operations.
 */
export const createCategorySchema = z.object({
    name: categoryName,
    slug: categorySlug,
    createdBy: z.uuid({ error: "CATEGORY_CREATED_BY_INVALID" }).nullable(),
}, {
    error: "CREATE_CATEGORY_INPUT_INVALID"
});

export type CreateCategory = z.infer<typeof createCategorySchema>;

/**
 * UpdateCategoryInput: The expected shape of the input when updating an existing category.
 * - name: Optional, validated by categoryName schema if provided.
 * - slug: Optional, validated by categorySlug schema if provided.
 * Used for validating incoming data when updating a category.
 * Used only for server-side operations.
 */
export const updateCategorySchema = z.object({
    name: categoryName.optional(),
    slug: categorySlug.optional(),
}, {
    error: "UPDATE_CATEGORY_INPUT_INVALID"
});

export type UpdateCategory = z.infer<typeof updateCategorySchema>;

/**
 * CreateCategoryInputSchema: A simplified schema for validating just the name when creating a category.
 * Used for validating incoming data when creating a category, specifically for the name field.
 * Used only for user input.
 */
export const createCategoryInputSchema = z.object({
    name: categoryName,
}, {
    error: "CREATE_CATEGORY_NAME_INPUT_INVALID"
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

/**
 * UpdateCategoryInputSchema: A simplified schema for validating just the name when updating a category.
 * Used for validating incoming data when updating a category, specifically for the name field.
 * Used only for user input.
 */
export const updateCategoryInputSchema = z.object({
    name: categoryName.optional(),
}, {
    error: "UPDATE_CATEGORY_NAME_INPUT_INVALID"
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;