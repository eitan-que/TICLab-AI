import { describe, expect, it } from "bun:test";
import { Category } from "@/domain/category.domain";

const now = new Date();

function makeCategory(overrides: Partial<{
    id: string; name: string; slug: string;
    createdBy: string | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}> = {}) {
    const defaults = {
        id: "cat-1",
        name: "Technology",
        slug: "technology-ab12",
        createdBy: "user-1" as string | null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null as Date | null,
    };
    const merged = { ...defaults, ...overrides };
    return new Category(
        merged.id, merged.name, merged.slug, merged.createdBy,
        merged.createdAt, merged.updatedAt, merged.deletedAt,
    );
}

describe("Category Domain", () => {
    describe("construction", () => {
        it("creates a valid category", () => {
            const cat = makeCategory();
            expect(cat.id).toBe("cat-1");
            expect(cat.name).toBe("Technology");
            expect(cat.slug).toBe("technology-ab12");
            expect(cat.createdBy).toBe("user-1");
            expect(cat.deletedAt).toBeNull();
        });

        it("rejects name shorter than 3 characters", () => {
            expect(() => makeCategory({ name: "ab" })).toThrow();
        });

        it("rejects name exceeding 255 characters", () => {
            expect(() => makeCategory({ name: "a".repeat(256) })).toThrow();
        });

        it("rejects invalid slug format", () => {
            expect(() => makeCategory({ slug: "INVALID SLUG!" })).toThrow();
        });

        it("rejects slug shorter than 3 characters", () => {
            expect(() => makeCategory({ slug: "ab" })).toThrow();
        });

        it("allows null createdBy", () => {
            const cat = makeCategory({ createdBy: null });
            expect(cat.createdBy).toBeNull();
        });
    });

    describe("slugifyName", () => {
        it("generates a valid slug from name", () => {
            const slug = Category.slugifyName("Web Development");
            expect(slug).toMatch(/^web-development-[a-z0-9]{4}$/);
        });

        it("strips special characters from name", () => {
            const slug = Category.slugifyName("C++ & Rust!");
            expect(slug).toMatch(/^c-rust-[a-z0-9]{4}$/);
        });
    });

    describe("name setter", () => {
        it("updates name and regenerates slug", () => {
            const cat = makeCategory();
            const oldSlug = cat.slug;
            cat.name = "Science";
            expect(cat.name).toBe("Science");
            expect(cat.slug).not.toBe(oldSlug);
            expect(cat.slug).toMatch(/^science-[a-z0-9]{4}$/);
        });

        it("updates updatedAt timestamp", () => {
            const cat = makeCategory({ updatedAt: new Date("2020-01-01") });
            const before = cat.updatedAt;
            cat.name = "Updated Name";
            expect(cat.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });

        it("rejects invalid name via setter", () => {
            const cat = makeCategory();
            expect(() => { cat.name = "ab"; }).toThrow();
        });
    });

    describe("delete / restore", () => {
        it("soft-deletes a category", () => {
            const cat = makeCategory();
            cat.delete();
            expect(cat.deletedAt).not.toBeNull();
        });

        it("restores a soft-deleted category", () => {
            const cat = makeCategory();
            cat.delete();
            cat.restore();
            expect(cat.deletedAt).toBeNull();
        });

        it("updates updatedAt on delete", () => {
            const cat = makeCategory({ updatedAt: new Date("2020-01-01") });
            const before = cat.updatedAt;
            cat.delete();
            expect(cat.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });
    });

    describe("toJSON", () => {
        it("returns all fields when no filter is provided", () => {
            const cat = makeCategory();
            const json = cat.toJSON();
            expect(json).toHaveProperty("id", "cat-1");
            expect(json).toHaveProperty("name", "Technology");
            expect(json).toHaveProperty("slug", "technology-ab12");
            expect(json).toHaveProperty("createdBy", "user-1");
            expect(json).toHaveProperty("deletedAt", null);
        });

        it("returns only selected fields", () => {
            const cat = makeCategory();
            const json = cat.toJSON({ id: true, name: true });
            expect(json).toEqual({ id: "cat-1", name: "Technology" });
        });
    });
});
