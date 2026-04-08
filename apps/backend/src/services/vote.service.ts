import { Vote } from "@/domain/vote.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, ParseZodError } from "@/lib/errors";
import { voteRepository, VoteRepositoryTemplate } from "@/repositories/vote.repository";
import {
    createVoteInputSchema, CreateVoteInput,
    voteId, VoteId,
    VoteCommentId, VotePostId,
} from "@/validators/vote.validator";
import { ZodError } from "zod";
import { postService } from "@/services/post.service";
import { commentService } from "@/services/comment.service";

export class VoteService extends Debuggable {
    constructor(
        private repository: VoteRepositoryTemplate
    ) {
        super();
    }

    async create(data: CreateVoteInput, userId: string): Promise<Vote> {
        try {
            this.debug.start("Creating vote", { ...data, userId });

            this.debug.step("Validating input data", { ...data });
            const validatedData = createVoteInputSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            // Must target exactly one of post or comment
            if (!validatedData.postId && !validatedData.commentId) {
                throw new BadRequestError("Vote must target either a post or a comment", {});
            }
            if (validatedData.postId && validatedData.commentId) {
                throw new BadRequestError("Vote cannot target both a post and a comment simultaneously", {});
            }

            if (validatedData.postId) {
                this.debug.step("Validating post existence", { postId: validatedData.postId });
                const post = await postService.getById(validatedData.postId);
                if (post.deletedAt) {
                    throw new NotFoundError("Post not found", { postId: validatedData.postId });
                }

                this.debug.step("Checking for duplicate vote on post", { userId, postId: validatedData.postId });
                const existing = await this.repository.getVoteByUserAndPost(userId, validatedData.postId);
                if (existing) {
                    throw new ConflictError("User has already voted on this post", { userId, postId: validatedData.postId });
                }
            }

            if (validatedData.commentId) {
                this.debug.step("Validating comment existence", { commentId: validatedData.commentId });
                const comment = await commentService.getById(validatedData.commentId);
                if (comment.deletedAt) {
                    throw new NotFoundError("Comment not found", { commentId: validatedData.commentId });
                }

                this.debug.step("Checking for duplicate vote on comment", { userId, commentId: validatedData.commentId });
                const existing = await this.repository.getVoteByUserAndComment(userId, validatedData.commentId);
                if (existing) {
                    throw new ConflictError("User has already voted on this comment", { userId, commentId: validatedData.commentId });
                }
            }

            this.debug.step("Creating vote in repository");
            const created = await this.repository.createVote({
                value: validatedData.value,
                userId,
                postId: validatedData.postId,
                commentId: validatedData.commentId,
            });
            this.debug.info("Vote created successfully");

            this.debug.finish("Vote creation completed successfully");
            return created;

        } catch (err) {
            this.debug.error("Error occurred during vote creation", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during vote creation", "VOTE_CREATION_ERROR", 500, { error: err });
        }
    }

    async getById(id: VoteId): Promise<Vote> {
        try {
            this.debug.start("Retrieving vote by ID", { id });

            const validatedId = voteId.parse(id);
            const vote = await this.repository.getVoteById(validatedId);

            if (!vote) {
                throw new NotFoundError("Vote not found", { id: validatedId });
            }

            this.debug.finish("Vote retrieval by ID completed successfully");
            return vote;

        } catch (err) {
            this.debug.error("Error occurred during vote retrieval by ID", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during vote retrieval", "VOTE_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    async getByPost(postId: VotePostId): Promise<Vote[]> {
        try {
            this.debug.start("Retrieving votes by post", { postId });
            const votes = await this.repository.getVotesByPostId(postId);
            this.debug.finish("Votes by post retrieval completed");
            return votes;
        } catch (err) {
            this.debug.error("Error occurred during votes retrieval by post", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during votes retrieval", "VOTES_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    async getByComment(commentId: VoteCommentId): Promise<Vote[]> {
        try {
            this.debug.start("Retrieving votes by comment", { commentId });
            const votes = await this.repository.getVotesByCommentId(commentId);
            this.debug.finish("Votes by comment retrieval completed");
            return votes;
        } catch (err) {
            this.debug.error("Error occurred during votes retrieval by comment", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during votes retrieval", "VOTES_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    async delete(id: VoteId, requesterId: string, requesterRole: string): Promise<void> {
        try {
            this.debug.start("Deleting vote", { id, requesterId, requesterRole });

            const validatedId = voteId.parse(id);
            const existingVote = await this.getById(validatedId);

            const isAdmin = requesterRole === "ADMIN";
            const isOwner = existingVote.userId === requesterId;
            if (!isAdmin && !isOwner) {
                throw new ForbiddenError("Cannot delete vote", { userId: requesterId, voteOwnerId: existingVote.userId });
            }

            await this.repository.deleteVote(validatedId);
            this.debug.finish("Vote deletion completed successfully");

        } catch (err) {
            this.debug.error("Error occurred during vote deletion", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during vote deletion", "VOTE_DELETION_ERROR", 500, { error: err });
        }
    }
}

export const voteService = new VoteService(voteRepository);
