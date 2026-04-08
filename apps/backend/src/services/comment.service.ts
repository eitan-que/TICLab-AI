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

export class CommentService extends Debuggable {
    constructor(
        private repository: CommentRepositoryTemplate
    ) {
        super();
    }

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
