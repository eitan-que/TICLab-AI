import { Tag } from "@/domain/tag.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ParseZodError } from "@/lib/errors";
import { tagRepository, TagRepositoryTemplate } from "@/repositories/tag.repository";
import {
    tagId, TagId,
    createTagInputSchema, CreateTagInput,
    getAllTagsSchema, GetAllTags,
    postTagSchema, PostTag,
    updateTagInputSchema, UpdateTagInput,
} from "@/validators/tag.validator";
import { ZodError } from "zod";
import { postService } from "@/services/post.service";

/**
 * TagService handles all business logic related to tags.
 * It validates inputs, enforces authorization rules, and delegates persistence to the repository.
 * All methods throw typed errors (ValidationError, NotFoundError, ConflictError, ForbiddenError, AppError)
 * to allow consistent error handling at the controller layer.
 */
export class TagService extends Debuggable {
    constructor(
        private repository: TagRepositoryTemplate
    ) {
        super();
    }

    /**
     * ## Create Tag
     * Creates a new tag in the system.
     * Validates the input data and associates the tag with the creating user.
     * @param data - The input data for creating a tag, conforming to CreateTagInput.
     * @param createdById - The ID of the user creating the tag.
     * @returns A promise that resolves to the created Tag object.
     * @throws {ValidationError} If the input data does not meet the validation criteria.
     * @throws {AppError} If an unexpected error occurs during creation.
     * @example
     * ```ts
     * const tag = await tagService.create({ name: "typescript" }, "user-id-123");
     * ```
     */
    async create(data: CreateTagInput, createdById: string): Promise<Tag> {
        try {
            this.debug.start("Creating tag");

            this.debug.step("Validating input data", { ...data });
            const validatedData = createTagInputSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Creating tag in repository");
            const created = await this.repository.createTag({
                name: validatedData.name,
                createdBy: createdById,
            });
            this.debug.info("Tag created successfully");

            this.debug.finish("Tag creation completed successfully");
            return created;

        } catch (err) {
            this.debug.error("Error occurred during tag creation", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during tag creation", "TAG_CREATION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Tag by ID
     * Retrieves a tag by its unique identifier.
     * Validates the ID format and throws a NotFoundError if no tag is found.
     * @param id - The unique identifier of the tag to retrieve.
     * @returns A promise that resolves to the retrieved Tag object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If no tag is found with the provided ID.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const tag = await tagService.getById("tag-id-123");
     * ```
     */
    async getById(id: TagId): Promise<Tag> {
        try {
            this.debug.start("Retrieving tag by ID", { id });

            const validatedId = tagId.parse(id);
            const tagInstance = await this.repository.getTagById(validatedId);

            if (!tagInstance) {
                throw new NotFoundError("Tag not found", { id: validatedId });
            }

            this.debug.finish("Tag retrieval by ID completed successfully");
            return tagInstance;

        } catch (err) {
            this.debug.error("Error occurred during tag retrieval by ID", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during tag retrieval", "TAG_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get All Tags
     * Retrieves a list of tags based on the provided query parameters.
     * Validates query parameters before delegating to the repository.
     * @param query - The query parameters for filtering and paginating tags, conforming to GetAllTags.
     * @returns A promise that resolves to an array of Tag objects matching the query.
     * @throws {ValidationError} If the provided query parameters do not meet the validation criteria.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const tags = await tagService.getAll({ page: 1, limit: 20 });
     * ```
     */
    async getAll(query: GetAllTags): Promise<Tag[]> {
        try {
            this.debug.start("Retrieving all tags", { ...query });

            const parsedQuery = getAllTagsSchema.parse(query);
            const tags = await this.repository.getAllTags(parsedQuery);
            this.debug.info("Tags retrieval completed", { count: tags.length });

            this.debug.finish("All tags retrieval completed successfully");
            return tags;

        } catch (err) {
            this.debug.error("Error occurred during tags retrieval", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during tags retrieval", "TAGS_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Update Tag
     * Updates an existing tag's properties.
     * Validates input data, confirms the tag exists and is not deleted, then persists the changes.
     * @param data - The update payload conforming to UpdateTagInput, including the tag ID.
     * @returns A promise that resolves to the updated Tag object.
     * @throws {ValidationError} If the input data does not meet the validation criteria.
     * @throws {NotFoundError} If the tag does not exist or is already deleted.
     * @throws {AppError} If an unexpected error occurs during the update.
     * @example
     * ```ts
     * const updated = await tagService.update({ id: "tag-id-123", name: "javascript" });
     * ```
     */
    async update(data: UpdateTagInput): Promise<Tag> {
        try {
            this.debug.start("Updating tag", { ...data });

            const validatedData = updateTagInputSchema.parse(data);

            const existing = await this.getById(validatedData.id);
            if (existing.deletedAt) {
                throw new NotFoundError("Tag not found", { id: validatedData.id });
            }

            const updated = await this.repository.updateTag(validatedData);
            this.debug.finish("Tag update completed successfully");
            return updated;

        } catch (err) {
            this.debug.error("Error occurred during tag update", { error: err, data });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during tag update", "TAG_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Delete Tag
     * Soft-deletes a tag by setting its deletedAt timestamp.
     * Throws a ConflictError if the tag is already deleted.
     * @param id - The unique identifier of the tag to delete.
     * @returns A promise that resolves to the soft-deleted Tag object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If the tag does not exist.
     * @throws {ConflictError} If the tag is already deleted.
     * @throws {AppError} If an unexpected error occurs during deletion.
     * @example
     * ```ts
     * const deleted = await tagService.delete("tag-id-123");
     * ```
     */
    async delete(id: TagId): Promise<Tag> {
        try {
            this.debug.start("Deleting tag", { id });

            const validatedId = tagId.parse(id);
            const existing = await this.getById(validatedId);

            if (existing.deletedAt) {
                throw new ConflictError("Tag is already deleted", { id: validatedId });
            }

            await this.repository.deleteTag(validatedId);
            existing.delete();

            this.debug.finish("Tag deletion completed successfully");
            return existing;

        } catch (err) {
            this.debug.error("Error occurred during tag deletion", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during tag deletion", "TAG_DELETION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Restore Tag
     * Restores a previously soft-deleted tag by clearing its deletedAt timestamp.
     * Throws a ConflictError if the tag is not deleted.
     * @param id - The unique identifier of the tag to restore.
     * @returns A promise that resolves to the restored Tag object.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If the tag does not exist.
     * @throws {ConflictError} If the tag is not deleted.
     * @throws {AppError} If an unexpected error occurs during restoration.
     * @example
     * ```ts
     * const restored = await tagService.restore("tag-id-123");
     * ```
     */
    async restore(id: TagId): Promise<Tag> {
        try {
            this.debug.start("Restoring tag", { id });

            const validatedId = tagId.parse(id);
            const existing = await this.getById(validatedId);

            if (!existing.deletedAt) {
                throw new ConflictError("Tag is not deleted", { id: validatedId });
            }

            await this.repository.restoreTag(validatedId);
            existing.restore();

            this.debug.finish("Tag restoration completed successfully");
            return existing;

        } catch (err) {
            this.debug.error("Error occurred during tag restoration", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during tag restoration", "TAG_RESTORE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Hard Delete Tag
     * Permanently removes a tag from the database. The tag must be soft-deleted first.
     * @param id - The unique identifier of the tag to permanently delete.
     * @returns A promise that resolves when the tag has been permanently deleted.
     * @throws {ValidationError} If the provided ID does not meet the validation criteria.
     * @throws {NotFoundError} If the tag does not exist.
     * @throws {ConflictError} If the tag is not soft-deleted (must be deleted before hard deleting).
     * @throws {AppError} If an unexpected error occurs during hard deletion.
     * @example
     * ```ts
     * await tagService.hardDelete("tag-id-123");
     * ```
     */
    async hardDelete(id: TagId): Promise<void> {
        try {
            this.debug.start("Hard deleting tag", { id });

            const validatedId = tagId.parse(id);
            const existing = await this.getById(validatedId);

            if (!existing.deletedAt) {
                throw new ConflictError("Tag is not deleted", { id: validatedId });
            }

            await this.repository.hardDeleteTag(validatedId);

            this.debug.finish("Tag hard deletion completed successfully");

        } catch (err) {
            this.debug.error("Error occurred during tag hard deletion", { error: err, id });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during tag hard deletion", "TAG_HARD_DELETE_ERROR", 500, { error: err });
        }
    }

    /**
     * Assigns a tag to a post.
     * Validates that both the post and tag exist and are not deleted.
     * Only the post author, ADMIN, or MODERATOR can perform this action.
     */
    async addToPost(data: PostTag, requesterId: string, requesterRole: string): Promise<void> {
        try {
            this.debug.start("Adding tag to post", { ...data, requesterId, requesterRole });

            const validatedData = postTagSchema.parse(data);

            const post = await postService.getById(validatedData.postId);
            if (post.deletedAt) {
                throw new NotFoundError("Post not found", { postId: validatedData.postId });
            }

            const isAdminOrModerator = requesterRole === "ADMIN" || requesterRole === "MODERATOR";
            const isAuthor = post.authorId === requesterId;
            if (!isAdminOrModerator && !isAuthor) {
                throw new ForbiddenError("Cannot modify tags for this post", { userId: requesterId, postAuthorId: post.authorId });
            }

            const tagInstance = await this.getById(validatedData.tagId);
            if (tagInstance.deletedAt) {
                throw new NotFoundError("Tag not found", { tagId: validatedData.tagId });
            }

            await this.repository.addTagToPost(validatedData);

            this.debug.finish("Tag added to post successfully");

        } catch (err) {
            this.debug.error("Error occurred during adding tag to post", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during adding tag to post", "POST_TAG_ADD_ERROR", 500, { error: err });
        }
    }

    /**
     * Removes a tag from a post.
     * Only the post author, ADMIN, or MODERATOR can perform this action.
     */
    async removeFromPost(data: PostTag, requesterId: string, requesterRole: string): Promise<void> {
        try {
            this.debug.start("Removing tag from post", { ...data, requesterId, requesterRole });

            const validatedData = postTagSchema.parse(data);

            const post = await postService.getById(validatedData.postId);
            if (post.deletedAt) {
                throw new NotFoundError("Post not found", { postId: validatedData.postId });
            }

            const isAdminOrModerator = requesterRole === "ADMIN" || requesterRole === "MODERATOR";
            const isAuthor = post.authorId === requesterId;
            if (!isAdminOrModerator && !isAuthor) {
                throw new ForbiddenError("Cannot modify tags for this post", { userId: requesterId, postAuthorId: post.authorId });
            }

            await this.repository.removeTagFromPost(validatedData);

            this.debug.finish("Tag removed from post successfully");

        } catch (err) {
            this.debug.error("Error occurred during removing tag from post", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during removing tag from post", "POST_TAG_REMOVE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Tags by Post
     * Retrieves all tags associated with a specific post.
     * @param postId - The ID of the post whose tags should be retrieved.
     * @returns A promise that resolves to an array of Tag objects associated with the post.
     * @throws {AppError} If an unexpected error occurs during retrieval.
     * @example
     * ```ts
     * const tags = await tagService.getTagsByPost("post-id-123");
     * ```
     */
    async getTagsByPost(postId: string): Promise<Tag[]> {
        try {
            this.debug.start("Getting tags by post", { postId });
            const tags = await this.repository.getTagsByPostId(postId);
            this.debug.finish("Tags by post retrieval completed");
            return tags;
        } catch (err) {
            this.debug.error("Error occurred during tags by post retrieval", { error: err });
            if (err instanceof ZodError) throw ParseZodError(err);
            if (err instanceof AppError) throw err;
            throw new AppError("Unexpected error during tags by post retrieval", "TAGS_BY_POST_RETRIEVAL_ERROR", 500, { error: err });
        }
    }
}

export const tagService = new TagService(tagRepository);
