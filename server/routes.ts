import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, insertOfferSchema, adminLoginSchema, insertAffiliateSchema } from "@shared/schema";
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

  // Get all submissions (admin only)
  app.get("/api/admin/submissions", requireAuth, async (req, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Update offer (admin only)
  app.put("/api/admin/offers/:offerId", requireAuth, async (req, res) => {
    try {
      const { offerId } = req.params;
      const { offerPrice, notes, status } = req.body;

      const updates: any = {};
      if (offerPrice !== undefined) updates.offerPrice = offerPrice;
      if (notes !== undefined) updates.notes = notes;
      if (status !== undefined) {
        updates.status = status;
        if (status === "accepted") {
          updates.acceptedAt = new Date();
        }
      }

      const offer = await storage.updateOffer(offerId, updates);

      // Send notification if status changed
      if (status === "accepted" || status === "rejected") {
        try {
          const submission = await storage.getSubmissionByOfferId(offerId);
          if (submission) {
            await notificationService.sendOfferStatusUpdate(submission, offer, status);
          }
        } catch (error) {
          console.error('Failed to send status update notification:', error);
        }
      }

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

  // Get all affiliates (admin only)
  app.get("/api/admin/affiliates", requireAuth, async (req, res) => {
    try {
      const affiliates = await storage.getAllAffiliates();
      res.json(affiliates);
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      res.status(500).json({ error: "Failed to fetch affiliates" });
    }
  });

  // Create affiliate (admin only)
  app.post("/api/admin/affiliates", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAffiliateSchema.parse(req.body);
      const affiliate = await storage.createAffiliate(validatedData);
      res.json({ affiliate, message: "Affiliate created successfully" });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create affiliate" });
    }
  });

  // Update affiliate (admin only)
  app.put("/api/admin/affiliates/:affiliateId", requireAuth, async (req, res) => {
    try {
      const { affiliateId } = req.params;
      const { name, email, phone, commissionRate, isActive } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (commissionRate !== undefined) updates.commissionRate = commissionRate;
      if (isActive !== undefined) updates.isActive = isActive;

      const affiliate = await storage.updateAffiliate(affiliateId, updates);
      res.json({ affiliate, message: "Affiliate updated successfully" });
    } catch (error) {
      console.error("Error updating affiliate:", error);
      res.status(500).json({ error: "Failed to update affiliate" });
    }
  });

  // Delete affiliate (admin only)
  app.delete("/api/admin/affiliates/:affiliateId", requireAuth, async (req, res) => {
    try {
      const { affiliateId } = req.params;
      await storage.deleteAffiliate(affiliateId);
      res.json({ message: "Affiliate deleted successfully" });
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      res.status(500).json({ error: "Failed to delete affiliate" });
    }
  });

  // Get affiliate submissions (admin only)
  app.get("/api/admin/affiliates/:affiliateId/submissions", requireAuth, async (req, res) => {
    try {
      const { affiliateId } = req.params;
      const submissions = await storage.getAffiliateSubmissions(affiliateId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching affiliate submissions:", error);
      res.status(500).json({ error: "Failed to fetch affiliate submissions" });
    }
  });

  // Submit new car submission
  app.post("/api/submissions", async (req, res) => {
    try {
      const validatedData = insertSubmissionSchema.parse(req.body);

      // Create submission
      const submission = await storage.createSubmission(validatedData);

      // If submission has affiliate code, create affiliate submission tracking
      if (submission.affiliateCode) {
        try {
          const affiliate = await storage.getAffiliateByCode(submission.affiliateCode);
          if (affiliate) {
            await storage.createAffiliateSubmission({
              affiliateId: affiliate.id,
              submissionId: submission.id,
              status: "pending"
            });
          }
        } catch (error) {
          console.error('Failed to create affiliate submission tracking:', error);
          // Continue processing even if affiliate tracking fails
        }
      }

      // Send email notifications via Zapier webhook
      try {
        await notificationService.sendSubmissionConfirmation(submission);
      } catch (error) {
        console.error('Failed to send submission confirmation email:', error);
        // Continue processing even if email fails
      }

      // Send admin notification email
      try {
        await notificationService.sendAdminSubmissionNotification(submission);
      } catch (error) {
        console.error('Failed to send admin notification email:', error);
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

  // Affiliate landing page redirect
  app.get("/ref/:affiliateCode", async (req, res) => {
    try {
      const { affiliateCode } = req.params;
      
      // Verify affiliate exists and is active
      const affiliate = await storage.getAffiliateByCode(affiliateCode.toUpperCase());
      
      if (!affiliate || affiliate.isActive !== "true") {
        return res.redirect("/");
      }

      // Redirect to home page with affiliate code in URL
      res.redirect(`/?ref=${affiliateCode.toUpperCase()}`);
    } catch (error) {
      console.error("Error processing affiliate link:", error);
      res.redirect("/");
    }
  });

  // Accept offer
  app.post("/api/offers/:offerId/accept", async (req, res) => {
    try {
      const { offerId } = req.params;
      
      const updatedOffer = await storage.updateOffer(offerId, {
        status: "accepted",
        acceptedAt: new Date()
      });

      if (!updatedOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Handle affiliate commission calculation
      try {
        const submission = await storage.getSubmissionByOfferId(offerId);
        if (submission && submission.affiliateCode) {
          const affiliate = await storage.getAffiliateByCode(submission.affiliateCode);
          if (affiliate) {
            const commissionAmount = (parseFloat(updatedOffer.offerPrice) * parseFloat(affiliate.commissionRate)).toFixed(2);
            await storage.updateCommissionStatus(submission.id, "earned", commissionAmount);
          }
        }
      } catch (error) {
        console.error('Failed to calculate affiliate commission:', error);
      }

      // Send notification
      try {
        const submission = await storage.getSubmissionByOfferId(offerId);
        if (submission) {
          await notificationService.sendOfferStatusUpdate(submission, updatedOffer, "accepted");
        }
      } catch (error) {
        console.error('Failed to send acceptance notification:', error);
      }

      res.json({ 
        message: "Offer accepted successfully",
        offer: updatedOffer 
      });
    } catch (error) {
      console.error("Error accepting offer:", error);
      res.status(500).json({ error: "Failed to accept offer" });
    }
  });

  // Reject offer
  app.post("/api/offers/:offerId/reject", async (req, res) => {
    try {
      const { offerId } = req.params;
      
      const updatedOffer = await storage.updateOffer(offerId, {
        status: "rejected"
      });

      if (!updatedOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Send notification
      try {
        const submission = await storage.getSubmissionByOfferId(offerId);
        if (submission) {
          await notificationService.sendOfferStatusUpdate(submission, updatedOffer, "rejected");
        }
      } catch (error) {
        console.error('Failed to send rejection notification:', error);
      }

      res.json({ 
        message: "Offer rejected successfully",
        offer: updatedOffer 
      });
    } catch (error) {
      console.error("Error rejecting offer:", error);
      res.status(500).json({ error: "Failed to reject offer" });
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