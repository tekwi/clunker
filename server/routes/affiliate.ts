
import { Router } from "express";
import { db } from "../db";
import { affiliates, affiliateSubmissions, submissions } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Get affiliate dashboard data
router.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const affiliate = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.uniqueCode, code))
      .limit(1);

    if (!affiliate[0]) {
      return res.status(404).json({ error: "Affiliate not found" });
    }

    const affiliateSubmissionRecords = await db
      .select()
      .from(affiliateSubmissions)
      .where(eq(affiliateSubmissions.affiliateId, affiliate[0].id))
      .orderBy(desc(affiliateSubmissions.createdAt));

    res.json({
      affiliate: affiliate[0],
      submissions: affiliateSubmissionRecords,
    });
  } catch (error) {
    console.error("Error fetching affiliate data:", error);
    res.status(500).json({ error: "Failed to fetch affiliate data" });
  }
});

export default router;
