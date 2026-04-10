import { ForbiddenError } from "@/lib/errors";
import { voteService } from "@/services/vote.service";
import { createVoteInputSchema, voteId } from "@/validators/vote.validator";
import Elysia from "elysia";
import z from "zod";

export const voteController = new Elysia({ name: "vote", prefix: "/vote" })
    .post("/", async ({
        body,
        // @ts-ignore
        user
    }) => {
        const result = await voteService.create(body, user.id);
        return result.toJSON();
    }, {
        body: createVoteInputSchema,
        auth: true,
        detail: {
            summary: "Cast Vote",
            description: "Cast an upvote or downvote on a post or comment. One vote per user per target. Provide either postId or commentId, not both.",
            tags: ["Vote"],
        },
    })
    .delete("/:id", async ({
        params,
        // @ts-ignore
        user
    }) => {
        await voteService.delete(params.id, user.id, user.role);
        return { message: "Vote deleted" };
    }, {
        params: z.object({ id: voteId }),
        auth: true,
        detail: {
            summary: "Delete Vote",
            description: "Remove a vote. Only the vote owner or ADMIN can delete a vote.",
            tags: ["Vote"],
        },
    })
    .get("/post/:postId", async ({
        params
    }) => {
        const votes = await voteService.getByPost(params.postId);
        return votes.map(v => v.toJSON());
    }, {
        params: z.object({ postId: z.uuid() }),
        detail: {
            summary: "Get Votes by Post",
            description: "Retrieve all votes for a given post. No authentication required.",
            tags: ["Vote"],
        },
    })
    .get("/comment/:commentId", async ({
        params
    }) => {
        const votes = await voteService.getByComment(params.commentId);
        return votes.map(v => v.toJSON());
    }, {
        params: z.object({ commentId: z.uuid() }),
        detail: {
            summary: "Get Votes by Comment",
            description: "Retrieve all votes for a given comment. No authentication required.",
            tags: ["Vote"],
        },
    })
