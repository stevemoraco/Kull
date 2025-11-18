import { z } from "zod";
import type { ImageMetadata } from "@shared/culling";

export type RatingResult = {
  imageId?: string;
  filename?: string;
  starRating?: number;
  colorLabel?: string;
  title?: string;
  description?: string;
  tags?: string[];
};

type ImageRef = {
  id: string;
  url?: string;
  b64?: string;
  filename?: string;
  metadata?: ImageMetadata;
  tags?: string[];
};

type OpenAIResponse = {
  output_text?: string;
  response?: unknown;
  content?: unknown;
  output?: unknown;
};

const RatingSchema = z.object({
  imageId: z.string().optional(),
  filename: z.string().optional(),
  starRating: z
    .preprocess((value) => (typeof value === "string" ? Number(value) : value), z.number().int().min(0).max(5))
    .default(0),
  colorLabel: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z
    .preprocess((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        return value
          .split(/[,|\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return undefined;
    }, z.array(z.string()).optional())
    .optional(),
});

const RatingsEnvelopeSchema = z.object({
  ratings: z.array(RatingSchema),
});

const JSON_SCHEMA = {
  type: "object",
  properties: {
    ratings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          imageId: { type: "string" },
          filename: { type: "string" },
          starRating: { type: "integer", minimum: 0, maximum: 5 },
          colorLabel: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["starRating"],
        additionalProperties: true,
      },
    },
  },
  required: ["ratings"],
  additionalProperties: false,
};

function buildInstruction(includeContext: boolean): string {
  const contextNote = includeContext
    ? `
Some IMAGE_REF descriptors include a "context" object with EXIF/IPTC cues (capture date, camera, location, tags). Use this to refine titles, descriptions, and tagging without inventing new facts.`
    : "";
  return `You will receive a sequence of entries containing IMAGE_REF descriptors followed by the image itself.${contextNote}
Use IMAGE_REF to fill imageId and filename fields. Respond strictly as JSON matching:
{
  "ratings": [
    {
      "imageId": string,
      "filename": string,
      "starRating": integer (0-5),
      "colorLabel": string,
      "title": string,
      "description": string,
      "tags": string[]
    }
  ]
}
Do not emit prose, markdown, or trailing commentary.`;
}

function compactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => compactValue(item))
      .filter((item) => item !== undefined);
    return filtered.length ? filtered : undefined;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, compactValue(val)] as const)
      .filter(([, val]) => val !== undefined);
    if (!entries.length) return undefined;
    return Object.fromEntries(entries);
  }
  if (value === undefined || value === null) return undefined;
  return value;
}

function buildImageContext(image: ImageRef): Record<string, unknown> | undefined {
  const metadata = image.metadata;
  const base = {
    captureDate: metadata?.captureDate,
    camera: {
      make: metadata?.cameraMake,
      model: metadata?.cameraModel,
      lens: metadata?.lensModel,
    },
    exposure: metadata?.exposure
      ? {
          shutterSpeed: metadata.exposure.shutterSpeed,
          aperture: metadata.exposure.aperture,
          iso: metadata.exposure.iso,
          focalLength: metadata.exposure.focalLength,
          exposureCompensation: metadata.exposure.exposureCompensation,
        }
      : undefined,
    location: metadata?.gps
      ? {
          latitude: metadata.gps.latitude,
          longitude: metadata.gps.longitude,
          altitude: metadata.gps.altitude,
          address: metadata.gps.resolvedAddress,
          nearbyVenues: metadata.gps.nearbyVenues
            ?.slice(0, 3)
            .map((venue) => ({
              name: venue.name,
              category: venue.category,
              distanceMeters: venue.distanceMeters,
            })),
        }
      : undefined,
    iptc: metadata?.iptc
      ? {
          title: metadata.iptc.title,
          description: metadata.iptc.description,
          keywords: metadata.iptc.keywords,
          people: metadata.iptc.people,
          clientName: metadata.iptc.clientName,
          eventName: metadata.iptc.eventName,
          location: metadata.iptc.location,
        }
      : undefined,
    tags: image.tags?.length ? Array.from(new Set(image.tags)).slice(0, 12) : undefined,
  };
  return compactValue(base) as Record<string, unknown> | undefined;
}

