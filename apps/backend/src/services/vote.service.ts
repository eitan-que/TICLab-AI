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

/**
 * VoteService handles all business logic related to votes.
 * Votes can target either a post or a comment, never both simultaneously.
 * Each user may cast at most one vote per post and one vote per comment — duplicates are rejected with a ConflictError.
 * All methods throw typed errors (ValidationError, BadRequestError, NotFoundError, ConflictError, ForbiddenError, AppError)
 * to allow consistent error handling at the controller layer.
 */
export class VoteService extends Debuggable {
    constructor(
        private repository: VoteRepositoryTemplate
    ) {
        super();
    }

    /**
     * ## Create Vote
     * Casts a vote on a post or comment on behalf of the authenticated user.
     * Validates that exactly one target (postId or commentId) is provided, that the target exists and is not deleted,
     * and that the user has not already voted on the same target.
     * @param data - The vote input conforming to CreateVoteInput, containing value, postId, and commentId.
     * @param userId - The ID of the authenticated user casting the vote.
     * @returns A promise that resolves to the created Vote object.
     * @throws {ValidationError} If the input data does not meet the validation criteria.
     * @throws {BadRequestError} If neither or both of postId/commentId are provided.
     * @throws {NotFoundError} If the target post or comment does not exist or is deleted.
     * @throws {ConflictError} If the user has already voted on the target.
     * @throws {AppError} If an unexpected error occurs during creation.
     * @example
     * ```ts
     * const vote = await voteService.create({ value: true, postId: "post-id-123", commentId: null }, "user-id-456");
     * ```
     */
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

    /**
     * ## Get Vote by ID
     * Retrieves a vote by its unique identifier.
     * @param id - The unique identifier of the vote to retrieve.
     * @returns A promise that resolves to the Vote object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If no vote is found with the provided ID.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const vote = await voteService.getById("vote-id-123");
     * ```
     */
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

    /**
     * ## Get Votes by Post
     * Retrieves all votes cast on a specific post.
     * @param postId - The UUID of the post whose votes should be retrieved, or null.
     * @returns A promise that resolves to an array of Vote objects for the post.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const votes = await voteService.getByPost("post-id-123");
     * ```
     */
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

    /**
     * ## Get Votes by Comment
     * Retrieves all votes cast on a specific comment.
     * @param commentId - The UUID of the comment whose votes should be retrieved, or null.
     * @returns A promise that resolves to an array of Vote objects for the comment.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const votes = await voteService.getByComment("comment-id-123");
     * ```
     */
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

    /**
     * ## Delete Vote
     * Permanently removes a vote. Only the vote owner or an ADMIN may delete a vote.
     * @param id - The unique identifier of the vote to delete.
     * @param requesterId - The ID of the user requesting the deletion.
     * @param requesterRole - The role of the user requesting the deletion.
     * @returns A promise that resolves when the vote has been permanently deleted.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If the vote does not exist.
     * @throws {ForbiddenError} If the requester is neither the vote owner nor an ADMIN.
     * @throws {AppError} If an unexpected error occurs during deletion.
     * @example
     * ```ts
     * await voteService.delete("vote-id-123", "user-id-456", "USER");
     * ```
     */
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
