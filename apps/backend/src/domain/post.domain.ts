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
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
};

export class Post {
    constructor(
        private _id: string,
        private _slug: string,
        private _title: string,
        private _content: string,
        private _published: boolean,
        private _authorId: string | null,
        private _categoryId: string,
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
     * ## Id
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
     * The slug of the post. This is a required field that must be unique and follow a specific format.
     * The setter for this property includes validation logic to ensure that any assigned value adheres to the defined schema.
     */
    get slug(): string {
        return this._slug;
    }

    /**
     * ## Title
     * ### Getter
     * The title of the post. This is a required field that must meet specific validation criteria defined in the postTitle schema.
     * The setter for this property includes validation logic to ensure that any assigned value adheres to the defined schema.
     */
    get title(): string {
        return this._title;
    }

    /**
     * ## Content
     * ### Getter
     * The content of the post. This is a required field that must meet specific validation criteria defined in the postContent schema.
     * The setter for this property includes validation logic to ensure that any assigned value adheres to the defined schema.
     */
    get content(): string {
        return this._content;
    }

    /**
     * ## Published
     * ### Getter
     * Indicates whether the post is published or not. This is a boolean value that can be set to true or false.
     * The setter for this property can include additional logic to handle state changes related to publishing, such as setting the published date or triggering notifications.
     */
    get published(): boolean {
        return this._published;
    }

    /**
     * ## AuthorId
     * ### Getter
     * The unique identifier of the author who created the post. This is an optional field that can be null if the post does not have an associated author.
     * The setter for this property can include validation logic to ensure that any assigned value corresponds to a valid user in the system.
     */
    get authorId(): string | null {
        return this._authorId;
    }

    /**
     * ## CategoryId
     * ### Getter
     * The unique identifier of the category to which the post belongs. This is a required field that must correspond to a valid category in the system.
     * The setter for this property can include validation logic to ensure that any assigned value corresponds to a valid category in the system.
     */
    get categoryId(): string {
        return this._categoryId;
    }

    /**
     * ## CreatedAt
     * ### Getter
     * The date and time when the post was created. 
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get createdAt(): Date {
        return this._createdAt;
    }

    /**
     * ## UpdatedAt
     * ### Getter
     * The date and time when the post was last updated. 
     * This is a read-only property that is updated automatically whenever the post is modified.
     */
    get updatedAt(): Date {
        return this._updatedAt;
    }

    /**
     * ## DeletedAt
     * ### Getter
     * The date and time when the post was deleted. 
     * This is an optional field that can be null if the post has not been deleted.
     */
    get deletedAt(): Date | null {
        return this._deletedAt;
    }

    // Setters

    /**
     * ### Setter
     * This setter includes validation logic to ensure that any assigned value adheres to the defined schema.
     * When the title is updated, the slug is automatically generated from the title and also validated.
     * If the validation fails, a ValidationError is thrown with details about the specific validation issues.
     * If an unexpected error occurs during validation, an AppError is thrown with details about the error.
     * @example
     * ```ts
     * post.title = "New Post Title";
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
     * This setter includes validation logic to ensure that any assigned value adheres to the defined schema.
     * If the validation fails, a ValidationError is thrown with details about the specific validation issues.
     * If an unexpected error occurs during validation, an AppError is thrown with details about the error.
     * @example
     * ```ts
     * this.slug = "new-post-slug";
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
     * This setter is used to set the deletedAt timestamp when the post is deleted.
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
     * ### Static Method
     * This method generates a slug from the given post title by converting it to lowercase, replacing non-alphanumeric characters with hyphens, and trimming leading/trailing hyphens.
     * The generated slug is then validated against the postSlug schema to ensure it meets the required format.
     * If the validation fails, a ValidationError is thrown with details about the specific validation issues.
     * If an unexpected error occurs during validation, an AppError is thrown with details about the error.
     * @example
     * ```ts
     * const slug = this.slugifyTitle("Example Post Title");
     * // slug would be "example-post-title-1a2b" (the random suffix will vary)
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
     * This method marks the post as deleted by setting the deletedAt timestamp to the current date and time.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the post is considered deleted and should not be returned in active post queries.
     * @example
     * ```ts
     * post.delete();
     * ```
     */
    public delete() {
        this.deletedAt = new Date();
        this.updateTimestamps();
    }

    /**
     * ## Restore
     * ### Public Method
     * This method restores a previously deleted post by setting the deletedAt timestamp back to null.
     * It also updates the updatedAt timestamp to reflect the modification.
     * After calling this method, the post is considered active again and should be returned in active post queries.
     * @example
     * ```ts
     * post.restore();
     * ```
     */
    public restore() {
        this.deletedAt = null;
        this.updateTimestamps();
    }

    /**
     * ## toJSON
     * ### Public Method
     * This method converts the Post instance into a JSON object. 
     * It accepts an optional parameter `fields` which allows you to specify which properties to include in the output.
     * If `fields` is not provided, all properties will be included in the output.
     * This method is useful for controlling the serialization of the Post instance, especially when sending data to clients or APIs.
     * @example
     * ```ts
     * const json = post.toJSON({ id: true, title: true });
     * // json would be { id: "123", title: "Example Post" }
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