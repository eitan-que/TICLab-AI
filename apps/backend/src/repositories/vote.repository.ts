import { db } from "@/db/drizzle";
import { vote } from "@/db/schema";
import { Vote } from "@/domain/vote.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, ParseZodError } from "@/lib/errors";
import {
    CreateVote, createVoteSchema,
    voteId, VoteId,
    votePostId, VotePostId,
    voteCommentId, VoteCommentId,
    voteUserId, VoteUserId,
} from "@/validators/vote.validator";
import { and, eq, isNull, sql } from "drizzle-orm";
import { ZodError } from "zod";

export interface VoteRepositoryTemplate {
    createVote(data: CreateVote): Promise<Vote>;
    getVoteById(id: VoteId): Promise<Vote | null>;
    getVotesByPostId(postId: VotePostId): Promise<Vote[]>;
    getVotesByCommentId(commentId: VoteCommentId): Promise<Vote[]>;
    getVoteByUserAndPost(userId: VoteUserId, postId: string): Promise<Vote | null>;
    getVoteByUserAndComment(userId: VoteUserId, commentId: string): Promise<Vote | null>;
    deleteVote(id: VoteId): Promise<void>;
}

/**
 * # VoteRepository
 * The VoteRepository class is responsible for managing all database operations related to the Vote entity.
 * Votes are cast by authenticated users on posts or comments (never both simultaneously).
 * Each user may cast at most one vote per post and one vote per comment — duplicate prevention is enforced at the service layer.
 * It provides methods for creating, retrieving by various criteria, and deleting votes.
 * Note: votes are not soft-deleted; deletion is permanent.
 * Each method includes validation of input data using Zod schemas and detailed error handling with custom error classes.
 * The repository integrates with the Debug class to provide step-by-step logging for troubleshooting and monitoring.
 * @see Vote for the domain model that this repository manages.
 */
export class VoteRepository extends Debuggable implements VoteRepositoryTemplate {

    private mapToVote(row: typeof vote.$inferSelect): Vote {
        return new Vote(
            row.id,
            row.value,
            row.userId,
            row.postId,
            row.commentId,
            row.createdAt,
            row.updatedAt,
        );
    }

