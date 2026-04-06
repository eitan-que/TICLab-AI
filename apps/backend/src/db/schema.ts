import { pgTable, text, timestamp, boolean, index, pgEnum, uniqueIndex, primaryKey, uuid } from "drizzle-orm/pg-core";

export const roles = pgEnum("roles", [
  "USER", // This is the default role for regular users
  "MODERATOR", // This role can be assigned to users who need moderation capabilities, can be used for users who can manage content but don't have full admin privileges
  "ADMIN", // This role can be assigned to users who need full administrative capabilities, can be used for users who can manage everything in the system
])

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: roles("role").default("USER").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
},
  (table) => [
    index("user_name_idx").on(table.name),
    uniqueIndex("user_email_idx").on(table.email),
    index("user_role_idx").on(table.role)
  ]
);

export const account = pgTable("account", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
},
  (table) => [
    index("account_userId_idx").on(table.userId)
  ],
);

export const category = pgTable("category", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
},
  (table) => [
    index("category_name_idx").on(table.name),
    uniqueIndex("category_slug_idx").on(table.slug),
  ]
);

export const post = pgTable("post", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: boolean("published").default(false).notNull(),
  authorId: uuid("author_id")
    .references(() => user.id, { onDelete: "set null" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => category.id, { onDelete: "cascade"}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
},
  (table) => [
    index("post_title_idx").on(table.title),
    uniqueIndex("post_slug_idx").on(table.slug),
    index("post_authorId_idx").on(table.authorId),
    index("post_categoryId_idx").on(table.categoryId),
  ]
);

export const comment = pgTable("comment", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  authorId: uuid("author_id")
    .references(() => user.id, { onDelete: "set null" }),
  postId: uuid("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
},
  (table) => [
    index("comment_authorId_idx").on(table.authorId),
    index("comment_postId_idx").on(table.postId),
  ]
);

export const vote = pgTable("vote", {
  id: uuid("id").defaultRandom().primaryKey(),
  value: boolean("value").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  postId: uuid("post_id")
    .references(() => post.id, { onDelete: "cascade" }),
  commentId: uuid("comment_id")
    .references(() => comment.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
},
  (table) => [
    index("vote_userId_idx").on(table.userId),
    index("vote_postId_idx").on(table.postId),
    index("vote_commentId_idx").on(table.commentId),
  ]
);

export const tag = pgTable("tag", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
}, 
  (table) => [
    index("tag_name_idx").on(table.name),
  ]
);

export const postTags = pgTable("post_tags", {
  postId: uuid("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id")
    .notNull()
    .references(() => tag.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, 
  (table) => [
    primaryKey({
      columns: [table.postId, table.tagId],
    }),
  ]
);