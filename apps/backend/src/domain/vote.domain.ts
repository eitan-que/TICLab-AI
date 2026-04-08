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

    get id(): string {
        return this._id;
    }

    get value(): boolean {
        return this._value;
    }

    get userId(): string {
        return this._userId;
    }

    get postId(): string | null {
        return this._postId;
    }

    get commentId(): string | null {
        return this._commentId;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

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
