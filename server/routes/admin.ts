
import { Router } from "express";
import { db } from "../db";
import { submissions, offers, pictures, affiliates } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { notificationService } from "../notifications";

const router = Router();

// Admin authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.replace('Bearer ', '');
  
  if (!sessionId || sessionId !== process.env.ADMIN_SESSION_ID) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  next();
};

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const sessionId = process.env.ADMIN_SESSION_ID || 'admin-session-123';
      res.json({ sessionId });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Admin logout
router.post("/logout", requireAuth, async (req, res) => {
  res.json({ success: true });
});

// Get all submissions for admin dashboard
router.get("/submissions", requireAuth, async (req, res) => {
  try {
    const allSubmissions = await db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.createdAt));

    const submissionsWithDetails = await Promise.all(
      allSubmissions.map(async (submission) => {
        const submissionPictures = await db
          .select()
          .from(pictures)
          .where(eq(pictures.submissionId, submission.id));

        const submissionOffer = await db
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

    res.json(submissionsWithDetails);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Get all offers for admin dashboard
router.get("/offers", requireAuth, async (req, res) => {
  try {
    const allOffers = await db
      .select({
        id: offers.id,
        submissionId: offers.submissionId,
        offerPrice: offers.offerPrice,
        notes: offers.notes,
        status: offers.status,
        acceptedAt: offers.acceptedAt,
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
      .innerJoin(submissions, eq(offers.submissionId, submissions.id))
      .orderBy(desc(offers.createdAt));

    res.json(allOffers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

// Create offer for a submission
router.post("/offers", requireAuth, async (req, res) => {
  try {
    const { submissionId, offerPrice, notes } = req.body;

    if (!submissionId || !offerPrice) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [offer] = await db
      .insert(offers)
      .values({
        submissionId,
        offerPrice: parseFloat(offerPrice),
        notes: notes || null,
        status: "pending",
      })
      .returning();

    res.json(offer);
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ error: "Failed to create offer" });
  }
});

// Update offer
router.put("/offers/:offerId", requireAuth, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { offerPrice, notes, status } = req.body;

    const updateData: any = {};
    if (offerPrice !== undefined) updateData.offerPrice = parseFloat(offerPrice);
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "accepted") {
        updateData.acceptedAt = new Date();
      }
    }

    const [updatedOffer] = await db
      .update(offers)
      .set(updateData)
      .where(eq(offers.id, offerId))
      .returning();

    if (!updatedOffer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // If status changed to accepted or rejected, send notification
    if (status === "accepted" || status === "rejected") {
      try {
        const submission = await db
          .select()
          .from(submissions)
          .where(eq(submissions.id, updatedOffer.submissionId))
          .limit(1);

        if (submission[0]) {
          await notificationService.sendOfferNotification(submission[0], updatedOffer);
        }
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
      }
    }

    res.json(updatedOffer);
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ error: "Failed to update offer" });
  }
});

// Delete offer
router.delete("/offers/:offerId", requireAuth, async (req, res) => {
  try {
    const { offerId } = req.params;

    await db
      .delete(offers)
      .where(eq(offers.id, offerId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ error: "Failed to delete offer" });
  }
});

// Get all affiliates
router.get("/affiliates", requireAuth, async (req, res) => {
  try {
    const allAffiliates = await db
      .select()
      .from(affiliates)
      .orderBy(desc(affiliates.createdAt));

    res.json(allAffiliates);
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    res.status(500).json({ error: "Failed to fetch affiliates" });
  }
});

// Create affiliate
router.post("/affiliates", requireAuth, async (req, res) => {
  try {
    const { name, email, phone, commissionRate } = req.body;

    if (!name || !email || !commissionRate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate unique code
    const uniqueCode = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.random().toString(36).substr(2, 5);

    const [affiliate] = await db
      .insert(affiliates)
      .values({
        name,
        email,
        phone: phone || null,
        uniqueCode,
        commissionRate: parseFloat(commissionRate),
        isActive: true,
      })
      .returning();

    res.json(affiliate);
  } catch (error) {
    console.error("Error creating affiliate:", error);
    res.status(500).json({ error: "Failed to create affiliate" });
  }
});

// Update affiliate
router.put("/affiliates/:affiliateId", requireAuth, async (req, res) => {
  try {
    const { affiliateId } = req.params;
    const { name, email, phone, commissionRate, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (commissionRate !== undefined) updateData.commissionRate = parseFloat(commissionRate);
    if (isActive !== undefined) updateData.isActive = isActive === "true";

    const [updatedAffiliate] = await db
      .update(affiliates)
      .set(updateData)
      .where(eq(affiliates.id, affiliateId))
      .returning();

    if (!updatedAffiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }

    res.json(updatedAffiliate);
  } catch (error) {
    console.error("Error updating affiliate:", error);
    res.status(500).json({ error: "Failed to update affiliate" });
  }
});

export default router;
