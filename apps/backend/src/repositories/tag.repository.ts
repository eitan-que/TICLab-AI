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
    getTagByName(name: string): Promise<Tag | null>;
    getAllTags(query: GetAllTags): Promise<Tag[]>;
    updateTag(data: UpdateTag): Promise<Tag>;
    deleteTag(id: TagId): Promise<void>;
    restoreTag(id: TagId): Promise<void>;
    hardDeleteTag(id: TagId): Promise<void>;
    addTagToPost(data: PostTag): Promise<void>;
    removeTagFromPost(data: PostTag): Promise<void>;
    getTagsByPostId(postId: string): Promise<Tag[]>;
}

/**
 * # TagRepository
 * The TagRepository class is responsible for managing all database operations related to the Tag entity.
 * Tags function like hashtags — they are shared across users and posts. Any authenticated user can create a tag,
 * and if a tag with the same name already exists, the existing tag is reused rather than creating a duplicate.
 * It provides methods for creating, retrieving, updating, soft-deleting, restoring, hard-deleting tags,
 * and managing the many-to-many relationship between tags and posts.
 * Each method includes validation of input data using Zod schemas and detailed error handling with custom error classes.
 * The repository integrates with the Debug class to provide step-by-step logging for troubleshooting and monitoring.
 * @see Tag for the domain model that this repository manages.
 */
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

    /**
     * ## Create Tag
     * Inserts a new tag into the database.
     * @param data - The data for the new tag, conforming to the CreateTag schema.
     * @returns A promise that resolves to the newly created Tag domain object.
     * @throws {ValidationError} If the input data fails schema validation.
     * @throws {AppError} If the insert returns no rows or an unexpected error occurs.
     * @example
     * ```ts
     * const tag = await tagRepository.createTag({ name: "typescript", createdBy: "user-id-123" });
     * ```
     */
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

    /**
     * ## Get Tag by ID
     * Retrieves a single tag by its unique identifier.
     * @param id - The UUID of the tag to retrieve.
     * @returns A promise that resolves to the Tag domain object, or null if not found.
     * @throws {ValidationError} If the provided ID fails schema validation.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const tag = await tagRepository.getTagById("tag-id-123");
     * ```
     */
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

    /**
     * ## Get Tag by Name
     * Retrieves a single tag by its exact name (case-sensitive).
     * Used during tag creation to check whether a tag with the same name already exists,
     * enabling find-or-create (upsert) behavior.
     * @param name - The exact name of the tag to look up.
     * @returns A promise that resolves to the Tag domain object, or null if not found.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const existing = await tagRepository.getTagByName("typescript");
     * ```
     */
    async getTagByName(name: string): Promise<Tag | null> {
        try {
            this.debug.start("Getting tag by name", { name });

            const row = await db.query.tag.findFirst({
                where: { name: { eq: name } },
            });

            if (!row) {
                this.debug.finish("Tag not found by name");
                return null;
            }

            const tagInstance = this.mapToTag(row);
            this.debug.finish("Getting tag by name completed");
            return tagInstance;

        } catch (err) {
            this.debug.error("Error occurred while retrieving tag by name", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            throw new AppError("Unexpected error during tag retrieval by name", "TAG_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get All Tags
     * Retrieves a paginated list of tags, optionally filtered by name (partial match).
     * @param query - The query parameters conforming to the GetAllTags schema.
     * @returns A promise that resolves to an array of Tag domain objects.
     * @throws {ValidationError} If the query parameters fail schema validation.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const tags = await tagRepository.getAllTags({ page: 1, limit: 20, name: "type" });
     * ```
     */
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

    /**
     * ## Update Tag
     * Updates an existing tag's properties in the database.
     * @param data - The update payload conforming to the UpdateTag schema, including the tag ID.
     * @returns A promise that resolves to the updated Tag domain object.
     * @throws {ValidationError} If the input data fails schema validation.
     * @throws {AppError} If an unexpected error occurs during the update.
     * @example
     * ```ts
     * const updated = await tagRepository.updateTag({ id: "tag-id-123", name: "javascript" });
     * ```
     */
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

    /**
     * ## Delete Tag
     * Soft-deletes a tag by setting its deletedAt timestamp.
     * @param id - The UUID of the tag to soft-delete.
     * @returns A promise that resolves when the tag has been soft-deleted.
     * @throws {ValidationError} If the provided ID fails schema validation.
     * @throws {AppError} If an unexpected error occurs during deletion.
     * @example
     * ```ts
     * await tagRepository.deleteTag("tag-id-123");
     * ```
     */
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

    /**
     * ## Restore Tag
     * Restores a soft-deleted tag by clearing its deletedAt timestamp.
     * @param id - The UUID of the tag to restore.
     * @returns A promise that resolves when the tag has been restored.
     * @throws {ValidationError} If the provided ID fails schema validation.
     * @throws {AppError} If an unexpected error occurs during restoration.
     * @example
     * ```ts
     * await tagRepository.restoreTag("tag-id-123");
     * ```
     */
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

    /**
     * ## Hard Delete Tag
     * Permanently removes a tag from the database. This operation is irreversible.
     * @param id - The UUID of the tag to permanently delete.
     * @returns A promise that resolves when the tag has been permanently deleted.
     * @throws {ValidationError} If the provided ID fails schema validation.
     * @throws {AppError} If an unexpected error occurs during hard deletion.
     * @example
     * ```ts
     * await tagRepository.hardDeleteTag("tag-id-123");
     * ```
     */
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

    /**
     * ## Add Tag to Post
     * Creates a many-to-many relationship between a tag and a post.
     * @param data - The payload conforming to the PostTag schema, containing postId and tagId.
     * @returns A promise that resolves when the tag has been linked to the post.
     * @throws {ValidationError} If the input data fails schema validation.
     * @throws {AppError} If an unexpected error occurs (e.g. duplicate association).
     * @example
     * ```ts
     * await tagRepository.addTagToPost({ postId: "post-id-123", tagId: "tag-id-456" });
     * ```
     */
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

    /**
     * ## Remove Tag from Post
     * Removes the many-to-many relationship between a tag and a post.
     * @param data - The payload conforming to the PostTag schema, containing postId and tagId.
     * @returns A promise that resolves when the tag has been unlinked from the post.
     * @throws {ValidationError} If the input data fails schema validation.
     * @throws {AppError} If an unexpected error occurs during removal.
     * @example
     * ```ts
     * await tagRepository.removeTagFromPost({ postId: "post-id-123", tagId: "tag-id-456" });
     * ```
     */
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

    /**
     * ## Get Tags by Post ID
     * Retrieves all tags associated with a specific post via the postTags join table.
     * @param postId - The UUID of the post whose tags should be retrieved.
     * @returns A promise that resolves to an array of Tag domain objects linked to the post.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const tags = await tagRepository.getTagsByPostId("post-id-123");
     * ```
     */
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