function buildContents(images: ImageRef[], promptInstruction: string): unknown[] {
  const acc: unknown[] = [{ type: "input_text", text: promptInstruction }];
  for (const img of images) {
    const context = buildImageContext(img);
    const ref: Record<string, unknown> = {
      imageId: img.id,
      filename: img.filename ?? undefined,
    };
    if (context) ref.context = context;
    acc.push({ type: "input_text", text: `IMAGE_REF ${JSON.stringify(ref)}` });
    if (img.url) acc.push({ type: "input_image", image_url: img.url });
    else if (img.b64) acc.push({ type: "input_image", image_base64: img.b64 });
  }
  return acc;
}

function extractCandidates(json: OpenAIResponse): unknown[] {
  const candidates: unknown[] = [];
  const push = (value: unknown) => {
    if (value === undefined || value === null) return;
    candidates.push(value);
  };

  push(json.output_text);
  push(json.response);
  push(json.content);
  push(json.output);

  if (Array.isArray(json.output)) {
    for (const entry of json.output) {
      if (entry && typeof entry === "object" && Array.isArray((entry as any).content)) {
        for (const part of (entry as any).content) {
          push(part?.text);
          push(part?.data);
        }
      }
      if (typeof entry === "string") push(entry);
    }
  }

  return candidates;
}

function coerceRatings(candidate: unknown): RatingResult[] {
  if (candidate === undefined || candidate === null) return [];
  if (typeof candidate === "string") {
    try {
      return coerceRatings(JSON.parse(candidate));
    } catch {
      return [];
    }
  }

  if (typeof candidate !== "object") return [];

  const parsed = RatingsEnvelopeSchema.safeParse(candidate);
  if (!parsed.success) return [];

  return parsed.data.ratings.map((rating) => ({
    imageId: rating.imageId,
    filename: rating.filename,
    starRating: rating.starRating,
    colorLabel: rating.colorLabel,
    title: rating.title,
    description: rating.description,
    tags: rating.tags,
  }));
}

function normalizeRatings(ratings: RatingResult[], images: ImageRef[]): RatingResult[] {
  if (!ratings.length) return [];
  const byId = new Map(images.map((img) => [img.id, img]));
  const byFilename = new Map(
    images
      .filter((img) => img.filename)
      .map((img) => [img.filename as string, img]),
  );

  return ratings.map((rating, index) => {
    const hinted =
      (rating.imageId && byId.get(rating.imageId)) ||
      (rating.filename && byFilename.get(rating.filename)) ||
      images[index] ||
      images[0];

    return {
      imageId: rating.imageId ?? hinted?.id,
      filename: rating.filename ?? hinted?.filename ?? hinted?.id,
      starRating: rating.starRating,
      colorLabel: rating.colorLabel,
      title: rating.title,
      description: rating.description,
      tags: rating.tags,
    };
  });
}

export async function submitOpenAIBatch(args: {
  apiKey: string;
  model: string;
  images: ImageRef[];
  prompt: string;
}): Promise<{ ok: true; ratings: RatingResult[] } | { ok: false; retryAfterMs?: number }> {
  try {
    const includeContext = args.images.some((img) => {
      if (img.tags && img.tags.length) return true;
      const meta = img.metadata;
      if (!meta) return false;
      return Boolean(
        meta.captureDate ||
          meta.cameraMake ||
          meta.cameraModel ||
          meta.lensModel ||
          meta.exposure ||
          meta.gps ||
          meta.iptc,
      );
    });
    const promptInstruction = `${args.prompt}

${buildInstruction(includeContext)}`;
    const body = {
      model: args.model,
      input: [{ role: "user", content: buildContents(args.images, promptInstruction) }],
      response_format: {
        type: "json_schema",
        name: "kull_ratings",
        schema: JSON_SCHEMA,
      },
    };

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      const retryAfterHeader = resp.headers?.get?.("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
      return { ok: false as const, retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : 2000 };
    }

    if (!resp.ok) {
      return { ok: false as const };
    }

    const json: OpenAIResponse = await resp.json();
    const candidates = extractCandidates(json);

    let ratings: RatingResult[] = [];
    for (const candidate of candidates) {
      ratings = coerceRatings(candidate);
      if (ratings.length) break;
    }
    if (!ratings.length) {
      ratings = coerceRatings(json);
    }

    const normalized = normalizeRatings(ratings, args.images);
    return { ok: true as const, ratings: normalized };
  } catch (error) {
    console.warn("submitOpenAIBatch failed:", error);
    return { ok: false as const };
  }
}
