import { db } from "@/db/drizzle";
import { post } from "@/db/schema";
import { Post } from "@/domain/post.domain";
import { Debuggable } from "@/lib/debug";
import { AppError, ParseZodError } from "@/lib/errors";
import { CreatePost, createPostSchema, DeletePost, deletePostSchema, GetAllPosts, getAllPostsSchema, postId, PostId, postSlug, PostSlug, UpdatePost, updatePostSchema } from "@/validators/post.validator";
import { eq, sql } from "drizzle-orm";
import { ZodError } from "zod";

export interface PostRepositoryTemplate {
    createPost(data: CreatePost): Promise<Post>;
    getPostById(id: PostId): Promise<Post | null>;
    getPostBySlug(slug: PostSlug): Promise<Post | null>;
    getAllPosts(query: GetAllPosts): Promise<Post[]>;
    updatePost(data: UpdatePost): Promise<Post>;
    deletePost(data: DeletePost): Promise<void>;
    restorePost(id: PostId): Promise<void>;
    hardDeletePost(id: PostId): Promise<void>;
}

/**
 * # PostRepository
 * The PostRepository class is responsible for managing all database operations related to the Post entity.
 * It provides methods for creating, retrieving, updating, and deleting posts, as well as additional operations like restoring and hard deleting posts.
 * Each method includes comprehensive validation of input data using Zod schemas, and detailed error handling with custom error classes.
 * The repository also integrates with the Debug class to provide detailed logging of each step in the process, which can be invaluable for troubleshooting and monitoring the application's behavior.
 * @see Post for the domain model that this repository manages.
 */
export class PostRepository extends Debuggable implements PostRepositoryTemplate {

