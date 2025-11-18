import { describe, expect, it } from "vitest";
import {
  PromptPresetSchema,
  BatchJobSchema,
  StructuredOutputSchema,
  MetadataUpdateSchema,
  CreditLedgerEntrySchema,
} from "../culling/schemas";

const basePrompt = {
  id: crypto.randomUUID(),
  slug: "standard",
  title: "Standard",
  summary: "General purpose keepers",
  instructions: "Rate the best images higher.",
  shootTypes: ["general"],
  tags: ["general"],
  authorProfile: {
    id: crypto.randomUUID(),
    email: "artist@kullai.com",
    displayName: "Artist",
    bio: "I shoot everything.",
  },
  style: {
    starMeaning: {
      0: "Reject",
      1: "Blurry/outtake",
      2: "Duplicate or backup frame",
      3: "Usable for proofing",
      4: "Keeper",
      5: "Hero",
    },
    includeTitle: true,
    includeDescription: true,
    includeTags: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sharedWithMarketplace: true,
};

describe("Shared schemas", () => {
  it("validates a prompt preset", () => {
    const parsed = PromptPresetSchema.parse(basePrompt);
    expect(parsed.slug).toBe("standard");
  });

  it("validates a batch job", () => {
    const job = BatchJobSchema.parse({
      id: crypto.randomUUID(),
      shootId: crypto.randomUUID(),
      providerId: "openai-gpt-5",
      promptPresetId: basePrompt.id,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalImages: 100,
      processedImages: 0,
    });
    expect(job.status).toBe("pending");
  });

  it("validates structured output", () => {
    const output = StructuredOutputSchema.parse({
      jobId: crypto.randomUUID(),
      batchId: crypto.randomUUID(),
      ratings: [
        {
          imageId: crypto.randomUUID(),
          starRating: 5,
          colorLabel: "blue",
          title: "Best shot",
          description: "Sharp action moment",
          tags: ["hero", "marketing"],
        },
      ],
    });
    expect(output.ratings[0].starRating).toBe(5);
  });

  it("validates metadata update payloads", () => {
    const update = MetadataUpdateSchema.parse({
      imageId: crypto.randomUUID(),
      starRating: 4,
      colorLabel: "green",
      tags: ["portfolio"],
    });
    expect(update.tags).toEqual(["portfolio"]);
  });

  it("validates credit ledger entries", () => {
    const entry = CreditLedgerEntrySchema.parse({
      userId: crypto.randomUUID(),
      entryType: "credit",
      credits: 120,
      metadata: { providerId: "openai-gpt-5", imagesProcessed: 2000 },
      createdAt: new Date().toISOString(),
    });
    expect(entry.entryType).toBe("credit");
  });
});
