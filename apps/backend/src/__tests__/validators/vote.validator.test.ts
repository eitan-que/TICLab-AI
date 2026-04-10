import { describe, expect, it } from "bun:test";
import {
    voteId, voteValue, voteUserId, votePostId, voteCommentId,
    createVoteInputSchema, createVoteSchema,
} from "@/validators/vote.validator";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Vote Validators", () => {
    describe("voteId", () => {
        it("accepts valid UUID", () => {
            expect(voteId.parse(validUUID)).toBe(validUUID);
        });
        it("rejects invalid", () => {
            expect(() => voteId.parse("bad")).toThrow();
        });
    });

    describe("voteValue", () => {
        it("accepts true (upvote)", () => {
            expect(voteValue.parse(true)).toBe(true);
        });
        it("accepts false (downvote)", () => {
            expect(voteValue.parse(false)).toBe(false);
        });
        it("rejects non-boolean", () => {
            expect(() => voteValue.parse("true")).toThrow();
        });
    });

    describe("voteUserId", () => {
        it("accepts valid UUID", () => {
            expect(voteUserId.parse(validUUID)).toBe(validUUID);
        });
        it("rejects invalid", () => {
            expect(() => voteUserId.parse("bad")).toThrow();
        });
    });

    describe("votePostId / voteCommentId", () => {
        it("accepts valid UUID", () => {
            expect(votePostId.parse(validUUID)).toBe(validUUID);
            expect(voteCommentId.parse(validUUID)).toBe(validUUID);
        });
        it("accepts null", () => {
            expect(votePostId.parse(null)).toBeNull();
            expect(voteCommentId.parse(null)).toBeNull();
        });
    });

    describe("createVoteInputSchema", () => {
        it("accepts valid post vote", () => {
            const result = createVoteInputSchema.parse({ value: true, postId: validUUID, commentId: null });
            expect(result.value).toBe(true);
            expect(result.postId).toBe(validUUID);
            expect(result.commentId).toBeNull();
        });
        it("accepts valid comment vote", () => {
            const result = createVoteInputSchema.parse({ value: false, postId: null, commentId: validUUID });
            expect(result.value).toBe(false);
            expect(result.commentId).toBe(validUUID);
        });
        it("rejects missing value", () => {
            expect(() => createVoteInputSchema.parse({ postId: validUUID, commentId: null })).toThrow();
        });
    });

    describe("createVoteSchema (repository-level)", () => {
        it("accepts valid input with userId", () => {
            const result = createVoteSchema.parse({
                value: true, userId: validUUID, postId: validUUID, commentId: null,
            });
            expect(result.userId).toBe(validUUID);
        });
        it("rejects missing userId", () => {
            expect(() => createVoteSchema.parse({ value: true, postId: validUUID, commentId: null })).toThrow();
        });
    });
});
