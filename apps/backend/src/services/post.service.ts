import { Post } from "@/domain/post.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ParseZodError } from "@/lib/errors";
import { postRepository, PostRepositoryTemplate } from "@/repositories/post.repository";
import { createPostInputSchema, CreatePostInput, getAllPostsSchema, GetAllPosts, postId, PostId, postSlug, PostSlug, updatePostInputSchema, UpdatePostInput } from "@/validators/post.validator";
import { ZodError } from "zod";
import { categoryService } from "@/services/category.service";

export class PostService extends Debuggable {
	constructor(
		private repository: PostRepositoryTemplate
	) {
		super();
	}

	/**
	 * ## Create Post
	 * This method is responsible for creating a new post based on the provided input data.
	 * It performs validation on the input data using the createPostInputSchema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
	 * If the validation succeeds, it generates a slug from the post title using the slugifyTitle method, and then calls the repository's createPost method to persist the new post in the database.
	 * If an unexpected error occurs during validation or creation, it throws an AppError with details about the error.
	 * @param data - The input data for creating a new post, which should conform to the CreatePostInput type.
	 * @returns A promise that resolves to the created Post object.
	 * @throws {ValidationError} If the input data does not meet the validation criteria defined in the createPostInputSchema.
     * @throws {NotFoundError} If the category specified by categoryId does not exist.
	 * @throws {AppError} If an unexpected error occurs during validation or post creation.
	 * @example
	 * ```ts
	 * const newPost = await postService.create({
	 *   title: "New Post",
	 *   content: "# Hello World",
	 *   authorId: "user-id-123",
	 *   categoryId: "category-id-123",
	 * });
	 * ```
	 */
	async create(data: CreatePostInput): Promise<Post> {
		try {
			this.debug.start("Creating post");

			this.debug.step("Validating input data", { ...data });
			const validatedData = createPostInputSchema.parse(data);
			this.debug.info("Input data validated successfully", { ...validatedData });

			this.debug.step("Generating slug from post title", { title: validatedData.title });
			let slug = Post.slugifyTitle(validatedData.title);
			this.debug.info("Slug generated successfully", { slug });

			this.debug.step("Checking for existing post with the same slug", { slug });
			const existingPost = await this.repository.getPostBySlug(slug);
			this.debug.info("Existing post check completed", { existingPost: !!existingPost });

			this.debug.step("Handling slug collision if necessary", { slug, existingPost: !!existingPost });
			if (existingPost) {
				this.debug.warn("Generated slug already exists, generating a new slug", { slug });
				slug = Post.slugifyTitle(validatedData.title);
				this.debug.info("New slug generated successfully", { slug });
			}
			this.debug.info("Final slug to be used for post creation", { slug });

            this.debug.step("Validating category existence", { categoryId: validatedData.categoryId });
            const category = await categoryService.getById(validatedData.categoryId);
            this.debug.info("Category existence validated successfully", { categoryId: validatedData.categoryId, categoryExists: !!category });

            this.debug.step("Checking if category is marked as deleted", { categoryId: validatedData.categoryId, deletedAt: category.deletedAt });
            if (category.deletedAt) {
                this.debug.warn("Category is marked as deleted, cannot create post with this category", { categoryId: validatedData.categoryId });
                throw new NotFoundError("Category not found", { categoryId: validatedData.categoryId });
            }
            this.debug.info("Category is not deleted, proceeding with post creation", { categoryId: validatedData.categoryId });

			this.debug.step("Creating post in the repository", {
				title: validatedData.title,
				slug,
				authorId: validatedData.authorId,
				categoryId: validatedData.categoryId,
			});
			const createdPost = await this.repository.createPost({
				slug,
				title: validatedData.title,
				content: validatedData.content,
				authorId: validatedData.authorId,
				categoryId: validatedData.categoryId,
				published: true,
			});
			this.debug.info("Post created successfully", { ...createdPost });

			this.debug.finish("Post creation completed successfully", { ...createdPost });
			return createdPost;

		} catch (err) {
			this.debug.error("Error occurred during post creation", { error: err });
			if (err instanceof ZodError) {
				throw ParseZodError(err);
			}
			if (err instanceof AppError) {
				throw err;
			}
			throw new AppError("Unexpected error during post creation", "POST_CREATION_ERROR", 500, { error: err });
		}
	}

