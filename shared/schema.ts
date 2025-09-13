import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import crypto from "crypto";

// Define all tables first
export const submissions = mysqlTable("submissions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  vin: varchar("vin", { length: 17 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  titleCondition: varchar("title_condition", { length: 50 }),
  vehicleCondition: varchar("vehicle_condition", { length: 50 }),
  odometerReading: varchar("odometer_reading", { length: 20 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  address: varchar("address", { length: 255 }),
  affiliateCode: varchar("affiliate_code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const pictures = mysqlTable("pictures", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  submissionId: varchar("submission_id", { length: 36 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const offers = mysqlTable("offers", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  submissionId: varchar("submission_id", { length: 36 }).notNull(),
  offerPrice: decimal("offer_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default(
    "pending",
  ),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const affiliates = mysqlTable("affiliates", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }),
  uniqueCode: varchar("unique_code", { length: 50 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 })
    .notNull()
    .default("0.0500"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default(
    "0.00",
  ),
  isActive: varchar("is_active", { length: 5 }).default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const affiliateSubmissions = mysqlTable("affiliate_submissions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  affiliateId: varchar("affiliate_id", { length: 36 }).notNull(),
  submissionId: varchar("submission_id", { length: 36 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminUsers = mysqlTable("admin_users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 150 }),
  isActive: varchar("is_active", { length: 5 }).default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Schema definitions
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
  acceptedAt: true,
});

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  uniqueCode: true,
  totalEarnings: true,
  createdAt: true,
  updatedAt: true,
});

export const adminLoginSchema = createInsertSchema(adminUsers).pick({
  username: true,
  password: true,
});

// Type exports
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Picture = typeof pictures.$inferSelect;
export type NewPicture = typeof pictures.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type Affiliate = typeof affiliates.$inferSelect;
export type NewAffiliate = typeof affiliates.$inferInsert;
export type AffiliateSubmission = typeof affiliateSubmissions.$inferSelect;
export type NewAffiliateSubmission = typeof affiliateSubmissions.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

// Additional type aliases for compatibility
export type InsertSubmission = typeof submissions.$inferInsert;
export type InsertPicture = typeof pictures.$inferInsert;
export type InsertOffer = typeof offers.$inferInsert;
export type InsertAffiliate = typeof affiliates.$inferInsert;
export type InsertAffiliateSubmission =
  typeof affiliateSubmissions.$inferInsert;
export type AdminLogin = typeof adminLoginSchema._type;

export type SubmissionWithPictures = Submission & {
  pictures: Picture[];
  offer?: Offer;
};

export type SubmissionWithRelations = Submission & {
  pictures: Picture[];
  offer?: Offer;
};
