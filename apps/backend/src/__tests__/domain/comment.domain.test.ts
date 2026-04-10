import { describe, expect, it } from "bun:test";
import { Comment } from "@/domain/comment.domain";

const now = new Date();

function makeComment(overrides: Partial<{
    id: string; content: string; authorId: string | null; postId: string;
    deletedBy: string | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}> = {}) {
    const defaults = {
        id: "comment-1",
        content: "Great post!",
        authorId: "user-1" as string | null,
        postId: "post-1",
        deletedBy: null as string | null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null as Date | null,
    };
    const merged = { ...defaults, ...overrides };
    return new Comment(
        merged.id, merged.content, merged.authorId, merged.postId,
        merged.deletedBy, merged.createdAt, merged.updatedAt, merged.deletedAt,
    );
}

describe("Comment Domain", () => {
    describe("construction", () => {
        it("creates a valid comment", () => {
            const comment = makeComment();
            expect(comment.id).toBe("comment-1");
            expect(comment.content).toBe("Great post!");
            expect(comment.authorId).toBe("user-1");
            expect(comment.postId).toBe("post-1");
            expect(comment.deletedBy).toBeNull();
            expect(comment.deletedAt).toBeNull();
        });

        it("rejects empty content", () => {
            expect(() => makeComment({ content: "" })).toThrow();
        });

        it("rejects content exceeding 5000 characters", () => {
            expect(() => makeComment({ content: "a".repeat(5001) })).toThrow();
        });

        it("allows null authorId", () => {
            const comment = makeComment({ authorId: null });
            expect(comment.authorId).toBeNull();
        });
    });

    describe("content setter", () => {
        it("updates content", () => {
            const comment = makeComment();
            comment.content = "Updated content";
            expect(comment.content).toBe("Updated content");
        });

        it("updates updatedAt timestamp", () => {
            const comment = makeComment({ updatedAt: new Date("2020-01-01") });
            const before = comment.updatedAt;
            comment.content = "New content";
            expect(comment.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });

        it("rejects invalid content via setter", () => {
            const comment = makeComment();
            expect(() => { comment.content = ""; }).toThrow();
        });
    });

    describe("delete / restore", () => {
        it("soft-deletes a comment", () => {
            const comment = makeComment();
            comment.delete("admin-1");
            expect(comment.deletedAt).not.toBeNull();
            expect(comment.deletedBy).toBe("admin-1");
        });

        it("restores a soft-deleted comment", () => {
            const comment = makeComment();
            comment.delete("admin-1");
            comment.restore();
            expect(comment.deletedAt).toBeNull();
            expect(comment.deletedBy).toBeNull();
        });

        it("updates updatedAt on delete", () => {
            const comment = makeComment({ updatedAt: new Date("2020-01-01") });
            const before = comment.updatedAt;
            comment.delete("admin-1");
            expect(comment.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });
    });

    describe("toJSON", () => {
        it("returns all fields when no filter is provided", () => {
            const json = makeComment().toJSON();
            expect(json).toHaveProperty("id", "comment-1");
            expect(json).toHaveProperty("content", "Great post!");
            expect(json).toHaveProperty("authorId", "user-1");
            expect(json).toHaveProperty("postId", "post-1");
            expect(json).toHaveProperty("deletedBy", null);
            expect(json).toHaveProperty("deletedAt", null);
        });

        it("returns only selected fields", () => {
            const json = makeComment().toJSON({ id: true, content: true });
            expect(json).toEqual({ id: "comment-1", content: "Great post!" });
        });
    });
});
