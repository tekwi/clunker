import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, decimal, timestamp, char } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const submissions = mysqlTable("submissions", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  vin: varchar("vin", { length: 17 }).notNull(),
  ownerName: varchar("owner_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  titleCondition: varchar("title_condition", { length: 50 }).notNull(),
  vehicleCondition: varchar("vehicle_condition", { length: 50 }),
  odometerReading: varchar("odometer_reading", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  address: varchar("address", { length: 255 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const pictures = mysqlTable("pictures", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  submissionId: char("submission_id", { length: 36 }).references(() => submissions.id).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const offers = mysqlTable("offers", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  submissionId: char("submission_id", { length: 36 }).references(() => submissions.id).notNull(),
  offerPrice: decimal("offer_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const submissionsRelations = relations(submissions, ({ many, one }) => ({
  pictures: many(pictures),
  offer: one(offers),
}));

export const picturesRelations = relations(pictures, ({ one }) => ({
  submission: one(submissions, { fields: [pictures.submissionId], references: [submissions.id] }),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  submission: one(submissions, { fields: [offers.submissionId], references: [submissions.id] }),
}));

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPictureSchema = createInsertSchema(pictures).omit({
  id: true,
  createdAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertPicture = z.infer<typeof insertPictureSchema>;
export type InsertOffer = z.infer<typeof insertOfferSchema>;

export type Submission = typeof submissions.$inferSelect;
export type Picture = typeof pictures.$inferSelect;
export type Offer = typeof offers.$inferSelect;

export type SubmissionWithRelations = Submission & {
  pictures: Picture[];
  offer?: Offer;
};
