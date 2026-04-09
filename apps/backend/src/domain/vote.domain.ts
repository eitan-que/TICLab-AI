import { AppError } from "@/lib/errors";

type VoteJSONFields = {
    id?: boolean;
    value?: boolean;
    userId?: boolean;
    postId?: boolean;
    commentId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};

/**
 * Vote represents a vote entity in the system.
 * It encapsulates all properties and behaviors related to a vote on a post or comment.
 * A vote must target exactly one of either a post or a comment — both cannot be null simultaneously.
 *
 * @example
 * ```ts
 * const vote = new Vote(
 *   "123",
 *   true,
 *   "user-456",
 *   "post-789",
 *   null,
 *   new Date(),
 *   new Date()
 * );
 * ```
 */
export class Vote {
    constructor(
        private _id: string,
        private _value: boolean,
        private _userId: string,
        private _postId: string | null,
        private _commentId: string | null,
        private _createdAt: Date,
        private _updatedAt: Date,
    ) {
        if (this._postId === null && this._commentId === null) {
            throw new AppError("Vote must target either a post or a comment", "VOTE_NO_TARGET", 400);
        }
    }

    // Getters

    /**
     * ## ID
     * ### Getter
     * The unique identifier for the vote.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get id(): string {
        return this._id;
    }

    /**
     * ## Value
     * ### Getter
     * The value of the vote. `true` represents an upvote, `false` represents a downvote.
     */
    get value(): boolean {
        return this._value;
    }

    /**
     * ## User ID
     * ### Getter
     * The ID of the user who cast this vote. This is a required field.
     */
    get userId(): string {
        return this._userId;
    }

    /**
     * ## Post ID
     * ### Getter
     * The ID of the post this vote targets. Null if the vote targets a comment instead.
     * At least one of postId or commentId must be non-null.
     */
    get postId(): string | null {
        return this._postId;
    }

    /**
     * ## Comment ID
     * ### Getter
     * The ID of the comment this vote targets. Null if the vote targets a post instead.
     * At least one of postId or commentId must be non-null.
     */
    get commentId(): string | null {
        return this._commentId;
    }

    /**
     * ## Created At
     * ### Getter
     * The timestamp when the vote was cast.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get createdAt(): Date {
        return this._createdAt;
    }

    /**
     * ## Updated At
     * ### Getter
     * The timestamp when the vote was last updated.
     * This is a read-only property that is set at construction time and cannot be changed afterwards.
     */
    get updatedAt(): Date {
        return this._updatedAt;
    }

    /**
     * ## toJSON
     * ### Public Method
     * This method converts the Vote instance into a plain JSON object.
     * It accepts an optional parameter `fields` which allows you to specify which properties to include in the output.
     * If `fields` is not provided, all properties will be included in the output.
     * This method is useful for controlling the serialization of the Vote instance, especially when sending data to clients or APIs.
     * @example
     * ```ts
     * const json = vote.toJSON({ id: true, value: true, userId: true });
     * // json would be { id: "123", value: true, userId: "user-456" }
     * ```
     */
    public toJSON(fields?: VoteJSONFields) {
        const payload = {
            id: this.id,
            value: this.value,
            userId: this.userId,
            postId: this.postId,
            commentId: this.commentId,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
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
