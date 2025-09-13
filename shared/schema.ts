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
  affiliateCode: varchar("affiliate_code", { length: 20 }),
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
  status: varchar("status", { length: 20 }).default("pending"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const affiliates = mysqlTable("affiliates", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  uniqueCode: varchar("unique_code", { length: 20 }).notNull().unique(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).default("0.05"), // 5% default
  isActive: varchar("is_active", { length: 5 }).default("true"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const affiliateSubmissions = mysqlTable("affiliate_submissions", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  affiliateId: char("affiliate_id", { length: 36 }).references(() => affiliates.id).notNull(),
  submissionId: char("submission_id", { length: 36 }).references(() => submissions.id).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, earned, paid
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const adminUsers = mysqlTable("admin_users", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 150 }),
  isActive: varchar("is_active", { length: 5 }).default("true"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
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

export const affiliatesRelations = relations(affiliates, ({ many }) => ({
  affiliateSubmissions: many(affiliateSubmissions),
}));

export const affiliateSubmissionsRelations = relations(affiliateSubmissions, ({ one }) => ({
  affiliate: one(affiliates, { fields: [affiliateSubmissions.affiliateId], references: [affiliates.id] }),
  submission: one(submissions, { fields: [affiliateSubmissions.submissionId], references: [submissions.id] }),
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

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  uniqueCode: true,
  totalEarnings: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAffiliateSubmissionSchema = createInsertSchema(affiliateSubmissions).omit({
  id: true,
  createdAt: true,
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertPicture = z.infer<typeof insertPictureSchema>;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type InsertAffiliateSubmission = z.infer<typeof insertAffiliateSubmissionSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;

export type Submission = typeof submissions.$inferSelect;
export type Picture = typeof pictures.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Affiliate = typeof affiliates.$inferSelect;
export type AffiliateSubmission = typeof affiliateSubmissions.$inferSelect;

export type SubmissionWithRelations = Submission & {
  pictures: Picture[];
  offer?: Offer;
};