import z from "zod";

/**
 * VoteId: A UUID string that uniquely identifies a vote.
 */
export const voteId = z.uuid({ error: "VOTE_ID_INVALID" });

export type VoteId = z.infer<typeof voteId>;

/**
 * VoteValue: A boolean representing an upvote (true) or downvote (false).
 */
export const voteValue = z.boolean({ error: "VOTE_VALUE_INVALID" });

export type VoteValue = z.infer<typeof voteValue>;

/**
 * VoteUserId: UUID of the user casting the vote.
 */
export const voteUserId = z.uuid({ error: "VOTE_USER_ID_INVALID" });

export type VoteUserId = z.infer<typeof voteUserId>;

/**
 * VotePostId: UUID of the post being voted on (optional).
 */
export const votePostId = z.uuid({ error: "VOTE_POST_ID_INVALID" }).nullable();

export type VotePostId = z.infer<typeof votePostId>;

/**
 * VoteCommentId: UUID of the comment being voted on (optional).
 */
export const voteCommentId = z.uuid({ error: "VOTE_COMMENT_ID_INVALID" }).nullable();

export type VoteCommentId = z.infer<typeof voteCommentId>;

/**
 * createVoteSchema: Repository-level schema for creating a vote.
 * Either postId or commentId must be provided (enforced in service layer).
 */
export const createVoteSchema = z.object({
    value: voteValue,
    userId: voteUserId,
    postId: votePostId,
    commentId: voteCommentId,
}, {
    error: "CREATE_VOTE_INPUT_INVALID"
});

export type CreateVote = z.infer<typeof createVoteSchema>;

/**
 * createVoteInputSchema: User-facing schema for casting a vote.
 * userId is excluded — provided by the controller from the session.
 */
export const createVoteInputSchema = z.object({
    value: voteValue,
    postId: votePostId,
    commentId: voteCommentId,
}, {
    error: "CREATE_VOTE_INPUT_INVALID"
});

export type CreateVoteInput = z.infer<typeof createVoteInputSchema>;
