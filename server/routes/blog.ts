
import { Router } from "express";
import { db } from "../db";
import { blogPosts } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// Admin authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.replace('Bearer ', '');
  
  if (!sessionId) {
    console.log('❌ No session ID in blog request');
    return res.status(401).json({ error: "Authentication required" });
  }
  
  // Access sessions from app.locals (set in main routes.ts)
  const sessions = req.app?.locals?.sessions;
  if (!sessions) {
    console.log('❌ Sessions map not found in app.locals');
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    console.log('❌ Session not found:', sessionId);
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  
  // Check if session expired
  if (session.expiresAt < Date.now()) {
    console.log('❌ Session expired:', sessionId);
    sessions.delete(sessionId);
    return res.status(401).json({ error: "Session expired" });
  }
  
  console.log('✅ Blog session validated:', sessionId);
  req.adminId = session.adminId;
  next();
};

// Get all posts (admin)
router.get("/admin/posts", requireAuth, async (req, res) => {
  try {
    const posts = await db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));
    
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get single post by ID (admin)
router.get("/admin/posts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Create post (admin)
router.post("/admin/posts", requireAuth, async (req, res) => {
  try {
    const postData = { ...req.body };
    
    // Convert string dates to Date objects
    if (postData.publishedAt && typeof postData.publishedAt === 'string') {
      postData.publishedAt = new Date(postData.publishedAt);
    } else if (postData.status === 'published' && !postData.publishedAt) {
      postData.publishedAt = new Date();
    }
    
    const result = await db
      .insert(blogPosts)
      .values(postData);
    
    // Fetch the created post using the slug (unique field)
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, postData.slug))
      .limit(1);
    
    res.json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Update post (admin)
router.put("/admin/posts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Convert string dates to Date objects
    if (updateData.publishedAt && typeof updateData.publishedAt === 'string') {
      updateData.publishedAt = new Date(updateData.publishedAt);
    }
    
    // If publishing for the first time, set publishedAt
    if (updateData.status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }
    
    await db
      .update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.id, id));
    
    // Fetch the updated post
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Delete post (admin)
router.delete("/admin/posts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Public routes for fetching published posts

// Get post by slug (blog posts)
router.get("/blog/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.slug, slug),
        eq(blogPosts.postType, "blog"),
        eq(blogPosts.status, "published")
      ))
      .limit(1);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.json(post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Get post by vehicle make/model
router.get("/sell-my-car/:make/:model", async (req, res) => {
  try {
    const { make, model } = req.params;
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.vehicleMake, make),
        eq(blogPosts.vehicleModel, model),
        eq(blogPosts.postType, "sell-my-car"),
        eq(blogPosts.status, "published")
      ))
      .limit(1);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.json(post);
  } catch (error) {
    console.error("Error fetching vehicle post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Get post by state/city
router.get("/junk-car-removal/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.stateName, state),
        eq(blogPosts.cityName, city),
        eq(blogPosts.postType, "junk-car-removal"),
        eq(blogPosts.status, "published")
      ))
      .limit(1);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.json(post);
  } catch (error) {
    console.error("Error fetching location post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

export default router;