    /**
     * ## Create Post
     * Creates a new post in the database using the provided data.
     * Validates the input data against the CreatePost schema before attempting to insert it into the database.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param data - The data for the new post, which must conform to the CreatePost schema.
     * @returns A promise that resolves to the newly created Post object.
     * @example
     * ```ts
     * const newPost = await postRepository.createPost({
     *   slug: "new-post",
     *   title: "New Post",
     *   content: "This is the content of the new post.",
     *   authorId: "user-id-123",
     *   categoryId: "category-id-123",
     * });
     * ```
     * @throws {BadRequestError} If the input data fails validation against the CreatePost schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async createPost(data: CreatePost): Promise<Post> {
        try {
            this.debug.start("Creating new post");

            this.debug.step("Validating input data", { ...data });
            const validatedData = createPostSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Inserting new post into database");
            const result = await db.insert(post).values({
                slug: validatedData.slug,
                title: validatedData.title,
                content: validatedData.content,
                published: validatedData.published,
                authorId: validatedData.authorId,
                categoryId: validatedData.categoryId,
            }).returning();
            this.debug.info("New post inserted successfully", { result });

            this.debug.step("Checking if post was created successfully");
            if (result.length === 0) {
                throw new AppError("Failed to create post", "POST_CREATION_FAILED", 500);
            }
            this.debug.info("Post creation confirmed", { createdPostId: result[0].id });

            const createdPost = result[0];
            this.debug.step("Mapping database record to Post domain object");
            const newPost = new Post(
                createdPost.id,
                createdPost.slug,
                createdPost.title,
                createdPost.content,
                createdPost.published,
                createdPost.authorId,
                createdPost.categoryId,
                createdPost.deletedBy,
                createdPost.createdAt,
                createdPost.updatedAt,
                createdPost.deletedAt
            );
            this.debug.info("Post domain object created successfully", { ...newPost });

            this.debug.finish("Post creation process completed");
            return newPost;

        } catch (err) {
            this.debug.error("Error occurred while creating post", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post creation", "POST_CREATION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Post By ID
     * Retrieves a post from the database by its unique identifier.
     * If the post is found, it is returned as a Post object.
     * If no post is found with the given ID, null is returned.
     * If an unexpected error occurs during the database operation, an AppError is thrown with details about the error.
     * @param id - The unique identifier of the post to retrieve.
     * @returns A promise that resolves to the Post object if found, or null if no post exists with the given ID.
     * @example
     * ```ts
     * const post = await postRepository.getPostById("post-id-123");
     * if (post) {
     *   console.log("Post found:", post);
     * } else {
     *   console.log("Post not found");
     * }
     * ```
     * @throws {BadRequestError} If the provided ID fails validation against the PostId schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async getPostById(id: PostId): Promise<Post | null> {
        try {
            this.debug.start("Getting post by ID");

            this.debug.step("Validating post ID", { id });
            const validatedId = postId.parse(id);
            this.debug.info("Post ID validated successfully", { validatedId });

            this.debug.step("Preparing database query to retrieve post by ID");
            const prepared = db.query.post.findFirst({
                where: {
                    id: {
                        eq: sql.placeholder("id"),
                    }
                }
            }).prepare("getPostById");
            this.debug.info("Database query prepared successfully", { queryName: "getPostById" });

            this.debug.step("Executing database query to retrieve post by ID", { validatedId });
            const postData = await prepared.execute({ id: validatedId });
            this.debug.info("Database query executed successfully", { ...postData });

            this.debug.step("Checking if post was found");
            if (!postData) {
                this.debug.finish("Post not found");
                return null;
            }
            this.debug.info("Post found", { postId: postData.id });

            this.debug.step("Mapping database record to Post domain object");
            const postInstance = new Post(
                postData.id,
                postData.slug,
                postData.title,
                postData.content,
                postData.published,
                postData.authorId,
                postData.categoryId,
                postData.deletedBy,
                postData.createdAt,
                postData.updatedAt,
                postData.deletedAt
            );
            this.debug.info("Post domain object created successfully", { ...postInstance });

            this.debug.finish("Getting post by ID completed");
            return postInstance;

        } catch (err) {
            this.debug.error("Error occurred while retrieving post", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post retrieval", "POST_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get Post By Slug
     * Retrieves a post from the database by its unique slug.
     * If the post is found, it is returned as a Post object.
     * If no post is found with the given slug, null is returned.
     * If an unexpected error occurs during the database operation, an AppError is thrown with details about the error.
     * @param slug - The unique slug of the post to retrieve.
     * @returns A promise that resolves to the Post object if found, or null if no post exists with the given slug.
     * @example
     * ```ts
     * const post = await postRepository.getPostBySlug("example-post");
     * if (post) {
     *   console.log("Post found:", post);
     * } else {
     *   console.log("Post not found");
     * }
     * ```
     * @throws {BadRequestError} If the provided slug fails validation against the PostSlug schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async getPostBySlug(slug: PostSlug): Promise<Post | null> {
        try {
            this.debug.start("Getting post by slug");

            this.debug.step("Validating post slug", { slug });
            const validatedSlug = postSlug.parse(slug);
            this.debug.info("Post slug validated successfully", { validatedSlug });

            this.debug.step("Preparing database query to retrieve post by slug");
            const prepared = db.query.post.findFirst({
                where: {
                    slug: {
                        eq: sql.placeholder("slug"),
                    }
                }
            }).prepare("getPostBySlug");
            this.debug.info("Database query prepared successfully", { queryName: "getPostBySlug" });

            this.debug.step("Executing database query to retrieve post by slug", { validatedSlug });
            const postData = await prepared.execute({ slug: validatedSlug });
            this.debug.info("Database query executed successfully", { ...postData });

            this.debug.step("Checking if post was found");
            if (!postData) {
                this.debug.finish("Post not found");
                return null;
            }
            this.debug.info("Post found", { postId: postData.id });

            this.debug.step("Mapping database record to Post domain object");
            const postInstance = new Post(
                postData.id,
                postData.slug,
                postData.title,
                postData.content,
                postData.published,
                postData.authorId,
                postData.categoryId,
                postData.deletedBy,
                postData.createdAt,
                postData.updatedAt,
                postData.deletedAt
            );
            this.debug.info("Post domain object created successfully", { ...postInstance });

            this.debug.finish("Getting post by slug completed");
            return postInstance;

        } catch (err) {
            this.debug.error("Error occurred while retrieving post", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post retrieval", "POST_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Get All Posts
     * Retrieves a list of posts from the database based on the provided query parameters.
     * Supports filtering by title and slug, as well as pagination through page and limit parameters.
     * Validates the input query parameters against the GetAllPosts schema before attempting to retrieve data from the database.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If an unexpected error occurs during the database operation, an AppError is thrown with details about the error.
     * @param query - The query parameters for retrieving posts, which must conform to the GetAllPosts schema.
     * @returns A promise that resolves to an array of Post objects that match the query criteria.
     * @example
     * ```ts
     * const posts = await postRepository.getAllPosts({
     *   title: "example",
     *   page: 1,
     *   limit: 10,
     *   categoryId: "category-id-123",
     *   authorId: "user-id-123",
     * });
     * console.log("Retrieved posts:", posts);
     * ```
     * @throws {BadRequestError} If the input query parameters fail validation against the GetAllPosts schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async getAllPosts(query: GetAllPosts): Promise<Post[]> {
        try {
            this.debug.start("Getting all posts");

            this.debug.step("Validating query parameters", { ...query });
            const validatedQuery = getAllPostsSchema.parse(query);
            this.debug.info("Query parameters validated successfully", { ...validatedQuery });

            this.debug.step("Retrieving posts from database");
            const postsData = await db.query.post.findMany({
                where: {
                    title: validatedQuery.title ? {
                        like: `%${validatedQuery.title}%`,
                    } : undefined,
                },
                offset: (validatedQuery.page - 1) * validatedQuery.limit,
                limit: validatedQuery.limit,
            })
            this.debug.info("Posts retrieved successfully", { count: postsData.length });

            this.debug.step("Mapping database records to Post domain objects");
            const posts = postsData.map(postData => new Post(
                postData.id,
                postData.slug,
                postData.title,
                postData.content,
                postData.published,
                postData.authorId,
                postData.categoryId,
                postData.deletedBy,
                postData.createdAt,
                postData.updatedAt,
                postData.deletedAt
            ));
            this.debug.info("Post domain objects created successfully", { ...posts });

            this.debug.finish("Getting all posts");
            return posts;

        } catch (err) {
            this.debug.error("Error occurred while retrieving posts", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during posts retrieval", "POSTS_RETRIEVAL_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Update Post
     * Updates an existing post in the database with the provided data.
     * Validates the input data against the UpdatePost schema before attempting to update the database record.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param data - The data for updating the post, which must conform to the UpdatePost schema.
     * @returns A promise that resolves to the updated Post object.
     * @example
     * ```ts
     * const updatedPost = await postRepository.updatePost({
     *   id: "post-id-123",
     *   title: "Updated Post Title",
     *   content: "Updated post content.",
     *   published: true,
     * });
     * console.log("Updated post:", updatedPost);
     * ```
     * @throws {BadRequestError} If the input data fails validation against the UpdatePost schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async updatePost(data: UpdatePost): Promise<Post> {
        try {
            this.debug.start("Updating post");
            
            this.debug.step("Validating input data", { ...data });
            const validatedData = updatePostSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Updating post in database");
            const [postData] = await db.update(post)
                .set({
                    title: data.title,
                    slug: data.slug,
                    content: data.content,
                    published: data.published,
                })
                .where(eq(post.id, data.id))
                .returning();
            this.debug.info("Post updated successfully", { ...postData });

            this.debug.step("Mapping database record to Post domain object");
            const postInstance = new Post(
                postData.id,
                postData.slug,
                postData.title,
                postData.content,
                postData.published,
                postData.authorId,
                postData.categoryId,
                postData.deletedBy,
                postData.createdAt,
                postData.updatedAt,
                postData.deletedAt
            );
            this.debug.info("Post domain object created successfully", { ...postInstance });

            this.debug.finish("Post update process completed");
            return postInstance;

        } catch (err) {
            this.debug.error("Error occurred while updating post", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post update", "POST_UPDATE_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Delete Post
     * Marks a post as deleted in the database by setting the deletedAt timestamp.
     * Validates the input ID against the PostId schema before attempting to update the database record.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param id - The unique identifier of the post to delete, which must conform to the PostId schema.
     * @returns A promise that resolves when the post has been marked as deleted.
     * @example
     * ```ts
     * await postRepository.deletePost("post-id-123");
     * console.log("Post deleted");
     * ```
     * @throws {BadRequestError} If the provided ID fails validation against the PostId schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async deletePost(data: DeletePost): Promise<void> {
        try {
            this.debug.start("Deleting post");

            this.debug.step("Validating input data", { ...data });
            const validatedData = deletePostSchema.parse(data);
            this.debug.info("Input data validated successfully", { ...validatedData });

            this.debug.step("Updating post in database to set deletedAt timestamp and deletedBy");
            await db.update(post)
                .set({
                    deletedAt: new Date(),
                    deletedBy: validatedData.deletedBy,
                    updatedAt: new Date(),
                })
                .where(eq(post.id, validatedData.id));
            this.debug.info("Post marked as deleted successfully", { postId: validatedData.id });

            this.debug.finish("Post deletion process completed");
            return;

        } catch (err) {
            this.debug.error("Error occurred while deleting post", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post deletion", "POST_DELETION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Restore Post
     * Restores a previously deleted post in the database by setting the deletedAt timestamp to null.
     * Validates the input ID against the PostId schema before attempting to update the database record.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param id - The unique identifier of the post to restore, which must conform to the PostId schema.
     * @returns A promise that resolves when the post has been restored.
     * @example
     * ```ts
     * await postRepository.restorePost("post-id-123");
     * console.log("Post restored");
     * ```
     * @throws {BadRequestError} If the provided ID fails validation against the PostId schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     */
    async restorePost(id: PostId): Promise<void> {
        try {
            this.debug.start("Restoring post");

            this.debug.step("Validating post ID", { id });
            const validatedId = postId.parse(id);
            this.debug.info("Post ID validated successfully", { validatedId });

            this.debug.step("Updating post in database to clear deletedAt and deletedBy");
            await db.update(post)
                .set({
                    deletedAt: null,
                    deletedBy: null,
                    updatedAt: new Date(),
                })
                .where(eq(post.id, validatedId));
            this.debug.info("Post restored successfully", { postId: validatedId });

            this.debug.finish("Post restoration process completed");
            return;

        } catch (err) {
            this.debug.error("Error occurred while restoring post", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post restoration", "POST_RESTORATION_ERROR", 500, { error: err });
        }
    }

    /**
     * ## Hard Delete Post
     * Permanently deletes a post from the database.
     * Validates the input ID against the PostId schema before attempting to delete the database record.
     * If validation fails, a BadRequestError is thrown with details about the validation errors.
     * If the database operation fails for any reason, an AppError is thrown with details about the failure.
     * @param id - The unique identifier of the post to hard delete, which must conform to the PostId schema.
     * @returns A promise that resolves when the post has been permanently deleted.
     * @example
     * ```ts
     * await postRepository.hardDeletePost("post-id-123");
     * console.log("Post permanently deleted");
     * ```
     * @throws {BadRequestError} If the provided ID fails validation against the PostId schema, with details about the validation errors.
     * @throws {AppError} If an unexpected error occurs during the database operation, with details about the error.
     * @remarks This operation is irreversible and will permanently remove the post from the database, including all associated data. Use with caution.
     */
    async hardDeletePost(id: PostId): Promise<void> {
        try {
            this.debug.start("Hard deleting post");

            this.debug.step("Validating post ID", { id });
            const validatedId = postId.parse(id);
            this.debug.info("Post ID validated successfully", { validatedId });

            this.debug.step("Permanently deleting post from database");
            await db.delete(post)
                .where(eq(post.id, validatedId));
            this.debug.info("Post permanently deleted successfully", { postId: validatedId });

            this.debug.finish("Post hard deletion process completed");
            return;

        } catch (err) {
            this.debug.error("Error occurred while hard deleting post", { error: err });
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during post hard deletion", "POST_HARD_DELETION_ERROR", 500, { error: err });
        }
    }
}

export const postRepository = new PostRepository();