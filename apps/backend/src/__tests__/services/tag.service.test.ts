import { describe, expect, it, mock, beforeEach, spyOn } from "bun:test";
import { Tag } from "@/domain/tag.domain";
import { Post } from "@/domain/post.domain";
import { TagService } from "@/services/tag.service";
import { TagRepositoryTemplate } from "@/repositories/tag.repository";
import { NotFoundError, ConflictError, ForbiddenError } from "@/lib/errors";

import * as postServiceModule from "@/services/post.service";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";
const validUUID2 = "660e8400-e29b-41d4-a716-446655440000";
const now = new Date();

function makeTag(overrides: Partial<{
    id: string; name: string; createdBy: string | null;
    createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}> = {}): Tag {
    const defaults = {
        id: validUUID, name: "typescript", createdBy: validUUID as string | null,
        createdAt: now, updatedAt: now, deletedAt: null as Date | null,
    };
    const m = { ...defaults, ...overrides };
    return new Tag(m.id, m.name, m.createdBy, m.createdAt, m.updatedAt, m.deletedAt);
}

function makePost(authorId: string = validUUID): Post {
    return new Post(validUUID2, "test-ab12", "Test", "# Hello", true, authorId, validUUID, null, now, now, null);
}

function createMockRepo(): TagRepositoryTemplate {
    return {
        createTag: mock(() => Promise.resolve(makeTag())),
        getTagById: mock(() => Promise.resolve(makeTag())),
        getTagByName: mock(() => Promise.resolve(null)),
        getAllTags: mock(() => Promise.resolve([makeTag()])),
        updateTag: mock(() => Promise.resolve(makeTag({ name: "javascript" }))),
        deleteTag: mock(() => Promise.resolve()),
        restoreTag: mock(() => Promise.resolve()),
        hardDeleteTag: mock(() => Promise.resolve()),
        addTagToPost: mock(() => Promise.resolve()),
        removeTagFromPost: mock(() => Promise.resolve()),
        removeAllTagsFromPost: mock(() => Promise.resolve()),
        getTagsByPostId: mock(() => Promise.resolve([makeTag()])),
    };
}

