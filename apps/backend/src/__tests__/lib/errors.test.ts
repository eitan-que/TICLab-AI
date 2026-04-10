import { describe, expect, it } from "bun:test";
import {
    AppError, NotFoundError, ValidationError, BadRequestError,
    UnauthorizedError, ForbiddenError, ConflictError, ParseZodError,
} from "@/lib/errors";
import z from "zod";

describe("Error Classes", () => {
    describe("AppError", () => {
        it("creates with message, code, and default statusCode", () => {
            const err = new AppError("test", "TEST_CODE");
            expect(err.message).toBe("test");
            expect(err.code).toBe("TEST_CODE");
            expect(err.statusCode).toBe(500);
            expect(err.name).toBe("AppError");
        });

        it("accepts custom statusCode", () => {
            const err = new AppError("test", "TEST", 418);
            expect(err.statusCode).toBe(418);
        });

        it("accepts details", () => {
            const err = new AppError("test", "TEST", 500, { foo: "bar" });
            expect(err.details).toEqual({ foo: "bar" });
        });

        it("extends Error", () => {
            expect(new AppError("test", "TEST")).toBeInstanceOf(Error);
        });
    });

    describe("NotFoundError", () => {
        it("creates with 404 status", () => {
            const err = new NotFoundError("Not found", { id: "123" });
            expect(err.statusCode).toBe(404);
            expect(err.code).toBe("NOT_FOUND");
            expect(err.name).toBe("NotFoundError");
            expect(err.details).toEqual({ id: "123" });
        });

        it("uses default message", () => {
            const err = new NotFoundError(undefined, {});
            expect(err.message).toBe("Resource not found");
        });

        it("extends AppError", () => {
            expect(new NotFoundError("test", {})).toBeInstanceOf(AppError);
        });
    });

    describe("ValidationError", () => {
        it("creates with 400 status", () => {
            const err = new ValidationError("Invalid", [{ path: "name", code: "required" }]);
            expect(err.statusCode).toBe(400);
            expect(err.code).toBe("VALIDATION_ERROR");
            expect(err.name).toBe("ValidationError");
        });
    });

    describe("BadRequestError", () => {
        it("creates with 400 status", () => {
            const err = new BadRequestError("Bad", {});
            expect(err.statusCode).toBe(400);
            expect(err.code).toBe("BAD_REQUEST");
            expect(err.name).toBe("BadRequestError");
        });
    });

    describe("UnauthorizedError", () => {
        it("creates with 401 status", () => {
            const err = new UnauthorizedError();
            expect(err.statusCode).toBe(401);
            expect(err.code).toBe("UNAUTHORIZED");
            expect(err.name).toBe("UnauthorizedError");
            expect(err.message).toBe("Unauthorized");
        });
    });

    describe("ForbiddenError", () => {
        it("creates with 403 status", () => {
            const err = new ForbiddenError("No access", { role: "USER" });
            expect(err.statusCode).toBe(403);
            expect(err.code).toBe("FORBIDDEN");
            expect(err.name).toBe("ForbiddenError");
        });
    });

    describe("ConflictError", () => {
        it("creates with 409 status", () => {
            const err = new ConflictError("Already exists", { slug: "test" });
            expect(err.statusCode).toBe(409);
            expect(err.code).toBe("CONFLICT");
            expect(err.name).toBe("ConflictError");
        });
    });

    describe("ParseZodError", () => {
        it("converts invalid_type issue", () => {
            const schema = z.object({ name: z.string() });
            try {
                schema.parse({ name: 123 });
            } catch (e) {
                if (e instanceof z.ZodError) {
                    const parsed = ParseZodError(e);
                    expect(parsed).toBeInstanceOf(ValidationError);
                    expect(parsed.statusCode).toBe(400);
                    expect(parsed?.details?.length).toBeGreaterThan(0);
                    if (parsed?.details?.length) {
                        expect(parsed?.details[0]).toHaveProperty("path");
                    }
                }
            }
        });

        it("converts unrecognized_keys issue", () => {
            const schema = z.object({ name: z.string() }).strict();
            try {
                schema.parse({ name: "test", extra: "field" });
            } catch (e) {
                if (e instanceof z.ZodError) {
                    const parsed = ParseZodError(e);
                    expect(parsed?.details?.length).toBeGreaterThan(0);
                    const unrecognized = parsed?.details?.find(d => 'extraKeys' in d);
                    expect(unrecognized).toBeDefined();
                }
            }
        });

        it("converts too_small issue", () => {
            const schema = z.string().min(5);
            try {
                schema.parse("hi");
            } catch (e) {
                if (e instanceof z.ZodError) {
                    const parsed = ParseZodError(e);
                    expect(parsed?.details?.length).toBeGreaterThan(0);
                }
            }
        });

        it("converts too_big issue", () => {
            const schema = z.string().max(3);
            try {
                schema.parse("hello");
            } catch (e) {
                if (e instanceof z.ZodError) {
                    const parsed = ParseZodError(e);
                    expect(parsed?.details?.length).toBeGreaterThan(0);
                }
            }
        });
    });
});
