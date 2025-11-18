import { z } from "zod";

export const ProviderIdSchema = z.enum([
  "apple-intelligence",
  "openai-gpt-5",
  "openai-gpt-5-codex",
  "openai-gpt-image",
  "gemini-2-5-pro",
  "gemini-2-5-flash",
  "gemini-nano-banana",
  "grok-4-fast",
  "groq-vision",
  "claude-haiku-4-5",
  "claude-sonnet-4-5",
  "claude-opus-4-1",
]);

export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const ColorLabelSchema = z.enum([
  "none",
  "red",
  "yellow",
  "green",
  "blue",
  "purple",
  "white",
  "black",
]);

export type ColorLabel = z.infer<typeof ColorLabelSchema>;

export const StarRatingSchema = z.number().int().min(0).max(5);

export type StarRating = z.infer<typeof StarRatingSchema>;

export const PhotographerProfileSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email(),
  displayName: z.string().min(1),
  bio: z.string().min(1),
  avatarUrl: z.string().url().optional(),
});

export type PhotographerProfile = z.infer<typeof PhotographerProfileSchema>;

export const ImageIptcMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
  clientName: z.string().optional(),
  eventName: z.string().optional(),
  location: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export type ImageIptcMetadata = z.infer<typeof ImageIptcMetadataSchema>;

export const ImageMetadataSchema = z.object({
  id: z.string().uuid().optional(),
  filename: z.string(),
  relativePath: z.string(),
  fileHash: z.string(),
  byteSize: z.number().int().nonnegative(),
  captureDate: z.string().datetime(),
  cameraMake: z.string().optional(),
  cameraModel: z.string().optional(),
  lensModel: z.string().optional(),
  exposure: z
    .object({
      shutterSpeed: z.string().optional(),
      aperture: z.string().optional(),
      iso: z.number().int().optional(),
      focalLength: z.string().optional(),
      exposureCompensation: z.string().optional(),
    })
    .optional(),
  gps: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      altitude: z.number().optional(),
      resolvedAddress: z.string().optional(),
      nearbyVenues: z.array(
        z.object({
          name: z.string(),
          category: z.string().optional(),
          distanceMeters: z.number().optional(),
        }),
      ),
    })
    .optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  iptc: ImageIptcMetadataSchema.optional(),
});

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

export const StructuredOutputRatingSchema = z.object({
  imageId: z.string().uuid(),
  starRating: StarRatingSchema,
  colorLabel: ColorLabelSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
});

export type StructuredOutputRating = z.infer<
  typeof StructuredOutputRatingSchema
>;

export const PromptStyleSchema = z.object({
  starMeaning: z.object({
    0: z.string().min(1),
    1: z.string().min(1),
    2: z.string().min(1),
    3: z.string().min(1),
    4: z.string().min(1),
    5: z.string().min(1),
  }),
  colorMeaning: z.record(ColorLabelSchema, z.string()).optional(),
  includeTitle: z.boolean().default(true),
  includeDescription: z.boolean().default(true),
  includeTags: z.boolean().default(true),
});

export type PromptStyle = z.infer<typeof PromptStyleSchema>;

export const PromptPresetSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  instructions: z.string().min(1),
  shootTypes: z.array(z.string()),
  authorProfile: PhotographerProfileSchema,
  aiScore: z.number().min(0).max(10).optional(),
  humanScore: z.number().min(0).max(10).optional(),
  ratingsCount: z.number().int().nonnegative().default(0),
  style: PromptStyleSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
  sharedWithMarketplace: z.boolean().default(false),
});

export type PromptPreset = z.infer<typeof PromptPresetSchema>;

export const CreditLedgerEntrySchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  entryType: z.enum(["credit", "debit"]),
  credits: z.number(),
  description: z.string().optional(),
  metadata: z
    .object({
      providerId: ProviderIdSchema.optional(),
      shootId: z.string().uuid().optional(),
      imagesProcessed: z.number().int().optional(),
    })
    .optional(),
  createdAt: z.string().datetime().optional(),
});

export type CreditLedgerEntry = z.infer<typeof CreditLedgerEntrySchema>;

export const BatchJobSchema = z.object({
  id: z.string().uuid().optional(),
  shootId: z.string().uuid(),
  providerId: ProviderIdSchema,
  promptPresetId: z.string().uuid(),
  status: z.enum(["pending", "running", "paused", "completed", "failed"]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
  totalImages: z.number().int().nonnegative(),
  processedImages: z.number().int().nonnegative(),
  costInCredits: z.number().nonnegative().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().nonnegative().default(0),
});

export type BatchJob = z.infer<typeof BatchJobSchema>;

export const StructuredOutputSchema = z.object({
  jobId: z.string().uuid(),
  batchId: z.string().uuid(),
  ratings: z.array(StructuredOutputRatingSchema),
  aggregateNotes: z.string().optional(),
});

export type StructuredOutput = z.infer<typeof StructuredOutputSchema>;

export const ShootReportSchema = z.object({
  shootId: z.string().uuid(),
  totalImages: z.number().int().nonnegative(),
  heroCount: z.number().int().nonnegative(),
  keeperCount: z.number().int().nonnegative(),
  aiScore: z.number().min(0).max(10).optional(),
  humanScore: z.number().min(0).max(10).optional(),
  summary: z.string(),
  heroImageIds: z.array(z.string().uuid()),
  generatedAt: z.string().datetime(),
});

export type ShootReport = z.infer<typeof ShootReportSchema>;

export const MetadataUpdateSchema = z.object({
  imageId: z.string().uuid(),
  starRating: StarRatingSchema.optional(),
  colorLabel: ColorLabelSchema.optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type MetadataUpdate = z.infer<typeof MetadataUpdateSchema>;

export const MetadataUpdateRequestSchema = z.object({
  shootId: z.string().uuid(),
  updates: z.array(MetadataUpdateSchema),
});

export type MetadataUpdateRequest = z.infer<
  typeof MetadataUpdateRequestSchema
>;
