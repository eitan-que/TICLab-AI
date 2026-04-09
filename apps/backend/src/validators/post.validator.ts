import z from "zod";
import { Lexer } from "marked";

/**
 * This function checks if the given Markdown content has balanced fenced code blocks.
 * It iterates through each line of the content, looking for lines that start with three or more backticks (`) or tildes (~).
 * When it finds an opening fence, it stores the marker and its length. When it finds a closing fence that matches the opening one, it clears the stored marker.
 * If at the end of the content there is still an open fence, it means the code blocks are not balanced, and the function returns false. Otherwise, it returns true.
 * @param markdown The Markdown content to check for balanced fenced code blocks.
 * @returns A boolean indicating whether the fenced code blocks in the Markdown content are balanced.
 * @example
 * ```ts
 * const markdown = `
 * # Example Markdown
 * \`\`\`js
 * console.log("Hello, world!");
 * \`\`\`
 * `;
 * const isValid = hasBalancedFencedCodeBlocks(markdown);
 * // isValid would be true
 * ```
 * @example
 * ```ts
 * const markdown = `
 * # Example Markdown
 * \`\`\`js
 * console.log("Hello, world!");
 * // Missing closing fence
 * `;
 * const isValid = hasBalancedFencedCodeBlocks(markdown);
 * // isValid would be false
 * ```
 */