	/**
	 * ## Get Post by ID
	 * This method retrieves a post by its unique identifier (ID).
	 * It validates the provided ID using the postId schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
	 * If the validation succeeds, it calls the repository's getPostById method to fetch the post from the database.
	 * If no post is found with the provided ID, it throws a NotFoundError with details about the missing resource.
	 * If an unexpected error occurs during validation or retrieval, it throws an AppError with details about the error.
	 * @param id - The unique identifier of the post to retrieve, which should conform to the PostId type.
	 * @returns A promise that resolves to the retrieved Post object.
	 * @throws {ValidationError} If the provided ID does not meet the validation criteria defined in the postId schema.
	 * @throws {NotFoundError} If no post is found with the provided ID.
	 * @throws {AppError} If an unexpected error occurs during validation or post retrieval.
	 * @example
	 * ```ts
	 * const post = await postService.getById("post-id-123");
	 * ```
	 */
	async getById(id: PostId): Promise<Post> {
		try {
			this.debug.start("Retrieving post by ID", { id });

			this.debug.step("Validating post ID", { id });
			const validatedId = postId.parse(id);
			this.debug.info("Post ID validated successfully", { validatedId });

			this.debug.step("Fetching post from repository", { id: validatedId });
			const post = await this.repository.getPostById(validatedId);
			this.debug.info("Post retrieval completed", { post: !!post });

			this.debug.step("Checking if post exists");
			if (!post) {
				this.debug.error("Post not found", { id: validatedId });
				throw new NotFoundError("Post not found", { id: validatedId });
			}
			this.debug.info("Post found", { ...post });

			this.debug.finish("Post retrieval by ID completed successfully", { ...post });
			return post;

		} catch (err) {
			this.debug.error("Error occurred during post retrieval by ID", { error: err, id });
			if (err instanceof ZodError) {
				throw ParseZodError(err);
			}
			if (err instanceof AppError) {
				throw err;
			}
			throw new AppError("Unexpected error during post retrieval", "POST_RETRIEVAL_ERROR", 500, { error: err });
		}
	}

	/**
	 * ## Get Post by Slug
	 * This method retrieves a post by its unique slug.
	 * It validates the provided slug using the postSlug schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
	 * If the validation succeeds, it calls the repository's getPostBySlug method to fetch the post from the database.
	 * If no post is found with the provided slug, it throws a NotFoundError with details about the missing resource.
	 * If an unexpected error occurs during validation or retrieval, it throws an AppError with details about the error.
	 * @param slug - The unique slug of the post to retrieve, which should conform to the PostSlug type.
	 * @returns A promise that resolves to the retrieved Post object.
	 * @throws {ValidationError} If the provided slug does not meet the validation criteria defined in the postSlug schema.
	 * @throws {NotFoundError} If no post is found with the provided slug.
	 * @throws {AppError} If an unexpected error occurs during validation or post retrieval.
	 * @example
	 * ```ts
	 * const post = await postService.getBySlug("example-post-slug");
	 * ```
	 */
	async getBySlug(slug: PostSlug): Promise<Post> {
		try {
			this.debug.start("Retrieving post by slug", { slug });

			this.debug.step("Validating post slug", { slug });
			const validatedSlug = postSlug.parse(slug);
			this.debug.info("Post slug validated successfully", { validatedSlug });

			this.debug.step("Fetching post from repository", { slug: validatedSlug });
			const post = await this.repository.getPostBySlug(validatedSlug);
			this.debug.info("Post retrieval completed", { post: !!post });

			this.debug.step("Checking if post exists");
			if (!post) {
				this.debug.error("Post not found", { slug: validatedSlug });
				throw new NotFoundError("Post not found", { slug: validatedSlug });
			}
			this.debug.info("Post found", { ...post });

			this.debug.step("Checking if post is marked as deleted", { slug: validatedSlug, deletedAt: post.deletedAt });
			if (post.deletedAt) {
				this.debug.warn("Post is marked as deleted, treating as not found", { slug: validatedSlug });
				throw new NotFoundError("Post not found", { slug: validatedSlug });
			}
			this.debug.info("Post is not deleted, proceeding with retrieval", { slug: validatedSlug });

            this.debug.step("Checking if post is published", { slug: validatedSlug, published: post.published });
            if (!post.published) {
                this.debug.warn("Post is not published, treating as not found", { slug: validatedSlug });
                throw new NotFoundError("Post not found", { slug: validatedSlug });
            }
            this.debug.info("Post is published, proceeding with retrieval", { slug: validatedSlug });

			this.debug.finish("Post retrieval by slug completed successfully", { ...post });
			return post;

		} catch (err) {
			this.debug.error("Error occurred during post retrieval by slug", { error: err, slug });
			if (err instanceof ZodError) {
				throw ParseZodError(err);
			}
			if (err instanceof AppError) {
				throw err;
			}
			throw new AppError("Unexpected error during post retrieval", "POST_RETRIEVAL_ERROR", 500, { error: err });
		}
	}

