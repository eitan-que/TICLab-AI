import { AppError, ParseZodError } from "@/lib/errors";
import { tagName, TagName } from "@/validators/tag.validator";
import { ZodError } from "zod";

type TagJSONFields = {
    id?: boolean;
    name?: boolean;
    createdBy?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
};

export class Tag {
    constructor(
        private _id: string,
        private _name: string,
        private _createdBy: string | null,
        private _createdAt: Date,
        private _updatedAt: Date,
        private _deletedAt: Date | null,
    ) {
        try {
            tagName.parse(this._name);
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during tag name validation", "TAG_NAME_VALIDATION_ERROR", 500, { error: err });
        }
    }

    // Getters

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get createdBy(): string | null {
        return this._createdBy;
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

    set name(name: TagName) {
        try {
            const validated = tagName.parse(name);
            this._name = validated;
            this.updateTimestamps();
        } catch (err) {
            if (err instanceof ZodError) {
                throw ParseZodError(err);
            }
            throw new AppError("Unexpected error during tag name update", "TAG_NAME_UPDATE_ERROR", 500, { error: err });
        }
    }

    private set updatedAt(date: Date) {
        this._updatedAt = date;
    }

    private set deletedAt(date: Date | null) {
        this._deletedAt = date;
    }

    // Methods

    private updateTimestamps() {
        this.updatedAt = new Date();
    }

    public delete() {
        this.deletedAt = new Date();
        this.updateTimestamps();
    }

    public restore() {
        this.deletedAt = null;
        this.updateTimestamps();
    }

    public toJSON(fields?: TagJSONFields) {
        const payload = {
            id: this.id,
            name: this.name,
            createdBy: this.createdBy,
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
