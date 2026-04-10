import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Category } from "@/domain/category.domain";
import { CategoryService } from "@/services/category.service";
import { CategoryRepositoryTemplate } from "@/repositories/category.repository";
import { NotFoundError, ConflictError } from "@/lib/errors";

const validUUID = crypto.randomUUID();
const now = new Date();

function makeCategory(overrides: Partial<{
    id: string; name: string; slug: string; createdBy: string | null;
    createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}> = {}): Category {
    const defaults = {
        id: validUUID, name: "Technology", slug: "technology-ab12",
        createdBy: validUUID as string | null, createdAt: now, updatedAt: now,
        deletedAt: null as Date | null,
    };
    const m = { ...defaults, ...overrides };
    return new Category(m.id, m.name, m.slug, m.createdBy, m.createdAt, m.updatedAt, m.deletedAt);
}

function createMockRepo(): CategoryRepositoryTemplate {
    return {
        createCategory: mock(() => Promise.resolve(makeCategory())),
        getCategoryById: mock(() => Promise.resolve(makeCategory())),
        getCategoryBySlug: mock(() => Promise.resolve(null)),
        getAllCategories: mock(() => Promise.resolve([makeCategory()])),
        updateCategory: mock(() => Promise.resolve(makeCategory({ name: "Updated" }))),
        deleteCategory: mock(() => Promise.resolve()),
        restoreCategory: mock(() => Promise.resolve()),
        hardDeleteCategory: mock(() => Promise.resolve()),
    };
}

describe("CategoryService", () => {
    let repo: ReturnType<typeof createMockRepo>;
    let service: CategoryService;

    beforeEach(() => {
        repo = createMockRepo();
        service = new CategoryService(repo);
    });

    describe("create", () => {
        it("creates a category with valid input", async () => {
            const result = await service.create({ name: "Technology", creatorId: validUUID });
            expect(result).toBeInstanceOf(Category);
            expect(repo.createCategory).toHaveBeenCalled();
        });

        it("checks for slug collision", async () => {
            (repo.getCategoryBySlug as ReturnType<typeof mock>).mockResolvedValueOnce(makeCategory());
            await service.create({ name: "Technology", creatorId: validUUID });
            expect(repo.getCategoryBySlug).toHaveBeenCalled();
        });

        it("rejects invalid input", async () => {
            await expect(service.create({ name: "ab", creatorId: validUUID })).rejects.toThrow();
        });
    });

    describe("getById", () => {
        it("returns category when found", async () => {
            const result = await service.getById(validUUID);
            expect(result).toBeInstanceOf(Category);
            expect(repo.getCategoryById).toHaveBeenCalledWith(validUUID);
        });

        it("throws NotFoundError when not found", async () => {
            (repo.getCategoryById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.getById(validUUID)).rejects.toThrow(NotFoundError);
        });

        it("rejects invalid UUID", async () => {
            await expect(service.getById("bad-id" as any)).rejects.toThrow();
        });
    });

    describe("getBySlug", () => {
        it("returns category when found", async () => {
            (repo.getCategoryBySlug as ReturnType<typeof mock>).mockResolvedValueOnce(makeCategory());
            const result = await service.getBySlug("technology-ab12");
            expect(result).toBeInstanceOf(Category);
        });

        it("throws NotFoundError when not found", async () => {
            await expect(service.getBySlug("nonexistent-slug")).rejects.toThrow(NotFoundError);
        });

        it("throws NotFoundError when category is deleted", async () => {
            (repo.getCategoryBySlug as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeCategory({ deletedAt: now })
            );
            await expect(service.getBySlug("technology-ab12")).rejects.toThrow(NotFoundError);
        });
    });

    describe("getAll", () => {
        it("returns categories with default pagination", async () => {
            const result = await service.getAll({
                page: 1,
                limit: 10,
            });
            expect(result).toBeArray();
            expect(repo.getAllCategories).toHaveBeenCalled();
        });

        it("passes validated query to repository", async () => {
            await service.getAll({ page: 2, limit: 20 });
            expect(repo.getAllCategories).toHaveBeenCalledWith(
                expect.objectContaining({ page: 2, limit: 20 })
            );
        });
    });

    describe("update", () => {
        it("updates an existing category", async () => {
            const result = await service.update({ id: validUUID, name: "Updated" });
            expect(result).toBeInstanceOf(Category);
            expect(repo.updateCategory).toHaveBeenCalled();
        });

        it("throws NotFoundError when category does not exist", async () => {
            (repo.getCategoryById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.update({ id: validUUID, name: "Updated" })).rejects.toThrow(NotFoundError);
        });
    });

    describe("delete", () => {
        it("soft-deletes an existing category", async () => {
            const result = await service.delete(validUUID);
            expect(result).toBeInstanceOf(Category);
            expect(result.deletedAt).not.toBeNull();
            expect(repo.deleteCategory).toHaveBeenCalledWith(validUUID);
        });

        it("throws NotFoundError when category does not exist", async () => {
            (repo.getCategoryById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.delete(validUUID)).rejects.toThrow(NotFoundError);
        });

        it("throws ConflictError when already deleted", async () => {
            (repo.getCategoryById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeCategory({ deletedAt: now })
            );
            await expect(service.delete(validUUID)).rejects.toThrow(ConflictError);
        });
    });

    describe("restore", () => {
        it("restores a deleted category", async () => {
            (repo.getCategoryById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeCategory({ deletedAt: now })
            );
            const result = await service.restore(validUUID);
            expect(result.deletedAt).toBeNull();
            expect(repo.restoreCategory).toHaveBeenCalledWith(validUUID);
        });

        it("throws ConflictError when category is not deleted", async () => {
            await expect(service.restore(validUUID)).rejects.toThrow(ConflictError);
        });
    });

    describe("hardDelete", () => {
        it("permanently deletes a soft-deleted category", async () => {
            (repo.getCategoryById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeCategory({ deletedAt: now })
            );
            await service.hardDelete(validUUID);
            expect(repo.hardDeleteCategory).toHaveBeenCalledWith(validUUID);
        });

        it("throws ConflictError when category is not deleted", async () => {
            await expect(service.hardDelete(validUUID)).rejects.toThrow(ConflictError);
        });
    });
});
