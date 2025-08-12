import {
  submissions,
  pictures,
  offers,
  adminUsers,
  type Submission,
  type Picture,
  type Offer,
  type InsertSubmission,
  type InsertPicture,
  type InsertOffer,
  type SubmissionWithRelations,
  type AdminLogin
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
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
  updateOffer(offerId: string, updates: Partial<InsertOffer>): Promise<Offer | undefined>;
  deleteOffer(offerId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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
    await db
      .insert(submissions)
      .values(cleanedData);

    // Get the inserted submission
    const submission = await db
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
    const submission = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);

    if (!submission[0]) {
      return undefined;
    }

    // Get related pictures
    const submissionPictures = await db
      .select()
      .from(pictures)
      .where(eq(pictures.submissionId, id));

    // Get related offer
    const submissionOffer = await db
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
    await db
      .insert(pictures)
      .values(insertPictures);

    // Get the inserted pictures by submission ID
    const submissionId = insertPictures[0].submissionId;
    const addedPictures = await db
      .select()
      .from(pictures)
      .where(eq(pictures.submissionId, submissionId));

    return addedPictures;
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const offerId = randomUUID();

    await db
      .insert(offers)
      .values({
        ...insertOffer,
        id: offerId,
      });

    const offer = await db
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .then(rows => rows[0]);

    return offer;
  },

  async authenticateAdmin(credentials: AdminLogin) {
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, credentials.username))
      .then(rows => rows[0]);

    if (!admin || admin.isActive !== 'true') {
      return null;
    }

    // Simple password comparison (in production, use bcrypt)
    if (admin.password === credentials.password) {
      return {
        id: admin.id,
        username: admin.username,
        email: admin.email
      };
    }

    return null;
  },

  async getAllOffers() {
    const allOffers = await db
      .select({
        id: offers.id,
        submissionId: offers.submissionId,
        offerPrice: offers.offerPrice,
        notes: offers.notes,
        createdAt: offers.createdAt,
        vin: submissions.vin,
        ownerName: submissions.ownerName,
        email: submissions.email,
        phoneNumber: submissions.phoneNumber,
        titleCondition: submissions.titleCondition,
        vehicleCondition: submissions.vehicleCondition,
        odometerReading: submissions.odometerReading,
        address: submissions.address,
      })
      .from(offers)
      .leftJoin(submissions, eq(offers.submissionId, submissions.id))
      .orderBy(desc(offers.createdAt));

    return allOffers;
  },

  async updateOffer(offerId: string, updates: Partial<InsertOffer>) {
    await db
      .update(offers)
      .set(updates)
      .where(eq(offers.id, offerId));

    const offer = await db
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .then(rows => rows[0]);

    return offer;
  },

  async deleteOffer(offerId: string) {
    await db
      .delete(offers)
      .where(eq(offers.id, offerId));
  },

  async getOfferBySubmissionId(submissionId: string): Promise<Offer | undefined> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.submissionId, submissionId));
    return offer || undefined;
  }
}

export const storage = new DatabaseStorage();