    /**
     * ## Create Vote
     * Inserts a new vote into the database.
     * @param data - The data for the new vote, conforming to the CreateVote schema.
     * @returns A promise that resolves to the newly created Vote domain object.
     * @throws {ValidationError} If the input data fails schema validation.
     * @throws {AppError} If the insert returns no rows or an unexpected error occurs.
     * @example
     * ```ts
     * const vote = await voteRepository.createVote({ value: true, userId: "user-id-123", postId: "post-id-456", commentId: null });
     * ```
     */
    async createVote(data: CreateVote): Promise<Vote> {
        try {
            this.debug.start("Creating new vote");

            this.debug.step("Validating input data", { ...data });
            const validatedData = createVoteSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Inserting new vote into database");
            const result = await db.insert(vote).values({
                value: validatedData.value,
                userId: validatedData.userId,
                postId: validatedData.postId,
                commentId: validatedData.commentId,
            }).returning();
            this.debug.info("New vote inserted successfully");

            if (result.length === 0) {
                throw new AppError("Failed to create vote", "VOTE_CREATION_FAILED", 500);
            }

            const created = result[0];
            const newVote = this.mapToVote(created);

            this.debug.finish("Vote creation process completed");
            return newVote;

        } catch (err) {
            this.debug.error("Error occurred while creating vote", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during vote creation", "VOTE_CREATION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Vote by ID
     * Retrieves a single vote by its unique identifier.
     * @param id - The UUID of the vote to retrieve.
     * @returns A promise that resolves to the Vote domain object, or null if not found.
     * @throws {ValidationError} If the provided ID fails schema validation.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const vote = await voteRepository.getVoteById("vote-id-123");
     * ```
     */
    async getVoteById(id: VoteId): Promise<Vote | null> {
        try {
            this.debug.start("Getting vote by ID");

            this.debug.step("Validating vote ID", { id });
            const validatedId = voteId.parse(id);

            const prepared = db.query.vote.findFirst({
                where: { id: { eq: sql.placeholder("id") } }
            }).prepare("getVoteById");

            const row = await prepared.execute({ id: validatedId });

            if (!row) {
                this.debug.finish("Vote not found");
                return null;
            }

            const voteInstance = this.mapToVote(row);
            this.debug.finish("Getting vote by ID completed");
            return voteInstance;

        } catch (err) {
            this.debug.error("Error occurred while retrieving vote", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during vote retrieval", "VOTE_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Votes by Post ID
     * Retrieves all votes cast on a specific post.
     * @param postId - The UUID of the post whose votes should be retrieved, or null.
     * @returns A promise that resolves to an array of Vote domain objects for the post.
     * @throws {ValidationError} If the provided postId fails schema validation.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const votes = await voteRepository.getVotesByPostId("post-id-123");
     * ```
     */
    async getVotesByPostId(postId: VotePostId): Promise<Vote[]> {
        try {
            this.debug.start("Getting votes by post ID");

            this.debug.step("Validating post ID", { postId });
            const validatedId = votePostId.parse(postId);
            this.debug.info("Post ID validated successfully");

            const rows = await db.query.vote.findMany({
                where: {
                    postId: validatedId ? { eq: validatedId } : undefined,
                },
            });

            const votes = rows.map(row => this.mapToVote(row));

            this.debug.finish("Getting votes by post ID completed");
            return votes;

        } catch (err) {
            this.debug.error("Error occurred while retrieving votes by post", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during votes retrieval by post", "VOTES_BY_POST_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Votes by Comment ID
     * Retrieves all votes cast on a specific comment.
     * @param commentId - The UUID of the comment whose votes should be retrieved, or null.
     * @returns A promise that resolves to an array of Vote domain objects for the comment.
     * @throws {ValidationError} If the provided commentId fails schema validation.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const votes = await voteRepository.getVotesByCommentId("comment-id-123");
     * ```
     */
    async getVotesByCommentId(commentId: VoteCommentId): Promise<Vote[]> {
        try {
            this.debug.start("Getting votes by comment ID");

            this.debug.step("Validating comment ID", { commentId });
            const validatedId = voteCommentId.parse(commentId);
            this.debug.info("Comment ID validated successfully");

            const rows = await db.query.vote.findMany({
                where: {
                    commentId: validatedId ? { eq: validatedId } : undefined,
                },
            });

            const votes = rows.map(row => this.mapToVote(row));

            this.debug.finish("Getting votes by comment ID completed");
            return votes;

        } catch (err) {
            this.debug.error("Error occurred while retrieving votes by comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during votes retrieval by comment", "VOTES_BY_COMMENT_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Vote by User and Post
     * Checks whether a specific user has already voted on a specific post.
     * Used by the service layer to prevent duplicate votes.
     * @param userId - The UUID of the user.
     * @param postId - The UUID of the post.
     * @returns A promise that resolves to the existing Vote, or null if the user has not voted on this post.
     * @throws {ValidationError} If the userId fails schema validation.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const existing = await voteRepository.getVoteByUserAndPost("user-id-123", "post-id-456");
     * ```
     */
    async getVoteByUserAndPost(userId: VoteUserId, postId: string): Promise<Vote | null> {
        try {
            this.debug.start("Getting vote by user and post");

            const validatedUserId = voteUserId.parse(userId);

            const [row] = await db.select().from(vote)
                .where(and(
                    eq(vote.userId, validatedUserId),
                    eq(vote.postId, postId),
                    isNull(vote.commentId),
                ))
                .limit(1);

            if (!row) return null;
            return this.mapToVote(row);

        } catch (err) {
            this.debug.error("Error occurred while retrieving vote by user and post", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during vote retrieval", "VOTE_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Vote by User and Comment
     * Checks whether a specific user has already voted on a specific comment.
     * Used by the service layer to prevent duplicate votes.
     * @param userId - The UUID of the user.
     * @param commentId - The UUID of the comment.
     * @returns A promise that resolves to the existing Vote, or null if the user has not voted on this comment.
     * @throws {ValidationError} If the userId fails schema validation.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const existing = await voteRepository.getVoteByUserAndComment("user-id-123", "comment-id-456");
     * ```
     */
    async getVoteByUserAndComment(userId: VoteUserId, commentId: string): Promise<Vote | null> {
        try {
            this.debug.start("Getting vote by user and comment");

            const validatedUserId = voteUserId.parse(userId);

            const [row] = await db.select().from(vote)
                .where(and(
                    eq(vote.userId, validatedUserId),
                    eq(vote.commentId, commentId),
                    isNull(vote.postId),
                ))
                .limit(1);

            if (!row) return null;
            return this.mapToVote(row);

        } catch (err) {
            this.debug.error("Error occurred while retrieving vote by user and comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during vote retrieval", "VOTE_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Delete Vote
     * Permanently removes a vote from the database. Votes are not soft-deleted.
     * @param id - The UUID of the vote to permanently delete.
     * @returns A promise that resolves when the vote has been deleted.
     * @throws {ValidationError} If the provided ID fails schema validation.
     * @throws {AppError} If an unexpected error occurs during deletion.
     * @example
     * ```ts
     * await voteRepository.deleteVote("vote-id-123");
     * ```
     */
    async deleteVote(id: VoteId): Promise<void> {
        try {
            this.debug.start("Deleting vote");

            this.debug.step("Validating vote ID", { id });
            const validatedId = voteId.parse(id);
            this.debug.info("Vote ID validated successfully", { validatedId });

            this.debug.step("Permanently deleting vote from database");
            await db.delete(vote).where(eq(vote.id, validatedId));
            this.debug.info("Vote deleted successfully", { voteId: validatedId });

            this.debug.finish("Vote deletion process completed");

        } catch (err) {
            this.debug.error("Error occurred while deleting vote", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during vote deletion", "VOTE_DELETION_ERROR", 500, { error: err });
        }
    }
}

export const voteRepository = new VoteRepository();
