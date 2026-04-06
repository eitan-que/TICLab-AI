import { AppError, ParseZodError } from "@/lib/errors";
import { postContent, postSlug, PostSlug, PostTitle, postTitle } from "@/validators/post.validator";
import { ZodError } from "zod";

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

    // Methods
    
    /**
     * ### Static Method
     * This method generates a slug from the given post title by converting it to lowercase, replacing non-alphanumeric characters with hyphens, and trimming leading/trailing hyphens.
     * The generated slug is then validated against the postSlug schema to ensure it meets the required format.
     * If the validation fails, a ValidationError is thrown with details about the specific validation issues.
     * If an unexpected error occurs during validation, an AppError is thrown with details about the error.
     * @example
     * ```ts
     * const slug = this.slugifyName("Example Post Title");
     * // slug would be "example-post-title-1a2b" (the random suffix will vary)
     * ```
     * @throws {ValidationError} If the generated slug does not meet the validation criteria defined in the postSlug schema.
     * @throws {AppError} If an unexpected error occurs during validation.
     */
    static slugifyName(name: PostTitle): PostSlug {
        const loweredName = name.toLowerCase();
        const baseSlug = loweredName.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const randomSuffix = Math.random().toString(36).slice(2, 6);
        const slug = `${baseSlug}-${randomSuffix}`;
        return slug as PostSlug;
    }
}