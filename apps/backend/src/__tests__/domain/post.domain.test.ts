import { describe, expect, it } from "bun:test";
import { Post } from "@/domain/post.domain";
import { ValidationError } from "@/lib/errors";

const now = new Date();

function makePost(overrides: Partial<{
    id: string; slug: string; title: string; content: string;
    published: boolean; authorId: string | null; categoryId: string;
    deletedBy: string | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}> = {}) {
    const defaults = {
        id: "id-1",
        slug: "valid-slug-ab12",
        title: "Valid Title",
        content: "# Hello World",
        published: true,
        authorId: "author-1" as string | null,
        categoryId: "category-1",
        deletedBy: null as string | null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null as Date | null,
    };
    const merged = { ...defaults, ...overrides };
    return new Post(
        merged.id, merged.slug, merged.title, merged.content,
        merged.published, merged.authorId, merged.categoryId,
        merged.deletedBy, merged.createdAt, merged.updatedAt, merged.deletedAt,
    );
}

describe("Post Domain", () => {
    describe("construction", () => {
        it("creates a valid post", () => {
            const post = makePost();
            expect(post.id).toBe("id-1");
            expect(post.slug).toBe("valid-slug-ab12");
            expect(post.title).toBe("Valid Title");
            expect(post.content).toBe("# Hello World");
            expect(post.published).toBe(true);
            expect(post.authorId).toBe("author-1");
            expect(post.categoryId).toBe("category-1");
            expect(post.deletedBy).toBeNull();
            expect(post.deletedAt).toBeNull();
        });

        it("rejects empty title", () => {
            expect(() => makePost({ title: "" })).toThrow();
        });

        it("rejects title exceeding 255 characters", () => {
            expect(() => makePost({ title: "a".repeat(256) })).toThrow();
        });

        it("rejects invalid slug format", () => {
            expect(() => makePost({ slug: "INVALID SLUG!" })).toThrow();
        });

        it("rejects empty slug", () => {
            expect(() => makePost({ slug: "" })).toThrow();
        });

        it("rejects empty content", () => {
            expect(() => makePost({ content: "" })).toThrow();
        });

        it("rejects content with null bytes", () => {
            expect(() => makePost({ content: "hello\u0000world" })).toThrow();
        });

        it("rejects content with unbalanced fenced code blocks", () => {
            expect(() => makePost({ content: "```js\nconsole.log('hi');" })).toThrow();
        });

        it("allows content with balanced fenced code blocks", () => {
            const post = makePost({ content: "```js\nconsole.log('hi');\n```" });
            expect(post.content).toBe("```js\nconsole.log('hi');\n```");
        });

        it("allows null authorId", () => {
            const post = makePost({ authorId: null });
            expect(post.authorId).toBeNull();
        });
    });

    describe("slugifyTitle", () => {
        it("converts title to lowercase slug with random suffix", () => {
            const slug = Post.slugifyTitle("My Post Title");
            expect(slug).toMatch(/^my-post-title-[a-z0-9]{4}$/);
        });

        it("strips special characters", () => {
            const slug = Post.slugifyTitle("Hello, World! 123");
            expect(slug).toMatch(/^hello-world-123-[a-z0-9]{4}$/);
        });

        it("handles single word", () => {
            const slug = Post.slugifyTitle("Hello");
            expect(slug).toMatch(/^hello-[a-z0-9]{4}$/);
        });
    });

    describe("title setter", () => {
        it("updates title and regenerates slug", () => {
            const post = makePost();
            const oldSlug = post.slug;
            post.title = "New Title";
            expect(post.title).toBe("New Title");
            expect(post.slug).not.toBe(oldSlug);
            expect(post.slug).toMatch(/^new-title-[a-z0-9]{4}$/);
        });

        it("updates updatedAt timestamp", () => {
            const post = makePost({ updatedAt: new Date("2020-01-01") });
            const before = post.updatedAt;
            post.title = "Updated Title";
            expect(post.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });

        it("rejects invalid title via setter", () => {
            const post = makePost();
            expect(() => { post.title = ""; }).toThrow();
        });
    });

    describe("delete / restore", () => {
        it("soft-deletes a post", () => {
            const post = makePost();
            post.delete("user-999");
            expect(post.deletedAt).not.toBeNull();
            expect(post.deletedBy).toBe("user-999");
        });

        it("restores a soft-deleted post", () => {
            const post = makePost();
            post.delete("user-999");
            post.restore();
            expect(post.deletedAt).toBeNull();
            expect(post.deletedBy).toBeNull();
        });

        it("updates updatedAt on delete", () => {
            const post = makePost({ updatedAt: new Date("2020-01-01") });
            const before = post.updatedAt;
            post.delete("user-999");
            expect(post.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });

        it("updates updatedAt on restore", () => {
            const post = makePost();
            post.delete("user-999");
            const afterDelete = post.updatedAt;
            post.restore();
            expect(post.updatedAt.getTime()).toBeGreaterThanOrEqual(afterDelete.getTime());
        });
    });

    describe("toJSON", () => {
        it("returns all fields when no filter is provided", () => {
            const post = makePost();
            const json = post.toJSON();
            expect(json).toHaveProperty("id", "id-1");
            expect(json).toHaveProperty("slug", "valid-slug-ab12");
            expect(json).toHaveProperty("title", "Valid Title");
            expect(json).toHaveProperty("content", "# Hello World");
            expect(json).toHaveProperty("published", true);
            expect(json).toHaveProperty("authorId", "author-1");
            expect(json).toHaveProperty("categoryId", "category-1");
            expect(json).toHaveProperty("deletedBy", null);
            expect(json).toHaveProperty("deletedAt", null);
            expect(json.createdAt).toBeDefined();
            expect(json.updatedAt).toBeDefined();
        });

        it("returns only selected fields", () => {
            const post = makePost();
            const json = post.toJSON({ id: true, title: true });
            expect(json).toEqual({ id: "id-1", title: "Valid Title" });
        });

        it("returns empty object when no fields selected", () => {
            const post = makePost();
            const json = post.toJSON({});
            expect(json).toEqual({});
        });

        it("serializes dates as ISO strings", () => {
            const post = makePost();
            const json = post.toJSON();
            expect(typeof json.createdAt).toBe("string");
            expect(typeof json.updatedAt).toBe("string");
        });
    });
});
