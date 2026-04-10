import { describe, expect, it } from "bun:test";
import {
    tagId, tagName,
    createTagInputSchema, updateTagInputSchema, getAllTagsSchema, postTagSchema,
} from "@/validators/tag.validator";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Tag Validators", () => {
    describe("tagId", () => {
        it("accepts valid UUID", () => {
            expect(tagId.parse(validUUID)).toBe(validUUID);
        });
        it("rejects invalid", () => {
            expect(() => tagId.parse("bad")).toThrow();
        });
    });

    describe("tagName", () => {
        it("accepts alphanumeric name", () => {
            expect(tagName.parse("typescript")).toBe("typescript");
        });
        it("accepts mixed case alphanumeric", () => {
            expect(tagName.parse("React18")).toBe("React18");
        });
        it("rejects empty", () => {
            expect(() => tagName.parse("")).toThrow();
        });
        it("rejects over 100 chars", () => {
            expect(() => tagName.parse("a".repeat(101))).toThrow();
        });
        it("rejects hyphens", () => {
            expect(() => tagName.parse("type-script")).toThrow();
        });
        it("rejects spaces", () => {
            expect(() => tagName.parse("type script")).toThrow();
        });
        it("rejects special characters", () => {
            expect(() => tagName.parse("c++")).toThrow();
        });
    });

    describe("createTagInputSchema", () => {
        it("accepts valid input", () => {
            const result = createTagInputSchema.parse({ name: "typescript" });
            expect(result.name).toBe("typescript");
        });
        it("rejects missing name", () => {
            expect(() => createTagInputSchema.parse({})).toThrow();
        });
    });

    describe("updateTagInputSchema", () => {
        it("accepts valid update", () => {
            const result = updateTagInputSchema.parse({ id: validUUID, name: "javascript" });
            expect(result.name).toBe("javascript");
        });
        it("accepts update with only id", () => {
            const result = updateTagInputSchema.parse({ id: validUUID });
            expect(result.id).toBe(validUUID);
        });
    });

    describe("getAllTagsSchema", () => {
        it("provides defaults", () => {
            const result = getAllTagsSchema.parse({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });
        it("accepts name filter", () => {
            const result = getAllTagsSchema.parse({ name: "typescript" });
            expect(result.name).toBe("typescript");
        });
        it("rejects limit over 100", () => {
            expect(() => getAllTagsSchema.parse({ limit: 101 })).toThrow();
        });
    });

    describe("postTagSchema", () => {
        it("accepts valid input", () => {
            const result = postTagSchema.parse({ postId: validUUID, tagId: validUUID });
            expect(result.postId).toBe(validUUID);
            expect(result.tagId).toBe(validUUID);
        });
        it("rejects missing postId", () => {
            expect(() => postTagSchema.parse({ tagId: validUUID })).toThrow();
        });
        it("rejects missing tagId", () => {
            expect(() => postTagSchema.parse({ postId: validUUID })).toThrow();
        });
    });
});
