import { AppError, ParseZodError } from "@/lib/errors";
import { categoryName, CategoryName, categorySlug, CategorySlug } from "@/validators/category.validator";
import { ZodError } from "zod";

/**
 * Category represents a category entity in the system.
 * It encapsulates all properties and behaviors related to a category, including validation logic.
 * The constructor and setters ensure that any instance of Category is always in a valid state according to the defined schemas.
 * 
 * @example
 * ```ts
 * const category = new Category(
 *   "123",
 *   "Example Category",
 *   "example-category",
 *   "user-456",
 *   new Date(),
 *   new Date(),
 *   null
 * );
 * ```
 */
export class Category {
    constructor(
        private _id: string,
        private _name: string,
        private _slug: string,
        private _createdBy: string | null,
        private _createdAt: Date,
        private _updatedAt: Date,
        private _deletedAt: Date | null,
    ) {
        // Validate name
        try {
            categoryName.parse(_name);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category name validation", "CATEGORY_NAME_VALIDATION_ERROR", 500, { error: err });
        }
        // Validate slug
        try {
            categorySlug.parse(_slug);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category slug validation", "CATEGORY_SLUG_VALIDATION_ERROR", 500, { error: err });
        }
    }

    // Getters

    /**
     * ## ID
     * ### Getter
     * The unique identifier for the category. 
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get id(): string {
        return this._id;
    }

    /**
     * ## Name
     * ### Getter
     * The name of the category. This is a required field that must be between 3 and 255 characters, trimmed of whitespace.
     */
    get name(): string {
        return this._name;
    }

    /**
     * ## Slug
     * ### Getter
     * The slug of the category. This is a required field that must be unique and follow a specific format.
     * The setter for this property includes validation logic to ensure that any assigned value adheres to the defined schema.
     */
    get slug(): string {
        return this._slug;
    }

    /**
     * ## Created By
     * ### Getter
     * The user who created the category. This is an optional field that can be null.
     */
    get createdBy(): string | null {
        return this._createdBy;
    }

    /**
     * ## Created At
     * ### Getter
     * The timestamp when the category was created. 
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get createdAt(): Date {
        return this._createdAt;
    }

    /**
     * ## Updated At
     * ### Getter
     * The timestamp when the category was last updated. 
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get updatedAt(): Date {
        return this._updatedAt;
    }

    /**
     * ## Deleted At
     * ### Getter
     * The timestamp when the category was deleted. 
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get deletedAt(): Date | null {
        return this._deletedAt;
    }

    // Setters

    /**
     * ### Setter
     * This setter includes validation logic to ensure that any assigned value adheres to the defined schema.
     * When the name is updated, the slug is automatically generated from the name and also validated.
     * If the validation fails, a ValidationError is thrown with details about the specific validation issues.
     * If an unexpected error occurs during validation, an AppError is thrown with details about the error.
     * @example
     * ```ts
     * category.name = "New Category Name";
     * ```
     * @throws {ValidationError} If the provided name does not meet the validation criteria defined in the categoryName schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    set name(name: CategoryName) {
        try {
            const validatedName = categoryName.parse(name);
            this._name = validatedName;
            this.slug = this.slugifyName(validatedName);
            this.updateTimestamps();
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category name update", "CATEGORY_NAME_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ### Private Setter
     * This setter includes validation logic to ensure that any assigned value adheres to the defined schema.
     * If the validation fails, a ValidationError is thrown with details about the specific validation issues.
     * If an unexpected error occurs during validation, an AppError is thrown with details about the error.
     * @example
     * ```ts
     * this.slug = "new-category-slug";
     * ```
     * @throws {ValidationError} If the provided slug does not meet the validation criteria defined in the categorySlug schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    private set slug(slug: CategorySlug) {
        try {
            const validatedSlug = categorySlug.parse(slug);
            this._slug = validatedSlug;
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during category slug update", "CATEGORY_SLUG_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ### Private Setter
     * #### PREFER USING ```this.updateTimestamps()``` INSTEAD
     * This setter is used to update the updatedAt timestamp whenever the category is modified.
     * It is a private setter to ensure that the updatedAt timestamp can only be modified internally by the class methods, maintaining data integrity.
     * @example
     * ```ts
     * this.updatedAt = new Date();
     * ```
     */
    private set updatedAt(date: Date) {
        this._updatedAt = date;
    }

    /**
     * ### Private Setter
     * This setter is used to set the deletedAt timestamp when the category is deleted.
     * It is a private setter to ensure that the deletedAt timestamp can only be modified internally by the class methods, maintaining data integrity.
     * @example
     * ```ts
     * this.deletedAt = new Date();
     * ```
     */
    private set deletedAt(date: Date | null) {
        this._deletedAt = date;
    }

    // Methods

    /**
     * ### Private Method
     * This method generates a slug from the given category name by converting it to lowercase, replacing non-alphanumeric characters with hyphens, and trimming leading/trailing hyphens.
     * The generated slug is then validated against the categorySlug schema to ensure it meets the required format.
     * If the validation fails, a ValidationError is thrown with details about the specific validation issues.
     * If an unexpected error occurs during validation, an AppError is thrown with details about the error.
     * @example
     * ```ts
     * const slug = this.slugifyName("Example Category Name");
     * // slug would be "example-category-name"
     * ```
     * @throws {ValidationError} If the generated slug does not meet the validation criteria defined in the categorySlug schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    private slugifyName(name: CategoryName): CategorySlug {
        const loweredName = name.toLowerCase();
        const slug = loweredName.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return slug as CategorySlug;
    }

    /**
     * ## Public Method
     * This method marks the category as deleted by setting the deletedAt timestamp to the current date and time.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the category is considered deleted and should not be returned in active category queries.
     * @example
     * ```ts
     * category.delete();
     * ```
     */
    private updateTimestamps() {
        this.updatedAt = new Date();
    }

    /**
     * ## Delete
     * ### Public Method
     * This method marks the category as deleted by setting the deletedAt timestamp to the current date and time.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the category is considered deleted and should not be returned in active category queries.
     * @example
     * ```ts
     * category.delete();
     * ```
     */
    public delete() {
        this.deletedAt = new Date();
        this.updateTimestamps();
    }
}