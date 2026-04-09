import { AppError, ParseZodError } from "@/lib/errors";
import { postContent, postSlug, PostSlug, PostTitle, postTitle } from "@/validators/post.validator";
import { ZodError } from "zod";

type PostJSONFields = {
    id?: boolean;
    slug?: boolean;
    title?: boolean;
    content?: boolean;
    published?: boolean;
    authorId?: boolean;
    categoryId?: boolean;
    deletedBy?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
};

/**
 * Post represents a post entity in the system.
 * It encapsulates all properties and behaviors related to a post, including validation logic.
 * The constructor and setters ensure that any instance of Post is always in a valid state according to the defined schemas.
 *
 * @example
 * ```ts
 * const post = new Post(
 *   "123",
 *   "my-post-ab12",
 *   "My Post",
 *   "# Hello World",
 *   true,
 *   "user-456",
 *   "category-789",
 *   null,
 *   new Date(),
 *   new Date(),
 *   null
 * );
 * ```
 */
export class Post {
    constructor(
        private _id: string,
        private _slug: string,
        private _title: string,
        private _content: string,
        private _published: boolean,
        private _authorId: string | null,
        private _categoryId: string,
        private _deletedBy: string | null,
        private _createdAt: Date,
        private _updatedAt: Date,
        private _deletedAt: Date | null,
    ) {
        // Validate Title
        try {
            postTitle.parse(this._title);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post title validation", "POST_TITLE_VALIDATION_ERROR", 500, { error: err });
        }
        // Validate Slug
        try {
            postSlug.parse(this._slug);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post slug validation", "POST_SLUG_VALIDATION_ERROR", 500, { error: err });
        }
        // Validate Content
        try {
            postContent.parse(this._content);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post content validation", "POST_CONTENT_VALIDATION_ERROR", 500, { error: err });
        }
    }

    // Getters

    /**
     * ## ID
     * ### Getter
     * The unique identifier for the post.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get id(): string {
        return this._id;
    }

    /**
     * ## Slug
     * ### Getter
     * The URL-friendly identifier for the post. Automatically regenerated when the title is updated.
     * This is a read-only property externally; it is managed internally via the private slug setter.
     */
    get slug(): string {
        return this._slug;
    }

    /**
     * ## Title
     * ### Getter
     * The title of the post. Must be between 1 and 255 characters, trimmed of whitespace.
     * Updating the title via the setter will also regenerate the slug.
     */
    get title(): string {
        return this._title;
    }

    /**
     * ## Content
     * ### Getter
     * The main body of the post in Markdown format.
     * Must be at least 1 character and must be valid Markdown with balanced fenced code blocks.
     */
    get content(): string {
        return this._content;
    }

    /**
     * ## Published
     * ### Getter
     * Whether the post is publicly visible. Unpublished posts are hidden from public queries.
     */
    get published(): boolean {
        return this._published;
    }

    /**
     * ## Author ID
     * ### Getter
     * The ID of the user who authored the post. Can be null for anonymous or system-generated posts.
     */
    get authorId(): string | null {
        return this._authorId;
    }

    /**
     * ## Category ID
     * ### Getter
     * The ID of the category this post belongs to. This is a required field.
     */
    get categoryId(): string {
        return this._categoryId;
    }

    /**
     * ## Deleted By
     * ### Getter
     * The ID of the user who soft-deleted this post.
     * null if the post has not been deleted or was deleted before this field was added.
     */
    get deletedBy(): string | null {
        return this._deletedBy;
    }

    /**
     * ## Created At
     * ### Getter
     * The timestamp when the post was created.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get createdAt(): Date {
        return this._createdAt;
    }

    /**
     * ## Updated At
     * ### Getter
     * The timestamp when the post was last updated.
     * This is a read-only property externally; it is managed internally via the private updatedAt setter.
     */
    get updatedAt(): Date {
        return this._updatedAt;
    }

