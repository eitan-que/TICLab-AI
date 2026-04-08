import { db } from "@/db/drizzle";
import { comment } from "@/db/schema";
import { Comment } from "@/domain/comment.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, ParseZodError } from "@/lib/errors";
import {
    commentId, CommentId,
    CreateComment, createCommentSchema,
    DeleteComment, deleteCommentSchema,
    GetAllComments, getAllCommentsSchema,
    UpdateComment, updateCommentSchema,
} from "@/validators/comment.validator";
import { eq, sql } from "drizzle-orm";
import { ZodError } from "zod";

export interface CommentRepositoryTemplate {
    createComment(data: CreateComment): Promise<Comment>;
    getCommentById(id: CommentId): Promise<Comment | null>;
    getAllComments(query: GetAllComments): Promise<Comment[]>;
    updateComment(data: UpdateComment): Promise<Comment>;
    deleteComment(data: DeleteComment): Promise<void>;
    restoreComment(id: CommentId): Promise<void>;
    hardDeleteComment(id: CommentId): Promise<void>;
}

export class CommentRepository extends Debuggable implements CommentRepositoryTemplate {

    private mapToComment(row: typeof comment.$inferSelect): Comment {
        return new Comment(
            row.id,
            row.content,
            row.authorId,
            row.postId,
            row.deletedBy,
            row.createdAt,
            row.updatedAt,
            row.deletedAt,
        );
    }

    async createComment(data: CreateComment): Promise<Comment> {
        try {
            this.debug.start("Creating new comment");

            this.debug.step("Validating input data", { ...data });
            const validatedData = createCommentSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Inserting new comment into database");
            const result = await db.insert(comment).values({
                content: validatedData.content,
                authorId: validatedData.authorId,
                postId: validatedData.postId,
            }).returning();
            this.debug.info("New comment inserted successfully", { result });

            if (result.length === 0) {
                throw new AppError("Failed to create comment", "COMMENT_CREATION_FAILED", 500);
            }

            const created = result[0];
            this.debug.step("Mapping database record to Comment domain object");
            const newComment = this.mapToComment(created);
            this.debug.info("Comment domain object created successfully");

            this.debug.finish("Comment creation process completed");
            return newComment;

        } catch (err) {
            this.debug.error("Error occurred while creating comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during comment creation", "COMMENT_CREATION_ERROR", 500, { error: err });
        }
    }

    async getCommentById(id: CommentId): Promise<Comment | null> {
        try {
            this.debug.start("Getting comment by ID");

            this.debug.step("Validating comment ID", { id });
            const validatedId = commentId.parse(id);
            this.debug.info("Comment ID validated successfully", { validatedId });

            this.debug.step("Preparing database query");
            const prepared = db.query.comment.findFirst({
                where: { id: { eq: sql.placeholder("id") } }
            }).prepare("getCommentById");

            this.debug.step("Executing database query", { validatedId });
            const row = await prepared.execute({ id: validatedId });

            if (!row) {
                this.debug.finish("Comment not found");
                return null;
            }

            this.debug.step("Mapping to Comment domain object");
            const commentInstance = this.mapToComment(row);

            this.debug.finish("Getting comment by ID completed");
            return commentInstance;

        } catch (err) {
            this.debug.error("Error occurred while retrieving comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during comment retrieval", "COMMENT_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    async getAllComments(query: GetAllComments): Promise<Comment[]> {
        try {
            this.debug.start("Getting all comments");

            this.debug.step("Validating query parameters", { ...query });
            const validatedQuery = getAllCommentsSchema.parse(query);
            this.debug.info("Query parameters validated successfully", { ...validatedQuery });

            this.debug.step("Retrieving comments from database");
            const rows = await db.query.comment.findMany({
                where: validatedQuery.postId ? {
                    postId: { eq: validatedQuery.postId },
                } : undefined,
                offset: (validatedQuery.page - 1) * validatedQuery.limit,
                limit: validatedQuery.limit,
            });
            this.debug.info("Comments retrieved successfully", { count: rows.length });

            const comments = rows.map(row => this.mapToComment(row));

            this.debug.finish("Getting all comments completed");
            return comments;

        } catch (err) {
            this.debug.error("Error occurred while retrieving comments", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during comments retrieval", "COMMENTS_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    async updateComment(data: UpdateComment): Promise<Comment> {
        try {
            this.debug.start("Updating comment");

            this.debug.step("Validating input data", { ...data });
            const validatedData = updateCommentSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Updating comment in database");
            const [row] = await db.update(comment)
                .set({ content: validatedData.content })
                .where(eq(comment.id, validatedData.id))
                .returning();
            this.debug.info("Comment updated successfully");

            const commentInstance = this.mapToComment(row);

            this.debug.finish("Comment update process completed");
            return commentInstance;

        } catch (err) {
            this.debug.error("Error occurred while updating comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during comment update", "COMMENT_UPDATE_ERROR", 500, { error: err });
        }
    }

    async deleteComment(data: DeleteComment): Promise<void> {
        try {
            this.debug.start("Deleting comment");

            this.debug.step("Validating input data", { ...data });
            const validatedData = deleteCommentSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Updating comment in database to set deletedAt and deletedBy");
            await db.update(comment)
                .set({
                    deletedAt: new Date(),
                    deletedBy: validatedData.deletedBy,
                    updatedAt: new Date(),
                })
                .where(eq(comment.id, validatedData.id));
            this.debug.info("Comment marked as deleted successfully", { commentId: validatedData.id });

            this.debug.finish("Comment deletion process completed");

        } catch (err) {
            this.debug.error("Error occurred while deleting comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during comment deletion", "COMMENT_DELETION_ERROR", 500, { error: err });
        }
    }

    async restoreComment(id: CommentId): Promise<void> {
        try {
            this.debug.start("Restoring comment");

            this.debug.step("Validating comment ID", { id });
            const validatedId = commentId.parse(id);
            this.debug.info("Comment ID validated successfully", { validatedId });

            this.debug.step("Updating comment in database to clear deletedAt and deletedBy");
            await db.update(comment)
                .set({
                    deletedAt: null,
                    deletedBy: null,
                    updatedAt: new Date(),
                })
                .where(eq(comment.id, validatedId));
            this.debug.info("Comment restored successfully", { commentId: validatedId });

            this.debug.finish("Comment restoration process completed");

        } catch (err) {
            this.debug.error("Error occurred while restoring comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during comment restoration", "COMMENT_RESTORATION_ERROR", 500, { error: err });
        }
    }

    async hardDeleteComment(id: CommentId): Promise<void> {
        try {
            this.debug.start("Hard deleting comment");

            this.debug.step("Validating comment ID", { id });
            const validatedId = commentId.parse(id);
            this.debug.info("Comment ID validated successfully", { validatedId });

            this.debug.step("Permanently deleting comment from database");
            await db.delete(comment).where(eq(comment.id, validatedId));
            this.debug.info("Comment permanently deleted successfully", { commentId: validatedId });

            this.debug.finish("Comment hard deletion process completed");

        } catch (err) {
            this.debug.error("Error occurred while hard deleting comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during comment hard deletion", "COMMENT_HARD_DELETION_ERROR", 500, { error: err });
        }
    }
}

export const commentRepository = new CommentRepository();
