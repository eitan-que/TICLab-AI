import z from "zod";

/**
 * TagId: A UUID string that uniquely identifies a tag.
 */
export const tagId = z.uuid({ error: "TAG_ID_INVALID" });

export type TagId = z.infer<typeof tagId>;

/**
 * TagName: The display name of the tag. Must be 1-100 alphanumeric characters (letters and numbers only), trimmed.
 * No spaces, hyphens, or special characters are allowed — tags behave like hashtags.
 */
export const tagName = z.string({ error: "TAG_NAME_INVALID" })
    .min(1, { error: "TAG_NAME_TOO_SHORT" })
    .max(100, { error: "TAG_NAME_TOO_LONG" })
    .regex(/^[a-zA-Z0-9]+$/, { error: "TAG_NAME_INVALID_FORMAT" })
    .trim();

export type TagName = z.infer<typeof tagName>;

/**
 * TagCreatedBy: UUID of the user who created the tag.
 */
export const tagCreatedBy = z.uuid({ error: "TAG_CREATED_BY_INVALID" }).nullable();

export type TagCreatedBy = z.infer<typeof tagCreatedBy>;

/**
 * createTagSchema: Repository-level schema for creating a tag.
 * - name: Required, validated by tagName schema.
 * - createdBy: Required, must be a valid UUID identifying the creator, or null.
 * Used only for server-side operations (repository layer).
 */
export const createTagSchema = z.object({
    name: tagName,
    createdBy: tagCreatedBy,
}, {
    error: "CREATE_TAG_INPUT_INVALID"
});

export type CreateTag = z.infer<typeof createTagSchema>;

/**
 * createTagInputSchema: User-facing schema for creating a tag.
 * - name: Required, validated by tagName schema.
 * Tags behave like hashtags — any authenticated user can create a tag by name.
 * If a tag with the same name already exists, the existing tag is returned instead of creating a duplicate.
 * createdBy is excluded — it is injected by the controller from the authenticated session.
 * Used only for user input.
 */
export const createTagInputSchema = z.object({
    name: tagName,
}, {
    error: "CREATE_TAG_INPUT_INVALID"
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;

/**
 * updateTagSchema: Repository-level schema for updating a tag.
 * - id: Required, must be a valid UUID identifying the tag to update.
 * - name: Optional, validated by tagName schema if provided.
 * Used only for server-side operations (repository layer).
 */
export const updateTagSchema = z.object({
    id: tagId,
    name: tagName.optional(),
}, {
    error: "UPDATE_TAG_INPUT_INVALID"
});

export type UpdateTag = z.infer<typeof updateTagSchema>;

/**
 * updateTagInputSchema: User-facing schema for updating a tag.
 * - id: Required, must be a valid UUID identifying the tag to update.
 * - name: Optional, validated by tagName schema if provided.
 * Used only for user input.
 */
export const updateTagInputSchema = z.object({
    id: tagId,
    name: tagName.optional(),
}, {
    error: "UPDATE_TAG_INPUT_INVALID"
});

export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;

/**
 * getAllTagsSchema: Schema for querying a paginated list of tags.
 * - page: Optional, must be a positive integer, defaults to 1.
 * - limit: Optional, must be a positive integer between 1 and 100, defaults to 10.
 * - name: Optional, validated by tagName schema if provided, used for filtering tags by name (partial match).
 * Used for validating incoming query parameters when listing tags.
 */
export const getAllTagsSchema = z.object({
    page: z.number({ error: "GET_TAGS_PAGE_INVALID" }).int().positive().default(1),
    limit: z.number({ error: "GET_TAGS_LIMIT_INVALID" }).int().positive().max(100).default(10),
    name: tagName.optional(),
}, {
    error: "GET_TAGS_INPUT_INVALID"
});

export type GetAllTags = z.infer<typeof getAllTagsSchema>;

/**
 * postTagSchema: Schema for adding or removing a tag from a post.
 * - postId: Required, must be a valid UUID identifying the post.
 * - tagId: Required, must be a valid UUID identifying the tag.
 * Used for both addTagToPost and removeTagFromPost operations.
 * Authorization is enforced at the service layer — only the post author, ADMIN, or MODERATOR may modify a post's tags.
 */
export const postTagSchema = z.object({
    postId: z.uuid({ error: "POST_TAG_POST_ID_INVALID" }),
    tagId: tagId,
}, {
    error: "POST_TAG_INPUT_INVALID"
});

export type PostTag = z.infer<typeof postTagSchema>;
