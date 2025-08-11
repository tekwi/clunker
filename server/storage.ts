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
    const [submission] = await db
      .insert(submissions)
      .values(insertSubmission)
      .returning();
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
    
    const addedPictures = await db
      .insert(pictures)
      .values(insertPictures)
      .returning();
    return addedPictures;
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const [offer] = await db
      .insert(offers)
      .values(insertOffer)
      .returning();
    return offer;
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
