import {
  submissions,
  pictures,
  offers,
  type Submission,
  type Picture,
  type Offer,
  type InsertSubmission,
  type InsertPicture,
  type InsertOffer,
  type SubmissionWithRelations
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
}

export class DatabaseStorage implements IStorage {
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    // Generate ID for the submission
    const submissionId = randomUUID();
    
    // Insert the submission with the generated ID
    await db
      .insert(submissions)
      .values({
        ...insertSubmission,
        id: submissionId,
      });

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
    // Insert the offer
    await db
      .insert(offers)
      .values(insertOffer);

    // Get the inserted offer by submission ID
    const offer = await db
      .select()
      .from(offers)
      .where(eq(offers.submissionId, insertOffer.submissionId));

    if (!offer[0]) {
      throw new Error('Failed to retrieve created offer');
    }

    return offer[0];
  }

  async getOfferBySubmissionId(submissionId: string): Promise<Offer | undefined> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.submissionId, submissionId));
    return offer || undefined;
  }
}

export const storage = new DatabaseStorage();