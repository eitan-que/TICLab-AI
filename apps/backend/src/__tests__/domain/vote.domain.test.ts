import { describe, expect, it } from "bun:test";
import { Vote } from "@/domain/vote.domain";
import { AppError } from "@/lib/errors";

const now = new Date();

function makeVote(overrides: Partial<{
    id: string; value: boolean; userId: string;
    postId: string | null; commentId: string | null;
    createdAt: Date; updatedAt: Date;
}> = {}) {
    const defaults = {
        id: "vote-1",
        value: true,
        userId: "user-1",
        postId: "post-1" as string | null,
        commentId: null as string | null,
        createdAt: now,
        updatedAt: now,
    };
    const merged = { ...defaults, ...overrides };
    return new Vote(
        merged.id, merged.value, merged.userId,
        merged.postId, merged.commentId,
        merged.createdAt, merged.updatedAt,
    );
}

describe("Vote Domain", () => {
    describe("construction", () => {
        it("creates a valid post vote (upvote)", () => {
            const vote = makeVote();
            expect(vote.id).toBe("vote-1");
            expect(vote.value).toBe(true);
            expect(vote.userId).toBe("user-1");
            expect(vote.postId).toBe("post-1");
            expect(vote.commentId).toBeNull();
        });

        it("creates a valid comment vote (downvote)", () => {
            const vote = makeVote({ postId: null, commentId: "comment-1", value: false });
            expect(vote.value).toBe(false);
            expect(vote.postId).toBeNull();
            expect(vote.commentId).toBe("comment-1");
        });

        it("throws when both postId and commentId are null", () => {
            expect(() => makeVote({ postId: null, commentId: null })).toThrow(AppError);
        });

        it("allows both postId and commentId to be set (domain doesn't enforce exclusivity)", () => {
            const vote = makeVote({ postId: "post-1", commentId: "comment-1" });
            expect(vote.postId).toBe("post-1");
            expect(vote.commentId).toBe("comment-1");
        });
    });

    describe("toJSON", () => {
        it("returns all fields when no filter is provided", () => {
            const json = makeVote().toJSON();
            expect(json).toHaveProperty("id", "vote-1");
            expect(json).toHaveProperty("value", true);
            expect(json).toHaveProperty("userId", "user-1");
            expect(json).toHaveProperty("postId", "post-1");
            expect(json).toHaveProperty("commentId", null);
            expect(typeof json.createdAt).toBe("string");
            expect(typeof json.updatedAt).toBe("string");
        });

        it("returns only selected fields", () => {
            const json = makeVote().toJSON({ id: true, value: true, userId: true });
            expect(json).toEqual({ id: "vote-1", value: true, userId: "user-1" });
        });

        it("returns empty object when no fields selected", () => {
            const json = makeVote().toJSON({});
            expect(json).toEqual({});
        });
    });
});
