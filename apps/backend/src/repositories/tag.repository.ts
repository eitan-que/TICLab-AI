import { db } from "@/db/drizzle";
import { tag, postTags } from "@/db/schema";
import { Tag } from "@/domain/tag.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, ParseZodError } from "@/lib/errors";
import {
    tagId, TagId,
    CreateTag, createTagSchema,
    GetAllTags, getAllTagsSchema,
    PostTag, postTagSchema,
    UpdateTag, updateTagSchema,
} from "@/validators/tag.validator";
import { and, eq, sql } from "drizzle-orm";
import { ZodError } from "zod";

export interface TagRepositoryTemplate {
    createTag(data: CreateTag): Promise<Tag>;
    getTagById(id: TagId): Promise<Tag | null>;
    getAllTags(query: GetAllTags): Promise<Tag[]>;
    updateTag(data: UpdateTag): Promise<Tag>;
    deleteTag(id: TagId): Promise<void>;
    restoreTag(id: TagId): Promise<void>;
    hardDeleteTag(id: TagId): Promise<void>;
    addTagToPost(data: PostTag): Promise<void>;
    removeTagFromPost(data: PostTag): Promise<void>;
    getTagsByPostId(postId: string): Promise<Tag[]>;
}

export class TagRepository extends Debuggable implements TagRepositoryTemplate {

    private mapToTag(row: typeof tag.$inferSelect): Tag {
        return new Tag(
            row.id,
            row.name,
            row.createdBy,
            row.createdAt,
            row.updatedAt,
            row.deletedAt,
        );
    }