	/**
	 * ## Get All Posts
	 * This method retrieves all posts based on the provided query parameters.
	 * It validates the query parameters using the getAllPostsSchema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
	 * If the validation succeeds, it calls the repository's getAllPosts method to fetch the posts from the database based on the query parameters.
	 * If an unexpected error occurs during validation or retrieval, it throws an AppError with details about the error.
	 * @param query - The query parameters for retrieving posts, which should conform to the GetAllPosts type.
	 * @returns A promise that resolves to an array of Post objects that match the query parameters.
	 * @throws {ValidationError} If the provided query parameters do not meet the validation criteria defined in the getAllPostsSchema.
	 * @throws {AppError} If an unexpected error occurs during validation or post retrieval.
	 * @example
	 * ```ts
	 * const posts = await postService.getAll({ title: "example", limit: 10, page: 1 });
	 * ```
	 */
	async getAll(query: GetAllPosts): Promise<Post[]> {
		try {
			this.debug.start("Retrieving all posts", { ...query });

			this.debug.step("Validating query parameters", { ...query });
			const parsedQuery = getAllPostsSchema.parse(query);
			this.debug.info("Query parameters validated successfully", { ...parsedQuery });

			this.debug.step("Fetching posts from repository", { ...parsedQuery });
			const posts = await this.repository.getAllPosts(parsedQuery);
			this.debug.info("Posts retrieval completed", { count: posts.length });

			if (posts.length === 0) {
				this.debug.warn("No posts found matching the query", { ...parsedQuery });
			}

			this.debug.finish("All posts retrieval completed successfully", { ...posts });
			return posts;

		} catch (err) {
			this.debug.error("Error occurred during post retrieval", { error: err, query });
			if (err instanceof ZodError) {
				throw ParseZodError(err);
			}
			if (err instanceof AppError) {
				throw err;
			}
			throw new AppError("Unexpected error during post retrieval", "POST_RETRIEVAL_ERROR", 500, { error: err });
		}
	}