    /**
     * ## Deleted At
     * ### Getter
     * The timestamp when the post was soft-deleted, or null if the post is active.
     * This is a read-only property externally; it is managed internally via the private deletedAt setter.
     */
    get deletedAt(): Date | null {
        return this._deletedAt;
    }

    // Setters

    /**
     * ### Setter
     * This setter includes validation logic to ensure the assigned value adheres to the postTitle schema.
     * When the title is updated, the slug is automatically regenerated from the new title and also validated.
     * If validation fails, a ValidationError is thrown with details about the specific issues.
     * If an unexpected error occurs during validation, an AppError is thrown.
     * @example
     * ```ts
     * post.title = "Updated Post Title";
     * ```
     * @throws {ValidationError} If the provided title does not meet the validation criteria defined in the postTitle schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    set title(title: PostTitle) {
        try {
            const validatedTitle = postTitle.parse(title);
            this._title = validatedTitle;
            this.slug = Post.slugifyTitle(validatedTitle);
            this.updateTimestamps();
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post title update", "POST_TITLE_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ### Private Setter
     * Validates and assigns the slug. Called internally when the title is updated.
     * If validation fails, a ValidationError is thrown with details about the specific issues.
     * @example
     * ```ts
     * this.slug = "updated-post-title-ab12";
     * ```
     * @throws {ValidationError} If the provided slug does not meet the validation criteria defined in the postSlug schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    private set slug(slug: PostSlug) {
        try {
            const validatedSlug = postSlug.parse(slug);
            this._slug = validatedSlug;
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post slug update", "POST_SLUG_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ### Private Setter
     * #### PREFER USING ```this.updateTimestamps()``` INSTEAD
     * This setter is used to update the updatedAt timestamp whenever the post is modified.
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
     * This setter is used to set the deletedAt timestamp when the post is soft-deleted or restored.
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
     * ### Static Method
     * Generates a URL-friendly slug from the given post title by converting it to lowercase,
     * replacing non-alphanumeric characters with hyphens, and appending a random 4-character suffix.
     * @example
     * ```ts
     * const slug = Post.slugifyTitle("My Post Title");
     * // slug would be "my-post-title-1a2b" (the random suffix will vary)
     * ```
     * @throws {ValidationError} If the generated slug does not meet the validation criteria defined in the postSlug schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    static slugifyTitle(title: PostTitle): PostSlug {
        const loweredTitle = title.toLowerCase();
        const baseSlug = loweredTitle.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const randomSuffix = Math.random().toString(36).slice(2, 6);
        const slug = `${baseSlug}-${randomSuffix}`;
        return slug as PostSlug;
    }

    /**
     * ## Private Method
     * This method updates the updatedAt timestamp to the current date and time.
     * It should be called whenever the post is modified to ensure that the updatedAt timestamp reflects the last modification time.
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
     * This method soft-deletes the post by setting the deletedAt timestamp to the current date and time,
     * and records which user performed the deletion in the deletedBy field.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the post is considered deleted and should not be returned in active post queries.
     * @param deletedById - The ID of the user performing the deletion.
     * @example
     * ```ts
     * post.delete("user-id-123");
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
     * This method restores a previously soft-deleted post by setting the deletedAt and deletedBy fields back to null.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the post is considered active again and should be returned in active post queries.
     * @example
     * ```ts
     * post.restore();
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
     * This method converts the Post instance into a plain JSON object.
     * It accepts an optional parameter `fields` which allows you to specify which properties to include in the output.
     * If `fields` is not provided, all properties will be included in the output.
     * This method is useful for controlling the serialization of the Post instance, especially when sending data to clients or APIs.
     * @example
     * ```ts
     * const json = post.toJSON({ id: true, title: true, slug: true });
     * // json would be { id: "123", title: "My Post", slug: "my-post-ab12" }
     * ```
     */
    public toJSON(fields?: PostJSONFields) {
        const payload = {
            id: this.id,
            slug: this.slug,
            title: this.title,
            content: this.content,
            published: this.published,
            authorId: this.authorId,
            categoryId: this.categoryId,
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
