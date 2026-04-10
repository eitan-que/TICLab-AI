import { describe, expect, it } from "bun:test";
import {
    postId, postSlug, postTitle, postContent, authorId, categoryId,
    createPostInputSchema, updatePostInputSchema, getAllPostsSchema,
    deletePostSchema, postTags,
} from "@/validators/post.validator";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Post Validators", () => {
    describe("postId", () => {
        it("accepts a valid UUID", () => {
            expect(postId.parse(validUUID)).toBe(validUUID);
        });
        it("rejects non-UUID string", () => {
            expect(() => postId.parse("not-a-uuid")).toThrow();
        });
    });

    describe("postSlug", () => {
        it("accepts a valid slug", () => {
            expect(postSlug.parse("my-post-ab12")).toBe("my-post-ab12");
        });
        it("accepts single segment", () => {
            expect(postSlug.parse("hello")).toBe("hello");
        });
        it("rejects uppercase", () => {
            expect(() => postSlug.parse("My-Post")).toThrow();
        });
        it("rejects spaces", () => {
            expect(() => postSlug.parse("my post")).toThrow();
        });
        it("rejects empty string", () => {
            expect(() => postSlug.parse("")).toThrow();
        });
        it("rejects consecutive hyphens", () => {
            expect(() => postSlug.parse("my--post")).toThrow();
        });
        it("rejects leading hyphen", () => {
            expect(() => postSlug.parse("-my-post")).toThrow();
        });
        it("rejects trailing hyphen", () => {
            expect(() => postSlug.parse("my-post-")).toThrow();
        });
    });

    describe("postTitle", () => {
        it("accepts valid title", () => {
            expect(postTitle.parse("Hello World")).toBe("Hello World");
        });
        it("trims whitespace", () => {
            expect(postTitle.parse("  Hello  ")).toBe("Hello");
        });
        it("rejects empty string", () => {
            expect(() => postTitle.parse("")).toThrow();
        });
        it("rejects title exceeding 255 chars", () => {
            expect(() => postTitle.parse("a".repeat(256))).toThrow();
        });
    });

    describe("postContent", () => {
        it("accepts valid markdown", () => {
            expect(postContent.parse("# Hello")).toBe("# Hello");
        });
        it("rejects empty content", () => {
            expect(() => postContent.parse("")).toThrow();
        });
        it("rejects content with null bytes", () => {
            expect(() => postContent.parse("hello\u0000world")).toThrow();
        });
    });

    describe("authorId / categoryId", () => {
        it("accepts valid UUIDs", () => {
            expect(authorId.parse(validUUID)).toBe(validUUID);
            expect(categoryId.parse(validUUID)).toBe(validUUID);
        });
        it("rejects invalid UUIDs", () => {
            expect(() => authorId.parse("bad")).toThrow();
            expect(() => categoryId.parse("bad")).toThrow();
        });
    });

    describe("createPostInputSchema", () => {
        const validInput = {
            title: "My Post",
            content: "# Hello",
            authorId: validUUID,
            categoryId: validUUID,
        };

        it("accepts valid input", () => {
            const result = createPostInputSchema.parse(validInput);
            expect(result.title).toBe("My Post");
            expect(result.content).toBe("# Hello");
        });

        it("accepts input with tags", () => {
            const result = createPostInputSchema.parse({ ...validInput, tags: ["typescript", "react"] });
            expect(result.tags).toEqual(["typescript", "react"]);
        });

        it("rejects missing title", () => {
            expect(() => createPostInputSchema.parse({ ...validInput, title: undefined })).toThrow();
        });

        it("rejects missing content", () => {
            expect(() => createPostInputSchema.parse({ ...validInput, content: undefined })).toThrow();
        });

        it("rejects missing categoryId", () => {
            expect(() => createPostInputSchema.parse({ ...validInput, categoryId: undefined })).toThrow();
        });

        it("allows null authorId", () => {
            const result = createPostInputSchema.parse({ ...validInput, authorId: null });
            expect(result.authorId).toBeNull();
        });
    });

    describe("updatePostInputSchema", () => {
        it("accepts valid update with only id", () => {
            const result = updatePostInputSchema.parse({ id: validUUID });
            expect(result.id).toBe(validUUID);
        });

        it("accepts partial updates", () => {
            const result = updatePostInputSchema.parse({ id: validUUID, title: "New Title" });
            expect(result.title).toBe("New Title");
        });

        it("rejects missing id", () => {
            expect(() => updatePostInputSchema.parse({ title: "Title" })).toThrow();
        });
    });

    describe("getAllPostsSchema", () => {
        it("provides defaults for page and limit", () => {
            const result = getAllPostsSchema.parse({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });

        it("accepts custom pagination", () => {
            const result = getAllPostsSchema.parse({ page: 3, limit: 25 });
            expect(result.page).toBe(3);
            expect(result.limit).toBe(25);
        });

        it("rejects limit over 100", () => {
            expect(() => getAllPostsSchema.parse({ limit: 101 })).toThrow();
        });

        it("rejects negative page", () => {
            expect(() => getAllPostsSchema.parse({ page: -1 })).toThrow();
        });
    });

    describe("deletePostSchema", () => {
        it("accepts valid input", () => {
            const result = deletePostSchema.parse({ id: validUUID, deletedBy: validUUID });
            expect(result.id).toBe(validUUID);
        });

        it("allows null deletedBy", () => {
            const result = deletePostSchema.parse({ id: validUUID, deletedBy: null });
            expect(result.deletedBy).toBeNull();
        });
    });

    describe("postTags", () => {
        it("accepts valid tag array", () => {
            const result = postTags.parse(["typescript", "react", "nodejs"]);
            expect(result).toEqual(["typescript", "react", "nodejs"]);
        });

        it("rejects more than 20 tags", () => {
            const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
            expect(() => postTags.parse(tags)).toThrow();
        });

        it("is optional (undefined passes)", () => {
            expect(postTags.parse(undefined)).toBeUndefined();
        });
    });
});