function hasBalancedFencedCodeBlocks(markdown: string): boolean {
    const lines = markdown.split(/\r?\n/);
    let openFence: { marker: "`" | "~"; length: number } | null = null;

    for (const line of lines) {
        const match = line.match(/^\s{0,3}([`~]{3,})[^`~]*$/);
        if (!match) continue;

        const marker = match[1][0] as "`" | "~";
        const length = match[1].length;

        if (!openFence) {
            openFence = { marker, length };
            continue;
        }

        if (openFence.marker === marker && length >= openFence.length) {
            openFence = null;
        }
    }

    return openFence === null;
}

/**
 * This function validates whether the given content is a well-formed Markdown string.
 * It checks for null bytes (which would indicate binary content) and then verifies that
 * all fenced code blocks are balanced using `hasBalancedFencedCodeBlocks`.
 * Finally, it attempts to lex the content using the `marked` library's GFM lexer to
 * confirm it can be parsed as valid GitHub Flavored Markdown.
 * @param content The content string to validate as Markdown.
 * @returns A boolean indicating whether the content is valid Markdown.
 * @example
 * ```ts
 * const valid = isValidMarkdownFormat("# Hello\n\nThis is **bold**.");
 * // valid would be true
 * ```
 * @example
 * ```ts
 * const valid = isValidMarkdownFormat("Hello\u0000World");
 * // valid would be false (contains null byte)
 * ```
 */
function isValidMarkdownFormat(content: string): boolean {
    if (/\u0000/.test(content)) {
        return false;
    }

    if (!hasBalancedFencedCodeBlocks(content)) {
        return false;
    }

    try {
        Lexer.lex(content, { gfm: true });
        return true;
    } catch {
        return false;
    }
}

/**
 * PostId: A UUID string that uniquely identifies a post.
 * Used for both user input and server-side operations.
 */
export const postId = z.uuid({ error: "POST_ID_INVALID" });

export type PostId = z.infer<typeof postId>;

/**
 * PostSlug: A string that serves as a URL-friendly identifier for a post.
 * Must be lowercase, can contain letters, numbers, and hyphens, and must be between 1 and 255 characters.
 * Used for both user input and server-side operations.
 */
export const postSlug = z.string({ error: "POST_SLUG_INVALID" })
    .min(1, { error: "POST_SLUG_TOO_SHORT" })
    .max(255, { error: "POST_SLUG_TOO_LONG" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "POST_SLUG_INVALID_FORMAT" })
    .trim();

export type PostSlug = z.infer<typeof postSlug>;

/**
 * PostTitle: A string that represents the title of a post.
 * Must be between 1 and 255 characters and trimmed of whitespace.
 * Used for both user input and server-side operations.
 */
export const postTitle = z.string({ error: "POST_TITLE_INVALID" })
    .min(1, { error: "POST_TITLE_TOO_SHORT" })
    .max(255, { error: "POST_TITLE_TOO_LONG" })
    .trim();

export type PostTitle = z.infer<typeof postTitle>;

/**
 * AuthorId: A UUID string that identifies the user who authored the post.
 * Used for both user input and server-side operations.
 */
export const authorId = z.uuid({ error: "POST_AUTHOR_ID_INVALID" });

export type AuthorId = z.infer<typeof authorId>;

/**
 * CategoryId: A UUID string that identifies the category to which the post belongs.
 * Used for both user input and server-side operations.
 */
export const categoryId = z.uuid({ error: "POST_CATEGORY_ID_INVALID" });

export type CategoryId = z.infer<typeof categoryId>;

/**
 * PostContent: A string that contains the main content of the post in Markdown format.
 * Must be at least 1 character long and trimmed of whitespace.
 * Used for both user input and server-side operations.
 */
export const postContent = z.string({ error: "POST_CONTENT_INVALID" })
    .min(1, { error: "POST_CONTENT_TOO_SHORT" })
    .refine((content) => isValidMarkdownFormat(content), { error: "POST_CONTENT_INVALID_MARKDOWN" })
    .trim();

export type PostContent = z.infer<typeof postContent>;

/**
 * CreatePostInput: The expected shape of the input when creating a new post.
 * - slug: Required, validated by postSlug schema.
 * - title: Required, validated by postTitle schema.
 * - content: Required, validated by postContent schema.
 * - published: Optional, must be a boolean if provided, defaults to false.
 * - authorId: Optional, must be a valid UUID if provided, or null.
 * - categoryId: Required, must be a valid UUID.
 * Used for validating incoming data when creating a post.
 * Used only for server-side operations.
 */
export const createPostSchema = z.object({
    slug: postSlug,
    title: postTitle,
    content: postContent,
    published: z.boolean({ error: "POST_PUBLISHED_INVALID" }).default(false),
    authorId: authorId.nullable(),
    categoryId: categoryId,
}, {
    error: "CREATE_POST_INPUT_INVALID"
});

export type CreatePost = z.infer<typeof createPostSchema>;

/**
 * UpdatePostInput: The expected shape of the input when updating an existing post.
 * - id: Required, must be a valid UUID.
 * - slug: Optional, validated by postSlug schema if provided.
 * - title: Optional, validated by postTitle schema if provided.
 * - content: Optional, validated by postContent schema if provided.
 * - published: Optional, must be a boolean if provided.
 * - authorId: Optional, must be a valid UUID if provided, or null.
 * - categoryId: Optional, must be a valid UUID if provided.
 * Used for validating incoming data when updating a post.
 * Used only for server-side operations.
 */
export const updatePostSchema = z.object({
    id: postId,
    slug: postSlug.optional(),
    title: postTitle.optional(),
    content: postContent.optional(),
    published: z.boolean({ error: "POST_PUBLISHED_INVALID" }).optional(),
    authorId: authorId.nullable().optional(),
    categoryId: categoryId.optional(),
}, {
    error: "UPDATE_POST_INPUT_INVALID"
});

export type UpdatePost = z.infer<typeof updatePostSchema>;

/**
 * GetAllPostsInput: The expected shape of the input when retrieving a list of posts.
 * - page: Optional, must be a positive integer, defaults to 1.
 * - limit: Optional, must be a positive integer between 1 and 100, defaults to 10.
 * - search: Optional, a string used for searching posts by title or content, max length 255.
 * - title: Optional, validated by postTitle schema if provided, used for filtering posts by title.
 * - categoryId: Optional, must be a valid UUID if provided, used for filtering posts by category.
 * - authorId: Optional, must be a valid UUID if provided, used for filtering posts by author.
 * Used for validating incoming data when retrieving posts with pagination and filters.
 * Used only for server-side operations.
 */
export const getAllPostsSchema = z.object({
    page: z.number({ error: "GET_POSTS_PAGE_INVALID" }).int().positive().default(1),
    limit: z.number({ error: "GET_POSTS_LIMIT_INVALID" }).int().positive().max(100).default(10),
    title: postTitle.optional(),
    categoryId: categoryId.optional(),
    authorId: authorId.optional(),
}, {
    error: "GET_POSTS_INPUT_INVALID"
});

export type GetAllPosts = z.infer<typeof getAllPostsSchema>;

/**
 * DeletedBy: A UUID string that identifies the user who deleted the post.
 */
export const deletedBy = z.uuid({ error: "POST_DELETED_BY_INVALID" }).nullable();

export type DeletedBy = z.infer<typeof deletedBy>;

/**
 * DeletePostInput: The expected shape of the input when deleting a post.
 * - id: Required, must be a valid UUID.
 * - deletedBy: Required, must be a valid UUID identifying who deleted the post.
 * Used for validating incoming data when deleting a post.
 * Used only for server-side operations.
 */
export const deletePostSchema = z.object({
    id: postId,
    deletedBy: deletedBy,
}, {
    error: "DELETE_POST_INPUT_INVALID"
});

export type DeletePost = z.infer<typeof deletePostSchema>;

/**
 * CreatePostInputSchema: A simplified schema for validating the input when creating a new post, specifically for user input.
 * - title: Required, validated by postTitle schema.
 * - content: Required, validated by postContent schema.
 * - categoryId: Required, must be a valid UUID.
 * Used for validating incoming data when creating a post, specifically for the title, content, and categoryId fields.
 * Used only for user input.
 */
export const createPostInputSchema = z.object({
    title: postTitle,
    content: postContent,
    authorId: authorId.nullable(),
    categoryId: categoryId
}, {
    error: "CREATE_POST_INPUT_INVALID"
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

/**
 * UpdatePostInputSchema: A simplified schema for validating the input when updating an existing post, specifically for user input.
 * - id: Required, must be a valid UUID.
 * - title: Optional, validated by postTitle schema if provided.
 * - content: Optional, validated by postContent schema if provided.
 * - categoryId: Optional, must be a valid UUID if provided.
 * Used for validating incoming data when updating a post, specifically for the title, content, and categoryId fields.
 * Used only for user input.
 */
export const updatePostInputSchema = z.object({
    id: postId,
    title: postTitle.optional(),
    content: postContent.optional(),
    categoryId: categoryId.optional(),
}, {
    error: "UPDATE_POST_INPUT_INVALID"
});

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;