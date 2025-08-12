import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, insertOfferSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  // Submit new car submission
  app.post("/api/submit", async (req, res) => {
    try {
      const validatedData = insertSubmissionSchema.parse(req.body);

      // Create submission
      const submission = await storage.createSubmission(validatedData);

      // TODO: Send email notification with unique link
      // In production, integrate with email service API
      console.log(`Submission created: ${submission.id}`);
      console.log(`Send email to: ${submission.email}`);
      console.log(`Unique link: ${req.protocol}://${req.get('host')}/view/${submission.id}`);

      res.json({
        submissionId: submission.id,
        message: "Submission created successfully"
      });
    } catch (error) {
      console.error("Error creating submission:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  // Get submission by ID
  app.get("/api/view/:submissionId", async (req, res) => {
    try {
      const { submissionId } = req.params;
      const submission = await storage.getSubmission(submissionId);

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // Create offer for submission
  app.post("/api/offer/:submissionId", async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { offerPrice, notes } = req.body;

      const validatedOffer = insertOfferSchema.parse({
        submissionId,
        offerPrice: parseFloat(offerPrice),
        notes
      });

      // Check if submission exists
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Create offer
      const offer = await storage.createOffer(validatedOffer);

      // TODO: Send offer notification email
      console.log(`Offer created for submission: ${submissionId}`);
      console.log(`Send offer notification to: ${submission.email}`);

      res.json({
        offer,
        message: "Offer created successfully"
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create offer" });
    }
  });

  // Get upload URL for object
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve private objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Update submission with uploaded photos
  app.post("/api/submissions/:submissionId/photos", async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { photoUrls } = req.body;

      if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
        return res.status(400).json({ error: "photoUrls array is required" });
      }

      // Verify submission exists
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Normalize URLs and create picture records
      const pictureData = photoUrls.map(url => ({
        submissionId,
        url: objectStorageService.normalizeObjectEntityPath(url)
      }));

      const pictures = await storage.addPictures(pictureData);

      res.json({
        pictures,
        message: "Photos added successfully"
      });
    } catch (error) {
      console.error("Error adding photos:", error);
      res.status(500).json({ error: "Failed to add photos" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}