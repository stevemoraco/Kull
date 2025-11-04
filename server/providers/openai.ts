import fetch from "node-fetch";

export type RatingResult = {
  imageId?: string;
  filename?: string;
  starRating?: number;
  colorLabel?: string;
  title?: string;
  description?: string;
  tags?: string[];
};

export async function submitOpenAIBatch(args: {
  apiKey: string;
  model: string;
  images: { id: string; url?: string; b64?: string; filename?: string }[];
  prompt: string;
}): Promise<{ ok: true; ratings: RatingResult[] } | { ok: false; retryAfterMs?: number }> {
  try {
    // Build a single multi-image prompt that instructs model to return ratings array
    const baseInstruction = `${args.prompt}\nFor all provided images, respond strictly as JSON matching this schema: { "ratings": [{ "imageId": string, "filename": string, "starRating": number, "colorLabel": string, "title": string, "description": string, "tags": string[] }] }`;

    const contents: any[] = [
      { type: "input_text", text: baseInstruction },
      ...args.images.flatMap((img) =>
        img.url
          ? [{ type: "input_image", image_url: img.url }]
          : img.b64
          ? [{ type: "input_image", image_base64: img.b64 }]
          : []
      ),
    ];

    const body: any = {
      model: args.model,
      input: [{ role: "user", content: contents }],
      response_format: {
        type: "json_schema",
        name: "kull_ratings",
        schema: {
          type: "object",
          properties: {
            ratings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  imageId: { type: "string" },
                  filename: { type: "string" },
                  starRating: { type: "integer" },
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
        },
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
      const retryAfter = Number(resp.headers.get("retry-after")) * 1000 || 2000;
      return { ok: false as const, retryAfterMs: retryAfter };
    }
    if (!resp.ok) {
      return { ok: false as const };
    }
    const json = await resp.json();
    // Try a few common fields from Responses API
    const text = json?.output_text || json?.content || json?.output?.[0]?.content?.[0]?.text || json?.response || "";
    let parsed: any = {};
    try { parsed = typeof text === "string" ? JSON.parse(text) : text; } catch {}
    const ratings: RatingResult[] = Array.isArray(parsed?.ratings) ? parsed.ratings : [];
    return { ok: true as const, ratings };
  } catch {
    return { ok: false as const };
  }
}