	/**
	 * ## Update Post
	 * This method updates an existing post based on the provided input data.
	 * It performs validation on the input data using the updatePostInputSchema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
	 * If the validation succeeds, it checks if the post exists by calling the getById method. If the post does not exist, it throws a NotFoundError.
	 * If the post exists, it calls the repository's updatePost method to persist the updated post in the database.
	 * If an unexpected error occurs during validation or update, it throws an AppError with details about the error.
	 * @param data - The input data for updating an existing post, which should conform to the UpdatePostInput type.
	 * @returns A promise that resolves to the updated Post object.
	 * @throws {ValidationError} If the input data does not meet the validation criteria defined in the updatePostInputSchema.
	 * @throws {NotFoundError} If the post to be updated does not exist.
     * @throws {NotFoundError} If the category specified by categoryId does not exist.
	 * @throws {AppError} If an unexpected error occurs during validation or post update.
	 */
	async update(data: UpdatePostInput): Promise<Post> {
		try {
			this.debug.start("Updating post", { ...data });

			this.debug.step("Validating input data", { ...data });
			const validatedData = updatePostInputSchema.parse(data);
			this.debug.info("Input data validated successfully", { ...validatedData });

			this.debug.step("Checking if post exists", { id: validatedData.id });
			const existingPost = await this.getById(validatedData.id);
			this.debug.info("Existing post check completed", { existingPost: !!existingPost });

            this.debug.step("Validating category existence if categoryId is provided", { categoryId: validatedData.categoryId });
            if (validatedData.categoryId) {
                this.debug.step("Validating category existence", { categoryId: validatedData.categoryId });
                const category = await categoryService.getById(validatedData.categoryId);
                this.debug.info("Category existence validated successfully", { categoryId: validatedData.categoryId, categoryExists: !!category });

                this.debug.step("Checking if category is marked as deleted", { categoryId: validatedData.categoryId, deletedAt: category.deletedAt });
                if (category.deletedAt) {
                    this.debug.warn("Category is marked as deleted, cannot create post with this category", { categoryId: validatedData.categoryId });
                    throw new NotFoundError("Category not found", { categoryId: validatedData.categoryId });
                }
                this.debug.info("Category is not deleted, proceeding with post creation", { categoryId: validatedData.categoryId });
            }

            this.debug.step("Checking if post is marked as deleted", { id: validatedData.id, deletedAt: existingPost.deletedAt });
            if (existingPost.deletedAt) {
                this.debug.warn("Post is marked as deleted, treating as not found for update", { id: validatedData.id });
                throw new NotFoundError("Post not found", { id: validatedData.id });
            }
            this.debug.info("Post is not deleted, proceeding with update", { id: validatedData.id });

			this.debug.step("Updating post in the repository", { ...validatedData });
			const updatedPost = await this.repository.updatePost(validatedData);
			this.debug.info("Post updated successfully", { ...updatedPost });

			this.debug.finish("Post update completed successfully", { ...updatedPost });
			return updatedPost;

		} catch (err) {
			this.debug.error("Error occurred during post update", { error: err, data });
			if (err instanceof ZodError) {
				throw ParseZodError(err);
			}
			if (err instanceof AppError) {
				throw err;
			}
			throw new AppError("Unexpected error during post update", "POST_UPDATE_ERROR", 500, { error: err });
		}
	}

