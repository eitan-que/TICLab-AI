import { AppError, ParseZodError } from "@/lib/errors";
import { commentContent, CommentContent } from "@/validators/comment.validator";
import { ZodError } from "zod";

type CommentJSONFields = {
    id?: boolean;
    content?: boolean;
    authorId?: boolean;
    postId?: boolean;
    deletedBy?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
};

export class Comment {
    constructor(
        private _id: string,
        private _content: string,
        private _authorId: string | null,
        private _postId: string,
        private _deletedBy: string | null,
        private _createdAt: Date,
        private _updatedAt: Date,
        private _deletedAt: Date | null,
    ) {
        try {
            commentContent.parse(this._content);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during comment content validation", "COMMENT_CONTENT_VALIDATION_ERROR", 500, { error: err });
        }
    }

    // Getters

    get id(): string {
        return this._id;
    }

    get content(): string {
        return this._content;
    }

    get authorId(): string | null {
        return this._authorId;
    }

    get postId(): string {
        return this._postId;
    }

    /**
     * The ID of the user who soft-deleted this comment.
     * null if not deleted or deleted before this field was introduced.
     */
    get deletedBy(): string | null {
        return this._deletedBy;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    get deletedAt(): Date | null {
        return this._deletedAt;
    }

    // Setters

    set content(content: CommentContent) {
        try {
            const validated = commentContent.parse(content);
            this._content = validated;
            this.updateTimestamps();
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during comment content update", "COMMENT_CONTENT_UPDATE_ERROR", 500, { error: err });
        }
    }

    private set updatedAt(date: Date) {
        this._updatedAt = date;
    }

    private set deletedAt(date: Date | null) {
        this._deletedAt = date;
    }

    private set deletedBy(userId: string | null) {
        this._deletedBy = userId;
    }

    // Methods

    private updateTimestamps() {
        this.updatedAt = new Date();
    }

    /**
     * Soft-deletes the comment and records who deleted it.
     * @param deletedById - The ID of the user performing the deletion.
     */
    public delete(deletedById: string) {
        this.deletedAt = new Date();
        this.deletedBy = deletedById;
        this.updateTimestamps();
    }

    public restore() {
        this.deletedAt = null;
        this.deletedBy = null;
        this.updateTimestamps();
    }

    public toJSON(fields?: CommentJSONFields) {
        const payload = {
            id: this.id,
            content: this.content,
            authorId: this.authorId,
            postId: this.postId,
            deletedBy: this.deletedBy,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            deletedAt: this.deletedAt ? this.deletedAt.toISOString() : null,
        };

        if (!fields) {
            return payload;
        }

        const selected: Partial<typeof payload> = {};
        for (const key of Object.keys(payload) as Array<keyof typeof payload>) {
            if (fields[key]) {
                (selected as Record<string, unknown>)[key] = payload[key];
            }
        }

        return selected;
    }
}
