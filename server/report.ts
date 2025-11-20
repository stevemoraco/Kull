import { z } from "zod";

export const RatingItemSchema = z.object({
  imageId: z.string().optional(),
  filename: z.string().optional(),
  starRating: z.number().int().min(0).max(5).optional(),
  colorLabel: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const GenerateReportSchema = z.object({
  shootName: z.string().default("Untitled Shoot"),
  ratings: z.array(RatingItemSchema),
  previewBaseUrl: z.string().trim().url().optional(),
  heroLimit: z.number().int().positive().max(50).optional(),
});

export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;

export function summarize(ratings: GenerateReportInput["ratings"]) {
  const total = ratings.length;
  const dist = [0, 0, 0, 0, 0, 0];
  let sum = 0;
  const tagCounts = new Map<string, number>();

  for (const r of ratings) {
    const s = r.starRating ?? 0;
    if (s >= 0 && s <= 5) {
      dist[s] += 1;
      sum += s;
    }
    if (Array.isArray(r.tags)) {
      for (const tag of r.tags) {
        const trimmed = tag.trim();
        if (!trimmed) continue;
        tagCounts.set(trimmed, (tagCounts.get(trimmed) ?? 0) + 1);
      }
    }
  }

  const heroes = ratings
    .filter((r) => (r.starRating ?? 0) === 5)
    .slice(0, 5)
    .map((h) => h.filename || h.imageId || "");

  const tagCloud = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return {
    totalImages: total,
    heroCount: dist[5],
    keeperCount: dist[4],
    distribution: dist,
    heroFilenames: heroes,
    averageRating: total ? Number((sum / total).toFixed(2)) : 0,
    tagCloud,
  };
}

export async function generateNarrative(input: GenerateReportInput, apiKey?: string): Promise<string> {
  const stats = summarize(input.ratings);
  const base = `Processed ${stats.totalImages} images. Found ${stats.heroCount} heroes (5★) and ${stats.keeperCount} strong keepers (4★).`;
  if (!apiKey) return base;
  try {
    const body = {
      model: "gpt-5-nano",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${base}\nWrite a concise summary (<=120 words) highlighting stand-out moments.`,
            },
          ],
        },
      ],
      text: {
        format: { type: "text" },
        verbosity: "low" // Low verbosity
      },
      reasoning: {
        effort: "minimal", // Minimal reasoning for speed
        summary: "auto"
      },
    } as any;
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return base;
    const json = await resp.json();
    const text = json?.output_text || json?.content || base;
    return String(text);
  } catch {
    return base;
  }
}