	/**
	 * ## Delete Post
	 * This method marks a post as deleted based on its unique identifier (ID).
	 * It validates the provided ID using the postId schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
	 * If the validation succeeds, it checks if the post exists by calling the getById method. If the post does not exist, it throws a NotFoundError.
	 * If the post exists, it calls the repository's deletePost method to mark the post as deleted in the database.
	 * If an unexpected error occurs during validation or deletion, it throws an AppError with details about the error.
	 * @param id - The unique identifier of the post to delete, which should conform to the PostId type.
	 * @returns A promise that resolves to the deleted Post object.
	 * @throws {ValidationError} If the provided ID does not meet the validation criteria defined in the postId schema.
	 * @throws {NotFoundError} If the post to be deleted does not exist.
	 * @throws {AppError} If an unexpected error occurs during validation or post deletion.
	 */
	async delete(id: PostId, deletedById: string): Promise<Post> {
		try {
			this.debug.start("Deleting post", { id, deletedById });

			this.debug.step("Validating post ID", { id });
			const validatedId = postId.parse(id);
			this.debug.info("Post ID validated successfully", { validatedId });

			this.debug.step("Checking if post exists", { id: validatedId });
			const existingPost = await this.getById(validatedId);
			this.debug.info("Existing post check completed", { existingPost: !!existingPost });

			this.debug.step("Checking if post is already deleted", { id: validatedId, deletedAt: existingPost.deletedAt });
			if (existingPost.deletedAt) {
				this.debug.warn("Post is already marked as deleted", { id: validatedId });
				throw new ConflictError("Post is already deleted", { id: validatedId });
			}
			this.debug.info("Post is not deleted, proceeding with deletion", { id: validatedId });

			this.debug.step("Deleting post in the repository", { id: validatedId, deletedById });
			await this.repository.deletePost({ id: validatedId, deletedBy: deletedById });
			this.debug.info("Post deleted successfully", { id: validatedId });

			this.debug.step("Marking post as deleted in the domain model", { id: validatedId });
			existingPost.delete(deletedById);
			this.debug.info("Post marked as deleted in the domain model", { existingPost });

			this.debug.finish("Post deletion completed successfully", { existingPost });
			return existingPost;

		} catch (err) {
			this.debug.error("Error occurred during post deletion", { error: err, id });
			if (err instanceof ZodError) {
				throw ParseZodError(err);
			}
			if (err instanceof AppError) {
				throw err;
			}
			throw new AppError("Unexpected error during post deletion", "POST_DELETION_ERROR", 500, { error: err });
		}
	}

	/**
	 * ## Restore Post
	 * This method restores a previously deleted post based on its unique identifier (ID).
	 * It validates the provided ID using the postId schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
	 * If the validation succeeds, it checks if the post exists by calling the getById method. If the post does not exist, it throws a NotFoundError.
	 * If the post exists but is not marked as deleted, it throws a ConflictError indicating that the post cannot be restored because it is not deleted.
	 * If the post exists and is marked as deleted, it calls the repository's restorePost method to restore the post in the database.
	 * If an unexpected error occurs during validation or restoration, it throws an AppError with details about the error.
	 * @param id - The unique identifier of the post to restore, which should conform to the PostId type.
	 * @returns A promise that resolves to the restored Post object.
	 * @throws {ValidationError} If the provided ID does not meet the validation criteria defined in the postId schema.
	 * @throws {NotFoundError} If the post to be restored does not exist.
	 * @throws {ConflictError} If the post is not marked as deleted and therefore cannot be restored.
	 * @throws {AppError} If an unexpected error occurs during validation or post restoration.
	 */
	/**
	 * Restores a soft-deleted post.
	 * @param id - The post ID to restore.
	 * @param requesterId - The ID of the user attempting the restore.
	 * @param requesterRole - The role of the user attempting the restore.
	 * @throws {ForbiddenError} If the post was deleted by an admin/mod and the requester is the author.
	 */
	async restore(id: PostId, requesterId: string, requesterRole: string): Promise<Post> {
		try {
			this.debug.start("Restoring post", { id, requesterId, requesterRole });

			this.debug.step("Validating post ID", { id });
			const validatedId = postId.parse(id);
			this.debug.info("Post ID validated successfully", { validatedId });

			this.debug.step("Checking if post exists", { id: validatedId });
			const existingPost = await this.getById(validatedId);
			this.debug.info("Existing post check completed", { existingPost: !!existingPost });

			this.debug.step("Checking if post is not deleted", { id: validatedId, deletedAt: existingPost.deletedAt });
			if (!existingPost.deletedAt) {
				this.debug.warn("Post is not marked as deleted, cannot restore", { id: validatedId });
				throw new ConflictError("Post is not deleted", { id: validatedId });
			}
			this.debug.info("Post is marked as deleted, checking restore authorization", { id: validatedId });

			const isAdminOrModerator = requesterRole === "ADMIN" || requesterRole === "MODERATOR";
			const selfDeleted = existingPost.deletedBy === requesterId;

			this.debug.step("Checking restore authorization", { isAdminOrModerator, selfDeleted, deletedBy: existingPost.deletedBy });
			if (!isAdminOrModerator && !selfDeleted) {
				this.debug.warn("Post was deleted by admin/mod, author cannot restore it", { id: validatedId });
				throw new ForbiddenError("Cannot restore post deleted by an administrator or moderator", { id: validatedId });
			}
			this.debug.info("Restore authorization passed", { id: validatedId });

			this.debug.step("Restoring post in the repository", { id: validatedId });
			await this.repository.restorePost(validatedId);
			this.debug.info("Post restored successfully", { id: validatedId });

			this.debug.step("Marking post as restored in the domain model", { id: validatedId });
			existingPost.restore();
			this.debug.info("Post marked as restored in the domain model", { existingPost });

			this.debug.finish("Post restoration completed successfully", { id: validatedId });
			return existingPost;

		} catch (err) {
			this.debug.error("Error occurred during post restoration", { error: err, id });
			if (err instanceof ZodError) {
				throw ParseZodError(err);
			}
			if (err instanceof AppError) {
				throw err;
			}
			throw new AppError("Unexpected error during post restoration", "POST_RESTORE_ERROR", 500, { error: err });
		}
	}

