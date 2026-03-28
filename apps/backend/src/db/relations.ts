import * as schema from "@/db/schema";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(schema, (r) => ({
	user: {
		accounts: r.many.account({
            from: r.user.id,
            to: r.account.userId,
        }),
		createdCategories: r.many.category({
			from: r.user.id,
			to: r.category.createdBy,
		}),
		authoredPosts: r.many.post({
			from: r.user.id,
			to: r.post.authorId,
		}),
		authoredComments: r.many.comment({
			from: r.user.id,
			to: r.comment.authorId,
		}),
		votes: r.many.vote({
			from: r.user.id,
			to: r.vote.userId,
		}),
		createdTags: r.many.tag({
			from: r.user.id,
			to: r.tag.createdBy,
		}),
	},
	account: {
		user: r.one.user({
			from: r.account.userId,
			to: r.user.id,
		}),
	},
	category: {
		creator: r.one.user({
			from: r.category.createdBy,
			to: r.user.id,
		}),
		posts: r.many.post({
			from: r.category.id,
			to: r.post.categoryId,
		}),
		comments: r.many.comment({
			from: r.category.id.through(r.post.categoryId),
			to: r.comment.postId.through(r.post.id),
		}),
		votes: r.many.vote({
			from: r.category.id.through(r.post.categoryId),
			to: r.vote.postId.through(r.post.id),
		})
	},
	post: {
		author: r.one.user({
			from: r.post.authorId,
			to: r.user.id,
		}),
		category: r.one.category({
			from: r.post.categoryId,
			to: r.category.id,
		}),
		comments: r.many.comment({
			from: r.post.id,
			to: r.comment.postId,
		}),
		votes: r.many.vote({
			from: r.post.id,
			to: r.vote.postId,
		}),
		tags: r.many.tag({
			from: r.post.id.through(r.postTags.postId),
			to: r.tag.id.through(r.postTags.tagId),
		}),
	},
	comment: {
		author: r.one.user({
			from: r.comment.authorId,
			to: r.user.id,
		}),
		post: r.one.post({
			from: r.comment.postId,
			to: r.post.id,
		}),
		votes: r.many.vote({
			from: r.comment.id,
			to: r.vote.commentId,
		}),
		category: r.one.category({
			from: r.comment.postId.through(r.post.id),
			to: r.category.id.through(r.post.categoryId),
		}),
	},
	vote: {
		user: r.one.user({
			from: r.vote.userId,
			to: r.user.id,
		}),
		post: r.one.post({
			from: r.vote.postId,
			to: r.post.id,
		}),
		comment: r.one.comment({
			from: r.vote.commentId,
			to: r.comment.id,
		}),
	},
	tag: {
		creator: r.one.user({
			from: r.tag.createdBy,
			to: r.user.id,
		}),
		posts: r.many.post({
			from: r.tag.id.through(r.postTags.tagId),
			to: r.post.id.through(r.postTags.postId),
		}),
	}
}));
