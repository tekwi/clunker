import {
  submissions,
  pictures,
  offers,
  adminUsers,
  affiliates,
  affiliateSubmissions,
  type Submission,
  type Picture,
  type Offer,
  type Affiliate,
  type AffiliateSubmission,
  type InsertSubmission,
  type InsertPicture,
  type InsertOffer,
  type InsertAffiliate,
  type InsertAffiliateSubmission,
  type SubmissionWithRelations,
  type AdminLogin
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Submissions
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: string): Promise<SubmissionWithRelations | undefined>;

  // Pictures
  addPictures(pictures: InsertPicture[]): Promise<Picture[]>;

  // Offers
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOfferBySubmissionId(submissionId: string): Promise<Offer | undefined>;
  updateOffer(offerId: string, updates: Partial<InsertOffer>): Promise<Offer | undefined>;
  deleteOffer(offerId: string): Promise<void>;
  getOffersNeedingReminders(): Promise<
    {
      offer: Offer;
      submission: {
        id: string;
        vin: string | null;
        ownerName: string | null;
        email: string | null;
        phoneNumber: string | null;
        titleCondition: string | null;
        vehicleCondition: string | null;
        odometerReading: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
    }[]
  >;

  // Admin
  authenticateAdmin(credentials: AdminLogin): Promise<
    | {
        id: string;
        username: string;
        email: string;
      }
    | null
  >;
  getAllOffers(): Promise<
    (Offer & {
      vin: string | null;
      ownerName: string | null;
      email: string | null;
      phoneNumber: string | null;
      titleCondition: string | null;
      vehicleCondition: string | null;
      odometerReading: string | null;
      address: string | null;
    })[]
  >;

  // Affiliates
  createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate>;
  getAllAffiliates(): Promise<Affiliate[]>;
  getAffiliateByCode(code: string): Promise<Affiliate | undefined>;
  updateAffiliate(affiliateId: string, updates: Partial<InsertAffiliate>): Promise<Affiliate | undefined>;
  deleteAffiliate(affiliateId: string): Promise<void>;

  // Affiliate Submissions
  createAffiliateSubmission(affiliateSubmission: InsertAffiliateSubmission): Promise<AffiliateSubmission>;
  getAffiliateSubmissions(affiliateId: string): Promise<AffiliateSubmission[]>;
  updateCommissionStatus(submissionId: string, status: string, commissionAmount?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor(private db: any) {} // Assuming db is passed in or accessible

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    // Generate ID for the submission
    const submissionId = randomUUID();

    // Handle empty strings for decimal fields - convert to null
    const cleanedData = {
      ...insertSubmission,
      id: submissionId,
      latitude: insertSubmission.latitude === '' ? null : insertSubmission.latitude,
      longitude: insertSubmission.longitude === '' ? null : insertSubmission.longitude,
    };

    // Insert the submission with the generated ID
    await this.db
      .insert(submissions)
      .values(cleanedData);

    // Get the inserted submission
    const submission = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (!submission[0]) {
      throw new Error('Failed to retrieve created submission');
    }

    return submission[0];
  }

  async getSubmission(id: string): Promise<SubmissionWithRelations | undefined> {
    // Get the submission first
    const submission = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);

    if (!submission[0]) {
      return undefined;
    }

    // Get related pictures
    const submissionPictures = await this.db
      .select()
      .from(pictures)
      .where(eq(pictures.submissionId, id));

    // Get related offer
    const submissionOffer = await this.db
      .select()
      .from(offers)
      .where(eq(offers.submissionId, id))
      .limit(1);

    return {
      ...submission[0],
      pictures: submissionPictures,
      offer: submissionOffer[0] || undefined,
    };
  }

  async addPictures(insertPictures: InsertPicture[]): Promise<Picture[]> {
    if (insertPictures.length === 0) return [];

    // Insert pictures
    await this.db
      .insert(pictures)
      .values(insertPictures);

    // Get the inserted pictures by submission ID
    const submissionId = insertPictures[0].submissionId;
    const addedPictures = await this.db
      .select()
      .from(pictures)
      .where(eq(pictures.submissionId, submissionId));

    return addedPictures;
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const offerId = randomUUID();

    await this.db
      .insert(offers)
      .values({
        ...insertOffer,
        id: offerId,
      });

    const offer = await this.db
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .then(rows => rows[0]);

    return offer;
  }

  async authenticateAdmin(credentials: AdminLogin) {
    console.log("🔍 Authenticating admin:", { username: credentials.username });

    try {
      const admin = await this.db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, credentials.username))
        .then(rows => rows[0]);

      console.log("📊 Database query result:", {
        found: !!admin,
        adminId: admin?.id,
        storedPassword: admin?.password ? `${admin.password.substring(0, 3)}...` : 'none',
        providedPassword: credentials.password ? `${credentials.password.substring(0, 3)}...` : 'none'
      });

      if (!admin || admin.isActive !== 'true') {
        console.log("❌ Admin user not found or inactive for username:", credentials.username);
        return null;
      }

      // Simple password comparison (in production, use bcrypt)
      const passwordMatch = admin.password === credentials.password;
      console.log("🔑 Password comparison:", {
        match: passwordMatch,
        storedLength: admin.password?.length,
        providedLength: credentials.password?.length
      });

      if (passwordMatch) {
        console.log("✅ Authentication successful for:", admin.username);
        return {
          id: admin.id,
          username: admin.username,
          email: admin.email
        };
      }

      console.log("❌ Password mismatch for user:", admin.username);
      return null;
    } catch (error) {
      console.error("💥 Database error in authenticateAdmin:", error);
      throw error;
    }
  }

  async getAllOffers() {
    const result = await this.db
      .select({
        id: offers.id,
        submissionId: offers.submissionId,
        vin: submissions.vin,
        ownerName: submissions.ownerName,
        email: submissions.email,
        phoneNumber: submissions.phoneNumber,
        offerPrice: offers.offerPrice,
        notes: offers.notes,
        status: offers.status,
        acceptedAt: offers.acceptedAt,
        createdAt: offers.createdAt,
        titleCondition: submissions.titleCondition,
        vehicleCondition: submissions.vehicleCondition,
        odometerReading: submissions.odometerReading,
        address: submissions.address,
      })
      .from(offers)
      .innerJoin(submissions, eq(offers.submissionId, submissions.id))
      .orderBy(desc(offers.createdAt));

    return result;
  }

  async getAllSubmissions() {
    const result = await this.db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.createdAt));

    // Get related data for each submission
    const submissionsWithRelations = await Promise.all(
      result.map(async (submission) => {
        // Get pictures
        const submissionPictures = await this.db
          .select()
          .from(pictures)
          .where(eq(pictures.submissionId, submission.id));

        // Get offer if exists
        const submissionOffer = await this.db
          .select()
          .from(offers)
          .where(eq(offers.submissionId, submission.id))
          .limit(1);

        return {
          ...submission,
          pictures: submissionPictures,
          offer: submissionOffer[0] || null,
        };
      })
    );

    return submissionsWithRelations;
  }

  async updateOffer(offerId: string, updates: Partial<typeof offers.$inferInsert>) {
    await this.db
      .update(offers)
      .set(updates)
      .where(eq(offers.id, offerId));
    
    // MySQL doesn't support .returning(), so we need to fetch the updated record
    const [updatedOffer] = await this.db
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);
    
    return updatedOffer;
  }

  async getOffersNeedingReminders() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return await this.db
      .select({
        offer: offers,
        submission: submissions
      })
      .from(offers)
      .innerJoin(submissions, eq(offers.submissionId, submissions.id))
      .where(
        and(
          eq(offers.status, 'pending'),
          sql`${offers.reminderSentAt} IS NULL`,
          sql`${offers.createdAt} <= ${threeDaysAgo}`
        )
      );
  }

  async getSubmissionByOfferId(offerId: string) {
    try {
      const offer = await this.db
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .limit(1);

      if (!offer.length) return null;

      const submission = await this.getSubmission(offer[0].submissionId);
      return submission;
    } catch (error) {
      console.error("Error getting submission by offer ID:", error);
      throw error;
    }
  }

  async deleteOffer(offerId: string) {
    await this.db
      .delete(offers)
      .where(eq(offers.id, offerId));
  }

  async getOfferBySubmissionId(submissionId: string): Promise<Offer | undefined> {
    const [offer] = await this.db
      .select()
      .from(offers)
      .where(eq(offers.submissionId, submissionId));
    return offer || undefined;
  }

  // Affiliate methods
  async createAffiliate(insertAffiliate: InsertAffiliate): Promise<Affiliate> {
    const affiliateId = randomUUID();
    const uniqueCode = Math.random().toString(36).substring(2, 12).toUpperCase();

    await this.db
      .insert(affiliates)
      .values({
        ...insertAffiliate,
        id: affiliateId,
        uniqueCode,
      });

    const affiliate = await this.db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate[0]) {
      throw new Error('Failed to retrieve created affiliate');
    }

    return affiliate[0];
  }

  async getAllAffiliates(): Promise<Affiliate[]> {
    return await this.db
      .select()
      .from(affiliates)
      .orderBy(desc(affiliates.createdAt));
  }

  async getAffiliateByCode(code: string): Promise<Affiliate | undefined> {
    const [affiliate] = await this.db
      .select()
      .from(affiliates)
      .where(eq(affiliates.uniqueCode, code))
      .limit(1);
    return affiliate || undefined;
  }

  async updateAffiliate(affiliateId: string, updates: any): Promise<Affiliate | undefined> {
    await this.db
      .update(affiliates)
      .set(updates)
      .where(eq(affiliates.id, affiliateId));

    const updatedAffiliate = await this.db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1)
      .then(rows => rows[0]);

    return updatedAffiliate;
  }

  async deleteAffiliate(affiliateId: string): Promise<void> {
    await this.db
      .delete(affiliates)
      .where(eq(affiliates.id, affiliateId));
  }

  async createAffiliateSubmission(insertAffiliateSubmission: InsertAffiliateSubmission): Promise<AffiliateSubmission> {
    const affiliateSubmissionId = randomUUID();

    await this.db
      .insert(affiliateSubmissions)
      .values({
        ...insertAffiliateSubmission,
        id: affiliateSubmissionId,
      });

    const affiliateSubmission = await this.db
      .select()
      .from(affiliateSubmissions)
      .where(eq(affiliateSubmissions.id, affiliateSubmissionId))
      .then(rows => rows[0]);

    return affiliateSubmission;
  }

  async getAffiliateSubmissions(affiliateId: string): Promise<AffiliateSubmission[]> {
    return await this.db
      .select()
      .from(affiliateSubmissions)
      .where(eq(affiliateSubmissions.affiliateId, affiliateId))
      .orderBy(desc(affiliateSubmissions.createdAt));
  }

  async updateCommissionStatus(submissionId: string, status: string, commissionAmount?: string): Promise<void> {
    const updates: any = { status };
    if (commissionAmount) {
      updates.commissionAmount = commissionAmount;
    }

    await this.db
      .update(affiliateSubmissions)
      .set(updates)
      .where(eq(affiliateSubmissions.submissionId, submissionId));
  }
}

export const storage = new DatabaseStorage(db); // Pass db instance here