import { AppError, ParseZodError } from "@/lib/errors";
import { commentContent, CommentContent } from "@/validators/comment.validator";
import { ZodError } from "zod";

type CommentJSONFields = {
    id?: boolean;
    content?: boolean;
    authorId?: boolean;
    postId?: boolean;
    deletedBy?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
};

/**
 * Comment represents a comment entity in the system.
 * It encapsulates all properties and behaviors related to a comment, including validation logic.
 * The constructor and setters ensure that any instance of Comment is always in a valid state according to the defined schemas.
 *
 * @example
 * ```ts
 * const comment = new Comment(
 *   "123",
 *   "Great post!",
 *   "user-456",
 *   "post-789",
 *   null,
 *   new Date(),
 *   new Date(),
 *   null
 * );
 * ```
 */
export class Comment {
    constructor(
        private _id: string,
        private _content: string,
        private _authorId: string | null,
        private _postId: string,
        private _deletedBy: string | null,
        private _createdAt: Date,
        private _updatedAt: Date,
        private _deletedAt: Date | null,
    ) {
        try {
            commentContent.parse(this._content);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during comment content validation", "COMMENT_CONTENT_VALIDATION_ERROR", 500, { error: err });
        }
    }

    // Getters

    /**
     * ## ID
     * ### Getter
     * The unique identifier for the comment.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get id(): string {
        return this._id;
    }

    /**
     * ## Content
     * ### Getter
     * The text content of the comment. Must meet the validation criteria defined in the commentContent schema.
     * Updating the content via the setter will also update the updatedAt timestamp.
     */
    get content(): string {
        return this._content;
    }

    /**
     * ## Author ID
     * ### Getter
     * The ID of the user who authored the comment. Can be null for anonymous or system-generated comments.
     */
    get authorId(): string | null {
        return this._authorId;
    }

    /**
     * ## Post ID
     * ### Getter
     * The ID of the post this comment belongs to. This is a required field set at construction time.
     */
    get postId(): string {
        return this._postId;
    }

    /**
     * ## Deleted By
     * ### Getter
     * The ID of the user who soft-deleted this comment.
     * null if not deleted or deleted before this field was introduced.
     */
    get deletedBy(): string | null {
        return this._deletedBy;
    }

    /**
     * ## Created At
     * ### Getter
     * The timestamp when the comment was created.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get createdAt(): Date {
        return this._createdAt;
    }

    /**
     * ## Updated At
     * ### Getter
     * The timestamp when the comment was last updated.
     * This is a read-only property externally; it is managed internally via the private updatedAt setter.
     */
    get updatedAt(): Date {
        return this._updatedAt;
    }

    /**
     * ## Deleted At
     * ### Getter
     * The timestamp when the comment was soft-deleted, or null if the comment is active.
     * This is a read-only property externally; it is managed internally via the private deletedAt setter.
     */
    get deletedAt(): Date | null {
        return this._deletedAt;
    }

    // Setters

    /**
     * ### Setter
     * This setter includes validation logic to ensure the assigned value adheres to the commentContent schema.
     * When the content is updated, the updatedAt timestamp is automatically refreshed.
     * If validation fails, a ValidationError is thrown with details about the specific issues.
     * If an unexpected error occurs during validation, an AppError is thrown.
     * @example
     * ```ts
     * comment.content = "Updated comment text.";
     * ```
     * @throws {ValidationError} If the provided content does not meet the validation criteria defined in the commentContent schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    set content(content: CommentContent) {
        try {
            const validated = commentContent.parse(content);
            this._content = validated;
            this.updateTimestamps();
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during comment content update", "COMMENT_CONTENT_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ### Private Setter
     * #### PREFER USING ```this.updateTimestamps()``` INSTEAD
     * This setter is used to update the updatedAt timestamp whenever the comment is modified.
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
     * This setter is used to set the deletedAt timestamp when the comment is soft-deleted or restored.
     * It is a private setter to ensure that the deletedAt timestamp can only be modified internally by the class methods, maintaining data integrity.
     * @example
     * ```ts
     * this.deletedAt = new Date();
     * ```
     */
    private set deletedAt(date: Date | null) {
        this._deletedAt = date;
    }

    /**
     * ### Private Setter
     * This setter records which user performed the soft-deletion. Set to null on restore.
     * It is a private setter to ensure that the deletedBy field can only be modified internally by the class methods, maintaining data integrity.
     * @example
     * ```ts
     * this.deletedBy = "user-id-123";
     * ```
     */
    private set deletedBy(userId: string | null) {
        this._deletedBy = userId;
    }

    // Methods

    /**
     * ## Private Method
     * This method updates the updatedAt timestamp to the current date and time.
     * It should be called whenever the comment is modified to ensure that the updatedAt timestamp reflects the last modification time.
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
     * This method soft-deletes the comment by setting the deletedAt timestamp to the current date and time,
     * and records which user performed the deletion in the deletedBy field.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the comment is considered deleted and should not be returned in active comment queries.
     * @param deletedById - The ID of the user performing the deletion.
     * @example
     * ```ts
     * comment.delete("user-id-123");
     * ```
     */
    public delete(deletedById: string) {
        this.deletedAt = new Date();
        this.deletedBy = deletedById;
        this.updateTimestamps();
    }

    /**
     * ## Restore
     * ### Public Method
     * This method restores a previously soft-deleted comment by setting the deletedAt and deletedBy fields back to null.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the comment is considered active again and should be returned in active comment queries.
     * @example
     * ```ts
     * comment.restore();
     * ```
     */
    public restore() {
        this.deletedAt = null;
        this.deletedBy = null;
        this.updateTimestamps();
    }

    /**
     * ## toJSON
     * ### Public Method
     * This method converts the Comment instance into a plain JSON object.
     * It accepts an optional parameter `fields` which allows you to specify which properties to include in the output.
     * If `fields` is not provided, all properties will be included in the output.
     * This method is useful for controlling the serialization of the Comment instance, especially when sending data to clients or APIs.
     * @example
     * ```ts
     * const json = comment.toJSON({ id: true, content: true });
     * // json would be { id: "123", content: "Great post!" }
     * ```
     */
    public toJSON(fields?: CommentJSONFields) {
        const payload = {
            id: this.id,
            content: this.content,
            authorId: this.authorId,
            postId: this.postId,
            deletedBy: this.deletedBy,
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
