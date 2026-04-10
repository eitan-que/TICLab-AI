import { describe, expect, it, mock, beforeEach, spyOn } from "bun:test";
import { Post } from "@/domain/post.domain";
import { Category } from "@/domain/category.domain";
import { PostService } from "@/services/post.service";
import { PostRepositoryTemplate } from "@/repositories/post.repository";
import { NotFoundError, ConflictError, ForbiddenError } from "@/lib/errors";

// We need to mock categoryService since PostService imports it directly
import * as categoryServiceModule from "@/services/category.service";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";
const validUUID2 = "660e8400-e29b-41d4-a716-446655440000";
const now = new Date();

function makePost(overrides: Partial<{
    id: string; slug: string; title: string; content: string;
    published: boolean; authorId: string | null; categoryId: string;
    deletedBy: string | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}> = {}): Post {
    const defaults = {
        id: validUUID, slug: "test-post-ab12", title: "Test Post", content: "# Hello World",
        published: true, authorId: validUUID as string | null, categoryId: validUUID2,
        deletedBy: null as string | null, createdAt: now, updatedAt: now, deletedAt: null as Date | null,
    };
    const m = { ...defaults, ...overrides };
    return new Post(m.id, m.slug, m.title, m.content, m.published, m.authorId, m.categoryId,
        m.deletedBy, m.createdAt, m.updatedAt, m.deletedAt);
}

function makeCategory(): Category {
    return new Category(validUUID2, "Technology", "technology-ab12", validUUID, now, now, null);
}

function createMockRepo(): PostRepositoryTemplate {
    return {
        createPost: mock(() => Promise.resolve(makePost())),
        getPostById: mock(() => Promise.resolve(makePost())),
        getPostBySlug: mock(() => Promise.resolve(null)),
        getAllPosts: mock(() => Promise.resolve([makePost()])),
        updatePost: mock(() => Promise.resolve(makePost({ title: "Updated" }))),
        deletePost: mock(() => Promise.resolve()),
        restorePost: mock(() => Promise.resolve()),
        hardDeletePost: mock(() => Promise.resolve()),
    };
}