    async createTag(data: CreateTag): Promise<Tag> {
        try {
            this.debug.start("Creating new tag");

            this.debug.step("Validating input data", { ...data });
            const validatedData = createTagSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Inserting new tag into database");
            const result = await db.insert(tag).values({
                name: validatedData.name,
                createdBy: validatedData.createdBy,
            }).returning();
            this.debug.info("New tag inserted successfully");

            if (result.length === 0) {
                throw new AppError("Failed to create tag", "TAG_CREATION_FAILED", 500);
            }

            const newTag = this.mapToTag(result[0]);

            this.debug.finish("Tag creation process completed");
            return newTag;

        } catch (err) {
            this.debug.error("Error occurred while creating tag", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tag creation", "TAG_CREATION_ERROR", 500, { error: err });
        }
    }

    async getTagById(id: TagId): Promise<Tag | null> {
        try {
            this.debug.start("Getting tag by ID");

            this.debug.step("Validating tag ID", { id });
            const validatedId = tagId.parse(id);

            const prepared = db.query.tag.findFirst({
                where: { id: { eq: sql.placeholder("id") } }
            }).prepare("getTagById");

            const row = await prepared.execute({ id: validatedId });

            if (!row) {
                this.debug.finish("Tag not found");
                return null;
            }

            const tagInstance = this.mapToTag(row);
            this.debug.finish("Getting tag by ID completed");
            return tagInstance;

        } catch (err) {
            this.debug.error("Error occurred while retrieving tag", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tag retrieval", "TAG_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    async getAllTags(query: GetAllTags): Promise<Tag[]> {
        try {
            this.debug.start("Getting all tags");

            this.debug.step("Validating query parameters", { ...query });
            const validatedQuery = getAllTagsSchema.parse(query);
            this.debug.info("Query parameters validated successfully", { ...validatedQuery });

            const rows = await db.query.tag.findMany({
                where: validatedQuery.name ? {
                    name: { like: `%${validatedQuery.name}%` },
                } : undefined,
                offset: (validatedQuery.page - 1) * validatedQuery.limit,
                limit: validatedQuery.limit,
            });
            this.debug.info("Tags retrieved successfully", { count: rows.length });

            const tags = rows.map(row => this.mapToTag(row));

            this.debug.finish("Getting all tags completed");
            return tags;

        } catch (err) {
            this.debug.error("Error occurred while retrieving tags", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tags retrieval", "TAGS_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    async updateTag(data: UpdateTag): Promise<Tag> {
        try {
            this.debug.start("Updating tag");

            this.debug.step("Validating input data", { ...data });
            const validatedData = updateTagSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            const [row] = await db.update(tag)
                .set({ name: validatedData.name })
                .where(eq(tag.id, validatedData.id))
                .returning();
            this.debug.info("Tag updated successfully");

            const tagInstance = this.mapToTag(row);

            this.debug.finish("Tag update process completed");
            return tagInstance;

        } catch (err) {
            this.debug.error("Error occurred while updating tag", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tag update", "TAG_UPDATE_ERROR", 500, { error: err });
        }
    }

    async deleteTag(id: TagId): Promise<void> {
        try {
            this.debug.start("Deleting tag");

            const validatedId = tagId.parse(id);

            await db.update(tag)
                .set({ deletedAt: new Date(), updatedAt: new Date() })
                .where(eq(tag.id, validatedId));
            this.debug.info("Tag marked as deleted successfully", { tagId: validatedId });

            this.debug.finish("Tag deletion process completed");

        } catch (err) {
            this.debug.error("Error occurred while deleting tag", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tag deletion", "TAG_DELETION_ERROR", 500, { error: err });
        }
    }

    async restoreTag(id: TagId): Promise<void> {
        try {
            this.debug.start("Restoring tag");

            const validatedId = tagId.parse(id);

            await db.update(tag)
                .set({ deletedAt: null, updatedAt: new Date() })
                .where(eq(tag.id, validatedId));
            this.debug.info("Tag restored successfully", { tagId: validatedId });

            this.debug.finish("Tag restoration process completed");

        } catch (err) {
            this.debug.error("Error occurred while restoring tag", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tag restoration", "TAG_RESTORATION_ERROR", 500, { error: err });
        }
    }

    async hardDeleteTag(id: TagId): Promise<void> {
        try {
            this.debug.start("Hard deleting tag");

            const validatedId = tagId.parse(id);

            await db.delete(tag).where(eq(tag.id, validatedId));
            this.debug.info("Tag permanently deleted successfully", { tagId: validatedId });

            this.debug.finish("Tag hard deletion process completed");

        } catch (err) {
            this.debug.error("Error occurred while hard deleting tag", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tag hard deletion", "TAG_HARD_DELETION_ERROR", 500, { error: err });
        }
    }

    async addTagToPost(data: PostTag): Promise<void> {
        try {
            this.debug.start("Adding tag to post");

            const validatedData = postTagSchema.parse(data);

            await db.insert(postTags).values({
                postId: validatedData.postId,
                tagId: validatedData.tagId,
            });
            this.debug.info("Tag added to post successfully", { postId: validatedData.postId, tagId: validatedData.tagId });

            this.debug.finish("Add tag to post process completed");

        } catch (err) {
            this.debug.error("Error occurred while adding tag to post", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during adding tag to post", "POST_TAG_ADD_ERROR", 500, { error: err });
        }
    }

    async removeTagFromPost(data: PostTag): Promise<void> {
        try {
            this.debug.start("Removing tag from post");

            const validatedData = postTagSchema.parse(data);

            await db.delete(postTags).where(
                and(
                    eq(postTags.postId, validatedData.postId),
                    eq(postTags.tagId, validatedData.tagId),
                )
            );
            this.debug.info("Tag removed from post successfully", { postId: validatedData.postId, tagId: validatedData.tagId });

            this.debug.finish("Remove tag from post process completed");

        } catch (err) {
            this.debug.error("Error occurred while removing tag from post", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during removing tag from post", "POST_TAG_REMOVE_ERROR", 500, { error: err });
        }
    }

    async getTagsByPostId(postId: string): Promise<Tag[]> {
        try {
            this.debug.start("Getting tags by post ID");

            const rows = await db.query.postTags.findMany({
                where: { postId: { eq: postId } },
                with: { tag: true },
            });

            const tags = rows.map(row => this.mapToTag((row as { tag: typeof tag.$inferSelect }).tag));

            this.debug.finish("Getting tags by post ID completed");
            return tags;

        } catch (err) {
            this.debug.error("Error occurred while getting tags by post", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tags by post retrieval", "TAGS_BY_POST_RETRIEVAL_ERROR", 500, { error: err });
        }
    }
}

export const tagRepository = new TagRepository();
