CREATE TABLE "master_action" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "master_action_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "account" RENAME TO "auth_account";--> statement-breakpoint
ALTER TABLE "session" RENAME TO "auth_session";--> statement-breakpoint
ALTER TABLE "user" RENAME TO "auth_user";--> statement-breakpoint
ALTER TABLE "verification" RENAME TO "auth_verification";--> statement-breakpoint
ALTER TABLE "auth_user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "auth_session" DROP CONSTRAINT "session_token_unique";--> statement-breakpoint
ALTER TABLE "master_status" DROP CONSTRAINT "master_status_id_unique";--> statement-breakpoint
ALTER TABLE "auth_account" DROP CONSTRAINT "account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "auth_session" DROP CONSTRAINT "session_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
ALTER TABLE "master_status" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "auth_user" ADD CONSTRAINT "auth_user_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_token_unique" UNIQUE("token");