describe("TagService", () => {
    let repo: ReturnType<typeof createMockRepo>;
    let service: TagService;

    beforeEach(() => {
        repo = createMockRepo();
        service = new TagService(repo);
        spyOn(postServiceModule.postService, "getById").mockResolvedValue(makePost());
    });

    describe("create", () => {
        it("creates a tag with valid input", async () => {
            const result = await service.create({ name: "typescript" }, validUUID);
            expect(result).toBeInstanceOf(Tag);
            expect(repo.createTag).toHaveBeenCalledWith({
                name: "typescript",
                createdBy: validUUID,
            });
        });

        it("rejects invalid tag name", async () => {
            await expect(service.create({ name: "type-script" }, validUUID)).rejects.toThrow();
        });
    });

    describe("getById", () => {
        it("returns tag when found", async () => {
            const result = await service.getById(validUUID);
            expect(result).toBeInstanceOf(Tag);
        });

        it("throws NotFoundError when not found", async () => {
            (repo.getTagById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.getById(validUUID)).rejects.toThrow(NotFoundError);
        });
    });

    describe("getAll", () => {
        it("returns tags with defaults", async () => {
            const result = await service.getAll({
                page: 1,
                limit: 10,
            });
            expect(result).toBeArray();
        });
    });

    describe("update", () => {
        it("updates an existing tag", async () => {
            const result = await service.update({ id: validUUID, name: "javascript" });
            expect(result).toBeInstanceOf(Tag);
        });

        it("throws NotFoundError when tag is deleted", async () => {
            (repo.getTagById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeTag({ deletedAt: now })
            );
            await expect(service.update({ id: validUUID, name: "javascript" })).rejects.toThrow(NotFoundError);
        });
    });

    describe("delete", () => {
        it("soft-deletes a tag", async () => {
            const result = await service.delete(validUUID);
            expect(result.deletedAt).not.toBeNull();
        });

        it("throws ConflictError when already deleted", async () => {
            (repo.getTagById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeTag({ deletedAt: now })
            );
            await expect(service.delete(validUUID)).rejects.toThrow(ConflictError);
        });
    });

    describe("restore", () => {
        it("restores a deleted tag", async () => {
            (repo.getTagById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeTag({ deletedAt: now })
            );
            const result = await service.restore(validUUID);
            expect(result.deletedAt).toBeNull();
        });

        it("throws ConflictError when tag is not deleted", async () => {
            await expect(service.restore(validUUID)).rejects.toThrow(ConflictError);
        });
    });

    describe("hardDelete", () => {
        it("permanently deletes a soft-deleted tag", async () => {
            (repo.getTagById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeTag({ deletedAt: now })
            );
            await service.hardDelete(validUUID);
            expect(repo.hardDeleteTag).toHaveBeenCalledWith(validUUID);
        });

        it("throws ConflictError when tag is not deleted", async () => {
            await expect(service.hardDelete(validUUID)).rejects.toThrow(ConflictError);
        });
    });

    describe("addToPost", () => {
        it("adds a tag to a post by the author", async () => {
            await service.addToPost({ postId: validUUID2, tagId: validUUID }, validUUID, "USER");
            expect(repo.addTagToPost).toHaveBeenCalledWith({ postId: validUUID2, tagId: validUUID });
        });

        it("allows ADMIN to add tag to any post", async () => {
            spyOn(postServiceModule.postService, "getById").mockResolvedValueOnce(makePost("other-author"));
            await service.addToPost({ postId: validUUID2, tagId: validUUID }, validUUID, "ADMIN");
            expect(repo.addTagToPost).toHaveBeenCalled();
        });

        it("throws ForbiddenError when non-author non-admin tries to add", async () => {
            spyOn(postServiceModule.postService, "getById").mockResolvedValueOnce(makePost("other-author"));
            await expect(
                service.addToPost({ postId: validUUID2, tagId: validUUID }, "different-user", "USER")
            ).rejects.toThrow(ForbiddenError);
        });

        it("throws NotFoundError when post is deleted", async () => {
            const deletedPost = new Post(validUUID2, "test-ab12", "Test", "# Hello", true, validUUID, validUUID, null, now, now, now);
            spyOn(postServiceModule.postService, "getById").mockResolvedValueOnce(deletedPost);
            await expect(
                service.addToPost({ postId: validUUID2, tagId: validUUID }, validUUID, "USER")
            ).rejects.toThrow(NotFoundError);
        });

        it("throws NotFoundError when tag is deleted", async () => {
            (repo.getTagById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeTag({ deletedAt: now })
            );
            await expect(
                service.addToPost({ postId: validUUID2, tagId: validUUID }, validUUID, "USER")
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe("removeFromPost", () => {
        it("removes a tag from a post by the author", async () => {
            await service.removeFromPost({ postId: validUUID2, tagId: validUUID }, validUUID, "USER");
            expect(repo.removeTagFromPost).toHaveBeenCalled();
        });

        it("throws ForbiddenError when non-author non-admin tries to remove", async () => {
            spyOn(postServiceModule.postService, "getById").mockResolvedValueOnce(makePost("other-author"));
            await expect(
                service.removeFromPost({ postId: validUUID2, tagId: validUUID }, "different-user", "USER")
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe("getTagsByPost", () => {
        it("returns tags for a post", async () => {
            const result = await service.getTagsByPost(validUUID2);
            expect(result).toBeArray();
            expect(repo.getTagsByPostId).toHaveBeenCalledWith(validUUID2);
        });
    });

    describe("syncTagsForPost", () => {
        it("replaces all tags on a post", async () => {
            const result = await service.syncTagsForPost(
                validUUID2, ["typescript", "react"], validUUID, "USER"
            );
            expect(result).toHaveLength(2);
            expect(repo.removeAllTagsFromPost).toHaveBeenCalledWith(validUUID2);
            expect(repo.addTagToPost).toHaveBeenCalledTimes(2);
        });

        it("reuses existing tags by name", async () => {
            const existingTag = makeTag({ name: "typescript" });
            (repo.getTagByName as ReturnType<typeof mock>).mockResolvedValueOnce(existingTag);
            (repo.getTagByName as ReturnType<typeof mock>).mockResolvedValueOnce(null);

            await service.syncTagsForPost(validUUID2, ["typescript", "newone"], validUUID, "USER");
            // createTag should be called once (for "newone"), not twice
            expect(repo.createTag).toHaveBeenCalledTimes(1);
        });

        it("throws ForbiddenError when non-author non-admin tries to sync", async () => {
            spyOn(postServiceModule.postService, "getById").mockResolvedValueOnce(makePost("other-author"));
            await expect(
                service.syncTagsForPost(validUUID2, ["typescript"], "different-user", "USER")
            ).rejects.toThrow(ForbiddenError);
        });
    });
});
