import { Comment } from "@/domain/comment.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ParseZodError } from "@/lib/errors";
import { commentRepository, CommentRepositoryTemplate } from "@/repositories/comment.repository";
import {
    commentId, CommentId,
    createCommentInputSchema, CreateCommentInput,
    getAllCommentsSchema, GetAllComments,
    updateCommentInputSchema, UpdateCommentInput,
} from "@/validators/comment.validator";
import { ZodError } from "zod";
import { postService } from "@/services/post.service";

/**
 * CommentService handles all business logic related to comments.
 * It validates inputs, enforces authorization rules, and delegates persistence to the repository.
 * All methods throw typed errors (ValidationError, NotFoundError, ConflictError, ForbiddenError, AppError)
 * to allow consistent error handling at the controller layer.
 */
export class CommentService extends Debuggable {
    constructor(
        private repository: CommentRepositoryTemplate
    ) {
        super();
    }

    /**
     * ## Create Comment
     * Creates a new comment on a post.
     * Validates the input data and confirms the target post exists and is not deleted.
     * @param data - The input data for creating a comment, conforming to CreateCommentInput.
     * @param authorId - The ID of the user creating the comment, or null for anonymous comments.
     * @returns A promise that resolves to the created Comment object.
     * @throws {ValidationError} If the input data does not meet the validation criteria.
     * @throws {NotFoundError} If the target post does not exist or is deleted.
     * @throws {AppError} If an unexpected error occurs during creation.
     * @example
     * ```ts
     * const comment = await commentService.create({ content: "Nice post!", postId: "post-id-123" }, "user-id-456");
     * ```
     */
    async create(data: CreateCommentInput, authorId: string | null): Promise<Comment> {
        try {
            this.debug.start("Creating comment");

            this.debug.step("Validating input data", { ...data });
            const validatedData = createCommentInputSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Validating post existence", { postId: validatedData.postId });
            const post = await postService.getById(validatedData.postId);
            this.debug.info("Post existence validated", { postId: validatedData.postId });

            if (post.deletedAt) {
                this.debug.warn("Post is deleted, cannot comment on it", { postId: validatedData.postId });
                throw new NotFoundError("Post not found", { postId: validatedData.postId });
            }

            this.debug.step("Creating comment in repository");
            const created = await this.repository.createComment({
                content: validatedData.content,
                authorId,
                postId: validatedData.postId,
            });
            this.debug.info("Comment created successfully");

            this.debug.finish("Comment creation completed successfully");
            return created;

        } catch (err) {
            this.debug.error("Error occurred during comment creation", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during comment creation", "COMMENT_CREATION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Comment by ID
     * Retrieves a comment by its unique identifier.
     * Validates the ID format and throws a NotFoundError if no comment is found.
     * @param id - The unique identifier of the comment to retrieve.
     * @returns A promise that resolves to the retrieved Comment object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If no comment is found with the provided ID.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const comment = await commentService.getById("comment-id-123");
     * ```
     */
    async getById(id: CommentId): Promise<Comment> {
        try {
            this.debug.start("Retrieving comment by ID", { id });

            this.debug.step("Validating comment ID", { id });
            const validatedId = commentId.parse(id);
            this.debug.info("Comment ID validated successfully", { validatedId });

            this.debug.step("Fetching comment from repository", { id: validatedId });
            const comment = await this.repository.getCommentById(validatedId);

            if (!comment) {
                throw new NotFoundError("Comment not found", { id: validatedId });
            }

            this.debug.finish("Comment retrieval by ID completed successfully");
            return comment;

        } catch (err) {
            this.debug.error("Error occurred during comment retrieval by ID", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during comment retrieval", "COMMENT_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get All Comments
     * Retrieves a list of comments based on the provided query parameters.
     * Validates query parameters before delegating to the repository.
     * @param query - The query parameters for filtering and paginating comments, conforming to GetAllComments.
     * @returns A promise that resolves to an array of Comment objects matching the query.
     * @throws {ValidationError} If the provided query parameters do not meet the validation criteria.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const comments = await commentService.getAll({ postId: "post-id-123", page: 1, limit: 10 });
     * ```
     */
    async getAll(query: GetAllComments): Promise<Comment[]> {
        try {
            this.debug.start("Retrieving all comments", { ...query });

            this.debug.step("Validating query parameters", { ...query });
            const parsedQuery = getAllCommentsSchema.parse(query);
            this.debug.info("Query parameters validated successfully", { ...parsedQuery });

            this.debug.step("Fetching comments from repository", { ...parsedQuery });
            const comments = await this.repository.getAllComments(parsedQuery);
            this.debug.info("Comments retrieval completed", { count: comments.length });

            this.debug.finish("All comments retrieval completed successfully");
            return comments;

        } catch (err) {
            this.debug.error("Error occurred during comments retrieval", { error: err, query });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during comments retrieval", "COMMENTS_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Update Comment
     * Updates an existing comment's content.
     * Validates input data, confirms the comment exists and is not deleted, then persists the changes.
     * @param data - The update payload conforming to UpdateCommentInput, including the comment ID.
     * @returns A promise that resolves to the updated Comment object.
     * @throws {ValidationError} If the input data does not meet the validation criteria.
     * @throws {NotFoundError} If the comment does not exist or is already deleted.
     * @throws {AppError} If an unexpected error occurs during the update.
     * @example
     * ```ts
     * const updated = await commentService.update({ id: "comment-id-123", content: "Updated text." });
     * ```
     */
    async update(data: UpdateCommentInput): Promise<Comment> {
        try {
            this.debug.start("Updating comment", { ...data });

            this.debug.step("Validating input data", { ...data });
            const validatedData = updateCommentInputSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Checking if comment exists", { id: validatedData.id });
            const existingComment = await this.getById(validatedData.id);

            if (existingComment.deletedAt) {
                throw new NotFoundError("Comment not found", { id: validatedData.id });
            }

            this.debug.step("Updating comment in repository", { ...validatedData });
            const updated = await this.repository.updateComment(validatedData);
            this.debug.info("Comment updated successfully");

            this.debug.finish("Comment update completed successfully");
            return updated;

        } catch (err) {
            this.debug.error("Error occurred during comment update", { error: err, data });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during comment update", "COMMENT_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Delete Comment
     * Soft-deletes a comment by setting its deletedAt timestamp and recording who deleted it.
     * Throws a ConflictError if the comment is already deleted.
     * @param id - The unique identifier of the comment to delete.
     * @param deletedById - The ID of the user performing the deletion.
     * @returns A promise that resolves to the soft-deleted Comment object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If the comment does not exist.
     * @throws {ConflictError} If the comment is already deleted.
     * @throws {AppError} If an unexpected error occurs during deletion.
     * @example
     * ```ts
     * const deleted = await commentService.delete("comment-id-123", "user-id-456");
     * ```
     */
    async delete(id: CommentId, deletedById: string): Promise<Comment> {
        try {
            this.debug.start("Deleting comment", { id, deletedById });

            this.debug.step("Validating comment ID", { id });
            const validatedId = commentId.parse(id);
            this.debug.info("Comment ID validated successfully", { validatedId });

            this.debug.step("Checking if comment exists", { id: validatedId });
            const existingComment = await this.getById(validatedId);

            if (existingComment.deletedAt) {
                throw new ConflictError("Comment is already deleted", { id: validatedId });
            }

            this.debug.step("Deleting comment in repository", { id: validatedId, deletedById });
            await this.repository.deleteComment({ id: validatedId, deletedBy: deletedById });
            this.debug.info("Comment deleted successfully");

            existingComment.delete(deletedById);

            this.debug.finish("Comment deletion completed successfully");
            return existingComment;

        } catch (err) {
            this.debug.error("Error occurred during comment deletion", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during comment deletion", "COMMENT_DELETION_ERROR", 500, { error: err });
        }
    }

    /**
     * Restores a soft-deleted comment.
     * @param id - The comment ID to restore.
     * @param requesterId - The ID of the user attempting the restore.
     * @param requesterRole - The role of the user attempting the restore.
     * @throws {ForbiddenError} If the comment was deleted by admin/mod and the requester is the author.
     */
    async restore(id: CommentId, requesterId: string, requesterRole: string): Promise<Comment> {
        try {
            this.debug.start("Restoring comment", { id, requesterId, requesterRole });

            this.debug.step("Validating comment ID", { id });
            const validatedId = commentId.parse(id);
            this.debug.info("Comment ID validated successfully", { validatedId });

            this.debug.step("Checking if comment exists", { id: validatedId });
            const existingComment = await this.getById(validatedId);

            if (!existingComment.deletedAt) {
                throw new ConflictError("Comment is not deleted", { id: validatedId });
            }

            const isAdminOrModerator = requesterRole === "ADMIN" || requesterRole === "MODERATOR";
            const selfDeleted = existingComment.deletedBy === requesterId;

            this.debug.step("Checking restore authorization", { isAdminOrModerator, selfDeleted });
            if (!isAdminOrModerator && !selfDeleted) {
                throw new ForbiddenError("Cannot restore comment deleted by an administrator or moderator", { id: validatedId });
            }

            this.debug.step("Restoring comment in repository", { id: validatedId });
            await this.repository.restoreComment(validatedId);
            this.debug.info("Comment restored successfully");

            existingComment.restore();

            this.debug.finish("Comment restoration completed successfully");
            return existingComment;

        } catch (err) {
            this.debug.error("Error occurred during comment restoration", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during comment restoration", "COMMENT_RESTORE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Hard Delete Comment
     * Permanently removes a comment from the database. The comment must be soft-deleted first.
     * @param id - The unique identifier of the comment to permanently delete.
     * @returns A promise that resolves when the comment has been permanently deleted.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If the comment does not exist.
     * @throws {ConflictError} If the comment is not soft-deleted (must be deleted before hard deleting).
     * @throws {AppError} If an unexpected error occurs during hard deletion.
     * @example
     * ```ts
     * await commentService.hardDelete("comment-id-123");
     * ```
     */
    async hardDelete(id: CommentId): Promise<void> {
        try {
            this.debug.start("Hard deleting comment", { id });

            this.debug.step("Validating comment ID", { id });
            const validatedId = commentId.parse(id);
            this.debug.info("Comment ID validated successfully", { validatedId });

            this.debug.step("Checking if comment exists", { id: validatedId });
            const existingComment = await this.getById(validatedId);

            if (!existingComment.deletedAt) {
                throw new ConflictError("Comment is not deleted", { id: validatedId });
            }

            this.debug.step("Hard deleting comment in repository", { id: validatedId });
            await this.repository.hardDeleteComment(validatedId);
            this.debug.info("Comment hard deleted successfully");

            this.debug.finish("Comment hard deletion completed successfully");

        } catch (err) {
            this.debug.error("Error occurred during comment hard deletion", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during comment hard deletion", "COMMENT_HARD_DELETE_ERROR", 500, { error: err });
        }
    }
}

export const commentService = new CommentService(commentRepository);
