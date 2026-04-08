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
