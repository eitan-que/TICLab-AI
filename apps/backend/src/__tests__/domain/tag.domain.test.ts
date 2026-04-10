import { describe, expect, it } from "bun:test";
import { Tag } from "@/domain/tag.domain";

const now = new Date();

function makeTag(overrides: Partial<{
    id: string; name: string; createdBy: string | null;
    createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}> = {}) {
    const defaults = {
        id: "tag-1",
        name: "typescript",
        createdBy: "user-1" as string | null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null as Date | null,
    };
    const merged = { ...defaults, ...overrides };
    return new Tag(
        merged.id, merged.name, merged.createdBy,
        merged.createdAt, merged.updatedAt, merged.deletedAt,
    );
}

describe("Tag Domain", () => {
    describe("construction", () => {
        it("creates a valid tag", () => {
            const tag = makeTag();
            expect(tag.id).toBe("tag-1");
            expect(tag.name).toBe("typescript");
            expect(tag.createdBy).toBe("user-1");
            expect(tag.deletedAt).toBeNull();
        });

        it("rejects empty name", () => {
            expect(() => makeTag({ name: "" })).toThrow();
        });

        it("rejects name exceeding 100 characters", () => {
            expect(() => makeTag({ name: "a".repeat(101) })).toThrow();
        });

        it("rejects name with special characters", () => {
            expect(() => makeTag({ name: "type-script" })).toThrow();
        });

        it("rejects name with spaces", () => {
            expect(() => makeTag({ name: "type script" })).toThrow();
        });

        it("allows alphanumeric names", () => {
            const tag = makeTag({ name: "react18" });
            expect(tag.name).toBe("react18");
        });

        it("allows null createdBy", () => {
            const tag = makeTag({ createdBy: null });
            expect(tag.createdBy).toBeNull();
        });
    });

    describe("name setter", () => {
        it("updates name", () => {
            const tag = makeTag();
            tag.name = "javascript";
            expect(tag.name).toBe("javascript");
        });

        it("updates updatedAt timestamp", () => {
            const tag = makeTag({ updatedAt: new Date("2020-01-01") });
            const before = tag.updatedAt;
            tag.name = "golang";
            expect(tag.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });

        it("rejects invalid name via setter", () => {
            const tag = makeTag();
            expect(() => { tag.name = ""; }).toThrow();
        });

        it("rejects name with special characters via setter", () => {
            const tag = makeTag();
            expect(() => { tag.name = "c++"; }).toThrow();
        });
    });

    describe("delete / restore", () => {
        it("soft-deletes a tag", () => {
            const tag = makeTag();
            tag.delete();
            expect(tag.deletedAt).not.toBeNull();
        });

        it("restores a soft-deleted tag", () => {
            const tag = makeTag();
            tag.delete();
            tag.restore();
            expect(tag.deletedAt).toBeNull();
        });

        it("updates updatedAt on delete", () => {
            const tag = makeTag({ updatedAt: new Date("2020-01-01") });
            const before = tag.updatedAt;
            tag.delete();
            expect(tag.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });
    });

    describe("toJSON", () => {
        it("returns all fields when no filter is provided", () => {
            const json = makeTag().toJSON();
            expect(json).toHaveProperty("id", "tag-1");
            expect(json).toHaveProperty("name", "typescript");
            expect(json).toHaveProperty("createdBy", "user-1");
            expect(json).toHaveProperty("deletedAt", null);
        });

        it("returns only selected fields", () => {
            const json = makeTag().toJSON({ id: true, name: true });
            expect(json).toEqual({ id: "tag-1", name: "typescript" });
        });
    });
});
