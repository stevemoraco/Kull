import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import type { CullingProfile, CreatePromptData, PromptSearchFilters } from "@shared/types/marketplace";
import { isAuthenticated, hasPaidAccessMiddleware } from "../replitAuth";

const router = Router();

// Zod schemas for validation
const createPromptSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  profile: z.enum(['standard', 'wedding', 'corporate', 'sports', 'portrait', 'product', 'real-estate']),
  systemPrompt: z.string().min(1, "System prompt is required"),
  firstMessage: z.string().optional(),
  sampleOutput: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(true),
});

const updatePromptSchema = createPromptSchema.partial();

const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

// GET /api/prompts - List all prompts with filters (require paid access)
router.get("/", isAuthenticated, hasPaidAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const { profile, tags, featured, authorId, query, sortBy } = req.query;

    const filters: any = {};

    if (profile) {
      filters.profile = profile as CullingProfile;
    }

    if (tags) {
      filters.tags = Array.isArray(tags) ? tags : [tags];
    }

    if (featured !== undefined) {
      filters.featured = featured === 'true';
    }

    if (authorId) {
      filters.authorId = authorId as string;
    }

    let prompts = await storage.getPrompts(filters);

    // Filter by query string (search name/description)
    if (query && typeof query === 'string') {
      const searchLower = query.toLowerCase();
      prompts = prompts.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (sortBy === 'recent') {
      prompts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'popular') {
      prompts.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    } else if (sortBy === 'usage') {
      prompts.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    }
    // Default is already quality score (from storage)

    // Get author names for each prompt
    const promptsWithAuthors = await Promise.all(
      prompts.map(async (prompt) => {
        const author = await storage.getUser(prompt.authorId);
        return {
          ...prompt,
          authorName: author ? `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email : 'Unknown',
        };
      })
    );

    // Get user votes if authenticated
    const userId = (req as any).user?.claims?.sub;
    if (userId) {
      const promptsWithVotes = await Promise.all(
        promptsWithAuthors.map(async (prompt) => {
          const vote = await storage.getUserPromptVote(userId, prompt.id);
          return {
            ...prompt,
            userVote: vote ? vote.value : 0,
          };
        })
      );
      return res.json(promptsWithVotes);
    }

    res.json(promptsWithAuthors);
  } catch (error: any) {
    console.error("Error fetching prompts:", error);
    res.status(500).json({ message: "Failed to fetch prompts: " + error.message });
  }
});

// GET /api/prompts/:id - Get single prompt details (require paid access)
router.get("/:id", isAuthenticated, hasPaidAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prompt = await storage.getPrompt(id);

    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    // Get author name
    const author = await storage.getUser(prompt.authorId);
    const promptWithAuthor = {
      ...prompt,
      authorName: author ? `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email : 'Unknown',
    };

    // Get user vote if authenticated
    const userId = (req as any).user?.claims?.sub;
    if (userId) {
      const vote = await storage.getUserPromptVote(userId, prompt.id);
      return res.json({
        ...promptWithAuthor,
        userVote: vote ? vote.value : 0,
      });
    }

    res.json(promptWithAuthor);
  } catch (error: any) {
    console.error("Error fetching prompt:", error);
    res.status(500).json({ message: "Failed to fetch prompt: " + error.message });
  }
});

// POST /api/prompts - Create new prompt (require paid access)
router.post("/", isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const validatedData = createPromptSchema.parse(req.body);

    const prompt = await storage.createPrompt({
      ...validatedData,
      authorId: userId,
      qualityScore: "0",
      voteCount: 0,
      usageCount: 0,
      isFeatured: false,
    });

    res.status(201).json(prompt);
  } catch (error: any) {
    console.error("Error creating prompt:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create prompt: " + error.message });
  }
});

// PATCH /api/prompts/:id - Update prompt (author only, require paid access)
router.patch("/:id", isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    const existingPrompt = await storage.getPrompt(id);
    if (!existingPrompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    if (existingPrompt.authorId !== userId) {
      return res.status(403).json({ message: "Only the author can update this prompt" });
    }

    const validatedData = updatePromptSchema.parse(req.body);
    const updated = await storage.updatePrompt(id, validatedData);

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating prompt:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update prompt: " + error.message });
  }
});

// DELETE /api/prompts/:id - Delete prompt (author only, require paid access)
router.delete("/:id", isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    const existingPrompt = await storage.getPrompt(id);
    if (!existingPrompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    if (existingPrompt.authorId !== userId) {
      return res.status(403).json({ message: "Only the author can delete this prompt" });
    }

    await storage.deletePrompt(id);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting prompt:", error);
    res.status(500).json({ message: "Failed to delete prompt: " + error.message });
  }
});

// POST /api/prompts/:id/use - Increment usage count (require paid access)
router.post("/:id/use", isAuthenticated, hasPaidAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const prompt = await storage.getPrompt(id);
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    await storage.incrementPromptUsage(id);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error incrementing usage:", error);
    res.status(500).json({ message: "Failed to increment usage: " + error.message });
  }
});

// POST /api/prompts/:id/vote - Vote on prompt (require paid access)
router.post("/:id/vote", isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    const prompt = await storage.getPrompt(id);
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    const { value } = voteSchema.parse(req.body);

    await storage.votePrompt({
      userId,
      promptId: id,
      value: value,
    });

    // Get updated prompt with new scores
    const updated = await storage.getPrompt(id);

    res.json(updated);
  } catch (error: any) {
    console.error("Error voting on prompt:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to vote on prompt: " + error.message });
  }
});

// GET /api/prompts/:id/votes - Get vote stats (require paid access)
router.get("/:id/votes", isAuthenticated, hasPaidAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const votes = await storage.getPromptVotes(id);

    const upvotes = votes.filter(v => v.value === 1).length;
    const downvotes = votes.filter(v => v.value === -1).length;
    const total = votes.length;

    res.json({
      upvotes,
      downvotes,
      total,
      score: upvotes - downvotes,
    });
  } catch (error: any) {
    console.error("Error fetching vote stats:", error);
    res.status(500).json({ message: "Failed to fetch vote stats: " + error.message });
  }
});

export default router;
