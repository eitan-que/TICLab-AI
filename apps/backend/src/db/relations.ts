import * as schema from "@/db/schema";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(schema, (r) => ({
	user: {
		accounts: r.many.account({
            from: r.user.id,
            to: r.account.userId,
        }),
	},
	account: {
		user: r.one.user({
			from: r.account.userId,
			to: r.user.id,
		}),
	},
	category: {
		
	},
	post: {

	},
	comment: {

	},
	vote: {

	},
	tag: {

	}
}));
