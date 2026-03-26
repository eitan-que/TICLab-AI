import { Elysia } from "elysia";
import { auth, OpenAPI } from "@/lib/auth";
import { cors } from "@elysiajs/cors";
import { openapi } from '@elysiajs/openapi';
import { apiRoutes } from "@/controllers";
import { AppError, UnauthorizedError } from "@/lib/errors";

// user middleware (compute user and session and pass to routes)
const betterAuth = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ set, status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) {
          throw new UnauthorizedError("You must be authenticated to access this resource");
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

const app = new Elysia()
  .use(openapi({
    documentation: {
      components: await OpenAPI.components,
      paths: await OpenAPI.getPaths(),
    }
  }))
  .use(
    cors({
      origin: "http://localhost:3001", // Allow requests from the front-end development server
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(betterAuth)
  .use(apiRoutes)
  .onError(({ code, error, set }) => {
    // Custom application errors (AppError and subclasses)
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.message,
        code: error.code,
        details: error.details,
      };
    }
    // Default error handling
    console.error(error);
    set.status = 500;
    return { error: "Internal server error", code: "INTERNAL_ERROR" };
  })
  .listen(3000);

export type App = typeof app;

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(
  `OpenAPI docs available at http://${app.server?.hostname}:${app.server?.port}/openapi`,
);