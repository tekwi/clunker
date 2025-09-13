
import { relations } from "drizzle-orm";
import { submissions, pictures, offers, affiliates, affiliateSubmissions } from "./schema";

// Relations - defined separately to avoid circular reference issues
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
