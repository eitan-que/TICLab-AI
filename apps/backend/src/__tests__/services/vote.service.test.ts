import { describe, expect, it, mock, beforeEach, spyOn } from "bun:test";
import { Vote } from "@/domain/vote.domain";
import { Post } from "@/domain/post.domain";
import { Comment } from "@/domain/comment.domain";
import { VoteService } from "@/services/vote.service";
import { VoteRepositoryTemplate } from "@/repositories/vote.repository";
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from "@/lib/errors";

import * as postServiceModule from "@/services/post.service";
import * as commentServiceModule from "@/services/comment.service";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";
const validUUID2 = "660e8400-e29b-41d4-a716-446655440000";
const now = new Date();

function makeVote(overrides: Partial<{
    id: string; value: boolean; userId: string;
    postId: string | null; commentId: string | null;
    createdAt: Date; updatedAt: Date;
}> = {}): Vote {
    const defaults = {
        id: validUUID, value: true, userId: validUUID,
        postId: validUUID2 as string | null, commentId: null as string | null,
        createdAt: now, updatedAt: now,
    };
    const m = { ...defaults, ...overrides };
    return new Vote(m.id, m.value, m.userId, m.postId, m.commentId, m.createdAt, m.updatedAt);
}

function makePost(): Post {
    return new Post(validUUID2, "test-ab12", "Test", "# Hello", true, validUUID, validUUID, null, now, now, null);
}

function makeComment(): Comment {
    return new Comment(validUUID2, "Great post!", validUUID, validUUID, null, now, now, null);
}

function createMockRepo(): VoteRepositoryTemplate {
    return {
        createVote: mock(() => Promise.resolve(makeVote())),
        getVoteById: mock(() => Promise.resolve(makeVote())),
        getVotesByPostId: mock(() => Promise.resolve([makeVote()])),
        getVotesByCommentId: mock(() => Promise.resolve([])),
        getVoteByUserAndPost: mock(() => Promise.resolve(null)),
        getVoteByUserAndComment: mock(() => Promise.resolve(null)),
        deleteVote: mock(() => Promise.resolve()),
    };
}

describe("VoteService", () => {
    let repo: ReturnType<typeof createMockRepo>;
    let service: VoteService;

    beforeEach(() => {
        repo = createMockRepo();
        service = new VoteService(repo);
        spyOn(postServiceModule.postService, "getById").mockResolvedValue(makePost());
        spyOn(commentServiceModule.commentService, "getById").mockResolvedValue(makeComment());
    });

    describe("create", () => {
        it("creates a vote on a post", async () => {
            const result = await service.create(
                { value: true, postId: validUUID2, commentId: null },
                validUUID
            );
            expect(result).toBeInstanceOf(Vote);
            expect(repo.createVote).toHaveBeenCalled();
        });

        it("creates a vote on a comment", async () => {
            (repo.createVote as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeVote({ postId: null, commentId: validUUID2 })
            );
            const result = await service.create(
                { value: false, postId: null, commentId: validUUID2 },
                validUUID
            );
            expect(result).toBeInstanceOf(Vote);
        });

        it("throws BadRequestError when both targets are null", async () => {
            await expect(service.create(
                { value: true, postId: null, commentId: null },
                validUUID
            )).rejects.toThrow(BadRequestError);
        });

        it("throws BadRequestError when both targets are provided", async () => {
            await expect(service.create(
                { value: true, postId: validUUID2, commentId: validUUID2 },
                validUUID
            )).rejects.toThrow(BadRequestError);
        });

        it("throws NotFoundError when post is deleted", async () => {
            const deletedPost = new Post(validUUID2, "test-ab12", "Test", "# Hello", true, validUUID, validUUID, null, now, now, now);
            spyOn(postServiceModule.postService, "getById").mockResolvedValueOnce(deletedPost);
            await expect(service.create(
                { value: true, postId: validUUID2, commentId: null },
                validUUID
            )).rejects.toThrow(NotFoundError);
        });

        it("throws ConflictError when user already voted on post", async () => {
            (repo.getVoteByUserAndPost as ReturnType<typeof mock>).mockResolvedValueOnce(makeVote());
            await expect(service.create(
                { value: true, postId: validUUID2, commentId: null },
                validUUID
            )).rejects.toThrow(ConflictError);
        });

        it("throws ConflictError when user already voted on comment", async () => {
            (repo.getVoteByUserAndComment as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeVote({ postId: null, commentId: validUUID2 })
            );
            await expect(service.create(
                { value: true, postId: null, commentId: validUUID2 },
                validUUID
            )).rejects.toThrow(ConflictError);
        });
    });

    describe("getById", () => {
        it("returns vote when found", async () => {
            const result = await service.getById(validUUID);
            expect(result).toBeInstanceOf(Vote);
        });

        it("throws NotFoundError when not found", async () => {
            (repo.getVoteById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.getById(validUUID)).rejects.toThrow(NotFoundError);
        });
    });

    describe("getByPost", () => {
        it("returns votes for a post", async () => {
            const result = await service.getByPost(validUUID2);
            expect(result).toBeArray();
        });
    });

    describe("getByComment", () => {
        it("returns votes for a comment", async () => {
            const result = await service.getByComment(validUUID2);
            expect(result).toBeArray();
        });
    });

    describe("delete", () => {
        it("allows vote owner to delete", async () => {
            await service.delete(validUUID, validUUID, "USER");
            expect(repo.deleteVote).toHaveBeenCalledWith(validUUID);
        });

        it("allows ADMIN to delete any vote", async () => {
            (repo.getVoteById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeVote({ userId: "other-user" })
            );
            await service.delete(validUUID, validUUID, "ADMIN");
            expect(repo.deleteVote).toHaveBeenCalled();
        });

        it("throws ForbiddenError when non-owner non-admin tries to delete", async () => {
            (repo.getVoteById as ReturnType<typeof mock>).mockResolvedValueOnce(
                makeVote({ userId: "other-user" })
            );
            await expect(service.delete(validUUID, "different-user", "USER")).rejects.toThrow(ForbiddenError);
        });

        it("throws NotFoundError when vote does not exist", async () => {
            (repo.getVoteById as ReturnType<typeof mock>).mockResolvedValueOnce(null);
            await expect(service.delete(validUUID, validUUID, "USER")).rejects.toThrow(NotFoundError);
        });
    });
});
