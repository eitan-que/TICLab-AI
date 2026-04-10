import { describe, expect, it } from "bun:test";
import {
    categoryName, categorySlug, categoryId,
    createCategoryInputSchema, updateCategoryInputSchema, getAllCategoriesSchema,
} from "@/validators/category.validator";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Category Validators", () => {
    describe("categoryName", () => {
        it("accepts valid name", () => {
            expect(categoryName.parse("Technology")).toBe("Technology");
        });
        it("trims whitespace", () => {
            expect(categoryName.parse("  Tech  ")).toBe("Tech");
        });
        it("rejects name shorter than 3 chars", () => {
            expect(() => categoryName.parse("ab")).toThrow();
        });
        it("rejects name exceeding 255 chars", () => {
            expect(() => categoryName.parse("a".repeat(256))).toThrow();
        });
    });

    describe("categorySlug", () => {
        it("accepts valid slug", () => {
            expect(categorySlug.parse("tech-news")).toBe("tech-news");
        });
        it("rejects slug shorter than 3 chars", () => {
            expect(() => categorySlug.parse("ab")).toThrow();
        });
        it("rejects uppercase in slug", () => {
            expect(() => categorySlug.parse("Tech")).toThrow();
        });
        it("rejects consecutive hyphens", () => {
            expect(() => categorySlug.parse("tech--news")).toThrow();
        });
    });

    describe("categoryId", () => {
        it("accepts valid UUID", () => {
            expect(categoryId.parse(validUUID)).toBe(validUUID);
        });
        it("rejects invalid UUID", () => {
            expect(() => categoryId.parse("bad")).toThrow();
        });
    });

    describe("createCategoryInputSchema", () => {
        it("accepts valid input", () => {
            const result = createCategoryInputSchema.parse({ name: "Technology", creatorId: validUUID });
            expect(result.name).toBe("Technology");
        });

        it("allows null creatorId", () => {
            const result = createCategoryInputSchema.parse({ name: "Technology", creatorId: null });
            expect(result.creatorId).toBeNull();
        });

        it("rejects missing name", () => {
            expect(() => createCategoryInputSchema.parse({ creatorId: validUUID })).toThrow();
        });
    });

    describe("updateCategoryInputSchema", () => {
        it("accepts valid update", () => {
            const result = updateCategoryInputSchema.parse({ id: validUUID, name: "New Name" });
            expect(result.name).toBe("New Name");
        });

        it("accepts update with only id", () => {
            const result = updateCategoryInputSchema.parse({ id: validUUID });
            expect(result.id).toBe(validUUID);
        });

        it("rejects missing id", () => {
            expect(() => updateCategoryInputSchema.parse({ name: "Name" })).toThrow();
        });
    });

    describe("getAllCategoriesSchema", () => {
        it("provides defaults", () => {
            const result = getAllCategoriesSchema.parse({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });

        it("rejects both name and slug together", () => {
            expect(() => getAllCategoriesSchema.parse({ name: "Tech", slug: "tech" })).toThrow();
        });

        it("accepts name filter alone", () => {
            const result = getAllCategoriesSchema.parse({ name: "Technology" });
            expect(result.name).toBe("Technology");
        });

        it("accepts slug filter alone", () => {
            const result = getAllCategoriesSchema.parse({ slug: "technology" });
            expect(result.slug).toBe("technology");
        });

        it("rejects limit over 100", () => {
            expect(() => getAllCategoriesSchema.parse({ limit: 101 })).toThrow();
        });
    });
});
