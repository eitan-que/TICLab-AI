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

    get id(): string {
        return this._id;
    }

    get slug(): string {
        return this._slug;
    }

    get title(): string {
        return this._title;
    }

    get content(): string {
        return this._content;
    }

    get published(): boolean {
        return this._published;
    }

    get authorId(): string | null {
        return this._authorId;
    }

    get categoryId(): string {
        return this._categoryId;
    }

    /**
     * The ID of the user who soft-deleted this post.
     * null if the post has not been deleted or was deleted before this field was added.
     */
    get deletedBy(): string | null {
        return this._deletedBy;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    get deletedAt(): Date | null {
        return this._deletedAt;
    }

    // Setters

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

    private set updatedAt(date: Date) {
        this._updatedAt = date;
    }

    private set deletedAt(date: Date | null) {
        this._deletedAt = date;
    }

    private set deletedBy(userId: string | null) {
        this._deletedBy = userId;
    }

    // Methods

    static slugifyTitle(title: PostTitle): PostSlug {
        const loweredTitle = title.toLowerCase();
        const baseSlug = loweredTitle.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const randomSuffix = Math.random().toString(36).slice(2, 6);
        const slug = `${baseSlug}-${randomSuffix}`;
        return slug as PostSlug;
    }

    private updateTimestamps() {
        this.updatedAt = new Date();
    }

    /**
     * Soft-deletes the post and records who deleted it.
     * @param deletedById - The ID of the user performing the deletion.
     */
    public delete(deletedById: string) {
        this.deletedAt = new Date();
        this.deletedBy = deletedById;
        this.updateTimestamps();
    }

    public restore() {
        this.deletedAt = null;
        this.deletedBy = null;
        this.updateTimestamps();
    }

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
