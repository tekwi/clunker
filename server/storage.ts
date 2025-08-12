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
    // Insert the submission
    const result = await db
      .insert(submissions)
      .values(insertSubmission);

    // Get the inserted submission by finding the most recent one with the same VIN
    // This is a workaround for MySQL not supporting RETURNING
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.vin, insertSubmission.vin),
      orderBy: (submissions, { desc }) => [desc(submissions.createdAt)]
    });

    if (!submission) {
      throw new Error('Failed to retrieve created submission');
    }

    return submission;
  }

  async getSubmission(id: string): Promise<SubmissionWithRelations | undefined> {
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      with: {
        pictures: true,
        offer: true,
      },
    });
    return submission;
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