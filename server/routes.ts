import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, insertOfferSchema, adminLoginSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { s3Storage } from "./s3Storage";
import { notificationService } from "./notifications";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  // Simple session storage for demo purposes
  const sessions = new Map<string, { adminId: string; username: string; expiresAt: number }>();

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    const session = sessionId ? sessions.get(sessionId) : null;
    
    if (!session || session.expiresAt < Date.now()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    req.admin = { id: session.adminId, username: session.username };
    next();
  };

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      console.log("🔐 Admin login attempt:", { 
        username: req.body.username, 
        hasPassword: !!req.body.password,
        passwordLength: req.body.password?.length 
      });

      const validatedCredentials = adminLoginSchema.parse(req.body);
      console.log("✅ Credentials validated:", { username: validatedCredentials.username });

      const admin = await storage.authenticateAdmin(validatedCredentials);
      console.log("🔍 Authentication result:", { 
        found: !!admin, 
        adminId: admin?.id,
        adminUsername: admin?.username 
      });

      if (!admin) {
        console.log("❌ Authentication failed - invalid credentials");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Create session
      const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

      sessions.set(sessionId, {
        adminId: admin.id,
        username: admin.username,
        expiresAt
      });

      console.log("✅ Session created:", { sessionId, adminId: admin.id });

      res.json({
        sessionId,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email
        }
      });
    } catch (error) {
      console.error("❌ Error during login:", error);
      if (error instanceof z.ZodError) {
        console.log("🚨 Validation error:", error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", requireAuth, async (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: "Logged out successfully" });
  });

  // Get all offers (admin only)
  app.get("/api/admin/offers", requireAuth, async (req, res) => {
    try {
      const offers = await storage.getAllOffers();
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  // Update offer (admin only)
  app.put("/api/admin/offers/:offerId", requireAuth, async (req, res) => {
    try {
      const { offerId } = req.params;
      const { offerPrice, notes } = req.body;

      const updates: any = {};
      if (offerPrice !== undefined) updates.offerPrice = offerPrice;
      if (notes !== undefined) updates.notes = notes;

      const offer = await storage.updateOffer(offerId, updates);
      res.json({ offer, message: "Offer updated successfully" });
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ error: "Failed to update offer" });
    }
  });

  // Delete offer (admin only)
  app.delete("/api/admin/offers/:offerId", requireAuth, async (req, res) => {
    try {
      const { offerId } = req.params;
      await storage.deleteOffer(offerId);
      res.json({ message: "Offer deleted successfully" });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ error: "Failed to delete offer" });
    }
  });

  // Submit new car submission
  app.post("/api/submissions", async (req, res) => {
    try {
      const validatedData = insertSubmissionSchema.parse(req.body);

      // Create submission
      const submission = await storage.createSubmission(validatedData);

      // Send email notification via Zapier webhook
      try {
        await notificationService.sendSubmissionConfirmation(submission);
      } catch (error) {
        console.error('Failed to send submission confirmation email:', error);
        // Continue processing even if email fails
      }

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
        offerPrice: offerPrice, // Keep as string for decimal type
        notes
      });

      // Check if submission exists
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Create offer
      const offer = await storage.createOffer(validatedOffer);

      // Send offer notification email via Zapier webhook
      try {
        await notificationService.sendOfferNotification(submission, offer);
      } catch (error) {
        console.error('Failed to send offer notification email:', error);
        // Continue processing even if email fails
      }

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
      // Use S3 in production, Replit Object Storage in development
      if (process.env.NODE_ENV === 'production' && process.env.AWS_S3_BUCKET) {
        const { uploadUrl, photoUrl } = await s3Storage.getUploadUrl(req.body.contentType);
        res.json({ uploadURL: uploadUrl, photoUrl });
      } else {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ uploadURL });
      }
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