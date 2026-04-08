import z from "zod";

/**
 * CommentId: A UUID string that uniquely identifies a comment.
 */
export const commentId = z.uuid({ error: "COMMENT_ID_INVALID" });

export type CommentId = z.infer<typeof commentId>;

/**
 * CommentContent: The text body of the comment.
 * Must be between 1 and 5000 characters.
 */
export const commentContent = z.string({ error: "COMMENT_CONTENT_INVALID" })
    .min(1, { error: "COMMENT_CONTENT_TOO_SHORT" })
    .max(5000, { error: "COMMENT_CONTENT_TOO_LONG" })
    .trim();

export type CommentContent = z.infer<typeof commentContent>;

/**
 * CommentAuthorId: UUID of the user who wrote the comment.
 */
export const commentAuthorId = z.uuid({ error: "COMMENT_AUTHOR_ID_INVALID" }).nullable();

export type CommentAuthorId = z.infer<typeof commentAuthorId>;

/**
 * CommentPostId: UUID of the post this comment belongs to.
 */
export const commentPostId = z.uuid({ error: "COMMENT_POST_ID_INVALID" });

export type CommentPostId = z.infer<typeof commentPostId>;

/**
 * CommentDeletedBy: UUID of the user who soft-deleted this comment.
 */
export const commentDeletedBy = z.uuid({ error: "COMMENT_DELETED_BY_INVALID" }).nullable();

export type CommentDeletedBy = z.infer<typeof commentDeletedBy>;

/**
 * createCommentSchema: Repository-level schema for creating a comment.
 */
export const createCommentSchema = z.object({
    content: commentContent,
    authorId: commentAuthorId,
    postId: commentPostId,
}, {
    error: "CREATE_COMMENT_INPUT_INVALID"
});

export type CreateComment = z.infer<typeof createCommentSchema>;

/**
 * createCommentInputSchema: User-facing schema for creating a comment.
 * authorId is excluded — provided by the controller from the session.
 */
export const createCommentInputSchema = z.object({
    content: commentContent,
    postId: commentPostId,
}, {
    error: "CREATE_COMMENT_INPUT_INVALID"
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

/**
 * updateCommentSchema: Repository-level schema for updating a comment.
 */
export const updateCommentSchema = z.object({
    id: commentId,
    content: commentContent.optional(),
}, {
    error: "UPDATE_COMMENT_INPUT_INVALID"
});

export type UpdateComment = z.infer<typeof updateCommentSchema>;

/**
 * updateCommentInputSchema: User-facing schema for updating a comment.
 */
export const updateCommentInputSchema = z.object({
    id: commentId,
    content: commentContent.optional(),
}, {
    error: "UPDATE_COMMENT_INPUT_INVALID"
});

export type UpdateCommentInput = z.infer<typeof updateCommentInputSchema>;

/**
 * getAllCommentsSchema: Schema for querying a list of comments.
 */
export const getAllCommentsSchema = z.object({
    page: z.number({ error: "GET_COMMENTS_PAGE_INVALID" }).int().positive().default(1),
    limit: z.number({ error: "GET_COMMENTS_LIMIT_INVALID" }).int().positive().max(100).default(10),
    postId: commentPostId.optional(),
}, {
    error: "GET_COMMENTS_INPUT_INVALID"
});

export type GetAllComments = z.infer<typeof getAllCommentsSchema>;

/**
 * deleteCommentSchema: Repository-level schema for soft-deleting a comment.
 */
export const deleteCommentSchema = z.object({
    id: commentId,
    deletedBy: commentDeletedBy,
}, {
    error: "DELETE_COMMENT_INPUT_INVALID"
});

export type DeleteComment = z.infer<typeof deleteCommentSchema>;
