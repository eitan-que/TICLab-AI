import { describe, expect, it, mock, beforeEach, spyOn } from "bun:test";
import { Comment } from "@/domain/comment.domain";
import { Post } from "@/domain/post.domain";
import { CommentService } from "@/services/comment.service";
import { CommentRepositoryTemplate } from "@/repositories/comment.repository";
import { NotFoundError, ConflictError, ForbiddenError } from "@/lib/errors";

import * as postServiceModule from "@/services/post.service";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";
const validUUID2 = "660e8400-e29b-41d4-a716-446655440000";
const now = new Date();

function makeComment(overrides: Partial<{
    id: string; content: string; authorId: string | null; postId: string;
    deletedBy: string | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}> = {}): Comment {
    const defaults = {
        id: validUUID, content: "Great post!", authorId: validUUID as string | null,
        postId: validUUID2, deletedBy: null as string | null, createdAt: now, updatedAt: now,
        deletedAt: null as Date | null,
    };
    const m = { ...defaults, ...overrides };
    return new Comment(m.id, m.content, m.authorId, m.postId, m.deletedBy, m.createdAt, m.updatedAt, m.deletedAt);
}

function makePost(): Post {
    return new Post(validUUID2, "test-ab12", "Test", "# Hello", true, validUUID, validUUID, null, now, now, null);
}

function createMockRepo(): CommentRepositoryTemplate {
    return {
        createComment: mock(() => Promise.resolve(makeComment())),
        getCommentById: mock(() => Promise.resolve(makeComment())),
        getAllComments: mock(() => Promise.resolve([makeComment()])),
        updateComment: mock(() => Promise.resolve(makeComment({ content: "Updated" }))),
        deleteComment: mock(() => Promise.resolve()),
        restoreComment: mock(() => Promise.resolve()),
        hardDeleteComment: mock(() => Promise.resolve()),
    };
}

describe("CommentService", () => {
    let repo: ReturnType<typeof createMockRepo>;
    let service: CommentService;

    beforeEach(() => {
        repo = createMockRepo();
        service = new CommentService(repo);
        spyOn(postServiceModule.postService, "getById").mockResolvedValue(makePost());
    });

    describe("create", () => {
        it("creates a comment on a valid post", async () => {
            const result = await service.create({ content: "Nice!", postId: validUUID2 }, validUUID);
            expect(result).toBeInstanceOf(Comment);
            expect(repo.createComment).toHaveBeenCalled();
        });

        it("throws NotFoundError when post is deleted", async () => {
            const deletedPost = new Post(validUUID2, "test-ab12", "Test", "# Hello", true, validUUID, validUUID, null, now, now, now);
            spyOn(postServiceModule.postService, "getById").mockResolvedValueOnce(deletedPost);
            await expect(service.create({ content: "Nice!", postId: validUUID2 }, validUUID)).rejects.toThrow(NotFoundError);
        });

        it("rejects invalid input", async () => {
            await expect(service.create({ content: "", postId: validUUID2 }, validUUID)).rejects.toThrow();
        });
    });

    describe("getById", () => {
        it("returns comment when found", async () => {
            const result = await service.getById(validUUID);
            expect(result).toBeInstanceOf(Comment);
        });

        it("throws NotFoundError when not found", async () => {
            (repo.getCommentById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.getById(validUUID)).rejects.toThrow(NotFoundError);
        });
    });

    describe("getAll", () => {
        it("returns comments with defaults", async () => {
            const result = await service.getAll({
                page: 1,
                limit: 10,
            });
            expect(result).toBeArray();
        });
    });

    describe("update", () => {
        it("updates an existing comment", async () => {
            const result = await service.update({ id: validUUID, content: "Updated" });
            expect(result).toBeInstanceOf(Comment);
        });

        it("throws NotFoundError when comment is deleted", async () => {
            (repo.getCommentById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeComment({ deletedAt: now })
            );
            await expect(service.update({ id: validUUID, content: "Updated" })).rejects.toThrow(NotFoundError);
        });
    });

    describe("delete", () => {
        it("soft-deletes a comment", async () => {
            const result = await service.delete(validUUID, validUUID);
            expect(result.deletedAt).not.toBeNull();
            expect(result.deletedBy).toBe(validUUID);
        });

        it("throws ConflictError when already deleted", async () => {
            (repo.getCommentById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeComment({ deletedAt: now })
            );
            await expect(service.delete(validUUID, validUUID)).rejects.toThrow(ConflictError);
        });
    });

    describe("restore", () => {
        it("restores a comment deleted by the same user", async () => {
            (repo.getCommentById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeComment({ deletedAt: now, deletedBy: validUUID })
            );
            const result = await service.restore(validUUID, validUUID, "USER");
            expect(result.deletedAt).toBeNull();
        });

        it("allows ADMIN to restore any deleted comment", async () => {
            (repo.getCommentById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeComment({ deletedAt: now, deletedBy: "other-user" })
            );
            const result = await service.restore(validUUID, validUUID, "ADMIN");
            expect(result.deletedAt).toBeNull();
        });

        it("throws ForbiddenError when non-deleter user tries to restore", async () => {
            (repo.getCommentById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeComment({ deletedAt: now, deletedBy: "admin-user" })
            );
            await expect(service.restore(validUUID, "different-user", "USER")).rejects.toThrow(ForbiddenError);
        });

        it("throws ConflictError when comment is not deleted", async () => {
            await expect(service.restore(validUUID, validUUID, "USER")).rejects.toThrow(ConflictError);
        });
    });

    describe("hardDelete", () => {
        it("permanently deletes a soft-deleted comment", async () => {
            (repo.getCommentById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeComment({ deletedAt: now })
            );
            await service.hardDelete(validUUID);
            expect(repo.hardDeleteComment).toHaveBeenCalledWith(validUUID);
        });

        it("throws ConflictError when comment is not deleted", async () => {
            await expect(service.hardDelete(validUUID)).rejects.toThrow(ConflictError);
        });
    });
});
