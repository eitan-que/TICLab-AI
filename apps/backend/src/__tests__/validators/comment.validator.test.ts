import { describe, expect, it } from "bun:test";
import {
    commentId, commentContent, commentAuthorId, commentPostId,
    createCommentInputSchema, updateCommentInputSchema, getAllCommentsSchema,
    deleteCommentSchema,
} from "@/validators/comment.validator";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Comment Validators", () => {
    describe("commentId", () => {
        it("accepts valid UUID", () => {
            expect(commentId.parse(validUUID)).toBe(validUUID);
        });
        it("rejects invalid", () => {
            expect(() => commentId.parse("bad")).toThrow();
        });
    });

    describe("commentContent", () => {
        it("accepts valid content", () => {
            expect(commentContent.parse("Nice post!")).toBe("Nice post!");
        });
        it("trims whitespace", () => {
            expect(commentContent.parse("  hello  ")).toBe("hello");
        });
        it("rejects empty", () => {
            expect(() => commentContent.parse("")).toThrow();
        });
        it("rejects over 5000 chars", () => {
            expect(() => commentContent.parse("a".repeat(5001))).toThrow();
        });
    });

    describe("commentAuthorId", () => {
        it("accepts valid UUID", () => {
            expect(commentAuthorId.parse(validUUID)).toBe(validUUID);
        });
        it("accepts null", () => {
            expect(commentAuthorId.parse(null)).toBeNull();
        });
    });

    describe("commentPostId", () => {
        it("accepts valid UUID", () => {
            expect(commentPostId.parse(validUUID)).toBe(validUUID);
        });
        it("rejects invalid", () => {
            expect(() => commentPostId.parse("bad")).toThrow();
        });
    });

    describe("createCommentInputSchema", () => {
        it("accepts valid input", () => {
            const result = createCommentInputSchema.parse({ content: "Hello!", postId: validUUID });
            expect(result.content).toBe("Hello!");
            expect(result.postId).toBe(validUUID);
        });
        it("rejects missing content", () => {
            expect(() => createCommentInputSchema.parse({ postId: validUUID })).toThrow();
        });
        it("rejects missing postId", () => {
            expect(() => createCommentInputSchema.parse({ content: "Hello!" })).toThrow();
        });
    });

    describe("updateCommentInputSchema", () => {
        it("accepts valid update", () => {
            const result = updateCommentInputSchema.parse({ id: validUUID, content: "Updated" });
            expect(result.content).toBe("Updated");
        });
        it("accepts update with only id", () => {
            const result = updateCommentInputSchema.parse({ id: validUUID });
            expect(result.id).toBe(validUUID);
        });
    });

    describe("getAllCommentsSchema", () => {
        it("provides defaults", () => {
            const result = getAllCommentsSchema.parse({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });
        it("accepts postId filter", () => {
            const result = getAllCommentsSchema.parse({ postId: validUUID });
            expect(result.postId).toBe(validUUID);
        });
        it("rejects limit over 100", () => {
            expect(() => getAllCommentsSchema.parse({ limit: 101 })).toThrow();
        });
    });

    describe("deleteCommentSchema", () => {
        it("accepts valid input", () => {
            const result = deleteCommentSchema.parse({ id: validUUID, deletedBy: validUUID });
            expect(result.id).toBe(validUUID);
        });
        it("allows null deletedBy", () => {
            const result = deleteCommentSchema.parse({ id: validUUID, deletedBy: null });
            expect(result.deletedBy).toBeNull();
        });
    });
});