describe("PostService", () => {
    let repo: ReturnType<typeof createMockRepo>;
    let service: PostService;
    let categoryGetByIdSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        repo = createMockRepo();
        service = new PostService(repo);
        // Mock categoryService.getById to avoid hitting the real database
        categoryGetByIdSpy = spyOn(categoryServiceModule.categoryService, "getById")
            .mockResolvedValue(makeCategory());
    });

    describe("create", () => {
        it("creates a post with valid input", async () => {
            const result = await service.create({
                title: "Test Post",
                content: "# Hello World",
                authorId: validUUID,
                categoryId: validUUID2,
            });
            expect(result).toBeInstanceOf(Post);
            expect(repo.createPost).toHaveBeenCalled();
        });

        it("generates a slug from the title", async () => {
            await service.create({
                title: "My New Post",
                content: "# Content",
                authorId: validUUID,
                categoryId: validUUID2,
            });
            const createCall = (repo.createPost as ReturnType<typeof mock>).mock.calls[0][0];
            expect(createCall.slug).toMatch(/^my-new-post-[a-z0-9]{4}$/);
        });

        it("checks for slug collision", async () => {
            (repo.getPostBySlug as ReturnType<typeof mock>).mockResolvedValueOnce(makePost());
            await service.create({
                title: "Test Post",
                content: "# Hello",
                authorId: validUUID,
                categoryId: validUUID2,
            });
            expect(repo.getPostBySlug).toHaveBeenCalled();
        });

        it("validates category existence", async () => {
            await service.create({
                title: "Test Post",
                content: "# Hello",
                authorId: validUUID,
                categoryId: validUUID2,
            });
            expect(categoryGetByIdSpy).toHaveBeenCalledWith(validUUID2);
        });

        it("throws NotFoundError when category is deleted", async () => {
            categoryGetByIdSpy.mockResolvedValueOnce(
                new Category(validUUID2, "Deleted", "deleted-ab12", validUUID, now, now, now)
            );
            await expect(service.create({
                title: "Test",
                content: "# Hello",
                authorId: validUUID,
                categoryId: validUUID2,
            })).rejects.toThrow(NotFoundError);
        });

        it("rejects invalid input", async () => {
            await expect(service.create({
                title: "",
                content: "# Hello",
                authorId: validUUID,
                categoryId: validUUID2,
            })).rejects.toThrow();
        });
    });

    describe("getById", () => {
        it("returns post when found", async () => {
            const result = await service.getById(validUUID);
            expect(result).toBeInstanceOf(Post);
        });

        it("throws NotFoundError when not found", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.getById(validUUID)).rejects.toThrow(NotFoundError);
        });

        it("rejects invalid UUID", async () => {
            await expect(service.getById("bad" as any)).rejects.toThrow();
        });
    });

    describe("getBySlug", () => {
        it("returns post when found and published", async () => {
            (repo.getPostBySlug as ReturnType<typeof mock>).mockResolvedValueOnce(makePost());
            const result = await service.getBySlug("test-post-ab12");
            expect(result).toBeInstanceOf(Post);
        });

        it("throws NotFoundError when not found", async () => {
            await expect(service.getBySlug("nonexistent-slug")).rejects.toThrow(NotFoundError);
        });

        it("throws NotFoundError when post is deleted", async () => {
            (repo.getPostBySlug as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ deletedAt: now })
            );
            await expect(service.getBySlug("test-post-ab12")).rejects.toThrow(NotFoundError);
        });

        it("throws NotFoundError when post is unpublished", async () => {
            (repo.getPostBySlug as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ published: false })
            );
            await expect(service.getBySlug("test-post-ab12")).rejects.toThrow(NotFoundError);
        });
    });

    describe("getAll", () => {
        it("returns posts with default pagination", async () => {
            const result = await service.getAll({
                page: 1,
                limit: 10,
            });
            expect(result).toBeArray();
        });

        it("passes validated query to repository", async () => {
            await service.getAll({ page: 2, limit: 25 });
            expect(repo.getAllPosts).toHaveBeenCalledWith(
                expect.objectContaining({ page: 2, limit: 25 })
            );
        });
    });

    describe("update", () => {
        it("updates an existing post", async () => {
            const result = await service.update({ id: validUUID, title: "Updated" });
            expect(result).toBeInstanceOf(Post);
            expect(repo.updatePost).toHaveBeenCalled();
        });

        it("throws NotFoundError when post does not exist", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.update({ id: validUUID, title: "Updated" })).rejects.toThrow(NotFoundError);
        });

        it("throws NotFoundError when post is deleted", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ deletedAt: now })
            );
            await expect(service.update({ id: validUUID, title: "Updated" })).rejects.toThrow(NotFoundError);
        });

        it("regenerates slug when title is updated", async () => {
            await service.update({ id: validUUID, title: "New Title" });
            const updateCall = (repo.updatePost as ReturnType<typeof mock>).mock.calls[0][0];
            expect(updateCall.slug).toMatch(/^new-title-[a-z0-9]{4}$/);
        });

        it("does not regenerate slug when title is not provided", async () => {
            await service.update({ id: validUUID, content: "# Updated content" });
            const updateCall = (repo.updatePost as ReturnType<typeof mock>).mock.calls[0][0];
            expect(updateCall.slug).toBeUndefined();
        });
    });

    describe("delete", () => {
        it("soft-deletes an existing post", async () => {
            const result = await service.delete(validUUID, validUUID);
            expect(result).toBeInstanceOf(Post);
            expect(result.deletedAt).not.toBeNull();
            expect(result.deletedBy).toBe(validUUID);
        });

        it("throws NotFoundError when post does not exist", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.delete(validUUID, validUUID)).rejects.toThrow(NotFoundError);
        });

        it("throws ConflictError when already deleted", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ deletedAt: now })
            );
            await expect(service.delete(validUUID, validUUID)).rejects.toThrow(ConflictError);
        });
    });

    describe("restore", () => {
        it("restores a post deleted by the same user", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ deletedAt: now, deletedBy: validUUID })
            );
            const result = await service.restore(validUUID, validUUID, "USER");
            expect(result.deletedAt).toBeNull();
            expect(result.deletedBy).toBeNull();
        });

        it("allows ADMIN to restore any deleted post", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ deletedAt: now, deletedBy: "other-user" })
            );
            const result = await service.restore(validUUID, validUUID, "ADMIN");
            expect(result.deletedAt).toBeNull();
        });

        it("allows MODERATOR to restore any deleted post", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ deletedAt: now, deletedBy: "other-user" })
            );
            const result = await service.restore(validUUID, validUUID, "MODERATOR");
            expect(result.deletedAt).toBeNull();
        });

        it("throws ForbiddenError when non-deleter user tries to restore", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ deletedAt: now, deletedBy: "admin-user" })
            );
            await expect(service.restore(validUUID, "different-user", "USER")).rejects.toThrow(ForbiddenError);
        });

        it("throws ConflictError when post is not deleted", async () => {
            await expect(service.restore(validUUID, validUUID, "USER")).rejects.toThrow(ConflictError);
        });
    });

    describe("hardDelete", () => {
        it("permanently deletes a soft-deleted post", async () => {
            (repo.getPostById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makePost({ deletedAt: now })
            );
            await service.hardDelete(validUUID);
            expect(repo.hardDeletePost).toHaveBeenCalledWith(validUUID);
        });

        it("throws ConflictError when post is not deleted", async () => {
            await expect(service.hardDelete(validUUID)).rejects.toThrow(ConflictError);
        });
    });
});