	/**
	 * ## Hard Delete Post
	 * This method permanently deletes a post from the database based on its unique identifier (ID).
	 * It validates the provided ID using the postId schema, and if the validation fails, it throws a ValidationError with details about the specific validation issues.
	 * If the validation succeeds, it checks if the post exists by calling the getById method. If the post does not exist, it throws a NotFoundError.
	 * If the post exists but is not marked as deleted, it throws a ConflictError indicating that the post cannot be hard deleted because it is not marked as deleted.
	 * If the post exists and is marked as deleted, it calls the repository's hardDeletePost method to permanently delete the post from the database.
	 * If an unexpected error occurs during validation or hard deletion, it throws an AppError with details about the error.
	 * @param id - The unique identifier of the post to hard delete, which should conform to the PostId type.
	 * @returns A promise that resolves when the post has been permanently deleted.
	 * @throws {ValidationError} If the provided ID does not meet the validation criteria defined in the postId schema.
	 * @throws {NotFoundError} If the post to be hard deleted does not exist.
	 * @throws {ConflictError} If the post is not marked as deleted and therefore cannot be hard deleted.
	 * @throws {AppError} If an unexpected error occurs during validation or post hard deletion.
	 */
	async hardDelete(id: PostId): Promise<void> {
		try {
			this.debug.start("Hard deleting post", { id });

			this.debug.step("Validating post ID", { id });
			const validatedId = postId.parse(id);
			this.debug.info("Post ID validated successfully", { validatedId });

			this.debug.step("Checking if post exists", { id: validatedId });
			const existingPost = await this.getById(validatedId);
			this.debug.info("Existing post check completed", { existingPost: !!existingPost });

			this.debug.step("Checking if post is not deleted", { id: validatedId, deletedAt: existingPost.deletedAt });
			if (!existingPost.deletedAt) {
				this.debug.warn("Post is not marked as deleted, cannot hard delete", { id: validatedId });
				throw new ConflictError("Post is not deleted", { id: validatedId });
			}
			this.debug.info("Post is marked as deleted, proceeding with hard deletion", { id: validatedId });

			this.debug.step("Hard deleting post in the repository", { id: validatedId });
			await this.repository.hardDeletePost(validatedId);
			this.debug.info("Post hard deleted successfully", { id: validatedId });

			this.debug.finish("Post hard deletion completed successfully", { id: validatedId });
		} catch (err) {
			this.debug.error("Error occurred during post hard deletion", { error: err, id });
			if (err instanceof ZodError) {
				throw ParseZodError(err);
			}
			if (err instanceof AppError) {
				throw err;
			}
			throw new AppError("Unexpected error during post hard deletion", "POST_HARD_DELETE_ERROR", 500, { error: err });

		}
	}
}

export const postService = new PostService(postRepository);
