import z from "zod";

/**
 * TagId: A UUID string that uniquely identifies a tag.
 */
export const tagId = z.uuid({ error: "TAG_ID_INVALID" });

export type TagId = z.infer<typeof tagId>;

/**
 * TagName: The display name of the tag. Must be 1-100 characters, trimmed.
 */
export const tagName = z.string({ error: "TAG_NAME_INVALID" })
    .min(1, { error: "TAG_NAME_TOO_SHORT" })
    .max(100, { error: "TAG_NAME_TOO_LONG" })
    .trim();

export type TagName = z.infer<typeof tagName>;

/**
 * TagCreatedBy: UUID of the user who created the tag.
 */
export const tagCreatedBy = z.uuid({ error: "TAG_CREATED_BY_INVALID" }).nullable();

export type TagCreatedBy = z.infer<typeof tagCreatedBy>;

/**
 * createTagSchema: Repository-level schema for creating a tag.
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
 */
export const createTagInputSchema = z.object({
    name: tagName,
}, {
    error: "CREATE_TAG_INPUT_INVALID"
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;

/**
 * updateTagSchema: Repository-level schema for updating a tag.
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
 */
export const updateTagInputSchema = z.object({
    id: tagId,
    name: tagName.optional(),
}, {
    error: "UPDATE_TAG_INPUT_INVALID"
});

export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;

/**
 * getAllTagsSchema: Schema for querying a list of tags.
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
 */
export const postTagSchema = z.object({
    postId: z.uuid({ error: "POST_TAG_POST_ID_INVALID" }),
    tagId: tagId,
}, {
    error: "POST_TAG_INPUT_INVALID"
});

export type PostTag = z.infer<typeof postTagSchema>;
