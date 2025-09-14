
import { Router } from "express";
import { db } from "../db";
import { submissions, offers, pictures } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Get all submissions for admin dashboard
router.get("/submissions", async (req, res) => {
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

// Create offer for a submission
router.post("/offers", async (req, res) => {
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

export default router;
