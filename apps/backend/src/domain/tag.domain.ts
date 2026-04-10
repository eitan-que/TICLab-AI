import { AppError, ParseZodError } from "@/lib/errors";
import { tagName, TagName } from "@/validators/tag.validator";
import { ZodError } from "zod";

type TagJSONFields = {
    id?: boolean;
    name?: boolean;
    createdBy?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
};

/**
 * Tag represents a tag entity in the system.
 * It encapsulates all properties and behaviors related to a tag, including validation logic.
 * The constructor and setters ensure that any instance of Tag is always in a valid state according to the defined schemas.
 *
 * @example
 * ```ts
 * const tag = new Tag(
 *   "123",
 *   "typescript",
 *   "user-456",
 *   new Date(),
 *   new Date(),
 *   null
 * );
 * ```
 */
export class Tag {
    constructor(
        private _id: string,
        private _name: string,
        private _createdBy: string | null,
        private _createdAt: Date,
        private _updatedAt: Date,
        private _deletedAt: Date | null,
    ) {
        try {
            tagName.parse(this._name);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during tag name validation", "TAG_NAME_VALIDATION_ERROR", 500, { error: err });
        }
    }

    // Getters

    /**
     * ## ID
     * ### Getter
     * The unique identifier for the tag.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get id(): string {
        return this._id;
    }

    /**
     * ## Name
     * ### Getter
     * The name of the tag. Must meet the validation criteria defined in the tagName schema.
     * Updating the name via the setter will also update the updatedAt timestamp.
     */
    get name(): string {
        return this._name;
    }

    /**
     * ## Created By
     * ### Getter
     * The ID of the user who created the tag. Can be null for system-generated tags.
     */
    get createdBy(): string | null {
        return this._createdBy;
    }

    /**
     * ## Created At
     * ### Getter
     * The timestamp when the tag was created.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get createdAt(): Date {
        return this._createdAt;
    }

    /**
     * ## Updated At
     * ### Getter
     * The timestamp when the tag was last updated.
     * This is a read-only property externally; it is managed internally via the private updatedAt setter.
     */
    get updatedAt(): Date {
        return this._updatedAt;
    }

    /**
     * ## Deleted At
     * ### Getter
     * The timestamp when the tag was soft-deleted, or null if the tag is active.
     * This is a read-only property externally; it is managed internally via the private deletedAt setter.
     */
    get deletedAt(): Date | null {
        return this._deletedAt;
    }

    // Setters

    /**
     * ### Setter
     * This setter includes validation logic to ensure the assigned value adheres to the tagName schema.
     * When the name is updated, the updatedAt timestamp is automatically refreshed.
     * If validation fails, a ValidationError is thrown with details about the specific issues.
     * If an unexpected error occurs during validation, an AppError is thrown.
     * @example
     * ```ts
     * tag.name = "javascript";
     * ```
     * @throws {ValidationError} If the provided name does not meet the validation criteria defined in the tagName schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    set name(name: TagName) {
        try {
            const validated = tagName.parse(name);
            this._name = validated;
            this.updateTimestamps();
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during tag name update", "TAG_NAME_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ### Private Setter
     * #### PREFER USING ```this.updateTimestamps()``` INSTEAD
     * This setter is used to update the updatedAt timestamp whenever the tag is modified.
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
     * This setter is used to set the deletedAt timestamp when the tag is soft-deleted or restored.
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
     * ## Private Method
     * This method updates the updatedAt timestamp to the current date and time.
     * It should be called whenever the tag is modified to ensure that the updatedAt timestamp reflects the last modification time.
     * @example
     * ```ts
     * this.updateTimestamps();
     * ```
     */
    private updateTimestamps() {
        this.updatedAt = new Date();
    }

    /**
     * ## Delete
     * ### Public Method
     * This method marks the tag as deleted by setting the deletedAt timestamp to the current date and time.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the tag is considered deleted and should not be returned in active tag queries.
     * @example
     * ```ts
     * tag.delete();
     * ```
     */
    public delete() {
        this.deletedAt = new Date();
        this.updateTimestamps();
    }

    /**
     * ## Restore
     * ### Public Method
     * This method restores a previously soft-deleted tag by setting the deletedAt timestamp back to null.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the tag is considered active again and should be returned in active tag queries.
     * @example
     * ```ts
     * tag.restore();
     * ```
     */
    public restore() {
        this.deletedAt = null;
        this.updateTimestamps();
    }

    /**
     * ## toJSON
     * ### Public Method
     * This method converts the Tag instance into a plain JSON object.
     * It accepts an optional parameter `fields` which allows you to specify which properties to include in the output.
     * If `fields` is not provided, all properties will be included in the output.
     * This method is useful for controlling the serialization of the Tag instance, especially when sending data to clients or APIs.
     * @example
     * ```ts
     * const json = tag.toJSON({ id: true, name: true });
     * // json would be { id: "123", name: "typescript" }
     * ```
     */
    public toJSON(fields?: TagJSONFields) {
        const payload = {
            id: this.id,
            name: this.name,
            createdBy: this.createdBy,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            deletedAt: this.deletedAt ? this.deletedAt.toISOString() : null,
        };

        if (!fields) {
            return payload;
        }

        const selected: Partial<typeof payload> = {};
        for (const key of Object.keys(payload) as Array<keyof typeof payload>) {
            if (fields[key]) {
                (selected as Record<string, unknown>)[key] = payload[key];
            }
        }

        return selected;
    }
}
